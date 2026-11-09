/** TEST ONLY. Injected providers; no network calls or actual funds. Not imported by production. */
import { start } from '../server.mjs';
import {protocolFixtures} from './protocol-fixtures.mjs';
import { makeFixtures } from './fixtures.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulp-ui-tests-'));
const fixtures = makeFixtures();
const { server, url, service } = await start({ port: 4183, dataDir, fetchImpl: fixtures.fetchImpl, skipDns: true, throttle: false });
const protocol=protocolFixtures(service,fixtures.control.owner);
process.env.PULP_MERCHANT_WALLET=fixtures.control.owner;
process.env.PULP_SQUADS_MULTISIG=protocol.ms;
console.log('TEST ONLY ' + url);
for (const s of ['SIGTERM', 'SIGINT'])
    process.on(s, () => server.close(() => { fs.rmSync(dataDir, { recursive: true, force: true }); process.exit(0); }));
