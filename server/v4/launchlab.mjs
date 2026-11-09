/** Raydium LaunchLab V2 adapter. Explicitly gated until operator validates deployed programs.
 * Classic SPL base/quote, constant-product curve only. It never launches the official PULP token.
 * Schemas and PDA derivations: docs/v4/FUENTES.md (official Raydium SDK / protocol docs).
 */
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { PROGRAM, MINT, address, b58encode, b58decode, compileLegacy, concat, u32, u64, units, decimal, parseTransaction, withSignature, safeHttps } from '../../shared/solana.mjs';
import { pda, text } from '../security.mjs';
import { ata, createAta } from '../builders.mjs';
export const LAUNCH = { mainnet: { program: 'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj', platform: '4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4', config: '6s1xP3hpbAfFoNtUNF8mfHsjr2Bd97JxFJRWLbL6aHuX' }, devnet: { program: 'DRay6fNdQ5J82H7xV6uq2aV3mNrUZ1J4PgSKsWgptcm6', platform: '2Jx4KTDrVSdWNazuGpcA8n3ZLTRGGBDxAWhuKe2Xcj2a', config: '7ZR4zD7PYfY2XxoG1Gxcy2EgEeGYrpxrwzPuwdUBssEt' } };
const utf = s => new TextEncoder().encode(s), k = (key, signer = false, writable = false) => ({ key, signer, writable }), d = s => createHash('sha256').update(s).digest().subarray(0, 8), str = s => concat(u32(utf(s).length), utf(s));
export class LaunchReader {
    constructor(b, name) { this.b = Buffer.from(b); this.i = 0; if (!this.take(8).equals(d('account:' + name)))
        throw Error('Cuenta ' + name + ' no válida.'); }
    take(n) { if (this.i + n > this.b.length)
        throw Error('Layout LaunchLab truncado.'); const b = this.b.subarray(this.i, this.i + n); this.i += n; return b; }
    u8() { return this.take(1)[0]; }
    u16() { return this.take(2).readUInt16LE(); }
    u64() { return this.take(8).readBigUInt64LE().toString(); }
    pub() { return b58encode(this.take(32)); }
}
export function decodeLaunchConfig(b) { const r = new LaunchReader(b, 'GlobalConfig'), o = { epoch: r.u64(), curveType: r.u8(), index: r.u16() }; for (const f of ['migrateFee', 'tradeFeeRate', 'maxShareFeeRate', 'minSupplyA', 'maxLockRate', 'minSellRateA', 'minMigrateRateA', 'minFundRaisingB'])
    o[f] = r.u64(); for (const f of ['mintB', 'protocolFeeOwner', 'migrateFeeOwner', 'migrateToAmmWallet', 'migrateToCpmmWallet'])
    o[f] = r.pub(); return o; }
export function decodeLaunchPlatform(b) { const r = new LaunchReader(b, 'PlatformConfig'), o = { epoch: r.u64(), claimFeeWallet: r.pub(), lockNftWallet: r.pub() }; for (const f of ['platformScale', 'creatorScale', 'burnScale', 'feeRate'])
    o[f] = r.u64(); for (const [f, n] of [['name', 64], ['web', 256], ['image', 256]])
    o[f] = r.take(n).toString('utf8').replace(/\0+$/, ''); o.cpConfigId = r.pub(); o.creatorFeeRate = r.u64(); o.transferFeeAuthority = r.pub(); o.vestingWallet = r.pub(); o.vestingScale = r.u64(); o.cpCreator = r.pub(); o.restrictGlobalConfig = r.u8(); o.restrictCurveParam = r.u8(); return o; }
export function decodeLaunchPool(b) { const r = new LaunchReader(b, 'PoolState'), o = { epoch: r.u64() }; for (const f of ['bump', 'status', 'decimalsA', 'decimalsB', 'migrateType'])
    o[f] = r.u8(); for (const f of ['supply', 'totalSellA', 'virtualA', 'virtualB', 'realA', 'realB', 'totalFundRaisingB', 'protocolFee', 'platformFee', 'migrateFee'])
    o[f] = r.u64(); o.vesting = {}; for (const f of ['totalLockedAmount', 'cliffPeriod', 'unlockPeriod', 'startTime', 'totalAllocatedShare'])
    o.vesting[f] = r.u64(); for (const f of ['configId', 'platformId', 'mintA', 'mintB', 'vaultA', 'vaultB', 'creator'])
    o[f] = r.pub(); o.mintProgramFlag = r.u8(); o.cpmmCreatorFeeOn = r.u8(); o.platformVestingShare = r.u64(); return o; }
