import { address, signature, MINT, PROGRAM, decimal } from '../../shared/solana.mjs';
import { randomId } from '../security.mjs';
import { ApiError } from '../upstream.mjs';
export const PLANS = { pro: { label: 'Pulp Pro', usdc: '19', raw: '19000000', days: 30, alerts: 30 }, team: { label: 'Pulp Team', usdc: '49', raw: '49000000', days: 30, alerts: 100 } };
const fresh = () => ({ invoices: [], receipts: [], entitlements: {}, referrals: {} });
export function commerce(service) {
    const { store, up, config } = service;
    async function state() { return store.get('v4-commerce', fresh()); }
    return {
        async overview(owner) { const s = await state(); return { plans: PLANS, merchantConfigured: !!process.env.PULP_MERCHANT_WALLET, network: config.network, invoices: s.invoices.filter(i => i.owner === owner), receipts: s.receipts.filter(i => i.owner === owner), entitlement: s.entitlements[owner] || null, referral: s.referrals[owner] || null }; },
        async create(owner, plan) {
            const item = PLANS[plan];
            if (!item)
                throw Error('Plan inválido.');
            if (config.network !== 'mainnet')
                throw Error('La facturación USDC solo se habilita en Mainnet.');
            if (!process.env.PULP_MERCHANT_WALLET)
                throw new ApiError('El operador debe configurar PULP_MERCHANT_WALLET antes de aceptar pagos.', 409, 'NOT_CONFIGURED');
            const destination = address(process.env.PULP_MERCHANT_WALLET);
            if (destination === owner)
                throw Error('El pagador y el comercio deben ser diferentes.');
            const invoice = { id: randomId(), owner, plan, mint: MINT.USDC, raw: item.raw, amount: item.usdc, destination, createdAt: Date.now(), expiresAt: Date.now() + 1800000, state: 'unpaid', network: 'mainnet' };
            await store.mutate('v4-commerce', s => {
                if (s.invoices.filter(i => i.owner === owner && i.state === 'unpaid' && i.expiresAt > Date.now()).length >= 5)
                    throw Error('Ya tenés 5 solicitudes de pago abiertas.');
                s.invoices.push(invoice);
                return s;
            }, fresh());
            return invoice;
        },
        async invoice(owner, id) {
            const inv = (await state()).invoices.find(i => i.owner === owner && i.id === id);
            if (!inv)
                throw new ApiError('Factura no encontrada.', 404);
            return inv;
        },
        async verify(owner, id, sig) {
            signature(sig);
            const inv = await this.invoice(owner, id);
            if (inv.state === 'paid')
                return inv;
            if (Date.now() > inv.expiresAt + 3600000)
                throw Error('Factura demasiado antigua para verificación automática. Revisión manual requerida.');
            await up.checkNetwork('mainnet');
            const t = await up.rpc('getTransaction', [sig, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }], 'mainnet');
            if (!t?.meta || t.meta.err)
                throw Error('Pago no finalizado o fallido. No se activó el plan.');
            if (!t.blockTime || t.blockTime * 1000 < inv.createdAt - 15000 || t.blockTime * 1000 > inv.expiresAt)
                throw Error('El pago no corresponde al período de la factura.');
            const keys = t.transaction?.message?.accountKeys || [];
            if (!keys.some(k => k.pubkey === owner && k.signer))
                throw Error('La wallet de la factura no firmó esta transacción.');
            const sum = (arr, who) => arr.filter(a => a.owner === who && a.mint === MINT.USDC && a.uiTokenAmount?.decimals === 6).reduce((n, a) => n + BigInt(a.uiTokenAmount.amount), 0n);
            const destDelta = sum(t.meta.postTokenBalances || [], inv.destination) - sum(t.meta.preTokenBalances || [], inv.destination);
            const fromDelta = sum(t.meta.preTokenBalances || [], owner) - sum(t.meta.postTokenBalances || [], owner);
            if (destDelta !== BigInt(inv.raw) || fromDelta < BigInt(inv.raw))
                throw Error('El destinatario, mint o importe del pago no coincide.');
            // Net deltas alone are not proof that this payer paid this merchant.
            // Accept only the direct SPL transferChecked used by our payment builder.
            const owned = new Set([...(t.meta.preTokenBalances || []), ...(t.meta.postTokenBalances || [])].filter(x => x.owner === owner && x.mint === MINT.USDC).map(x => typeof keys[x.accountIndex] === 'string' ? keys[x.accountIndex] : keys[x.accountIndex]?.pubkey));
            const received = new Set([...(t.meta.preTokenBalances || []), ...(t.meta.postTokenBalances || [])].filter(x => x.owner === inv.destination && x.mint === MINT.USDC).map(x => typeof keys[x.accountIndex] === 'string' ? keys[x.accountIndex] : keys[x.accountIndex]?.pubkey));
            const instructions = [...(t.transaction.message.instructions || []), ...(t.meta.innerInstructions || []).flatMap(x => x.instructions || [])];
            const paid = instructions.filter(i => i.programId === PROGRAM.token && i.parsed?.type === 'transferChecked' && i.parsed.info.mint === MINT.USDC && i.parsed.info.authority === owner && owned.has(i.parsed.info.source) && received.has(i.parsed.info.destination) && i.parsed.info.tokenAmount?.decimals === 6).reduce((n, i) => n + BigInt(i.parsed.info.tokenAmount.amount), 0n);
            if (paid !== BigInt(inv.raw))
                throw Error('No se comprobó una transferencia directa de esta wallet al comercio.');
            let result;
            await store.mutate('v4-commerce', s => {
                const i = s.invoices.find(i => i.id === id && i.owner === owner);
                if (i.state === 'paid') {
                    result = i;
                    return s;
                }
                if (s.receipts.some(r => r.signature === sig))
                    throw Error('Esta firma ya se utilizó.');
                i.state = 'paid';
                i.signature = sig;
                i.paidAt = Date.now();
                s.receipts.push({ id: i.id, owner, signature: sig, raw: i.raw, mint: MINT.USDC, at: Date.now(), source: 'Solana finalized' });
                const previous = s.entitlements[owner];
                s.entitlements[owner] = { plan: i.plan, until: Math.max(previous?.until || 0, Date.now()) + PLANS[i.plan].days * 86400000, invoice: i.id };
                result = i;
                return s;
            }, fresh());
            return result;
        },
        async setReferral(owner, code) {
            if (!/^[a-zA-Z0-9_-]{3,40}$/.test(code))
                throw Error('Código de referido inválido.');
            return store.mutate('v4-commerce', s => {
                if (s.referrals[owner])
                    throw Error('El referido ya fue registrado.');
                s.referrals[owner] = { code, at: Date.now(), payout: 0, note: 'Atribución, no derecho de cobro automático.' };
                return s;
            }, fresh()).then(s => s.referrals[owner]);
        }
    };
}
