import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {openDatabase,saveObject,publicUser} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {digest,passwordHash} from '../server/security.mjs';
import {permissionKeys,permissionsFor} from '../platform/model.mjs';

test('retiring accounting preserves existing accounts, logins, tool rights and company records',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'schaltbase-role-migration-')),file=join(dir,'platform.sqlite');
 let db=openDatabase(file),app;
 t.after(async()=>{if(app)await new Promise(r=>app.close(r));db.close();rmSync(dir,{recursive:true,force:true});});
 assert.equal(db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='accounting_role'),false);
 assert.equal(permissionKeys.includes('accounting'),false);
 const company={id:'firm',name:'Firma',planId:'komplett',startsOn:'2000-01-01',endsOn:'2099-12-31',enabled:true,seats:10};saveObject(db,'companies',company);
 // Model the schema and persisted role flags of the previous release.
 db.exec('ALTER TABLE users ADD COLUMN accounting_role INTEGER NOT NULL DEFAULT 0; PRAGMA user_version=4;');
 const hash=await passwordHash('Migration-test-29!'),permissions={rails:'read',offers:'write',orders:'read',accounting:'read'};
 for(const [id,role,flag,enabled,mustChange] of [['book','member',1,1,0],['disabled','member',1,0,1],['admin','admin',0,1,0],['dev','developer',0,1,0]]){
  db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,enabled,must_change,created_at,accounting_role) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,'firm',id,id,role,JSON.stringify(permissions),hash,enabled,mustChange,'2026-11-25',flag);
 }
 db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest('existing-session'),'book','firm','csrf',Date.now()+3600000,Date.now());
 for(const area of ['orders','offers','reports'])db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?)').run('firm',area,area,JSON.stringify({number:area,customer:'Unverändert'}),3,'book','2026-11-25');
 db.prepare('INSERT INTO support_requests(id,company_id,developer_id,session_hash,reason,mode,duration_minutes,status,created_at,request_expires,permissions) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('support','firm','dev','other-session','Test','write',30,'active',0,0,JSON.stringify({rails:'write',accounting:'write'}));
 const users=db.prepare('SELECT * FROM users ORDER BY id').all(),records=db.prepare('SELECT * FROM records ORDER BY area').all();
 db.close();db=openDatabase(file);
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,5);
 for(const old of users){
  const current=db.prepare('SELECT * FROM users WHERE id=?').get(old.id),expected={...old,accounting_role:0,permissions:JSON.stringify({rails:'read',offers:'write',orders:'read'})};
  assert.deepEqual({...current},expected);
  const user=publicUser(current),rights=permissionsFor(user,company,{modules:['workshop','offers','reports']});
  assert.equal(user.role,old.role);assert.equal(Object.hasOwn(rights,'accounting'),false);
  if(user.role==='member'){assert.equal(rights.rails,'read');assert.equal(rights.orders,'read');assert.equal(rights.offers,'write');assert.equal(rights.reports,'none');}
 }
 assert.deepEqual(db.prepare('SELECT * FROM records ORDER BY area').all(),records);
 assert.deepEqual(JSON.parse(db.prepare("SELECT permissions FROM support_requests WHERE id='support'").get().permissions),{rails:'write'});
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 const migrated=db.prepare('SELECT * FROM users ORDER BY id').all();db.close();db=openDatabase(file);
 assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY id').all(),migrated);
 app=createApp({db,root:resolve(import.meta.dirname,'..'),origin:'http://localhost'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const request=(path,method='GET',body)=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port:app.address().port,path,method,headers:{Host:'localhost',Origin:'http://localhost','Content-Type':'application/json',Cookie:'test-session=existing-session'}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks).toString())}));
  });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
 const session=await request('/api/session');assert.equal(session.status,200);assert.equal(session.data.user.role,'member');
 const login=await request('/api/login','POST',{identifier:'book',password:'Migration-test-29!'});assert.equal(login.status,200);assert.equal(login.data.mustChangePassword,false);
 const disabled=await request('/api/login','POST',{identifier:'disabled',password:'Migration-test-29!'});assert.equal(disabled.status,401);
});
