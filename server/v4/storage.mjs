/** Storage shared by the core and v4 modules. No wallet secrets. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const clone = v => structuredClone(v);
function key(k) {
    if (!/^[a-zA-Z0-9:_-]{1,220}$/.test(k))
        throw Error('Clave de almacenamiento inválida.');
    return k;
}
export class FileStore {
    constructor(dir) { this.dir = dir; this.kind = 'local'; this.queues = new Map(); }
    async get(k, fallback = null) {
        try {
            return JSON.parse(await fs.readFile(path.join(this.dir, key(k) + '.json'), 'utf8'));
        }
        catch (e) {
            if (e.code === 'ENOENT')
                return clone(fallback);
            throw Error('Datos dañados: ' + k + '. No se sobrescribieron.');
        }
    }
    async put(k, v) { key(k); await fs.mkdir(this.dir, { recursive: true, mode: 0o700 }); const f = path.join(this.dir, k + '.json'), tmp = f + '.' + randomBytes(6).toString('hex') + '.tmp'; await fs.writeFile(tmp, JSON.stringify(v), { mode: 0o600 }); await fs.rename(tmp, f); return v; }
    async remove(k) { await fs.rm(path.join(this.dir, key(k) + '.json'), { force: true }); }
    async mutate(k, fn, fallback = null) {
        const prior = this.queues.get(k) || Promise.resolve();
        const next = prior.catch(() => { }).then(async () => { const v = await fn(await this.get(k, fallback)); await this.put(k, v); return clone(v); });
        this.queues.set(k, next);
        try {
            return await next;
        }
        finally {
            if (this.queues.get(k) === next)
                this.queues.delete(k);
        }
    }
    async health() { await fs.mkdir(this.dir, { recursive: true, mode: 0o700 }); return { ok: true, kind: this.kind }; }
}
export class SupabaseStore {
    constructor({ url, serviceKey, fetchImpl = fetch }) {
        const u = new URL(url);
        if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co') || u.username || u.password || u.search || u.hash)
            throw Error('Usá el origen HTTPS de tu proyecto Supabase.');
        if (!serviceKey)
            throw Error('Falta la clave server-side de Supabase.');
        this.url = u.origin;
        this.secret = serviceKey;
        this.fetch = fetchImpl;
        this.kind = 'postgres-supabase';
    }
    async call(p, { method = 'GET', body, extra = {} } = {}) {
        const r = await this.fetch(this.url + '/rest/v1/' + p, { method, headers: { apikey: this.secret, Authorization: 'Bearer ' + this.secret, 'Content-Type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12000), redirect: 'error' });
        if (!r.ok)
            throw Error('Base de datos no disponible (HTTP ' + r.status + '). Revisá migración y credenciales del servidor.');
        return r.status === 204 ? null : r.json();
    }
    async entry(k) { const rows = await this.call('pulp_kv?key=eq.' + encodeURIComponent(key(k)) + '&select=value,revision&limit=1'); return rows[0] || null; }
    async get(k, fallback = null) { return (await this.entry(k))?.value ?? clone(fallback); }
    async put(k, value) { await this.call('rpc/pulp_kv_put', { method: 'POST', body: { p_key: key(k), p_value: value } }); return value; }
    async remove(k) { await this.call('pulp_kv?key=eq.' + encodeURIComponent(key(k)), { method: 'DELETE' }); }
    async mutate(k, fn, fallback = null) {
        for (let i = 0; i < 8; i++) {
            const old = await this.entry(k);
            const value = await fn(clone(old?.value ?? fallback));
            const ok = await this.call('rpc/pulp_kv_cas', { method: 'POST', body: { p_key: key(k), p_revision: old?.revision ?? -1, p_value: value } });
            if (ok)
                return value;
            await new Promise(r => setTimeout(r, 15 * (i + 1)));
        }
        throw Error('Conflicto de actualización. Reintentá.');
    }
    async health() { await this.call('pulp_kv?select=key&limit=1'); return { ok: true, kind: this.kind }; }
}
export function storageFor(dataDir, opts = {}) { return process.env.PULP_SUPABASE_URL ? new SupabaseStore({ url: process.env.PULP_SUPABASE_URL, serviceKey: process.env.PULP_SUPABASE_SERVICE_KEY, fetchImpl: opts.fetchImpl }) : new FileStore(dataDir); }
