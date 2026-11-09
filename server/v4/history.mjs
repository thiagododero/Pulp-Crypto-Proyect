/** Paged source adapter. Helius is optional; default Solana RPC coverage is deliberately partial. */
import { signature } from '../../shared/solana.mjs';
import { normalizeRpc, analyzeEvents } from './analytics.mjs';
export async function collectHistory(up, owner, old = {}, { backfill = false, limit = 15, provider = process.env.PULP_HISTORY_PROVIDER || 'rpc' } = {}) {
    const previous = old.provider === provider ? old : { items: [], pages: 0, cursor: null, complete: false };
    const size = Math.max(1, Math.min(50, Math.floor(Number(limit) || 15)));
    const cursor = backfill ? previous.cursor : null;
    let transactions = [], next = null, exhausted = false, missing = [];
    await up.checkNetwork();
    if (provider === 'helius') {
        const result = await up.rpc('getTransactionsForAddress', [owner, { transactionDetails: 'full', encoding: 'jsonParsed', maxSupportedTransactionVersion: 1, sortOrder: 'desc', limit: size, commitment: 'finalized', filters: { tokenAccounts: 'balanceChanged' }, ...(cursor ? { paginationToken: cursor } : {}) }]);
        if (!Array.isArray(result?.data))
            throw Error('El RPC no devolvió el formato de Helius getTransactionsForAddress.');
        transactions = result.data;
        next = result.paginationToken || null;
        exhausted = !next;
    }
    else if (provider === 'rpc') {
        const sigs = await up.rpc('getSignaturesForAddress', [owner, { limit: Math.min(size, 25), commitment: 'finalized', ...(cursor ? { before: cursor } : {}) }]);
        if (!Array.isArray(sigs))
            throw Error('Historial RPC inválido.');
        next = sigs.at(-1)?.signature || null;
        exhausted = sigs.length < Math.min(size, 25);
        const fetchIds = [...new Set([...sigs.map(s => s.signature), ...(previous.missing || []).slice(0, 5)])];
        for (const sig of fetchIds) {
            if ((previous.items || []).some(e => e.signature === sig))
                continue;
            try {
                const tx = await up.rpc('getTransaction', [signature(sig), { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 1 }]);
                if (tx?.meta)
                    transactions.push({ ...tx, _signature: sig });
                else
                    missing.push(sig);
            }
            catch {
                missing.push(sig);
            }
        }
    }
    else
        throw Error('Proveedor histórico no admitido.');
    const fresh = transactions.map(t => normalizeRpc(t, owner, t._signature || t.transaction?.signatures?.[0])).filter(Boolean);
    const oldItems = previous.items || [], map = new Map([...oldItems, ...fresh].map(e => [e.signature, e]));
    const items = [...map.values()].sort((a, b) => (b.slot || 0) - (a.slot || 0) || (b.transactionIndex ?? 0) - (a.transactionIndex ?? 0));
    missing = [...new Set([...(previous.missing || []), ...missing])].filter(s => !map.has(s));
    const headOverlap = !oldItems.length || fresh.some(t => oldItems.some(e => e.signature === t.signature)) || transactions.length === 0;
    // A refresh that does not reach the old head can contain a gap. Reset backfill from this page,
    // rather than declaring the old historical end sufficient.
    const headGap = !backfill && oldItems.length > 0 && !headOverlap && !exhausted;
    const reachedEnd = backfill ? exhausted : exhausted || Boolean(previous.reachedEnd && headOverlap);
    const max = Number(process.env.PULP_HISTORY_LIMIT || 5000);
    const cap = Number.isInteger(max) && max >= 100 && max <= 50000 ? max : 5000;
    const result = { ...previous, provider, items: items.slice(0, cap), cursor: headGap || backfill || !previous.pages ? next : previous.cursor, reachedEnd, headGap, complete: provider === 'helius' && reachedEnd && !headGap && !missing.length && items.length <= cap, coverage: provider === 'helius' ? 'wallet+ATA balanceChanged, según indexador' : 'dirección principal; no cubre todas las ATA', pages: (previous.pages || 0) + 1, missing, lastSync: Date.now(), source: provider === 'helius' ? 'Helius getTransactionsForAddress' : 'Solana RPC · dirección principal', truncated: items.length > cap, startedAt: previous.startedAt || Date.now() };
    if (backfill && exhausted)
        result.headGap = false;
    result.complete = provider === 'helius' && result.reachedEnd && !result.headGap && !missing.length && !result.truncated;
    return result;
}
export function historyReport(data, owner) { return { ...data, address: owner, analysis: analyzeEvents(data.items || [], { complete: !!data.complete }) }; }
