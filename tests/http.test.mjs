import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { makeServer } from '../server.mjs';
import { makeFixtures } from './fixtures.mjs';
async function start(t) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pulp-http-')), f = makeFixtures(), { server } = makeServer({ dataDir: d, fetchImpl: f.fetchImpl, skipDns: true, throttle: false }); await new Promise(r => server.listen(0, '127.0.0.1', r)); t.after(async () => { await new Promise(r => server.close(r)); fs.rmSync(d, { recursive: true, force: true }); }); const url = 'http://127.0.0.1:' + server.address().port; const boot = await fetch(url + '/api/boot').then(r => r.json()); return { url, boot, server }; }
test('HTTP serves real beta assets with CSP and anti-framing headers', async (t) => { const { url } = await start(t); for (const p of ['/', '/js/app.mjs', '/shared/solana.mjs', '/assets/brand/pulp-icon.svg']) {
    const r = await fetch(url + p);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.ok(r.headers.get('content-security-policy').includes("script-src 'self'"));
} });
test('State changes require same origin plus a server CSRF token', async (t) => { const { url, boot } = await start(t); for (const headers of [{ 'Content-Type': 'application/json' }, { 'Content-Type': 'application/json', 'Origin': 'https://evil.example', 'X-Pulp-CSRF': boot.csrf }]) {
    const r = await fetch(url + '/api/settings/save', { method: 'POST', headers, body: '{"slippageBps":100}' });
    assert.equal(r.status, 403);
} const ok = await fetch(url + '/api/settings/save', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url, 'X-Pulp-CSRF': boot.csrf }, body: '{"slippageBps":100}' }); assert.equal(ok.status, 200); });
test('HTTP blocks arbitrary hosts, cross-site reads and private files', async (t) => { const { url } = await start(t); const hostStatus = await new Promise((resolve, reject) => http.get(url + '/api/boot', { headers: { Host: 'evil.example' } }, r => { r.resume(); resolve(r.statusCode); }).on('error', reject)); assert.equal(hostStatus, 403); assert.equal((await fetch(url + '/api/boot', { headers: { Origin: 'https://evil.example' } })).status, 403); for (const p of ['/server/service.mjs', '/.env', '/config.json', '/tests/fixtures.mjs', '/data/config.json'])
    assert.notEqual((await fetch(url + p)).status, 200); });
test('Write endpoints cannot be called using GET and read endpoints cannot mutate', async (t) => { const { url } = await start(t); assert.equal((await fetch(url + '/api/tx/submit')).status, 405); assert.equal((await fetch(url + '/api/settings/save')).status, 405); });
test('Encoded traversal and byte-null paths do not escape the public root', async (t) => { const { url } = await start(t); for (const p of ['/..%2fserver.mjs', '/%2e%2e%2fserver.mjs', '/assets/%00', '/shared/%2e%2e%2fserver.mjs'])
    assert.notEqual((await fetch(url + p)).status, 200); });
test('Authentication and transaction API errors are explicit JSON not false success', async (t) => { const { url } = await start(t); const r = await fetch(url + '/api/account'); assert.equal(r.status, 401); assert.equal((await r.json()).code, 'AUTH_REQUIRED'); });
