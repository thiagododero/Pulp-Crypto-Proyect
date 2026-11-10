/* Optional test utility: transpiles the SAME app modules for offline browser testing.
   It does not ship in the production artifact or change the app implementation. */
const fs=require('node:fs'),path=require('node:path');
const ts=require(process.env.PULP_TYPESCRIPT||'typescript');
const root=path.resolve(__dirname,'..'), src=path.join(root,'_site'), out=path.join(__dirname,'.generated');
fs.mkdirSync(out,{recursive:true});
const list=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(d,e.name)):[path.join(d,e.name)]);
let bundle='(()=>{const modules={},cache={};\n';
for(const file of [...list(path.join(src,'js')),...list(path.join(src,'shared'))].filter(x=>x.endsWith('.mjs'))){
 let code=fs.readFileSync(file,'utf8');
 code=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 bundle+='modules['+JSON.stringify('/'+path.relative(src,file))+']=function(require,exports,module){\n'+code+'\n};\n';
}
bundle+=`function normalize(p){const a=[];for(const v of p.split('/')){if(v==='..')a.pop();else if(v&&v!=='.')a.push(v);}return '/'+a.join('/');}function load(p,from='/'){p=p.split('?')[0];const key=p[0]==='/'?p:normalize(from.slice(0,from.lastIndexOf('/')+1)+p);if(cache[key])return cache[key].exports;if(!modules[key])throw Error('Test module missing '+key);const m={exports:{}};cache[key]=m;modules[key](s=>load(s,key),m.exports,m);return m.exports;}window.__testLoad=load;load('/js/app.mjs');})();`;
fs.writeFileSync(path.join(out,'product-bundle.js'),bundle);
console.log('Offline test bundle built from _site');
