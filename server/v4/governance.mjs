/** Squads v4 native account reader / vote builder. Protocol layouts, not imported secret signers. */
import { b58encode, b58decode, compileLegacy, concat, u64, address } from '../../shared/solana.mjs';
import { pda } from '../security.mjs';
export const SQUADS = 'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf';
const utf = s => new TextEncoder().encode(s);
class Reader {
    constructor(data) { this.b = Buffer.from(data); this.i = 0; }
    take(n) {
        if (n < 0 || this.i + n > this.b.length)
            throw Error('Cuenta Squads truncada.');
        const r = this.b.subarray(this.i, this.i + n);
        this.i += n;
        return r;
    }
    u8() { return this.take(1)[0]; }
    u16() { return this.take(2).readUInt16LE(); }
    u32() { return this.take(4).readUInt32LE(); }
    u64() { return this.take(8).readBigUInt64LE(); }
    pub() { return b58encode(this.take(32)); }
    disc(d) {
        if (!this.take(8).equals(Buffer.from(d)))
            throw Error('Discriminador Squads inválido.');
    }
    pubs() {
        const n = this.u32();
        if (n > 1000)
            throw Error('Demasiados miembros.');
        return Array.from({ length: n }, () => this.pub());
    }
}
export function decodeMultisig(data) {
    const r = new Reader(data);
    r.disc([224, 116, 121, 186, 68, 161, 79, 236]);
    const createKey = r.pub(), configAuthority = r.pub(), threshold = r.u16(), timeLock = r.u32(), transactionIndex = r.u64().toString(), staleTransactionIndex = r.u64().toString();
    const option = r.u8();
    if (option > 1)
        throw Error('Opción Squads no admitida.');
    const rentCollector = option ? r.pub() : null, bump = r.u8(), n = r.u32();
    if (n > 1000)
        throw Error('Miembros fuera de rango.');
    const members = Array.from({ length: n }, () => ({ key: r.pub(), permissions: r.u8() }));
    return { createKey, configAuthority, threshold, timeLock, transactionIndex, staleTransactionIndex, rentCollector, bump, members };
}
export function decodeProposal(data) {
    const r = new Reader(data);
    r.disc([26, 94, 189, 187, 116, 136, 53, 33]);
    const multisig = r.pub(), transactionIndex = r.u64().toString(), tag = r.u8(), names = ['Draft', 'Active', 'Rejected', 'Approved', 'Executing', 'Executed', 'Cancelled'];
    if (!names[tag])
        throw Error('Estado desconocido.');
    const timestamp = tag === 4 ? null : Number(r.u64()) * 1000, bump = r.u8();
    return { multisig, transactionIndex, status: names[tag], timestamp, bump, approved: r.pubs(), rejected: r.pubs(), cancelled: r.pubs() };
}
export const proposalAddress = (ms, index) => pda([utf('multisig'), b58decode(address(ms)), utf('transaction'), u64(BigInt(index)), utf('proposal')], SQUADS);
export const vaultAddress = (ms, index = 0) => pda([utf('multisig'), b58decode(address(ms)), utf('vault'), Uint8Array.of(index)], SQUADS);
export function voteBytes({ multisig, member, proposal, choice, blockhash }) {
    if (!['approve', 'reject'].includes(choice))
        throw Error('Voto inválido.');
    return compileLegacy({ payer: member, blockhash, instructions: [{ program: SQUADS, keys: [{ key: multisig, signer: false, writable: false }, { key: member, signer: true, writable: true }, { key: proposal, signer: false, writable: true }], data: concat(Uint8Array.from(choice === 'approve' ? [144, 37, 164, 136, 188, 216, 42, 248] : [243, 62, 134, 156, 230, 106, 246, 135]), Uint8Array.of(0)) }] });
}
export async function readSquads(up, multisig) {
    await up.checkNetwork();
    address(multisig);
    const account = (await up.rpc('getAccountInfo', [multisig, { encoding: 'base64', commitment: 'confirmed' }])).value;
    if (!account || account.owner !== SQUADS)
        throw Error('No es una cuenta Squads v4 en esta red.');
    const info = decodeMultisig(Buffer.from(account.data[0], 'base64')), count = BigInt(info.transactionIndex), ids = [];
    for (let n = count; n > 0n && ids.length < 12; n--)
        ids.push(proposalAddress(multisig, n));
    const values = ids.length ? (await up.rpc('getMultipleAccounts', [ids, { encoding: 'base64', commitment: 'confirmed' }])).value : [];
    const proposals = [];
    values.forEach((v, i) => {
        if (v?.owner === SQUADS) {
            try {
                const p = decodeProposal(Buffer.from(v.data[0], 'base64'));
                if (p.multisig === multisig)
                    proposals.push({ ...p, address: ids[i] });
            }
            catch { }
        }
    });
    return { multisig, vault: vaultAddress(multisig), ...info, proposals, source: 'Squads v4 · Solana RPC', observedAt: Date.now() };
}
