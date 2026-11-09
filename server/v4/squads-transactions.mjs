/** Narrow, inspectable treasury templates for Squads v4. No arbitrary instructions are executed. */
import { PROGRAM, MINT, address, b58decode, b58encode, compileLegacy, concat, u32, u64, units, decimal } from '../../shared/solana.mjs';
import { pda, digest } from '../security.mjs';
import { ata } from '../builders.mjs';
import { SQUADS, readSquads, proposalAddress, vaultAddress } from './governance.mjs';
const utf = s => new TextEncoder().encode(s), k = (key, signer = false, writable = false) => ({ key, signer, writable });
const u16 = n => Uint8Array.of(n & 255, n >> 8 & 255);
export const transactionAddress = (multisig, index) => pda([utf('multisig'), b58decode(address(multisig)), utf('transaction'), u64(BigInt(index))], SQUADS);
export function treasuryMessage(vault, destination, mint, amount) { address(vault); address(destination); if (vault === destination)
    throw Error('El destinatario debe ser distinto del vault.'); const raw = units(String(amount), mint === MINT.SOL ? 9 : 6); if (!raw)
    throw Error('Importe debe ser positivo.'); if (mint === MINT.SOL)
    return { numSigners: 1, numWritableSigners: 1, numWritableNonSigners: 1, accountKeys: [vault, destination, PROGRAM.system], instructions: [{ programIdIndex: 2, accountIndexes: [0, 1], data: concat(u32(2), u64(raw)) }], addressTableLookups: [] }; if (mint !== MINT.USDC)
    throw Error('Tesorería: plantillas limitadas a SOL y USDC.'); return { numSigners: 1, numWritableSigners: 1, numWritableNonSigners: 2, accountKeys: [vault, ata(vault, mint), ata(destination, mint), destination, mint, PROGRAM.token, PROGRAM.ata, PROGRAM.system], instructions: [{ programIdIndex: 6, accountIndexes: [0, 2, 3, 4, 7, 5], data: Uint8Array.of(1) }, { programIdIndex: 5, accountIndexes: [1, 4, 2, 0], data: concat(Uint8Array.of(12), u64(raw), Uint8Array.of(6)) }], addressTableLookups: [] }; }
export function encodeCompactMessage(m) { if (m.accountKeys.length > 255 || m.instructions.length > 255 || m.addressTableLookups.length)
    throw Error('Mensaje de tesorería fuera de alcance.'); return concat(Uint8Array.of(m.numSigners, m.numWritableSigners, m.numWritableNonSigners, m.accountKeys.length), ...m.accountKeys.map(b58decode), Uint8Array.of(m.instructions.length), ...m.instructions.map(i => concat(Uint8Array.of(i.programIdIndex, i.accountIndexes.length), Uint8Array.from(i.accountIndexes), u16(i.data.length), i.data)), Uint8Array.of(0)); }
class R {
    constructor(data) { this.b = Buffer.from(data); this.i = 0; }
    take(n) { if (n < 0 || n > 100000 || this.i + n > this.b.length)
        throw Error('Transacción Squads truncada.'); const x = this.b.subarray(this.i, this.i + n); this.i += n; return x; }
    u8() { return this.take(1)[0]; }
    u32() { return this.take(4).readUInt32LE(); }
    u64() { return this.take(8).readBigUInt64LE().toString(); }
    pub() { return b58encode(this.take(32)); }
    vec(read, max = 256) { const n = this.u32(); if (n > max)
        throw Error('Mensaje Squads demasiado grande.'); return Array.from({ length: n }, read); }
    bytes() { return this.take(this.u32()); }
}
export function decodeVaultTransaction(data) { const r = new R(data); if (!r.take(8).equals(Buffer.from([168, 250, 162, 100, 81, 14, 162, 207])))
    throw Error('No es VaultTransaction Squads.'); const o = { multisig: r.pub(), creator: r.pub(), index: r.u64(), bump: r.u8(), vaultIndex: r.u8(), vaultBump: r.u8(), ephemeralSignerBumps: [...r.bytes()] }; const m = { numSigners: r.u8(), numWritableSigners: r.u8(), numWritableNonSigners: r.u8() }; m.accountKeys = r.vec(() => r.pub()); m.instructions = r.vec(() => ({ programIdIndex: r.u8(), accountIndexes: r.vec(() => r.u8()), data: r.bytes() }), 32); m.addressTableLookups = r.vec(() => ({ accountKey: r.pub(), writableIndexes: r.vec(() => r.u8()), readonlyIndexes: r.vec(() => r.u8()) }), 32); o.message = m; return o; }
