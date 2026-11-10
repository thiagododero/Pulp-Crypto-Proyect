import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
execFileSync(process.execPath,[path.join(root,'scripts/build-pages.mjs')]);
test('Crypto scope removes creative runtime, navigation, rendering and landing offers',()=>{
 for(const file of walk(path.join(root,'public')).filter(p=>/\.(m?js|html|css)$/.test(p)))
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/AI Studio|Pulp AI|#\/studio|js\/studio\.js|function studio\(|b-studio-|\.st-(editor|calendar|moodboard)|Creative Workspace/i,file);
 assert.equal(fs.existsSync(path.join(root,'public/js/studio.js')),false);
 assert.equal(fs.existsSync(path.join(root,'docs/v4/AI_STUDIO_CONTRATO.md')),false);
});
test('Pages has no retired Studio asset or script reference and financial actions remain disabled',()=>{
 assert.equal(fs.existsSync(path.join(root,'_site/js/studio.js')),false);
 assert.doesNotMatch(read('_site/index.html'),/studio/i);
 assert.equal(JSON.parse(read('_site/build-info.json')).financialActions,false);
 assert.match(read('_site/js/wallet.mjs'),/Firmas deshabilitadas/);
});
test('Deployment resource checks do not request the retired script',()=>{
 assert.doesNotMatch(read('.github/workflows/pages.yml'),/js\/studio\.js/);
 assert.match(read('.github/workflows/pages.yml'),/npm test/);
 assert.match(read('.github/workflows/pages.yml'),/scripts\/build-pages\.mjs/);
});
test('Launch planner, UI kit, brand assets and crypto backend are preserved',()=>{
 const nav=read('public/js/views.mjs');const v4=read('public/js/v4-ui.mjs');
 for(const name of ['intelligence','trade','launchpad','portfolio','activity','token','governance','ui-kit','visuals'])assert.ok(nav.includes(name),name);
 assert.match(v4,/Plan de lanzamiento/);assert.match(v4,/launch-planner/);
 assert.ok(fs.statSync(path.join(root,'public/assets/white/pulp-builder.webp')).size>1000);
 assert.ok(fs.statSync(path.join(root,'server/v4/module.mjs')).size>1000);
});
test('Creative features are not advertised as pending by capability endpoints',()=>{
 assert.doesNotMatch(read('server/v4/module.mjs'),/key: 'studio'|AI Studio/);
 assert.doesNotMatch(read('public/js/presentation-api.mjs'),/AI Studio/);
});
test('Unknown retired links recover to home instead of a broken page',()=>{
 const s=read('public/js/app.mjs');assert.match(s,/function routeFromHash/);
 assert.match(s,/history\.replaceState\(null, '', '#\/home'\)/);
});
