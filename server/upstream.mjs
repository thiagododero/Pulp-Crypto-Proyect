import { lookup } from 'node:dns/promises';
import { GENESIS } from '../shared/solana.mjs';
const pause = ms => new Promise(r => setTimeout(r, ms));
export class ApiError extends Error {
    constructor(message, status = 502, code = 'UPSTREAM') { super(message); this.status = status; this.code = code; }
}
export class Upstream {
    constructor(config, { fetchImpl = fetch, skipDns = false, throttle = true } = {}) { this.config = config; this.fetch = fetchImpl; this.skipDns = skipDns; this.throttle = throttle; this.tail = Promise.resolve(); this.next = 0; this.cache = new Map(); this.inflight = new Map(); this.genesis = new Map(); }
    invalidate() { this.cache.clear(); this.genesis.clear(); }
    async json(url, { method = 'GET', body, headers = {}, retry = false } = {}) {
        for (let attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
            let r;
            try {
                r = await this.fetch(url, { method, headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(18000), redirect: 'error' });
            }
            catch (e) {
                throw new ApiError('No se pudo contactar al proveedor. Revisá internet, RPC y el estado de la integración.', 503, 'NETWORK');
            }
            if (r.status === 429 && attempt === 0 && retry) {
                await pause(2500);
                continue;
            }
            if (!r.ok) {
                const code = r.status === 401 ? 'API_KEY_REQUIRED' : r.status === 429 ? 'RATE_LIMIT' : 'UPSTREAM';
                throw new ApiError(r.status === 401 ? 'El proveedor requiere una API key. Agregala en Ajustes.' : r.status === 429 ? 'Límite del proveedor alcanzado. Esperá unos segundos y reintentá.' : `El proveedor respondió HTTP ${r.status}. No se usaron datos de demostración.`, r.status === 401 ? 503 : r.status, code);
            }
            const raw = await r.text();
            if (raw.length > 8000000)
                throw new ApiError('Respuesta del proveedor demasiado grande.');
            try {
                return JSON.parse(raw);
            }
            catch {
                throw new ApiError('El proveedor devolvió una respuesta que no es JSON.');
            }
        }
    }
    async cached(key, ttl, fn) { const c = this.cache.get(key); if (c && c.expires > Date.now())
        return structuredClone(c.value); if (this.inflight.has(key))
        return this.inflight.get(key); const promise = fn().then(v => { this.cache.set(key, { expires: Date.now() + ttl, value: v }); return structuredClone(v); }).finally(() => this.inflight.delete(key)); this.inflight.set(key, promise); return promise; }
    async jup(path, body, ttl = 0) { const fn = async () => { const prior = this.tail; let release; this.tail = new Promise(r => release = r); await prior; try {
        if (this.throttle) {
            await pause(Math.max(0, this.next - Date.now()));
            this.next = Date.now() + (this.config.jupiterKey ? 1100 : 2200);
        }
        return await this.json('https://api.jup.ag' + path, { method: body ? 'POST' : 'GET', body, headers: this.config.jupiterKey ? { 'x-api-key': this.config.jupiterKey } : {}, retry: !body });
    }
    finally {
        release();
    } }; return ttl ? this.cached(path, ttl, fn) : fn(); }
    async validateRpcHost(url) { if (this.skipDns)
        return; const u = new URL(url); let timer; const records = await Promise.race([lookup(u.hostname, { all: true }), new Promise((_, reject) => { timer = setTimeout(() => reject(new ApiError('No se pudo resolver el dominio RPC. Revisá internet y el endpoint.', 503, 'DNS')), 5000); timer.unref?.(); })]).finally(() => clearTimeout(timer)); if (!records.length || records.some(({ address: a }) => /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::|fc|fd|fe80)/i.test(a)))
        throw new ApiError('El RPC no puede apuntar a una red privada.'); }
    async rpc(method, params = [], network = this.config.network) { const endpoint = network === 'devnet' ? this.config.devnetRpc : this.config.mainnetRpc; await this.cached('dns:' + endpoint, 60000, async () => { await this.validateRpcHost(endpoint); return true; }); const d = await this.json(endpoint, { method: 'POST', body: { jsonrpc: '2.0', id: 1, method, params }, retry: false }); if (d.error)
        throw new ApiError(`RPC ${d.error.code}: ${String(d.error.message || 'Error de red').slice(0, 180)}`, 502, 'RPC'); if (!Object.prototype.hasOwnProperty.call(d, 'result'))
        throw new ApiError('Respuesta RPC sin resultado.'); return d.result; }
    async checkNetwork(network = this.config.network) { return this.cached('genesis:' + network, 15000, async () => { const actual = await this.rpc('getGenesisHash', [], network); if (actual !== GENESIS[network])
        throw new ApiError('El RPC está conectado a otra red. Se bloquearon las firmas.', 409, 'WRONG_NETWORK'); return actual; }); }
    async dex(path) { return this.cached('dex:' + path, 30000, () => this.json('https://api.dexscreener.com' + path, { retry: true })); }
}
