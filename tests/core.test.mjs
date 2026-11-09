import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import * as S from '../shared/solana.mjs';
import { verifyEd25519, safeRpcUrl, onCurve, pda } from '../server/security.mjs';
import { transferSol, transferToken, buildMint, ata } from '../server/builders.mjs';
import { validateEarn } from '../server/validate-earn.mjs';
import { identity, makeFixtures, BLOCKHASH, TEST_MINT } from './fixtures.mjs';
const id = identity(), other = identity();
test('Base58 preserves leading zeros and randomized public keys', () => { for (const n of [1, 2, 32, 64])
    for (let i = 0; i < 40; i++) {
        const b = randomBytes(n);
        if (i % 2 === 0)
            b[0] = 0;
        assert.deepEqual(S.b58decode(S.b58encode(b)), new Uint8Array(b));
    } assert.equal(S.address(S.PROGRAM.system), S.PROGRAM.system); });
test('Address and signature validators reject malformed lengths/alphabet', () => { for (const v of ['', '0OIl', 'abc', S.b58encode(randomBytes(31))])
    assert.throws(() => S.address(v)); assert.throws(() => S.signature(id.owner)); });
test('Decimal conversions retain u64 precision with no floats', () => { assert.equal(S.units('18446744073.709551615', 9), 18446744073709551615n); assert.equal(S.decimal(18446744073709551615n, 9), '18446744073.709551615'); assert.equal(S.units('0.000001', 6), 1n); assert.equal(S.decimal(1000000n, 6), '1'); assert.equal(S.decimal(0n, 9), '0'); });
test('Amounts reject zero, negatives, exponents, separators and overflow', () => { for (const v of ['0', '-1', '1e3', 'NaN', '1,000', '0.0000001', '01', '18446744073709551616'])
    assert.throws(() => S.units(v, 6)); });