export function describeTreasury(t) {
    const m = t.message, vault = vaultAddress(t.multisig, t.vaultIndex);
    if (t.ephemeralSignerBumps.length || m.addressTableLookups.length || m.numSigners !== 1 || m.numWritableSigners !== 1 || m.accountKeys[0] !== vault)
        throw Error('Esta propuesta requiere revisión y ejecución en Squads; no corresponde a una plantilla Pulp.');
    const keys = m.accountKeys, ix = m.instructions;
    let mint, destination, raw;
    if (ix.length === 1 && keys.length === 3 && keys[2] === PROGRAM.system && m.numWritableNonSigners === 1) {
        const i = ix[0];
        if (i.programIdIndex !== 2 || String(i.accountIndexes) !== '0,1' || i.data.length !== 12 || Buffer.from(i.data).readUInt32LE() !== 2)
            throw Error('Instrucción SOL no reconocida.');
        mint = MINT.SOL;
        destination = keys[1];
        raw = Buffer.from(i.data).readBigUInt64LE(4);
    }
    else if (ix.length === 2 && keys.length === 8 && keys[4] === MINT.USDC && keys[5] === PROGRAM.token && keys[6] === PROGRAM.ata && keys[7] === PROGRAM.system && m.numWritableNonSigners === 2) {
        const [a, b] = ix;
        if (a.programIdIndex !== 6 || String(a.accountIndexes) !== '0,2,3,4,7,5' || a.data.length !== 1 || a.data[0] !== 1 || b.programIdIndex !== 5 || String(b.accountIndexes) !== '1,4,2,0' || b.data.length !== 10 || b.data[0] !== 12 || b.data[9] !== 6)
            throw Error('Instrucciones USDC no reconocidas.');
        mint = MINT.USDC;
        destination = keys[3];
        if (keys[1] !== ata(vault, mint) || keys[2] !== ata(destination, mint))
            throw Error('Las cuentas asociadas no coinciden con el pago.');
        raw = Buffer.from(b.data).readBigUInt64LE(1);
    }
    else
        throw Error('Plantilla de tesorería no admitida. Usá la interfaz oficial de Squads.');
    if (raw === 0n || destination === vault)
        throw Error('Pago inválido.');
    return { vault, mint, symbol: mint === MINT.SOL ? 'SOL' : 'USDC', amount: decimal(raw, mint === MINT.SOL ? 9 : 6), destination, raw: raw.toString() };
}
export async function proposalDetails(service, multisig, index) { const id = transactionAddress(multisig, index), a = (await service.up.rpc('getAccountInfo', [id, { encoding: 'base64', commitment: 'confirmed' }])).value; if (!a || a.owner !== SQUADS)
    throw Error('No hay una transacción Squads válida para esta propuesta.'); const bytes = Buffer.from(a.data[0], 'base64'), t = decodeVaultTransaction(bytes); if (t.multisig !== multisig || t.index !== String(index))
    throw Error('La transacción no corresponde a esta multifirma.'); let payment = null, unsupported = null; try {
    payment = describeTreasury(t);
}
catch (e) {
    unsupported = e.message;
} return { id, transaction: t, payment, unsupported, hash: digest(bytes) }; }
export async function prepareProposal(service, owner, b) { const multisig = address(process.env.PULP_SQUADS_MULTISIG || ''), ms = await readSquads(service.up, multisig); if (!ms.members.some(m => m.key === owner && (m.permissions & 1)))
    throw Error('La wallet no puede iniciar propuestas.'); const index = (BigInt(ms.transactionIndex) + 1n).toString(), tx = transactionAddress(multisig, index), proposal = proposalAddress(multisig, index), vaultIndex = Number(b.vaultIndex || 0); if (!Number.isInteger(vaultIndex) || vaultIndex < 0 || vaultIndex > 255)
    throw Error('Índice de vault inválido.'); const vault = vaultAddress(multisig, vaultIndex), mint = address(b.mint || MINT.USDC); if (mint === MINT.USDC && service.config.network !== 'mainnet')
    throw Error('La plantilla USDC usa el mint de Mainnet.'); const m = treasuryMessage(vault, address(b.destination), mint, String(b.amount)), message = encodeCompactMessage(m), memo = String(b.memo || 'Propuesta de tesorería Pulp').slice(0, 120); const instructions = [{ program: SQUADS, keys: [k(multisig, false, true), k(tx, false, true), k(owner, true), k(owner, true, true), k(PROGRAM.system)], data: concat(Uint8Array.from([48, 250, 78, 168, 208, 226, 218, 211]), Uint8Array.of(vaultIndex, 0), u32(message.length), message, Uint8Array.of(1), u32(utf(memo).length), utf(memo)) }, { program: SQUADS, keys: [k(multisig), k(proposal, false, true), k(owner, true), k(owner, true, true), k(PROGRAM.system)], data: concat(Uint8Array.from([220, 60, 73, 224, 30, 108, 79, 159]), u64(index), Uint8Array.of(0)) }]; const block = (await service.up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value, bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions }), inspection = await service.inspect(bytes, service.config.network, owner); return service.putPlan({ bytes, owner, kind: 'squads-propose', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: 'Proponer transferencia de tesorería', multisig, proposal, index, threshold: ms.threshold, timeLock: ms.timeLock, vault, mint, amount: b.amount, symbol: mint === MINT.SOL ? 'SOL' : 'USDC', destination: b.destination, estimatedCostsLamports: inspection.networkFeeLamports, risks: 'Crea una propuesta, no transfiere el capital todavía. Se cobra rent de cuentas. Los miembros deben revisar y aprobar antes de ejecutar.' } }); }