export function decodeVesting(b) { const r = new LaunchReader(b, 'VestingRecord'); return { epoch: r.u64(), pool: r.pub(), beneficiary: r.pub(), claimedAmount: r.u64(), shareAmount: r.u64() }; }
export function launchKeys(program, mintA, mintB) { const pool = pda([utf('pool'), b58decode(mintA), b58decode(mintB)], program); return { pool, authority: pda([utf('vault_auth_seed')], program), vaultA: pda([utf('pool_vault'), b58decode(pool), b58decode(mintA)], program), vaultB: pda([utf('pool_vault'), b58decode(pool), b58decode(mintB)], program), event: pda([utf('__event_authority')], program), metadata: pda([utf('metadata'), b58decode(PROGRAM.metadata), b58decode(mintA)], PROGRAM.metadata) }; }
export const vestingAddress = (program, pool, beneficiary) => pda([utf('pool_vesting'), b58decode(pool), b58decode(beneficiary)], program);
async function load(up, key, program, decode) { const a = (await up.rpc('getAccountInfo', [address(key), { encoding: 'base64', commitment: 'confirmed' }])).value; if (!a || a.owner !== program)
    throw Error('La cuenta no pertenece al programa LaunchLab de esta red.'); return decode(Buffer.from(a.data[0], 'base64')); }
export async function launchConfig(service, b = {}) { const protocol = LAUNCH[service.config.network], configId = address(b.configId || process.env.PULP_LAUNCHLAB_CONFIG || protocol.config), platformId = address(b.platformId || process.env.PULP_LAUNCHLAB_PLATFORM || protocol.platform); await service.up.checkNetwork(); const [config, platform] = await Promise.all([load(service.up, configId, protocol.program, decodeLaunchConfig), load(service.up, platformId, protocol.program, decodeLaunchPlatform)]); return { program: protocol.program, configId, platformId, config, platform, source: 'Raydium LaunchLab · configuración leída on-chain', at: Date.now() }; }
export function validateLaunch(input, config, quoteDecimals) { const decimals = Number(input.decimals ?? 6); if (!Number.isInteger(decimals) || decimals !== 6)
    throw Error('Decimales inválidos.'); const name = text(input.name, 32), symbol = text(input.symbol, 10).toUpperCase(); if (symbol === 'PULP')
    throw Error('La emisión del token oficial PULP está excluida de esta entrega.'); if (!/^[A-Z0-9]{2,10}$/.test(symbol))
    throw Error('Ticker inválido.'); const uri = safeHttps(input.uri); if (!uri || utf(uri).length > 200 || utf(name).length > 32)
    throw Error('Metadata HTTPS requerida (200 bytes máximo).'); if (config.curveType !== 0)
    throw Error('Esta integración admite únicamente curva ConstantProduct.'); const supply = units(String(input.supply), decimals), sell = units(String(input.sell), decimals), locked = units(String(input.locked || '0'), decimals), fund = units(String(input.fundraise), quoteDecimals), den = 1000000n; const min = BigInt(config.minSupplyA) * 10n ** BigInt(decimals), fee = BigInt(config.migrateFee); if (supply < min || sell <= 0n || sell + locked >= supply || fund < BigInt(config.minFundRaisingB) || fund <= fee)
    throw Error('Distribución, suministro o objetivo incompatible con GlobalConfig.'); if (locked * den > supply * BigInt(config.maxLockRate) || sell * den < supply * BigInt(config.minSellRateA) || (supply - sell - locked) * den < supply * BigInt(config.minMigrateRateA))
    throw Error('Las proporciones no cumplen los límites actuales del protocolo.'); const rem = supply - sell - locked; if (rem * fund < 10201n)
    throw Error('La migración no alcanza la liquidez LP mínima.'); const denominator = (fund - fee) * sell / rem - fund; if (denominator <= 0n)
    throw Error('Parámetros de curva inválidos; no producen reservas virtuales positivas.'); const cliffDays = Number(input.cliffDays || 0), unlockDays = Number(input.unlockDays || 0); if (!Number.isInteger(cliffDays) || !Number.isInteger(unlockDays) || cliffDays < 0 || unlockDays < 0 || cliffDays > 3650 || unlockDays > 3650)
    throw Error('Calendario de vesting inválido.'); return { name, symbol, uri, decimals, supply, sell, locked, fund, cliff: BigInt(cliffDays * 86400), unlock: BigInt(unlockDays * 86400) }; }
