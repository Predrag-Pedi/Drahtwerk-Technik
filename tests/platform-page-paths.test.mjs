import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolve} from 'node:path';
import {openDatabase} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {digest} from '../server/security.mjs';

test('HTML pages recover from trailing slashes without losing authentication or query parameters',async t=>{
 const db=openDatabase(':memory:'),root=resolve(import.meta.dirname,'..'),now=Date.now();
 db.prepare('INSERT INTO users(id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,0,?)').run('dev','dev','Developer','developer','{}','unused',new Date(now).toISOString());
 db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest('page-test'),'dev',null,'csrf',now+3600000,now);
 const app=createApp({db,root,origin:'http://localhost'});let legacyRedirect=false;
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(legacyRedirect&&url.pathname==='/portal.html'&&!url.searchParams.has('sb_page_path')){
   res.writeHead(301,{Location:url.pathname+'/'+url.search,'Cache-Control':'public, max-age=3600'});res.end();return;
  }
  app.emit('request',req,res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();});
 const request=(path,{method='GET',authenticated=true}={})=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{Host:'localhost',...(authenticated?{Cookie:'test-session=page-test'}:{})}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString()}));
  });req.on('error',reject);req.end();
 });
 await t.test('the reported support return URL opens the requested portal section',async()=>{
  const response=await request('/portal.html/?section=users');assert.equal(response.status,307);assert.equal(response.headers['cache-control'],'no-store');
  const target=new URL(response.headers.location,'http://localhost');assert.equal(target.pathname,'/portal.html');assert.equal(target.searchParams.get('section'),'users');
  const page=await request(target.pathname+target.search);assert.equal(page.status,200);assert.match(page.headers['content-type'],/^text\/html/);assert.match(page.text,/platform\/portal.mjs/);assert.match(page.text,/schaltbase-session/);
 });
 await t.test('multiple and encoded slashes preserve the query and work for HEAD',async()=>{
  for(const path of ['/portal.html//?section=users&note=a%20b','/portal.html%2F?section=users&note=a%20b']){
   const response=await request(path,{method:'HEAD'});assert.equal(response.status,307,path);assert.equal(response.text,'');
   const target=new URL(response.headers.location,'http://localhost');assert.equal(target.pathname,'/portal.html');assert.equal(target.searchParams.get('section'),'users');assert.equal(target.searchParams.get('note'),'a b');
   const page=await request(target.pathname+target.search,{method:'HEAD'});assert.equal(page.status,200);assert.equal(page.text,'');
  }
 });
 await t.test('a cached permanent redirect cannot loop back to the broken URL',async()=>{
  legacyRedirect=true;
  try{
   let path='/portal.html?section=users',response;
   for(let hops=0;hops<4;hops++){
    response=await request(path);if(!response.headers.location)break;path=response.headers.location;
   }
   assert.equal(response.status,200);const target=new URL(path,'http://localhost');assert.equal(target.pathname,'/portal.html');assert.equal(target.searchParams.get('section'),'users');assert.equal(target.searchParams.get('sb_page_path'),'1');
  }finally{legacyRedirect=false;}
 });
 await t.test('dashboard, tool and public pages use the same canonical handling',async()=>{
  for(const path of ['/index.html/','/regierapport.html/','/home.html/','/produkte/schema.html/']){
   const response=await request(path);assert.equal(response.status,307,path);assert.equal((await request(response.headers.location)).status,200,path);
  }
 });
 await t.test('protected pages still require a session and tool permissions',async()=>{
  for(const path of ['/portal.html/?section=users','/index.html/','/regierapport.html/']){
   const response=await request(path,{authenticated:false});assert.equal(response.status,302,path);assert.equal(response.headers.location,'/login.html');assert.doesNotMatch(response.text,/schaltbase-session/);
  }
  db.prepare("UPDATE users SET role='member' WHERE id='dev'").run();
  try{assert.equal((await request('/regierapport.html/')).status,403);}finally{db.prepare("UPDATE users SET role='developer' WHERE id='dev'").run();}
 });
 await t.test('missing files, private source and directories are not redirected or exposed',async()=>{
  for(const path of ['/unknown.html/','/produkte/missing.html/','/server/app.mjs/','/platform/','/portal.html/other','/platform/%2e%2e/server/app.mjs/','/portal.html%2Fother/']){
   const response=await request(path);assert.equal(response.status,404,path);assert.equal(response.headers.location,undefined,path);
  }
 });
});
