/* Componentes compartidos por la app y el UI Kit. HTML/SVG semántico, sin dependencias. */
(function (root) {
    'use strict';
    const paths = {
        home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
        radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/><circle cx="12" cy="12" r="1"/>',
        swap: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
        rocket: '<path d="M14 4c3-2 6-1 6-1s1 3-1 6l-7 7-5-5 7-7Z"/><path d="m8 10-4 1-1 5 5-1m5 0-1 5 5-1 1-5M5 18l-2 3m4-2-2 2"/><circle cx="15" cy="8" r="2"/>',
        sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm8-1v4m-2-2h4M3 18v4m-2-2h4"/>',
        chart: '<path d="M4 4v16h17M8 15v-4m5 4V7m5 8V4"/>',
        coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 8H11a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9.5M12 6v12"/>',
        vote: '<path d="m9 3 7 7-3 3-7-7 3-3ZM7.5 10.5 3 15m13-7 2-2 3 3-2 2M12 19h9v3h-9"/>',
        components: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
        settings: '<path d="m10 3-.7 2.5-2.2 1.2-2.5-.6-2 3.5 1.8 1.9v2.5l-1.8 1.8 2 3.5 2.5-.6 2.2 1.3.7 2.4h4l.7-2.4 2.2-1.3 2.5.6 2-3.5-1.8-1.8v-2.5l1.8-1.9-2-3.5-2.5.6-2.2-1.2L14 3Z"/><circle cx="12" cy="12" r="3"/>',
        search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
        arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        'arrow-left':'<path d="M20 12H4m6-6-6 6 6 6"/>',
        'arrow-down':'<path d="M6 6v12h12M6 18 18 6"/>',
        'arrow-up': '<path d="M6 18 18 6M6 6h12v12"/>',
        chevron: '<path d="m9 5 7 7-7 7"/>',
        down: '<path d="m6 9 6 6 6-6"/>',
        close: '<path d="m6 6 12 12M6 18 18 6"/>',
        plus: '<path d="M12 4v16M4 12h16"/>',
        minus: '<path d="M4 12h16"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/>',
        warning: '<path d="M10.3 4a2 2 0 0 1 3.4 0l8 14a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3Z"/><path d="M12 9v5m0 3v.5"/>',
        wallet: '<path d="M20 7V4H6a3 3 0 0 0 0 6h15v10H6a3 3 0 0 1-3-3V7"/><path d="M21 12h-6v5h6m-3-2.5h.1"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0v7l-2 3h16l-2-3V8ZM10 21h4"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1.5 1.5m13 13L20 20M20 4l-1.5 1.5m-13 13L4 20"/>',
        moon: '<path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/>',
        external: '<path d="M14 3h7v7m0-7L10 14M11 4H4v16h16v-7"/>',
        copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
        layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
        activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
        shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
        users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
        star: '<path d="m12 2 3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5 1.2-7-5-5 7-1L12 2Z"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
        refresh: '<path d="M20 8V3l-3 3a8 8 0 0 0-13 6m0 4v5l3-3a8 8 0 0 0 13-6M20 8h-5M4 16h5"/>',
        lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
        leaf: '<path d="M20 3C6 2 2 8 5 14c3 6 15 6 15-11ZM4 21l11-12"/>',
        wrench: '<path d="M21 6a6 6 0 0 1-8 7l-8 8-3-3 8-8a6 6 0 0 1 7-8l-4 4 3 3Z"/>',
        box: '<path d="m12 3 9 5v9l-9 5-9-5V8Zm-9 5 9 5 9-5m-9 5v9M7.5 5.5l9 5"/>',
        orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><ellipse cx="12" cy="12" rx="5" ry="11" transform="rotate(-35 12 12)"/>',
        document: '<path d="M5 3h9l5 5v13H5V3Zm9 0v6h5M8 13h8m-8 4h6"/>',
        code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
        logout: '<path d="M9 4H4v16h5m4-8h9m-4-4 4 4-4 4"/>',
        play: '<path d="m7 3 14 9-14 9V3Z"/>',
        pause: '<path d="M8 4v16M16 4v16"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
        palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a4 4 0 0 0 3-4 9 9 0 0 0-9-7Z"/><circle cx="7" cy="9" r="1"/><circle cx="11" cy="6" r="1"/><circle cx="16" cy="7" r="1"/>',
        trash: '<path d="M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3m-5 4v7m4-7v7"/>',
        link: '<path d="m10 14 4-4m-6 1L5 14a4 4 0 0 0 5 6l4-4m0-3 4-4a4 4 0 0 0-6-5l-3 3"/>',
        history: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7m2-3v5l4 2"/>',
        heart: '<path d="M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 2 10 8 16 6-6 13-11 8-16Z"/>'
    };
    const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function icon(name, cls = '') { return `<svg class="icon ${esc(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`; }
    function logo() { return '<span class="brand"><img src="assets/brand/pulp-icon.svg" alt="" width="34" height="34"><span>Pulp<span class="brand-period">.</span></span></span>'; }
    function money(n, d = 2) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: d, minimumFractionDigits: d }).format(Number(n) || 0); }
    function num(n, d = 0) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(Number(n) || 0); }
    function compact(n) { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n) || 0); }
    function price(n) { return money(n, n < .001 ? 6 : n < 1 ? 4 : 2); }
    function pct(n, d = 1) { return `${Number(n) > 0 ? '+' : ''}${Number(n).toFixed(d)}%`; }
    function badge(text, tone = 'purple', dot = false) { return `<span class="badge badge-${esc(tone)}">${dot ? '<span class="dot"></span>' : ''}${esc(text)}</span>`; }
    function tokenIcon(s, small = false) { return `<span class="token-icon ${esc(s.toLowerCase())} ${small ? 'small' : ''}">${s === 'PULP' ? '<img src="assets/brand/pulp-icon.svg" alt="">' : s === 'SOL' ? '≋' : s === 'USDC' ? '$' : esc(s.slice(0, 1))}</span>`; }
    function avatar(w, i = 0) { return `<span class="avatar avatar-${i % 6}">${esc(w.initials || w.name.slice(0, 2))}</span>`; }
    function btn(text, action, ic = '', variant = 'primary', extra = '') { return `<button type="button" class="btn btn-${variant}" data-action="${esc(action)}" ${extra}>${ic ? icon(ic, 'sm') : ''}${esc(text)}</button>`; }
    function link(text, route, ic = '', variant = 'primary') { return `<a class="btn btn-${variant}" href="#/${esc(route)}">${ic ? icon(ic, 'sm') : ''}${esc(text)}</a>`; }
    function metric(label, value, detail = '', ic = 'chart', change = null) { return `<div class="card metric"><div class="metric-top"><span>${esc(label)}</span>${icon(ic, 'sm')}</div><div class="metric-value">${esc(value)}</div><div class="metric-bottom">${change !== null ? badge(pct(change), change >= 0 ? 'green' : 'red') : ''}<span>${esc(detail)}</span></div></div>`; }
    let chartId = 0;
    function chart(values, { height = 180, color = 'var(--brand-600)', labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'], mini = false, comparison = false, caption = 'Serie de ejemplo, sin cotización real.' } = {}) {
        const vals = values.map(Number), id = 'chart-' + (++chartId), W = 600, H = height, P = mini ? 3 : 18, bottom = mini ? 2 : 28;
        const min = Math.min(...vals) * .94, max = Math.max(...vals) * 1.06, range = max - min || 1;
        const pts = vals.map((v, i) => [P + i / (vals.length - 1) * (W - 2 * P), H - bottom - (v - min) / range * (H - bottom - P)]);
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p.map(x => x.toFixed(2)).join(' ')).join(' ');
        const fill = line + ` L ${W - P} ${H - bottom} L ${P} ${H - bottom} Z`;
        const grid = mini ? '' : [.15, .42, .69].map(t => `<line x1="${P}" y1="${P + t * (H - bottom - P)}" x2="${W - P}" y2="${P + t * (H - bottom - P)}" stroke="var(--chart-grid)" stroke-dasharray="3 5"/>`).join('');
        const axes = mini ? '' : labels.map((v, i) => `<text x="${P + i / (labels.length - 1) * (W - 2 * P)}" y="${H - 4}" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}" fill="var(--text-tertiary)" font-size="10" font-family="var(--font)">${esc(v)}</text>`).join('');
        const comparisonPath = comparison ? `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + `${p[0]} ${Math.min(H - bottom - 3, p[1] * .75 + H * .21)}`).join(' ')}" fill="none" stroke="#a99cbb" stroke-dasharray="5 5" stroke-width="2"/>` : '';
        return `<div class="chart ${mini ? 'mini-chart' : ''}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}" ${mini ? 'preserveAspectRatio="none"' : ''}><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".16"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${fill}" fill="url(#${id})"/>${comparisonPath}<path d="${line}" fill="none" stroke="${color}" stroke-width="${mini ? 4 : 2.6}" stroke-linejoin="round" stroke-linecap="round"/>${mini ? '' : `<circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="4.5" fill="${color}" stroke="var(--surface)" stroke-width="3"/>`}${axes}</svg></div>`;
    }
    function segmented(items, current, action, attrs = '') { return `<div class="segmented" role="tablist" aria-label="Selector de vista">${items.map(i => `<button role="tab" aria-selected="${i === current}" data-action="${esc(action)}" data-value="${esc(i)}" ${attrs}>${esc(i)}</button>`).join('')}</div>`; }
    function empty(title, text, ic = 'box', button = '') { return `<div class="empty-state">${icon(ic)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${button}</div>`; }
    function activity(items, limit = 5) { return items.length ? items.slice(0, limit).map(a => `<div class="list-row"><span class="list-icon">${icon(({ swap: 'swap', deposit: 'layers', withdraw: 'wallet', vote: 'vote', project: 'rocket', plan: 'radar' })[a.type] || 'activity')}</span><div class="list-main"><strong>${esc(a.title)}</strong><p>${esc(a.detail)}</p></div><div class="list-value"><span class="badge badge-outline">Local</span><div class="tiny">${new Date(a.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div></div></div>`).join('') : empty('Todo empieza con un movimiento', 'Tus simulaciones van a aparecer acá. No se registran operaciones en blockchain.', 'activity'); }
    root.PulpUI = { esc, icon, icons: Object.keys(paths), logo, money, num, compact, price, pct, badge, tokenIcon, avatar, btn, link, metric, chart, segmented, empty, activity };
})(window);