test('SOL transfer encodes owner, destination, instruction 2 and exact u64', () => { const t = S.parseTransaction(transferSol(id.owner, other.owner, 1234567890123n, BLOCKHASH)); assert.equal(t.keys[0], id.owner); assert.equal(t.required, 1); assert.equal(t.keys[t.instructions[0].programIndex], S.PROGRAM.system); assert.deepEqual(t.instructions[0].data, S.concat(S.u32(2), S.u64(1234567890123n))); assert.equal(t.blockhash, BLOCKHASH); });
test('User signatures verify with native Ed25519 and preserve exact message', () => { const raw = transferSol(id.owner, other.owner, 1n, BLOCKHASH), t = S.parseTransaction(raw), sig = id.sign(t.message), signed = S.withSignature(raw, id.owner, sig); assert.ok(verifyEd25519(id.owner, t.message, sig)); assert.equal(S.assertSignedMatches(raw, signed, id.owner).required, 1); assert.ok(!verifyEd25519(other.owner, t.message, sig)); });
test('Altered transaction message and missing signatures are rejected', () => { const raw = transferSol(id.owner, other.owner, 1n, BLOCKHASH), signed = S.withSignature(raw, id.owner, id.sign(S.parseTransaction(raw).message)); const altered = new Uint8Array(signed); altered[altered.length - 1] ^= 1; assert.throws(() => S.assertSignedMatches(raw, altered, id.owner), /modificó/); assert.throws(() => S.assertSignedMatches(raw, raw, id.owner), /Falta/); });
test('Wire parser rejects truncation, trailing bytes and unsupported versions', () => { const raw = transferSol(id.owner, other.owner, 1n, BLOCKHASH); assert.throws(() => S.parseTransaction(raw.slice(0, -1))); assert.throws(() => S.parseTransaction(S.concat(raw, Uint8Array.of(0)))); const v = new Uint8Array(raw); v[65] = 129; assert.throws(() => S.parseTransaction(v), /Versión/); });
test('Version 0 wire envelope is parsed without changing the message', () => { const raw = transferSol(id.owner, other.owner, 1n, BLOCKHASH), t = S.parseTransaction(raw); const v0 = S.concat(raw.slice(0, t.messageOffset), Uint8Array.of(128), t.message, Uint8Array.of(0)); const p = S.parseTransaction(v0); assert.equal(p.version, 0); assert.equal(p.blockhash, BLOCKHASH); assert.equal(p.lookups.length, 0); });
test('SPL transfer uses TransferChecked and creates recipient ATA idempotently', () => { const source = ata(id.owner, S.MINT.USDC), raw = transferToken({ owner: id.owner, destination: other.owner, mint: S.MINT.USDC, source, amount: 42n, decimals: 6, blockhash: BLOCKHASH }), t = S.parseTransaction(raw); assert.equal(t.instructions.length, 2); assert.equal(t.keys[t.instructions[0].programIndex], S.PROGRAM.ata); assert.equal(t.instructions[0].data[0], 1); assert.deepEqual(t.instructions[1].data, S.concat(Uint8Array.of(12), S.u64(42), Uint8Array.of(6))); });
test('PDA is deterministic, off-curve, and owner-sensitive', () => { assert.ok(onCurve(S.b58decode(id.owner))); const a = ata(id.owner, S.MINT.USDC); assert.ok(!onCurve(S.b58decode(a))); assert.equal(a, ata(id.owner, S.MINT.USDC)); assert.notEqual(a, ata(other.owner, S.MINT.USDC)); assert.throws(() => pda([new Uint8Array(33)], S.PROGRAM.ata)); });
test('Mint creation atomically initializes, issues supply and revokes mint authority', () => { const r = buildMint({ owner: id.owner, name: 'Test', symbol: 'TEST', supply: '1000000', decimals: 6, fixed: true, blockhash: BLOCKHASH, rent: 1461600n }), t = S.parseTransaction(r.bytes); assert.equal(t.required, 2); assert.equal(r.amount, '1000000000000'); assert.equal(t.instructions[1].data[0], 20); assert.equal(t.instructions.at(-1).data[0], 6); assert.equal(t.instructions.at(-1).data[2], 0); const mi = t.keys.indexOf(r.mint); assert.ok(verifyEd25519(r.mint, t.message, t.signatures[mi])); assert.ok(t.signatures[0].every(x => x === 0)); });
test('Mint metadata uses V3 and remains within transaction size', () => { const r = buildMint({ owner: id.owner, name: 'Pulp', symbol: 'PULP', uri: 'https://example.org/token.json', supply: '1000000000', decimals: 6, fixed: true, blockhash: BLOCKHASH, rent: 1461600n }), t = S.parseTransaction(r.bytes); assert.ok(r.bytes.length <= 1232); const metadata = t.instructions.find(i => t.keys[i.programIndex] === S.PROGRAM.metadata); assert.equal(metadata.data[0], 33); assert.equal(r.metadata, true); });
test('Mint co-signature cannot be silently dropped by a wallet', () => { const r = buildMint({ owner: id.owner, name: 'Test', symbol: 'TEST', supply: '1', decimals: 0, fixed: true, blockhash: BLOCKHASH, rent: 1461600n }); const t = S.parseTransaction(r.bytes); let signed = S.withSignature(r.bytes, id.owner, id.sign(t.message)); signed = S.withSignature(signed, r.mint, new Uint8Array(64)); assert.throws(() => S.assertSignedMatches(r.bytes, signed, id.owner), /firma existente/); });
test('RPC URLs refuse plain HTTP, local addresses, embedded credentials and nonstandard ports', () => { for (const u of ['http://rpc.example.org', 'https://localhost', 'https://127.0.0.1', 'https://rpc.local', 'https://u:p@rpc.example.org', 'https://rpc.example.org:444'])
    assert.throws(() => safeRpcUrl(u)); assert.equal(safeRpcUrl('https://mainnet.helius-rpc.com/?api-key=x'), 'https://mainnet.helius-rpc.com/?api-key=x'); });
test('Earn inspector verifies exact deposit and withdrawal intents', () => { const f = makeFixtures({ owner: id.owner }); for (const action of ['deposit', 'withdraw']) {
    const raw = f.earnBytes(id.owner, action, '1000000'), t = S.parseTransaction(raw);
    assert.equal(validateEarn(raw, t.keys, { owner: id.owner, mint: S.MINT.USDC, fMint: TEST_MINT, action, amount: '1000000' }), true);
    assert.throws(() => validateEarn(raw, t.keys, { owner: id.owner, mint: S.MINT.USDC, fMint: TEST_MINT, action, amount: '1000001' }));
} });
test('Earn inspector rejects unrelated transfers', () => { const raw = transferSol(id.owner, other.owner, 1n, BLOCKHASH), t = S.parseTransaction(raw); assert.throws(() => validateEarn(raw, t.keys, { owner: id.owner, mint: S.MINT.USDC, fMint: TEST_MINT, action: 'deposit', amount: '1' })); });
test('Base64 decoder rejects noncanonical inputs and oversized payloads', () => { for (const x of ['*', 'abc', 'a'.repeat(70000), 'AQAA\n'])
    assert.throws(() => S.from64(x)); const b = randomBytes(100); assert.deepEqual(S.from64(S.to64(b)), new Uint8Array(b)); });