export async function prepareExecution(service, owner, b) { const multisig = address(process.env.PULP_SQUADS_MULTISIG || ''), ms = await readSquads(service.up, multisig); if (!ms.members.some(m => m.key === owner && (m.permissions & 4)))
    throw Error('La wallet no tiene permiso de ejecutar.'); const proposal = ms.proposals.find(p => p.address === b.proposal); if (!proposal || proposal.status !== 'Approved' || BigInt(proposal.transactionIndex) <= BigInt(ms.staleTransactionIndex))
    throw Error('Propuesta no aprobada o invalidada.'); const blockTime = await service.up.rpc('getBlockTime', [await service.up.rpc('getSlot', [{ commitment: 'confirmed' }])]); if (!Number.isFinite(blockTime) || blockTime * 1000 < proposal.timestamp + ms.timeLock * 1000)
    throw Error('La demora de ejecución aún no terminó.'); const details = await proposalDetails(service, multisig, proposal.transactionIndex); if (!details.payment)
    throw Error(details.unsupported); if (b.hash !== details.hash)
    throw Error('Revisá nuevamente la propuesta antes de ejecutar; cambió la huella.'); const m = details.transaction.message, remaining = m.accountKeys.map((key, i) => k(key, false, i < m.numWritableSigners || (i >= m.numSigners && i < m.numSigners + m.numWritableNonSigners))); const block = (await service.up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value, bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions: [{ program: SQUADS, keys: [k(multisig), k(proposal.address, false, true), k(details.id), k(owner, true), ...remaining], data: Uint8Array.from([194, 8, 161, 87, 153, 164, 25, 171]) }] }), inspection = await service.inspect(bytes, service.config.network, owner); return service.putPlan({ bytes, owner, kind: 'squads-execute', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: 'Ejecutar transferencia aprobada de tesorería', multisig, proposal: proposal.address, index: proposal.transactionIndex, threshold: ms.threshold, timeLock: ms.timeLock, ...details.payment, proposalHash: details.hash, estimatedCostsLamports: inspection.networkFeeLamports, risks: 'Esta firma ejecuta el pago desde el vault compartido. Acción irreversible; verificá el destino y el importe completo.' } }); }
