/** Verifiable wallet analytics. Money uses integer token units, never binary floats for execution. */
import { MINT, address, decimal, b58encode } from '../../shared/solana.mjs';
export const SWAP_PROGRAMS = new Set([
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
]);
const pub = k => typeof k === 'string' ? k : k?.pubkey;
export function normalizeRpc(tx, owner, sig) {
    address(owner);
    if (!tx?.meta || !tx.transaction?.message)
        return null;
    const m = tx.transaction.message, keys = (m.accountKeys || []).map(pub), ix = [...(m.instructions || []), ...(tx.meta.innerInstructions || []).flatMap(x => x.instructions || [])];
    const programs = [...new Set(ix.map(x => x.programId || keys[x.programIdIndex]).filter(Boolean))];
    const deltas = new Map();
    for (const [sign, arr] of [[-1n, tx.meta.preTokenBalances || []], [1n, tx.meta.postTokenBalances || []]])
        for (const t of arr) {
            if (t.owner !== owner)
                continue;
            const raw = String(t.uiTokenAmount?.amount ?? '0');
            if (!/^\d+$/.test(raw))
                continue;
            const key = t.mint, decimals = t.uiTokenAmount.decimals;
            if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18)
                continue;
            const prev = deltas.get(key) || { mint: key, raw: 0n, decimals };
            if (prev.decimals !== decimals)
                throw Error('Decimales inconsistentes.');
            prev.raw += sign * BigInt(raw);
            deltas.set(key, prev);
        }
    const index = keys.indexOf(owner), fee = BigInt(tx.meta.fee || 0);
    let nativeRaw = null;
    if (index >= 0 && Number.isSafeInteger(tx.meta.preBalances?.[index]) && Number.isSafeInteger(tx.meta.postBalances?.[index]))
        nativeRaw = (BigInt(tx.meta.postBalances[index]) - BigInt(tx.meta.preBalances[index])).toString();
    const tokens = [...deltas.values()].filter(x => x.raw !== 0n).map(x => ({ ...x, raw: x.raw.toString(), amount: decimalSigned(x.raw, x.decimals) }));
    const swap = programs.some(p => SWAP_PROGRAMS.has(p)) && tokens.some(t => BigInt(t.raw) < 0n) && tokens.some(t => BigInt(t.raw) > 0n);
    return { id: sig || tx.transaction.signatures?.[0], signature: sig || tx.transaction.signatures?.[0], owner, at: tx.blockTime ? tx.blockTime * 1000 : null, slot: tx.slot, transactionIndex: tx.transactionIndex ?? null, kind: tx.meta.err ? 'failed' : swap ? 'swap' : tokens.length || nativeRaw && nativeRaw !== '0' ? 'transfer' : 'interaction', success: !tx.meta.err, programs, tokens, nativeRaw, feeLamports: keys[0] === owner ? fee.toString() : '0', source: 'Solana RPC · jsonParsed', observedAt: Date.now(), note: swap ? 'Actividad de un programa de intercambio reconocido; validá la transacción.' : 'No se interpreta una transferencia como beneficio.' };
}
function decimalSigned(raw, dec) { const n = BigInt(raw); return (n < 0n ? '-' : '') + decimal((n < 0n ? -n : n).toString(), dec); }
export function stableLeg(event) {
    if (!event.success || event.kind !== 'swap')
        return null;
    const stable = event.tokens.find(x => x.mint === MINT.USDC && x.decimals === 6), other = event.tokens.filter(x => x.mint !== MINT.USDC);
    if (!stable || other.length !== 1)
        return null;
    const a = BigInt(stable.raw), b = BigInt(other[0].raw);
    if (a === 0n || b === 0n || (a < 0n) === (b < 0n))
        return null;
    return { side: b > 0n ? 'buy' : 'sell', mint: other[0].mint, decimals: other[0].decimals, quantity: b < 0n ? -b : b, usdc: a < 0n ? -a : a };
}
export function analyzeEvents(events, { now = Date.now(), complete = false } = {}) {
    const unique = [...new Map(events.filter(Boolean).map(e => [e.signature, e])).values()].filter(e => e.success).sort((a, b) => (a.slot || 0) - (b.slot || 0) || (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0) || (a.at || 0) - (b.at || 0) || String(a.signature).localeCompare(String(b.signature)));
    const lots = new Map(), closed = [], unpriced = [], transfers = [];
    let gross = 0n, volume = 0n, fees = 0n, knownCost = 0n, knownProceeds = 0n;
    for (const ev of unique) {
        fees += BigInt(ev.feeLamports || 0);
        const leg = stableLeg(ev);
        if (leg) {
            const list = lots.get(leg.mint) || [];
            lots.set(leg.mint, list);
            volume += leg.usdc;
            if (leg.side === 'buy') {
                list.push({ quantity: leg.quantity, cost: leg.usdc, at: ev.at });
                continue;
            }
            let left = leg.quantity, cost = 0n, priced = 0n;
            while (left > 0n && list.length) {
                const l = list[0], take = left < l.quantity ? left : l.quantity;
                const alloc = l.cost === null ? null : (l.cost * take / l.quantity);
                if (alloc !== null) {
                    cost += alloc;
                    priced += take;
                    l.cost -= alloc;
                }
                left -= take;
                l.quantity -= take;
                if (l.quantity === 0n)
                    list.shift();
            }
            const proceeds = leg.usdc * priced / leg.quantity, profit = proceeds - cost;
            gross += profit;
            knownCost += cost;
            knownProceeds += proceeds;
            if (priced > 0n)
                closed.push({ signature: ev.signature, mint: leg.mint, at: ev.at, costUsdc: decimal(cost.toString(), 6), proceedsUsdc: decimal(proceeds.toString(), 6), grossPnlUsdc: decimalSigned(profit, 6), partial: priced !== leg.quantity });
            if (priced !== leg.quantity)
                unpriced.push({ signature: ev.signature, mint: leg.mint, reason: 'Costo de adquisición desconocido para una parte de la venta.' });
        }
        else {
            for (const t of ev.tokens || []) {
                if (t.mint === MINT.USDC)
                    continue;
                const q = BigInt(t.raw), list = lots.get(t.mint) || [];
                lots.set(t.mint, list);
                if (q > 0n)
                    list.push({ quantity: q, cost: null, at: ev.at });
                else {
                    let left = -q;
                    while (left > 0n && list.length) {
                        const l = list[0], take = left < l.quantity ? left : l.quantity;
                        if (l.cost !== null)
                            l.cost -= l.cost * take / l.quantity;
                        l.quantity -= take;
                        left -= take;
                        if (!l.quantity)
                            list.shift();
                    }
                }
            }
            transfers.push(ev.signature);
        }
    }
    const wins = closed.filter(x => Number(x.grossPnlUsdc) > 0).length, first = unique.find(e => e.at)?.at, last = unique.filter(e => e.at).at(-1)?.at, days = first ? Math.max(0, (last - first) / 86400000) : 0;
    const orderAmbiguous = unique.some((e, i) => i > 0 && e.slot && e.slot === unique[i - 1].slot && (e.transactionIndex == null || unique[i - 1].transactionIndex == null));
    const eligible = complete && !orderAmbiguous && days >= 30 && closed.length >= 10 && unpriced.length === 0 && closed.every(x => !x.partial);
    const score = eligible ? Math.round(Math.min(100, closed.length * 1.5 + days / 6 + (closed.length ? wins / closed.length * 35 : 0))) : null;
    return { methodology: 'pulp-fifo-usdc-v1', source: 'Eventos RPC; pares simples contra USDC', network: 'solana', eventCount: unique.length, swaps: unique.filter(e => e.kind === 'swap').length, closedTrades: closed.length, wins, winRate: closed.length ? wins / closed.length : null, grossRealizedUsdc: decimalSigned(gross, 6), netRealizedUsd: null, knownCostUsdc: decimal(knownCost.toString(), 6), knownProceedsUsdc: decimal(knownProceeds.toString(), 6), observedVolumeUsdc: decimal(volume.toString(), 6), feeLamports: fees.toString(), unpricedSales: unpriced, closed, openLots: [...lots].map(([mint, list]) => ({ mint, raw: list.reduce((a, b) => a + b.quantity, 0n).toString(), knownCostUsdc: decimal(list.reduce((a, b) => a + (b.cost || 0n), 0n).toString(), 6), hasUnknownCost: list.some(x => x.cost === null) })), firstAt: first || null, lastAt: last || null, daysObserved: Math.floor(days), historyComplete: complete, score, eligible, reasons: [...(orderAmbiguous ? ['Orden intrabloque desconocido: el FIFO puede variar.'] : []), ...(!complete ? ['Historial parcial.'] : []), ...(days < 30 ? ['Menos de 30 días observados.'] : []), ...(closed.length < 10 ? ['Menos de 10 ventas con costo conocido.'] : []), ...(unpriced.length ? ['Hay ventas sin costo verificable.'] : [])], warnings: ['El resultado está expresado en USDC, no presupone paridad exacta con USD.', 'Comisiones SOL y valorización de posiciones abiertas no se descuentan del resultado bruto.', 'No es el resultado de todas las wallets de una persona ni recomendación de inversión.'], computedAt: now };
}
export function validateDistribution(input) {
    const supply = String(input.supply || ''), decimals = Number(input.decimals ?? 6);
    if (!/^\d+(\.\d+)?$/.test(supply) || !Number.isInteger(decimals) || decimals < 0 || decimals > 9)
        throw Error('Suministro o decimales inválidos.');
    const [whole, fraction = ''] = supply.split('.');
    if (fraction.length > decimals)
        throw Error('Demasiados decimales.');
    const raw = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || 0);
    if (raw <= 0n || raw > 18446744073709551615n)
        throw Error('Suministro fuera de rango.');
    if (!Array.isArray(input.allocations) || !input.allocations.length || input.allocations.length > 30)
        throw Error('Indicá de 1 a 30 asignaciones.');
    let bps = 0;
    const rows = input.allocations.map(a => {
        const basis = Number(a.bps);
        if (!Number.isInteger(basis) || basis <= 0 || basis > 10000)
            throw Error('Porcentaje inválido (puntos básicos).');
        bps += basis;
        const cliffDays = Number(a.cliffDays || 0), vestingDays = Number(a.vestingDays || 0);
        if (!Number.isInteger(cliffDays) || cliffDays < 0 || !Number.isInteger(vestingDays) || vestingDays < 0 || cliffDays > 3650 || vestingDays > 3650)
            throw Error('Desbloqueos inválidos.');
        return { label: String(a.label || 'Asignación').slice(0, 60), wallet: a.wallet ? address(a.wallet) : null, bps: basis, raw: (raw * BigInt(basis) / 10000n).toString(), cliffDays, vestingDays };
    });
    if (bps !== 10000)
        throw Error('Las asignaciones deben sumar exactamente 100%.');
    const remainder = raw - rows.reduce((n, a) => n + BigInt(a.raw), 0n);
    rows.at(-1).raw = (BigInt(rows.at(-1).raw) + remainder).toString();
    return { supply, rawSupply: raw.toString(), decimals, allocations: rows, totalBps: bps, executed: false, warning: 'Diseño de distribución, no despliegue ni vesting on-chain.' };
}
export function surplusPolicy({ revenue, costs, reserve, liabilities, buybackBps = 2000 }) {
    const vals = [revenue, costs, reserve, liabilities].map(x => {
        if (!Number.isSafeInteger(x) || x < 0)
            throw Error('Usá centavos enteros no negativos.');
        return x;
    });
    if (!Number.isInteger(buybackBps) || buybackBps < 0 || buybackBps > 5000)
        throw Error('Política inválida.');
    const eligible = Math.max(0, vals[0] - vals[1] - vals[2] - vals[3]);
    return { eligibleCents: eligible, buybackBudgetCents: Number(BigInt(eligible) * BigInt(buybackBps) / 10000n), executed: false };
}
