import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {spawn} from 'node:child_process';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('Presentation launcher binds loopback, selects a free port and exposes no API/secrets',async()=>{
 const occupied=http.createServer((q,r)=>r.end('occupied'));await new Promise(r=>occupied.listen(0,'127.0.0.1',r));const port=occupied.address().port;
 const child=spawn(process.execPath,['scripts/preview-server.mjs'],{cwd:root,env:{...process.env,PULP_PREVIEW_PORT:String(port)}});let log='';child.stdout.on('data',c=>log+=c);
 try{for(let i=0;i<100&&!log.includes('http://');i++)await new Promise(r=>setTimeout(r,50));const url=log.match(/http:\/\/127\.0\.0\.1:(\d+)/)?.[0];assert.ok(url,log);assert.notEqual(url,`http://127.0.0.1:${port}`);
 for(const[p,status]of [['/',200],['/js/app.mjs',200],['/css/product.css',200],['/assets/white/pulp-hero.webp',200],['/.env',404],['/api/boot',404],['/%2e%2e/%2e%2e/etc/passwd',404]]){const r=await fetch(url+p);assert.equal(r.status,status,p)}
 const post=await fetch(url+'/api/swap/prepare',{method:'POST',body:'{}'});assert.equal(post.status,405);
 const module=await fetch(url+'/js/product-ui.mjs');assert.match(module.headers.get('content-type'),/javascript/);assert.match(module.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 }finally{child.kill();await new Promise(r=>occupied.close(r));}
});
