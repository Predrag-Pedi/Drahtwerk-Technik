import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolve} from 'node:path';
import {validRequestOrigin} from '../server/request-host.mjs';
import {createApp} from '../server/app.mjs';
import {openDatabase} from '../server/db.mjs';
import {passwordHash,token} from '../server/security.mjs';

const allowed=new URL('https://test-space-4173.app.github.dev');
const forwarded={host:'localhost:4173',origin:'https://localhost:4173','x-forwarded-host':allowed.host,'x-forwarded-proto':'https','sec-fetch-site':'same-origin',referer:allowed.origin+'/login.html'};

test('Codespaces rewritten Origin needs the trusted tunnel and independent browser source evidence',()=>{
 const req={headers:forwarded,socket:{remoteAddress:'127.0.0.1'}};
 assert.equal(validRequestOrigin(req,allowed,4173),true);
 assert.equal(validRequestOrigin(req,allowed),false);
 assert.equal(validRequestOrigin({...req,socket:{remoteAddress:'10.0.0.2'}},allowed,4173),false);
 for(const patch of [
  {host:allowed.host},{host:'localhost:9999'},
  {origin:undefined},{origin:'null'},{origin:'http://localhost:4173'},
  {origin:'https://localhost:9999'},{origin:'https://attacker.test'},
  {'x-forwarded-host':undefined},{'x-forwarded-host':'attacker.test'},
  {'x-forwarded-host':allowed.host+', attacker.test'},{'x-forwarded-proto':'http'},
  {'sec-fetch-site':undefined},{'sec-fetch-site':'cross-site'},
  {'sec-fetch-site':'same-site'},{'sec-fetch-site':'none'},
  {referer:undefined},{referer:'not a URL'},{referer:'https://attacker.test/login.html'},
  {referer:'https://other-space-4173.app.github.dev/login.html'},
  {referer:allowed.origin+':4430/login.html'},
  {referer:'https://user@'+allowed.host+'/login.html'}
 ])assert.equal(validRequestOrigin({...req,headers:{...forwarded,...patch}},allowed,4173),false,JSON.stringify(patch));
});

test('ordinary deployment still requires its exact configured Origin',()=>{
 for(const origin of [allowed.origin,'https://portal.example.test','http://127.0.0.1:4173']){
  const url=new URL(origin),req={headers:{origin},socket:{remoteAddress:'10.0.0.2'}};
  assert.equal(validRequestOrigin(req,url),true);
  assert.equal(validRequestOrigin({...req,headers:{...forwarded}},url),false);
  assert.equal(validRequestOrigin({...req,headers:{origin:origin+'/'}},url),false);
 }
});

test('login, session, CSRF and logout work through the observed Codespaces header rewrite',async()=>{
 const db=openDatabase(':memory:'),password=token();
 db.prepare("INSERT INTO users VALUES ('dev',NULL,'developer@example.test','Test Developer','developer','{}',?,1,0,?)").run(await passwordHash(password),new Date().toISOString());
 const app=createApp({db,root:resolve(import.meta.dirname,'..'),origin:allowed.origin,codespaceProxyPort:4173});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+app.address().port;
 const request=(path,method='GET',body,headers={})=>new Promise((resolve,reject)=>{
  const req=http.request(address+path,{method,headers:{...forwarded,...(body?{'Content-Type':'application/json'}:{}),...headers}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:{get:key=>Array.isArray(res.headers[key])?res.headers[key].join(';'):res.headers[key]},json:async()=>JSON.parse(Buffer.concat(chunks).toString())}));
  });req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
 try{
  const payload={identifier:'developer@example.test',password};
  assert.equal((await request('/api/login','POST',payload,{'sec-fetch-site':'cross-site'})).status,403);
  assert.equal((await request('/api/login','POST',payload,{referer:'https://attacker.test/'})).status,403);
  const login=await request('/api/login','POST',payload);
  assert.equal(login.status,200);
  const cookieHeader=login.headers.get('set-cookie');
  assert.match(cookieHeader,/__Host-session=/);assert.match(cookieHeader,/HttpOnly/);assert.match(cookieHeader,/Secure/);assert.match(cookieHeader,/SameSite=Strict/);
  const Cookie=cookieHeader.split(';')[0];
  const session=await (await request('/api/session','GET',undefined,{Cookie})).json();
  assert.equal(session.user.role,'developer');
  assert.equal((await request('/index.html','GET',undefined,{Cookie})).status,200);
  assert.equal((await request('/api/logout','POST',{}, {Cookie})).status,403);
  assert.equal((await request('/api/logout','POST',{}, {Cookie,'X-CSRF-Token':'wrong'})).status,403);
  const auth={Cookie,'X-CSRF-Token':session.csrf};
  assert.equal((await request('/api/logout','POST',{}, {...auth,origin:'https://attacker.test'})).status,403);
  assert.equal((await request('/api/logout','POST',{},auth)).status,200);
  assert.equal((await request('/api/session','GET',undefined,{Cookie})).status,401);
 }finally{await new Promise(resolve=>app.close(resolve));db.close();}
});
