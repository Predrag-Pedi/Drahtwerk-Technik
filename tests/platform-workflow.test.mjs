import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {openDatabase,saveObject} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {passwordHash,token,digest,loginIdentifier} from '../server/security.mjs';
import {emptyProfile,permissionsFor} from '../platform/model.mjs';

test('landing, username login, developer workspace and individual tool rights through the HTTPS tunnel',async t=>{
 const db=openDatabase(':memory:'),password=token(),origin='https://test-space-4173.app.github.dev';
 db.prepare("INSERT INTO users(id,company_id,email,name,role,permissions,password,enabled,must_change,created_at) VALUES ('root',NULL,'predrag.test','Test Entwickler','developer','{}',?,1,0,?)").run(await passwordHash(password),new Date().toISOString());
 const server=createApp({db,root:resolve(import.meta.dirname,'..'),origin,codespaceProxyPort:4173});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${server.address().port}`;
 async function request(path,method='GET',body,auth={},extra={}){return new Promise((resolve,reject)=>{const req=http.request(endpoint+path,{method,headers:{Host:'localhost:4173','X-Forwarded-Host':'test-space-4173.app.github.dev','X-Forwarded-Proto':'https',Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...auth,...extra}},r=>{const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>{const raw=Buffer.concat(chunks).toString(),headers={get:key=>Array.isArray(r.headers[key])?r.headers[key].join(';'):r.headers[key]};resolve({status:r.statusCode,headers,data:r.headers['content-type']?.includes('application/json')?JSON.parse(raw):raw});});});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});}
 try{
  await t.test('anonymous visitors see the landing and login, but no dashboard or management page',async()=>{
   const home=await request('/');assert.equal(home.status,200);assert.match(home.data,/<title>SchaltBase/);assert.match(home.data,/data-demo="dispo"/);assert.match(home.data,/data-demo="offers"/);
   for(const [path,type] of [['/platform/home-demo.mjs','text/javascript'],['/platform/home.css','text/css'],['/platform/brand.css','text/css'],['/platform/demo-dispo.svg','image/svg+xml'],['/platform/demo-schema.svg','image/svg+xml'],['/platform/schaltbase-icon.png','image/png']]){const asset=await request(path);assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),type);}
   assert.equal(JSON.parse((await request('/manifest.webmanifest')).data).name,'SchaltBase');
   assert.match((await request('/login.html')).data,/Benutzername oder E-Mail/);
   for(const path of ['/index.html','/portal.html','/cad.html','/offerten.html']){const r=await request(path);assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/login.html');}
   assert.equal((await request('/',undefined,undefined,{}, {'X-Forwarded-Host':'foreign.test'})).status,400);
  });
  const login=await request('/api/login','POST',{identifier:'Predrag.Test',password});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/__Host-session=.*HttpOnly; SameSite=Strict;.*Secure/);
  const auth={Cookie:login.headers.get('set-cookie').split(';')[0]};const state=(await request('/api/session','GET',undefined,auth)).data;
  Object.assign(auth,{'X-CSRF-Token':state.csrf,'X-User-Id':state.user.id,'X-Company-Id':state.company.id});
  await t.test('developer enters the existing dashboard and can work without a customer tenant',async()=>{
   assert.equal(state.user.username,'predrag.test');assert.equal(state.user.email,'');assert.equal(state.company.internalWorkspace,true);assert.equal(state.company.profile.name,'');
   assert.ok(Object.values(state.permissions).every(v=>v==='write'));
   assert.match((await request('/index.html','GET',undefined,auth)).data,/Schienenrechner/);
   assert.equal((await request('/api/records/cad/own','PUT',{revision:0,value:{title:'Own project'}},auth)).status,200);
   assert.equal((await request('/api/admin','GET',undefined,auth)).data.companies.length,0);
   assert.equal((await request('/api/records/cad/spoof','PUT',{revision:0,value:{}},auth,{Origin:'https://foreign.test'})).status,403);
  });
  const company={id:'example',name:'Beispiel AG',planId:'komplett',startsOn:'2000-01-01',endsOn:'9999-12-31',enabled:true,seats:4,profile:emptyProfile()};saveObject(db,'companies',company);
  await t.test('operator creates unique usernames within a company, never another developer',async()=>{
   const body={identifier:'firma.mitarbeiter',name:'Beispiel Mitarbeiter',companyId:company.id,role:'member',permissions:{rails:'read',cad:'write'}};
   const made=await request('/api/admin/users','POST',body,auth);assert.equal(made.status,201);assert.equal(made.data.user.username,body.identifier);assert.equal(made.data.user.companyId,company.id);
   assert.equal((await request('/api/admin/users','POST',{...body,identifier:'FIRMA.MITARBEITER'},auth)).status,409);
   assert.equal((await request('/api/admin/users','POST',{...body,identifier:'another.user',role:'developer'},auth)).status,400);
   assert.equal((await request('/api/admin/users','POST',{...body,identifier:'another.user',companyId:state.company.id},auth)).status,404);
  });
  await t.test('employee and company admin restrictions survive direct requests and email-like names',async()=>{
   for(const [id,role] of [['staff','member'],['manager','admin']])db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,enabled,must_change,created_at) VALUES (?,?,?,?,?,?,?,1,0,?)').run(id,company.id,id==='staff'?'developer@example.test':'manager.test',id,role,JSON.stringify({rails:'read',wires:'read',cad:'read'}),'unused',new Date().toISOString());
   const sessionFor=id=>{const sid=token();db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest(sid),id,company.id,'csrf',Date.now()+3600000,Date.now());return {Cookie:'__Host-session='+sid,'X-CSRF-Token':'csrf','X-Company-Id':company.id,'X-User-Id':id};};
   const staff=sessionFor('staff'),manager=sessionFor('manager');
   assert.equal((await request('/api/session','GET',undefined,staff)).data.user.role,'member');
   assert.equal((await request('/schienenrechner.html','GET',undefined,staff)).status,200);
   assert.equal((await request('/technik.html','GET',undefined,staff)).status,200);
   for(const path of ['/ew.html','/drahtfarben.html','/api/admin','/api/company/users'])assert.equal((await request(path,'GET',undefined,staff)).status,403);
   assert.equal((await request('/api/records/cad/own','GET',undefined,staff)).data.value,null);
   assert.equal((await request('/api/session/company','POST',{companyId:state.company.id},staff)).status,403);
   assert.equal((await request('/api/company/users/staff','PATCH',{role:'admin',enabled:true,permissions:{rails:'read'}},manager)).status,403);
   assert.equal((await request('/api/company/users/staff','PATCH',{role:'member',enabled:true,permissions:{ew:'read'}},manager)).status,200);
   assert.equal((await request('/api/session','GET',undefined,staff)).status,401);
   const fresh=sessionFor('staff');assert.equal((await request('/schienenrechner.html','GET',undefined,fresh)).status,403);assert.equal((await request('/ew.html','GET',undefined,fresh)).status,200);assert.equal((await request('/technik.html','GET',undefined,fresh)).status,403);
  });
 }finally{await new Promise(r=>server.close(r));db.close();}
});
test('username validation and legacy workshop permissions preserve only licensed access',()=>{
 assert.equal(loginIdentifier('  Test.Name-1  '),'test.name-1');assert.equal(loginIdentifier('TEST@EXAMPLE.TEST'),'test@example.test');
 for(const v of ['x','<script>','a b','a/b','äbc','@no'])assert.throws(()=>loginIdentifier(v));
 const c={enabled:true,startsOn:'2000-01-01',endsOn:'9999-12-31'},u={role:'member',permissions:{workshop:'write',ew:'none'}};
 assert.equal(permissionsFor(u,c,{modules:['workshop']}).rails,'write');assert.equal(permissionsFor(u,c,{modules:['workshop']}).ew,'none');assert.equal(permissionsFor(u,c,{modules:['cad']}).rails,'none');
});
