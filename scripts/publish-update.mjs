/** Updates the SAME GitHub repository from a fresh local clone using your Git credentials.
 * Never force-pushes, changes repository visibility, installs packages, or uploads secrets.
 */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import readline from 'node:readline/promises';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'UPDATE_MANIFEST.json'),'utf8'));
const repo='https://github.com/thiagododero/Pulp-Crypto-Proyect.git';
function validPath(p) { return typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.includes('\\') && !p.split('/').includes('..') && !p.includes('\0') && !/^(\.env$|node_modules\/|\.git\/)/.test(p); }
const ask=readline.createInterface({input:process.stdin,output:process.stdout});
const run=(args,cwd)=>execFileSync('git',args,{cwd,stdio:'inherit'});
try{
 console.log('\nPulp · actualizar el mismo proyecto\nRepositorio: thiagododero/Pulp-Crypto-Proyect\nRama: main\nNo se emite PULP ni se habilitan wallets.\n');
 console.log('Se necesita tu autenticación Git de este Mac. No ingreses claves API ni frases semilla.');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pulp-reviewed-update-'));
 run(['clone','--depth','1','--branch','main',repo,dir]);
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:dir,encoding:'utf8'}).trim();
 if(head!==manifest.baseCommit)throw Error('El repositorio cambió desde la revisión. No se sobrescribió ni publicó nada. Revisá el parche antes de aplicarlo. Clon: '+dir);
 for(const item of manifest.files){
  if(!validPath(item.path))throw Error('Ruta no admitida: '+item.path);
  const data=fs.readFileSync(path.join(source,item.path));
  if(crypto.createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('El archivo fue modificado después de la revisión: '+item.path);
  const dest=path.join(dir,item.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data,{mode:item.executable?0o755:0o644});
 }
 const deletions=manifest.deletedFiles||[];
 // Verify each retired file before deleting it; never delete a directory or follow symlinks.
 for(const item of deletions){
  if(!validPath(item.path))throw Error('Ruta de eliminación no admitida: '+item.path);
  const dest=path.join(dir,item.path);
  if(!fs.existsSync(dest))throw Error('El archivo a retirar no existe en la revisión base: '+item.path);
  const stat=fs.lstatSync(dest);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error('Solo se retiran archivos regulares: '+item.path);
  if(crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')!==item.sha256)throw Error('El archivo a retirar cambió: '+item.path);
 }
 for(const item of deletions)fs.unlinkSync(path.join(dir,item.path));
 fs.writeFileSync(path.join(dir,'UPDATE_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 run(['add','--all','--',...manifest.files.map(f=>f.path),...deletions.map(f=>f.path),'UPDATE_MANIFEST.json'],dir);
 run(['diff','--cached','--stat'],dir);
 console.log('\nComprobando sintaxis, recursos, pruebas y build…');
 execFileSync(process.execPath,['tools-check.mjs'],{cwd:dir,stdio:'inherit'});
 const tests=fs.readdirSync(path.join(dir,'tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>'tests/'+x);
 execFileSync(process.execPath,['--test',...tests],{cwd:dir,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/build-pages.mjs'],{cwd:dir,stdio:'inherit'});
 const answer=await ask.question('\n¿Crear un commit y subir estos cambios a main? Escribí PUBLICAR: ');
 if(answer.trim()!=='PUBLICAR'){console.log('Sin publicar. Copia preparada en '+dir);process.exitCode=0;}
 else{
  // Configure identity only in the disposable clone when no Git author is configured.
  try{execFileSync('git',['var','GIT_AUTHOR_IDENT'],{cwd:dir,stdio:'pipe'});}catch{run(['config','user.name','Thiago Dodero'],dir);run(['config','user.email','84884078+thiagododero@users.noreply.github.com'],dir);}
  run(['commit','-m','feat(crypto): publish Pulp White redesign and remove creative studio'],dir);
  run(['push','origin','HEAD:main'],dir);
  console.log('\nCommit enviado. GitHub Actions procesará Pages en el MISMO repositorio.');
  console.log('Revisá: https://github.com/thiagododero/Pulp-Crypto-Proyect/actions/workflows/pages.yml');
  console.log('La publicación solo está confirmada cuando ese workflow finaliza correctamente.');
 }
}catch(e){console.error('\nNo se completó la publicación: '+e.message);console.error('No se forzó ninguna rama. La conexión de ChatGPT no autentica Git en tu Mac.');process.exitCode=1;}finally{ask.close();}