export function initializeInstruction(program, owner, mintA, quoteMint, configId, platformId, x, { restrictGlobalConfig = 0, restrictCurveParam = 0 } = {}) { const keys = launchKeys(program, mintA, quoteMint); const accounts = [k(owner, true, true), k(owner), k(configId), k(platformId), k(keys.authority), k(keys.pool, false, true), k(mintA, true, true), k(quoteMint), k(keys.vaultA, false, true), k(keys.vaultB, false, true), k(keys.metadata, false, true), k(PROGRAM.token), k(PROGRAM.token), k(PROGRAM.metadata), k(PROGRAM.system), k(PROGRAM.rent), k(keys.event), k(program)]; if (restrictGlobalConfig)
    accounts.push(k(pda([utf('platform_allow_config'), b58decode(platformId), b58decode(configId)], program))); if (restrictCurveParam)
    accounts.push(k(pda([utf('platform_curve_rule'), b58decode(platformId), b58decode(configId)], program))); const data = concat(d('global:initialize_v2'), Uint8Array.of(x.decimals), str(x.name), str(x.symbol), str(x.uri), Uint8Array.of(0), u64(x.supply), u64(x.sell), u64(x.fund), Uint8Array.of(1), u64(x.locked), u64(x.cliff), u64(x.unlock), Uint8Array.of(0)); return { instruction: { program, keys: accounts, data }, keys }; }
export async function prepareLaunch(service, owner, b) { const c = await launchConfig(service, b), quote = await service.tokenInfo(c.config.mintB); if (quote.program !== PROGRAM.token)
    throw Error('Quote Token-2022 no admitida en esta integración.'); const x = validateLaunch(b, c.config, quote.decimals), { publicKey, privateKey } = generateKeyPairSync('ed25519'), mint = b58encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)); const { instruction, keys } = initializeInstruction(c.program, owner, mint, c.config.mintB, c.configId, c.platformId, x, c.platform); const block = (await service.up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value; let bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions: [instruction] }); bytes = withSignature(bytes, mint, new Uint8Array(sign(null, Buffer.from(parseTransaction(bytes).message), privateKey))); const inspection = await service.inspect(bytes, service.config.network, owner); return service.putPlan({ bytes, owner, kind: 'launchlab-create', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: 'Crear lanzamiento LaunchLab V2', name: x.name, symbol: x.symbol, mint, pool: keys.pool, creator: owner, supply: decimal(x.supply, x.decimals), curveAllocation: decimal(x.sell, x.decimals), vestingReserved: decimal(x.locked, x.decimals), fundraise: decimal(x.fund, quote.decimals) + ' ' + quote.symbol, quoteMint: c.config.mintB, metadata: x.uri, cliffSeconds: String(x.cliff), unlockSeconds: String(x.unlock), platform: c.platformId, platformName: c.platform.name, protocolFeeRate: c.config.tradeFeeRate, platformFeeRate: c.platform.feeRate, creatorFeeRate: c.platform.creatorFeeRate, platformVestingScale: c.platform.vestingScale, migrateFee: decimal(c.config.migrateFee, quote.decimals) + ' ' + quote.symbol, migration: 'CPMM, gestionada por la autoridad del protocolo al graduar', estimatedCostsLamports: inspection.networkFeeLamports, costNote: 'Se cobra rent de nuevas cuentas, además del costo de red. No se compra la curva al crear.', risks: 'Lanzamiento irreversible. No garantiza recaudación, graduación ni compradores. El vesting comienza al terminar la recaudación; falta asignar los beneficiarios.' } }); }
