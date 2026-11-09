import { prepareWrap } from './wrap.mjs';
import { address, signature, MINT, PROGRAM, decimal, units, safeHttps, compileLegacy } from '../../shared/solana.mjs';
import { randomId, digest, text } from '../security.mjs';
import { ApiError } from '../upstream.mjs';
import { normalizeRpc, analyzeEvents, stableLeg, validateDistribution, surplusPolicy } from './analytics.mjs';
import { Jobs } from './jobs.mjs';
import { secretBox } from './secrets.mjs';
import { commerce } from './commerce.mjs';
import { readSquads, voteBytes } from './governance.mjs';
import { collectHistory, historyReport } from './history.mjs';
import { launchConfig, readLaunch, prepareLaunch, prepareVesting, prepareCurveTrade } from './launchlab.mjs';
import { proposalDetails, prepareProposal, prepareExecution } from './squads-transactions.mjs';
import { readPool, prepareLiquidity, preparePoolCreate, CPMM } from './liquidity.mjs';
export const V4_GETS = new Set(['overview', 'intelligence', 'rankings', 'events', 'alerts', 'inbox', 'strategies', 'jobs', 'pools', 'pool', 'positions', 'launch/plan', 'launch/projects', 'governance', 'billing', 'economy', 'capabilities', 'preferences', 'integrations', 'audit', 'sessions', 'launchlab/config', 'launchlab/pool', 'governance/details']);
export const V4_POSTS = new Set(['wallet/sync', 'discover', 'alerts/save', 'alerts/delete', 'inbox/read', 'strategies/save', 'strategies/delete', 'strategies/prepare', 'jobs/run', 'preferences/save', 'notifications/save', 'notifications/test', 'launch/plan/save', 'launch/metadata', 'launch/publish', 'liquidity/prepare', 'pool/create', 'governance/prepare', 'billing/create', 'billing/prepare', 'billing/verify', 'billing/referral', 'economy/save', 'economy/expense', 'integrations/save', 'sessions/revoke', 'analytics/event', 'account/export', 'account/delete', 'wrap/prepare', 'launchlab/prepare', 'launchlab/trade/prepare', 'vesting/prepare', 'governance/propose', 'governance/execute', 'discover/automatic']);
const freshPref = () => ({ watched: [], alertRules: [], strategies: [], locale: 'es-AR', consentAnalytics: false });
const readJsonObject = v => {
    if (!v || typeof v !== 'object' || Array.isArray(v))
        throw Error('Objeto JSON inválido.');
    return v;
};
const num = (n, min, max) => {
    n = Number(n);
    if (!Number.isFinite(n) || n < min || n > max)
        throw Error('Número fuera de rango.');
    return n;
};
const short = s => s.slice(0, 5) + '…' + s.slice(-5);
export function createV4(service, { dataDir, publicOrigin = '', adminWallet = '', startWorkers = true } = {}) {
    const { store, up, config } = service, box = secretBox(dataDir, { publicMode: !!publicOrigin }), billing = commerce(service), locks = new Map();
    let heartbeat = null, closed = false;
    const owner = ctx => service.requireAuth(ctx).owner;
    const admin = ctx => {
        if (publicOrigin && owner(ctx) !== adminWallet)
            throw new ApiError('Acción reservada al operador.', 403, 'FORBIDDEN');
        return service.session(ctx?.cookie)?.owner || 'local-operator';
    };
    const prefKey = a => 'v4-pref-' + address(a), histKey = a => 'v4-events-' + config.network + '-' + address(a);
    const prefs = a => store.get(prefKey(a), freshPref());
    const audit = async (a, action, detail = {}) => store.mutate('v4-audit', rows => { const prev = rows.at(-1)?.hash || ''; const row = { id: randomId(), at: Date.now(), actor: a, action, detail, previous: prev }; row.hash = digest(JSON.stringify(row)); rows.push(row); return rows.slice(-10000); }, []);
    async function remember(a) { await store.mutate('v4-owners', arr => [...new Set([...arr, a])].slice(-5000), []); }
    async function secrets(a) { return box.open(await store.get('v4-secrets-' + a, null)); }
    async function notify(a, message, key, kind = 'activity') {
        let inserted = false, row;
        await store.mutate('v4-inbox-' + a, rows => {
            if (rows.some(r => r.key === key))
                return rows;
            row = { id: randomId(), key, kind, message: String(message).slice(0, 500), at: Date.now(), read: false };
            rows.unshift(row);
            inserted = true;
            return rows.slice(0, 300);
        }, []);
        if (inserted)
            await jobs.enqueue('deliver', { notification: row }, { owner: a, id: 'deliver-' + row.id });
    }
    async function syncWallet(a, { backfill = false, limit = 15 } = {}) {
        address(a);
        const key = histKey(a);
        if (locks.has(key))
            return locks.get(key);
        const task = (async () => {
            const old = await store.get(key, { items: [], pages: 0 });
            const value = await collectHistory(up, a, old, { backfill, limit });
            await store.put(key, value);
            await store.mutate('v4-index-' + config.network, arr => [...new Set([...arr, a])].slice(-500), []);
            return historyReport(value, a);
        })().finally(() => locks.delete(key));
        locks.set(key, task);
        return task;
    }
    async function walletReport(a) { const d = await store.get(histKey(a), { items: [], cursor: null, complete: false, pages: 0 }); return historyReport(d, a); }
    async function discover(mint) {
        address(mint);
        await service.tokenInfo(mint);
        await up.checkNetwork();
        const sigs = await up.rpc('getSignaturesForAddress', [mint, { limit: 15, commitment: 'finalized' }]);
        const candidates = new Map();
        for (const s of sigs) {
            let t;
            try {
                t = await up.rpc('getTransaction', [s.signature, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]);
            }
            catch {
                continue;
            }
            if (!t || t.meta?.err)
                continue;
            for (const account of t.transaction?.message?.accountKeys || []) {
                if (typeof account !== 'object' || !account.signer)
                    continue;
                const a = address(account.pubkey);
                const record = candidates.get(a) || { address: a, sourceMint: mint, signatures: [], firstObservedAt: Date.now(), classification: 'Candidata para investigar, no recomendación de compra' };
                record.signatures.push(s.signature);
                candidates.set(a, record);
            }
        }
        const out = [...candidates.values()].slice(0, 20);
        await store.mutate('v4-candidates-' + config.network, arr => [...new Map([...out, ...arr].map(x => [x.address, x])).values()].slice(0, 100), []);
        return { candidates: out, source: 'Firmantes de transacciones que mencionan el mint; cobertura parcial', observedAt: Date.now() };
    }
    async function autoDiscover() {
        if (config.network !== 'mainnet')
            return { skipped: 'Descubrimiento automático de Mainnet solamente.' };
        const raw = await up.jup('/tokens/v2/toptraded/24h?limit=3', null, 60000);
        const list = Array.isArray(raw) ? raw : raw.tokens;
        if (!Array.isArray(list))
            throw Error('Respuesta de tendencias de Jupiter no reconocida.');
        const result = [];
        for (const t of list.slice(0, 3)) {
            const d = await discover(address(t.id));
            result.push(...d.candidates);
        }
        for (const w of result.slice(0, 8))
            await jobs.enqueue('sync', { address: w.address, backfill: true }, { owner: 'discovery', id: 'public-sync-' + w.address + '-' + Math.floor(Date.now() / 3600000) });
        return { candidates: result.length, source: 'Jupiter top traded + firmantes RPC, no recomendación de inversión' };
    }
    async function deliver(payload, a) {
        const s = await secrets(a), message = 'Pulp · ' + payload.notification.message, results = [];
        if (s.telegramToken && s.telegramChat) {
            const d = await up.json('https://api.telegram.org/bot' + s.telegramToken + '/sendMessage', { method: 'POST', body: { chat_id: s.telegramChat, text: message, disable_web_page_preview: true } });
            if (!d.ok)
                throw Error('Telegram rechazó la notificación.');
            results.push('telegram');
        }
        if (s.discordWebhook) {
            const r = await up.fetch(s.discordWebhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(10000), redirect: 'error' });
            if (!r.ok)
                throw Error('Discord rechazó la notificación.');
            results.push('discord');
        }
        return { channels: results.length ? results : ['in-app'], at: Date.now() };
    }
    async function checkAlerts(_, a) {
        const p = await prefs(a);
        const entitlement = (await billing.overview(a)).entitlement;
        const activeLimit = entitlement?.until > Date.now() ? (entitlement.plan === 'team' ? 100 : 30) : 3;
        for (const rule of p.alertRules.filter(r => r.enabled && (r.network || 'mainnet') === config.network && (r.kind === 'wallet' || config.network === 'mainnet')).slice(0, activeLimit)) {
            try {
                if (rule.kind === 'wallet') {
                    const d = await syncWallet(rule.address, { limit: 10 });
                    const newest = d.items.filter(e => e.success && e.at >= rule.createdAt && (!rule.onlySwaps || e.kind === 'swap')).slice(0, 5);
                    for (const ev of newest)
                        await notify(a, `${short(rule.address)} · ${ev.kind === 'swap' ? 'Intercambio' : 'Movimiento'} · ${short(ev.signature)}`, rule.id + ':' + ev.signature);
                }
                else {
                    const prices = await up.jup('/price/v3?ids=' + rule.mint, null, 30000), price = Number(prices[rule.mint]?.usdPrice);
                    if (!Number.isFinite(price))
                        continue;
                    const hits = rule.kind === 'above' ? price >= rule.threshold : price <= rule.threshold;
                    const last = await store.get('v4-rule-' + rule.id, { hit: false });
                    if (hits && !last.hit)
                        await notify(a, `Precio observado de ${short(rule.mint)}: US$${price}. Umbral ${rule.threshold}.`, rule.id + ':' + Date.now(), 'price');
                    await store.put('v4-rule-' + rule.id, { hit: hits, price, at: Date.now() });
                }
            }
            catch (e) {
                await store.put('v4-rule-error-' + rule.id, { at: Date.now(), error: String(e.message).slice(0, 220) });
            }
        }
        return { checked: p.alertRules.length, at: Date.now() };
    }
    const jobs = new Jobs(store, { sync: async (p) => { const d = await syncWallet(p.address, { backfill: !!p.backfill }); return { address: p.address, events: d.items.length, complete: d.complete }; }, discover: async (p) => discover(p.mint), autoDiscover: async () => autoDiscover(), alerts: checkAlerts, deliver, strategies: checkStrategies });
    async function checkStrategies(_, a) {
        if (config.network !== 'mainnet')
            return { skipped: 'Las estrategias solo consultan Mainnet.' };
        const p = await prefs(a);
        for (const s of p.strategies.filter(s => s.enabled && (s.network || 'mainnet') === config.network)) {
            try {
                if (s.kind === 'copy') {
                    const d = await syncWallet(s.source, { limit: 10 });
                    for (const ev of d.items.filter(e => e.kind === 'swap' && e.at >= s.createdAt).slice(0, 5)) {
                        const leg = stableLeg(ev);
                        if (!leg || leg.side !== 'buy')
                            continue;
                        const signal = { id: digest(s.id + ev.signature).slice(0, 32), strategyId: s.id, kind: 'copy', inputMint: MINT.USDC, outputMint: leg.mint, amount: s.amount, sourceSignature: ev.signature, createdAt: Date.now(), expiresAt: Date.now() + 300000, state: 'needs-signature' };
                        await addSignal(a, signal);
                    }
                }
                else {
                    const key = 'v4-strategy-state-' + s.id, last = await store.get(key, {});
                    let due = s.kind === 'dca' ? (!last.at || Date.now() - last.at >= s.intervalHours * 3600000) : false;
                    if (s.kind === 'limit') {
                        const prices = await up.jup('/price/v3?ids=' + s.outputMint, null, 30000), price = Number(prices[s.outputMint]?.usdPrice);
                        due = Number.isFinite(price) && price <= s.threshold && !last.triggered;
                    }
                    if (due) {
                        await addSignal(a, { id: randomId(), strategyId: s.id, kind: s.kind, inputMint: s.inputMint, outputMint: s.outputMint, amount: s.amount, createdAt: Date.now(), expiresAt: Date.now() + 300000, state: 'needs-signature' });
                        await store.put(key, { at: Date.now(), triggered: s.kind === 'limit' });
                    }
                }
            }
            catch (e) {
                await store.put('v4-strategy-error-' + s.id, { at: Date.now(), error: String(e.message).slice(0, 220) });
            }
        }
        return { at: Date.now() };
    }
    async function addSignal(a, s) { await store.mutate('v4-signals-' + a, arr => arr.some(x => x.id === s.id) ? arr : [s, ...arr].slice(0, 100), []); await notify(a, 'Hay una operación para revisar. No se enviará sin tu firma.', 'signal:' + s.id, 'strategy'); }
    async function schedule() {
        if (closed)
            return;
        await service.ready;
        if (process.env.PULP_DISCOVERY_ENABLED === '1')
            await jobs.enqueue('autoDiscover', {}, { owner: 'discovery', id: 'auto-discover-' + Math.floor(Date.now() / 3600000) });
        const operators = await store.get('v4-owners', []), bucket = Math.floor(Date.now() / 120000);
        for (const a of operators) {
            const p = await prefs(a);
            if (p.alertRules.some(x => x.enabled))
                await jobs.enqueue('alerts', {}, { owner: a, id: 'alerts-' + a + '-' + bucket });
            if (p.strategies.some(x => x.enabled))
                await jobs.enqueue('strategies', {}, { owner: a, id: 'strategies-' + a + '-' + bucket });
        }
    }
    if (startWorkers) {
        jobs.start();
        heartbeat = setInterval(() => schedule().catch(() => { }), 30000);
        heartbeat.unref();
    }
    function stop() { closed = true; clearInterval(heartbeat); jobs.stop(); }
    function needProtocolOptIn() {
        if (process.env.PULP_ENABLE_PROTOCOL_WRITES !== '1')
            throw new ApiError('Preparadores experimentales de protocolos: el operador debe verificar Devnet y habilitar PULP_ENABLE_PROTOCOL_WRITES=1. No se pidió firma.', 409, 'PROTOCOL_GATE');
    }
    async function capabilities(ctx) {
        const cloud = store.kind === 'postgres-supabase';
        return { version: '4.0.0-beta.1', mode: publicOrigin ? 'public' : 'local', owner: service.session(ctx.cookie)?.owner || null, operator: !publicOrigin || service.session(ctx.cookie)?.owner === adminWallet, storage: store.kind, checks: [
                { key: 'wallet', name: 'Cuenta y firma de wallet', state: 'implemented', note: 'Wallet Standard · autenticación criptográfica; extensión real no validada aquí.' },
                { key: 'swap', name: 'Jupiter Swap', state: config.jupiterKey ? 'configured' : 'needs-configuration', note: 'Cotización, revisión, firma y conciliación. No se ejecutó en Mainnet en esta entrega.' },
                { key: 'intelligence', name: 'Intelligence', state: 'implemented', note: 'Indexación paginada, candidatos, FIFO USDC y cobertura explícita; no catálogo inventado.' },
                { key: 'liquidity', name: 'Raydium CPMM', state: process.env.PULP_ENABLE_PROTOCOL_WRITES === '1' ? 'enabled-experimental' : 'review-gated', note: 'Lectura, creación, depósito y retiro SPL clásico. CLMM/Token-2022 se derivan al protocolo.' },
                { key: 'launch', name: 'Launchpad', state: 'review-gated', note: 'SPL, CPMM y LaunchLab V2 constante; lectura de curvas, creación, reserva, asignación y reclamo de vesting. Compra/venta exact-in de curvas SPL clásicas.' },
                { key: 'orders', name: 'Seguimiento, DCA y límites', state: 'guided', note: 'Generan solicitudes de revisión, no ejecución automática. Sin custodia ni claves del usuario.' },
                { key: 'gov', name: 'Gobernanza', state: process.env.PULP_SQUADS_MULTISIG ? 'configured-experimental' : 'needs-configuration', note: 'Lectura, voto, propuestas y ejecución de transferencias SOL/USDC en una multifirma Squads existente. No crea la organización.' },
                { key: 'billing', name: 'Suscripciones USDC', state: process.env.PULP_MERCHANT_WALLET ? 'configured' : 'needs-configuration', note: 'Facturas y activación por transferencia finalizada verificada; precios configurados Pro/Team.' },
                { key: 'cloud', name: 'Datos multiusuario', state: cloud ? 'configured' : 'local', note: 'Adaptador PostgreSQL/Supabase + migración; no se creó cuenta ni despliegue.' },
                { key: 'token', name: 'Token PULP', state: 'excluded', note: 'No se emite por instrucción del proyecto. Configurador y presupuesto disponibles.' },
                { key: 'studio', name: 'AI Studio', state: 'excluded', note: 'En construcción según el alcance acordado. Contrato de integración documentado.' },
                { key: 'security', name: 'Auditoría y operación real', state: 'external-review', note: 'Pruebas de contrato con fixtures no equivalen a validación on-chain ni auditoría.' }
            ], financialWrites: process.env.PULP_PAUSE_FINANCIAL === '1' ? 'paused' : 'wallet-confirmation-required', at: Date.now() };
    }
    async function request(route, b, ctx) {
        await service.ready;
        const a = () => owner(ctx);
        if (route === 'wrap/prepare')
            return prepareWrap(service, a(), b);
        if (route === 'launchlab/trade/prepare') {
            needProtocolOptIn();
            return prepareCurveTrade(service, a(), b);
        }
        if (route === 'capabilities')
            return capabilities(ctx);
        if (route === 'overview') {
            const who = service.session(ctx.cookie)?.owner;
            const candidates = await store.get('v4-candidates-' + config.network, []);
            return { trackedWallets: (await store.get('v4-index-' + config.network, [])).length, candidates: candidates.length, notifications: who ? (await store.get('v4-inbox-' + who, [])).filter(n => !n.read).length : 0, network: config.network, source: 'Índice de esta instalación / despliegue', at: Date.now() };
        }
        if (route === 'preferences')
            return prefs(a());
        if (route === 'preferences/save') {
            const who = a();
            await remember(who);
            const p = await prefs(who);
            if (b.watched !== undefined) {
                if (!Array.isArray(b.watched) || b.watched.length > 30)
                    throw Error('Hasta 30 wallets de lectura.');
                p.watched = b.watched.map(x => ({ address: address(x.address), label: text(x.label || 'Wallet', 40) }));
            }
            if (b.consentAnalytics !== undefined)
                p.consentAnalytics = b.consentAnalytics === true;
            await store.put(prefKey(who), p);
            return p;
        }
        if (route === 'intelligence') {
            const who = address(b.address || a());
            return walletReport(who);
        }
        if (route === 'events') {
            const who = address(b.address || a());
            const d = await walletReport(who);
            return { items: d.items, cursor: d.cursor, complete: d.complete, source: d.source };
        }
        if (route === 'wallet/sync') {
            const who = a(), addr = address(b.address || who);
            await remember(who);
            const j = await jobs.enqueue('sync', { address: addr, backfill: !!b.backfill }, { owner: who });
            return { job: j, queued: true };
        }
        if (route === 'discover') {
            const who = a();
            await remember(who);
            return { job: await jobs.enqueue('discover', { mint: address(b.mint) }, { owner: who }) };
        }
        if (route === 'discover/automatic') {
            admin(ctx);
            return { job: await jobs.enqueue('autoDiscover', {}, { owner: service.session(ctx.cookie)?.owner || 'local-operator', id: 'discover-' + Math.floor(Date.now() / 3600000) }) };
        }
        if (route === 'rankings') {
            const candidates = await store.get('v4-candidates-' + config.network, []), indexed = await store.get('v4-index-' + config.network, []);
            const rows = [];
            for (const x of [...new Set(candidates.map(c => c.address))].slice(0, 100)) {
                const d = await walletReport(x), c = candidates.find(c => c.address === x);
                rows.push({ address: x, source: c ? 'Firmante observado en ' + short(c.sourceMint) : 'Wallet indexada', sourceSignatures: c?.signatures || [], analysis: d.analysis, lastSync: d.lastSync || null });
            }
            return { wallets: rows.sort((a, b) => (b.analysis.score ?? -1) - (a.analysis.score ?? -1)), methodology: 'FIFO pares simples USDC. Score solo con historial recorrido, 30 días y 10 cierres conocidos. No recomendación de inversión.', source: 'Índice propio de transacciones RPC', at: Date.now() };
        }
        if (route === 'jobs')
            return { items: await jobs.list(a()) };
        if (route === 'jobs/run') {
            a();
            await jobs.tick();
            return { ok: true };
        }
        if (route === 'alerts') {
            const who = a(), p = await prefs(who);
            return { rules: await Promise.all(p.alertRules.map(async (r) => ({ ...r, error: await store.get('v4-rule-error-' + r.id, null) }))), delivery: 'Se evalúan mientras el servidor está ejecutándose.' };
        }
        if (route === 'alerts/save') {
            const who = a();
            await remember(who);
            const kind = b.kind;
            if (!['wallet', 'above', 'below'].includes(kind))
                throw Error('Tipo de alerta inválido.');
            const p = await prefs(who);
            const entitlement = (await billing.overview(who)).entitlement;
            const quota = entitlement && entitlement.until > Date.now() ? (entitlement.plan === 'team' ? 100 : 30) : 3;
            if (p.alertRules.length >= quota)
                throw Error('Tu plan admite ' + quota + ' alertas. Eliminá una regla o consultá Planes.');
            const rule = { id: randomId(), network: config.network, kind, label: text(b.label || 'Alerta Pulp', 60), enabled: true, createdAt: Date.now(), ...(kind === 'wallet' ? { address: address(b.address), onlySwaps: !!b.onlySwaps } : { mint: address(b.mint), threshold: num(b.threshold, 0.000000001, 1e12) }) };
            p.alertRules.push(rule);
            await store.put(prefKey(who), p);
            await audit(who, 'alert-created', { id: rule.id, kind });
            return rule;
        }
        if (route === 'alerts/delete') {
            const who = a(), p = await prefs(who);
            p.alertRules = p.alertRules.filter(r => r.id !== b.id);
            await store.put(prefKey(who), p);
            return { ok: true };
        }
        if (route === 'inbox')
            return { items: await store.get('v4-inbox-' + a(), []) };
        if (route === 'inbox/read') {
            const who = a();
            await store.mutate('v4-inbox-' + who, arr => arr.map(n => b.id === 'all' || n.id === b.id ? { ...n, read: true } : n), []);
            return { ok: true };
        }
        if (route === 'notifications/save') {
            const who = a(), s = await secrets(who);
            if (b.clear) {
                await store.remove('v4-secrets-' + who);
                return { ok: true };
            }
            if (b.telegramToken) {
                if (!/^\d{5,14}:[A-Za-z0-9_-]{20,100}$/.test(b.telegramToken))
                    throw Error('Token de bot inválido.');
                s.telegramToken = b.telegramToken;
            }
            if (b.telegramChat) {
                if (!/^-?\d{3,25}$/.test(b.telegramChat))
                    throw Error('Chat ID inválido.');
                s.telegramChat = b.telegramChat;
            }
            if (b.discordWebhook) {
                const u = new URL(b.discordWebhook);
                if (u.origin !== 'https://discord.com' || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(u.pathname) || u.search || u.hash)
                    throw Error('Webhook oficial de Discord requerido.');
                s.discordWebhook = u.href;
            }
            await store.put('v4-secrets-' + who, box.seal(s));
            return { telegram: !!s.telegramToken, discord: !!s.discordWebhook };
        }
        if (route === 'notifications/test') {
            const who = a();
            await notify(who, 'Esta es tu prueba de notificaciones.', 'test:' + Date.now(), 'test');
            return { queued: true };
        }
        if (route === 'strategies') {
            const who = a(), p = await prefs(who);
            return { strategies: p.strategies, signals: await store.get('v4-signals-' + who, []), mode: 'Asistido: cada operación requiere cotización, revisión y firma; no copy automático.' };
        }
        if (route === 'strategies/save') {
            const who = a();
            await remember(who);
            const p = await prefs(who);
            if (p.strategies.length >= 20)
                throw Error('Hasta 20 estrategias por cuenta.');
            if (!['copy', 'limit', 'dca'].includes(b.kind))
                throw Error('Estrategia inválida.');
            const amount = String(b.amount);
            if (!/^\d+(\.\d+)?$/.test(amount) || num(amount, 0.000001, 1000000) <= 0)
                throw Error('Importe inválido.');
            const s = { id: randomId(), kind: b.kind, network: config.network, name: text(b.name || 'Mi estrategia', 60), amount, enabled: true, createdAt: Date.now(), mode: 'manual-approval', maxDailyUsdc: num(b.maxDailyUsdc || 100, 1, 100000), ...(b.kind === 'copy' ? { source: address(b.source), inputMint: MINT.USDC } : { inputMint: address(b.inputMint || MINT.USDC), outputMint: address(b.outputMint), ...(b.kind === 'dca' ? { intervalHours: num(b.intervalHours || 24, 1, 720) } : { threshold: num(b.threshold, 0.000000001, 1e12) }) }) };
            if (s.inputMint !== MINT.USDC)
                throw Error('Estrategias asistidas limitadas a presupuesto en USDC.');
            if (Number(s.amount) > s.maxDailyUsdc)
                throw Error('El importe supera tu presupuesto diario.');
            p.strategies.push(s);
            await store.put(prefKey(who), p);
            await audit(who, 'strategy-created', { id: s.id, kind: s.kind });
            return s;
        }
        if (route === 'strategies/delete') {
            const who = a(), p = await prefs(who);
            p.strategies = p.strategies.filter(s => s.id !== b.id);
            await store.put(prefKey(who), p);
            return { ok: true };
        }
        if (route === 'strategies/prepare') {
            const who = a(), lock = 'strategy-prepare:' + who;
            if (locks.has(lock))
                throw new ApiError('Otra estrategia se está preparando.', 409, 'BUSY');
            const task = (async () => {
                const p = await prefs(who), signals = await store.get('v4-signals-' + who, []);
                const sig = signals.find(x => x.id === b.id), strategy = p.strategies.find(x => x.id === sig?.strategyId);
                if (!sig || !strategy || !strategy.enabled || sig.expiresAt < Date.now() || sig.state !== 'needs-signature')
                    throw Error('La señal ya fue preparada, desactivada o venció.');
                const h = (await service.request('tx/history', {}, ctx)).items;
                const day = Date.now() - 86400000;
                const spent = h.filter(t => t.createdAt > day && !['failed', 'provider-rejected'].includes(t.status) && t.summary?.inputMint === MINT.USDC).reduce((n, t) => n + units(String(t.summary.inputAmount || '0'), 6), 0n);
                const reserved = signals.filter(t => t.state === 'prepared' && t.reservedUntil > Date.now() && !h.some(tx => tx.id === t.planId)).reduce((n, t) => n + units(t.amount, 6), 0n);
                if (spent + reserved + units(sig.amount, 6) > units(String(strategy.maxDailyUsdc), 6))
                    throw Error('Presupuesto diario alcanzado; incluye operaciones pendientes y cotizaciones reservadas.');
                const plan = await service.prepareSwap({ inputMint: sig.inputMint, outputMint: sig.outputMint, amount: sig.amount }, who);
                await store.mutate('v4-signals-' + who, arr => arr.map(x => x.id === sig.id ? { ...x, state: 'prepared', planId: plan.id, reservedUntil: plan.expires } : x), []);
                return plan;
            })().finally(() => locks.delete(lock));
            locks.set(lock, task);
            return task;
        }
        if (route === 'pools') {
            const page = Math.floor(num(b.page || 1, 1, 100));
            const d = await up.cached('v4-pools-' + config.network + '-' + page, 60000, () => up.json('https://' + (config.network === 'devnet' ? 'api-v3-devnet' : 'api-v3') + '.raydium.io/pools/info/list?' + new URLSearchParams({ poolType: 'standard', poolSortField: 'liquidity', sortType: 'desc', pageSize: '20', page: String(page) })));
            if (!d.success || !Array.isArray(d.data?.data))
                throw Error('Formato de pools no reconocido.');
            return { pools: d.data.data, hasNextPage: !!d.data.hasNextPage, source: 'Raydium API v3 · tasas indicativas variables', at: Date.now() };
        }
        if (route === 'pool')
            return readPool(service, address(b.id));
        if (route === 'positions') {
            const who = address(b.address || a()), base = 'https://' + (config.network === 'devnet' ? 'owner-v1-devnet' : 'owner-v1') + '.raydium.io';
            const result = await Promise.allSettled(['/position/stake/', '/position/clmm-lock/', '/create-pool/'].map(p => up.json(base + p + who)));
            return { owner: who, positions: result.map((r, i) => ({ kind: ['stake', 'clmm-lock', 'created-pools'][i], data: r.status === 'fulfilled' ? r.value : null, error: r.status === 'rejected' ? r.reason.status === 404 ? 'Sin posiciones en esta consulta' : r.reason.message : null })), source: 'Raydium Owner API · puede existir retraso de indexación', at: Date.now() };
        }
        if (route === 'liquidity/prepare') {
            needProtocolOptIn();
            return prepareLiquidity(service, a(), b);
        }
        if (route === 'pool/create') {
            needProtocolOptIn();
            return preparePoolCreate(service, a(), b);
        }
        if (route === 'launchlab/config')
            return launchConfig(service, b);
        if (route === 'launchlab/pool')
            return readLaunch(service, address(b.pool), b.beneficiary || service.session(ctx.cookie)?.owner);
        if (route === 'launchlab/prepare') {
            needProtocolOptIn();
            return prepareLaunch(service, a(), b);
        }
        if (route === 'vesting/prepare') {
            needProtocolOptIn();
            return prepareVesting(service, a(), b);
        }
        if (route === 'governance/details')
            return proposalDetails(service, address(process.env.PULP_SQUADS_MULTISIG || ''), String(b.index));
        if (route === 'governance/propose') {
            needProtocolOptIn();
            return prepareProposal(service, a(), b);
        }
        if (route === 'governance/execute') {
            needProtocolOptIn();
            return prepareExecution(service, a(), b);
        }
        if (route === 'launch/plan')
            return { plan: await store.get('v4-launchplan-' + a(), null) };
        if (route === 'launch/plan/save') {
            const who = a(), plan = validateDistribution(b);
            plan.name = text(b.name || 'Proyecto', 32);
            plan.symbol = text(b.symbol || 'TOKEN', 10).toUpperCase();
            plan.officialTokenBlocked = plan.symbol === 'PULP';
            plan.owner = who;
            plan.at = Date.now();
            plan.hash = digest(JSON.stringify(plan));
            await store.put('v4-launchplan-' + who, plan);
            await audit(who, 'launch-plan-saved', { hash: plan.hash });
            return plan;
        }
        if (route === 'launch/metadata') {
            a();
            const content = { name: text(b.name, 32), symbol: text(b.symbol, 10), description: String(b.description || '').slice(0, 1000), image: safeHttps(b.image || ''), external_url: safeHttps(b.website || '') };
            if (!process.env.PULP_PINATA_JWT)
                return { content, pinned: false, note: 'JSON listo para exportar. Configurá Pinata para publicación permanente externa.' };
            const r = await up.json('https://api.pinata.cloud/pinning/pinJSONToIPFS', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.PULP_PINATA_JWT }, body: { pinataContent: content, pinataMetadata: { name: content.name } } });
            if (!/^[a-zA-Z0-9]{40,100}$/.test(r.IpfsHash || ''))
                throw Error('CID no reconocido.');
            return { content, pinned: true, cid: r.IpfsHash, uri: 'https://gateway.pinata.cloud/ipfs/' + r.IpfsHash };
        }
        if (route === 'launch/projects')
            return { items: await store.get('v4-projects', []), source: 'Proyectos publicados por cuentas verificadas; no auditoría.' };
        if (route === 'launch/publish') {
            const who = a(), mint = address(b.mint), info = await service.tokenInfo(mint);
            const plan = await store.get('v4-launchplan-' + who, null);
            if (!plan)
                throw Error('Guardá primero el plan del proyecto.');
            if (plan.symbol === 'PULP')
                throw Error('El token oficial no se publica en esta entrega.');
            const txSig = signature(b.signature);
            const created = (await service.request('tx/history', {}, ctx)).items.find(t => t.signature === txSig && ['mint', 'launchlab-create'].includes(t.kind) && t.summary?.mint === mint);
            if (!created)
                throw Error('La firma debe corresponder a la creación de este mint desde tu cuenta Pulp. Una transferencia no demuestra autoría.');
            const tx = await up.rpc('getTransaction', [txSig, { encoding: 'jsonParsed', commitment: 'finalized', maxSupportedTransactionVersion: 0 }]);
            if (!tx || tx.meta?.err || !tx.transaction.message.accountKeys.some(k => k.pubkey === who && k.signer) || !tx.transaction.message.accountKeys.some(k => k.pubkey === mint))
                throw Error('No se verificó una operación finalizada de esta wallet para ese mint.');
            const p = { id: mint, mint, owner: who, name: plan.name, symbol: plan.symbol, planHash: plan.hash, signature: txSig, at: Date.now(), network: config.network, supply: info.supply, disclosure: 'Autoría comprobada por una transacción, no aprobación financiera.' };
            await store.mutate('v4-projects', arr => [p, ...arr.filter(x => x.mint !== mint)].slice(0, 500), []);
            return p;
        }
        if (route === 'governance') {
            if (!process.env.PULP_SQUADS_MULTISIG)
                return { configured: false, proposals: [], note: 'Configurá PULP_SQUADS_MULTISIG con una organización existente. No se crea una DAO ficticia.' };
            return { configured: true, ...await readSquads(up, address(process.env.PULP_SQUADS_MULTISIG)) };
        }
        if (route === 'governance/prepare') {
            needProtocolOptIn();
            const who = a(), ms = address(process.env.PULP_SQUADS_MULTISIG || ''), data = await readSquads(up, ms);
            if (!data.members.some(m => m.key === who && (m.permissions & 2)))
                throw Error('Esta wallet no tiene permiso de votar en Squads.');
            const proposal = data.proposals.find(p => p.address === b.proposal);
            if (!proposal || proposal.status !== 'Active' || BigInt(proposal.transactionIndex) <= BigInt(data.staleTransactionIndex))
                throw Error('Propuesta no disponible o antigua.');
            const detail = await proposalDetails(service, ms, proposal.transactionIndex);
            if (b.choice === 'approve' && !detail.payment)
                throw Error('Propuesta fuera de las plantillas revisables. Aprobala únicamente desde Squads después de revisar las instrucciones.');
            if (proposal.approved.includes(who) || proposal.rejected.includes(who))
                throw Error('La wallet ya votó.');
            const block = (await up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).value, bytes = voteBytes({ multisig: ms, member: who, proposal: proposal.address, choice: b.choice, blockhash: block.blockhash }), inspection = await service.inspect(bytes, config.network, who);
            return service.putPlan({ bytes, owner: who, kind: 'squads-vote', inspection, lastValidBlockHeight: block.lastValidBlockHeight, summary: { title: b.choice === 'approve' ? 'Aprobar propuesta Squads' : 'Rechazar propuesta Squads', ...(detail.payment || {}), proposalHash: detail.hash, multisig: ms, proposal: proposal.address, index: proposal.transactionIndex, choice: b.choice, threshold: data.threshold, timeLock: data.timeLock, estimatedCostsLamports: inspection.networkFeeLamports, risks: 'Un voto on-chain puede habilitar una ejecución financiera. Inspeccioná la transacción completa en Squads antes de aprobar.' } });
        }
        if (route === 'billing')
            return billing.overview(a());
        if (route === 'billing/create') {
            const who = a();
            await remember(who);
            return billing.create(who, b.plan);
        }
        if (route === 'billing/prepare') {
            const who = a(), i = await billing.invoice(who, b.id);
            if (i.state === 'paid' || i.expiresAt < Date.now())
                throw Error('Factura pagada o vencida.');
            const payment = await service.request('transfer/prepare', { mint: MINT.USDC, destination: i.destination, amount: i.amount }, ctx);
            payment.summary.invoiceId = i.id;
            payment.summary.purpose = 'Pago único de 30 días, sin renovación automática';
            return payment;
        }
        if (route === 'billing/verify') {
            const r = await billing.verify(a(), b.id, b.signature);
            await audit(a(), 'invoice-verified', { id: r.id, signature: r.signature });
            return r;
        }
        if (route === 'billing/referral')
            return billing.setReferral(a(), text(b.code, 40));
        if (route === 'economy') {
            admin(ctx);
            const c = await store.get('v4-commerce', { receipts: [] }), expenses = await store.get('v4-expenses', []), policy = await store.get('v4-economy-policy', { reserve: 0, liabilities: 0, buybackBps: 2000 });
            const revenue = c.receipts.reduce((n, r) => n + Number(BigInt(r.raw) / 10000n), 0), costs = expenses.reduce((n, r) => n + r.cents, 0);
            return { revenueCents: revenue, costsCents: costs, expenses, policy, ...surplusPolicy({ revenue, costs, ...policy }), unit: 'USDC · centésimas; no conversión automática USD', buybacks: [], note: 'Recompras no ejecutadas. No se confunden reservas, volumen y facturación.' };
        }
        if (route === 'economy/save') {
            const who = admin(ctx), policy = { reserve: Math.floor(num(b.reserve || 0, 0, 1e12)), liabilities: Math.floor(num(b.liabilities || 0, 0, 1e12)), buybackBps: Math.floor(num(b.buybackBps || 0, 0, 5000)) };
            await store.put('v4-economy-policy', policy);
            await audit(who, 'policy-updated', policy);
            return policy;
        }
        if (route === 'economy/expense') {
            const who = admin(ctx), row = { id: randomId(), cents: Math.floor(num(b.cents, 1, 1e12)), description: text(b.description, 200), at: Date.now(), source: 'Declarado por operador; no verificado on-chain' };
            await store.mutate('v4-expenses', arr => [row, ...arr].slice(0, 2000), []);
            await audit(who, 'expense-recorded', { id: row.id });
            return row;
        }
        if (route === 'audit') {
            admin(ctx);
            return { items: (await store.get('v4-audit', [])).slice(-200).reverse(), note: 'Cadena de hashes local/BD, no anclaje inmutable on-chain.' };
        }
        if (route === 'integrations') {
            admin(ctx);
            return { storage: store.kind, publicOrigin, merchantWallet: process.env.PULP_MERCHANT_WALLET || '', squads: process.env.PULP_SQUADS_MULTISIG || '', pinata: !!process.env.PULP_PINATA_JWT, protocolWrites: process.env.PULP_ENABLE_PROTOCOL_WRITES === '1', pause: process.env.PULP_PAUSE_FINANCIAL === '1', fees: { bps: config.swapFeeBps || 0, referralAccount: config.referralAccount || '' } };
        }
        if (route === 'integrations/save') {
            admin(ctx);
            return service.request('settings/save', { swapFeeBps: b.swapFeeBps, referralAccount: b.referralAccount }, ctx);
        }
        if (route === 'sessions')
            return { items: service.listSessions(a(), ctx) };
        if (route === 'sessions/revoke') {
            service.revokeSessions(a(), b.id, ctx);
            return { ok: true };
        }
        if (route === 'analytics/event') {
            const who = a();
            const p = await prefs(who);
            if (!p.consentAnalytics)
                return { stored: false };
            if (!['page', 'connect', 'quote', 'confirmed'].includes(b.event))
                throw Error('Evento inválido.');
            await store.mutate('v4-product-metrics', s => ({ ...s, [b.event]: (s[b.event] || 0) + 1 }), {});
            return { stored: true };
        }
        if (route === 'account/export') {
            const who = a();
            return { version: 4, owner: who, preferences: await prefs(who), inbox: await store.get('v4-inbox-' + who, []), workspace: (await service.request('account', {}, ctx)).workspace, transactions: (await service.request('tx/history', {}, ctx)).items, privacy: 'No contiene secretos de proveedor ni claves privadas.', exportedAt: Date.now() };
        }
        if (route === 'account/delete') {
            const who = a();
            if (b.confirm !== who)
                throw Error('Confirmá la dirección completa.');
            for (const k of [prefKey(who), 'v4-inbox-' + who, 'v4-signals-' + who, 'v4-secrets-' + who, 'account-' + who])
                await store.remove(k);
            await store.mutate('v4-owners', arr => arr.filter(x => x !== who), []);
            service.revokeSessions(who, 'all', ctx);
            return { ok: true, retained: 'Registros de pagos y transacciones se conservan para conciliación; la blockchain pública no se borra.' };
        }
        throw new ApiError('Ruta v4 desconocida.', 404);
    }
    return { request, jobs, stop, schedule, syncWallet, walletReport, billing, capabilities };
}
