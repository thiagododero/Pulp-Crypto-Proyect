/** Reproducible no-network syntax + local asset check. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
function all(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? all(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
let count = 0;
for (const f of all(root).filter(f => /\.(mjs|js)$/.test(f))) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) {
        console.error(r.stderr);
        process.exit(1);
    }
    count++;
}
for (const f of ['public/index.html', 'public/css/tokens.css', 'public/css/components.css', 'public/css/app.css', 'public/assets/brand/pulp-icon.svg', 'public/assets/white/pulp-hero.webp', 'public/assets/white/pulp-builder.webp', 'Abrir.command', 'Abrir-UI-Kit.command'])
    if (!fs.existsSync(path.join(root, f)))
        throw Error('Falta ' + f);
const code = fs.readFileSync(path.join(root, 'public/js/views.mjs'), 'utf8') + fs.readFileSync(path.join(root, 'public/js/app.mjs'), 'utf8');
for (const m of code.matchAll(/assets\/(?:brand|white)\/[a-zA-Z0-9_-]+\.(?:svg|webp|png)/g))
    if (!fs.existsSync(path.join(root, 'public', m[0])))
        throw Error('Falta recurso ' + m[0]);
for (const a of JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json'), 'utf8')).assets) { if (!fs.existsSync(path.join(root, 'public', a.path))) throw Error('Falta recurso del manifiesto: ' + a.path); }
console.log(`OK: ${count} archivos JavaScript válidos y recursos locales presentes. Sin dependencias de npm.`);
