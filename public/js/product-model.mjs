/** Product model. Deterministic examples are accessible only in the presentation build.
 * No private keys, executable transactions, ranking recommendations or external requests. */
export const PRODUCT_VERSION='4.2.0-ui';
export const SAMPLE_TIME=Date.UTC(2026,10,9,12);
export const DEFAULT_FILTERS={q:'',category:'all',sort:'activity',period:'30d',favorites:false};
export function searchRows(rows,q,fields){const term=String(q||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return rows.filter(row=>fields.some(k=>String(row[k]??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term)));}
export function stableSort(rows,key,direction='desc'){return rows.map((row,i)=>({row,i})).sort((a,b)=>{const av=a.row[key],bv=b.row[key];if(av==null)return bv==null?a.i-b.i:1;if(bv==null)return -1;const v=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'es');return (direction==='asc'?v:-v)||a.i-b.i;}).map(x=>x.row);}
export function allocationTotal(plan){return ['community','treasury','team','liquidity'].reduce((s,k)=>s+Number(plan[k]||0),0);}
export function validateLaunch(plan,step=3){
 const errors=[];
 if(!String(plan.name||'').trim())errors.push('Ingresá el nombre del proyecto.');
 if(!/^[A-Z0-9]{2,10}$/.test(String(plan.symbol||'')))errors.push('El ticker necesita entre 2 y 10 letras mayúsculas o números.');
 if(!/^\d+$/.test(String(plan.supply||''))||BigInt(plan.supply||'0')<=0n||BigInt(plan.supply||'0')>1000000000000n)errors.push('El suministro debe ser un entero entre 1 y 1.000.000.000.000.');
 if(step>=1){if(Math.abs(allocationTotal(plan)-100)>.00001)errors.push('La distribución debe sumar exactamente 100%.');for(const k of ['community','treasury','team','liquidity'])if(!Number.isFinite(Number(plan[k]))||Number(plan[k])<0||Number(plan[k])>100)errors.push('Cada asignación debe estar entre 0% y 100%.');}
 if(step>=2){
  if(plan.date){const d=new Date(plan.date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(plan.date)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==plan.date)errors.push('Ingresá una fecha válida.');}
  if(!Number.isInteger(Number(plan.vesting))||Number(plan.vesting)<0||Number(plan.vesting)>120)errors.push('Vesting: ingresá entre 0 y 120 meses enteros.');
  if(plan.website){try{const u=new URL(plan.website);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{errors.push('El sitio web debe ser una URL HTTP o HTTPS válida.');}}
 }
 return [...new Set(errors)];
}
export function pointsForPeriod(points,period){const n={ '7d':7,'30d':30,'90d':90,'all':Infinity}[period]||30;return points.slice(-Math.min(n,points.length));}
export function sampleData(enabled){
 if(enabled!==true)throw Error('Los ejemplos de producto solo pertenecen al modo presentación.');
 const wallets=[
 ['orbit','Orbit Research','Swing',128,3125,64,89,8,'SOL · JUP',12],['coral','Coral Flow','DeFi',94,1840,58,76,4,'USDC · SOL',8],['atlas','Atlas Signals','Trader',216,-482,49,67,17,'JUP · BONK',4],['echo','Echo Capital','Swing',73,912,61,82,6,'SOL · JTO',28],['sage','Sage Labs','DeFi',52,364,57,91,3,'USDC · JitoSOL',45],['nova','Nova Desk','Trader',341,2156,55,62,22,'SOL · BONK',2],['lumen','Lumen Index','Swing',42,-126,45,73,9,'JUP · SOL',74],['tide','Tide Collective','DeFi',63,615,60,86,5,'USDC · SOL',110]
 ].map(([id,name,category,activity,pnl,win,coverage,drawdown,tokens,minutes],i)=>({id,name,category,activity,pnl,win,coverage,drawdown,tokens,minutes,days:90,source:'Serie ilustrativa local',address:'Perfil de ejemplo '+(i+1),score:null,curve:[20,25+i,23,28+i,26,34,31,40+i,35,42+i,39,46+i]}));
 const markets=[
 {id:'usdc-jupiter',symbol:'USDC',name:'USD Coin',protocol:'Jupiter Lend',type:'stable',rate:5.8,tvl:2400000,available:820000,utilization:66,origin:'Intereses de prestatarios',rateHistory:[4.4,4.8,4.5,5.0,5.2,4.9,5.8],risk:'Stablecoin, contratos y liquidez de retiro'},
 {id:'sol-kamino',symbol:'SOL',name:'Solana',protocol:'Kamino',type:'native',rate:3.1,tvl:1850000,available:610000,utilization:67,origin:'Intereses de prestatarios',rateHistory:[2.7,3.0,3.2,2.8,3.4,3.2,3.1],risk:'Precio del activo, contratos y disponibilidad'},
 {id:'usdt-jupiter',symbol:'USDT',name:'Tether USD',protocol:'Jupiter Lend',type:'stable',rate:4.6,tvl:920000,available:430000,utilization:53,origin:'Intereses de prestatarios',rateHistory:[4.1,4.2,4.5,4.2,4.4,4.9,4.6],risk:'Stablecoin, contratos y liquidez de retiro'},
 {id:'jitosol-kamino',symbol:'JitoSOL',name:'Jito Staked SOL',protocol:'Kamino',type:'liquid',rate:2.4,tvl:1360000,available:350000,utilization:74,origin:'Intereses del mercado; no incluye el staking subyacente',rateHistory:[2.1,2.4,2.0,2.1,2.3,2.5,2.4],risk:'Token líquido de staking, precio y contratos'}
 ];
 const pools=[
 {id:'sol-usdc',pair:'SOL / USDC',symbolA:'SOL',symbolB:'USDC',protocol:'Raydium',type:'CPMM',tvl:2840000,volume:726000,fee:.25,apr:9.4,reserveA:9466.67,reserveB:1420000,share:0.004,range:false},
 {id:'usdc-usdt',pair:'USDC / USDT',symbolA:'USDC',symbolB:'USDT',protocol:'Raydium',type:'CPMM',tvl:4820000,volume:1250000,fee:.05,apr:4.1,reserveA:2410000,reserveB:2410000,share:0,range:false},
 {id:'sol-jitosol',pair:'SOL / JitoSOL',symbolA:'SOL',symbolB:'JitoSOL',protocol:'Kamino',type:'CLMM',tvl:1370000,volume:310000,fee:.04,apr:6.2,range:true,pendingIntegration:true},
 {id:'jup-sol',pair:'JUP / SOL',symbolA:'JUP',symbolB:'SOL',protocol:'Meteora',type:'DLMM',tvl:960000,volume:435000,fee:.20,apr:13.8,range:true,pendingIntegration:true}
 ];
 const projects=[
 {id:'orbita',name:'Órbita',symbol:'ORBI',category:'Infraestructura',status:'curve',progress:62,goal:50000,raised:31000,participants:248,age:3,theme:'orbit',description:'Herramientas para conectar experiencias y comunidades on-chain.',milestones:['Diseño del token','Curva de lanzamiento','Graduación a pool','Apertura del ecosistema']},
 {id:'tinta',name:'Tinta',symbol:'TINT',category:'Creadores',status:'planned',progress:0,goal:25000,raised:0,participants:0,age:1,theme:'ink',description:'Un espacio de colaboración entre creadores y comunidades.'},
 {id:'nexo',name:'Nexo',symbol:'NEX',category:'Comunidad',status:'graduated',progress:100,goal:40000,raised:40000,participants:326,age:8,theme:'mesh',description:'Herramientas abiertas para coordinar proyectos colectivos.'},
 {id:'vela',name:'Vela',symbol:'VELA',category:'Gaming',status:'curve',progress:38,goal:20000,raised:7600,participants:94,age:2,theme:'solar',description:'Un laboratorio de experiencias de juego y recompensas digitales.'},
 {id:'prisma',name:'Prisma',symbol:'PRSM',category:'Analítica',status:'planned',progress:0,goal:35000,raised:0,participants:0,age:4,theme:'prism',description:'Visualización de datos para comunidades que construyen en Solana.'},
 {id:'atlas',name:'Atlas',symbol:'ATLS',category:'Pagos',status:'curve',progress:81,goal:60000,raised:48600,participants:415,age:6,theme:'atlas',description:'Experimentos de cobro y coordinación de pagos digitales.'}
 ];
 const events=[
 {id:'u1',type:'swap',status:'confirmed',at:SAMPLE_TIME-1800000,title:'Intercambio de activos',protocol:'Jupiter',out:'0,10 SOL',inputSymbol:'SOL',incoming:'15 USDC',symbol:'USDC',value:15,fee:0.000005,network:'Solana',signature:null},
 {id:'u2',type:'deposit',status:'submitted',at:SAMPLE_TIME-7200000,title:'Depósito en mercado',protocol:'Jupiter Lend',out:'20 USDC',symbol:'USDC',value:20,fee:0.000005,network:'Solana',signature:null},
 {id:'u3',type:'receive',status:'confirmed',at:SAMPLE_TIME-86400000,title:'Fondos recibidos',protocol:'Transferencia',incoming:'2 SOL',symbol:'SOL',value:300,fee:0,network:'Solana',signature:null},
 {id:'u4',type:'send',status:'confirmed',at:SAMPLE_TIME-90000000,title:'Envío de activos',protocol:'Transferencia',out:'25 USDC',symbol:'USDC',value:25,fee:0.000005,network:'Solana',signature:null},
 {id:'u5',type:'withdraw',status:'confirmed',at:SAMPLE_TIME-172800000,title:'Retiro de liquidez',protocol:'Raydium',incoming:'0,25 SOL + 37,50 USDC',symbol:'SOL',value:75,fee:0.000005,network:'Solana',signature:null},
 {id:'u6',type:'swap',status:'failed',at:SAMPLE_TIME-180000000,title:'Intercambio no ejecutado',protocol:'Jupiter',out:'Sin cambios de activos',symbol:'SOL',value:0,fee:0,network:'Solana',signature:null},
 {id:'u7',type:'deposit',status:'confirmed',at:SAMPLE_TIME-259200000,title:'Depósito en mercado',protocol:'Kamino',out:'0,5 SOL',symbol:'SOL',value:75,fee:0.000005,network:'Solana',signature:null}
 ];
 return {wallets,markets,pools,projects,events,positions:[{id:'ep1',kind:'earn',name:'USDC Lending',symbol:'USDC',protocol:'Jupiter Lend',deposit:250,current:253.2,rewards:3.2,market:'usdc-jupiter'},{id:'lp1',kind:'liquidity',name:'SOL / USDC',symbol:'SOL',protocol:'Raydium',deposit:500,current:493.6,rewards:6.4,pool:'sol-usdc'}],assets:[{symbol:'SOL',name:'Solana',amount:12.5,price:150,value:1875,share:90.36},{symbol:'USDC',name:'USD Coin',amount:200,price:1,value:200,share:9.64}],balance:2075,portfolioPoints:Array.from({length:30},(_,i)=>({at:SAMPLE_TIME-(29-i)*86400000,value:i===29?2075:1650+i*13+[0,35,8,60,-25,18,45][i%7]})),netContributions:320,observedVariation:425};
}
export function normalizeEvent(t){if(t.type)return t;return {id:t.id,type:t.kind?.startsWith('earn-')?'deposit':t.kind||'transfer',status:t.status,at:t.createdAt,title:t.summary?.title||'Operación',protocol:t.provider||'Solana',out:t.summary?.inputAmount?`${t.summary.inputAmount} ${t.summary.inputSymbol}`:t.summary?.amount?`${t.summary.amount} ${t.summary.symbol}`:'',incoming:t.summary?.outputAmount?`${t.summary.outputAmount} ${t.summary.outputSymbol}`:'',symbol:t.summary?.outputSymbol||t.summary?.symbol||t.summary?.inputSymbol||'',fee:null,signature:t.signature,network:t.network};}

/** Filter a deterministic 90-day fixture window; never estimate live wallet returns. */
export function sampleWalletWindow(w,period){
 const days={'7d':7,'30d':30,'90d':90,'all':90}[period]||30;
 const seed=[...w.id].reduce((n,c)=>n+c.charCodeAt(0),0);
 const daily=Array.from({length:90},(_,i)=>({weight:.65+((i*17+seed)%53)/100,count:Math.max(0,Math.floor(w.activity/30)+(i%3===0?1:0))}));
 const baseline=daily.slice(-30).reduce((n,r)=>n+r.weight,0), rows=daily.slice(-days);
 const pnl=Math.round(w.pnl*rows.reduce((n,r)=>n+r.weight,0)/baseline*100)/100;
 const activity=rows.reduce((n,r)=>n+r.count,0);
 return {...w,pnl,activity,windowDays:days,curve:rows.map((r,i)=>20+i*.8+((i*11+seed)%19)/3)};
}
