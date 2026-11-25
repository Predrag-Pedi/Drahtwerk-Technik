import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolve} from 'node:path';
import {openDatabase,saveObject} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {token,digest,passwordHash} from '../server/security.mjs';
import {companyStorageBytes} from '../server/storage.mjs';
import {validateCustomer,customerSnapshot} from '../platform/customers-model.mjs';
const customer={name:'Muster AG',number:'K-1',street:'Testweg 1',postcode:'5400',city:'Baden',country:'CH',email:'info@example.test',phone:'056 123 45 67',archived:false,contacts:[{id:'one',name:'Anna Muster',role:'Projektleitung',street:'',postcode:'',city:'',country:'',email:'anna@example.test',phone:'',mobile:'079 000 00 00'}]};
test('customers, atomic large catalogues, explicit account status and public SEO',async t=>{
 const db=openDatabase(':memory:'),origin='http://localhost';for(const id of ['a','b'])saveObject(db,'companies',{id,name:id,planId:'komplett',startsOn:'2000-01-01',endsOn:'2099-12-31',enabled:true,seats:5,profile:{}});
 const hash=await passwordHash('TestPassword-2026');for(const [id,c,role,perms] of [['dev','a','developer',{}],['writer','a','member',{offers:'write'}],['reader','a','member',{offers:'read'}],['other','b','member',{offers:'write'}],['shop','a','member',{rails:'write'}],['admin','a','admin',{offers:'write'}]])db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,c,id,id,role,JSON.stringify(perms),hash,new Date().toISOString());
 const session=(id,c='a')=>{const sid=token();db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest(sid),id,c,'csrf',Date.now()+3600000,Date.now());return {Cookie:'test-session='+sid,'X-CSRF-Token':'csrf','X-User-Id':id,'X-Company-Id':c};};
 const auth={dev:session('dev'),writer:session('writer'),reader:session('reader'),other:session('other','b'),shop:session('shop'),admin:session('admin')};
 const app=createApp({db,root:resolve(import.meta.dirname,'..'),origin});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const request=(path,method='GET',body,role='writer')=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:app.address().port,path,method,headers:{Host:'localhost',Origin:origin,'Content-Type':'application/json',...(auth[role]||{})}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,data:res.headers['content-type']?.includes('application/json')?JSON.parse(raw):raw});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
 const start=async(revision,count,role='writer')=>{const r=await request('/api/company/catalog/imports','POST',{revision,count},role);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.id;};
 const put=(id,seq,items,role='writer')=>request(`/api/company/catalog/imports/${id}/${seq}`,'PUT',{items},role);
 const commit=id=>request(`/api/company/catalog/imports/${id}/commit`,'POST',{});
 try{
  await t.test('customer CRUD is tenant scoped, permission checked and revision protected',async()=>{
   assert.equal((await request('/api/records/customers/one','PUT',{revision:0,value:customer})).status,200);
   assert.equal((await request('/api/records/customers/one','GET',undefined,'reader')).data.value.name,'Muster AG');
   assert.equal((await request('/api/records/customers/one','GET',undefined,'other')).data.value,null);
   assert.equal((await request('/api/records/customers','GET',undefined,'shop')).status,403);
   assert.equal((await request('/api/records/customers/one','PUT',{revision:1,value:customer},'reader')).status,403);
   assert.equal((await request('/api/records/customers/one','PUT',{revision:0,value:customer})).status,409);
   assert.equal((await request('/api/records/customers/one','PUT',{revision:1,value:{...customer,contacts:[null]}})).status,400);
   const snapshot=customerSnapshot(customer,customer.contacts[0]);assert.equal(snapshot.email,'anna@example.test');assert.equal(snapshot.phone,'079 000 00 00');assert.match(snapshot.address,/Testweg 1/);
   assert.equal((await request('/api/records/customers/one','PUT',{revision:1,value:{...customer,name:'Neue Adresse AG',archived:true}})).status,200);assert.equal(snapshot.customer,'Muster AG');
   assert.equal((await request('/kunden.html')).status,200);assert.equal((await request('/kunden.html','GET',undefined,'shop')).status,403);
  });
  await t.test('incomplete uploads never replace an existing legacy catalogue; other tenants cannot use upload IDs',async()=>{
   assert.equal((await request('/api/records/offers/catalog','PUT',{revision:0,value:[{name:'Existing'}]})).status,200);
   const id=await start(1,2);assert.equal((await put(id,0,[{name:'New'}])).status,200);assert.equal((await commit(id)).status,400);
   assert.equal((await request('/api/records/offers/catalog')).data.value[0].name,'Existing');assert.equal((await put(id,1,[{name:'Foreign'}],'other')).status,404);
   assert.equal((await request('/api/company/catalog/imports','POST',{revision:1,count:1},'reader')).status,403);
   assert.equal((await request(`/api/company/catalog/imports/${id}`,'DELETE',{})).status,200);assert.equal(db.prepare('SELECT COUNT(*) n FROM catalog_chunks').get().n,0);
  });
  await t.test('159341 synthetic articles over 64 MiB save and read in small requests',async()=>{
   const count=159341,id=await start(1,count);let totalBytes=0,seq=0;
   for(let i=0;i<count;i+=1000){const items=Array.from({length:Math.min(1000,count-i)},(_,n)=>({id:'a-'+(i+n),name:'Testartikel '+(i+n),description:'x'.repeat(450),price:1,minutes:2}));totalBytes+=Buffer.byteLength(JSON.stringify(items));const r=await put(id,seq++,items);assert.equal(r.status,200,JSON.stringify(r.data));}
   assert.ok(totalBytes>64*1024*1024);assert.equal((await request('/api/records/offers/catalog')).data.value[0].name,'Existing');
   const r=await commit(id);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.count,count);assert.equal(r.data.revision,2);
   const meta=(await request('/api/company/catalog','GET',undefined,'reader')).data;assert.equal(meta.chunks,seq);assert.equal(meta.count,count);assert.ok(companyStorageBytes(db,'a')>=totalBytes);
   const first=await request(`/api/company/catalog/chunks/${id}/0`,'GET',undefined,'reader');assert.equal(first.data[0].id,'a-0');
   assert.equal((await request(`/api/company/catalog/chunks/${id}/${seq-1}`)).data.at(-1).id,'a-159340');
   assert.equal((await request(`/api/company/catalog/chunks/${id}/0`,'GET',undefined,'other')).status,409);
   assert.equal((await request('/api/records/offers/catalog','PUT',{revision:0,value:[]})).status,409);
  });
  await t.test('concurrent imports cannot silently overwrite; replacement cleans previous chunks',async()=>{
   const first=await start(2,1),second=await start(2,1);await put(first,0,[{name:'First'}]);await put(second,0,[{name:'Second'}]);assert.equal((await commit(first)).status,200);assert.equal((await commit(second)).status,409);
   assert.equal(db.prepare('SELECT COUNT(*) n FROM catalog_chunks').get().n,2);await request(`/api/company/catalog/imports/${second}`,'DELETE',{});
   assert.equal((await request(`/api/company/catalog/chunks/${first}/0`)).data[0].name,'First');
  });
  await t.test('the browser catalogue transport round-trips chunked records and empty catalogues',async()=>{
   const originalFetch=globalThis.fetch;globalThis.__companyMode=true;
   globalThis.fetch=async(path,options={})=>{const r=await request(path,options.method,options.body?JSON.parse(options.body):undefined);return new Response(JSON.stringify(r.data),{status:r.status,headers:{'Content-Type':'application/json'}});};
   try{const client=await import('../platform/catalog-client.mjs');assert.equal((await client.readCatalog())[0].name,'First');const items=Array.from({length:2001},(_,i)=>({id:String(i),name:'Artikel '+i,price:i}));await client.writeCatalog(items);assert.deepEqual(await client.readCatalog(),items);await client.writeCatalog([]);assert.deepEqual(await client.readCatalog(),[]);}
   finally{globalThis.fetch=originalFetch;delete globalThis.__companyMode;}
  });
  await t.test('permissions edits preserve enabled state and explicit reactivation restores login',async()=>{
   assert.equal((await request('/api/company/users/writer','PATCH',{role:'member',permissions:{offers:'write'}},'dev')).status,200);
   assert.equal(db.prepare("SELECT enabled FROM users WHERE id='writer'").get().enabled,1);
   assert.equal((await request('/api/company/users/writer/status','PATCH',{enabled:false},'dev')).status,200);
   assert.equal((await request('/api/login','POST',{identifier:'writer',password:'TestPassword-2026'},'anonymous')).status,401);
   assert.equal((await request('/api/company/users/writer/status','PATCH',{enabled:true},'dev')).status,200);
   assert.equal((await request('/api/login','POST',{identifier:'writer',password:'TestPassword-2026'},'anonymous')).status,200);
   assert.equal(db.prepare("SELECT password FROM users WHERE id='writer'").get().password,hash);
   assert.equal((await request('/api/company/users/admin/status','PATCH',{enabled:false},'dev')).status,409);
   assert.equal((await request('/api/company/users/other/status','PATCH',{enabled:true},'dev')).status,404);
  });
  await t.test('only public product pages appear in the sitemap and receive indexable metadata',async()=>{
   for(const path of ['/sitemap.xml','/robots.txt'])for(const method of ['GET','HEAD']){
    const response=await request(path,method,undefined,'anonymous');assert.equal(response.status,200);
    assert.equal(response.headers['x-robots-tag'],undefined,`${method} ${path} must not inherit the private-page crawler exclusion`);
    assert.match(response.headers['content-type'],path.endsWith('.xml')?/^application\/xml/:/^text\/plain/);
    if(method==='HEAD')assert.equal(response.data,'');else assert.ok(response.data.length>0);
   }
   const sitemap=await request('/sitemap.xml','GET',undefined,'anonymous');assert.equal(sitemap.status,200);assert.match(sitemap.data,/<loc>http:\/\/localhost\/produkte\/schema.html<\/loc>/);assert.doesNotMatch(sitemap.data,/kunden.html|portal.html|index.html|api/);
   assert.match((await request('/robots.txt')).data,/Sitemap: http:\/\/localhost\/sitemap.xml/);
   const home=await request('/','GET',undefined,'anonymous');assert.equal(home.headers['x-robots-tag'],'index, follow');assert.match(home.data,/rel="canonical" href="http:\/\/localhost\/"/);
   assert.equal((await request('/login.html','GET',undefined,'anonymous')).headers['x-robots-tag'],'noindex, nofollow');
   for(const [path,role,status] of [['/portal.html','anonymous',302],['/kunden.html','reader',200],['/api/records/customers','reader',200],['/api/records/customers','anonymous',401],['/missing.xml','anonymous',404]]){
    const response=await request(path,'GET',undefined,role);assert.equal(response.status,status,path);assert.equal(response.headers['x-robots-tag'],'noindex, nofollow',path);
   }
  });
 }finally{await new Promise(r=>app.close(r));db.close();}
});
test('customer validation rejects duplicate contacts and malformed addresses',()=>{assert.throws(()=>validateCustomer({...customer,contacts:[customer.contacts[0],customer.contacts[0]]}));assert.throws(()=>validateCustomer({...customer,email:'invalid'}));assert.throws(()=>validateCustomer({...customer,name:''}));});
