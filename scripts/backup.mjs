/** Explicit local backup; contains private data. Keep it off shared drives/repositories. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const source = process.env.PULP_DATA_DIR || path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Application Support/PulpBeta' : '.pulp-beta');
if (process.env.PULP_SUPABASE_URL)
    throw Error('Para Supabase usá backup PostgreSQL. Este comando no exporta la base remota.');
if (!fs.existsSync(source))
    throw Error('No existe todavía el directorio de datos.');
const destination = path.resolve(process.argv[2] || path.join(os.homedir(), 'Pulp-Backups', new Date().toISOString().replace(/[:.]/g, '-')));
if (destination === path.resolve(source) || destination.startsWith(path.resolve(source) + path.sep))
    throw Error('El respaldo debe estar fuera de los datos originales.');
if (fs.existsSync(destination))
    throw Error('El destino ya existe. No se sobrescribe.');
fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
for (const e of fs.readdirSync(source, { withFileTypes: true }))
    if (e.isFile() && (e.name.endsWith('.json') || e.name.endsWith('.key'))) {
        const dest = path.join(destination, e.name);
        fs.copyFileSync(path.join(source, e.name), dest);
        fs.chmodSync(dest, 0o600);
    }
console.log('Respaldo privado en ' + destination + '\nContiene configuración y claves de cifrado. No lo publiques. El .env se respalda por separado.');
