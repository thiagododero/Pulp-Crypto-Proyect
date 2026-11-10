import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function execute({head='a'.repeat(40),corrupt=false,answer='',remove=false,alterDelete=false,unsafeDelete=false}={}){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pulp-updater-test-')),source=path.join(temp,'source'),bin=path.join(temp,'bin');
 fs.mkdirSync(path.join(source,'scripts'),{recursive:true});fs.mkdirSync(bin);
 fs.copyFileSync(path.join(root,'scripts/publish-update.mjs'),path.join(source,'scripts/publish-update.mjs'));
 const value='test-only source\n';
 fs.writeFileSync(path.join(source,'fixture.txt'),corrupt?'modified':value);
 fs.writeFileSync(path.join(source,'UPDATE_MANIFEST.json'),JSON.stringify({baseCommit:'a'.repeat(40),files:[{path:'fixture.txt',sha256:crypto.createHash('sha256').update(value).digest('hex')}],deletedFiles:remove?[{path:unsafeDelete?'../retired.txt':'retired.txt',sha256:crypto.createHash('sha256').update(alterDelete?'changed':'retired module').digest('hex')}]:[]}));
 const fake=`#!${process.execPath}\nconst fs=require('fs'),path=require('path');const a=process.argv.slice(2);fs.appendFileSync(process.env.PULP_GIT_TEST_LOG,JSON.stringify(a)+'\\n');if(a[0]==='clone'){const d=a.at(-1);fs.mkdirSync(path.join(d,'scripts'),{recursive:true});fs.mkdirSync(path.join(d,'tests'));fs.writeFileSync(path.join(d,'tools-check.mjs'),'');fs.writeFileSync(path.join(d,'scripts/build-pages.mjs'),'');fs.writeFileSync(path.join(d,'tests/fixture.test.mjs'),'import test from "node:test";test("fixture",()=>{});');fs.writeFileSync(path.join(d,'retired.txt'),'retired module');fs.writeFileSync(process.env.PULP_GIT_TEST_DIR,d);}if(a[0]==='rev-parse')console.log(process.env.PULP_GIT_TEST_HEAD);if(a[0]==='var')console.log('test-only identity');`;
 const git=path.join(bin,'git');fs.writeFileSync(git,fake,{mode:0o755});
 const log=path.join(temp,'git.jsonl'),cloned=path.join(temp,'clone-path');
 const result=spawnSync(process.execPath,[path.join(source,'scripts/publish-update.mjs')],{cwd:source,input:answer+'\n',encoding:'utf8',timeout:10000,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,PULP_GIT_TEST_LOG:log,PULP_GIT_TEST_DIR:cloned,PULP_GIT_TEST_HEAD:head}});
 const calls=fs.existsSync(log)?fs.readFileSync(log,'utf8').trim().split('\n').map(x=>JSON.parse(x)):[];
 const dir=fs.existsSync(cloned)?fs.readFileSync(cloned,'utf8'):null;
 const content=dir&&fs.existsSync(path.join(dir,'fixture.txt'))?fs.readFileSync(path.join(dir,'fixture.txt'),'utf8'):null;
 const retiredExists=!!dir&&fs.existsSync(path.join(dir,'retired.txt'));
 if(dir)fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(temp,{recursive:true,force:true});
 return {...result,calls,content,retiredExists};
}
test('Updater refuses a different remote head; no commit or push',()=>{const r=execute({head:'b'.repeat(40)});assert.equal(r.status,1);assert.match(r.stderr,/cambió/);assert.equal(r.content,null);assert.ok(!r.calls.some(a=>['commit','push'].includes(a[0])));});
test('Updater refuses altered source hashes; no commit or push',()=>{const r=execute({corrupt:true});assert.equal(r.status,1);assert.match(r.stderr,/modificado/);assert.ok(!r.calls.some(a=>['commit','push'].includes(a[0])));});
test('Updater cancellation prepares changes but never commits or pushes',()=>{const r=execute();assert.equal(r.status,0,r.stderr);assert.equal(r.content,'test-only source\n');assert.ok(!r.calls.some(a=>['commit','push'].includes(a[0])));});
test('Updater explicit confirmation targets the same main branch without force (fake Git only)',()=>{const r=execute({answer:'PUBLICAR'});assert.equal(r.status,0,r.stderr);const push=r.calls.filter(a=>a[0]==='push');assert.deepEqual(push,[['push','origin','HEAD:main']]);assert.ok(!r.calls.flat().includes('--force'));assert.equal(r.calls.filter(a=>a[0]==='commit').length,1);});

test('Updater removes verified retired files and stages deletions (fake Git only)',()=>{const r=execute({remove:true,answer:'PUBLICAR'});assert.equal(r.status,0,r.stderr);assert.equal(r.retiredExists,false);const add=r.calls.find(a=>a[0]==='add');assert.ok(add.includes('--all'));assert.ok(add.includes('retired.txt'));assert.deepEqual(r.calls.filter(a=>a[0]==='push'),[['push','origin','HEAD:main']]);});
test('Updater preserves changed retired files and refuses to push',()=>{const r=execute({remove:true,alterDelete:true,answer:'PUBLICAR'});assert.equal(r.status,1);assert.equal(r.retiredExists,true);assert.ok(!r.calls.some(a=>['push','commit'].includes(a[0])));});
test('Updater rejects traversal in removal paths without deleting or pushing',()=>{const r=execute({remove:true,unsafeDelete:true,answer:'PUBLICAR'});assert.equal(r.status,1);assert.equal(r.retiredExists,true);assert.ok(!r.calls.some(a=>['push','commit'].includes(a[0])));});
