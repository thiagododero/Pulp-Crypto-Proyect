/** Fail-closed Earn transaction inspector, based on the published Jupiter Lend IDL.
 * This is an intent check, NOT a smart-contract audit. Unknown variants are refused.
 */
import { PROGRAM, MINT, parseTransaction, same } from '../shared/solana.mjs';
import { ata } from './builders.mjs';
export const EARN_PROGRAM = 'jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9';
const DISCRIMINATORS = {
    deposit: [[242, 35, 198, 137, 82, 225, 242, 182], [116, 144, 16, 97, 118, 109, 40, 119]],
    withdraw: [[183, 18, 70, 156, 148, 109, 161, 34], [47, 197, 183, 171, 239, 18, 245, 171]],
};
const read64 = (data, start = 0) => { if (data.length < start + 8)
    throw Error('Importe Earn truncado.'); return new DataView(data.buffer, data.byteOffset + start, 8).getBigUint64(0, true); };
export function validateEarn(bytes, keys, { owner, mint, fMint, action, amount, tokenProgram = PROGRAM.token }) {
    const t = parseTransaction(bytes);
    let core = 0, wrapped = 0n;
    const underlying = ata(owner, mint, tokenProgram), shares = ata(owner, fMint, tokenProgram);
    for (const ix of t.instructions) {
        const program = keys[ix.programIndex], a = ix.accounts.map(i => keys[i]), d = ix.data;
        if (program === EARN_PROGRAM) {
            const variant = DISCRIMINATORS[action].findIndex(v => same(d.slice(0, 8), Uint8Array.from(v)));
            if (variant < 0 || d.length !== (variant ? 24 : 16) || read64(d, 8) !== BigInt(amount))
                throw Error('La instrucción Earn no coincide con la acción o importe solicitado.');
            if (a[0] !== owner || a[action === 'deposit' ? 3 : 5] !== mint || a[6] !== fMint)
                throw Error('Activo o propietario Earn inesperado.');
            if (a[1] !== (action === 'deposit' ? underlying : shares) || a[2] !== (action === 'deposit' ? shares : underlying))
                throw Error('Las cuentas receptoras de Earn no pertenecen a tu wallet.');
            if (a[action === 'deposit' ? 12 : 13] !== 'jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC' || a[action === 'deposit' ? 14 : 15] !== tokenProgram)
                throw Error('Programa de liquidez o token inesperado.');
            core++;
        }
        else if (program === PROGRAM.compute) {
            if (!((d[0] === 2 && d.length === 5) || (d[0] === 3 && d.length === 9) || (d[0] === 4 && d.length === 5)))
                throw Error('Instrucción de cómputo no admitida.');
        }
        else if (program === PROGRAM.ata) {
            if ((d.length && !(d.length === 1 && d[0] === 1)) || a[0] !== owner || a[2] !== owner || ![mint, fMint].includes(a[3]) || a[5] !== tokenProgram || a[1] !== ata(owner, a[3], tokenProgram))
                throw Error('Creación de cuenta Earn inesperada.');
        }
        else if (program === PROGRAM.system) {
            // The only extra SOL movement allowed is wrapping the requested deposit into the owner's WSOL ATA.
            if (mint !== MINT.SOL || action !== 'deposit' || d.length !== 12 || new DataView(d.buffer, d.byteOffset, 4).getUint32(0, true) !== 2 || a[0] !== owner || a[1] !== underlying)
                throw Error('Transferencia SOL inesperada en Earn.');
            wrapped += read64(d, 4);
            if (wrapped > BigInt(amount))
                throw Error('Earn intenta envolver más SOL que el importe solicitado.');
        }
        else if (program === PROGRAM.token) {
            const sync = d.length === 1 && d[0] === 17 && mint === MINT.SOL && a[0] === underlying;
            const close = d.length === 1 && d[0] === 9 && mint === MINT.SOL && a[0] === underlying && a[1] === owner && a[2] === owner;
            if (!sync && !close)
                throw Error('Permiso o movimiento SPL no esperado en Earn.');
        }
        else
            throw Error('Earn devolvió un programa no admitido. Usá el protocolo oficial para esa ruta.');
    }
    if (core !== 1)
        throw Error('Earn debe contener exactamente una operación verificada.');
    return true;
}
