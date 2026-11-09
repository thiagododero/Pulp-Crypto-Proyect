import { api } from './api.mjs';
import { Wallets } from './wallet.mjs';
import { MINT, PROGRAM, address, units, decimal, from64, to64, explorer, parseTransaction, b58encode } from '/shared/solana.mjs';
import { NAV, e, I, B, short, usd, date, button, link, ext, miniExt, addr, notice, empty, panel, definition, field, checkbox, skeleton, statusBadge, shell, renderPage, tokenDetails } from './views.mjs';
import { V4_NAV, renderV4, extendV4, v4Bindings } from './v4-ui.mjs';
NAV.push(...V4_NAV);
const $ = s => document.querySelector(s), U = window.PulpUI;
const safeStored = (key, fallback) => {
    try {
        return localStorage.getItem(key) || fallback;
    }
    catch {
        return fallback;
    }
};
const wallets = new Wallets(), resources = new Map();
const initialWorkspace = () => ({ profile: { name: '' }, watched: [], favorites: [], drafts: [] });
const freshLaunch = () => ({ id: '', name: '', symbol: '', supply: '', decimals: 6, description: '', image: '', uri: '', fixed: true });
const S = { route: 'home', theme: safeStored('pulp:white:theme', 'light'), density: safeStored('pulp:density', 'comfortable'), config: { network: 'mainnet', slippageBps: 50, maxPriceImpact: 3 }, owner: null, workspace: initialWorkspace(), tokens: [{ mint: MINT.SOL, symbol: 'SOL', name: 'Solana', decimals: 9 }, { mint: MINT.USDC, symbol: 'USDC', name: 'USD Coin', decimals: 6 }], busy: '', menu: false, modal: null, setupDismissed: safeStored('pulp:white:setup-dismissed', '0') === '1', kitTab: 'overview', portfolioData: null, tradeTab: 'swap', launchTab: 'discover', watchAddress: '', forms: { watch: { address: '' }, swap: { amount: '', inputMint: MINT.SOL, outputMint: MINT.USDC, slippageBps: 50 }, launch: freshLaunch(), settings: {}, profile: { name: '' }, kit: { label: '', checked: false }, send: { mint: MINT.SOL, destination: '', amount: '' }, earn: { mint: '', action: 'deposit', amount: '' }, proposal: { title: '', description: '', days: 7 }, label: { label: '' }, picker: { q: '' }, search: { q: '' } } };
let epoch = 0, renderQueued = false, previousFocus = null, clock = null, booted = false, txPolling = false, txPollCount = 0;
function routeFromHash() { const r = location.hash.replace(/^#\/?/, '').split('?')[0]; return NAV.some(n => n[0] === r) ? r : 'home'; }
function applyTheme() { if (!['light', 'dark'].includes(S.theme))
    S.theme = 'light'; document.documentElement.dataset.theme = S.theme; document.body.dataset.density = S.density; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', S.theme === 'light' ? '#ffffff' : '#1d1a27'); }
function scheduleRender() {
    if (renderQueued)
        return;
    renderQueued = true;
    queueMicrotask(() => { renderQueued = false; render(); });
}
function R(key, route, params = {}) {
    const signature = JSON.stringify([route, params, S.owner, S.config.revision]);
    const previous = resources.get(key);
    if (previous?.signature === signature)
        return previous;
    const entry = { status: 'loading', signature, route, params, epoch };
    resources.set(key, entry);
    api(route, params).then(data => {
        if (resources.get(key) !== entry)
            return;
        entry.status = 'ready';
        entry.data = data;
        if (key === 'portfolio') {
            S.portfolioData = data;
            resources.delete('portfolioHistory');
        }
        scheduleRender();
    }).catch(err => {
        if (resources.get(key) !== entry)
            return;
        entry.status = 'error';
        entry.error = err.message;
        entry.code = err.code;
        scheduleRender();
    });
    return entry;
}
function cached(key) { return resources.get(key)?.data; }
function clearData() { epoch++; resources.clear(); S.portfolioData = null; }
function resetSettings() { S.forms.settings = { network: S.config.network, mainnetRpc: '', devnetRpc: '', jupiterKey: '', clearKey: false, pulpMint: S.config.pulpMint || '', treasury: S.config.treasury || '', governanceUrl: S.config.governanceUrl || '', slippageBps: S.config.slippageBps, maxPriceImpact: S.config.maxPriceImpact }; }
function captureFocus() {
    const a = document.activeElement;
    if (!a || a === document.body)
        return null;
    return { id: a.id, selector: a.dataset.action ? `[data-action="${CSS.escape(a.dataset.action)}"]` : null, start: a.selectionStart, end: a.selectionEnd, scroll: $('[class="b-dialog-body"]')?.scrollTop || 0 };
}
function restoreFocus(f) {
    if (!f)
        return;
    const target = f.id ? document.getElementById(f.id) : f.selector ? document.querySelector((S.modal ? '#dialog-root ' : '#app ') + f.selector) : null;
    if (target && !target.disabled) {
        target.focus({ preventScroll: true });
        if (typeof f.start === 'number' && target.setSelectionRange)
            try {
                target.setSelectionRange(f.start, f.end);
            }
            catch { }
    }
    const d = $('.b-dialog-body');
    if (d)
        d.scrollTop = f.scroll;
}
function render() {
    if (!booted)
        return;
    const focus = captureFocus(), hadMenu = !!document.querySelector('.b-sidebar.open');
    applyTheme();
    document.title = (NAV.find(x => x[0] === S.route)?.[1] || 'Inicio') + ' · Pulp';
    const page = renderV4(S, R) ?? renderPage(S.route === 'wallet-inspector' ? { ...S, route: 'intelligence' } : S, R);
    $('#app').innerHTML = shell(S, extendV4(S, R, page));
    renderDialog();
    $('#app').inert = !!S.modal;
    if (S.menu && innerWidth <= 800) {
        document.querySelector('.b-main').inert = true;
        const sidebar = document.querySelector('.b-sidebar');
        sidebar.setAttribute('role', 'dialog');
        sidebar.setAttribute('aria-modal', 'true');
        if (!hadMenu)
            requestAnimationFrame(() => sidebar.querySelector('a')?.focus());
    }
    restoreFocus(focus);
    updateClock();
    if (hadMenu && !S.menu)
        requestAnimationFrame(() => document.querySelector('.b-mobile-menu')?.focus());
}
function toast(message, error = false) { const node = document.createElement('div'); node.className = 'b-toast' + (error ? ' error' : ''); node.innerHTML = I(error ? 'warning' : 'circleCheck') + `<span>${e(message)}</span>`; $('#toast-root').appendChild(node); setTimeout(() => node.remove(), error ? 11000 : 5000); }
function openModal(kind, props = {}) {
    if (!S.modal)
        previousFocus = document.activeElement;
    S.modal = { kind, ...props };
    if (kind === 'tx')
        txPollCount = 0;
    renderDialog();
    $('#app').inert = true;
    queueMicrotask(() => { $('#dialog-root input:not([type=checkbox]), #dialog-root button, #dialog-root [tabindex]')?.focus(); });
}
function closeModal(force = false) {
    if (S.busy && !force)
        return;
    S.modal = null;
    $('#dialog-root').innerHTML = '';
    $('#app').inert = false;
    if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    previousFocus = null;
}
function dialog(title, body, footer = '', wide = false) { return `<div class="b-overlay" data-overlay><section class="b-dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="b-dialog-head"><h2 id="dialog-title">${e(title)}</h2><button class="b-icbtn" data-action="close-modal" aria-label="Cerrar" ${S.busy ? 'disabled' : ''}>${I('close')}</button></header><div class="b-dialog-body">${body}</div>${footer ? `<footer class="b-dialog-foot">${footer}</footer>` : ''}</section></div>`; }
const cancel = () => button('Cancelar', 'close-modal', '', 'secondary', S.busy ? 'disabled' : '');
const disabled = () => S.busy ? 'disabled' : '';
function download(name, data, type = 'application/json') { const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type }); const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
function updateClock() {
    const node = $('#quote-countdown');
    if (!node || S.modal?.kind !== 'review')
        return;
    const expired = Date.now() >= S.modal.plan.expires;
    node.textContent = expired ? 'La operación venció. Cerrá y volvé a prepararla.' : `Revisá y firmá dentro de ${Math.max(0, Math.ceil((S.modal.plan.expires - Date.now()) / 1000))} s.`;
    node.classList.toggle('expired', expired);
    const btn = $('[data-action="sign-plan"]');
    if (btn)
        btn.disabled = expired || !S.modal.ack || !!S.busy;
}
function reviewContent(plan) {
    const s = plan.summary, network = plan.network === 'mainnet' ? 'Solana Mainnet · fondos reales' : 'Solana Devnet · fondos de prueba';
    let rows = [];
    if (plan.kind === 'swap')
        rows = [['Pagás', `${e(s.inputAmount)} ${e(s.inputSymbol)}`], ['Recibís (cotización)', `${e(s.outputAmount)} ${e(s.outputSymbol)}`], ['Mínimo recibido', `<strong>${e(s.minimumReceived)} ${e(s.outputSymbol)}</strong>`], ['Deslizamiento máximo', e((s.slippageBps / 100).toFixed(2) + '%')], ['Impacto de precio', e(s.priceImpact.toFixed(3) + '%')], ['Router / ruta', e(s.route || s.router || 'Jupiter')], ['Comisión del proveedor', s.providerFeeBps == null ? 'Consultar en wallet' : e((s.providerFeeBps / 100).toFixed(2) + '%')], ['Comisión Pulp solicitada', s.requestedPulpFeeBps ? e((s.requestedPulpFeeBps / 100).toFixed(2) + '% · confirmar aplicación en el proveedor') : 'Sin comisión propia configurada']];
    else if (plan.kind === 'transfer')
        rows = [['Importe', `${e(s.amount)} ${e(s.symbol)}`], ['Destino', `<span class="b-mono">${e(s.destination)}</span>`], ['Mint', `<span class="b-mono">${e(s.mint)}</span>`]];
    else if (plan.kind === 'mint')
        rows = [['Nombre / ticker', e(s.name + ' / ' + s.symbol)], ['Suministro', e(s.supply)], ['Decimales', e(s.decimals)], ['Nuevo mint', `<span class="b-mono">${e(s.mint)}</span>`], ['Recibe todo el suministro', `<span class="b-mono">${e(s.recipient)}</span>`], ['Emisión futura', s.fixed ? 'Revocada en esta transacción' : 'La wallet conserva la autoridad'], ['Congelación', 'No habilitada'], ['Metadata', s.metadata ? 'Inmutable · URI pública' : 'No incluida · nombre/logo no se registran on-chain']];
    else if (plan.kind === 'liquidity' || plan.kind === 'pool-create') {
        rows = [['Operación', e(s.title)], ['Pool', e(s.pool)], ['Token A', e(s.mintA)], ['Token B', e(s.mintB)],
            [s.amountBounds === 'minimum' ? 'Mínimo recibido A' : 'Máximo aportado A', e(s.amountA)],
            [s.amountBounds === 'minimum' ? 'Mínimo recibido B' : 'Máximo aportado B', e(s.amountB)],
            ['Participaciones LP', e(s.lpAmount || s.lpMint)], ['Riesgos', e(s.risks)]];
    }
    else if (plan.kind.startsWith('squads-')) {
        rows = [['Acción on-chain', e(s.title)], ['Multifirma', e(s.multisig)], ['Propuesta', e(s.proposal)], ['Índice', e(s.index)], ['Quórum', e(s.threshold)], ['Demora de ejecución', e(s.timeLock + ' segundos')], ['Riesgos', e(s.risks)]];
        if (s.destination)
            rows.push(['Beneficiario de tesorería', e(s.destination)], ['Importe', e(s.amount + ' ' + s.symbol)], ['Vault', e(s.vault)]);
    }
    else if (plan.kind.startsWith('launchlab-')) {
        rows = Object.entries(s).filter(([k, v]) => v != null && typeof v !== 'object' && !['estimatedCostsLamports'].includes(k)).map(([k, v]) => [e(k), e(String(v))]);
    }
    else if (plan.kind.startsWith('earn-') || plan.kind === 'deposit' || plan.kind === 'withdraw') {
        rows = [['Importe', e(s.amount + ' ' + s.symbol)], ['Protocolo', e(s.provider)], ['Tasa actual variable', s.rate == null ? 'No disponible' : e((s.rate * 100).toFixed(2) + '%')], ['Riesgos', e(s.risks)]];
    }
    else {
        rows = Object.entries(s).filter(([k, v]) => v != null && typeof v !== 'object').map(([k, v]) => [e(k), e(String(v))]);
    }
    if (s.invoiceId)
        rows.push(['Factura', e(s.invoiceId)], ['Concepto', e(s.purpose)]);
    rows.push(['Red', e(network)], ['Wallet que autoriza', `<span class="b-mono">${e(plan.owner)}</span>`], ['Costo / reserva estimada', `${e(decimal(BigInt(s.estimatedCostsLamports || plan.inspection.networkFeeLamports || 0), 9))} SOL`]);
    if (s.ownerCostsLamports != null)
        rows.push(['Parte estimada a tu cargo', `${e(decimal(BigInt(s.ownerCostsLamports), 9))} SOL`]);
    return `${notice(plan.network === 'mainnet' ? '<strong>Esta operación mueve fondos reales.</strong> Revisá también la pantalla de tu wallet antes de aprobar.' : 'Esta operación usa fondos de prueba. No tiene valor monetario.', plan.network === 'mainnet' ? 'warning' : '')}${definition(rows)}${s.costNote ? `<p class="b-footnote">${e(s.costNote)}</p>` : ''}<div class="b-separator"></div>${notice('La simulación RPC fue satisfactoria. Esto <strong>no garantiza seguridad ni rentabilidad</strong>; existen riesgos del proveedor y del protocolo.')}<details><summary>Programas y huella del mensaje</summary><pre class="b-code">${e(plan.inspection.programs.join('\n'))}\n\nSHA256: ${e(plan.messageHash)}</pre></details><label class="b-check"><input id="review-ack" type="checkbox" ${S.modal.ack ? 'checked' : ''} ${disabled()}><span>Revisé importe, red, destinatario y costos. Entiendo que la operación puede ser irreversible.</span></label><div class="b-countdown" id="quote-countdown"></div>`;
}
function renderDialog() {
    if (!S.modal) {
        $('#dialog-root').innerHTML = '';
        return;
    }
    const m = S.modal;
    let html = '';
    if (m.kind === 'wallets') {
        const list = wallets.list();
        html = dialog('Conectar tu wallet', `<div class="p-wallet-intro"><img src="assets/white/pulp-hero.webp" alt=""><div><span class="p-overline">TU ESPACIO, TU CONTROL</span><h3>Tu wallet.<br>Tu universo.</h3></div></div>` + notice('Pulp solicita una conexión y luego una firma de acceso. Nunca una frase semilla.') + (list.length ? list.map((w, i) => `<button class="b-wallet-option" data-action="connect-provider" data-index="${i}" ${disabled()}><span class="b-iconbox">${I('wallet')}</span><strong>${e(w.name)}</strong>${I('chevron')}</button>`).join('') : empty('No se detectaron wallets', 'Instalá o habilitá una wallet Solana compatible con Wallet Standard y recargá esta página.', 'wallet', ext('Sitio oficial de Phantom', 'https://phantom.com/'))) + `<p class="b-footnote">Chrome/Brave con la extensión habilitada es la ruta de prueba recomendada. En un teléfono se requiere un sitio HTTPS y el navegador de la wallet; localhost de tu Mac no es accesible desde el teléfono.</p>`, cancel());
    }
    else if (m.kind === 'guide') {
        html = dialog('Bienvenido a Pulp', `<div class="p-wallet-intro"><img src="assets/white/pulp-hero.webp" alt="" width="100" height="100"><div><span class="p-overline">PRIMEROS PASOS</span><h3>Tu espacio Web3.<br>A tu manera.</h3><p>Sin contraseñas ni claves privadas compartidas.</p></div></div><div class="w-checklist"><div><i>1</i><section><strong>Conectá una wallet Solana</strong><p>La firma de acceso verifica tu cuenta. No mueve fondos ni concede permiso para gastarlos.</p>${S.owner ? B('Cuenta verificada', 'green') : button('Conectar wallet', 'connect', 'wallet', 'secondary')}</section></div><div><i>2</i><section><strong>Configurá tus conexiones</strong><p>Guardá tu API key de Jupiter y verificá el RPC en Ajustes. Para pruebas de envío y creación de tokens, elegí Devnet.</p>${button('Abrir ajustes', 'go', 'settings', 'secondary', 'data-route="settings"')}</section></div><div><i>3</i><section><strong>Revisá antes de operar</strong><p>Chequeá la red, el mint, los importes y todos los costos. Ninguna operación se firma automáticamente.</p>${button('Ver estado de servicios', 'go', 'shield', 'secondary', 'data-route="status"')}</section></div></div>${notice('La configuración, tus listas y el historial se guardan en esta instalación. Este paquete no despliega contratos, no crea liquidez ni aloja un servicio público.')}`, button('Empezar a explorar', 'close-modal', 'arrow', 'primary'), true);
    }
    else if (m.kind === 'account') {
        html = dialog('Tu cuenta Pulp', `<div class="b-token-feature"><img src="assets/brand/pulp-icon.svg" alt=""><div><h2 style="font-size:20px">${e(S.workspace.profile.name || 'Cuenta Web3')}</h2><p>${wallets.account?.address === S.owner ? 'Wallet conectada' : 'Sesión verificada · wallet sin conectar'}</p></div></div><div class="b-separator"></div>${addr(S.owner, S.config.network)}<p class="b-risk-text">Tu perfil y tus listas están asociados a esta dirección y guardados en esta instalación. Cada operación necesita una nueva autorización de la wallet.</p><div class="b-actions">${button('Recibir', 'receive', 'download', 'secondary')}${button('Enviar', 'send', 'arrow-up', 'secondary', `data-mint="${MINT.SOL}"`)}${button('Reconectar wallet', 'connect', 'wallet', 'secondary')}</div>`, button('Cerrar sesión', 'disconnect', 'logout', 'secondary'));
    }
    else if (m.kind === 'receive') {
        html = dialog('Recibir en tu wallet', notice(`Red seleccionada: <strong>Solana ${S.config.network === 'mainnet' ? 'Mainnet' : 'Devnet'}</strong>. Verificá la red y el token antes de transferir.`) + `<div class="b-review-emphasis"><span class="b-iconbox" style="margin:auto">${I('wallet')}</span><p class="b-mono">${e(S.owner)}</p>${button('Copiar dirección', 'copy', 'copy', 'primary', `data-value="${e(S.owner)}"`)}</div>${ext('Ver en Solana Explorer', explorer(S.owner, 'address', S.config.network))}`, button('Cerrar', 'close-modal', '', 'secondary'));
    }
    else if (m.kind === 'label') {
        html = dialog('Guardar wallet', `<form class="b-form" data-form="label">${field('label', 'label', 'Etiqueta', S.forms.label.label, { attrs: 'required maxlength="40"' })}<div class="b-mono">${e(S.watchAddress)}</div><button type="submit" class="btn btn-primary" ${disabled()}>Guardar en watchlist</button></form>`, cancel());
    }
    else if (m.kind === 'picker') {
        const q = S.forms.picker.q, ready = resources.get('tokenSearch');
        const rows = q.trim() ? ready?.status === 'ready' ? ready.data : [] : S.tokens;
        html = dialog('Elegir token', notice('Confirmá la dirección del contrato. Un símbolo o un logo no garantizan que sea el activo correcto.', 'warning') + `<form class="b-inline-form" data-form="picker">${field('picker', 'q', 'Buscar por nombre o mint', q, { placeholder: 'SOL, USDC o dirección…', attrs: 'autocomplete="off"' })}<button type="submit" class="btn btn-secondary">Buscar</button></form>` + (ready?.status === 'loading' ? skeleton() : ready?.status === 'error' ? notice(e(ready.error), 'error') : '') + `<div class="b-token-results">${rows.map((t, i) => `<button class="b-token-result" data-action="choose-token" data-mint="${e(t.mint || t.id)}">${U.tokenIcon(String(t.symbol || 'Token'))}<span class="b-row-main"><strong>${e(t.symbol || 'Token')} · ${e(t.name || '')}</strong><small>${e(t.mint || t.id)}</small></span>${t.isVerified ? B('Proveedor: verificado', 'green') : I('chevron')}</button>`).join('')}</div>`, cancel(), true);
    }
    else if (m.kind === 'send') {
        const f = S.forms.send, asset = cached('portfolio')?.assets.find(a => a.mint === f.mint), symbol = asset?.symbol || 'SOL';
        html = dialog('Enviar ' + symbol, notice('Los envíos no se pueden deshacer. Revisá la dirección completa y empezá por un importe pequeño.', 'warning') + `<form class="b-form" data-form="send"><p class="b-meta">Balance consultado: ${e(asset?.amount || 'Consultando')} ${e(symbol)}</p>${field('send', 'destination', 'Dirección de destino', f.destination, { attrs: 'required autocomplete="off" spellcheck="false"', placeholder: 'Wallet Solana' })}${field('send', 'amount', 'Importe', f.amount, { attrs: 'required inputmode="decimal"', placeholder: '0.00' })}<button class="btn btn-primary b-wide" type="submit" ${disabled()}>Revisar envío</button></form>`, cancel());
    }
    else if (m.kind === 'earn') {
        const f = S.forms.earn, t = cached('earnMarkets')?.markets.find(t => t.mint === f.mint);
        html = dialog(f.action === 'deposit' ? 'Depositar en Jupiter Lend' : 'Retirar de Jupiter Lend', notice('Rendimiento variable, contratos externos y riesgo de liquidez. El retiro puede fallar si el mercado no tiene fondos disponibles.', 'warning') + `<form class="b-form" data-form="earn"><strong>${e(t?.symbol || short(f.mint))}</strong><div class="b-mono">${e(f.mint)}</div>${field('earn', 'amount', 'Importe en el activo subyacente', f.amount, { attrs: 'required inputmode="decimal"', placeholder: '0.00' })}<button class="btn btn-primary b-wide" type="submit" ${disabled()}>Revisar ${f.action === 'deposit' ? 'depósito' : 'retiro'}</button></form>`, cancel());
    }
    else if (m.kind === 'review') {
        html = dialog(m.plan.summary.title, reviewContent(m.plan), cancel() + button('Firmar y enviar', 'sign-plan', 'shield', 'primary', 'disabled'), true);
    }
    else if (m.kind === 'tx') {
        const t = m.transaction;
        html = dialog('Estado de la operación', `<div class="b-review-emphasis">${statusBadge(t.status)}<h3>${e(t.summary?.title || 'Operación')}</h3><span>${e(date(t.createdAt))}</span></div>${['unknown', 'unresolved', 'submitting', 'submitted', 'provider-rejected'].includes(t.status) ? notice('<strong>No repitas la operación sin verificar su estado.</strong> Una demora o un error del proveedor no demuestran que no se haya ejecutado.', 'warning') : ''}${t.error ? notice(e(t.error), 'error') : ''}${t.providerRequestId ? `<p class="b-meta">Jupiter request ID: ${e(t.providerRequestId)}</p>` : ''}${t.signature ? `${definition([['Firma', `<span class="b-mono">${e(t.signature)}</span>`], ['Red', e(t.network)], ['Slot confirmado', e(t.slot ?? 'Pendiente')]])}<div class="b-actions" style="margin-top:18px">${ext('Ver transacción', explorer(t.signature, 'tx', t.network))}${button('Copiar firma', 'copy', 'copy', 'secondary', `data-value="${e(t.signature)}"`)}</div>` : notice('Todavía no hay una firma de transacción disponible. Consultá nuevamente el historial.', 'warning')}${t.kind === 'mint' && ['confirmed', 'finalized'].includes(t.status) ? `<div class="b-separator"></div><strong>Nuevo token</strong><p class="b-mono">${e(t.summary.mint)}</p>${button('Configurar como token PULP', 'use-pulp', 'coin', 'secondary', `data-mint="${e(t.summary.mint)}"`)}<p class="b-footnote">Esto solo configura el contrato que muestra Pulp. No crea liquidez, distribución ni vesting.</p>` : ''}`, button('Actualizar estado', 'tx-check', 'refresh', 'secondary', `data-id="${e(t.id)}" ${disabled()}`) + button('Cerrar', 'close-modal', '', 'primary'));
    }
    else if (m.kind === 'token') {
        const r = R('detail:' + m.mint, 'token/details', { mint: m.mint });
        html = dialog('Detalles del token', r.status === 'ready' ? tokenDetails(r.data, S.config.network) : r.status === 'error' ? notice(e(r.error), 'error') : skeleton(), button('Usar como salida del swap', 'swap-token', 'swap', 'secondary', `data-mint="${e(m.mint)}"`) + cancel(), true);
    }
    else if (m.kind === 'proposal') {
        const f = S.forms.proposal;
        html = dialog('Crear consulta no vinculante', notice('Esta consulta queda en tu instalación. No ejecuta contratos ni distribuye fondos.') + `<form class="b-form" data-form="proposal">${field('proposal', 'title', 'Título', f.title, { attrs: 'required maxlength="100"' })}${field('proposal', 'description', 'Propuesta', f.description, { textarea: true, attrs: 'required maxlength="2000"' })}${field('proposal', 'days', 'Duración en días', f.days, { type: 'number', attrs: 'required min="1" max="30"' })}<button class="btn btn-primary b-wide" type="submit" ${disabled()}>Publicar consulta local</button></form>`, cancel());
    }
    else if (m.kind === 'vote') {
        html = dialog('Revisar voto firmado', notice('Firma de mensaje. <strong>No es una transacción financiera.</strong> Este voto no controla la tesorería.') + `<pre class="b-code">${e(m.challenge.message)}</pre>`, cancel() + button('Firmar voto', 'sign-vote', 'vote', 'primary', disabled()), true);
    }
    else if (m.kind === 'search') {
        const q = S.forms.search.q.toLowerCase();
        html = dialog('Buscar en Pulp', `<form data-form="search" class="b-form">${field('search', 'q', 'Sección o herramienta', S.forms.search.q, { placeholder: 'Swap, portfolio, token…', attrs: 'autocomplete="off"' })}</form><div class="b-token-results">${NAV.filter(n => !q || n[1].toLowerCase().includes(q) || n[0].includes(q)).map(([r, n, i]) => `<button class="b-token-result" data-action="go" data-route="${r}">${I(i)}<strong>${n}</strong></button>`).join('')}</div>`, cancel());
    }
    else if (m.kind === 'kit') {
        html = dialog('Modal del sistema de diseño', notice('Ejemplo visual. No representa una operación ni una solicitud de firma.') + definition([['Estado', B('Ejemplo', 'purple')], ['Red', 'No aplicable'], ['Acción', 'Cerrar con Escape o con el botón']]), button('Cerrar ejemplo', 'close-modal', '', 'primary'));
    }
    else if (m.kind === 'import') {
        html = dialog('Restaurar respaldo', notice('Se reemplazan perfil, watchlist, favoritos y borradores de esta wallet en esta instalación. El historial de transacciones no se modifica.', 'warning') + definition([['Wallet del respaldo', e(short(m.backup.owner || ''))], ['Wallet actual', e(short(S.owner))], ['Borradores', e(m.backup.workspace?.drafts?.length || 0)], ['Wallets seguidas', e(m.backup.workspace?.watched?.length || 0)]]), cancel() + button('Reemplazar datos de cuenta', 'restore-account', 'document', 'primary', disabled()));
    }
    $('#dialog-root').innerHTML = html;
    updateClock();
}
async function run(label, fn) {
    if (S.busy)
        return;
    S.busy = label;
    scheduleRender();
    try {
        return await fn();
    }
    catch (err) {
        if (err.code === 'AUTH_REQUIRED') {
            toast('La sesión venció. Reconectá tu wallet.', true);
            S.owner = null;
            S.workspace = initialWorkspace();
            clearData();
        }
        else
            toast(err.message || 'Operación cancelada.', true);
    }
    finally {
        S.busy = '';
        scheduleRender();
    }
}
async function loadAccount() {
    if (!S.owner)
        return;
    const result = await api('account');
    S.workspace = result.workspace;
    S.forms.profile.name = S.workspace.profile.name;
}
function needAccount() {
    if (!S.owner) {
        openModal('wallets');
        return false;
    }
    return true;
}
function needSigner() {
    if (!needAccount())
        return false;
    if (wallets.account?.address !== S.owner) {
        openModal('wallets');
        toast('Reconectá la wallet para autorizar operaciones.');
        return false;
    }
    return true;
}
async function saveWorkspace() { const r = await api('account/save', S.workspace, true); S.workspace = r.workspace; }
async function connectProvider(index) {
    const before = S.owner;
    const a = await wallets.connect(Number(index), S.config.network);
    const c = await api('auth/challenge', { address: a.address }, true);
    const signed = await wallets.message(c.message, a.address, S.config.network);
    const result = await api('auth/verify', { id: c.id, message: to64(signed.signedMessage), signature: to64(signed.signature) }, true);
    S.owner = result.owner;
    if (before !== S.owner)
        clearData();
    await loadAccount();
    closeModal(true);
    toast('Cuenta verificada. Los fondos siguen bajo control de tu wallet.');
}
async function disconnect() { await api('auth/logout', {}, true).catch(() => { }); S.owner = null; S.workspace = initialWorkspace(); S.forms.profile.name = ''; clearData(); closeModal(true); await wallets.disconnect(); toast('Sesión cerrada.'); }
async function prepare(route, data) {
    if (!needSigner())
        return;
    const p = await api(route, data, true);
    if (p.owner !== S.owner || p.network !== S.config.network || p.revision !== S.config.revision)
        throw Error('La configuración cambió durante la preparación. Reintentá.');
    openModal('review', { plan: p, ack: false });
}
async function signPlan() {
    const m = S.modal;
    if (m?.kind !== 'review' || !m.ack)
        throw Error('Revisá y aceptá la operación.');
    const p = m.plan;
    if (Date.now() >= p.expires)
        throw Error('La cotización venció. Prepará una nueva operación.');
    const config = await api('settings');
    if (config.revision !== p.revision || config.network !== p.network)
        throw Error('La red o configuración cambiaron. La firma fue bloqueada.');
    const signed = await wallets.sign(from64(p.transaction), p.owner, p.network);
    if (Date.now() >= p.expires)
        throw Error('La operación venció mientras se firmaba. No se envió. Volvé a prepararla.');
    try {
        const r = await api('tx/submit', { id: p.id, transaction: to64(signed), ack: true }, true);
        clearData();
        openModal('tx', { transaction: r.transaction });
        if (['confirmed', 'finalized'].includes(r.transaction.status))
            toast('Confirmación recibida de Solana.');
        else
            toast('Operación registrada. Verificá su estado antes de repetir.');
    }
    catch (err) {
        const parsed = parseTransaction(signed), sig = parsed.signatures[0].some(x => x) ? b58encode(parsed.signatures[0]) : null;
        clearData();
        openModal('tx', { transaction: { id: p.id, kind: p.kind, summary: p.summary, network: p.network, createdAt: Date.now(), signature: sig, status: 'unknown', error: err.message } });
        throw err;
    }
}
function formData(form) {
    const data = { ...S.forms[form.dataset.form] };
    for (const el of form.elements) {
        if (!el.name)
            continue;
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    }
    return data;
}
const handlers = {
    'start-guide': () => openModal('guide'),
    'dismiss-setup': () => { S.setupDismissed = true; try {
        localStorage.setItem('pulp:white:setup-dismissed', '1');
    }
    catch { } },
    'kit-tab': el => { S.kitTab = el.dataset.value; },
    'kit-scroll': el => { const id = el.dataset.target; requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block: 'start' })); },
    'export-diagnostics': () => { const c = S.config; download('Pulp-diagnostico.json', { app: 'Pulp White Edition', version: c.version, exportedAt: new Date().toISOString(), network: c.network, configured: { jupiter: !!c.jupiterKeyConfigured, pulpToken: !!c.pulpMint, treasury: !!c.treasury, governance: !!c.governanceUrl }, checks: cached('connections') || null, scope: 'local-integration-beta', note: 'Sin claves API, URLs RPC privadas ni dirección de wallet.' }); toast('Diagnóstico exportado sin secretos.'); },
    'swap-half': () => { const p = S.portfolioData; if (!p || p.owner !== S.owner || p.network !== S.config.network)
        throw Error('Actualizá el saldo antes de usar esta acción.'); const a = p.assets.find(a => a.mint === S.forms.swap.inputMint && (a.mint !== MINT.SOL || a.native)); if (!a || BigInt(a.raw) < 2n)
        throw Error('Saldo insuficiente para dividirlo.'); S.forms.swap.amount = decimal(BigInt(a.raw) / 2n, a.decimals); },
    'swap-pulp': () => run('Verificando contrato PULP…', async () => { if (!S.config.pulpMint)
        throw Error('Configurá el contrato oficial en Ajustes.'); const d = await api('token/details', { mint: S.config.pulpMint }); const t = { ...d.info, mint: S.config.pulpMint, symbol: 'PULP', name: 'Pulp (contrato configurado)' }; S.tokens = S.tokens.filter(x => x.mint !== t.mint); S.tokens.push(t); S.forms.swap.outputMint = t.mint; toast('Contrato configurado seleccionado. Verificá el mint antes de firmar.'); }),
    menu: () => { S.menu = !S.menu; }, theme: () => {
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        try {
            localStorage.setItem('pulp:white:theme', S.theme);
        }
        catch { }
    }, density: () => {
        S.density = S.density === 'compact' ? 'comfortable' : 'compact';
        try {
            localStorage.setItem('pulp:density', S.density);
        }
        catch { }
    },
    connect: () => openModal('wallets'), 'connect-provider': el => run('Verificando tu cuenta…', () => connectProvider(el.dataset.index)), account: () => S.owner ? openModal('account') : openModal('wallets'), disconnect: () => run('Cerrando sesión…', disconnect),
    'close-modal': () => closeModal(), search: () => openModal('search'), go: el => { closeModal(); location.hash = '#/' + el.dataset.route; }, refresh: () => { clearData(); toast('Actualizando datos de los proveedores…'); }, retry: el => resources.delete(el.dataset.key), copy: el => run('Copiando…', async () => { if (!navigator.clipboard?.writeText)
        throw Error('El navegador no permite copiar. Seleccioná la dirección y copiala manualmente.'); await navigator.clipboard.writeText(el.dataset.value); toast('Copiado.'); }),
    receive: () => {
        if (needAccount())
            openModal('receive');
    }, 'watch-open': el => { S.watchAddress = el.dataset.address; S.forms.watch.address = el.dataset.address; resources.delete('watchedPortfolio'); resources.delete('watchedHistory'); }, 'watch-save': () => {
        if (!needAccount())
            return;
        S.forms.label.label = S.workspace.watched.find(w => w.address === S.watchAddress)?.label || '';
        openModal('label');
    }, 'watch-remove': el => run('Guardando watchlist…', async () => { S.workspace.watched = S.workspace.watched.filter(w => w.address !== el.dataset.address); await saveWorkspace(); toast('Wallet eliminada de tu lista.'); }),
    'trade-tab': el => S.tradeTab = el.dataset.value, 'token-picker': el => { S.forms.picker.q = ''; resources.delete('tokenSearch'); openModal('picker', { side: el.dataset.side }); }, 'choose-token': el => {
        const mint = el.dataset.mint, t = (cached('tokenSearch') || S.tokens).find(t => (t.mint || t.id) === mint);
        if (!t)
            return;
        const normalized = { ...t, mint, decimals: Number(t.decimals) };
        if (!S.tokens.some(t => t.mint === mint))
            S.tokens.push(normalized);
        S.forms.swap[S.modal.side] = mint;
        closeModal();
    }, 'swap-reverse': () => { const f = S.forms.swap; [f.inputMint, f.outputMint] = [f.outputMint, f.inputMint]; },
    'sign-plan': () => run('Esperando firma y confirmación…', signPlan), send: el => {
        if (!needSigner())
            return;
        R('portfolio', 'portfolio');
        S.forms.send = { mint: el.dataset.mint || MINT.SOL, destination: '', amount: '' };
        openModal('send');
    }, 'earn-form': el => {
        if (!needSigner())
            return;
        S.forms.earn = { mint: el.dataset.mint, action: el.dataset.kind, amount: '' };
        openModal('earn');
    },
    'tx-detail': el => {
        const row = cached('txHistory')?.items.find(t => t.id === el.dataset.id);
        if (row)
            openModal('tx', { transaction: row });
    }, 'tx-check': el => run('Consultando estado on-chain…', async () => {
        const r = await api('tx/status', { id: el.dataset.id });
        if (S.modal?.kind === 'tx')
            S.modal.transaction = r.transaction;
        resources.delete('txHistory');
        resources.delete('portfolio');
    }),
    'launch-tab': el => S.launchTab = el.dataset.value, 'new-project': () => { S.forms.launch = freshLaunch(); S.launchTab = 'create'; S.route = 'launchpad'; location.hash = '#/launchpad'; }, 'create-pulp': () => { S.forms.launch = { ...freshLaunch(), name: 'Pulp', symbol: 'PULP' }; S.launchTab = 'create'; location.hash = '#/launchpad'; }, 'metadata': () => {
        const f = S.forms.launch;
        if (!f.name || !f.symbol)
            throw Error('Completá el nombre y ticker para exportar.');
        if (f.image && !(new URL(f.image).protocol === 'https:'))
            throw Error('El logo debe usar HTTPS.');
        download((f.symbol || 'token') + '-metadata.json', { name: f.name, symbol: f.symbol.toUpperCase(), description: f.description, image: f.image || undefined });
        toast('JSON de metadata exportado. Debés alojarlo antes de usar su URI.');
    },
    'save-draft': () => {
        if (!needAccount())
            return;
        return run('Guardando borrador…', async () => { const f = S.forms.launch, id = f.id || crypto.randomUUID(), draft = { ...f, id, createdAt: Date.now() }; S.workspace.drafts = [draft, ...S.workspace.drafts.filter(d => d.id !== id)].slice(0, 50); await saveWorkspace(); S.forms.launch.id = id; toast('Borrador guardado; no se emitió ningún token.'); });
    }, 'edit-draft': el => {
        const d = S.workspace.drafts.find(d => d.id === el.dataset.id);
        if (d) {
            S.forms.launch = { ...freshLaunch(), ...d };
            S.launchTab = 'create';
            window.scrollTo(0, 0);
        }
    }, 'delete-draft': el => run('Eliminando borrador…', async () => { S.workspace.drafts = S.workspace.drafts.filter(d => d.id !== el.dataset.id); await saveWorkspace(); toast('Borrador eliminado.'); }),
    favorite: el => {
        if (!needAccount())
            return;
        return run('Guardando favorito…', async () => { const a = address(el.dataset.address), list = S.workspace.favorites; S.workspace.favorites = list.includes(a) ? list.filter(x => x !== a) : [...list, a].slice(0, 100); await saveWorkspace(); toast('Favoritos actualizados.'); });
    }, 'token-detail': el => openModal('token', { mint: el.dataset.mint }), 'swap-token': el => {
        const mint = el.dataset.mint, detail = cached('detail:' + mint)?.info;
        if (!S.tokens.some(t => t.mint === mint) && detail)
            S.tokens.push(detail);
        S.forms.swap.outputMint = mint;
        S.tradeTab = 'swap';
        closeModal();
        location.hash = '#/trade';
    }, 'use-pulp': el => run('Configurando token PULP…', async () => { S.config = await api('settings/save', { pulpMint: el.dataset.mint }, true); resetSettings(); clearData(); closeModal(true); location.hash = '#/token'; toast('Contrato configurado para la red actual.'); }),
    'proposal-form': () => {
        if (needAccount())
            openModal('proposal');
    }, vote: el => {
        if (!needSigner())
            return;
        return run('Preparando voto…', async () => { const challenge = await api('governance/challenge', { id: el.dataset.id, choice: el.dataset.choice }, true); openModal('vote', { challenge }); });
    }, 'sign-vote': () => run('Esperando firma del voto…', async () => { const c = S.modal.challenge, signed = await wallets.message(c.message, S.owner, S.config.network); await api('governance/vote', { id: c.id, message: to64(signed.signedMessage), signature: to64(signed.signature) }, true); resources.delete('governance'); closeModal(true); toast('Voto firmado y registrado localmente.'); }),
    'export-proposal': el => {
        const p = cached('governance')?.proposals.find(p => p.id === el.dataset.id);
        if (p)
            download('Pulp-consulta-' + p.id.slice(0, 8) + '.json', p);
    }, 'export-history': () => {
        const d = cached('txHistory');
        if (!d)
            throw Error('Esperá a que termine de cargar el historial.');
        download('Pulp-historial-' + S.config.network + '.json', { exportedAt: new Date().toISOString(), owner: S.owner, ...d });
    }, 'export-account': () => download('Pulp-cuenta-' + short(S.owner, 4) + '.json', { format: 'pulp-account-v2', owner: S.owner, exportedAt: new Date().toISOString(), workspace: S.workspace }), 'import-account': () => $('#import-file')?.click(), 'restore-account': () => run('Restaurando cuenta…', async () => {
        const b = S.modal.backup;
        if (b.owner !== S.owner)
            throw Error('El respaldo pertenece a otra wallet. Conectá esa cuenta para restaurarlo.');
        const r = await api('account/save', b.workspace, true);
        S.workspace = r.workspace;
        S.forms.profile.name = S.workspace.profile.name;
        closeModal(true);
        toast('Cuenta restaurada. El historial financiero no cambió.');
    }),
    'export-tokens': () => run('Exportando tokens de diseño…', async () => { const d = await fetch('assets/design-tokens.json').then(r => r.json()); download('Pulp-design-tokens.json', d); }), 'kit-toast': () => toast('Componente de notificación del UI kit.'), 'kit-modal': () => openModal('kit'),
};
const v4UI = v4Bindings({ S, api, run, prepare, clearData, toast, download, needAccount, render: scheduleRender });
Object.assign(handlers, v4UI.actions);
document.addEventListener('click', event => {
    if (event.target.closest('[data-skip]')) {
        event.preventDefault();
        const main = document.querySelector('main');
        if (main) {
            main.tabIndex = -1;
            main.focus();
        }
        return;
    }
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled)
        return;
    const fn = handlers[el.dataset.action];
    if (!fn)
        return;
    event.preventDefault();
    if (S.busy && !['copy', 'theme', 'menu'].includes(el.dataset.action))
        return;
    try {
        Promise.resolve(fn(el)).catch(err => toast(err.message, true)).finally(scheduleRender);
    }
    catch (err) {
        toast(err.message, true);
    }
    scheduleRender();
});
document.addEventListener('input', event => {
    const el = event.target;
    if (el.id === 'review-ack' && S.modal?.kind === 'review') {
        S.modal.ack = el.checked;
        updateClock();
        return;
    }
    const form = el.closest('form[data-form]');
    if (form && el.name) {
        (S.forms[form.dataset.form] ||= Object.create(null))[el.name] = el.type === 'checkbox' ? el.checked : el.value;
        if (form.dataset.form === 'search') {
            const f = captureFocus();
            renderDialog();
            restoreFocus(f);
        }
    }
});
document.addEventListener('change', event => {
    const el = event.target, form = el.closest('form[data-form]');
    if (form && el.name)
        (S.forms[form.dataset.form] ||= Object.create(null))[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.id === 'import-file' && el.files?.[0])
        run('Leyendo respaldo…', async () => {
            const file = el.files[0];
            if (file.size > 120000)
                throw Error('El respaldo es demasiado grande.');
            const b = JSON.parse(await file.text());
            if (b.format !== 'pulp-account-v2' || !b.workspace || b.owner !== S.owner)
                throw Error('Respaldo inválido o perteneciente a otra wallet.');
            openModal('import', { backup: b });
        });
});
document.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form)
        return;
    event.preventDefault();
    const kind = form.dataset.form, f = formData(form);
    S.forms[kind] = f;
    if (kind.startsWith('v4-')) {
        v4UI.onForm(kind, f).catch(err => toast(err.message, true));
        return;
    }
    if (kind === 'watch') {
        try {
            S.watchAddress = address(f.address.trim());
            resources.delete('watchedPortfolio');
            resources.delete('watchedHistory');
            scheduleRender();
        }
        catch (err) {
            toast(err.message, true);
        }
        return;
    }
    if (kind === 'picker') {
        if (!f.q.trim())
            return;
        resources.delete('tokenSearch');
        R('tokenSearch', 'tokens/search', { q: f.q.trim() });
        renderDialog();
        return;
    }
    if (['search', 'kit'].includes(kind))
        return;
    if (kind === 'swap' || kind === 'send' || kind === 'earn' || kind === 'launch') {
        if (!needSigner())
            return;
        const routes = { swap: 'swap/prepare', send: 'transfer/prepare', earn: 'earn/prepare', launch: 'launch/prepare' };
        run('Preparando y simulando la operación…', () => prepare(routes[kind], f));
        return;
    }
    if (kind === 'label')
        run('Guardando watchlist…', async () => {
            if (!S.owner)
                throw Error('Conectá tu wallet.');
            const list = S.workspace.watched.filter(w => w.address !== S.watchAddress);
            S.workspace.watched = [{ address: S.watchAddress, label: f.label }, ...list].slice(0, 30);
            await saveWorkspace();
            closeModal(true);
            toast('Wallet guardada.');
        });
    else if (kind === 'profile')
        run('Guardando perfil…', async () => { S.workspace.profile.name = f.name; await saveWorkspace(); toast('Perfil guardado.'); });
    else if (kind === 'proposal')
        run('Publicando consulta local…', async () => { await api('governance/create', f, true); resources.delete('governance'); S.forms.proposal = { title: '', description: '', days: 7 }; closeModal(true); toast('Consulta publicada en esta instalación.'); });
    else if (kind === 'settings')
        run('Guardando conexiones…', async () => {
            const data = { ...f };
            if (!data.jupiterKey && !data.clearKey)
                delete data.jupiterKey;
            if (data.clearKey)
                data.jupiterKey = '';
            delete data.clearKey;
            if (!data.mainnetRpc)
                delete data.mainnetRpc;
            if (!data.devnetRpc)
                delete data.devnetRpc;
            S.config = await api('settings/save', data, true);
            S.forms.swap.slippageBps = S.config.slippageBps;
            resetSettings();
            clearData();
            toast('Configuración guardada. Las nuevas operaciones usarán esta red.');
        });
});
document.addEventListener('keydown', event => {
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]:not([disabled])')], i = tabs.indexOf(tab);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault();
        tabs[next].click();
        queueMicrotask(() => document.querySelector(`[data-action="${tab.dataset.action}"][data-value="${tabs[next].dataset.value}"]`)?.focus());
        return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!S.busy)
            openModal('search');
    }
    if (event.key === 'Escape') {
        if (S.modal)
            closeModal();
        else if (S.menu) {
            S.menu = false;
            scheduleRender();
        }
    }
    if (event.key === 'Tab' && S.menu && !S.modal && innerWidth <= 800) {
        const els = [...document.querySelectorAll('.b-sidebar a[href], .b-sidebar button, .b-sidebar summary')].filter(n => n.offsetParent !== null), first = els[0], last = els.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    }
    if (event.key === 'Tab' && S.modal) {
        const elements = [...document.querySelectorAll('#dialog-root button:not([disabled]), #dialog-root a[href], #dialog-root input:not([disabled]), #dialog-root select, #dialog-root textarea, #dialog-root summary')].filter(n => n.offsetParent !== null);
        const first = elements[0], last = elements.at(-1);
        if (!first)
            return;
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});
window.addEventListener('resize', () => { if (innerWidth > 800 && S.menu) {
    S.menu = false;
    scheduleRender();
} });
window.addEventListener('hashchange', () => {
    const route = routeFromHash();
    if (route === S.route)
        return;
    S.route = route;
    S.menu = false;
    closeModal();
    window.scrollTo(0, 0);
    scheduleRender();
});
wallets.addEventListener('list', () => {
    if (S.modal?.kind === 'wallets' && !S.busy)
        renderDialog();
});
wallets.addEventListener('accountchange', () => {
    if (S.owner && !wallets.account) {
        S.owner = null;
        S.workspace = initialWorkspace();
        api('auth/logout', {}, true).catch(() => { });
        clearData();
        closeModal(true);
        toast('La cuenta de la wallet cambió. Volvé a verificar tu acceso.', true);
        scheduleRender();
    }
});
async function boot() {
    try {
        const boot = await api('boot');
        S.config = boot.config;
        S.owner = boot.session?.owner || null;
        S.tokens = boot.catalog.map(t => ({ ...t, mint: t.mint || t.id }));
        S.forms.swap.slippageBps = S.config.slippageBps;
        resetSettings();
        S.route = routeFromHash();
        if (S.owner)
            await loadAccount();
        booted = true;
        render();
        clock = setInterval(updateClock, 1000);
        setInterval(async () => { const modal = S.modal; if (document.hidden || S.busy || txPolling || modal?.kind !== 'tx' || !['submitted', 'unknown', 'submitting', 'unresolved'].includes(modal.transaction.status) || !modal.transaction.signature || txPollCount >= 12)
            return; txPolling = true; txPollCount++; try {
            const result = await api('tx/status', { id: modal.transaction.id });
            if (S.modal === modal) {
                modal.transaction = result.transaction;
                resources.delete('txHistory');
                renderDialog();
            }
        }
        catch { /* Keep the last known state. The user may manually refresh. */ }
        finally {
            txPolling = false;
        } }, 8000);
        setInterval(() => {
            if (document.hidden || S.busy || S.modal || !S.owner)
                return;
            for (const k of ['portfolio', 'portfolioHistory', 'txHistory', 'earnPositions'])
                resources.delete(k);
            scheduleRender();
        }, 45000);
    }
    catch (err) {
        $('#app').innerHTML = `<div class="b-boot"><img src="assets/brand/pulp-icon.svg" alt="Pulp" width="60"><h1>No se pudo abrir Pulp.</h1><p>${e(err.message)}</p><p>Abrí <strong>Abrir.command</strong> y recargá esta página.</p><a class="btn btn-primary" href="/">Volver a intentar</a></div>`;
    }
}
applyTheme();
boot();
