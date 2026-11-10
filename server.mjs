/** Pulp: loopback default; explicit authenticated deployment mode behind a trusted TLS reverse proxy. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createService } from './server/service.mjs';
import { createV4, V4_GETS, V4_POSTS } from './server/v4/module.mjs';
import { address } from './shared/solana.mjs';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GETS = new Set(['boot', 'health', 'settings', 'connections', 'account', 'portfolio', 'portfolio/history', 'market', 'tokens/search', 'wallet/history', 'transaction', 'launch/discover', 'token/details', 'earn/markets', 'earn/positions', 'tx/history', 'tx/status', 'governance/list']);
const POSTS = new Set(['settings/save', 'auth/challenge', 'auth/verify', 'auth/logout', 'account/save', 'swap/prepare', 'transfer/prepare', 'launch/prepare', 'earn/prepare', 'tx/submit', 'governance/create', 'governance/challenge', 'governance/vote']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
function redactError(message, config) {
    let result = String(message || 'No se pudo completar la solicitud.');
    const values = [config.jupiterKey, config.mainnetRpc, config.devnetRpc, process.env.PULP_SUPABASE_SERVICE_KEY, process.env.PULP_PINATA_JWT, process.env.PULP_ENCRYPTION_KEY];
    for (const value of values)
        if (value && value.length > 6)
            result = result.split(value).join('[dato protegido]');
    result = result.replace(/(api[-_]?key|authorization|token|secret)=([^\s&]+)/gi, '$1=[protegido]').replace(/https:\/\/api\.telegram\.org\/bot[^\s/]+/g, 'https://api.telegram.org/bot[protegido]');
    return result.slice(0, 600);
}
export function defaultDataDir() { return process.env.PULP_DATA_DIR || path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Application Support/PulpBeta' : '.pulp-beta'); }
export function makeServer(options = {}) {
    const dataDir = options.dataDir || defaultDataDir();
    const publicOrigin = options.publicOrigin ?? process.env.PULP_PUBLIC_ORIGIN ?? '';
    const adminWallet = options.adminWallet ?? process.env.PULP_ADMIN_WALLET ?? '';
    if (publicOrigin) {
        const u = new URL(publicOrigin);
        if (u.protocol !== 'https:' || u.origin !== publicOrigin)
            throw Error('PULP_PUBLIC_ORIGIN debe ser un origen HTTPS sin ruta.');
        address(adminWallet);
        if (!options.store && (!process.env.PULP_SUPABASE_URL || !process.env.PULP_SUPABASE_SERVICE_KEY))
            throw Error('El modo público requiere PostgreSQL/Supabase configurado.');
    }
    const service = createService({ dataDir, ...options, publicOrigin, adminWallet });
    const v4 = createV4(service, { dataDir, publicOrigin, adminWallet, startWorkers: options.startWorkers ?? true });
    const requests = new Map();
    const server = http.createServer(async (req, res) => {
        const port = server.address()?.port, host = req.headers.host;
        const allowedHosts = new Set(publicOrigin ? [new URL(publicOrigin).host] : [`127.0.0.1:${port}`, `localhost:${port}`]);
        const origin = publicOrigin || `http://${host}`;
        const headers = {
            'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
            'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store',
            ...(publicOrigin ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
        };
        const send = (status, data) => {
            if (res.writableEnded)
                return;
            res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
        };
        try {
            if (!allowedHosts.has(host))
                return send(403, { error: 'Host no autorizado.', code: 'HOST' });
            if (req.headers.origin && req.headers.origin !== origin)
                return send(403, { error: 'Origen no permitido.', code: 'ORIGIN' });
            if (['cross-site', 'same-site'].includes(req.headers['sec-fetch-site']))
                return send(403, { error: 'Solicitudes externas bloqueadas.', code: 'ORIGIN' });
            const rawPath = req.url.split('?')[0];
            if (/%2f|%5c|%00/i.test(rawPath) || rawPath.includes('..') || rawPath.includes('\\'))
                return send(400, { error: 'Ruta inválida.' });
            const url = new URL(req.url, origin);
            if (url.pathname.startsWith('/api/')) {
                const route = url.pathname.slice(5);
                let b = {};
                const isV4 = route.startsWith('v4/'), shortRoute = isV4 ? route.slice(3) : route;
                if (req.method === 'GET' && (isV4 ? V4_GETS.has(shortRoute) : GETS.has(route)))
                    b = Object.fromEntries(url.searchParams);
                else if (req.method === 'POST' && (isV4 ? V4_POSTS.has(shortRoute) : POSTS.has(route))) {
                    if (req.headers.origin !== origin || req.headers['x-pulp-csrf'] !== service.csrf)
                        return send(403, { error: 'Recargá Pulp para renovar la sesión de seguridad.', code: 'CSRF' });
                    if (!String(req.headers['content-type']).startsWith('application/json'))
                        return send(415, { error: 'Se requiere JSON.' });
                    const chunks = [];
                    let size = 0;
                    for await (const chunk of req) {
                        size += chunk.length;
                        if (size > 131072) {
                            send(413, { error: 'La solicitud es demasiado grande.' });
                            req.resume();
                            return;
                        }
                        chunks.push(chunk);
                    }
                    try {
                        b = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
                    }
                    catch {
                        return send(400, { error: 'JSON inválido.' });
                    }
                    if (!b || typeof b !== 'object' || Array.isArray(b))
                        return send(400, { error: 'Objeto JSON requerido.' });
                }
                else
                    return send(405, { error: 'Ruta o método no disponible.', code: 'METHOD' });
                if (route !== 'health') {
                    const bucket = route.startsWith('auth/') ? 'auth' : route.startsWith('tx/') ? 'tx' : 'api', key = bucket + ':' + (service.session(req.headers.cookie)?.owner || (publicOrigin && process.env.PULP_TRUST_PROXY === '1' ? String(req.headers['x-real-ip'] || req.socket.remoteAddress).slice(0, 80) : req.socket.remoteAddress)), now = Date.now();
                    const recent = (requests.get(key) || []).filter(t => now - t < 60000);
                    const limit = bucket === 'auth' ? 30 : bucket === 'tx' ? 120 : 240;
                    if (recent.length >= limit)
                        return send(429, { error: 'Demasiadas solicitudes. Esperá un minuto.', code: 'RATE_LIMIT' });
                    if (requests.size > 1000)
                        for (const [k, list] of requests)
                            if (!list.length || now - list.at(-1) > 60000)
                                requests.delete(k);
                    if (requests.size > 10000 && !requests.has(key))
                        return send(429, { error: 'Capacidad de solicitudes alcanzada. Reintentá más tarde.', code: 'RATE_LIMIT' });
                    recent.push(now);
                    requests.set(key, recent);
                }
                const ctx = { cookie: req.headers.cookie, origin, userAgent: req.headers['user-agent'] };
                if (process.env.PULP_PAUSE_FINANCIAL === '1' && (route.endsWith('/prepare') || route === 'tx/submit' || route === 'v4/pool/create' || route === 'v4/governance/propose' || route === 'v4/governance/execute'))
                    return send(503, { error: 'Operaciones pausadas. No se solicita firma.', code: 'PAUSED' });
                const result = isV4 ? await v4.request(shortRoute, b, ctx) : await service.request(route, b, ctx);
                if (result?._cookie) {
                    res.setHeader('Set-Cookie', result._cookie);
                    delete result._cookie;
                }
                return send(200, result);
            }
            if (req.method !== 'GET' && req.method !== 'HEAD')
                return send(405, { error: 'Método no permitido.' });
            let base = path.join(ROOT, 'public'), relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
            if (url.pathname.startsWith('/shared/')) {
                base = path.join(ROOT, 'shared');
                relative = url.pathname.slice(8);
            }
            if (relative.split('/').some(p => p.startsWith('.') || p === '..'))
                return send(403, { error: 'Archivo privado.' });
            const file = path.resolve(base, relative);
            if (!file.startsWith(base + path.sep))
                return send(403, { error: 'Ruta bloqueada.' });
            if (!fs.existsSync(file) || !fs.statSync(file).isFile())
                return send(404, { error: 'Archivo no encontrado.' });
            const real = fs.realpathSync(file);
            if (!real.startsWith(fs.realpathSync(base) + path.sep))
                return send(403, { error: 'Enlace de archivo bloqueado.' });
            res.writeHead(200, { ...headers, 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
            if (req.method === 'HEAD')
                return res.end();
            fs.createReadStream(file).pipe(res);
        }
        catch (e) {
            send(e.status && e.status >= 400 && e.status <= 599 ? e.status : 400, { error: redactError(e.message, service.config), code: e.code || 'INVALID_REQUEST' });
        }
    });
    server.on('close', () => v4.stop());
    server.requestTimeout = 60000;
    server.headersTimeout = 15000;
    return { server, service, v4 };
}
function openBrowser(url) { const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'; spawn(command, [url], { stdio: 'ignore', detached: true }).on('error', () => { }).unref(); }
export async function start(options = {}) {
    const port = Number(options.port ?? process.env.PORT ?? 4173);
    if (!Number.isInteger(port) || port < 0 || port > 65535)
        throw Error('Puerto inválido.');
    const { server, service, v4 } = makeServer(options);
    try {
        await service.ready;
        await service.store.health();
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, (options.publicOrigin || process.env.PULP_PUBLIC_ORIGIN) ? '0.0.0.0' : '127.0.0.1', resolve); });
    }
    catch (error) {
        v4.stop();
        throw error;
    }
    return { server, service, v4, url: options.publicOrigin || process.env.PULP_PUBLIC_ORIGIN || `http://127.0.0.1:${server.address().port}` };
}
/**
 * Start on the preferred loopback port and, when automatic selection is enabled,
 * fall back only if another application already owns that port. An existing Pulp
 * instance is reused only when it reports the same build version.
 */