export async function readLaunch(service, pool, beneficiary) {
    const protocol = LAUNCH[service.config.network];
    await service.up.checkNetwork();
    const p = await load(service.up, pool, protocol.program, decodeLaunchPool), keys = launchKeys(protocol.program, p.mintA, p.mintB);
    if (keys.pool !== pool || keys.vaultA !== p.vaultA || keys.vaultB !== p.vaultB)
        throw Error('Las PDA del lanzamiento no coinciden.');
    const c = await launchConfig(service, { configId: p.configId, platformId: p.platformId });
    if (c.config.mintB !== p.mintB)
        throw Error('La moneda de recaudación no coincide.');
    let vesting = null;
    if (beneficiary) {
        const id = vestingAddress(protocol.program, pool, address(beneficiary)), a = (await service.up.rpc('getAccountInfo', [id, { encoding: 'base64', commitment: 'confirmed' }])).value;
        if (a) {
            if (a.owner !== protocol.program)
                throw Error('Cuenta de vesting incorrecta.');
            vesting = { ...decodeVesting(Buffer.from(a.data[0], 'base64')), id };
            if (vesting.pool !== pool || vesting.beneficiary !== beneficiary)
                throw Error('Vesting no corresponde al beneficiario.');
            vesting.claimableRaw = claimableVesting(p, vesting, Math.floor(Date.now() / 1000)).toString();
        }
    }
    return { ...p, curveType: c.config.curveType, id: pool, program: protocol.program, ...keys, config: c.config, platform: c.platform, beneficiary: beneficiary || null, record: vesting, statusLabel: ['Recaudando', 'Pendiente de migración', 'Graduado'][p.status] || 'Desconocido', observedAt: Date.now() };
}
export function claimableVesting(pool, record, now) { if (pool.status !== 2)
    return 0n; const start = BigInt(pool.vesting.startTime), period = BigInt(pool.vesting.unlockPeriod), time = BigInt(now), share = BigInt(record.shareAmount), claimed = BigInt(record.claimedAmount); if (!start || time < start)
    return 0n; const elapsed = time - start, unlocked = !period || elapsed >= period ? share : share * elapsed / period; return unlocked > claimed ? unlocked - claimed : 0n; }
export async function prepareVesting(service, owner, b) { const p = await readLaunch(service, address(b.pool), b.action === 'claim' ? owner : address(b.beneficiary)); if (p.mintProgramFlag !== 0)
    throw Error('Vesting Token-2022 requiere validar extensiones y no se firma aquí.'); const beneficiary = b.action === 'claim' ? owner : address(b.beneficiary), record = vestingAddress(p.program, p.pool, beneficiary); let ix, amount; if (b.action === 'allocate') {
    if (owner !== p.creator)
        throw Error('Solo el creador puede asignar esta reserva.');
    if (p.record)
        throw Error('Ese beneficiario ya tiene una asignación en este lanzamiento.');
    const raw = units(String(b.amount), p.decimalsA);
    if (!raw || BigInt(p.vesting.totalAllocatedShare) + raw > BigInt(p.vesting.totalLockedAmount))
        throw Error('Asignación mayor a la reserva disponible.');
    amount = decimal(raw, p.decimalsA);
    ix = { program: p.program, keys: [k(owner, true, true), k(beneficiary, false, true), k(p.pool, false, true), k(record, false, true), k(PROGRAM.system)], data: concat(d('global:create_vesting_account'), u64(raw)) };
}
else if (b.action === 'claim') {
    if (!p.record || BigInt(p.record.claimableRaw) <= 0n)
        throw Error('No hay tokens desbloqueados reclamables en esta consulta.');
    amount = decimal(p.record.claimableRaw, p.decimalsA);
    ix = { program: p.program, keys: [k(owner, true, true), k(p.authority), k(p.pool, false, true), k(record, false, true), k(p.vaultA, false, true), k(ata(owner, p.mintA), false, true), k(p.mintA), k(PROGRAM.token), k(PROGRAM.system), k(PROGRAM.ata)], data: d('global:claim_vested_token') };
}
else
    throw Error('Acción de vesting inválida.'); const block = (await service.up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value, bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions: [ix] }), inspection = await service.inspect(bytes, service.config.network, owner); return service.putPlan({ bytes, owner, kind: 'launchlab-vesting', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: b.action === 'claim' ? 'Reclamar vesting LaunchLab' : 'Asignar vesting LaunchLab', pool: p.pool, mint: p.mintA, beneficiary, amount, record, cliffSeconds: p.vesting.cliffPeriod, unlockSeconds: p.vesting.unlockPeriod, startTime: p.vesting.startTime, estimatedCostsLamports: inspection.networkFeeLamports, risks: 'Beneficiario y calendario son irreversibles. El protocolo determina el importe final por el tiempo on-chain.' } }); }
