import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import net from 'node:net';
import {openDatabase,saveObject} from '../server/db.mjs';
import {digest} from '../server/security.mjs';
import {createApp} from '../server/app.mjs';

test('Uniway-only staff can enter technical tables; grants persist and remain licence-bound',async t=>{
 const db=openDatabase(':memory:');
 const company={id:'uniway-test',name:'Werkstatt',enabled:true,startsOn:'2000-01-01',endsOn:'2099-12-31',planId:'basis',seats:10,profile:{}};
 saveObject(db,'companies',company);
 for(const [id,role,permissions] of [['member','member',{uniway:'read'}],['none','member',{}],['abb','member',{smissline:'read'}],['admin','admin',{workshop:'write'}]]){
  db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,company.id,id,id,role,JSON.stringify(permissions),'unused',new Date().toISOString());
 }
 const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
 const origin=`http://127.0.0.1:${port}`,server=createApp({db,root:resolve(import.meta.dirname,'..'),origin});await new Promise(r=>server.listen(port,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();});
 function session(id){db.prepare('INSERT OR REPLACE INTO sessions VALUES (?,?,?,?,?,?)').run(digest(id),id,company.id,'test-csrf',Date.now()+3600000,Date.now());}
 for(const id of ['member','none','abb','admin'])session(id);
 const request=(path,id,body)=>fetch(origin+path,{redirect:'manual',method:body?'PATCH':'GET',headers:{Origin:origin,...(id?{Cookie:'test-session='+id,'X-CSRF-Token':'test-csrf','X-User-Id':id,'X-Company-Id':company.id}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const anonymous=await request('/technik.html');assert.equal(anonymous.status,302);assert.equal(anonymous.headers.get('location'),'/login.html');
 assert.equal((await request('/technik.html','none')).status,403);assert.equal((await request('/technik.html','abb')).status,200);
 const page=await request('/technik.html','member');assert.equal(page.status,200);assert.match(await page.text(),/data-tab="uniway"/);
 assert.equal((await request('/schienenrechner.html','member')).status,403);
 let account=await (await request('/api/session','member')).json();assert.equal(account.permissions.uniway,'read');assert.equal(account.permissions.smissline,'none');
 const edit={role:'member',enabled:true,permissions:{uniway:'write'}};
 assert.equal((await request('/api/company/users/none','member',edit)).status,403);
 assert.equal((await request('/api/company/users/none','admin',edit)).status,200);
 session('none');account=await (await request('/api/session','none')).json();assert.equal(account.permissions.uniway,'write');assert.equal((await request('/technik.html','none')).status,200);
 assert.equal((await request('/api/company/users/none','admin',{...edit,permissions:{uniway:'none'}})).status,200);
 session('none');assert.equal((await request('/technik.html','none')).status,403);
 saveObject(db,'companies',{...company,enabled:false});assert.equal((await request('/technik.html','member')).status,403);
 const product=await request('/produkte/hager-uniway.html');assert.equal(product.status,200);assert.match(await product.text(),/Hager Uniway/);
});
