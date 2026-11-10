import { storageFor } from './v4/storage.mjs';
import { secretBox } from './v4/secrets.mjs';
import { appendSnapshot } from './snapshots.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { PROGRAM, MINT, GENESIS, address, signature, b58encode, b58decode, from64, to64, parseTransaction, assertSignedMatches, assertOrder, safeAmount, units, decimal, same, safeHttps } from '../shared/solana.mjs';
import { randomId, digest, verifyEd25519, safeRpcUrl, safeProtocolUrl, text, assertLamports } from './security.mjs';
import { Upstream, ApiError } from './upstream.mjs';
import { buildMint, transferSol, transferToken, ata } from './builders.mjs';
import { validateEarn } from './validate-earn.mjs';
export const DEFAULT_CONFIG = { network: 'mainnet', mainnetRpc: 'https://api.mainnet-beta.solana.com', devnetRpc: 'https://api.devnet.solana.com', jupiterKey: '', pulpMint: '', treasury: '', governanceUrl: '', slippageBps: 50, maxPriceImpact: 3, swapFeeBps: 0, referralAccount: '' };
const CATALOG = [{ id: MINT.SOL, mint: MINT.SOL, symbol: 'SOL', name: 'Solana', decimals: 9 }, { id: MINT.USDC, mint: MINT.USDC, symbol: 'USDC', name: 'USD Coin', decimals: 6 }];
const sessionMs = 12 * 60 * 60 * 1000;
function object(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function integer(v, min, max) {
    v = Number(v);
    if (!Number.isInteger(v) || v < min || v > max)
        throw Error('Número fuera de rango.');
    return v;
}
function unexpired(map, id) {
    const v = map.get(id);
    if (!v || v.expires < Date.now()) {
        map.delete(id);
        throw new ApiError('Solicitud vencida. Volvé a comenzar.', 410, 'EXPIRED');
    }
    return v;
}
function freshWorkspace() { return { profile: { name: '' }, watched: [], favorites: [], drafts: [] }; }
function cleanWorkspace(b) {
    if (!object(b))
        throw Error('Respaldo inválido.');
    const profile = { name: String(b.profile?.name || '').slice(0, 40) };
    const watched = (Array.isArray(b.watched) ? b.watched : []).slice(0, 30).map(w => ({ address: address(w.address), label: String(w.label || 'Wallet').slice(0, 40) }));
    const favorites = (Array.isArray(b.favorites) ? b.favorites : []).slice(0, 100).map(address);
    const drafts = (Array.isArray(b.drafts) ? b.drafts : []).slice(0, 50).map(d => ({ id: String(d.id || randomId()).slice(0, 60), name: String(d.name || '').slice(0, 32), symbol: String(d.symbol || '').slice(0, 10), description: String(d.description || '').slice(0, 500), image: safeHttps(String(d.image || '')), supply: String(d.supply || ''), decimals: integer(d.decimals ?? 6, 0, 9), uri: String(d.uri || '').slice(0, 200), fixed: d.fixed !== false, createdAt: Number(d.createdAt) || Date.now() }));
    return { profile, watched, favorites, drafts };
}
export function createService({ dataDir, fetchImpl, skipDns = false, throttle = true, store: suppliedStore, publicOrigin = '', adminWallet = '' } = {}) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    const store = suppliedStore || storageFor(dataDir);
    const box = secretBox(dataDir, { publicMode: !!publicOrigin });
    const read = (name, fallback) => store.get(name, fallback);
    const write = (name, value) => store.put(name, name === 'config' ? { encrypted: box.seal(value) } : value);
    const config = { ...DEFAULT_CONFIG };
    const up = new Upstream(config, { fetchImpl, skipDns, throttle });
    const sessions = new Map(), challenges = new Map(), plans = new Map(), voteChallenges = new Map();
    let history = [], proposals = [], revision = 0, activeOperations = 0;
    const ready = (async () => {
        const saved = await read('config', {});
        Object.assign(config, saved.encrypted ? box.open(saved.encrypted) : saved, ...(process.env.PULP_JUPITER_KEY ? [{ jupiterKey: process.env.PULP_JUPITER_KEY }] : []), ...(process.env.PULP_RPC_URL ? [{ mainnetRpc: process.env.PULP_RPC_URL }] : []));
        history = await read('history', []);
        proposals = await read('proposals', []);
        for (const k of ['mainnetRpc', 'devnetRpc'])
            safeRpcUrl(config[k]);
        if (!['mainnet', 'devnet'].includes(config.network))
            throw Error('Red guardada no válida.');
        if (Object.keys(saved).length && !saved.encrypted) {
            // Keep a restricted local rollback snapshot before the one-way v3 config migration.
            if (store.kind === 'local') {
                const backup = path.join(dataDir, 'backup-pre-v4');
                if (!fs.existsSync(backup)) {
                    fs.mkdirSync(backup, { mode: 0o700 });
                    for (const entry of fs.readdirSync(dataDir, { withFileTypes: true }))
                        if (entry.isFile() && entry.name.endsWith('.json')) {
                            const target = path.join(backup, entry.name);
                            fs.copyFileSync(path.join(dataDir, entry.name), target);
                            fs.chmodSync(target, 0o600);
                        }
                }
            }
            await write('config', config);
        }
    })();
    const csrf = randomId();
    for (const k of ['mainnetRpc', 'devnetRpc'])
        safeRpcUrl(config[k]);
    if (!['mainnet', 'devnet'].includes(config.network))
        throw Error('Red guardada no válida.');
    function session(cookie) {
        const id = String(cookie || '').match(/(?:^|;\s*)pulp_session=([a-f0-9]{48})(?:;|$)/)?.[1];
        const s = id ? sessions.get(id) : null;
        if (!s || s.expires < Date.now()) {
            if (id)
                sessions.delete(id);
            return null;
        }
        return { ...s, id };
    }
    function requireAuth(ctx) {
        const s = session(ctx.cookie);
        if (!s)
            throw new ApiError('Verificá tu cuenta con una firma de acceso desde la wallet.', 401, 'AUTH_REQUIRED');
        return s;
    }
    function settingsPublic() { return { network: config.network, pulpMint: config.pulpMint, treasury: config.treasury, governanceUrl: config.governanceUrl, slippageBps: config.slippageBps, maxPriceImpact: config.maxPriceImpact, jupiterKeyConfigured: !!config.jupiterKey, mainnetRpcHost: new URL(config.mainnetRpc).hostname, devnetRpcHost: new URL(config.devnetRpc).hostname, version: '4.2.0-beta.1', revision, storage: store.kind, mode: publicOrigin ? 'public' : 'local', swapFeeBps: config.swapFeeBps || 0 }; }
    async function workspace(owner) { return read('account-' + address(owner), freshWorkspace()); }
    async function addHistory(row) { history.unshift(row); history = history.slice(0, 2000); await write('history', history); }
    async function saveHistory() { await write('history', history); }
    async function balance(owner, network = config.network) { const b = await up.rpc('getBalance', [address(owner), { commitment: 'confirmed' }], network); return assertLamports(b.value); }
    async function tokenInfo(mint, network = config.network) {
        address(mint);
        if (mint === MINT.SOL)
            return { ...CATALOG[0], program: PROGRAM.token };
        return up.cached('mint:' + network + ':' + mint, 60000, async () => {
            const r = await up.rpc('getAccountInfo', [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }], network), v = r.value, p = v?.data?.parsed;
            if (!v || p?.type !== 'mint' || ![PROGRAM.token, PROGRAM.token2022].includes(v.owner))
                throw new ApiError('La dirección no corresponde a un token admitido en esta red.', 400, 'NOT_MINT');
            const d = integer(p.info.decimals, 0, 18);
            return { mint, id: mint, decimals: d, symbol: CATALOG.find(t => t.mint === mint)?.symbol || mint.slice(0, 5) + '…', name: 'Token SPL', program: v.owner, supply: p.info.supply, mintAuthority: p.info.mintAuthority, freezeAuthority: p.info.freezeAuthority, extensions: p.info.extensions || [] };
        });
    }
    async function tokenAccounts(owner, network = config.network) {
        const result = await Promise.allSettled([PROGRAM.token, PROGRAM.token2022].map(program => up.rpc('getTokenAccountsByOwner', [owner, { programId: program }, { encoding: 'jsonParsed', commitment: 'confirmed' }], network)));
        let warnings = [];
        const assets = [];
        result.forEach((r, index) => {
            if (r.status === 'rejected') {
                warnings.push('No se pudieron consultar ' + (index ? 'Token-2022' : 'SPL') + '.');
                return;
            }
            for (const item of r.value.value || []) {
                const info = item.account?.data?.parsed?.info;
                if (!info?.tokenAmount || info.owner !== owner)
                    continue;
                const a = info.tokenAmount;
                safeAmount(a.amount);
                if (a.amount === '0')
                    continue;
                assets.push({ mint: address(info.mint), account: address(item.pubkey), raw: a.amount, decimals: integer(a.decimals, 0, 18), program: index ? PROGRAM.token2022 : PROGRAM.token, native: false, symbol: info.mint === MINT.SOL ? 'wSOL' : CATALOG.find(t => t.mint === info.mint)?.symbol || info.mint.slice(0, 5) + '…', name: info.mint === MINT.SOL ? 'Wrapped SOL' : 'Token SPL', frozen: info.state === 'frozen' });
            }
        });
        return { assets, warnings };
    }
    async function holdings(owner, network = config.network) { await up.checkNetwork(network); const [sol, tokens] = await Promise.all([balance(owner, network), tokenAccounts(owner, network)]); return { assets: [{ mint: MINT.SOL, raw: sol.toString(), decimals: 9, program: PROGRAM.system, native: true, symbol: 'SOL', name: 'Solana' }, ...tokens.assets], warnings: tokens.warnings, lamports: sol }; }
    async function prices(mints) {
        if (config.network !== 'mainnet')
            return {};
        const list = [...new Set(mints)].slice(0, 50);
        list.forEach(address);
        return up.jup('/price/v3?ids=' + encodeURIComponent(list.join(',')), null, 20000);
    }
    async function portfolio(owner) {
        owner = address(owner);
        const h = await holdings(owner);
        let p = {};
        try {
            p = await prices(h.assets.map(a => a.mint));
        }
        catch {
            h.warnings.push('Precios USD no disponibles; los saldos en tokens se mantienen.');
        }
        const assets = h.assets.map(a => { const usd = Number(p[a.mint]?.usdPrice); return { ...a, amount: decimal(a.raw, a.decimals), usdPrice: Number.isFinite(usd) && usd > 0 ? usd : null, usdValue: Number.isFinite(usd) && usd > 0 ? Number(decimal(a.raw, a.decimals)) * usd : null }; });
        return { owner, network: config.network, assets, totalUsd: assets.some(a => a.usdValue !== null) ? assets.reduce((n, a) => n + (a.usdValue || 0), 0) : null, unpriced: assets.filter(a => a.usdValue === null).length, warnings: h.warnings, observedAt: Date.now(), source: 'Solana RPC + Jupiter Price' };
    }
    async function sourceAccount(owner, mint, amount) {
        const t = await tokenAccounts(owner);
        const sources = t.assets.filter(a => a.mint === mint && !a.frozen);
        const s = sources.find(a => BigInt(a.raw) >= amount);
        if (!s)
            throw new ApiError('Saldo insuficiente en una cuenta de token. Consolidá cuentas separadas antes de operar.', 400, 'INSUFFICIENT_BALANCE');
        return s;
    }
    async function ensureBalance(owner, mint, raw) {
        if (mint === MINT.SOL) {
            if (await balance(owner) < BigInt(raw))
                throw new ApiError('Saldo SOL insuficiente.', 400, 'INSUFFICIENT_BALANCE');
        }
        else
            await sourceAccount(owner, mint, BigInt(raw));
    }
    async function inspect(bytes, network, owner) {
        const t = parseTransaction(bytes);
        const loadedW = [], loadedR = [];
        for (const table of t.lookups) {
            const data = (await up.rpc('getAccountInfo', [table.key, { encoding: 'base64', commitment: 'confirmed' }], network)).value;
            if (!data || data.owner !== 'AddressLookupTab1e1111111111111111111111111')
                throw Error('Tabla de direcciones inválida.');
            const raw = from64(data.data[0]);
            const at = i => {
                const start = 56 + i * 32;
                if (start + 32 > raw.length)
                    throw Error('Tabla incompleta.');
                return b58encode(raw.slice(start, start + 32));
            };
            loadedW.push(...table.writable.map(at));
            loadedR.push(...table.readonly.map(at));
        }
        const all = [...t.keys, ...loadedW, ...loadedR];
        const programs = [...new Set(t.instructions.map(ix => all[ix.programIndex]))];
        if (programs.some(p => !p))
            throw Error('No se pudieron resolver los programas.');
        const sim = await up.rpc('simulateTransaction', [to64(bytes), { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: false, commitment: 'confirmed' }], network);
        if (sim.value?.err)
            throw new ApiError('La simulación on-chain falló: ' + JSON.stringify(sim.value.err).slice(0, 180), 400, 'SIMULATION_FAILED');
        const f = await up.rpc('getFeeForMessage', [to64(t.message), { commitment: 'confirmed' }], network);
        if (f.value == null)
            throw new ApiError('El bloque de la transacción venció. Volvé a cotizar.', 410, 'EXPIRED');
        return { resolvedKeys: all, programs, unitsConsumed: sim.value?.unitsConsumed ?? null, networkFeeLamports: assertLamports(f.value).toString(), simulation: 'ok', checkedAt: Date.now() };
    }
    function putPlan({ bytes, owner, kind, summary, lastValidBlockHeight, order = null, expires = Date.now() + 55000, network = config.network, inspection }) {
        const t = parseTransaction(bytes);
        if (!t.keys.slice(0, t.required).includes(owner))
            throw Error('Firmante incorrecto.');
        const id = randomId(), p = { id, bytes: to64(bytes), owner, kind, summary, lastValidBlockHeight, order, expires, network, revision, inspection, state: 'prepared' };
        plans.set(id, p);
        return publicPlan(p);
    }
    function publicPlan(p) { return { id: p.id, transaction: p.bytes, owner: p.owner, kind: p.kind, summary: p.summary, expires: p.expires, network: p.network, revision: p.revision, inspection: p.inspection, messageHash: digest(parseTransaction(from64(p.bytes)).message) }; }
    async function prepareSwap(b, owner) {
        if (config.network !== 'mainnet')
            throw new ApiError('Jupiter opera en Mainnet. Cambiá la red para cotizar.', 400, 'MAINNET_ONLY');
        await up.checkNetwork();
        const inputMint = address(b.inputMint), outputMint = address(b.outputMint);
        if (inputMint === outputMint)
            throw Error('Elegí dos activos distintos.');
        const input = await tokenInfo(inputMint), output = await tokenInfo(outputMint);
        const amount = units(b.amount, input.decimals).toString(), slippageBps = integer(b.slippageBps ?? config.slippageBps, 1, 300);
        await ensureBalance(owner, inputMint, amount);
        const q = await up.jup('/swap/v2/order?' + new URLSearchParams({ inputMint, outputMint, amount, taker: owner, slippageBps: String(slippageBps), maxSupportedTransactionVersion: '0', ...(config.swapFeeBps && config.referralAccount ? { referralAccount: config.referralAccount, referralFee: String(config.swapFeeBps) } : {}) }));
        assertOrder(q, { inputMint, outputMint, amount, owner, slippageBps });
        const impact = q.priceImpact != null ? Math.abs(Number(q.priceImpact)) : Math.abs(Number(q.priceImpactPct)) * 100;
        if (!Number.isFinite(impact))
            throw Error('La cotización no informa impacto de precio.');
        if (impact > config.maxPriceImpact)
            throw new ApiError('Impacto de precio superior al límite configurado. No se solicitará firma.', 400, 'PRICE_IMPACT');
        const bytes = from64(q.transaction), inspection = await inspect(bytes, 'mainnet', owner);
        let expires = Date.now() + 25000;
        if (q.expireAt) {
            const ts = Date.parse(q.expireAt);
            if (Number.isFinite(ts))
                expires = Math.min(expires, ts);
        }
        if (expires <= Date.now() + 2000)
            throw new ApiError('La cotización venció durante la revisión. Volvé a cotizar.', 410, 'EXPIRED');
        const fees = {};
        for (const k of ['signatureFeeLamports', 'prioritizationFeeLamports', 'rentFeeLamports']) {
            const v = Number(q[k] ?? 0);
            fees[k] = Number(assertLamports(v));
        }
        const estimatedNetwork = Math.max(fees.signatureFeeLamports + fees.prioritizationFeeLamports, Number(inspection.networkFeeLamports));
        const feeNum = estimatedNetwork + fees.rentFeeLamports;
        const actualPayer = parseTransaction(bytes).keys[0];
        const ownerCosts = (actualPayer === owner ? estimatedNetwork : 0) + ((!q.rentFeePayer || q.rentFeePayer === owner) ? fees.rentFeeLamports : 0);
        if (await balance(owner) < (inputMint === MINT.SOL ? BigInt(amount) : 0n) + BigInt(Math.max(0, ownerCosts)))
            throw new ApiError('Falta SOL para el importe y los costos estimados de red.', 400, 'INSUFFICIENT_GAS');
        return putPlan({ bytes, owner, kind: 'swap', order: q, lastValidBlockHeight: q.lastValidBlockHeight, expires, inspection, summary: { title: 'Swap', inputMint, outputMint, inputSymbol: b.inputSymbol === input.symbol ? b.inputSymbol : input.symbol, outputSymbol: output.symbol, inputAmount: decimal(amount, input.decimals), outputAmount: decimal(q.outAmount, output.decimals), minimumReceived: decimal(q.otherAmountThreshold, output.decimals), slippageBps: q.slippageBps, priceImpact: impact, router: q.router, providerFeeBps: q.feeBps ?? null, platformFeeAmount: q.platformFee?.amount ?? null, feeMint: q.feeMint ?? q.platformFee?.feeMint ?? null, estimatedCostsLamports: feeNum, ownerCostsLamports: ownerCosts, pulpFeeBps: config.swapFeeBps ? null : 0, requestedPulpFeeBps: config.swapFeeBps || 0, referralApplied: config.swapFeeBps ? 'not-independently-confirmed' : false, gasless: !!q.gasless, route: (q.routePlan || []).map(r => String(r.swapInfo?.label || q.router)).join(' → ') } });
    }
    async function prepareTransfer(b, owner) {
        await up.checkNetwork();
        const destination = address(b.destination);
        if (destination === owner)
            throw Error('El destino es tu misma wallet.');
        const mint = address(b.mint || MINT.SOL), info = await tokenInfo(mint), amount = units(b.amount, info.decimals);
        const block = await up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }]);
        let bytes, rent = 0n;
        if (mint === MINT.SOL) {
            await ensureBalance(owner, mint, amount);
            bytes = transferSol(owner, destination, amount, block.value.blockhash);
        }
        else {
            if (info.program !== PROGRAM.token)
                throw Error('Los envíos de Token-2022 con extensiones no están habilitados en esta beta. Usá tu wallet.');
            const source = await sourceAccount(owner, mint, amount);
            bytes = transferToken({ owner, destination, mint, source: source.account, amount, decimals: info.decimals, blockhash: block.value.blockhash });
            const dest = await up.rpc('getAccountInfo', [ata(destination, mint), { encoding: 'base64' }]);
            if (!dest.value)
                rent = assertLamports(await up.rpc('getMinimumBalanceForRentExemption', [165]));
        }
        const inspection = await inspect(bytes, config.network, owner);
        const cost = BigInt(inspection.networkFeeLamports) + rent;
        if (await balance(owner) < cost + (mint === MINT.SOL ? amount : 0n))
            throw new ApiError('SOL insuficiente para importe y costos.', 400, 'INSUFFICIENT_GAS');
        return putPlan({ bytes, owner, kind: 'transfer', lastValidBlockHeight: block.value.lastValidBlockHeight, inspection, summary: { title: 'Enviar ' + info.symbol, destination, mint, symbol: info.symbol, amount: decimal(amount, info.decimals), estimatedCostsLamports: cost.toString() } });
    }
    async function prepareMint(b, owner) {
        await up.checkNetwork();
        const name = text(b.name, 32), symbol = text(b.symbol, 10).toUpperCase();
        if (symbol === 'PULP')
            throw new ApiError('La emisión oficial PULP está bloqueada en esta entrega por decisión del proyecto.', 403, 'TOKEN_NOT_TO_DEPLOY');
        if (!/^[A-Z0-9]{2,10}$/.test(symbol))
            throw Error('Ticker: de 2 a 10 letras o números.');
        const uri = b.uri ? safeHttps(b.uri) : '';
        if (b.uri && !uri)
            throw Error('La metadata debe tener una URI HTTPS pública.');
        const decimals = integer(b.decimals ?? 6, 0, 9), supply = String(b.supply), fixed = b.fixed !== false;
        units(supply, decimals);
        const [block, rent, ataRent, metadataRent] = await Promise.all([up.rpc('getLatestBlockhash', [{ commitment: 'confirmed' }]), up.rpc('getMinimumBalanceForRentExemption', [82]), up.rpc('getMinimumBalanceForRentExemption', [165]), uri ? up.rpc('getMinimumBalanceForRentExemption', [679]) : Promise.resolve(0)]);
        const result = buildMint({ owner, name, symbol, uri, supply, decimals, fixed, blockhash: block.value.blockhash, rent: assertLamports(rent) });
        const inspection = await inspect(result.bytes, config.network, owner);
        const cost = assertLamports(rent) + assertLamports(ataRent) + assertLamports(metadataRent) + BigInt(inspection.networkFeeLamports);
        if (await balance(owner) < cost)
            throw new ApiError('SOL insuficiente para crear el mint y las cuentas.', 400, 'INSUFFICIENT_GAS');
        return putPlan({ bytes: result.bytes, owner, kind: 'mint', lastValidBlockHeight: block.value.lastValidBlockHeight, inspection, summary: { title: 'Crear ' + name, name, symbol, mint: result.mint, tokenAccount: result.tokenAccount, supply, decimals, fixed, freezeAuthority: null, metadata: result.metadata, uri, estimatedCostsLamports: cost.toString(), recipient: owner } });
    }
    async function earnTokens() {
        if (config.network !== 'mainnet')
            return [];
        const r = await up.jup('/lend/v1/earn/tokens', null, 60000);
        if (!Array.isArray(r))
            throw Error('Formato de mercados Earn no reconocido.');
        return r.filter(t => t.assetAddress || t.address).map(t => ({ ...t, mint: address(t.assetAddress || t.address), decimals: integer(t.asset?.decimals ?? t.decimals, 0, 18), symbol: String(t.asset?.symbol || t.symbol || 'Token').slice(0, 12), rawRate: String(t.totalRate ?? ''), rate: /^\d+$/.test(String(t.totalRate)) && Number.isSafeInteger(Number(t.totalRate)) ? Number(t.totalRate) / 10000 : null }));
    }
    async function earnPositions(owner) {
        if (config.network !== 'mainnet')
            return [];
        const r = await up.jup('/lend/v1/earn/positions?users=' + owner, null, 15000);
        if (!Array.isArray(r))
            throw Error('Formato de posiciones Earn no reconocido.');
        return r.filter(p => p.ownerAddress === owner);
    }
    async function prepareEarn(b, owner) {
        if (config.network !== 'mainnet')
            throw new ApiError('Earn requiere Mainnet.', 400);
        await up.checkNetwork();
        const action = b.action;
        if (!['deposit', 'withdraw'].includes(action))
            throw Error('Acción Earn inválida.');
        const mint = address(b.mint), token = (await earnTokens()).find(t => t.mint === mint);
        if (!token)
            throw Error('Activo no disponible en Jupiter Lend.');
        const info = await tokenInfo(mint), fMint = address(token.address);
        const fInfo = await tokenInfo(fMint);
        if (info.program !== PROGRAM.token || fInfo.program !== PROGRAM.token)
            throw Error('Este mercado usa una extensión no admitida por el inspector de la beta. Usá Jupiter Lend para operar.');
        const amount = units(b.amount, info.decimals).toString();
        if (action === 'deposit')
            await ensureBalance(owner, mint, amount);
        else {
            const positions = await earnPositions(owner), p = positions.find(p => [mint, fMint].includes(p.token?.address || p.token?.id));
            if (!p || safeAmount(p.underlyingAssets) < BigInt(amount))
                throw new ApiError('El retiro excede tu posición.', 400, 'INSUFFICIENT_POSITION');
        }
        const r = await up.jup('/lend/v1/earn/' + action, { asset: mint, signer: owner, amount });
        const bytes = from64(r.transaction);
        const parsed = parseTransaction(bytes);
        if (parsed.required !== 1 || parsed.keys[0] !== owner)
            throw Error('Firmantes inesperados en Earn.');
        const inspection = await inspect(bytes, config.network, owner);
        validateEarn(bytes, inspection.resolvedKeys, { owner, mint, fMint, action, amount, tokenProgram: info.program });
        const reserve = assertLamports(await up.rpc('getMinimumBalanceForRentExemption', [165])) * 2n;
        const cost = BigInt(inspection.networkFeeLamports) + reserve;
        if (await balance(owner) < cost + (mint === MINT.SOL && action === 'deposit' ? BigInt(amount) : 0n))
            throw new ApiError('Reservá SOL para las comisiones y posibles cuentas de Earn.', 400, 'INSUFFICIENT_GAS');
        return putPlan({ bytes, owner, kind: 'earn-' + action, lastValidBlockHeight: null, inspection, summary: { title: action === 'deposit' ? 'Depositar en Jupiter Lend' : 'Retirar de Jupiter Lend', mint, symbol: token.symbol, amount: decimal(amount, token.decimals), rate: token.rate, provider: 'Jupiter Lend', estimatedCostsLamports: cost.toString(), costNote: 'Incluye reserva conservadora de dos cuentas; se paga solo lo necesario.', risks: 'Contratos, liquidez de retiro, tasas variables y riesgo del activo. La simulación no garantiza seguridad.' } });
    }
    async function confirmRow(row) {
        if (!row.signature)
            return row;
        const statuses = await up.rpc('getSignatureStatuses', [[row.signature], { searchTransactionHistory: true }], row.network);
        const s = statuses.value?.[0];
        if (s?.err) {
            row.status = 'failed';
            row.error = JSON.stringify(s.err);
            row.slot = s.slot;
        }
        else if (['confirmed', 'finalized'].includes(s?.confirmationStatus)) {
            row.status = s.confirmationStatus;
            row.slot = s.slot;
            row.confirmedAt = Date.now();
        }
        else if (s) {
            row.status = 'submitted';
        }
        else if (row.lastValidBlockHeight) {
            const height = await up.rpc('getBlockHeight', [{ commitment: 'confirmed' }], row.network);
            if (Number(height) > Number(row.lastValidBlockHeight) + 20)
                row.status = 'unresolved';
        }
        row.lastCheckedAt = Date.now();
        await saveHistory();
        return row;
    }
    async function submit(b, owner) {
        const p = plans.get(b.id);
        const prior = history.find(h => h.id === b.id && h.owner === owner);
        if (prior)
            return { transaction: prior, alreadySubmitted: true };
        if (!p || p.owner !== owner)
            throw new ApiError('No existe la operación para esta cuenta.', 404);
        if (p.state !== 'prepared')
            throw new ApiError('La operación ya está siendo procesada.', 409, 'DUPLICATE');
        if (p.expires < Date.now())
            throw new ApiError('Cotización o preparación vencida. No se envió la firma.', 410, 'EXPIRED');
        if (p.revision !== revision || p.network !== config.network)
            throw new ApiError('Cambió la configuración o la red. Prepará la operación nuevamente.', 409, 'CONFIG_CHANGED');
        if (b.ack !== true)
            throw Error('Falta confirmar la revisión.');
        const signed = from64(b.transaction);
        const t = assertSignedMatches(from64(p.bytes), signed, owner);
        const ownerIndex = t.keys.slice(0, t.required).indexOf(owner);
        if (!verifyEd25519(owner, t.message, t.signatures[ownerIndex]))
            throw new ApiError('Firma criptográfica inválida.', 400, 'BAD_SIGNATURE');
        p.state = 'checking';
        try {
            await up.checkNetwork(p.network);
            if (p.expires < Date.now())
                throw new ApiError('La operación venció. No se envió.', 410, 'EXPIRED');
            if (p.lastValidBlockHeight && Number(await up.rpc('getBlockHeight', [{ commitment: 'confirmed' }], p.network)) > Number(p.lastValidBlockHeight))
                throw new ApiError('Blockhash vencido. No se envió.', 410, 'EXPIRED');
            const valid = await up.rpc('isBlockhashValid', [t.blockhash, { commitment: 'confirmed' }], p.network);
            if (!valid?.value)
                throw new ApiError('Blockhash vencido. No se envió.', 410, 'EXPIRED');
        }
        catch (e) {
            p.state = 'prepared';
            throw e;
        }
        const sig0 = t.signatures[0].some(x => x !== 0) ? b58encode(t.signatures[0]) : null;
        const row = { id: p.id, owner, network: p.network, kind: p.kind, summary: p.summary, signature: sig0, status: 'submitting', createdAt: Date.now(), lastValidBlockHeight: p.lastValidBlockHeight || null, messageHash: digest(t.message), providerRequestId: p.order?.requestId || null };
        p.state = 'submitted';
        await addHistory(row);
        try {
            if (p.order) {
                const r = await up.jup('/swap/v2/execute', { signedTransaction: to64(signed), requestId: p.order.requestId, ...(p.lastValidBlockHeight ? { lastValidBlockHeight: String(p.lastValidBlockHeight) } : {}) });
                if (r.signature) {
                    signature(r.signature);
                    if (sig0 && r.signature !== sig0)
                        throw Error('El proveedor devolvió una firma diferente.');
                    row.signature = r.signature;
                }
                row.providerStatus = r.status || null;
                if (r.status === 'Failed') {
                    row.status = 'provider-rejected';
                    row.error = String(r.error || 'El proveedor rechazó la ejecución.').slice(0, 200);
                }
                else
                    row.status = 'submitted';
            }
            else {
                const sig = await up.rpc('sendTransaction', [to64(signed), { encoding: 'base64', skipPreflight: false, maxRetries: 2, preflightCommitment: 'confirmed' }], p.network);
                signature(sig);
                if (sig0 && sig !== sig0)
                    throw Error('El RPC devolvió una firma diferente.');
                row.signature = sig;
                row.status = 'submitted';
            }
        }
        catch (e) {
            row.status = 'unknown';
            row.error = e.message;
        }
        await saveHistory();
        if (row.signature) {
            try {
                await confirmRow(row);
            }
            catch {
                row.checkError = 'No se pudo consultar la confirmación. No repitas la operación.';
            }
        }
        return { transaction: row };
    }
    async function request(route, b = {}, ctx = {}) {
        const auth = () => requireAuth(ctx), owner = () => auth().owner;
        for (const m of [challenges, voteChallenges, sessions, plans])
            for (const [id, v] of m)
                if (v.expires < Date.now() - 600000)
                    m.delete(id);
        if (route === 'boot')
            return { csrf, config: settingsPublic(), session: session(ctx.cookie) ? { owner: session(ctx.cookie).owner } : null, catalog: CATALOG };
        if (route === 'health')
            return { ok: true, app: 'pulp-beta', version: '4.2.0-beta.1', network: config.network };
        if (route === 'settings')
            return settingsPublic();
        if (route === 'settings/save') {
            if (publicOrigin && owner() !== adminWallet)
                throw new ApiError('Solo el operador puede modificar proveedores.', 403, 'FORBIDDEN');
            if (activeOperations)
                throw new ApiError('Hay una operación en preparación o envío. Esperá a que termine antes de cambiar la configuración.', 409, 'BUSY');
            const next = { ...config };
            if (b.network !== undefined && !['mainnet', 'devnet'].includes(b.network))
                throw Error('Red inválida.');
            if (b.network)
                next.network = b.network;
            for (const k of ['mainnetRpc', 'devnetRpc'])
                if (b[k])
                    next[k] = safeRpcUrl(b[k]);
            if (b.jupiterKey !== undefined) {
                if (typeof b.jupiterKey !== 'string' || b.jupiterKey.length > 512 || /[\r\n]/.test(b.jupiterKey))
                    throw Error('API key inválida.');
                next.jupiterKey = b.jupiterKey.trim();
            }
            if (b.swapFeeBps !== undefined) {
                const f = integer(b.swapFeeBps, 0, 255);
                if (f > 0 && f < 50)
                    throw Error('Jupiter requiere 50–255 bps cuando hay referido.');
                next.swapFeeBps = f;
            }
            if (b.referralAccount !== undefined)
                next.referralAccount = b.referralAccount ? address(b.referralAccount) : '';
            if (next.swapFeeBps && !next.referralAccount)
                throw Error('Falta la cuenta de referido de Jupiter.');
            for (const k of ['pulpMint', 'treasury'])
                if (b[k] !== undefined)
                    next[k] = b[k] ? address(b[k]) : '';
            if (b.governanceUrl !== undefined)
                next.governanceUrl = safeProtocolUrl(b.governanceUrl, ['app.realms.today', 'v2.squads.so', 'app.squads.so']);
            if (b.slippageBps !== undefined)
                next.slippageBps = integer(b.slippageBps, 1, 300);
            if (b.maxPriceImpact !== undefined) {
                const x = Number(b.maxPriceImpact);
                if (!Number.isFinite(x) || x < .1 || x > 5)
                    throw Error('Impacto máximo: 0,1 a 5%.');
                next.maxPriceImpact = x;
            }
            await write('config', next);
            Object.assign(config, next);
            revision++;
            up.invalidate();
            return settingsPublic();
        }
        if (route === 'connections') {
            const result = { checkedAt: Date.now(), network: config.network };
            await Promise.all([up.checkNetwork().then(() => result.rpc = { ok: true, detail: 'Red verificada' }).catch(e => result.rpc = { ok: false, detail: e.message }), up.jup('/price/v3?ids=' + MINT.SOL, null, 20000).then(v => { result.jupiter = { ok: !!v[MINT.SOL], detail: v[MINT.SOL] ? 'Precio recibido' : 'Sin precio en la respuesta' }; }).catch(e => result.jupiter = { ok: false, detail: e.message })]);
            return result;
        }
        if (route === 'auth/challenge') {
            const a = address(b.address);
            const id = randomId(), nonce = randomId(), issued = new Date(), expires = Date.now() + 300000;
            const message = `Pulp · Acceso a tu cuenta\nDominio: ${ctx.origin}\nWallet: ${a}\nURI: ${ctx.origin}\nNonce: ${nonce}\nEmitido: ${issued.toISOString()}\nVence: ${new Date(expires).toISOString()}\n\nEsta firma inicia sesión. No autoriza transacciones, retiros ni gasto de fondos.`;
            challenges.set(id, { owner: a, message, expires, origin: ctx.origin });
            return { id, message, expires };
        }
        if (route === 'auth/verify') {
            const c = unexpired(challenges, b.id);
            challenges.delete(b.id);
            const msg = from64(b.message), sig = from64(b.signature);
            if (c.origin !== ctx.origin || !same(msg, new TextEncoder().encode(c.message)) || !verifyEd25519(c.owner, msg, sig))
                throw new ApiError('La firma de acceso no es válida.', 401, 'BAD_SIGNATURE');
            const id = randomId();
            sessions.set(id, { owner: c.owner, expires: Date.now() + sessionMs, createdAt: Date.now(), userAgent: String(ctx.userAgent || 'Navegador').slice(0, 160) });
            return { owner: c.owner, _cookie: `pulp_session=${id}; HttpOnly; SameSite=Strict; Path=/; ${publicOrigin ? 'Secure; ' : ''}Max-Age=${sessionMs / 1000}` };
        }
        if (route === 'auth/logout') {
            const s = session(ctx.cookie);
            if (s)
                sessions.delete(s.id);
            return { _cookie: 'pulp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0', ok: true };
        }
        if (route === 'account')
            return { owner: owner(), workspace: await workspace(owner()) };
        if (route === 'account/save') {
            const a = owner(), w = cleanWorkspace(b);
            await write('account-' + a, w);
            return { owner: a, workspace: w };
        }
        if (route === 'portfolio') {
            const who = b.address || owner(), data = await portfolio(who);
            if (!b.address) {
                const name = 'snapshots-' + data.network + '-' + address(who);
                try {
                    const previous = await read(name, []), next = appendSnapshot(previous, data);
                    if (JSON.stringify(previous) !== JSON.stringify(next))
                        await write(name, next);
                }
                catch {
                    data.warnings.push('No se pudo guardar la muestra local de valor. Los balances consultados no cambiaron.');
                }
            }
            return data;
        }
        if (route === 'portfolio/history') {
            const who = owner(), points = appendSnapshot(await read('snapshots-' + config.network + '-' + address(who), []), null);
            return { owner: who, network: config.network, points, source: 'Muestras observadas localmente; no PnL', observedAt: Date.now() };
        }
        if (route === 'market') {
            if (config.network !== 'mainnet')
                return { tokens: [], observedAt: Date.now(), network: 'devnet', source: 'Sin precios fiat en Devnet' };
            const list = [...CATALOG, ...(config.pulpMint ? [{ mint: config.pulpMint, symbol: 'PULP', name: 'Pulp', decimals: null }] : [])], p = await prices(list.map(t => t.mint));
            return { tokens: list.map(t => ({ ...t, ...(p[t.mint] || {}), usdPrice: p[t.mint]?.usdPrice ?? null })), observedAt: Date.now(), source: 'Jupiter Price v3' };
        }
        if (route === 'tokens/search') {
            const q = text(String(b.q || ''), 150);
            if (config.network === 'devnet') {
                try {
                    return [await tokenInfo(q)];
                }
                catch {
                    return CATALOG.slice(0, 1);
                }
            }
            const result = await up.jup('/tokens/v2/search?query=' + encodeURIComponent(q), null, 30000);
            if (!Array.isArray(result))
                throw Error('El proveedor no devolvió una lista de tokens.');
            return result.slice(0, 30).map(t => ({ ...t, mint: address(t.id), decimals: integer(t.decimals, 0, 18) }));
        }
        if (route === 'wallet/history') {
            const a = address(b.address || owner());
            await up.checkNetwork();
            return { owner: a, items: await up.rpc('getSignaturesForAddress', [a, { limit: integer(b.limit || 20, 1, 50), commitment: 'confirmed' }]), observedAt: Date.now() };
        }
        if (route === 'transaction') {
            signature(b.signature);
            const r = await up.rpc('getTransaction', [b.signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);
            return { transaction: r, network: config.network };
        }
        if (route === 'swap/prepare')
            return prepareSwap(b, owner());
        if (route === 'transfer/prepare')
            return prepareTransfer(b, owner());
        if (route === 'launch/prepare')
            return prepareMint(b, owner());
        if (route === 'launch/discover') {
            const r = await up.dex('/token-profiles/latest/v1');
            if (!Array.isArray(r))
                throw Error('Lista de proyectos inválida.');
            return { projects: r.filter(p => p.chainId === 'solana').slice(0, 30).map(p => ({ ...p, tokenAddress: address(p.tokenAddress), url: safeHttps(p.url), icon: safeHttps(p.icon) })), observedAt: Date.now(), source: 'DEX Screener · perfiles publicados, no selección editorial' };
        }
        if (route === 'token/details') {
            const mint = address(b.mint || config.pulpMint), info = await tokenInfo(mint);
            let pairs = [], warning = '';
            if (config.network === 'mainnet') {
                try {
                    const r = await up.dex('/tokens/v1/solana/' + mint);
                    pairs = Array.isArray(r) ? r : [];
                }
                catch (e) {
                    warning = e.message;
                }
            }
            return { info, pairs, warning, observedAt: Date.now() };
        }
        if (route === 'earn/markets')
            return { markets: await earnTokens(), observedAt: Date.now(), source: 'Jupiter Lend API' };
        if (route === 'earn/positions')
            return { positions: await earnPositions(address(b.address || owner())), observedAt: Date.now() };
        if (route === 'earn/prepare')
            return prepareEarn(b, owner());
        if (route === 'tx/submit')
            return submit(b, owner());
        if (route === 'tx/history') {
            const a = owner();
            return { items: history.filter(r => r.owner === a && r.network === config.network).map(r => ({ ...r })), network: config.network };
        }
        if (route === 'tx/status') {
            const a = owner(), row = history.find(h => h.id === b.id && h.owner === a);
            if (!row)
                throw new ApiError('Operación no encontrada.', 404);
            return { transaction: await confirmRow(row) };
        }
        if (route === 'governance/list')
            return { proposals, externalUrl: config.governanceUrl, model: 'Consultas firmadas no vinculantes. Una wallet, un voto. Sin control de tesorería.' };
        if (route === 'governance/create') {
            const a = owner(), title = text(b.title, 100), description = text(b.description, 2000), days = integer(b.days || 7, 1, 30);
            const p = { id: randomId(), title, description, author: a, createdAt: Date.now(), endsAt: Date.now() + days * 86400000, votes: [] };
            proposals.unshift(p);
            proposals = proposals.slice(0, 100);
            await write('proposals', proposals);
            return p;
        }
        if (route === 'governance/challenge') {
            const a = owner(), p = proposals.find(p => p.id === b.id);
            if (!p || p.endsAt < Date.now())
                throw Error('La consulta no está abierta.');
            if (!['yes', 'no', 'abstain'].includes(b.choice))
                throw Error('Opción inválida.');
            if (p.votes.some(v => v.owner === a))
                throw Error('Esta wallet ya votó.');
            const id = randomId(), expires = Date.now() + 300000, message = `Pulp · Consulta no vinculante\nDominio: ${ctx.origin}\nPropuesta: ${p.id}\nTítulo: ${p.title}\nContenido SHA256: ${digest(p.description)}\nWallet: ${a}\nVoto: ${b.choice}\nNonce: ${id}\nVence: ${new Date(expires).toISOString()}\nEsta firma no mueve fondos ni ejecuta decisiones on-chain.`;
            voteChallenges.set(id, { owner: a, proposal: p.id, choice: b.choice, expires, message });
            return { id, message };
        }
        if (route === 'governance/vote') {
            const a = owner(), v = unexpired(voteChallenges, b.id);
            voteChallenges.delete(b.id);
            const p = proposals.find(p => p.id === v.proposal);
            if (v.owner !== a || !p || p.endsAt < Date.now() || p.votes.some(v => v.owner === a))
                throw Error('Voto inválido o ya registrado.');
            const m = from64(b.message), sig = from64(b.signature);
            if (!same(m, new TextEncoder().encode(v.message)) || !verifyEd25519(a, m, sig))
                throw Error('Firma de voto inválida.');
            p.votes.push({ owner: a, choice: v.choice, message: v.message, signature: b.signature, at: Date.now() });
            await write('proposals', proposals);
            return p;
        }
        throw new ApiError('Ruta no disponible.', 404, 'NOT_FOUND');
    }
    async function guardedRequest(route, b, ctx) {
        await ready;
        if (process.env.PULP_PAUSE_FINANCIAL === '1' && (route.endsWith('/prepare') || route === 'tx/submit'))
            throw new ApiError('Operaciones pausadas por el operador. Consultas e historial siguen disponibles.', 503, 'PAUSED');
        if (route === 'settings/save')
            return request(route, b, ctx);
        activeOperations++;
        try {
            return await request(route, b, ctx);
        }
        finally {
            activeOperations--;
        }
    }
    function listSessions(who, ctx) { const current = session(ctx.cookie)?.id; return [...sessions].filter(([id, v]) => v.owner === who && v.expires > Date.now()).map(([id, v]) => ({ id: digest(id).slice(0, 24), createdAt: v.createdAt, expires: v.expires, userAgent: v.userAgent, current: id === current })); }
    function revokeSessions(who, id, ctx) { const current = session(ctx.cookie)?.id; for (const [key, v] of sessions) {
        if (v.owner === who && (id === 'all' || id === 'others' && key !== current || digest(key).slice(0, 24) === id))
            sessions.delete(key);
    } }
    return { listSessions, revokeSessions, request: guardedRequest, csrf, config, up, session, requireAuth, settingsPublic, plans, ready, store, portfolio, tokenInfo, inspect, putPlan, prepareSwap, history: () => history };
}
