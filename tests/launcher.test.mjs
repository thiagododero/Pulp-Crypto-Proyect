import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchLocal, start } from '../server.mjs';
import { makeFixtures } from './fixtures.mjs';

async function occupied(t, handler = (_req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('Not Pulp'); }) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return server.address().port;
}
function opts(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulp-launcher-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  return { dataDir, fetchImpl: makeFixtures().fetchImpl, skipDns: true, throttle: false };
}
function cleanServer(t, server) {
  if (server) t.after(() => new Promise(resolve => server.close(resolve)));
}

test('opens automatically on the next available port when 4173-equivalent is occupied by another application', async t => {
  const port = await occupied(t);
  const result = await launchLocal({ ...opts(t), port, auto: true, maxExtraPorts: 25 });
  cleanServer(t, result.server);
  assert.equal(result.reused, false);
  assert.notEqual(Number(new URL(result.url).port), port);
  const r = await fetch(result.url + '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).version, '4.2.0-beta.1');
  assert.match(await (await fetch(result.url + '/')).text(), /Pulp/i);
});

test('reuses an existing process only when its health endpoint has the same Pulp build', async t => {
  const live = await start({ ...opts(t), port: 0 });
  cleanServer(t, live.server);
  const result = await launchLocal({ port: Number(new URL(live.url).port), auto: true });
  assert.equal(result.reused, true);
  assert.equal(result.server, null);
  assert.equal(result.url, live.url);
});

test('does not mistake a Pulp beta.1 process for the new beta.2 process', async t => {
  const port = await occupied(t, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ app: 'pulp-beta', version: '2.0.0-beta.1', ok: true }));
  });
  const next = await launchLocal({ ...opts(t), port, auto: true, maxExtraPorts: 25 });
  cleanServer(t, next.server);
  assert.equal(next.reused, false);
  assert.notEqual(Number(new URL(next.url).port), port);
});

test('explicit PORT override refuses rather than silently changing the requested port', async t => {
  const port = await occupied(t);
  await assert.rejects(launchLocal({ ...opts(t), port, auto: false }), /está ocupado/i);
});

test('a limited search fails with actionable instructions rather than hanging indefinitely', async t => {
  const port = await occupied(t);
  await assert.rejects(launchLocal({ ...opts(t), port, auto: true, maxExtraPorts: 0 }), /No se encontró un puerto libre/);
});

test('finds already running Pulp on fallback port even when preferred port is now free', async t => {
  const temp = await occupied(t); // obtain a dynamically assigned local port
  const live = await start({ ...opts(t), port: 0 });
  cleanServer(t, live.server);
  const livePort = Number(new URL(live.url).port);
  // Find a free port immediately before the actual instance, if possible.
  const port = livePort - 1;
  if (port < 1024 || port === temp) return;
  const marker = http.createServer((_req, res) => { res.writeHead(200); res.end('marker'); });
  try {
    await new Promise((resolve, reject) => { marker.once('error', reject); marker.listen(port, '127.0.0.1', resolve); });
  } catch (e) { return; }
  await new Promise(resolve => marker.close(resolve));
  const result = await launchLocal({ port, auto: true, maxExtraPorts: 2 });
  assert.equal(result.reused, true);
  assert.equal(result.url, live.url);
});
