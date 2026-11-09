import { PROGRAM, MINT, compileLegacy, u32, u64, concat, units, decimal, address } from '../../shared/solana.mjs';
import { ata, createAta } from '../builders.mjs';
const k = (key, signer = false, writable = false) => ({ key, signer, writable });
export async function prepareWrap(service, owner, b) {
    await service.up.checkNetwork();
    address(owner);
    const account = ata(owner, MINT.SOL), instructions = [];
    let raw;
    const existing = (await service.up.rpc('getAccountInfo', [account, { encoding: 'jsonParsed' }])).value;
    if (existing) {
        const i = existing.data?.parsed?.info;
        if (existing.owner !== PROGRAM.token || i?.owner !== owner || i.mint !== MINT.SOL || i.state !== 'initialized' || !i.isNative)
            throw Error('La cuenta wSOL existente no es válida.');
    }
    if (b.action === 'wrap') {
        raw = units(String(b.amount), 9);
        if (!raw)
            throw Error('Importe debe ser positivo.');
        const sol = (await service.up.rpc('getBalance', [owner, { commitment: 'confirmed' }])).value;
        if (!Number.isSafeInteger(sol))
            throw Error('Saldo SOL fuera del rango de lectura exacta.');
        const rent = existing ? 0n : BigInt(await service.up.rpc('getMinimumBalanceForRentExemption', [165]));
        if (BigInt(sol) < raw + rent + 100000n)
            throw Error('Reservá SOL suficiente para rent y comisiones.');
        instructions.push(createAta(owner, owner, MINT.SOL), { program: PROGRAM.system, keys: [k(owner, true, true), k(account, false, true)], data: concat(u32(2), u64(raw)) }, { program: PROGRAM.token, keys: [k(account, false, true)], data: Uint8Array.of(17) });
    }
    else if (b.action === 'unwrap') {
        if (!existing)
            throw Error('No hay una cuenta asociada wSOL que cerrar.');
        raw = BigInt(existing.data.parsed.info.tokenAmount.amount);
        instructions.push({ program: PROGRAM.token, keys: [k(account, false, true), k(owner, false, true), k(owner, true)], data: Uint8Array.of(9) });
    }
    else
        throw Error('Acción inválida.');
    const block = (await service.up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value, bytes = compileLegacy({ payer: owner, blockhash: block.blockhash, instructions }), inspection = await service.inspect(bytes, service.config.network, owner);
    return service.putPlan({ bytes, owner, kind: 'wrap', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: b.action === 'wrap' ? 'Convertir SOL a wSOL' : 'Cerrar wSOL y recuperar SOL', action: b.action, amount: decimal(raw, 9), mint: MINT.SOL, destination: owner, tokenAccount: account, estimatedCostsLamports: inspection.networkFeeLamports, risks: b.action === 'wrap' ? 'Se usan SOL y posiblemente rent para tu propia cuenta asociada. No hay swap ni comisión de Pulp.' : 'Se cierra toda tu cuenta asociada wSOL y se devuelve el saldo y la renta a esta misma wallet. No es retiro parcial.' } });
}
