import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {openDatabase,saveObject} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {token,digest,passwordMatches} from '../server/security.mjs';

const root=resolve(import.meta.dirname,'..');
test('operator manages start passwords and removes accounts without deleting company work',async t=>{
 const db=openDatabase(':memory:'),origin='http://localhost',company={id:'alpha',name:'Alpha AG',planId:'komplett',startsOn:'2000-01-01',endsOn:'2099-12-31',enabled:true,seats:2,profile:{}};
 saveObject(db,'companies',company);saveObject(db,'companies',{...company,id:'beta',name:'Beta AG'});
 const fixture=(id,c,role)=>db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,c,id,id,role,JSON.stringify({workshop:'write',offers:'write'}),'fixture-no-password',new Date().toISOString());
 fixture('dev',null,'developer');fixture('admin','alpha','admin');fixture('other','beta','admin');
 const server=createApp({db,root,origin});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${server.address().port}`;
 const request=(path,method='GET',body,auth={})=>new Promise((resolve,reject)=>{
  const req=http.request(endpoint+path,{method,headers:{Host:'localhost',Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),...auth}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,data:res.headers['content-type']?.includes('application/json')?JSON.parse(raw):raw});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
 const session=(id,c)=>{const sid=token();db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest(sid),id,c,'test-csrf',Date.now()+3600000,Date.now());return {Cookie:'test-session='+sid,'X-CSRF-Token':'test-csrf','X-User-Id':id,'X-Company-Id':c||''};};
 const dev=session('dev','alpha'),admin=session('admin','alpha'),other=session('other','beta');
 const provision=(identifier,extra={})=>request('/api/admin/users','POST',{identifier,name:'Test Person',role:'member',companyId:'alpha',permissions:{offers:'write',workshop:'read'},passwordMode:'custom',password:'Start123',...extra},dev);
 async function login(identifier,password){const r=await request('/api/login','POST',{identifier,password});assert.equal(r.status,200,JSON.stringify(r.data));const auth={Cookie:r.headers['set-cookie'][0].split(';')[0]};const s=(await request('/api/session','GET',undefined,auth)).data;return {...auth,'X-CSRF-Token':s.csrf,'X-User-Id':s.user.id,'X-Company-Id':s.company.id};}
 let user,userAuth;
 try{
  await t.test('custom start password validates at 8 characters and never bypasses first-login gate',async()=>{
   for(const extra of [{password:'short'},{password:''},{password:null},{password:'        '},{password:'x'.repeat(257)},{passwordMode:'invalid'}])assert.equal((await provision('invalid',extra)).status,400);
   assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE email='invalid'").get().n,0);
   const made=await provision('worker');assert.equal(made.status,201);user=made.data.user;assert.equal(made.data.temporaryPassword,'Start123');assert.equal(user.mustChangePassword,true);
   assert.ok(!JSON.stringify(user).includes('password'));assert.notEqual(db.prepare('SELECT password FROM users WHERE id=?').get(user.id).password,'Start123');
   userAuth=await login('worker','Start123');
   for(const path of ['/api/records/offers','/api/company/users'])assert.equal((await request(path,'GET',undefined,userAuth)).status,403);
   assert.equal((await request('/index.html','GET',undefined,userAuth)).headers.location,'/portal.html');
   assert.equal((await request('/schienenrechner.html','GET',undefined,userAuth)).headers.location,'/portal.html');
   assert.match((await request('/portal.html','GET',undefined,userAuth)).data,/platform\/portal.mjs/);
   assert.equal((await request('/api/password','POST',{currentPassword:'Start123',password:'Short123'},userAuth)).status,400);
   assert.equal((await request('/api/password','POST',{currentPassword:'Start123',password:'My-new-password-2026'},userAuth)).status,200);
   assert.equal((await request('/api/session','GET',undefined,userAuth)).status,401);
   assert.equal((await request('/api/login','POST',{identifier:'worker',password:'Start123'})).status,401);
   userAuth=await login('worker','My-new-password-2026');assert.equal((await request('/api/session','GET',undefined,userAuth)).data.user.mustChangePassword,false);
   assert.equal((await request('/api/records/offers','GET',undefined,userAuth)).status,200);
  });
  await t.test('reset supports custom and random passwords, revokes sessions and always requires change',async()=>{
   const path='/api/admin/users/'+user.id+'/password';
   assert.equal((await request(path,'POST',{passwordMode:'custom',password:'short'},dev)).status,400);
   assert.equal((await request('/api/session','GET',undefined,userAuth)).status,200);
   assert.equal((await request(path,'POST',{},admin)).status,403);
   const custom=await request(path,'POST',{passwordMode:'custom',password:'NewStart8'},dev);assert.equal(custom.status,200);assert.equal(custom.data.temporaryPassword,'NewStart8');
   assert.equal((await request('/api/session','GET',undefined,userAuth)).status,401);
   const fresh=await login('worker','NewStart8');assert.equal((await request('/api/records/offers','GET',undefined,fresh)).status,403);
   const random=await request(path,'POST',{passwordMode:'random'},dev);assert.equal(random.status,200);assert.ok(random.data.temporaryPassword.length>=20);assert.notEqual(random.data.temporaryPassword,'NewStart8');
   assert.equal((await request('/api/session','GET',undefined,fresh)).status,401);
   const randomAuth=await login('worker',random.data.temporaryPassword);assert.equal((await request('/api/session','GET',undefined,randomAuth)).data.user.mustChangePassword,true);
   assert.equal((await request('/api/password','POST',{currentPassword:random.data.temporaryPassword,password:'Final-password-2026'},randomAuth)).status,200);
   userAuth=await login('worker','Final-password-2026');
  });
  await t.test('only operator removes accounts, preserving developers and the last active company admin',async()=>{
   const path='/api/admin/users/'+user.id;
   assert.equal((await request(path,'DELETE')).status,401);
   for(const auth of [admin,other,userAuth])assert.equal((await request(path,'DELETE',undefined,auth)).status,403);
   assert.equal((await request(path,'DELETE',undefined,{...dev,'X-CSRF-Token':'wrong'})).status,403);
   assert.equal((await request(path,'DELETE',undefined,{...dev,Origin:'https://foreign.test'})).status,403);
   assert.equal((await request('/api/admin/users/dev','DELETE',undefined,dev)).status,403);
   assert.equal((await request('/api/admin/users/admin','DELETE',undefined,dev)).status,409);
   assert.equal((await request('/api/admin/users/missing','DELETE',undefined,dev)).status,404);
   assert.equal((await request('/api/session','GET',undefined,userAuth)).status,200);
  });
  await t.test('removal frees a full licence, revokes every session and preserves offers, templates and uploads',async()=>{
   assert.equal((await provision('no-seat')).status,409);
   assert.equal((await request('/api/records/offers/saved','PUT',{revision:0,value:{name:'Shared quote'}},userAuth)).status,200);
   db.prepare('INSERT INTO workshop_templates VALUES (?,?,?,?,?,?)').run('alpha','rails',JSON.stringify({rows:[]}),1,user.id,new Date().toISOString());
   db.prepare('INSERT INTO workshop_files VALUES (?,?,?,?,?,?,?,?)').run('file','alpha','ew','shared.pdf','application/pdf',Buffer.from('%PDF-fixture'),user.id,new Date().toISOString());
   const anotherSession=session(user.id,'alpha');
   const result=await request('/api/admin/users/'+user.id,'DELETE',undefined,dev);assert.equal(result.status,200);
   for(const auth of [userAuth,anotherSession])assert.equal((await request('/api/session','GET',undefined,auth)).status,401);
   assert.equal((await request('/api/login','POST',{identifier:'worker',password:'Final-password-2026'})).status,401);
   assert.equal((await request('/api/admin','GET',undefined,dev)).data.users.some(u=>u.id===user.id),false);
   assert.equal((await request('/api/company/users','GET',undefined,admin)).data.some(u=>u.id===user.id),false);
   const row=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);assert.equal(row.enabled,0);assert.ok(row.deleted_at);assert.equal(row.password,'');assert.equal(row.name,'Entfernter Benutzer');assert.notEqual(row.email,'worker');assert.deepEqual(JSON.parse(row.permissions),{});
   assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get(user.id).n,0);
   assert.equal((await request('/api/records/offers/saved','GET',undefined,admin)).data.value.name,'Shared quote');
   assert.equal((await request('/api/records/offers/saved','GET',undefined,other)).data.value,null);
   assert.equal(db.prepare('SELECT updated_by FROM workshop_templates').get().updated_by,user.id);
   assert.equal(db.prepare('SELECT uploaded_by,length(bytes) n FROM workshop_files').get().n,12);
   assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
   const audit=db.prepare("SELECT * FROM audit WHERE action='user.removed'").get();assert.equal(audit.target,user.id);assert.equal(audit.actor,'dev');
   assert.equal((await request('/api/admin/users/'+user.id,'DELETE',undefined,dev)).status,404);
   assert.equal((await request('/api/admin/users/'+user.id+'/password','POST',{},dev)).status,404);
   assert.equal((await request('/api/company/users/'+user.id,'PATCH',{role:'member',enabled:true,permissions:{}},dev)).status,404);
   const replacement=await provision('worker',{passwordMode:'random'});assert.equal(replacement.status,201);assert.notEqual(replacement.data.user.id,user.id);assert.ok(replacement.data.temporaryPassword.length>=20);assert.equal(replacement.data.user.mustChangePassword,true);
   assert.equal(db.prepare('SELECT COUNT(*) n FROM users WHERE company_id=? AND enabled=1').get('alpha').n,2);
  });
  await t.test('legacy callers still receive random start passwords and disabled users can be removed',async()=>{
   const current=db.prepare("SELECT id FROM users WHERE email='worker'").get();db.prepare('UPDATE users SET enabled=0 WHERE id=?').run(current.id);
   assert.equal((await request('/api/admin/users/'+current.id,'DELETE',undefined,dev)).status,200);
   const legacy=await provision('legacy',{passwordMode:undefined,password:undefined});assert.equal(legacy.status,201);assert.ok(legacy.data.temporaryPassword.length>=20);
   assert.ok(await passwordMatches(legacy.data.temporaryPassword,db.prepare('SELECT password FROM users WHERE id=?').get(legacy.data.user.id).password));
   assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  });
 }finally{await new Promise(r=>server.close(r));db.close();}
});

test('existing SQLite database upgrades without losing accounts, sessions or company records',()=>{
 const dir=mkdtempSync(join(tmpdir(),'users-migration-')),path=join(dir,'platform.sqlite');let db;
 try{
  db=new DatabaseSync(path);db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,company_id TEXT,email TEXT UNIQUE,name TEXT,role TEXT,permissions TEXT,password TEXT,enabled INTEGER DEFAULT 1,must_change INTEGER DEFAULT 1,created_at TEXT);INSERT INTO users VALUES ('existing','company','existing.login','Existing Name','member','{}','unchanged-hash',1,0,'2026-11-23');PRAGMA user_version=2;`);db.close();
  db=openDatabase(path);assert.equal(db.prepare('PRAGMA user_version').get().user_version,6);assert.equal(db.prepare('SELECT deleted_at FROM users').get().deleted_at,null);
  const row=db.prepare('SELECT * FROM users').get();assert.equal(row.email,'existing.login');assert.equal(row.password,'unchanged-hash');assert.equal(row.must_change,0);
  saveObject(db,'companies',{id:'company',name:'Preserved company'});
  db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?)').run('company','offers','quote','{"kept":true}',1,'existing','2026-11-23');
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run('session','existing','company','csrf',1000,1000);
  db.close();db=openDatabase(path);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM records').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n,1);assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
