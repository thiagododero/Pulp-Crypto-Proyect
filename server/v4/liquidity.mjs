/** Raydium CPMM legacy-token paths. Source/layout references in docs/v4/FUENTES.md. */
import { createHash } from 'node:crypto';
import { PROGRAM, MINT, address, b58decode, b58encode, concat, u32, u64, compileLegacy, units, decimal } from '../../shared/solana.mjs';
import { ata, createAta } from '../builders.mjs';
import { pda } from '../security.mjs';
export const CPMM = { mainnet: { program: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C', fee: 'DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8' }, devnet: { program: 'DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb', fee: '3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy' } };
const utf = s => new TextEncoder().encode(s), k = (key, signer = false, writable = false) => ({ key, signer, writable });
const disc = s => createHash('sha256').update(s).digest().subarray(0, 8);
const ceil = (a, b) => (a + b - 1n) / b;
const fixed = n => {
    n = BigInt(n);
    if (n < 0n || n > 18446744073709551615n)
        throw Error('Importe fuera de rango.');
    return n;
};
export function poolKeys(program, config, mintA, mintB) { const pool = pda([utf('pool'), b58decode(config), b58decode(mintA), b58decode(mintB)], program); return { pool, authority: pda([utf('vault_and_lp_mint_auth_seed')], program), lp: pda([utf('pool_lp_mint'), b58decode(pool)], program), vaultA: pda([utf('pool_vault'), b58decode(pool), b58decode(mintA)], program), vaultB: pda([utf('pool_vault'), b58decode(pool), b58decode(mintB)], program), observation: pda([utf('observation'), b58decode(pool)], program) }; }
export function decodePool(input) {
    const b = Buffer.from(input);
    if (b.length < 437 || !b.subarray(0, 8).equals(disc('account:PoolState')))
        throw Error('Layout CPMM no admitido.');
    let i = 8;
    const pub = () => { const v = b58encode(b.subarray(i, i + 32)); i += 32; return v; }, byte = () => b[i++], num = () => { const v = b.readBigUInt64LE(i); i += 8; return v; };
    const out = {};
    for (const n of ['configId', 'poolCreator', 'vaultA', 'vaultB', 'mintLp', 'mintA', 'mintB', 'mintProgramA', 'mintProgramB', 'observationId'])
        out[n] = pub();
    for (const n of ['bump', 'status', 'lpDecimals', 'mintDecimalA', 'mintDecimalB'])
        out[n] = byte();
    for (const n of ['lpAmount', 'protocolFeesMintA', 'protocolFeesMintB', 'fundFeesMintA', 'fundFeesMintB', 'openTime', 'epoch'])
        out[n] = num().toString();
    out.feeOn = byte();
    out.enableCreatorFee = !!byte();
    i += 6;
    out.creatorFeesMintA = num().toString();
    out.creatorFeesMintB = num().toString();
    return out;
}
export function quoteLiquidity(p, { action, raw, slippageBps = 50 }) {
    const lp = fixed(p.lpAmount), ra = fixed(p.reserveA), rb = fixed(p.reserveB), n = fixed(raw), bps = BigInt(slippageBps);
    if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 300 || !lp || !ra || !rb || !n)
        throw Error('Pool, importe o slippage inválidos.');
    if (action === 'deposit') {
        let shares = n * 10000n * lp / (ra * (10000n + bps));
        while (shares > 0n && ceil(ceil(shares * ra, lp) * (10000n + bps), 10000n) > n)
            shares--;
        if (!shares)
            throw Error('Importe demasiado pequeño.');
        return { lp: shares.toString(), amountA: fixed(ceil(ceil(shares * ra, lp) * (10000n + bps), 10000n)).toString(), amountB: fixed(ceil(ceil(shares * rb, lp) * (10000n + bps), 10000n)).toString(), bound: 'maximum' };
    }
    if (action === 'withdraw') {
        if (n >= lp)
            throw Error('Participación LP inválida.');
        return { lp: n.toString(), amountA: (n * ra / lp * (10000n - bps) / 10000n).toString(), amountB: (n * rb / lp * (10000n - bps) / 10000n).toString(), bound: 'minimum' };
    }
    throw Error('Acción no admitida.');
}
export async function readPool(service, id) {
    address(id);
    const { up, config } = service, program = CPMM[config.network].program;
    await up.checkNetwork();
    const a = (await up.rpc('getAccountInfo', [id, { encoding: 'base64', commitment: 'confirmed' }])).value;
    if (!a || a.owner !== program)
        throw Error('Solo se admiten pools Raydium CPMM de la red seleccionada.');
    const p = decodePool(Buffer.from(a.data[0], 'base64'));
    if (p.mintProgramA !== PROGRAM.token || p.mintProgramB !== PROGRAM.token)
        throw Error('Este pool usa Token-2022. Operá en el protocolo hasta validar sus extensiones.');
    const keys = poolKeys(program, p.configId, p.mintA, p.mintB);
    if (keys.pool !== id || keys.lp !== p.mintLp || keys.vaultA !== p.vaultA || keys.vaultB !== p.vaultB || keys.observation !== p.observationId)
        throw Error('Las cuentas del pool no corresponden a sus PDA.');
    const [a0, a1] = await Promise.all([up.rpc('getAccountInfo', [p.vaultA, { encoding: 'jsonParsed' }]), up.rpc('getAccountInfo', [p.vaultB, { encoding: 'jsonParsed' }])]);
    for (const [v, m] of [[a0, p.mintA], [a1, p.mintB]])
        if (v.value?.owner !== PROGRAM.token || v.value?.data?.parsed?.info?.mint !== m || v.value.data.parsed.info.owner !== keys.authority)
            throw Error('Vault del pool inválido.');
    const reserveA = BigInt(a0.value.data.parsed.info.tokenAmount.amount) - BigInt(p.protocolFeesMintA) - BigInt(p.fundFeesMintA) - BigInt(p.creatorFeesMintA), reserveB = BigInt(a1.value.data.parsed.info.tokenAmount.amount) - BigInt(p.protocolFeesMintB) - BigInt(p.fundFeesMintB) - BigInt(p.creatorFeesMintB);
    if (reserveA <= 0n || reserveB <= 0n)
        throw Error('El pool no tiene reservas utilizables.');
    return { ...p, ...keys, id, program, reserveA: reserveA.toString(), reserveB: reserveB.toString(), source: 'Raydium CPMM · cuentas verificadas por RPC', observedAt: Date.now() };
}
async function requireTokens(service, owner, mint, raw) {
    const a = (await service.up.rpc('getAccountInfo', [ata(owner, mint), { encoding: 'jsonParsed' }])).value;
    const info = a?.data?.parsed?.info;
    if (a?.owner !== PROGRAM.token || info?.owner !== owner || info.mint !== mint || info.state !== 'initialized' || BigInt(info.tokenAmount.amount) < BigInt(raw))
        throw Error('Saldo insuficiente en la cuenta asociada del token. Usá wSOL para pools SOL o consolidá cuentas.');
}
export async function prepareLiquidity(service, owner, b) {
    const p = await readPool(service, address(b.pool));
    const action = b.action;
    if ((action === 'deposit' && (p.status & 1)) || (action === 'withdraw' && (p.status & 2)))
        throw Error('Esta acción está pausada por el pool.');
    const raw = units(String(b.amount), action === 'deposit' ? p.mintDecimalA : p.lpDecimals);
    const q = quoteLiquidity(p, { action, raw, slippageBps: Number(b.slippageBps || 50) });
    const { up, config } = service;
    const block = (await up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value;
    const ix = [];
    if (action === 'deposit') {
        await requireTokens(service, owner, p.mintA, q.amountA);
        await requireTokens(service, owner, p.mintB, q.amountB);
        ix.push(createAta(owner, owner, p.mintLp));
    }
    else {
        await requireTokens(service, owner, p.mintLp, q.lp);
        ix.push(createAta(owner, owner, p.mintA), createAta(owner, owner, p.mintB));
    }
    const keys = [k(owner, true), k(p.authority), k(p.pool, false, true), k(ata(owner, p.mintLp), false, true), k(ata(owner, p.mintA), false, true), k(ata(owner, p.mintB), false, true), k(p.vaultA, false, true), k(p.vaultB, false, true), k(PROGRAM.token), k(PROGRAM.token2022), k(p.mintA), k(p.mintB), k(p.mintLp, false, true)];
    if (action === 'withdraw')
        keys.push(k('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'));
    ix.push({ program: p.program, keys, data: concat(disc('global:' + (action === 'deposit' ? 'deposit' : 'withdraw')), u64(BigInt(q.lp)), u64(BigInt(q.amountA)), u64(BigInt(q.amountB))) });
    const bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions: ix });
    const inspection = await service.inspect(bytes, config.network, owner);
    return service.putPlan({ bytes, owner, kind: 'liquidity', lastValidBlockHeight: block.lastValidBlockHeight, inspection, summary: { title: action === 'deposit' ? 'Agregar liquidez CPMM' : 'Retirar liquidez CPMM', pool: p.id, action, mintA: p.mintA, mintB: p.mintB, lpMint: p.mintLp, lpAmount: decimal(q.lp, p.lpDecimals), amountA: decimal(q.amountA, p.mintDecimalA), amountB: decimal(q.amountB, p.mintDecimalB), amountBounds: q.bound, slippageBps: Number(b.slippageBps || 50), estimatedCostsLamports: inspection.networkFeeLamports, risks: 'Riesgo de contratos, cambios de precio y pérdida frente a mantener los activos. Se pueden cobrar rentas de cuentas asociadas.' } });
}
export async function preparePoolCreate(service, owner, b) {
    const { up, config } = service;
    await up.checkNetwork();
    const protocol = CPMM[config.network], cfg = address(b.configId);
    let A = address(b.mintA), B = address(b.mintB), amountA = String(b.amountA), amountB = String(b.amountB);
    if (A === B)
        throw Error('Elegí mints diferentes.');
    if (Buffer.compare(Buffer.from(b58decode(A)), Buffer.from(b58decode(B))) > 0) {
        [A, B] = [B, A];
        [amountA, amountB] = [amountB, amountA];
    }
    const [a, bInfo] = await Promise.all([service.tokenInfo(A), service.tokenInfo(B)]);
    if (a.program !== PROGRAM.token || bInfo.program !== PROGRAM.token)
        throw Error('Creación CPMM limitada a tokens SPL clásicos.');
    const x = units(amountA, a.decimals), y = units(amountB, bInfo.decimals);
    if (!x || !y)
        throw Error('Ambos aportes de liquidez deben ser positivos.');
    await requireTokens(service, owner, A, x);
    await requireTokens(service, owner, B, y);
    const ca = (await up.rpc('getAccountInfo', [cfg, { encoding: 'base64' }])).value;
    if (ca?.owner !== protocol.program)
        throw Error('Configuración Raydium inválida.');
    const cd = Buffer.from(ca.data[0], 'base64');
    if (cd.length < 44 || !cd.subarray(0, 8).equals(disc('account:AmmConfig')) || cd[9])
        throw Error('Creación de pools no admitida para esta configuración.');
    const poolFee = cd.readBigUInt64LE(36);
    const p = poolKeys(protocol.program, cfg, A, B);
    if ((await up.rpc('getAccountInfo', [p.pool, { encoding: 'base64' }])).value)
        throw Error('Este pool ya existe. Agregá liquidez desde su ficha.');
    const block = (await up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value;
    const keys = [k(owner, true), k(cfg), k(p.authority), k(p.pool, false, true), k(A), k(B), k(p.lp, false, true), k(ata(owner, A), false, true), k(ata(owner, B), false, true), k(ata(owner, p.lp), false, true), k(p.vaultA, false, true), k(p.vaultB, false, true), k(protocol.fee, false, true), k(p.observation, false, true), k(PROGRAM.token), k(PROGRAM.token), k(PROGRAM.token), k(PROGRAM.ata), k(PROGRAM.system), k(PROGRAM.rent)];
    const bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions: [{ program: protocol.program, keys, data: concat(disc('global:initialize'), u64(x), u64(y), u64(0n)) }] });
    const inspection = await service.inspect(bytes, config.network, owner);
    return service.putPlan({ bytes, owner, kind: 'pool-create', lastValidBlockHeight: block.lastValidBlockHeight, inspection, summary: { title: 'Crear pool Raydium CPMM', pool: p.pool, mintA: A, mintB: B, amountA, amountB, lpMint: p.lp, recipient: owner, protocolFeeLamports: poolFee.toString(), estimatedCostsLamports: (poolFee + BigInt(inspection.networkFeeLamports)).toString(), risks: 'Establecés el precio inicial. Capital aportado queda expuesto al AMM. Costos de rent adicionales a la comisión del protocolo. No es una preventa.' } });
}
