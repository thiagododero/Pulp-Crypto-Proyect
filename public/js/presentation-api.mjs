/** Presentation-only transport. Deterministic, visibly labelled examples. Never reaches a network. */
import { MINT, PROGRAM, b58encode } from '/shared/solana.mjs';
const EXAMPLE = 'Datos de ejemplo · no consultados en blockchain';
export const owner = b58encode(Uint8Array.from({length:32},(_,i)=>i+20));
const addr = n => b58encode(Uint8Array.from({length:32},(_,i)=>(i+n)%255));
const T = Date.UTC(2026,10,9,12), key='pulp:presentation:workspace:1';
const clone = x => JSON.parse(JSON.stringify(x));
const catalog = [{mint:MINT.SOL,symbol:'SOL',name:'Solana',decimals:9},{mint:MINT.USDC,symbol:'USDC',name:'USD Coin',decimals:6}];
const defaults = () => ({workspace:{profile:{name:'Explorador'},watched:[{address:addr(31),label:'Wallet de muestra 01'},{address:addr(51),label:'Wallet de muestra 02'}],favorites:[],drafts:[{id:'example-draft',name:'Órbita · ejemplo',symbol:'ORBI',supply:'1000000',decimals:6,description:'Borrador ilustrativo; no es un token emitido.',image:'',uri:'',fixed:true,updatedAt:T}]},rules:[{id:'rule-demo',label:'Actividad de muestra',kind:'wallet',address:addr(31),onlySwaps:true}],strategies:[{id:'strategy-demo',name:'Compra periódica · ejemplo',kind:'dca',amount:'10',maxDailyUsdc:30}],inbox:[{id:'n1',kind:'wallet',message:'Ejemplo de aviso: una wallet seguida registra actividad.',at:T-180000,read:false},{id:'n2',kind:'price',message:'Ejemplo de alerta de precio. No es una señal de inversión.',at:T-3600000,read:false}],plan:null,preferences:{consentAnalytics:false},proposals:[]});
let state=defaults();
try { const saved=JSON.parse(localStorage.getItem(key)||'null'); if(saved&&saved.workspace&&Array.isArray(saved.rules))state={...state,...saved}; } catch {}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
function fail(message='Esta acción está deshabilitada en el modo visual.'){const err=new Error(message);err.code='PRESENTATION_ONLY';throw err;}
const config={mode:'presentation',network:'mainnet',revision:1,slippageBps:50,maxPriceImpact:3,jupiterKeyConfigured:true,pulpMint:'',treasury:'',governanceUrl:'',swapFeeBps:0,mainnetRpcHost:'Deshabilitado en modo visual',devnetRpcHost:'Deshabilitado en modo visual'};
const assets=[{...catalog[0],amount:'12.5',rawAmount:'12500000000',raw:'12500000000',usdPrice:150,usdValue:1875,native:true,program:PROGRAM.token},{...catalog[1],amount:'200',rawAmount:'200000000',raw:'200000000',usdPrice:1,usdValue:200,native:false,program:PROGRAM.token}];
const portfolio=who=>({owner:who||owner,network:'mainnet',assets,totalUsd:2075,unpriced:0,warnings:[EXAMPLE],source:EXAMPLE,observedAt:T});
const history=[{id:'example-swap',kind:'swap',status:'confirmed',network:'mainnet',createdAt:T-1800000,summary:{title:'Ejemplo · intercambio SOL / USDC',inputAmount:'0.10',inputSymbol:'SOL',outputAmount:'15',outputSymbol:'USDC'},signature:null},{id:'example-deposit',kind:'earn-deposit',status:'submitted',network:'mainnet',createdAt:T-7200000,summary:{title:'Ejemplo · depósito pendiente',amount:'20',symbol:'USDC'},signature:null}];
const analysis={eventCount:48,daysObserved:30,grossRealizedUsdc:'24.50',closedTrades:6,unpricedSales:[],eligible:false,score:null,closed:[],methodology:'Ejemplo de interfaz; no evaluación financiera',source:EXAMPLE,reasons:['No son wallets recomendadas'],warnings:[EXAMPLE]};
const planDefault={name:'Órbita · ejemplo',symbol:'ORBI',supply:'1000000',decimals:6,hash:'example-not-onchain',allocations:[{label:'Comunidad',bps:5000},{label:'Tesorería',bps:3000},{label:'Equipo',bps:2000}]};
const readRoutes = {
 boot:()=>({config,session:{owner,presentation:true},catalog,csrf:'presentation-no-authorization'}),
 account:()=>({workspace:state.workspace}),
 portfolio:p=>portfolio(p.address),
 market:()=>({tokens:assets,source:EXAMPLE,observedAt:T}),
 'tokens/search':p=>catalog.filter(t=>(t.name+' '+t.symbol+' '+t.mint).toLowerCase().includes((p.q||'').toLowerCase())),
 'portfolio/history':()=>({points:[1880,1920,1910,1995,1950,2010,2075].map((v,i)=>({at:T-(6-i)*86400000,totalUsd:v,unpriced:0})),source:EXAMPLE}),
 'tx/history':()=>({items:history,presentation:true,source:EXAMPLE}),
 'tx/status':p=>({transaction:history.find(t=>t.id===p.id)||history[0]}),
 'wallet/history':()=>({items:[],source:EXAMPLE}),
 'earn/markets':()=>({markets:[{mint:MINT.USDC,symbol:'USDC',rate:null,totalAssets:'—'},{mint:MINT.SOL,symbol:'SOL',rate:null,totalAssets:'—'}],source:EXAMPLE,observedAt:T}),
 'earn/positions':()=>({positions:[{token:{symbol:'Posición ilustrativa',address:addr(70)},shares:'10000000',underlyingAssets:'10000000',ownerAddress:owner}],observedAt:T}),
 'launch/discover':()=>({projects:['Órbita · proyecto de ejemplo','Tinta · proyecto de ejemplo','Nexo · proyecto de ejemplo'].map((description,i)=>({tokenAddress:addr(80+i),description:description+'. Ficha de muestra; no representa una oferta ni un lanzamiento real.',url:''})),source:EXAMPLE,observedAt:T}),
 'token/details':p=>({info:{mint:p.mint,decimals:6,supply:'1000000000000',mintAuthority:null,freezeAuthority:null,program:PROGRAM.token},pairs:[],source:EXAMPLE}),
 'governance/list':()=>({proposals:[{id:'proposal-example',title:'Ejemplo · recursos para la comunidad',description:'Así se presenta una consulta: contexto, opciones y cierre. Los votos de esta muestra no son firmas.',endsAt:T+30*86400000,author:'Autor de ejemplo',votes:[]},...state.proposals]}),
 connections:()=>({network:'presentation',checkedAt:T,rpc:{ok:false,message:'Desactivado en la presentación. No se ha consultado Solana.'},jupiter:{ok:false,message:'Sin conexión ni API key. Swaps y operaciones deshabilitados.'}}),
 diagnostics:()=>({mode:'presentation',source:EXAMPLE,networkRequests:0}),
 'v4/rankings':()=>({wallets:[31,51,71].map((n,i)=>({address:addr(n),source:'Muestra '+(i+1)+' · no recomendación',analysis:{...analysis,eventCount:48+i*7,closedTrades:6+i}})),methodology:'Estas direcciones y métricas solo muestran el diseño del radar. No son resultados comprobados ni wallets recomendadas.'}),
 'v4/intelligence':p=>({address:p.address||owner,analysis,items:[],complete:false,missing:['Modo visual: sin indexación real'],lastSync:T}),
 'v4/events':()=>({items:[],source:EXAMPLE}),
 'v4/jobs':()=>({items:[{type:'Ejemplo de indexación',state:'queued',attempts:0,createdAt:T,result:null}]}),
 'v4/inbox':()=>({items:state.inbox}),
 'v4/alerts':()=>({rules:state.rules,delivery:'Reglas de muestra guardadas solo en este navegador. No se monitorean ni se envían avisos.'}),
 'v4/strategies':()=>({strategies:state.strategies,signals:[{id:'signal-demo',kind:'Ejemplo DCA',amount:'10',expiresAt:T+30*86400000}],mode:'Las estrategias guardadas aquí son borradores visuales. No se evalúan ni ejecutan.'}),
 'v4/positions':()=>({positions:[{kind:'Posición de liquidez · ejemplo',data:{pair:'SOL / USDC',state:'Solo visual',source:EXAMPLE}}],source:EXAMPLE}),
 'v4/pools':()=>({pools:[{id:addr(82),mintA:{symbol:'SOL',address:MINT.SOL},mintB:{symbol:'USDC',address:MINT.USDC},tvl:null,day:{apr:null},type:'CPMM · ejemplo'}],hasNextPage:false,source:EXAMPLE}),
 'v4/pool':p=>({id:p.id,mintA:MINT.SOL,mintB:MINT.USDC,mintLp:addr(90),reserveA:'1000000000',reserveB:'150000000',mintDecimalA:9,mintDecimalB:6,source:EXAMPLE}),
 'v4/launch/plan':()=>({plan:state.plan||planDefault}),
 'v4/launch/projects':()=>({items:[{name:'Órbita · ejemplo',symbol:'ORBI',owner,mint:addr(80),network:'mainnet',presentation:true}]}),
 'v4/launchlab/config':()=>({program:'Ejemplo · programa sin consultar',platformId:'example',platform:{name:'Configuración ilustrativa',feeRate:0,creatorFeeRate:0},config:{mintB:MINT.USDC,tradeFeeRate:0},source:EXAMPLE}),
 'v4/launchlab/pool':p=>({pool:p.pool,statusLabel:'Ejemplo · sin lanzamiento real',mintA:addr(83),mintB:MINT.USDC,creator:owner,realA:'2000000',totalSellA:'8000000',realB:'1000000',totalFundRaisingB:'4000000',decimalsA:6,decimalsB:6,vesting:{totalLockedAmount:'1000000'},record:null,source:EXAMPLE}),
 'v4/governance':()=>({configured:true,presentation:true,multisig:addr(105),vault:addr(106),threshold:2,timeLock:86400,members:[owner,addr(31),addr(51)],proposals:[{transactionIndex:1,address:addr(107),status:'Active',approved:[owner],rejected:[]},{transactionIndex:2,address:addr(108),status:'Approved',approved:[owner,addr(31)],rejected:[]}],note:'Organización y propuestas de ejemplo; no hay una DAO conectada.'}),
 'v4/governance/details':p=>({presentation:true,hash:'example-not-a-transaction-hash',payment:{vault:addr(106),destination:addr(109),amount:'25',symbol:'USDC'},transaction:{example:true,index:p.index,instructions:'Vista ilustrativa sin instrucciones serializadas ni posibilidad de firmar.'}}),
 'v4/billing':()=>({merchantConfigured:false,entitlement:null,plans:{pro:{label:'Pulp Pro · propuesta',usdc:19,days:30,alerts:20},team:{label:'Pulp Team · propuesta',usdc:49,days:30,alerts:100}},invoices:[{id:'invoice-example',plan:'Pro · ejemplo',amount:'19',expiresAt:T+30*86400000,state:'pending'}],referral:null}),
 'v4/sessions':()=>({items:[{id:'demo-session',current:true,userAgent:'Este navegador · presentación, no sesión de wallet',createdAt:T,expires:T+30*86400000}]}),
 'v4/preferences':()=>state.preferences,
 'v4/capabilities':()=>({mode:'Presentación sin red',storage:'Solo navegador · datos de ejemplo',financialWrites:'paused',checks:[['Interfaz y navegación','Disponible'],['Wallets y firmas','Deshabilitadas'],['Datos financieros','Ejemplos identificados'],['Borradores y favoritos','Persistencia local']].map(([name,note])=>({name,state:'visual',note}))}),
 'v4/integrations':()=>({storage:'Local de demostración',publicOrigin:'GitHub Pages · archivos estáticos',merchantWallet:'',squads:'',pinata:false,protocolWrites:false,pause:true,fees:{bps:0,referralAccount:''}}),
 'v4/economy':()=>({revenueCents:0,costsCents:0,eligibleCents:0,buybackBudgetCents:0,policy:{reserve:0,liabilities:0,buybackBps:0},note:'Sin ingresos, costos ni recompras reales en esta presentación.'}),
 'v4/audit':()=>({items:[],note:'No hay actividad de servidor ni movimientos financieros.'})
};
export async function presentationApi(route,params={},post=false){
 if(!globalThis.window?.PULP_PRESENTATION)fail('El transporte de presentación no está habilitado.');
 if(!post){const f=readRoutes[route];if(!f)fail('Consulta no disponible en modo visual: '+route);return clone(f(params));}
 const f=params;let result={ok:true,presentation:true};
 if(route==='account/save'){state.workspace={profile:{name:String(f.profile?.name||'Explorador').slice(0,50)},watched:Array.isArray(f.watched)?f.watched.slice(0,30):[],favorites:Array.isArray(f.favorites)?f.favorites.slice(0,100):[],drafts:Array.isArray(f.drafts)?f.drafts.slice(0,50):[]};result={workspace:state.workspace};}
 else if(route==='v4/inbox/read'){state.inbox.forEach(n=>{if(f.id==='all'||n.id===f.id)n.read=true;});}
 else if(route==='v4/alerts/save'){state.rules.push({...f,id:'local-'+Date.now(),label:String(f.label||'Regla').slice(0,60)});}
 else if(route==='v4/alerts/delete'){state.rules=state.rules.filter(x=>x.id!==f.id);}
 else if(route==='v4/strategies/save'){state.strategies.push({...f,id:'local-'+Date.now()});}
 else if(route==='v4/strategies/delete'){state.strategies=state.strategies.filter(x=>x.id!==f.id);}
 else if(route==='v4/preferences/save'){state.preferences={consentAnalytics:!!f.consentAnalytics};}
 else if(route==='v4/account/export'){result={presentation:true,source:EXAMPLE,workspace:state.workspace,preferences:state.preferences};}
 else if(route==='v4/launch/plan/save'){const allocations=typeof f.allocations==='string'?JSON.parse(f.allocations):f.allocations;if(!Array.isArray(allocations)||allocations.reduce((a,b)=>a+Number(b.bps||0),0)!==10000)fail('Las asignaciones deben sumar 10000 puntos básicos (100%).');state.plan={...f,allocations,hash:'local-visual-'+Date.now()};result={plan:state.plan};}
 else if(route==='v4/launch/metadata'){result={pinned:false,content:{name:f.name,symbol:f.symbol,description:f.description,image:f.image,external_url:f.website},source:EXAMPLE};}
 else if(route==='governance/create'){state.proposals.unshift({id:'local-proposal-'+Date.now(),title:f.title,description:f.description,endsAt:Date.now()+Number(f.days||7)*86400000,author:'Perfil local de muestra',votes:[]});}
 else fail();
 save();return clone(result);
}
export function resetPresentation(){state=defaults();save();}
