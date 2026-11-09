// Developer test utility only. Optional dependency: TypeScript (not required by Pulp).
const fs = require('fs'), path = require('path'), ts = require(process.env.PULP_TYPESCRIPT || 'typescript');
const root = path.resolve(__dirname, '..'), files = { '/shared/solana.mjs': 'shared/solana.mjs', '/js/api.mjs': 'public/js/api.mjs', '/js/wallet.mjs': 'public/js/wallet.mjs', '/js/views.mjs': 'public/js/views.mjs', '/js/app.mjs': 'public/js/app.mjs', '/js/v4-ui.mjs':'public/js/v4-ui.mjs' };
function inlineAssets(s) { return s.replace(/assets\/(?:brand|art)\/[a-zA-Z0-9_-]+\.(?:svg|webp|png)/g, ref => { const file = path.join(root, 'public', ref); if (!fs.existsSync(file))
    return ref; const ext = path.extname(file); return 'data:' + ({ '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' }[ext]) + ';base64,' + fs.readFileSync(file).toString('base64'); }); }
const target = path.join(__dirname, '.generated');
fs.mkdirSync(target, { recursive: true });
let out = '(()=>{const modules={};const cache={};\n';
for (const [key, file] of Object.entries(files)) {
    const source = inlineAssets(fs.readFileSync(path.join(root, file), 'utf8'));
    const c = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    out += 'modules[' + JSON.stringify(key) + ']=function(require,exports,module){\n' + c + '\n};\n';
}
out += `function normalize(p){const parts=[];for(const part of p.split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}return '/'+parts.join('/');}function load(p,from='/'){const key=p[0]==='/'?p:normalize(from.slice(0,from.lastIndexOf('/')+1)+p);if(cache[key])return cache[key].exports;if(!modules[key])throw Error('Test module missing '+key);const module={exports:{}};cache[key]=module;modules[key](s=>load(s,key),module.exports,module);return module.exports;}window.__testSolana=load('/shared/solana.mjs');load('/js/app.mjs');})();`;
fs.writeFileSync(path.join(target, 'bundle.js'), out);
fs.writeFileSync(path.join(target, 'components.js'), inlineAssets(fs.readFileSync(path.join(root, 'public/js/ui.js'), 'utf8')));
