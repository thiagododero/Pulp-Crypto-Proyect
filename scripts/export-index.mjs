/** Export public-only discovery data for inspection, never user watchlists. */
import { storageFor } from '../server/v4/storage.mjs';
import { defaultDataDir } from '../server.mjs';
const s = storageFor(defaultDataDir()), network = process.argv[2] || 'mainnet';
if (!['mainnet', 'devnet'].includes(network))
    throw Error('Red inválida.');
const rows = await s.get('v4-candidates-' + network, []);
console.log(JSON.stringify({ network, source: 'Firmantes observados; no recomendación de inversión', candidates: rows, exportedAt: new Date().toISOString() }, null, 2));
