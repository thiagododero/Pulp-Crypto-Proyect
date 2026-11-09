/** Solana wire-format utilities. No key storage, no custom signature algorithm.
 * Signatures are produced by Wallet Standard (user) and Node crypto (new mint only).
 * Reference formats: docs/SOURCES.md. BigInt is used for all token amounts.
 */
export const PROGRAM = Object.freeze({
    system: '11111111111111111111111111111111',
    token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    token2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    ata: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    metadata: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    rent: 'SysvarRent111111111111111111111111111111111',
    compute: 'ComputeBudget111111111111111111111111111111',
});
export const MINT = Object.freeze({ SOL: 'So11111111111111111111111111111111111111112', USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' });
export const GENESIS = Object.freeze({
    mainnet: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
    devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
});
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58decode(s) {
    if (typeof s !== 'string' || !s || s.length > 2048)
        throw Error('Base58 inválido.');
    let n = 0n;
    for (const c of s) {
        const i = alphabet.indexOf(c);
        if (i < 0)
            throw Error('Base58 inválido.');
        n = n * 58n + BigInt(i);
    }
    const a = [];
    while (n) {
        a.push(Number(n & 255n));
        n >>= 8n;
    }
    a.reverse();
    let z = 0;
    while (s[z] === '1')
        z++;
    return Uint8Array.from([...Array(z).fill(0), ...a]);
}
export function b58encode(a) { let n = 0n; for (const b of a)
    n = n * 256n + BigInt(b); let s = ''; while (n) {
    s = alphabet[Number(n % 58n)] + s;
    n /= 58n;
} for (const b of a) {
    if (b !== 0)
        break;
    s = '1' + s;
} return s; }
export function address(s) { const a = b58decode(s); if (a.length !== 32 || b58encode(a) !== s)
    throw Error('La dirección debe ser una clave pública Solana válida.'); return s; }
export function signature(s) { if (b58decode(s).length !== 64)
    throw Error('Firma de transacción inválida.'); return s; }
export function from64(s) { if (typeof s !== 'string' || s.length > 65536 || !s || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4)
    throw Error('Base64 inválido.'); const bytes = typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0)); if (to64(bytes) !== s)
    throw Error('Base64 no canónico.'); return bytes; }
export function to64(b) { return typeof Buffer !== 'undefined' ? Buffer.from(b).toString('base64') : btoa(String.fromCharCode(...b)); }
export function concat(...arrays) { const b = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0)); let i = 0; for (const a of arrays) {
    b.set(a, i);
    i += a.length;
} return b; }
export function same(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
export function u32(n) { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, n, true); return a; }
export function u64(n) { n = BigInt(n); if (n < 0n || n > 18446744073709551615n)
    throw Error('Importe fuera de u64.'); const a = new Uint8Array(8); new DataView(a.buffer).setBigUint64(0, n, true); return a; }
export function short(n) { if (!Number.isInteger(n) || n < 0 || n > 65535)
    throw Error('Longitud inválida.'); const a = []; do {
    let b = n & 127;
    n >>>= 7;
    a.push(b | (n ? 128 : 0));
} while (n); return Uint8Array.from(a); }
export function units(text, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18)
        throw Error('Decimales inválidos.');
    const s = String(text).trim();
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(s))
        throw Error('Ingresá un importe positivo, sin separadores de miles.');
    const [whole, frac = ''] = s.split('.');
    if (frac.length > decimals)
        throw Error(`El activo admite ${decimals} decimales.`);
    const n = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0') || '0');
    if (n <= 0n || n > 18446744073709551615n)
        throw Error('Importe fuera de rango.');
    return n;
}
export function decimal(n, d) { n = BigInt(n || 0); const minus = n < 0n ? '-' : ''; if (n < 0n)
    n = -n; const s = n.toString().padStart(d + 1, '0'); return minus + (d ? `${s.slice(0, -d)}.${s.slice(-d)}`.replace(/\.?0+$/, '') : s); }
