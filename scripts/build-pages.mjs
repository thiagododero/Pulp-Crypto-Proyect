/** One app, two transports. Publish the actual public/ UI; never a second handwritten preview. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'_site');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
fs.cpSync(path.join(root,'public'),out,{recursive:true});
fs.cpSync(path.join(root,'shared'),path.join(out,'shared'),{recursive:true});
fs.writeFileSync(path.join(out,'js/runtime-mode.js'),'window.PULP_PRESENTATION = true;\n');
// Wallet discovery and signing are absent from the published artifact, not merely hidden.
fs.writeFileSync(path.join(out,'js/wallet.mjs'),`export class Wallets extends EventTarget { constructor(){super();this.account=null;} list(){return [];} connect(){throw Error('Wallets deshabilitadas en modo visual');} message(){throw Error('Firmas deshabilitadas');} sign(){throw Error('Operaciones deshabilitadas');} disconnect(){} }\n`);
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const f of files(path.join(out,'js')).filter(f=>f.endsWith('.mjs'))){
 let s=fs.readFileSync(f,'utf8').replaceAll("from '/shared/","from '../shared/");
 fs.writeFileSync(f,s);
}
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
html=html.replace('Usá Abrir.command para iniciar el servidor local.','Cargando la interfaz completa. No se conectan wallets ni se envían transacciones.').replace('Pulp necesita JavaScript y su servidor local. Abrí Abrir.command.','Pulp necesita JavaScript para mostrar esta presentación.');
// Each deployment changes the asset URL, including on Safari. Assets remain relative to the project base.
const version=process.env.GITHUB_SHA?.slice(0,12)||'unified-4-1';
html=html.replace(/(href|src)="((?:css|js)\/[^"?]+)"/g,(_,a,url)=>`${a}="${url}?v=${version}"`);
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({edition:'Pulp White · Unified presentation',mode:'presentation',source:'public/',commit:process.env.GITHUB_SHA||null,financialActions:false},null,2));
console.log('Pulp: public/ + shared/ → _site. Presentation transport, no wallet driver, no secrets.');
