
const A='assets/white/'; const icon='assets/brand/pulp-icon.svg';
const pages=[
 ['home','⌂','Inicio','Visión general del ecosistema','pulp-hero.webp'],
 ['intelligence','◉','Intelligence','Explorá wallets públicas, estrategias y actividad on-chain','pulp-analyst.webp'],
 ['swap','⇄','Pulp Swap','Cotizaciones, rutas de intercambio y revisión de operaciones','pulp-trader.webp'],
 ['earn','◈','Trade & Earn','Protocolos, posiciones y liquidez DeFi','pulp-coins.webp'],
 ['launchpad','♧','Launchpad','Creación y lanzamiento de proyectos cripto','pulp-rocket.webp'],
 ['portfolio','▣','Portfolio','Cartera, saldos y actividad de tus wallets','pulp-coins.webp'],
 ['token','◉','Token PULP','Economía, distribución y tesorería del ecosistema','pulp-hero.webp'],
 ['governance','⚖','Gobernanza','Propuestas y decisiones de la comunidad','pulp-builder.webp'],
 ['studio','✧','AI Studio','Herramientas creativas de Pulp','pulp-builder.webp'],
 ['kit','▤','UI Kit','Biblioteca visual del design system','pulp-hero.webp']
];
const byId=id=>pages.find(x=>x[0]===id)||pages[0];
const image=(name,klass='',alt='')=>'<img class="'+klass+'" src="'+A+name+'" alt="'+alt+'" loading="lazy">';
const logo='<img src="'+icon+'" alt="" width="22" height="22">';
const B=(label,route,kind='primary')=>'<button class="button '+kind+'" data-route="'+route+'">'+label+'</button>';
const H=(title,description='')=>'<div class="heading"><h2>'+title+'</h2><span>'+description+'</span></div>';
const P=(html,extra='')=>'<section class="panel '+extra+'">'+html+'</section>';
const empty=(title,desc,asset='pulp-analyst.webp')=>P('<div class="placeholder">'+image(asset)+'<h3>'+title+'</h3><p>'+desc+'</p></div>');
const rows=(items)=>'<div class="data-rows">'+items.map(x=>'<div class="data-row"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>';
const hero=(title,text,asset,cta,route,eyebrow='THE PULP ECOSYSTEM')=>'<section class="hero"><div class="copy"><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+text+'</p><div class="actions">'+B(cta,route)+B('Explorar Intelligence','intelligence','secondary')+'</div></div>'+image(asset,'','Mascota Pulp')+'</section>';
const feature=(name,asset,desc,route)=>'<button class="panel feature" data-route="'+route+'">'+image(asset)+'<span class="feature-title">'+name+'</span><p>'+desc+'</p><span class="link">Explorar →</span></button>';
const chart=()=>'<div class="bar" aria-label="Gráfico ilustrativo del sistema de diseño, no datos financieros"><svg viewBox="0 0 500 74" preserveAspectRatio="none"><defs><linearGradient id="chartfill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d3a5ff" stop-opacity=".55"/><stop offset="1" stop-color="#f9f5ff" stop-opacity="0"/></linearGradient></defs><path d="M0 68C50 64 70 45 100 53 S170 30 200 44 250 26 280 30 320 7 350 28 405 15 430 20 475 5 500 7V74H0Z" fill="url(#chartfill)"/><path d="M0 68C50 64 70 45 100 53 S170 30 200 44 250 26 280 30 320 7 350 28 405 15 430 20 475 5 500 7" stroke="#8839e8" stroke-width="3" fill="none"/></svg></div>';
function home(){return hero('Tu universo Web3.<br><span style="color:#7b34e8">Todo en Pulp.</span>','Inteligencia on-chain, swaps, proyectos y herramientas de comunidad, con un diseño pensado para crear y explorar.','pulp-hero.webp','Abrir Pulp Swap','swap','PULP · WHITE EDITION 4.0')+
H('El ecosistema Pulp','Herramientas conectadas por una misma identidad')+
'<div class="grid four">'+feature('Intelligence','pulp-analyst.webp','Wallet tracking, señales y analítica transparente.','intelligence')+
feature('Pulp Swap','pulp-trader.webp','Intercambiá activos con revisión antes de firmar.','swap')+
feature('Trade & Earn','pulp-coins.webp','Descubrí mercados y oportunidades DeFi.','earn')+
feature('Launchpad','pulp-rocket.webp','Creá tu proyecto y explorá lanzamientos.','launchpad')+'</div>'+
H('Tu experiencia Web3','Conectá una wallet desde la beta completa para consultar información real')+
'<div class="grid two">'+P('<div class="panel-title">▣ Portfolio <span class="pill">Sin conectar</span></div><div class="empty-amount">—</div><p class="subline">Tu cartera y sus movimientos aparecerán al conectarte en la aplicación con backend.</p>'+chart(),'pad')+
P('<div class="panel-title">◉ Token PULP <span class="pill">No emitido</span></div>'+rows([['Contrato oficial','Pendiente'],['Precio y mercado','No disponible'],['Liquidez oficial','No desplegada']])+'<p class="subline">No mostramos capitalizaciones, ganancias ni precios inventados.</p>','pad')+'</div>'+
H('Diseñado para el próximo lanzamiento')+
'<div class="banner-card">'+image('pulp-builder.webp')+'<div><h3>Una plataforma. Un universo.</h3><p>Pulp une un sistema de diseño coherente con herramientas para explorar la economía Web3.</p></div></div>';}
function shell(id,cta){const d=byId(id);return hero(d[2]+'<span style="color:#7b34e8">.</span>',d[3]+'.',d[4],cta||'Volver al inicio','home','PULP / '+d[2].toUpperCase());}
function intelligence(){return shell('intelligence','Explorar módulos')+H('Smart Money · Exploración','Sin rankings de rentabilidad no verificados')+
'<div class="grid four">'+feature('Wallet Tracker','pulp-analyst.webp','Observá actividad pública de una dirección.','intelligence')+feature('Listas y favoritos','pulp-builder.webp','Agrupá wallets para análisis posterior.','intelligence')+feature('Alertas','pulp-coins.webp','Reglas basadas en actividad y datos reales.','intelligence')+feature('Estrategias','pulp-rocket.webp','Seguí, compará y evaluá con controles.','intelligence')+'</div>'+
H('Análisis de wallets','El historial real requiere RPC o indexador')+
'<div class="grid two">'+empty('Sin wallets cargadas','La vista publicada no accede a direcciones privadas ni entrega rankings ficticios.','pulp-analyst.webp')+
P('<h3 class="panel-title">Metodología del radar</h3>'+rows([['Cobertura','Fuente verificable'],['PnL','Solo cuando es calculable'],['Rankings','Sin resultados inventados'],['Seguimiento','Confirmación del usuario']])+'<p class="subline">La aplicación local incluye las integraciones iniciales de lectura e indexación.</p>','pad')+'</div>';}
function swap(){return H('Pulp Swap','Identidad del producto · Flujo de revisión no operativo en Pages')+
'<div class="swap-shell">'+P(image('pulp-trader.webp')+'<h2>Pulp <span style="color:var(--purple)">Swap.</span></h2><p>Una experiencia de intercambio diseñada para Solana, con cotización y autorización del usuario cuando el backend está disponible.</p><span class="pill">POWERED BY JUPITER · EN LA BETA COMPLETA</span>','swap-story')+
P('<div class="swap-tabs"><button class="active">Swap</button><button data-toast="Disponible en la beta conectada, no en GitHub Pages.">Límite</button><button data-toast="Disponible en la beta conectada, no en GitHub Pages.">Earn</button></div>'+
'<div class="input-token"><div class="token-heading">Pagás <span style="float:right">Wallet desconectada</span></div><div class="token-data"><b>0.00</b><span class="token-chip">◎ SOL</span></div><div class="subline">Saldo disponible: —</div></div><div class="switcher">↕</div>'+
'<div class="input-token"><div class="token-heading">Recibís (estimado)</div><div class="token-data"><b>—</b><span class="token-chip">◉ USDC</span></div><div class="subline">Cotización no disponible en Pages</div></div>'+
'<button class="button primary" disabled>Conectar wallet para cotizar</button><div class="small-notice">Esta página es visual. No solicita firmas ni envía operaciones.</div>','swap-panel')+
P('<div class="panel-title">Detalle del intercambio</div>'+rows([['Ruta','—'],['Precio e impacto','—'],['Comisión de red','—'],['Deslizamiento','—'],['Mínimo recibido','—']])+
'<div class="small-notice">Para swaps reales se necesita el backend Pulp, un RPC operativo y la autorización desde la wallet.</div>','pad')+'</div>'+
H('Diseño respaldado por un sistema')+
'<div class="grid three">'+feature('Cotizaciones claras','pulp-coins.webp','Verificables y actualizadas.','swap')+feature('Autorización segura','pulp-trader.webp','Revisión antes de firmar.','swap')+feature('Historial on-chain','pulp-analyst.webp','Estados rastreables.','portfolio')+'</div>';}
function earn(){return shell('earn','Ver Swap')+H('Trade & Earn','Protocolos, saldos y riesgos en su lugar')+
'<div class="grid three">'+feature('Swaps','pulp-trader.webp','Rutas de intercambio y revisión.','swap')+feature('Earn','pulp-coins.webp','Mercados de préstamos y tasas variables.','earn')+feature('Liquidity','pulp-builder.webp','Posiciones y pools sobre protocolos externos.','earn')+'</div>'+
H('Mercados y posiciones')+'<div class="grid two">'+empty('Conectá una wallet','Los saldos, posiciones y APY se consultan en los protocolos reales.','pulp-coins.webp')+
P('<h3 class="panel-title">Transparencia DeFi</h3>'+rows([['Rendimiento','Variable, no garantizado'],['Proveedor','Identificado por operación'],['Disponibilidad','Consulta en tiempo real'],['Depósitos y retiros','Requieren firma']]),'pad')+'</div>';}
function launchpad(){return shell('launchpad','Explorar proyectos')+H('Create · Launch · Grow','Un hogar para proyectos Web3')+
'<div class="grid three">'+feature('Crear token','pulp-rocket.webp','Suministro, metadata y revisión de permisos.','launchpad')+feature('Lanzar proyecto','pulp-builder.webp','Distribución, liquidez y condiciones visibles.','launchpad')+feature('Explorar lanzamientos','pulp-hero.webp','Fichas, estados y favoritos.','launchpad')+'</div>'+
H('Lanzamientos verificados','Ningún proyecto ficticio se muestra como real')+
'<div class="grid two">'+empty('Todavía sin lanzamientos públicos','Las fichas se completarán con contratos, liquidez y datos verificables.','pulp-rocket.webp')+
P('<h3 class="panel-title">Antes de un lanzamiento</h3>'+rows([['Token y supply','Datos verificables'],['Distribución y vesting','Condiciones públicas'],['Liquidez','Origen y derechos identificados'],['Permisos del contrato','Revisión y advertencias']]),'pad')+'</div>';}
function portfolio(){return shell('portfolio','Explorar Pulp Swap')+H('Tu cartera','Un solo lugar para revisar posiciones')+
'<div class="grid three">'+P('<b>Valor de cartera</b><div class="empty-amount">—</div><span class="subline">Wallet no conectada</span>','metric')+
P('<b>Posiciones DeFi</b><div class="empty-amount">—</div><span class="subline">Sin consulta a protocolos</span>','metric')+
P('<b>Operaciones</b><div class="empty-amount">—</div><span class="subline">Sin operaciones simuladas</span>','metric')+'</div>'+
H('Distribución e historial')+'<div class="grid two">'+empty('Todavía no hay cartera','Conectá una wallet desde la aplicación completa para leer activos y su evolución.','pulp-coins.webp')+
P('<h3 class="panel-title">Qué incluye Portfolio</h3>'+rows([['Balances','SOL y tokens SPL'],['Actividad','Transacciones verificables'],['Valoración','Solo precios disponibles'],['Histórico','Cobertura identificada']]),'pad')+'</div>';}
function token(){return shell('token','Volver al inicio')+H('PULP · Token oficial','Estado del proyecto, sin precios simulados')+
'<div class="grid three">'+P('<b>Contrato PULP</b><div class="empty-amount">—</div><span class="subline">Todavía no desplegado</span>','metric')+
P('<b>Suministro</b><div class="empty-amount">—</div><span class="subline">Pendiente de emisión</span>','metric')+
P('<b>Liquidez</b><div class="empty-amount">—</div><span class="subline">Pendiente de configuración</span>','metric')+'</div>'+
H('Transparencia y tesorería')+P('<h3 class="panel-title">Economía del ecosistema</h3>'+rows([['Token oficial','Pendiente'],['Autoridades y vesting','Por establecer'],['Tesorería pública','Sin dirección desplegada'],['Política de recompras','Sin actividad real']]),'pad');}
function governance(){return shell('governance','Ver ecosistema')+H('Gobernanza Pulp','Decisiones verificables cuando exista la DAO')+
'<div class="grid two">'+empty('Sin propuestas on-chain','Los votos y los movimientos de tesorería requerirán su organización y contratos reales.','pulp-builder.webp')+
P('<h3 class="panel-title">Diseño para decisiones responsables</h3>'+rows([['Propuestas','Identidad y estados'],['Participación','Criterios publicados'],['Votación','Firmada y verificable'],['Tesorería','Control multifirma']]),'pad')+'</div>';}
function studio(){return shell('studio','Ver ecosistema')+H('AI Studio · En construcción','El motor creativo se incorporará más adelante')+
'<div class="grid three">'+feature('Editor por capas','pulp-builder.webp','Lienzo editable, piezas y proyectos.','studio')+feature('Agente creativo','pulp-analyst.webp','Gestión y automatizaciones de contenido.','studio')+feature('Calendario','pulp-rocket.webp','Entregables, campañas y planificación.','studio')+'</div>'+H('El estudio creativo dentro de Pulp')+
'<div class="banner-card">'+image('pulp-builder.webp')+'<div><h3>Imaginá. Creá. Lanzá.</h3><p>AI Studio conserva su espacio de integración. Esta vista no presenta generación de IA ficticia.</p></div></div>';}
function kit(){return shell('kit','Volver al inicio')+H('Tokens · Fundamentos de diseño','La misma identidad del resto de Pulp')+
'<div class="uikit">'+P('<h3 class="panel-title">Paleta White Edition</h3><div class="swatches">'+[['#ffffff','White'],['#fbfaff','Canvas'],['#7b34e8','Purple'],['#f3eaff','Lavender'],['#1a1230','Ink']].map(x=>'<div class="swatch"><i style="background:'+x[0]+'"></i>'+x[1]+'</div>').join('')+'</div>','pad')+
P('<h3 class="panel-title">Acciones</h3><div class="chipset">'+B('Principal','kit')+B('Secundario','kit','secondary')+B('Neutro','kit','muted')+'</div>','pad')+
P('<h3 class="panel-title">Badges y estados</h3><div class="chipset"><span>Conexión</span><span>Nuevo</span><span>En revisión</span><span>Beta</span></div>','pad')+
P('<h3 class="panel-title">Componentes y pantallas</h3>'+rows([['Espaciado','Escala consistente'],['Cards y formularios','UI compartida'],['Gráficos','Datos con fuentes'],['Responsive','Desktop y móvil']]),'pad')+'</div>'+
H('Visuales Pulp','Ilustraciones originales de la beta')+'<div class="grid four">'+['pulp-hero.webp','pulp-trader.webp','pulp-analyst.webp','pulp-rocket.webp'].map((x,i)=>P(image(x)+'<b style="display:block;text-align:center;font-size:12px;margin:8px 0">'+['Octo','Trader','Analyst','Launch'][i]+'</b>','pad')).join('')+'</div>';}
const renderers={home,intelligence,swap,earn,launchpad,portfolio,token,governance,studio,kit};
const nav=document.getElementById('nav'),bottom=document.getElementById('bottom-nav'),content=document.getElementById('content');
nav.innerHTML=pages.map(p=>'<button data-route="'+p[0]+'"><span class="nav-symbol">'+p[1]+'</span>'+p[2]+(p[0]==='studio'?'<small>Soon</small>':'')+'</button>').join('');
const mobile=['home','intelligence','swap','launchpad','portfolio'];bottom.innerHTML=mobile.map(id=>{const p=byId(id);return '<button data-route="'+id+'"><span>'+p[1]+'</span>'+p[2]+'</button>'}).join('');
function route(){const id=(location.hash||'#home').slice(1);return renderers[id]?id:'home'}
function paint(){const id=route();content.innerHTML=renderers[id]();document.querySelectorAll('[data-route]').forEach(b=>{b.classList.toggle('active',b.dataset.route===id);if(b.tagName==='BUTTON'&&b.closest('nav'))b.setAttribute('aria-current',b.dataset.route===id?'page':'false')});document.title='Pulp · '+byId(id)[2]+' · White Edition';document.getElementById('sidebar').classList.remove('open');document.getElementById('mobile-menu').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'instant'})}
function go(id){if(!renderers[id])return;if(location.hash==='#'+id)paint();else location.hash=id}
let timeout;function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('visible');clearTimeout(timeout);timeout=setTimeout(()=>el.classList.remove('visible'),3500)}
document.addEventListener('click',e=>{const r=e.target.closest('[data-route]');if(r){e.preventDefault();go(r.dataset.route);return}const t=e.target.closest('[data-toast]');if(t)toast(t.dataset.toast)});
document.getElementById('mobile-menu').addEventListener('click',()=>{const el=document.getElementById('sidebar');const isOpen=el.classList.toggle('open');document.getElementById('mobile-menu').setAttribute('aria-expanded',String(isOpen))});
window.addEventListener('hashchange',paint);window.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('sidebar').classList.remove('open')});paint();
