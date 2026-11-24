import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {openDatabase} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';

test('script URLs recover from trailing slashes and previously cached redirects',async t=>{
 const db=openDatabase(':memory:'),root=resolve(import.meta.dirname,'..');
 const reserved=net.createServer();await new Promise(r=>reserved.listen(0,'127.0.0.1',r));const port=reserved.address().port;await new Promise(r=>reserved.close(r));
 const origin=`http://127.0.0.1:${port}`,app=createApp({db,root,origin});let legacyRedirect=false;
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,origin);
  // Emulate an old browser/proxy redirect for the original unversioned URL.
  if(legacyRedirect&&url.pathname.startsWith('/platform/')&&url.pathname.endsWith('.mjs')&&!url.searchParams.has('sb_module_path')){
   res.writeHead(301,{Location:url.pathname+'/'+url.search,'Cache-Control':'public, max-age=3600'});res.end();return;
  }
  app.emit('request',req,res);
 });
 await new Promise(r=>server.listen(port,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));db.close();});
 await t.test('a script is never served with a directory-like response URL',async()=>{
  for(const path of ['/platform/client.mjs/','/platform/account-menu.mjs//','/ui/navigation.js/','/platform/client.mjs%2F']){
   const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,307,path);assert.equal(response.headers.get('cache-control'),'no-store');
   const target=new URL(response.headers.get('location'),origin);assert.equal(target.pathname,path.replace(/(?:\/|%2f)+$/gi,''));assert.equal(target.origin,origin);assert.equal(target.searchParams.get('sb_module_path'),'1');
  }
 });
 await t.test('relative imports use the script folder after following a cached 301',async()=>{
  legacyRedirect=true;
  try{for(const [path,dependency] of [['client.mjs','./model.mjs'],['account-menu.mjs','./workshop-model.mjs']]){
   const response=await fetch(origin+'/platform/'+path);assert.equal(response.status,200);
   assert.equal(new URL(response.url).pathname,'/platform/'+path);assert.equal(new URL(dependency,response.url).pathname,'/platform/'+dependency.slice(2));
   assert.equal(await response.text(),await readFile(resolve(root,'platform',path),'utf8'));
  }}finally{legacyRedirect=false;}
 });
 await t.test('existing query parameters and HEAD requests survive canonicalization',async()=>{
  const response=await fetch(origin+'/platform/client.mjs/?v=previous&option=a%20b',{method:'HEAD',redirect:'manual'});assert.equal(response.status,307);assert.equal(await response.text(),'');
  const target=new URL(response.headers.get('location'),origin);assert.equal(target.searchParams.get('v'),'previous');assert.equal(target.searchParams.get('option'),'a b');
  const canonical=await fetch(target,{method:'HEAD'});assert.equal(canonical.status,200);assert.equal(canonical.headers.get('content-type'),'text/javascript');assert.equal(await canonical.text(),'');
 });
 await t.test('invalid nested imports, private source and directories stay inaccessible',async()=>{
  for(const path of ['/platform/client.mjs/model.mjs','/platform/account-menu.mjs/workshop-model.mjs','/platform/no-such-file.mjs/','/platform/','/server/app.mjs/','/platform/%2e%2e/server/app.mjs/']){
   const response=await fetch(origin+path,{redirect:'manual'});assert.equal(response.status,404,path);assert.equal(response.headers.get('location'),null);
  }
  const protectedFile=await fetch(origin+'/cad/app.mjs/',{redirect:'manual'});assert.equal(protectedFile.status,302);assert.equal(protectedFile.headers.get('location'),'/login.html');
 });
});
