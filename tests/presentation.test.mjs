import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
execFileSync(process.execPath,[path.join(root,'scripts/build-pages.mjs')]);
const store=new Map();
globalThis.window={PULP_PRESENTATION:true};
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
let requests=0;globalThis.fetch=()=>{requests++;throw Error('Network forbidden in presentation tests');};
const {presentationApi:api,resetPresentation}=await import(pathToFileURL(path.join(root,'_site/js/presentation-api.mjs')));
test('Pages builds the canonical app, not a duplicate docs frontend',()=>{
 assert.equal(fs.readFileSync(path.join(root,'_site/js/views.mjs'),'utf8'),fs.readFileSync(path.join(root,'public/js/views.mjs'),'utf8').replaceAll("from '/shared/","from '../shared/"));
 assert.ok(fs.readFileSync(path.join(root,'_site/index.html'),'utf8').includes('presentation-guard.js'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'_site/build-info.json'),'utf8')).financialActions,false);
});
test('Published wallet driver contains no extension registration or signing implementation',()=>{
 const text=fs.readFileSync(path.join(root,'_site/js/wallet.mjs'),'utf8');
 assert.ok(text.includes('Firmas deshabilitadas'));
 assert.ok(!/registerWallet|signTransaction|solana:sign|window\.phantom/.test(text));
});
test('Sample mode must be explicit, not an API failure fallback',async()=>{
 window.PULP_PRESENTATION=false;await assert.rejects(api('boot'),/no está habilitado/);window.PULP_PRESENTATION=true;
 assert.equal((await api('boot')).session.presentation,true);
});
test('Financial reads are marked and PULP remains unissued',async()=>{
 const boot=await api('boot');assert.equal(boot.config.pulpMint,'');assert.equal(boot.config.treasury,'');
 assert.match((await api('portfolio')).source,/ejemplo/);
 assert.match((await api('v4/rankings')).methodology,/no son resultados/i);
});
test('Every financial preparation and submission fails closed',async()=>{
 for(const route of ['swap/prepare','swap/execute','tx/submit','send/prepare','earn/prepare','launch/prepare','v4/pool/create','v4/liquidity/prepare','v4/launchlab/prepare','v4/vesting/prepare','v4/governance/execute','v4/billing/pay','settings/save','auth/verify'])await assert.rejects(api(route,{},true),/deshabilitada/);
 assert.equal(requests,0);
});
test('Unknown routes never fall back to a live API',async()=>{await assert.rejects(api('unknown/read'),/no disponible/);await assert.rejects(api('unknown/write',{},true));assert.equal(requests,0);});
test('Account examples and favourites persist locally',async()=>{
 const a=await api('account');a.workspace.profile.name='Prueba local';a.workspace.favorites=['sample'];await api('account/save',a.workspace,true);
 assert.equal((await api('account')).workspace.profile.name,'Prueba local');assert.ok(store.size>0);
});
test('Alert and strategy drafts can be added and removed without execution',async()=>{
 await api('v4/alerts/save',{label:'Test'},true);let rows=(await api('v4/alerts')).rules;const id=rows.at(-1).id;await api('v4/alerts/delete',{id},true);assert.ok(!(await api('v4/alerts')).rules.some(x=>x.id===id));
 await api('v4/strategies/save',{name:'Local',kind:'dca',amount:'5'},true);rows=(await api('v4/strategies')).strategies;await api('v4/strategies/delete',{id:rows.at(-1).id},true);assert.equal(requests,0);
});
test('Distribution requires 100 percent, metadata is export only',async()=>{
 await assert.rejects(api('v4/launch/plan/save',{allocations:[{bps:9000}]},true),/10000/);
 await api('v4/launch/plan/save',{name:'Example',allocations:[{bps:10000}]},true);assert.equal((await api('v4/launch/plan')).plan.name,'Example');
 const m=await api('v4/launch/metadata',{name:'Test',symbol:'T'},true);assert.equal(m.pinned,false);assert.equal(m.content.name,'Test');
});
test('Reset restores the presentation only',async()=>{resetPresentation();assert.equal((await api('account')).workspace.profile.name,'Explorador');assert.equal(requests,0);});
test('All previously missing scene assets are included',()=>{for(const a of ['scene-ecosystem','scene-octopus','scene-launch'])assert.ok(fs.statSync(path.join(root,'_site/assets/white',a+'.webp')).size>1000);});