export async function launchLocal(options = {}) {
    const preferred = Number(options.port ?? process.env.PORT ?? 4173);
    if (!Number.isInteger(preferred) || preferred < 1 || preferred > 65535)
        throw Error('Puerto inválido.');
    const automatic = options.auto ?? (process.env.PORT === undefined);
    const lastPort = Math.min(65535, preferred + (automatic ? (options.maxExtraPorts ?? 20) : 0));
    const sameBuild = async (port) => {
        const url = `http://127.0.0.1:${port}`;
        const existing = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(400) })
            .then(async (r) => r.ok ? await r.json() : null).catch(() => null);
        return existing?.app === 'pulp-beta' && existing.version === '4.2.0-beta.1';
    };
    // Reuse a running copy even if a previous launch selected a fallback port.
    // This avoids running two processes against the same on-disk workspace.
    for (let port = preferred; port <= lastPort; port++) {
        if (await sameBuild(port))
            return { url: `http://127.0.0.1:${port}`, reused: true, server: null };
    }
    for (let port = preferred; port <= lastPort; port++) {
        try {
            const launched = await start({ ...options, port });
            return { ...launched, reused: false };
        }
        catch (e) {
            if (e.code === 'EADDRINUSE' && automatic)
                continue;
            if (e.code === 'EADDRINUSE')
                throw Error(`El puerto ${port} está ocupado. Probá con PORT=${port + 1} node server.mjs --open.`);
            throw e;
        }
    }
    throw Error(`No se encontró un puerto libre entre ${preferred} y ${lastPort}. Cerrá una instancia local o elegí otro puerto mediante PORT=4200.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const suffix = process.argv.includes('--ui-kit') ? '#/ui-kit' : process.argv.includes('--website') ? 'sitio.html' : '';
    try {
        const { server, url, reused } = process.env.PULP_PUBLIC_ORIGIN ? await start() : await launchLocal();
        if (reused) {
            console.log(`Pulp Beta ya está abierto en ${url}.`);
        }
        else {
            console.log(`\n🐙 PULP WHITE EDITION 4.2 · BETA · Inicio correcto\n${url}/${suffix}\n${!process.env.PULP_PUBLIC_ORIGIN && new URL(url).port !== '4173' ? 'Puerto 4173 ocupado: se eligió otro puerto automáticamente.\n' : ''}Datos privados: ${defaultDataDir()}\n${process.env.PULP_PUBLIC_ORIGIN ? 'Modo desplegable. Acceder solo por el proxy HTTPS configurado.' : 'Servidor local. No exponer directamente a internet.'} Ctrl+C para detener.\n`);
            for (const sig of ['SIGINT', 'SIGTERM'])
                process.on(sig, () => { server.close(); setTimeout(() => process.exit(0), 300).unref(); });
        }
        if (process.argv.includes('--open'))
            openBrowser(url + '/' + suffix);
    }
    catch (e) {
        console.error('Pulp no pudo abrirse:', e.message);
        process.exitCode = 1;
    }
}
