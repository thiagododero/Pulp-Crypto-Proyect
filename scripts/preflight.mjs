/** Offline, redacted configuration checks. Does not connect, deploy or move money. */
import { address } from '../shared/solana.mjs';
const env = process.env, checks = [];
function check(label, fn, required = true) { try {
    const value = fn();
    checks.push({ label, status: value ? 'ok' : required ? 'missing' : 'optional' });
}
catch {
    checks.push({ label, status: 'invalid' });
} }
check('Node >=20.11', () => { const [a, b] = process.versions.node.split('.').map(Number); return a > 20 || a === 20 && b >= 11; });
check('RPC HTTPS propio', () => env.PULP_RPC_URL && new URL(env.PULP_RPC_URL).protocol === 'https:', false);
check('Jupiter API key presente', () => !!env.PULP_JUPITER_KEY, false);
check('Fuente de historial válida', () => ['rpc', 'helius'].includes(env.PULP_HISTORY_PROVIDER || 'rpc'));
check('Wallet de comercio válida', () => env.PULP_MERCHANT_WALLET && address(env.PULP_MERCHANT_WALLET), false);
check('Squads configurado', () => env.PULP_SQUADS_MULTISIG && address(env.PULP_SQUADS_MULTISIG), false);
if (env.PULP_PUBLIC_ORIGIN) {
    check('Origen público HTTPS sin ruta', () => { const u = new URL(env.PULP_PUBLIC_ORIGIN); return u.protocol === 'https:' && u.origin === env.PULP_PUBLIC_ORIGIN; });
    check('Wallet de administrador', () => address(env.PULP_ADMIN_WALLET));
    check('Supabase URL', () => { const u = new URL(env.PULP_SUPABASE_URL); return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co'); });
    check('Supabase server key presente', () => !!env.PULP_SUPABASE_SERVICE_KEY);
    check('Clave AES 32 bytes', () => /^[a-f0-9]{64}$/i.test(env.PULP_ENCRYPTION_KEY || ''));
}
console.log(JSON.stringify({ mode: env.PULP_PUBLIC_ORIGIN ? 'public-configured' : 'local', checks, protocolWrites: env.PULP_ENABLE_PROTOCOL_WRITES === '1' ? 'experimental-enabled' : 'blocked', financialPause: env.PULP_PAUSE_FINANCIAL === '1', note: 'No prueba disponibilidad, permisos, saldo, TLS, despliegue ni seguridad. No imprime secretos.' }, null, 2));
if (checks.some(x => ['missing', 'invalid'].includes(x.status)))
    process.exitCode = 1;