export function parseTransaction(bytes) {
    bytes = new Uint8Array(bytes);
    if (bytes.length < 100 || bytes.length > 1232)
        throw Error('Transacción legacy/v0 fuera de tamaño.');
    let p = 0;
    const take = n => { if (p + n > bytes.length)
        throw Error('Transacción truncada.'); const x = bytes.slice(p, p + n); p += n; return x; };
    const readShort = () => { let n = 0, shift = 0, count = 0, b; do {
        b = take(1)[0];
        n |= (b & 127) << shift;
        shift += 7;
        count++;
        if (count > 3 || n > 65535)
            throw Error('Longitud corrupta.');
    } while (b & 128); if (count > 1 && b === 0)
        throw Error('Longitud no canónica.'); return n; };
    const sigCount = readShort();
    if (sigCount < 1 || sigCount > 12)
        throw Error('Cantidad de firmas inválida.');
    const signatures = Array.from({ length: sigCount }, () => take(64));
    const messageOffset = p;
    const first = take(1)[0];
    let version = 'legacy', required = first;
    if (first & 128) {
        version = first & 127;
        if (version !== 0)
            throw Error('Versión de transacción no compatible (solo legacy y v0).');
        required = take(1)[0];
    }
    const readonlySigned = take(1)[0], readonlyUnsigned = take(1)[0], nKeys = readShort();
    if (required !== sigCount || required > nKeys || readonlySigned > required || readonlyUnsigned > nKeys - required || nKeys > 256)
        throw Error('Cabecera inválida.');
    const keys = Array.from({ length: nKeys }, () => b58encode(take(32)));
    const blockhash = b58encode(take(32));
    const nIx = readShort();
    if (nIx > 64)
        throw Error('Demasiadas instrucciones.');
    const instructions = Array.from({ length: nIx }, () => { const programIndex = take(1)[0], accounts = Array.from(take(readShort())), data = take(readShort()); return { programIndex, accounts, data }; });
    const lookups = [];
    if (version === 0) {
        const n = readShort();
        if (n > 32)
            throw Error('Demasiadas tablas de direcciones.');
        for (let i = 0; i < n; i++)
            lookups.push({ key: b58encode(take(32)), writable: Array.from(take(readShort())), readonly: Array.from(take(readShort())) });
    }
    if (p !== bytes.length)
        throw Error('Bytes sobrantes en la transacción.');
    const loaded = lookups.reduce((n, l) => n + l.writable.length + l.readonly.length, 0);
    for (const ix of instructions)
        if (ix.programIndex >= nKeys + loaded || ix.accounts.some(x => x >= nKeys + loaded))
            throw Error('Índice de cuenta inválido.');
    return { bytes, version, signatures, required, readonlySigned, readonlyUnsigned, keys, blockhash, instructions, lookups, message: bytes.slice(messageOffset), messageOffset };
}
export function compileLegacy({ payer, blockhash, instructions }) {
    address(payer);
    address(blockhash);
    const map = new Map([[payer, { key: payer, signer: true, writable: true }]]);
    for (const ix of instructions) {
        for (const a of ix.keys) {
            address(a.key);
            const prev = map.get(a.key);
            map.set(a.key, { key: a.key, signer: !!a.signer || !!prev?.signer, writable: !!a.writable || !!prev?.writable });
        }
        address(ix.program);
        if (!map.has(ix.program))
            map.set(ix.program, { key: ix.program, signer: false, writable: false });
    }
    const keys = [map.get(payer), ...Array.from(map.values()).filter(a => a.key !== payer).sort((a, b) => Number(b.signer) - Number(a.signer) || Number(b.writable) - Number(a.writable))];
    if (keys.length > 256)
        throw Error('Demasiadas cuentas.');
    const signers = keys.filter(a => a.signer);
    const header = Uint8Array.of(signers.length, signers.filter(a => !a.writable).length, keys.filter(a => !a.signer && !a.writable).length);
    const getIndex = k => keys.findIndex(a => a.key === k);
    const ixs = instructions.map(ix => concat(Uint8Array.of(getIndex(ix.program)), short(ix.keys.length), Uint8Array.from(ix.keys.map(a => getIndex(a.key))), short(ix.data.length), ix.data));
    const message = concat(header, short(keys.length), ...keys.map(a => b58decode(a.key)), b58decode(blockhash), short(ixs.length), ...ixs);
    const bytes = concat(short(signers.length), new Uint8Array(signers.length * 64), message);
    parseTransaction(bytes);
    return bytes;
}
export function withSignature(bytes, signer, sig) { const t = parseTransaction(bytes), i = t.keys.slice(0, t.required).indexOf(signer); if (i < 0 || sig.length !== 64)
    throw Error('Firmante inválido.'); const b = new Uint8Array(bytes); b.set(sig, short(t.required).length + i * 64); return b; }
export function assertSignedMatches(unsigned, signed, owner) { const a = parseTransaction(unsigned), b = parseTransaction(signed); if (!same(a.message, b.message))
    throw Error('La wallet modificó la transacción revisada. Operación cancelada.'); const i = a.keys.slice(0, a.required).indexOf(owner); if (i < 0 || b.signatures[i].every(x => x === 0))
    throw Error('Falta la firma de la wallet.'); for (let j = 0; j < a.required; j++)
    if (j !== i && !a.signatures[j].every(x => x === 0) && !same(a.signatures[j], b.signatures[j]))
        throw Error('Se alteró una firma existente.'); return b; }
export function explorer(value, type = 'tx', network = 'mainnet') { if (type === 'tx')
    signature(value);
else
    address(value); return `https://explorer.solana.com/${type === 'tx' ? 'tx' : 'address'}/${value}${network === 'devnet' ? '?cluster=devnet' : ''}`; }
export function safeHttps(s) { try {
    const u = new URL(s);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
}
catch {
    return '';
} }
export function safeAmount(n) { if (typeof n !== 'string' || !/^\d+$/.test(n) || BigInt(n) > 18446744073709551615n)
    throw Error('Respuesta de importe inválida.'); return BigInt(n); }
export function assertOrder(o, intent) { if (o.error || o.errorCode)
    throw Error(o.errorMessage || o.error || 'Jupiter no puede construir esta operación.'); if (o.inputMint !== intent.inputMint || o.outputMint !== intent.outputMint || o.inAmount !== intent.amount || o.taker !== intent.owner)
    throw Error('La cotización no coincide con la solicitud.'); if (o.swapMode !== 'ExactIn')
    throw Error('Solo se admite ExactIn.'); if (!o.transaction || !o.requestId || safeAmount(o.outAmount) <= 0n || safeAmount(o.otherAmountThreshold) <= 0n)
    throw Error('No hay una ruta ejecutable con mínimo de recepción.'); if (safeAmount(o.otherAmountThreshold) > safeAmount(o.outAmount))
    throw Error('Mínimo de recepción inválido.'); if (!Number.isInteger(o.slippageBps) || o.slippageBps < 0 || o.slippageBps > intent.slippageBps)
    throw Error('El deslizamiento excede tu límite.'); if (o.receiver && o.receiver !== intent.owner)
    throw Error('Destino de fondos inesperado.'); const t = parseTransaction(from64(o.transaction)); if (!t.keys.slice(0, t.required).includes(intent.owner))
    throw Error('La wallet no figura como firmante.'); return t; }
