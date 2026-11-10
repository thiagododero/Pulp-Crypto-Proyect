/** Local presentation only. No APIs, secrets, wallet provider, or public listen address. */
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn,execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!fs.existsSync(path.join(root,'_site/index.html')))execFileSync(process.execPath,[path.join(root,'scripts/build-pages.mjs')],{stdio:'inherit'});
const site=path.join(root,'_site');const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Solo lectura');}
 try{
  const u=new URL(req.url,'http://localhost');const rel=decodeURIComponent(u.pathname),f=path.resolve(site,'.'+(rel==='/'?'/index.html':rel));
  if(!f.startsWith(site+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()||!fs.realpathSync(f).startsWith(fs.realpathSync(site)+path.sep)){res.writeHead(404);return res.end('No encontrado');}
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
  if(req.method==='HEAD')return res.end();fs.createReadStream(f).pipe(res);
 }catch{res.writeHead(400);res.end('Solicitud inválida');}
});
let port=Number(process.env.PULP_PREVIEW_PORT||4173),tries=0;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&tries++<30){port++;return server.listen(port,'127.0.0.1')}console.error(e.message);process.exit(1)});
server.on('listening',()=>{const url=`http://127.0.0.1:${port}/#/home`;console.log(`\nPulp · Product Refinement\n${url}\nVista de producto con datos de muestra. Ninguna operación financiera habilitada.\nCtrl+C para cerrar.\n`);if(process.argv.includes('--open')){const cmd=process.platform==='darwin'?'open':process.platform==='win32'?'explorer':'xdg-open';const child=spawn(cmd,[url],{stdio:'ignore'});child.on('error',()=>console.log('Abrí el enlace anterior en tu navegador.'));child.unref();}});
server.listen(port,'127.0.0.1');
