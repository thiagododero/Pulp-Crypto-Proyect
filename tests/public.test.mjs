/** Public-origin contract tests use a loopback HTTP transport, not real TLS or a deployed database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { makeServer } from '../server.mjs';
import { FileStore } from '../server/v4/storage.mjs';
import { identity, makeFixtures } from './fixtures.mjs';
import { to64 } from '../shared/solana.mjs';
const origin = 'https://pulp.example';
async function setup(t) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pulp-public-test-')), admin = identity(), user = identity(), f = makeFixtures({ owner: admin.owner }), old = process.env.PULP_ENCRYPTION_KEY;
    process.env.PULP_ENCRYPTION_KEY = '14'.repeat(32);
    const { server, service } = makeServer({ dataDir: d, store: new FileStore(d), publicOrigin: origin, adminWallet: admin.owner, fetchImpl: f.fetchImpl, skipDns: true, throttle: false, startWorkers: false });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    t.after(async () => { await new Promise(r => server.close(r)); if (old === undefined)
        delete process.env.PULP_ENCRYPTION_KEY;
    else
        process.env.PULP_ENCRYPTION_KEY = old; fs.rmSync(d, { recursive: true, force: true }); });
    const request = (route, { body, cookie = '', host = 'pulp.example', requestOrigin = origin, csrf = '' } = {}) => new Promise((resolve, reject) => { const r = http.request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/' + route, method: body ? 'POST' : 'GET', headers: { Host: host, Origin: requestOrigin, Cookie: cookie, ...(body ? { 'Content-Type': 'application/json', 'X-Pulp-CSRF': csrf } : {}) } }, res => { let b = ''; res.on('data', d => b += d); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(b) })); }); r.on('error', reject); r.end(body ? JSON.stringify(body) : undefined); });
    const boot = await request('boot'), csrf = boot.body.csrf;
    const auth = async (id) => { const c = await request('auth/challenge', { csrf, body: { address: id.owner } }), m = new TextEncoder().encode(c.body.message), v = await request('auth/verify', { csrf, body: { id: c.body.id, message: to64(m), signature: to64(id.sign(m)) } }); assert.equal(v.status, 200); return { cookie: v.headers['set-cookie'][0].split(';')[0], header: v.headers['set-cookie'][0] }; };
    return { request, csrf, auth, admin, user, service };
}
test('Public mode rejects non-HTTPS origin and missing operator wallet', () => { assert.throws(() => makeServer({ publicOrigin: 'http://pulp.example', adminWallet: identity().owner }), /HTTPS/); assert.throws(() => makeServer({ publicOrigin: origin, adminWallet: '' })); });
test('Public mode limits operator settings and keeps provider credentials out of responses', async (t) => { const x = await setup(t), a = await x.auth(x.admin), u = await x.auth(x.user); assert.match(a.header, /Secure/); assert.match(a.header, /HttpOnly/); assert.match(a.header, /SameSite=Strict/); assert.equal((await x.request('v4/integrations')).status, 401); assert.equal((await x.request('v4/economy', { cookie: u.cookie })).status, 403); assert.equal((await x.request('settings/save', { cookie: u.cookie, csrf: x.csrf, body: { slippageBps: 75 } })).status, 403); const result = await x.request('settings/save', { cookie: a.cookie, csrf: x.csrf, body: { jupiterKey: 'private-provider-token', slippageBps: 75 } }); assert.equal(result.status, 200); assert.ok(!JSON.stringify(result.body).includes('private-provider-token')); assert.equal((await x.request('v4/integrations', { cookie: a.cookie })).status, 200); const boot = await x.request('boot'); assert.match(boot.headers['strict-transport-security'], /31536000/); assert.equal(boot.body.config.mode, 'public'); });
test('Public mode rejects wrong host, origin, CSRF and cross-wallet session revocation', async (t) => { const x = await setup(t), a = await x.auth(x.admin), u = await x.auth(x.user); assert.equal((await x.request('boot', { host: 'evil.example' })).status, 403); assert.equal((await x.request('boot', { requestOrigin: 'https://evil.example' })).status, 403); assert.equal((await x.request('v4/preferences/save', { cookie: u.cookie, body: { consentAnalytics: true }, csrf: 'wrong' })).status, 403); const sessions = await x.request('v4/sessions', { cookie: a.cookie }); await x.request('v4/sessions/revoke', { cookie: u.cookie, csrf: x.csrf, body: { id: sessions.body.items[0].id } }); assert.equal((await x.request('account', { cookie: a.cookie })).status, 200); await x.request('v4/sessions/revoke', { cookie: u.cookie, csrf: x.csrf, body: { id: 'all' } }); assert.equal((await x.request('account', { cookie: u.cookie })).status, 401); });
test('Public pause rejects signing plans but leaves portfolio and history readable', async (t) => { const x = await setup(t), a = await x.auth(x.admin), old = process.env.PULP_PAUSE_FINANCIAL; process.env.PULP_PAUSE_FINANCIAL = '1'; t.after(() => { if (old === undefined)
    delete process.env.PULP_PAUSE_FINANCIAL;
else
    process.env.PULP_PAUSE_FINANCIAL = old; }); for (const route of ['swap/prepare', 'v4/wrap/prepare', 'v4/governance/execute', 'tx/submit'])
    assert.equal((await x.request(route, { cookie: a.cookie, csrf: x.csrf, body: { test: true } })).status, 503); assert.equal((await x.request('tx/history', { cookie: a.cookie })).status, 200); });
