/** Fixtures only: no external calls, on-chain submissions or real assets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { FileStore, SupabaseStore } from '../server/v4/storage.mjs';
import { secretBox } from '../server/v4/secrets.mjs';
import { Jobs } from '../server/v4/jobs.mjs';
import { normalizeRpc, analyzeEvents, validateDistribution, surplusPolicy } from '../server/v4/analytics.mjs';
import { collectHistory } from '../server/v4/history.mjs';
import { commerce } from '../server/v4/commerce.mjs';
import { quoteLiquidity, decodePool, poolKeys, CPMM } from '../server/v4/liquidity.mjs';
import { treasuryMessage, encodeCompactMessage, describeTreasury, decodeVaultTransaction } from '../server/v4/squads-transactions.mjs';
import { SQUADS, vaultAddress, voteBytes, decodeMultisig, decodeProposal } from '../server/v4/governance.mjs';
import { LAUNCH, validateLaunch, initializeInstruction, claimableVesting, decodeLaunchConfig } from '../server/v4/launchlab.mjs';
import { createService } from '../server/service.mjs';
import { createV4 } from '../server/v4/module.mjs';
import { ata } from '../server/builders.mjs';
import { identity, makeFixtures, TEST_MINT, BLOCKHASH } from './fixtures.mjs';
import { MINT, PROGRAM, b58encode, b58decode, concat, u32, u64, to64, parseTransaction } from '../shared/solana.mjs';
const disc = s => createHash('sha256').update(s).digest().subarray(0, 8);
const temp = t => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pulp-v4-test-')); t.after(() => fs.rmSync(d, { recursive: true, force: true })); return d; };
const ctxOrigin = 'http://127.0.0.1:4173';
async function auth(service, id, origin = ctxOrigin) { const ctx = { origin, userAgent: 'Pulp test' }, c = await service.request('auth/challenge', { address: id.owner }, ctx), m = new TextEncoder().encode(c.message), a = await service.request('auth/verify', { id: c.id, message: to64(m), signature: to64(id.sign(m)) }, ctx); ctx.cookie = a._cookie.split(';')[0]; return ctx; }
async function setup(t, { publicMode = false } = {}) { const dataDir = temp(t), id = identity(), f = makeFixtures({ owner: id.owner }), other = identity(), origin = publicMode ? 'https://pulp.example' : ctxOrigin, adminWallet = publicMode ? id.owner : '', service = createService({ dataDir, fetchImpl: f.fetchImpl, skipDns: true, throttle: false, publicOrigin: publicMode ? origin : '', adminWallet }); await service.ready; const v4 = createV4(service, { dataDir, publicOrigin: publicMode ? origin : '', adminWallet, startWorkers: false }); t.after(() => v4.stop()); const ctx = await auth(service, id, origin), otherCtx = await auth(service, other, origin); return { id, other, ctx, otherCtx, service, v4, f, dataDir, req: (r, b = {}) => v4.request(r, b, ctx) }; }
const event = (id, { kind = 'swap', q = '10000000', usdc = '-10000000', at = Date.now(), slot = 1 } = {}) => ({ signature: id, success: true, kind, at, slot, feeLamports: '5000', tokens: [{ mint: MINT.USDC, raw: usdc, decimals: 6 }, { mint: TEST_MINT, raw: q, decimals: 6 }] });
test('v4 FileStore serializes concurrent mutations and persists exact integers', async (t) => { const store = new FileStore(temp(t)); await Promise.all(Array.from({ length: 40 }, () => store.mutate('counter', v => v + 1, 0))); assert.equal(await store.get('counter'), 40); assert.rejects(store.get('../secret')); assert.equal(fs.statSync(path.join(store.dir, 'counter.json')).mode & 0o777, 0o600); });
test('v4 corrupt storage is not silently overwritten', async (t) => { const store = new FileStore(temp(t)); fs.writeFileSync(path.join(store.dir, 'broken.json'), '{'); await assert.rejects(store.mutate('broken', () => ({})), /dañados/); assert.equal(fs.readFileSync(path.join(store.dir, 'broken.json'), 'utf8'), '{'); });
test('v4 encrypted secrets roundtrip and reject modified authentication tag', t => { const box = secretBox(temp(t)), sealed = box.seal({ key: 'never-in-browser' }); assert.ok(!JSON.stringify(sealed).includes('never-in-browser')); assert.deepEqual(box.open(sealed), { key: 'never-in-browser' }); assert.throws(() => box.open({ ...sealed, tag: '0'.repeat(32) })); });
test('v4 public encryption rejects missing master key', t => { const old = process.env.PULP_ENCRYPTION_KEY; delete process.env.PULP_ENCRYPTION_KEY; try {
    assert.throws(() => secretBox(temp(t), { publicMode: true }), /obligatorio/);
}
finally {
    if (old)
        process.env.PULP_ENCRYPTION_KEY = old;
} });
test('v4 PostgreSQL CAS retries conflicts and never exposes service key in errors', async () => { let revision = 1, value = { n: 0 }, conflict = true; const s = new SupabaseStore({ url: 'https://test.supabase.co', serviceKey: 'do-not-expose', fetchImpl: async (url, opts) => { if (url.includes('pulp_kv?'))
        return Response.json([{ value, revision }]); const b = JSON.parse(opts.body); if (conflict) {
        conflict = false;
        value = { n: 8 };
        revision++;
        return Response.json(false);
    } assert.equal(b.p_revision, revision); value = b.p_value; return Response.json(true); } }); await s.mutate('counter', v => ({ n: v.n + 1 }), { n: 0 }); assert.equal(value.n, 9); assert.throws(() => new SupabaseStore({ url: 'http://localhost', serviceKey: 'x' })); });
test('v4 durable jobs are idempotent and run once', async (t) => { const s = new FileStore(temp(t)); let calls = 0; const j = new Jobs(s, { sync: async () => { calls++; return { ok: true }; } }); await j.enqueue('sync', {}, { id: 'one', owner: 'a' }); await j.enqueue('sync', {}, { id: 'one', owner: 'a' }); await Promise.all([j.tick(), j.tick()]); await j.tick(); assert.equal(calls, 1); assert.equal((await j.list('a'))[0].state, 'done'); assert.deepEqual(await j.list('b'), []); });
test('v4 failed jobs are requeued without financial side effects', async (t) => { const s = new FileStore(temp(t)), j = new Jobs(s, { sync: async () => { throw Error('network fixture'); } }); await j.enqueue('sync', {}, { id: 'f' }); await j.tick(); const x = await s.get('v4-jobs'); assert.equal(x[0].state, 'queued'); assert.equal(x[0].attempts, 1); assert.ok(x[0].due > Date.now()); });
test('v4 FIFO preserves cost and reports only known USDC gross profit', () => { const a = analyzeEvents([event('buy', { slot: 1 }), event('sell', { slot: 2, q: '-5000000', usdc: '7000000' })], { complete: false }); assert.equal(a.grossRealizedUsdc, '2'); assert.equal(a.openLots[0].knownCostUsdc, '5'); assert.equal(a.feeLamports, '10000'); assert.equal(a.netRealizedUsd, null); assert.equal(a.eligible, false); });
test('v4 incoming transfer is never free cost basis', () => { const a = analyzeEvents([event('gift', { kind: 'transfer', slot: 1, usdc: '0' }), event('sell', { slot: 2, q: '-10000000', usdc: '12000000' })], { complete: true }); assert.equal(a.grossRealizedUsdc, '0'); assert.equal(a.unpricedSales.length, 1); assert.equal(a.eligible, false); });
test('v4 transfers out remove proportional FIFO lots, not profits', () => { const a = analyzeEvents([event('b', { slot: 1 }), event('out', { kind: 'transfer', slot: 2, q: '-5000000', usdc: '0' }), event('s', { slot: 3, q: '-5000000', usdc: '6000000' })]); assert.equal(a.grossRealizedUsdc, '1'); assert.equal(a.knownCostUsdc, '5'); });
test('v4 duplicate signatures cannot double profit', () => { const buy = event('b', { slot: 1 }), sell = event('s', { slot: 2, q: '-10000000', usdc: '15000000' }); assert.equal(analyzeEvents([buy, sell, sell]).grossRealizedUsdc, '5'); });
test('v4 normalized RPC distinguishes fees and transfer from swaps', () => { const owner = identity().owner, tx = { slot: 1, blockTime: 1, transaction: { message: { accountKeys: [{ pubkey: owner, signer: true }], instructions: [] } }, meta: { err: null, fee: 5000, preBalances: [1e9], postBalances: [999995000], preTokenBalances: [], postTokenBalances: [] } }; assert.equal(normalizeRpc(tx, owner, 'sig').kind, 'transfer'); assert.equal(normalizeRpc(tx, identity().owner, 'sig').feeLamports, '0'); });
test('v4 distribution must sum to 100%, assigns remainder exactly', () => { const a = validateDistribution({ supply: '1', decimals: 0, allocations: [{ bps: 3333 }, { bps: 6667 }] }); assert.equal(a.allocations.reduce((s, x) => s + BigInt(x.raw), 0n), 1n); assert.equal(a.executed, false); assert.throws(() => validateDistribution({ supply: '1', allocations: [{ bps: 9999 }] }), /100/); });
test('v4 buyback budget excludes costs liabilities and reserve', () => { assert.deepEqual(surplusPolicy({ revenue: 10000, costs: 4000, liabilities: 1000, reserve: 2000 }), { eligibleCents: 3000, buybackBudgetCents: 600, executed: false }); assert.equal(surplusPolicy({ revenue: 100, costs: 200, reserve: 0, liabilities: 0 }).eligibleCents, 0); });
test('v4 standard RPC never claims complete ATA coverage', async () => { const r = await collectHistory({ checkNetwork: async () => { }, rpc: async () => [] }, identity().owner, {}, { provider: 'rpc' }); assert.equal(r.complete, false); assert.match(r.coverage, /ATA/); });
test('v4 indexer full traversal is separate from profitable ranking', async () => { const r = await collectHistory({ checkNetwork: async () => { }, rpc: async () => ({ data: [], paginationToken: null }) }, identity().owner, {}, { provider: 'helius' }); assert.equal(r.complete, true); assert.equal(analyzeEvents(r.items, { complete: r.complete }).eligible, false); });
test('v4 unavailable transaction marks history incomplete', async () => { const sig = b58encode(new Uint8Array(64).fill(1)); const r = await collectHistory({ checkNetwork: async () => { }, rpc: async (method) => method === 'getSignaturesForAddress' ? [{ signature: sig }] : null }, identity().owner, {}, { provider: 'rpc' }); assert.deepEqual(r.missing, [sig]); assert.equal(r.complete, false); });
test('v4 independent profiles, alerts and private index stay isolated', async (t) => { const x = await setup(t); await x.req('preferences/save', { watched: [{ address: TEST_MINT, label: 'private' }] }); assert.equal((await x.v4.request('preferences', {}, x.otherCtx)).watched.length, 0); await x.service.store.put('v4-index-mainnet', [TEST_MINT]); assert.equal((await x.req('rankings')).wallets.length, 0); await assert.rejects(x.v4.request('preferences', {}, {}), /Verificá/); });
test('v4 alert quota and foreign deletion do not cross accounts', async (t) => { const x = await setup(t); for (let i = 0; i < 3; i++)
    await x.req('alerts/save', { kind: 'wallet', address: TEST_MINT, label: 'test' + i }); await assert.rejects(x.req('alerts/save', { kind: 'wallet', address: TEST_MINT }), /3 alertas/); const one = (await x.req('alerts')).rules[0]; await x.v4.request('alerts/delete', { id: one.id }, x.otherCtx); assert.equal((await x.req('alerts')).rules.length, 3); });
test('v4 notifications encrypt secrets and restrict webhook URLs', async (t) => { const x = await setup(t); await x.req('notifications/save', { telegramToken: '123456789:abcdefghijklmnopqrstuvwxyz123456', telegramChat: '1234' }); const raw = JSON.stringify(await x.service.store.get('v4-secrets-' + x.id.owner)); assert.ok(!raw.includes('abcdefghijklmnopqrstuvwxyz')); await assert.rejects(x.req('notifications/save', { discordWebhook: 'http://127.0.0.1/steal' }), /oficial/); await x.req('notifications/test'); assert.equal((await x.req('inbox')).items.length, 1); assert.equal((await x.v4.request('inbox', {}, x.otherCtx)).items.length, 0); });
test('v4 strategies require USDC budget and reject stale signals', async (t) => { const x = await setup(t); await assert.rejects(x.req('strategies/save', { kind: 'dca', amount: '20', maxDailyUsdc: 10, outputMint: TEST_MINT }), /presupuesto/); await assert.rejects(x.req('strategies/prepare', { id: 'fabricated' }), /señal/); const s = await x.req('strategies/save', { kind: 'dca', amount: '2', maxDailyUsdc: 10, outputMint: TEST_MINT }); assert.equal(s.mode, 'manual-approval'); });
test('v4 new protocol writes fail closed by default', async (t) => { const x = await setup(t); for (const r of ['pool/create', 'liquidity/prepare', 'launchlab/prepare', 'vesting/prepare', 'governance/propose', 'governance/execute'])
    await assert.rejects(x.req(r, {}), /revisión|validación|PULP_ENABLE_PROTOCOL_WRITES/i); });
test('v4 official PULP issuance remains blocked', async (t) => { const x = await setup(t); await assert.rejects(x.service.request('launch/prepare', { name: 'Pulp', symbol: 'PULP', supply: '1000000', decimals: 6 }, x.ctx), /PULP/); });
test('v4 privacy export contains no API or notification secrets', async (t) => { const x = await setup(t); await x.req('notifications/save', { telegramToken: '123456789:abcdefghijklmnopqrstuvwxyz123456', telegramChat: '1234' }); const a = await x.req('account/export'); assert.equal(a.owner, x.id.owner); assert.ok(!JSON.stringify(a).includes('abcdefghijklmnopqrstuvwxyz')); await x.req('account/delete', { confirm: x.id.owner }); await assert.rejects(x.req('preferences'), /Verificá/); });
test('v4 payment verifies direct payer-to-merchant USDC transfer and rejects reuse', async (t) => { const old = process.env.PULP_MERCHANT_WALLET; const x = await setup(t), merchant = identity().owner; process.env.PULP_MERCHANT_WALLET = merchant; t.after(() => { if (old)
    process.env.PULP_MERCHANT_WALLET = old;
else
    delete process.env.PULP_MERCHANT_WALLET; }); const invoice = await x.req('billing/create', { plan: 'pro' }), source = ata(x.id.owner, MINT.USDC), dest = ata(merchant, MINT.USDC), sig = b58encode(new Uint8Array(64).fill(2)); const token = (idx, owner, amount) => ({ accountIndex: idx, owner, mint: MINT.USDC, uiTokenAmount: { amount, decimals: 6 } }); let transaction = { blockTime: Math.floor(Date.now() / 1000), transaction: { message: { accountKeys: [{ pubkey: x.id.owner, signer: true }, { pubkey: source }, { pubkey: dest }], instructions: [{ programId: PROGRAM.token, parsed: { type: 'transferChecked', info: { source, destination: dest, authority: x.id.owner, mint: MINT.USDC, tokenAmount: { amount: '19000000', decimals: 6 } } } }] } }, meta: { err: null, preTokenBalances: [token(1, x.id.owner, '19000000'), token(2, merchant, '0')], postTokenBalances: [token(1, x.id.owner, '0'), token(2, merchant, '19000000')] } }; x.service.up.rpc = async () => transaction; x.service.up.checkNetwork = async () => { }; const result = await x.req('billing/verify', { id: invoice.id, signature: sig }); assert.equal(result.state, 'paid'); assert.equal((await x.req('billing')).entitlement.plan, 'pro'); const second = await x.req('billing/create', { plan: 'pro' }); await assert.rejects(x.req('billing/verify', { id: second.id, signature: sig }), /ya se utilizó/); transaction.transaction.message.instructions = []; await assert.rejects(x.req('billing/verify', { id: second.id, signature: b58encode(new Uint8Array(64).fill(3)) }), /directa/); });
test('v4 liquidity deposit never exceeds user maximum after rounding', () => { const p = { lpAmount: '90000000', reserveA: '100000', reserveB: '300000' }; for (let n = 2; n < 200; n++) {
    const q = quoteLiquidity(p, { action: 'deposit', raw: String(n), slippageBps: 50 });
    assert.ok(BigInt(q.amountA) <= BigInt(n));
    assert.ok(BigInt(q.amountB) > 0n);
} assert.throws(() => quoteLiquidity(p, { action: 'deposit', raw: '1', slippageBps: 999 })); });
test('v4 liquidity withdrawal applies minimum not maximum', () => { const q = quoteLiquidity({ lpAmount: '100000', reserveA: '1000000', reserveB: '2000000' }, { action: 'withdraw', raw: '1000', slippageBps: 100 }); assert.equal(q.amountA, '9900'); assert.equal(q.amountB, '19800'); assert.equal(q.bound, 'minimum'); });
test('v4 pool decoder rejects discriminator and malformed bytes', () => { assert.throws(() => decodePool(Buffer.alloc(512)), /Layout/); const d = Buffer.alloc(512); disc('account:PoolState').copy(d); const p = decodePool(d); assert.equal(p.lpAmount, '0'); assert.throws(() => decodePool(d.subarray(0, 20))); });
test('v4 Squads treasury message preserves destination and rejects hidden payload', () => { const multisig = identity().owner, vault = vaultAddress(multisig), destination = identity().owner; for (const mint of [MINT.SOL, MINT.USDC]) {
    const m = treasuryMessage(vault, destination, mint, '1.25'), t = { multisig, vaultIndex: 0, ephemeralSignerBumps: [], message: m };
    const d = describeTreasury(t);
    assert.equal(d.amount, '1.25');
    assert.equal(d.destination, destination);
    assert.ok(encodeCompactMessage(m).length > 80);
    m.instructions.push(m.instructions[0]);
    assert.throws(() => describeTreasury(t));
} });
test('v4 Squads vote wire targets correct proposal, signer, and program', () => { const member = identity().owner, ms = identity().owner, p = identity().owner, bytes = voteBytes({ multisig: ms, member, proposal: p, choice: 'approve', blockhash: BLOCKHASH }), t = parseTransaction(bytes); assert.equal(t.keys[0], member); assert.ok(t.keys.includes(SQUADS)); assert.ok(t.keys.includes(p)); assert.throws(() => voteBytes({ multisig: ms, member, proposal: p, choice: 'unknown', blockhash: BLOCKHASH })); });
test('v4 protocol decoders reject arbitrary account data', () => { for (const fn of [decodeVaultTransaction, decodeMultisig, decodeProposal, decodeLaunchConfig])
    assert.throws(() => fn(Buffer.alloc(512))); });
const config = { curveType: 0, minSupplyA: '1', migrateFee: '1000000000', minFundRaisingB: '1000000000', maxLockRate: '100000', minSellRateA: '500000', minMigrateRateA: '100000' };
const launchInput = { name: 'Test Only', symbol: 'TEST', uri: 'https://example.com/meta.json', decimals: 6, supply: '1000000000', sell: '800000000', locked: '50000000', fundraise: '85', cliffDays: 30, unlockDays: 365 };
test('v4 LaunchLab validates distribution and blocks official PULP', () => { const x = validateLaunch(launchInput, config, 9); assert.equal(x.supply, 1000000000000000n); assert.throws(() => validateLaunch({ ...launchInput, symbol: 'PULP' }, config, 9), /PULP/); assert.throws(() => validateLaunch({ ...launchInput, sell: '999999999' }, config, 9)); assert.throws(() => validateLaunch({ ...launchInput, uri: 'file:///secret' }, config, 9)); });
test('v4 LaunchLab V2 build uses expected account order and discriminator', () => { const x = validateLaunch(launchInput, config, 9), owner = identity().owner, mint = identity().owner, proto = LAUNCH.mainnet; const a = initializeInstruction(proto.program, owner, mint, MINT.SOL, proto.config, proto.platform, x); assert.equal(a.instruction.keys.length, 18); assert.equal(a.instruction.keys[6].key, mint); assert.equal(a.instruction.keys[6].signer, true); assert.equal(a.instruction.keys[11].key, PROGRAM.token); assert.deepEqual([...a.instruction.data.slice(0, 8)], [67, 153, 175, 39, 218, 16, 38, 32]); });
test('v4 vesting handles cliff, period, claimed amount and graduation', () => { const p = { status: 2, vesting: { startTime: '1000', unlockPeriod: '100' } }, r = { shareAmount: '1000', claimedAmount: '50' }; assert.equal(claimableVesting(p, r, 999), 0n); assert.equal(claimableVesting(p, r, 1050), 450n); assert.equal(claimableVesting(p, r, 2000), 950n); assert.equal(claimableVesting({ ...p, status: 1 }, r, 2000), 0n); });
import { protocolFixtures } from './protocol-fixtures.mjs';
import { from64, withSignature } from '../shared/solana.mjs';
import { curveQuote } from '../server/v4/launchlab.mjs';
const signPlan = (p, id) => { const raw = from64(p.transaction), t = parseTransaction(raw); return { id: p.id, ack: true, transaction: to64(withSignature(raw, id.owner, id.sign(t.message))) }; };
test('v4 native protocol paths prepare, user-sign, submit and reconcile with injected RPC', async (t) => {
    const x = await setup(t), f = protocolFixtures(x.service, x.id.owner), env = { PULP_ENABLE_PROTOCOL_WRITES: process.env.PULP_ENABLE_PROTOCOL_WRITES, PULP_SQUADS_MULTISIG: process.env.PULP_SQUADS_MULTISIG };
    process.env.PULP_ENABLE_PROTOCOL_WRITES = '1';
    process.env.PULP_SQUADS_MULTISIG = f.ms;
    t.after(() => { for (const [k, v] of Object.entries(env))
        if (v === undefined)
            delete process.env[k];
        else
            process.env[k] = v; });
    const paths = [['liquidity/prepare', { pool: f.cp.pool, action: 'deposit', amount: '1', slippageBps: 50 }], ['liquidity/prepare', { pool: f.cp.pool, action: 'withdraw', amount: '1', slippageBps: 50 }], ['launchlab/prepare', launchInput], ['vesting/prepare', { pool: f.ll.pool, action: 'allocate', beneficiary: identity().owner, amount: '1' }], ['governance/propose', { destination: f.destination, mint: MINT.SOL, amount: '0.1' }], ['governance/prepare', { proposal: f.proposal, choice: 'approve' }], ['launchlab/trade/prepare', { pool: f.ll.pool, side: 'buy', amount: '0.01' }]];
    for (const [route, b] of paths) {
        const p = await x.req(route, b);
        assert.ok(p.transaction, route);
        assert.equal(p.owner, x.id.owner, route);
        const result = await x.service.request('tx/submit', signPlan(p, x.id), x.ctx);
        assert.equal(result.transaction.status, 'confirmed', route);
    }
    f.controls.graduated = true;
    f.controls.vested = true;
    const claim = await x.req('vesting/prepare', { pool: f.ll.pool, action: 'claim' });
    assert.equal(claim.summary.amount, '1');
    assert.equal((await x.service.request('tx/submit', signPlan(claim, x.id), x.ctx)).transaction.status, 'confirmed');
    f.controls.approved = true;
    const detail = await x.req('governance/details', { index: '1' });
    assert.equal(detail.payment.destination, f.destination);
    await assert.rejects(x.req('governance/execute', { proposal: f.proposal, hash: 'wrong' }), /huella/);
    const exec = await x.req('governance/execute', { proposal: f.proposal, hash: detail.hash });
    assert.equal(exec.summary.amount, '0.1');
    assert.equal((await x.service.request('tx/submit', signPlan(exec, x.id), x.ctx)).transaction.status, 'confirmed');
});
test('v4 curve quotes subtract fees and enforce graduation bounds', () => { const p = { status: 0, curveType: 0, config: { tradeFeeRate: '10000' }, platform: { feeRate: '0', creatorFeeRate: '0' }, virtualA: '1000000', realA: '100000', virtualB: '1000000', realB: '100000', totalSellA: '800000' }; const q = curveQuote(p, 'buy', '10000', 50); assert.equal(q.quoteFee, '100'); assert.ok(BigInt(q.minimum) <= BigInt(q.output)); assert.throws(() => curveQuote({ ...p, status: 2 }, 'buy', '1')); assert.throws(() => curveQuote(p, 'sell', '100001')); });
test('v4 wrapping keeps destination in the signing wallet and refuses a foreign wSOL account', async (t) => {
    const x = await setup(t), f = protocolFixtures(x.service, x.id.owner), rpc = x.service.up.rpc, wrapped = ata(x.id.owner, MINT.SOL);
    let existing = null;
    x.service.up.rpc = async (method, args) => method === 'getAccountInfo' && args[0] === wrapped ? { value: existing } : rpc(method, args);
    const p = await x.req('wrap/prepare', { action: 'wrap', amount: '0.1' });
    assert.equal(p.summary.destination, x.id.owner);
    assert.equal(p.summary.amount, '0.1');
    assert.equal((await x.service.request('tx/submit', signPlan(p, x.id), x.ctx)).transaction.status, 'confirmed');
    existing = { owner: PROGRAM.token, data: { parsed: { info: { owner: x.id.owner, mint: MINT.SOL, state: 'initialized', isNative: true, tokenAmount: { amount: '100000000', decimals: 9 } } } } };
    const q = await x.req('wrap/prepare', { action: 'unwrap' });
    assert.equal(q.summary.destination, x.id.owner);
    assert.equal(q.summary.amount, '0.1');
    assert.equal(parseTransaction(from64(q.transaction)).instructions.length, 1);
    existing.data.parsed.info.owner = x.other.owner;
    await assert.rejects(x.req('wrap/prepare', { action: 'wrap', amount: '0.01' }), /no es válida/);
});
test('v4 alerts and strategies retain their selected network', async (t) => { const x = await setup(t); const r = await x.req('alerts/save', { kind: 'wallet', address: x.other.owner }); assert.equal(r.network, 'mainnet'); const s = await x.req('strategies/save', { kind: 'dca', amount: '1', maxDailyUsdc: 2, outputMint: TEST_MINT }); assert.equal(s.network, 'mainnet'); });
