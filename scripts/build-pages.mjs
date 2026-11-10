/** Single UI source, explicit static presentation transport. No signing in the Pages build. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'_site');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
fs.cpSync(path.join(root,'public'),out,{recursive:true});
fs.cpSync(path.join(root,'shared'),path.join(out,'shared'),{recursive:true});
fs.writeFileSync(path.join(out,'js/runtime-mode.js'),'window.PULP_PRESENTATION = true;\n');
fs.writeFileSync(path.join(out,'js/wallet.mjs'),`export class Wallets extends EventTarget { constructor(){super();this.account=null;} list(){return [];} connect(){throw Error('Wallets deshabilitadas en modo visual');} message(){throw Error('Firmas deshabilitadas');} sign(){throw Error('Operaciones deshabilitadas');} disconnect(){} }\n`);
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
const version=process.env.GITHUB_SHA?.slice(0,12)||'product-refinement-1';
for(const f of files(path.join(out,'js')).filter(f=>/\.(mjs|js)$/.test(f))){
 let s=fs.readFileSync(f,'utf8').replaceAll("from '/shared/","from '../shared/").replaceAll("import('/shared/","import('../shared/");
 // A new deployment also versions ES module dependencies, not just the entry file.
 s=s.replace(/(from\s+['"])(\.\/[^'"?]+\.(?:mjs|js))(['"])/g,(_,a,u,z)=>`${a}${u}?v=${version}${z}`);
 s=s.replace(/(import\(['"])(\.\/[^'"?]+\.(?:mjs|js))(['"]\))/g,(_,a,u,z)=>`${a}${u}?v=${version}${z}`);
 fs.writeFileSync(f,s);
}
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace(/\?v=[^"']+/g,'').replace(/(href|src)="((?:css|js)\/[^"?]+)"/g,(_,a,url)=>`${a}="${url}?v=${version}"`);
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({edition:'Pulp Product Refinement',mode:'presentation',source:'public/',commit:process.env.GITHUB_SHA||null,financialActions:false,version},null,2));
console.log('Built _site from public/: wallet driver inert, examples explicitly scoped, no backend secrets.');
