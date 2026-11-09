import { createHash, createPublicKey, verify, randomBytes } from 'node:crypto';
import { b58decode, b58encode, concat, address } from '../shared/solana.mjs';
export const randomId = () => randomBytes(24).toString('hex');
export const digest = b => createHash('sha256').update(b).digest('hex');
export function verifyEd25519(owner, message, sig) { try {
    address(owner);
    if (sig.length !== 64)
        return false;
    const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(b58decode(owner))]), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(message), key, Buffer.from(sig));
}
catch {
    return false;
} }
// PDA derivation only: test whether a SHA-256 result decompresses to an Ed25519 point.
// No signature implementation and no secret-key curve operations occur here.
const P = (1n << 255n) - 19n;
const mod = x => ((x % P) + P) % P;
function pow(x, n) { let r = 1n; x = mod(x); while (n) {
    if (n & 1n)
        r = mod(r * x);
    x = mod(x * x);
    n >>= 1n;
} return r; }
const D = mod(-121665n * pow(121666n, P - 2n));
export function onCurve(bytes) { if (bytes.length !== 32)
    return false; const a = new Uint8Array(bytes); const sign = a[31] >> 7; a[31] &= 127; let y = 0n; for (let i = 31; i >= 0; i--)
    y = (y << 8n) + BigInt(a[i]); if (y >= P)
    return false; const y2 = mod(y * y), u = mod(y2 - 1n), v = mod(D * y2 + 1n); if (v === 0n)
    return false; const x2 = mod(u * pow(v, P - 2n)); if (x2 === 0n)
    return sign === 0; return pow(x2, (P - 1n) / 2n) === 1n; }
export function pda(seeds, program) { if (seeds.length > 15 || seeds.some(s => s.length > 32))
    throw Error('Seeds inválidas.'); address(program); for (let bump = 255; bump >= 0; bump--) {
    const bytes = createHash('sha256').update(concat(...seeds, Uint8Array.of(bump), b58decode(program), new TextEncoder().encode('ProgramDerivedAddress'))).digest();
    if (!onCurve(bytes))
        return b58encode(bytes);
} throw Error('No se pudo derivar la dirección.'); }
export function safeRpcUrl(s) { const u = new URL(s); if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.port && u.port !== '443')
    throw Error('El RPC debe ser una URL HTTPS sin credenciales de usuario.'); if (/(^localhost$|\.local$|\.internal$|^\d+\.\d+\.\d+\.\d+$|:|^127\.|^0\.)/i.test(u.hostname))
    throw Error('No se admiten RPC locales o direcciones IP.'); return u.href; }
export function safeProtocolUrl(s, hosts) { if (!s)
    return ''; const u = new URL(s); if (u.protocol !== 'https:' || u.username || u.password || !hosts.includes(u.hostname))
    throw Error('El enlace debe pertenecer al proveedor admitido.'); return u.href; }
export function text(s, max = 100) { if (typeof s !== 'string' || !s.trim() || s.length > max)
    throw Error('Texto inválido o demasiado largo.'); return s.trim(); }
export function assertLamports(n) { if (!Number.isSafeInteger(n) || n < 0)
    throw Error('El RPC devolvió un saldo fuera del rango exacto de esta beta.'); return BigInt(n); }
