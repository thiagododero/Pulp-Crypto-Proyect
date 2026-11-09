import { generateKeyPairSync, sign } from 'node:crypto';
import { PROGRAM, b58decode, b58encode, concat, u32, u64, compileLegacy, parseTransaction, withSignature, units, address } from '../shared/solana.mjs';
import { pda } from './security.mjs';
const key = (key, signer = false, writable = false) => ({ key, signer, writable });
export const ata = (owner, mint, program = PROGRAM.token) => pda([b58decode(owner), b58decode(program), b58decode(mint)], PROGRAM.ata);
export const createAta = (payer, owner, mint, program = PROGRAM.token) => ({ program: PROGRAM.ata, keys: [key(payer, true, true), key(ata(owner, mint, program), false, true), key(owner), key(mint), key(PROGRAM.system), key(program)], data: Uint8Array.of(1) });
export function transferSol(owner, destination, amount, blockhash) { return compileLegacy({ payer: owner, blockhash, instructions: [{ program: PROGRAM.system, keys: [key(owner, true, true), key(destination, false, true)], data: concat(u32(2), u64(amount)) }] }); }
export function transferToken({ owner, destination, mint, source, amount, decimals, blockhash }) { return compileLegacy({ payer: owner, blockhash, instructions: [createAta(owner, destination, mint), { program: PROGRAM.token, keys: [key(source, false, true), key(mint), key(ata(destination, mint), false, true), key(owner, true)], data: concat(Uint8Array.of(12), u64(amount), Uint8Array.of(decimals)) }] }); }
const str = s => { const b = new TextEncoder().encode(s); return concat(u32(b.length), b); };
export function buildMint({ owner, name, symbol, uri = '', supply, decimals = 6, fixed = true, blockhash, rent }) {
    address(owner);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9)
        throw Error('Decimales: 0 a 9.');
    if (new TextEncoder().encode(name).length > 32 || new TextEncoder().encode(symbol).length > 10 || new TextEncoder().encode(uri).length > 200)
        throw Error('Nombre, ticker o URI exceden el límite de metadatos.');
    const amount = units(supply, decimals);
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const mint = b58encode(new Uint8Array(publicKey.export({ format: 'der', type: 'spki' })).slice(-32));
    const tokenAccount = ata(owner, mint);
    const ix = [
        { program: PROGRAM.system, keys: [key(owner, true, true), key(mint, true, true)], data: concat(u32(0), u64(rent), u64(82), b58decode(PROGRAM.token)) },
        { program: PROGRAM.token, keys: [key(mint, false, true)], data: concat(Uint8Array.of(20, decimals), b58decode(owner), Uint8Array.of(0)) },
        createAta(owner, owner, mint),
        { program: PROGRAM.token, keys: [key(mint, false, true), key(tokenAccount, false, true), key(owner, true)], data: concat(Uint8Array.of(7), u64(amount)) },
    ];
    if (uri) {
        const meta = pda([new TextEncoder().encode('metadata'), b58decode(PROGRAM.metadata), b58decode(mint)], PROGRAM.metadata);
        ix.push({ program: PROGRAM.metadata, keys: [key(meta, false, true), key(mint), key(owner, true), key(owner, true, true), key(owner), key(PROGRAM.system), key(PROGRAM.rent)], data: concat(Uint8Array.of(33), str(name), str(symbol), str(uri), Uint8Array.of(0, 0, 0, 0, 0, 0, 0)) });
    }
    // DataV2: seller fee u16=0, creators/collection/uses=None, mutable=false, collectionDetails=None.
    if (fixed)
        ix.push({ program: PROGRAM.token, keys: [key(mint, false, true), key(owner, true)], data: Uint8Array.of(6, 0, 0) });
    const unsigned = compileLegacy({ payer: owner, blockhash, instructions: ix });
    const sig = sign(null, Buffer.from(parseTransaction(unsigned).message), privateKey);
    return { mint, tokenAccount, amount: amount.toString(), bytes: withSignature(unsigned, mint, new Uint8Array(sig)), metadata: !!uri };
}
