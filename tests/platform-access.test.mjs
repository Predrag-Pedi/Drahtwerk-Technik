import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {openDatabase} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {passwordHash,passwordMatches,token} from '../server/security.mjs';
const root=resolve(import.meta.dirname,'..');
test('company platform enforces identity, tenant boundaries, licences and concurrent saves',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'portal-test-')),path=join(dir,'test.sqlite'),db=openDatabase(path),password=token();
 db.prepare("INSERT INTO users(id,company_id,email,name,role,permissions,password,enabled,must_change,created_at) VALUES ('dev',NULL,'developer@example.test','Test Developer','developer','{}',?,1,0,?)").run(await passwordHash(password),new Date().toISOString());
 const reserved=net.createServer();await new Promise(r=>reserved.listen(0,'127.0.0.1',r));const port=reserved.address().port;await new Promise(r=>reserved.close(r));const origin=`http://127.0.0.1:${port}`;let now=Date.now();const server=createApp({db,root,origin,clock:()=>now});await new Promise(r=>server.listen(port,'127.0.0.1',r));
 async function request(path,method='GET',body,auth=null,headers={}){const res=await fetch(origin+path,{method,redirect:'manual',headers:{Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf||'','X-Company-Id':auth.companyId||'','X-User-Id':auth.userId||''}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});const text=await res.text();return {status:res.status,data:res.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text,headers:res.headers};}
 async function login(email,pw){const r=await request('/api/login','POST',{email,password:pw});assert.equal(r.status,200);const auth={cookie:r.headers.get('set-cookie').split(';')[0]},s=await request('/api/session','GET',undefined,auth);Object.assign(auth,{csrf:s.data.csrf,userId:s.data.user.id,companyId:s.data.company?.id});return auth;}
 async function pausedUpload(path,payload,auth){
  let started;const incoming=new Promise(resolve=>{started=resolve;});
  const onRequest=req=>{if(req.url===path&&req.method==='PUT'){server.off('request',onRequest);req.once('data',started);}};server.on('request',onRequest);
  const raw=JSON.stringify(payload);let requestHandle;
  const response=new Promise((resolve,reject)=>{requestHandle=http.request(origin+path,{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),Cookie:auth.cookie,'X-CSRF-Token':auth.csrf,'X-Company-Id':auth.companyId,'X-User-Id':auth.userId}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks))}));});requestHandle.on('error',reject);});
  requestHandle.write(raw.slice(0,1));await incoming;
  return {finish:()=>{requestHandle.end(raw.slice(1));return response;}};
 }
 const companyBody=name=>({name,planId:'komplett',startsOn:'2020-01-01',endsOn:'2099-12-31',seats:4,enabled:true}),perms={workshop:'write',cad:'write',offers:'write',heat:'write'};
 let dev,c1,c2,admin,member,other;
 try{
 await t.test('no default login, no anonymous projects, password checks and CSRF',async()=>{
  assert.equal((await request('/api/admin')).status,401);assert.equal((await request('/cad.html')).status,302);assert.equal((await request('/api/login','POST',{email:'developer@example.test',password:'incorrect-long-password'})).status,401);
  dev=await login('developer@example.test',password);assert.equal((await request('/api/admin','GET',undefined,dev)).status,200);
  assert.equal((await request('/api/admin/companies','POST',companyBody('A'),dev,{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await request('/api/admin/companies','POST',companyBody('A'),dev,{Origin:'https://attacker.test'})).status,403);
  assert.match(dev.cookie,/test-session=/);assert.ok(!JSON.stringify((await request('/api/admin','GET',undefined,dev)).data).includes('scrypt$'));
 });
 await t.test('operator provisions firms and users, first login requires a new password',async()=>{
  c1=(await request('/api/admin/companies','POST',companyBody('Testbetrieb Alpha'),dev)).data;c2=(await request('/api/admin/companies','POST',companyBody('Testbetrieb Beta'),dev)).data;
  assert.equal(c1.profile.name,'');assert.equal(c1.profile.logo,'');
  async function provision(email,name,role,companyId){const r=await request('/api/admin/users','POST',{email,name,role,companyId,permissions:perms},dev);assert.equal(r.status,201,JSON.stringify(r.data));const a=await login(email,r.data.temporaryPassword);assert.equal((await request('/api/records/cad','GET',undefined,a)).status,403);const newPassword=token();assert.equal((await request('/api/password','POST',{currentPassword:r.data.temporaryPassword,password:newPassword},a)).status,200);assert.equal((await request('/api/session','GET',undefined,a)).status,401);return login(email,newPassword);}
  admin=await provision('admin@alpha.test','Alpha Admin','admin',c1.id);member=await provision('member@alpha.test','Alpha Member','member',c1.id);other=await provision('admin@beta.test','Beta Admin','admin',c2.id);
  assert.equal((await request('/api/admin/users','POST',{email:'fake@alpha.test'},admin)).status,403);assert.equal((await request('/api/admin','GET',undefined,member)).status,403);
 });
 await t.test('company profile is blank by default, accepts safe text and denies executable logos',async()=>{
  assert.equal((await request('/api/company','PUT',{name:'Alpha AG',city:'Baden'},admin)).status,200);assert.equal((await request('/api/company','GET',undefined,other)).data.profile.name,'');
  assert.equal((await request('/api/company','PUT',{name:'X'},member)).status,403);
  assert.equal((await request('/api/company','PUT',{logo:'data:image/svg+xml;base64,PHN2Zz4='},admin)).status,400);
  assert.equal((await request('/api/company','PUT',{logo:'data:image/jpeg;base64,AA=='},admin)).status,400);
 });
 await t.test('all project areas isolate identical IDs; forged company selection is rejected',async()=>{
  for(const area of ['cad','offers','heat','heatTemplate']){
   assert.equal((await request('/api/records/'+area+'/same','PUT',{revision:0,value:{name:'Alpha secret'},companyId:c2.id},member)).status,200);
   assert.equal((await request('/api/records/'+area+'/same','GET',undefined,other)).data.value,null);
   assert.equal((await request('/api/records/'+area+'/same','PUT',{revision:0,value:{name:'Beta private'}},other)).status,200);
   assert.equal((await request('/api/records/'+area+'/same','GET',undefined,member)).data.value.name,'Alpha secret');
  }
  assert.equal((await request('/api/session/company','POST',{companyId:c2.id},member)).status,403);
  assert.equal((await request('/api/records/cad','GET',undefined,member,{'X-Company-Id':c2.id})).status,409);
  assert.equal((await request('/api/company/users/'+other.userId,'PATCH',{role:'member',enabled:true,permissions:perms},admin)).status,404);
 });
 await t.test('profile uploads cannot restore an old licence and in-flight writes obey revocation',async()=>{
  const profileUpload=await pausedUpload('/api/company',{name:'Updated Alpha'},admin);
  assert.equal((await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id,planId:'basis'},dev)).status,200);
  assert.equal((await profileUpload.finish()).status,200);
  assert.equal((await request('/api/company','GET',undefined,admin)).data.planId,'basis');
  await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id},dev);
  const recordUpload=await pausedUpload('/api/records/cad/revoked-upload',{revision:0,value:{name:'Must not be saved'}},member);
  await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id,enabled:false},dev);
  assert.equal((await recordUpload.finish()).status,403);
  await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id},dev);
  assert.equal((await request('/api/records/cad/revoked-upload','GET',undefined,member)).data.value,null);
 });
 await t.test('optimistic revisions prevent overwriting another employee’s work',async()=>{
  assert.equal((await request('/api/records/cad/same','PUT',{revision:1,value:{name:'First update'}},member)).status,200);
  assert.equal((await request('/api/records/cad/same','PUT',{revision:1,value:{name:'Lost update'}},admin)).status,409);
  assert.equal((await request('/api/records/cad/same','DELETE',{revision:1},member)).status,409);
  assert.equal((await request('/api/records/cad/same','GET',undefined,member)).data.value.name,'First update');
 });
 await t.test('company admins manage own staff rights and cannot remove the last admin',async()=>{
  const r=await request('/api/company/users/'+member.userId,'PATCH',{role:'member',enabled:true,permissions:{...perms,cad:'read'}},admin);assert.equal(r.status,200);
  // Permission updates revoke other sessions; a new fixture session observes fresh rights.
  const session=db.prepare('SELECT * FROM sessions WHERE user_id=?').get(admin.userId),sid=token();const {digest}=await import('../server/security.mjs');db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest(sid),member.userId,c1.id,'test-csrf',now+3600000,now);member={cookie:'test-session='+sid,csrf:'test-csrf',userId:member.userId,companyId:c1.id};
  assert.equal((await request('/api/records/cad','GET',undefined,member)).status,200);assert.equal((await request('/api/records/cad/same','PUT',{revision:2,value:{}},member)).status,403);
  assert.equal((await request('/api/company/users/'+admin.userId,'PATCH',{role:'member',enabled:true,permissions:perms},admin)).status,403);
 });
 await t.test('licence expiry, module access and seat limits are enforced server-side',async()=>{
  assert.equal((await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id,planId:'basis'},dev)).status,200);
  assert.equal((await request('/cad.html','GET',undefined,member)).status,403);assert.equal((await request('/technik.html','GET',undefined,member)).status,200);
  assert.equal((await request('/api/company/users/'+member.userId,'PATCH',{role:'member',enabled:true,permissions:perms},admin)).status,403);
  assert.equal((await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id,seats:1},dev)).status,409);
  await request('/api/admin/companies','POST',{...companyBody('Alpha'),id:c1.id,endsOn:'2020-01-02'},dev);
  assert.equal((await request('/api/records/offers','GET',undefined,member)).status,403);assert.equal((await request('/api/company','GET',undefined,admin)).status,200);
 });
 await t.test('operator sees all firms, explicitly selects one, and stale tabs cannot cross-save',async()=>{
  const overview=await request('/api/admin','GET',undefined,dev);assert.equal(overview.data.companies.length,2);assert.equal(overview.data.users.length,4);assert.ok(overview.data.audit.length>0);
  assert.equal((await request('/api/session/company','POST',{companyId:c2.id},dev)).status,200);
  assert.equal((await request('/api/records/cad/same','PUT',{revision:1,value:{}},dev)).status,409);
  dev.companyId=c2.id;assert.equal((await request('/api/records/cad/same','GET',undefined,dev)).data.value.name,'Beta private');
 });
 await t.test('database, source management and traversal are not public assets',async()=>{
  for(const path of ['/runtime/platform.sqlite','/server/db.mjs','/.git/config','/package.json','/platform/../server/db.mjs'])assert.equal((await request(path,'GET',undefined,dev)).status,404,path);
  const sw=await request('/sw.js');assert.match(sw.data,/unregister/);assert.doesNotMatch(sw.data,/event\.respondWith/);
  const page=await request('/cad.html','GET',undefined,dev);assert.equal(page.status,200);assert.match(page.data,/platform\/runtime.js/);assert.doesNotMatch(page.data,/Drahtwerk|TinLine/);
 });
 await t.test('expired sessions stop API access and records persist in SQLite',async()=>{
  now+=9*3600000;assert.equal((await request('/api/session','GET',undefined,dev)).status,401);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM records').get().n,8);
 });
 }finally{await new Promise(r=>server.close(r));db.close();const reopened=openDatabase(path);assert.equal(reopened.prepare('SELECT COUNT(*) n FROM companies').get().n,3);reopened.close();rmSync(dir,{recursive:true,force:true});}
});
