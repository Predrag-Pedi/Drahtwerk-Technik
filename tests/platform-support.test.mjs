import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolve} from 'node:path';
import {openDatabase,saveObject} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {digest} from '../server/security.mjs';

async function fixture(t){
 const db=openDatabase(':memory:');let now=Date.now();
 for(const id of ['alpha','beta'])saveObject(db,'companies',{id,name:id+' Elektro',enabled:true,startsOn:'2000-01-01',endsOn:'2099-12-31',planId:'basis',seats:10,profile:{name:id+' AG'}});
 for(const [id,company,role,permissions] of [['dev',null,'developer',{}],['dev2',null,'developer',{}],['member','alpha','member',{rails:'read',reports:'write'}],['reader','alpha','member',{rails:'read'}],['admin','alpha','admin',{rails:'write'}],['other','beta','admin',{reports:'write'}],['disabled','alpha','member',{}],['new','alpha','member',{}]]){
  db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,company,id,id+' Name',role,JSON.stringify(permissions),'unused',new Date(now).toISOString());
 }
 db.prepare("UPDATE users SET enabled=0 WHERE id='disabled'").run();db.prepare("UPDATE users SET must_change=1 WHERE id='new'").run();
 const auth={};
 function login(id,key=id,selection=undefined){const company=db.prepare('SELECT company_id FROM users WHERE id=?').get(id).company_id;db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest('sid-'+key),id,selection===undefined?company:selection,'csrf-'+key,now+8*3600000,now);return auth[key]={key,id,company:company||'developer-'+id,support:''};}
 for(const id of ['dev','dev2','member','reader','admin','other','disabled','new'])login(id);
 login('dev','second');
 // An existing browser from before the change has a selected customer tenant.
 login('dev','legacy','alpha');auth.legacy.company='alpha';
 const app=createApp({db,root:resolve(import.meta.dirname,'..'),origin:'http://localhost',clock:()=>now});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>app.close(r));db.close();});
 function request(path,method='GET',data,key='dev',headers={}){
  const a=auth[key];return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:app.address().port,path,method,headers:{Host:'localhost',Origin:'http://localhost','Content-Type':'application/json',Cookie:'test-session=sid-'+a.key,'X-CSRF-Token':'csrf-'+a.key,'X-Company-Id':a.company,'X-User-Id':a.id,'X-Support-Id':a.support,...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,data:res.headers['content-type']?.includes('application/json')?JSON.parse(text):text,headers:res.headers});});});req.on('error',reject);req.end(data===undefined?undefined:JSON.stringify(data));});
 }
 const poll=(key='dev',visible=true)=>request('/api/support/state','POST',{visible},key);
 const select=(id='alpha',key='dev')=>request('/api/session/company','POST',{companyId:id},key);
 const send=(extra={},key='dev')=>request('/api/support/requests','POST',{companyId:'alpha',reason:'Speichern des Regierapports prüfen',recipientIds:['member'],mode:'write',durationMinutes:30,...extra},key);
 const action=(id,kind,key='dev')=>request('/api/support/requests/'+id+'/'+kind,'POST',{},key);
 const refresh=async(key='dev')=>{const r=await request('/api/session','GET',undefined,key);if(r.status===200){auth[key].company=r.data.company?.id||'';auth[key].support=r.data.support?.id||'';}return r;};
 async function approved(extra={}){await select();await poll('member');const r=await send(extra);assert.equal(r.status,201,JSON.stringify(r.data));assert.equal((await action(r.data.id,'approve','member')).status,200);return r.data.id;}
 async function entered(extra={}){const id=await approved(extra);assert.equal((await action(id,'enter')).status,200);await refresh();return id;}
 async function paused(path,data,key='dev'){
  const a=auth[key],raw=JSON.stringify(data);let signal,req;const started=new Promise(r=>signal=r),listener=r=>{if(r.url===path&&r.method==='PUT'){app.off('request',listener);r.once('data',signal);}};app.on('request',listener);
  const result=new Promise((resolve,reject)=>{req=http.request({hostname:'127.0.0.1',port:app.address().port,path,method:'PUT',headers:{Host:'localhost',Origin:'http://localhost','Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),Cookie:'test-session=sid-'+a.key,'X-CSRF-Token':'csrf-'+a.key,'X-Company-Id':a.company,'X-User-Id':a.id,'X-Support-Id':a.support}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks))}));});req.on('error',reject);});req.write(raw.slice(0,1));await started;return ()=>{req.end(raw.slice(1));return result;};
 }
 const advance=ms=>now+=ms;
 return {db,auth,request,poll,select,send,action,refresh,approved,entered,paused,advance,login};
}

test('opening a business and legacy selected sessions never unlock its tools without consent',async t=>{
 const f=await fixture(t);f.db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?)').run('alpha','reports','secret',JSON.stringify({customer:'Confidential'}),1,'member','now');
 await f.select();const session=(await f.refresh()).data;assert.equal(session.company.id,'developer-dev');assert.equal(session.managementCompany.id,'alpha');assert.equal(session.support,null);
 assert.deepEqual((await f.request('/api/records/reports')).data,[]);
 assert.equal((await f.request('/api/records/reports','GET',undefined,'dev',{'X-Company-Id':'alpha'})).status,409);
 const legacy=(await f.request('/api/session','GET',undefined,'legacy')).data;assert.equal(legacy.company.id,'developer-dev');assert.equal(legacy.managementCompany.id,'alpha');
 assert.equal((await f.request('/api/records/reports','GET',undefined,'legacy')).status,409);
 assert.equal((await f.request('/api/company/users','GET',undefined,'dev',{'X-Company-Id':'alpha'})).status,200);
 assert.equal((await f.request('/api/company/workshop/rails','GET',undefined,'dev',{'X-Company-Id':'alpha'})).status,409);
 assert.equal((await f.request('/api/company/catalog','GET',undefined,'dev',{'X-Company-Id':'alpha'})).status,409);
 assert.equal((await f.request('/api/company/workshop/rails')).status,200);
});

test('online recipients are live, belong to this business and require a usable account',async t=>{
 const f=await fixture(t);await f.select();assert.deepEqual((await f.request('/api/support/recipients')).data,[]);
 for(const key of ['member','reader','admin','other','disabled','new'])await f.poll(key);
 assert.deepEqual((await f.request('/api/support/recipients')).data.map(u=>u.id).sort(),['admin','member','reader']);
 assert.equal((await f.send({recipientIds:['other']})).status,409);
 assert.equal((await f.send({recipientIds:['disabled']})).status,409);
 await f.poll('reader',false);assert.equal((await f.request('/api/support/recipients')).data.length,2);
 f.advance(46000);assert.deepEqual((await f.request('/api/support/recipients')).data,[]);
});

test('requests arrive only for the nominated company people, with explicit full-company scope',async t=>{
 const f=await fixture(t);await f.select();await f.poll('member');await f.poll('reader');
 const sent=await f.send({recipientIds:['member','reader']});assert.equal(sent.status,201);
 const [a,b,c,d]=await Promise.all(['member','reader','admin','other'].map(f.poll));
 assert.equal(a.data.incoming.length,1);assert.equal(b.data.incoming.length,1);assert.equal(c.data.incoming.length,0);assert.equal(d.data.incoming.length,0);
 assert.equal(a.data.incoming[0].permissions.cad,'write');assert.equal(a.data.incoming[0].developerName,'dev Name');assert.equal(a.data.incoming[0].companyId,'alpha');
 assert.equal((await f.send()).status,409);assert.equal((await f.request('/api/records/reports')).data.length,0);
 assert.equal((await f.action(sent.data.id,'enter')).status,403);
});

test('a nominated employee can grant all tools without changing their own rights or identity',async t=>{
 const f=await fixture(t),before=(await f.refresh('member')).data;
 const id=await f.approved();assert.equal((await f.refresh()).data.company.id,'developer-dev');
 assert.equal((await f.action(id,'enter')).status,200);const during=(await f.refresh()).data;
 assert.equal(during.company.id,'alpha');assert.equal(during.user.id,'dev');assert.equal(during.support.id,id);assert.equal(during.permissions.cad,'write');assert.equal(during.permissions.offers,'write');
 assert.equal((await f.request('/cad.html')).status,200);assert.equal((await f.request('/api/records/cad/project','PUT',{revision:0,value:{name:'Support repair'}})).status,200);
 assert.equal((await f.request('/api/records/cad/project')).data.value.name,'Support repair');
 assert.equal((await f.request('/api/company/workshop/rails')).status,200);assert.equal((await f.request('/api/company/catalog')).status,200);
 const after=(await f.refresh('member')).data;assert.deepEqual(after.permissions,before.permissions);assert.equal(after.user.role,'member');assert.equal(after.permissions.cad,'none');assert.equal(after.permissions.rails,'read');
 assert.equal((await f.request('/cad.html','GET',undefined,'member')).status,403);
 assert.equal((await f.poll('member')).data.active[0].canRevoke,true);
});

test('document tools remain bound to an active support grant',async t=>{
 const f=await fixture(t),company=JSON.parse(f.db.prepare("SELECT data FROM companies WHERE id='alpha'").get().data);saveObject(f.db,'companies',{...company,planId:'komplett'});
 f.db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?)').run('alpha','orders','support-order',JSON.stringify({number:'AU-SUPPORT'}),1,'member','now');
 assert.deepEqual((await f.request('/api/company/orders')).data,[]);
 const id=await f.entered();
 assert.equal((await f.request('/api/company/orders')).data[0].value.number,'AU-SUPPORT');
 assert.equal((await f.request('/api/company/orders')).data[0].id,'support-order');
 assert.equal((await f.request('/api/company/document-settings')).status,200);
 assert.equal((await f.request('/api/company/offer-number','POST',{id:'support-quote'})).status,200);
 assert.equal((await f.request('/api/company/orders','GET',undefined,'member')).status,403);
 assert.equal((await f.action(id,'stop')).status,200);
 for(const path of ['/api/company/orders','/api/company/document-settings'])assert.equal((await f.request(path)).status,409);
 await f.refresh();assert.deepEqual((await f.request('/api/company/orders')).data,[]);
});

test('only nominated employees can decide; a developer cannot self-approve or borrow another login grant',async t=>{
 const f=await fixture(t);await f.select();await f.poll('member');const id=(await f.send()).data.id;
 for(const key of ['dev','dev2','admin','reader','other'])assert.equal((await f.action(id,'approve',key)).status,403,key);
 assert.equal((await f.action(id,'approve','member')).status,200);
 for(const key of ['second','dev2','member','other'])assert.equal((await f.action(id,'enter',key)).status,403,key);
 assert.equal((await f.request('/api/records/cad','GET',undefined,'second',{'X-Company-Id':'alpha','X-Support-Id':id})).status,409);
});

test('CSRF, origin and current user are enforced for approvals and state heartbeats',async t=>{
 const f=await fixture(t);await f.select();await f.poll('member');const id=(await f.send()).data.id,path='/api/support/requests/'+id+'/approve';
 assert.equal((await f.request(path,'POST',{},'member',{'X-CSRF-Token':'wrong'})).status,403);
 assert.equal((await f.request(path,'POST',{},'member',{Origin:'https://other.example'})).status,403);
 assert.equal((await f.request(path,'POST',{},'member',{'X-User-Id':'other'})).status,409);
 assert.equal((await f.request('/api/support/state','POST',{visible:true},'member',{'X-CSRF-Token':''})).status,403);
 assert.equal((await f.action(id,'enter')).status,403);
});

test('read-only support reads all tools but cannot write, upload, import or delete company records',async t=>{
 const f=await fixture(t);await f.entered({mode:'read'});
 for(const path of ['/api/records/cad','/api/records/offers','/api/records/reports','/api/records/customers','/api/company/workshop/ew','/api/company/catalog'])assert.equal((await f.request(path)).status,200,path);
 for(const [path,method] of [['/api/records/cad/one','PUT'],['/api/records/cad/one','DELETE'],['/api/company/workshop/rails','PUT'],['/api/company/catalog/imports','POST']])assert.equal((await f.request(path,method,{revision:0,value:{}})).status,403,path);
});

test('the first decision wins, and denial/cancellation never grants access',async t=>{
 const f=await fixture(t);await f.select();await f.poll('member');await f.poll('reader');
 const id=(await f.send({recipientIds:['member','reader']})).data.id;
 const results=await Promise.all([f.action(id,'deny','reader'),f.action(id,'approve','member')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal(f.db.prepare('SELECT status FROM support_requests WHERE id=?').get(id).status,'denied');assert.equal((await f.action(id,'enter')).status,403);
 const second=(await f.send()).data.id;assert.equal((await f.action(second,'stop')).status,200);assert.equal((await f.action(second,'approve','member')).status,409);
});

test('pending requests expire; polling does not keep idle logins alive forever',async t=>{
 const f=await fixture(t);await f.select();await f.poll('member');const id=(await f.send()).data.id;
 f.advance(10*60000+1);assert.equal((await f.poll('member')).data.incoming.length,0);assert.equal((await f.action(id,'approve','member')).status,409);
 const seen=f.db.prepare('SELECT last_seen FROM sessions WHERE user_id=?').get('reader').last_seen;await f.poll('reader');assert.equal(f.db.prepare('SELECT last_seen FROM sessions WHERE user_id=?').get('reader').last_seen,seen);
 f.advance(21*60000);assert.equal((await f.poll('reader')).status,401);
});

test('approval expiry ends access server-side, including requests from old open tabs',async t=>{
 const f=await fixture(t);const id=await f.entered({durationMinutes:15});f.advance(15*60000+1);
 assert.equal((await f.request('/api/records/reports')).status,409);const state=(await f.poll()).data;assert.equal(state.context.supportId,null);assert.equal(state.outgoing[0].status,'expired');
 assert.equal((await f.request('/api/records/cad/late','PUT',{revision:0,value:{}})).status,409);
 assert.equal((await f.action(id,'enter')).status,403);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM support_context').get().n,0);
});

test('approver and company admin can revoke; unrelated staff and other companies cannot',async t=>{
 const f=await fixture(t);const id=await f.entered();
 for(const key of ['reader','other','second','dev2'])assert.equal((await f.action(id,'stop',key)).status,403,key);
 assert.equal((await f.action(id,'stop','admin')).status,200);assert.equal((await f.request('/api/records/reports')).status,409);
 await f.refresh();const next=await f.entered();assert.equal((await f.action(next,'stop','member')).status,200);
 assert.equal((await f.poll()).data.context.companyId,'developer-dev');
});

test('revocation while a write is uploading prevents committing that write',async t=>{
 const f=await fixture(t);const id=await f.entered(),finish=await f.paused('/api/records/cad/late',{revision:0,value:{name:'Must not save'}});
 await f.action(id,'stop','member');assert.equal((await finish()).status,409);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM records WHERE id='late'").get().n,0);
});

test('support cannot cross company headers or be implicitly reopened after selecting another business',async t=>{
 const f=await fixture(t);const id=await f.entered();
 assert.equal((await f.request('/api/records/cad','GET',undefined,'dev',{'X-Company-Id':'beta'})).status,409);
 assert.equal((await f.request('/api/company/catalog','GET',undefined,'dev',{'X-Support-Id':'forged'})).status,409);
 assert.equal((await f.select('beta')).status,200);assert.equal((await f.refresh()).data.company.id,'developer-dev');assert.equal((await f.action(id,'enter')).status,403);
 assert.equal((await f.send()).status,409);
});

test('ending support returns to the developer workspace and keeps management pages available',async t=>{
 const f=await fixture(t);const id=await f.entered();
 assert.equal((await f.action(id,'stop')).status,200);
 assert.equal((await f.request('/api/records/reports')).status,409);
 const after=(await f.refresh()).data;assert.equal(after.support,null);assert.equal(after.company.id,'developer-dev');assert.equal(after.managementCompany.id,'alpha');
 for(const path of ['/index.html','/portal.html?section=users','/portal.html?section=businesses']){
  const page=await f.request(path);assert.equal(page.status,200,path);assert.match(page.headers['content-type'],/^text\/html/);assert.match(page.data,/developer-dev/);
 }
 const redirected=await f.request('/portal.html/?section=users');assert.equal(redirected.status,307);
 const returnPage=await f.request(redirected.headers.location);assert.equal(returnPage.status,200);assert.match(returnPage.data,/developer-dev/);
 const bootstrap=JSON.parse(returnPage.data.match(/id="schaltbase-session">([^<]+)<\/script>/)[1]);assert.equal(bootstrap.support,null);assert.equal(bootstrap.company.id,'developer-dev');assert.equal(bootstrap.managementCompany.id,'alpha');
 assert.equal((await f.action(id,'enter')).status,403);
});

test('logout ends the grant and a new login cannot reuse it',async t=>{
 const f=await fixture(t);const id=await f.entered();assert.equal((await f.request('/api/logout','POST',{})).status,200);
 f.login('dev','fresh');assert.equal((await f.action(id,'enter','fresh')).status,403);
 assert.equal(f.db.prepare('SELECT status FROM support_requests WHERE id=?').get(id).status,'ended');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM support_context').get().n,0);
});

test('deactivation, password reset, moving the approver or disabling the firm revoke support',async t=>{
 for(const mutation of ["UPDATE users SET enabled=0 WHERE id='member'","UPDATE users SET must_change=1 WHERE id='member'","UPDATE users SET company_id='beta' WHERE id='member'",`UPDATE companies SET data=json_set(data,'$.enabled',json('false')) WHERE id='alpha'`])await t.test(mutation,async t=>{
  const f=await fixture(t);await f.entered();f.db.exec(mutation);assert.equal((await f.request('/api/records/reports')).status,409);assert.equal((await f.poll()).data.outgoing[0].status,'revoked');
 });
});

test('support actions and data accesses are attributable without logging document contents',async t=>{
 const f=await fixture(t);const id=await f.entered();await f.request('/api/records/cad/one','PUT',{revision:0,value:{name:'Secret content'}});await f.request('/api/records/cad/one');await f.action(id,'stop','member');
 const logs=f.db.prepare("SELECT * FROM audit WHERE action LIKE 'support.%'").all();
 for(const action of ['requested','approved','entered','write','read','revoked'])assert.ok(logs.some(r=>r.action==='support.'+action),action);
 assert.ok(logs.every(r=>r.company_id==='alpha'&&JSON.parse(r.target).requestId===id));assert.ok(logs.some(r=>r.action==='support.approved'&&r.actor==='member'));assert.ok(logs.some(r=>r.action==='support.read'&&r.actor==='dev'));
 assert.doesNotMatch(JSON.stringify(logs),/Secret content|sid-dev|csrf-dev/);
});