/** Exact-in constant-product calculation; conservative bounds and no fee-sharing by Pulp. */
export function curveQuote(p, side, raw, slippageBps = 50) {
    const n = BigInt(raw), bps = BigInt(slippageBps), den = 1000000n;
    if (p.status !== 0 || p.curveType !== 0 || n <= 0n || n > 18446744073709551615n || !Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 300)
        throw Error('Curva, importe o tolerancia no admitidos.');
    const rates = [p.config.tradeFeeRate, p.platform.feeRate, p.platform.creatorFeeRate].map(BigInt), rate = rates.reduce((a, b) => a + b, 0n);
    if (rate < 0n || rate >= den)
        throw Error('Comisiones fuera de rango.');
    const x = BigInt(p.virtualA) - BigInt(p.realA), y = BigInt(p.virtualB) + BigInt(p.realB);
    if (x <= 0n || y <= 0n)
        throw Error('Reservas virtuales inválidas.');
    const ceil = (a, b) => (a + b - 1n) / b;
    let out, fee;
    if (side === 'buy') {
        fee = ceil(n * rate, den);
        const net = n - fee;
        out = net * x / (y + net);
        if (out > BigInt(p.totalSellA) - BigInt(p.realA))
            throw Error('La operación excede el tramo restante. Reducí el importe; no se hace una compra parcial silenciosa.');
    }
    else if (side === 'sell') {
        if (n > BigInt(p.realA))
            throw Error('La venta excede los tokens vendidos por esta curva.');
        const gross = n * y / (x + n);
        if (gross > BigInt(p.realB))
            throw Error('Liquidez insuficiente.');
        fee = ceil(gross * rate, den);
        out = gross - fee;
    }
    else
        throw Error('Elegí compra o venta.');
    const minimum = out * (10000n - bps) / 10000n;
    if (out <= 0n || minimum <= 0n)
        throw Error('Salida demasiado pequeña.');
    return { input: n.toString(), output: out.toString(), minimum: minimum.toString(), quoteFee: fee.toString(), rate: rate.toString(), slippageBps };
}
export async function prepareCurveTrade(service, owner, b) {
    const p = await readLaunch(service, address(b.pool)), side = b.side;
    const [base, quote] = await Promise.all([service.tokenInfo(p.mintA), service.tokenInfo(p.mintB)]);
    if (p.mintProgramFlag !== 0 || base.program !== PROGRAM.token || quote.program !== PROGRAM.token)
        throw Error('Trading de curva limitado a SPL clásico.');
    const inMint = side === 'buy' ? p.mintB : p.mintA, outMint = side === 'buy' ? p.mintA : p.mintB, inDecimals = side === 'buy' ? p.decimalsB : p.decimalsA, outDecimals = side === 'buy' ? p.decimalsA : p.decimalsB;
    const q = curveQuote(p, side, units(String(b.amount), inDecimals), Number(b.slippageBps || 50));
    const account = (await service.up.rpc('getAccountInfo', [ata(owner, inMint), { encoding: 'jsonParsed' }])).value, info = account?.data?.parsed?.info;
    if (account?.owner !== PROGRAM.token || info?.owner !== owner || info.mint !== inMint || info.state !== 'initialized' || BigInt(info.tokenAmount.amount) < BigInt(q.input))
        throw Error('Saldo asociado insuficiente. Si la cotización es SOL, prepará wSOL antes de operar la curva.');
    const platformFee = pda([b58decode(p.platformId), b58decode(p.mintB)], p.program), creatorFee = pda([b58decode(p.creator), b58decode(p.mintB)], p.program);
    const ix = { program: p.program, keys: [k(owner, true, true), k(p.authority), k(p.configId), k(p.platformId), k(p.pool, false, true), k(ata(owner, p.mintA), false, true), k(ata(owner, p.mintB), false, true), k(p.vaultA, false, true), k(p.vaultB, false, true), k(p.mintA), k(p.mintB), k(PROGRAM.token), k(PROGRAM.token), k(p.event), k(p.program), k(PROGRAM.system), k(platformFee, false, true), k(creatorFee, false, true)], data: concat(d('global:' + (side === 'buy' ? 'buy_exact_in' : 'sell_exact_in')), u64(q.input), u64(q.minimum), u64(0n)) };
    const block = (await service.up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value, bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions: [createAta(owner, owner, outMint), ix] }), inspection = await service.inspect(bytes, service.config.network, owner);
    return service.putPlan({ bytes, owner, kind: 'launchlab-trade', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: side === 'buy' ? 'Comprar en curva LaunchLab' : 'Vender en curva LaunchLab', pool: p.pool, inputMint: inMint, outputMint: outMint, inputAmount: decimal(q.input, inDecimals), estimatedOutput: decimal(q.output, outDecimals), minimumReceived: decimal(q.minimum, outDecimals), protocolFees: decimal(q.quoteFee, p.decimalsB), feeCurrency: p.mintB, slippageBps: q.slippageBps, pulpFeeBps: 0, estimatedCostsLamports: inspection.networkFeeLamports, risks: 'Precio muy volátil, riesgo de contratos y liquidez. El mínimo recibido se impone en la transacción; la curva puede cambiar antes de confirmar.' } });
}
