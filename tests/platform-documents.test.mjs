import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolve} from 'node:path';
import {openDatabase,saveObject,publicUser} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {token,digest} from '../server/security.mjs';
import {offer,totals,parseCSV} from '../offerten/core.mjs';
import {documentDefaults,positionsCSV,summaryCSV,reportsCSV} from '../platform/document-model.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
import {renderOfferPages} from '../offerten/offer-pdf.mjs';

function fixture(id='quote'){const d=offer();Object.assign(d,{id,number:'AN-00001',status:'approved',customer:'Kunde AG',recipientAddress:'Teststrasse 1\n5400 Baden',project:'Hauptverteilung',discount:7.5,vatRate:8.1});d.plants[0].parts[0].items=[{id:'line',article:'A1',name:'Schrank',type:'Schrank',unit:'Stk.',qty:3,price:100.03,minutes:0}];return d;}
test('orders and numbering retain tenant-scoped permissions after retiring accounting',async t=>{
 const db=openDatabase(':memory:'),origin='http://localhost',auth={};
 for(const id of ['a','b'])saveObject(db,'companies',{id,name:id,planId:'komplett',startsOn:'2000-01-01',endsOn:'2099-12-31',enabled:true,seats:10,profile:{name:'Firma '+id,vat:'CHE-123.456.789 MWST'}});
 for(const [id,c,role,permissions] of [['admin','a','admin',{}],['writer','a','member',{offers:'write'}],['reader','a','member',{orders:'read'}],['book','a','member',{}],['other','b','admin',{}],['member','a','member',{accounting:'write'}],['dev',null,'developer',{}]]){
  db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,c,id,id,role,JSON.stringify(permissions),'unused',new Date().toISOString());
  const sid=token();db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest(sid),id,c,'csrf',Date.now()+3600000,Date.now());auth[id]={Cookie:'test-session='+sid,'X-CSRF-Token':'csrf','X-User-Id':id,'X-Company-Id':c||'developer-dev'};
 }
 let quotes=[fixture()];const store=()=>db.prepare("INSERT INTO records VALUES ('a','offers','offers',?,1,'writer',?) ON CONFLICT(company_id,area,id) DO UPDATE SET data=excluded.data").run(JSON.stringify(quotes),new Date().toISOString());store();
 const app=createApp({db,root:resolve(import.meta.dirname,'..'),origin});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const request=(path,method='GET',body,actor='writer',extra={})=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:app.address().port,path,method,headers:{Host:'localhost',Origin:origin,'Content-Type':'application/json',...(auth[actor]||{}),...extra}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();resolve({status:res.statusCode,data:res.headers['content-type']?.includes('application/json')?JSON.parse(raw):raw,headers:res.headers});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
 let order;
 try{
  await t.test('numbering skips legacy numbers, is idempotent and has a separate company and document scope',async()=>{
   const [a,b]=await Promise.all(['one','two'].map(id=>request('/api/company/offer-number','POST',{id})));
   assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(new Set([a.data.number,b.data.number]),new Set(['AN-00002','AN-00003']));
   assert.equal((await request('/api/company/offer-number','POST',{id:'one'})).data.number,a.data.number);
   assert.equal((await request('/api/company/offer-number','POST',{id:'one'},'book')).status,403);
   assert.equal((await request('/api/company/document-settings','GET',undefined,'other')).data.value.offer.next,1);
  });
  await t.test('only managers can edit templates, and stale settings cannot overwrite allocated counters',async()=>{
   const initial=(await request('/api/company/document-settings','GET',undefined,'admin')).data;
   const settings=structuredClone(initial.value);settings.order={...settings.order,prefix:'PRO-',includeYear:true,next:80,digits:3};
   assert.equal((await request('/api/company/document-settings','PUT',{value:settings,revision:initial.revision},'writer')).status,403);
   assert.equal((await request('/api/company/document-settings','PUT',{value:settings,revision:initial.revision},'book')).status,403);
   assert.equal((await request('/api/company/document-settings','PUT',{value:settings,revision:initial.revision},'admin')).status,200);
   assert.equal((await request('/api/company/document-settings','PUT',{value:settings,revision:initial.revision},'admin')).status,409);
   const current=(await request('/api/company/document-settings','GET',undefined,'admin')).data;current.value.order.prefix='<script>';
   assert.equal((await request('/api/company/document-settings','PUT',current,'admin')).status,400);
  });
  await t.test('unapproved, unsaved or invalid quotes cannot become orders',async()=>{
   quotes[0].status='open';store();assert.equal((await request('/api/company/orders','POST',{offerId:'quote',source:quotes[0]})).status,409);
   quotes[0].status='approved';store();assert.equal((await request('/api/company/orders','POST',{offerId:'quote',source:{...quotes[0],customer:'Changed'}})).status,409);
   assert.equal((await request('/api/company/orders','POST',{offerId:'missing',source:quotes[0]})).status,404);
   const customer=quotes[0].customer;quotes[0].customer='';store();assert.equal((await request('/api/company/orders','POST',{offerId:'quote',source:quotes[0]})).status,400);quotes[0].customer=customer;store();
  });
  await t.test('concurrent conversion produces a single immutable snapshot and confirmation',async()=>{
   const responses=await Promise.all([1,2].map(()=>request('/api/company/orders','POST',{offerId:'quote',source:quotes[0]})));
   assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);assert.equal(responses[0].data.id,responses[1].data.id);order=responses[0].data;
   assert.match(order.value.number,/^PRO-\d{4}-080$/);assert.equal(order.value.companyProfile.name,'Firma a');assert.equal(order.value.validUntil,'');assert.equal(order.value.sourceOfferNumber,'AN-00001');assert.deepEqual(order.value.sourceOfferSnapshot,quotes[0]);
   const retained=await request('/api/records/offers/offers');assert.equal(retained.status,200);assert.equal(retained.data.revision,1);assert.deepEqual(retained.data.value,quotes,'Creating an order preserves the approved source offer and its revision');
   const before=totals(order.value);quotes[0].plants[0].parts[0].items[0].price=999;store();const saved=(await request('/api/company/orders')).data;assert.equal(saved.length,1);assert.deepEqual(totals(saved[0].value),before);
   const html=offerHTML(order.value,'detail',false,order.value.companyProfile);assert.match(html,/Auftragsbestätigung PRO-/);assert.match(html,/Auftragstotal/);assert.doesNotMatch(html,/Angebotstotal|Gültig bis/);
  });
  await t.test('orders enforce read/write, tenant and session-context boundaries',async()=>{
   assert.equal((await request('/api/company/orders','GET',undefined,'other')).data.length,0);
   assert.equal((await request('/api/company/orders/'+order.id,'PATCH',{revision:1,value:{status:'completed'}},'other')).status,404);
   assert.equal((await request('/api/company/orders/'+order.id,'PATCH',{revision:1,value:{status:'completed'}},'reader')).status,403);
   assert.equal((await request('/api/company/orders','GET',undefined,'reader')).data.length,1);
   assert.equal((await request('/api/company/orders','GET',undefined,'writer',{'X-Company-Id':'b'})).status,409);
   assert.equal((await request('/api/company/orders','POST',{offerId:'quote',source:quotes[0]},'writer',{'X-CSRF-Token':'wrong'})).status,403);
   assert.equal((await request('/api/records/orders','GET')).status,404);
   const changed=await request('/api/company/orders/'+order.id,'PATCH',{revision:1,value:{status:'progress',reference:'PO-123',deliveryDate:'2027-02-20',internalNotes:'Werkstatt informieren',number:'forged',plants:[]}});assert.equal(changed.status,200);assert.equal(changed.data.value.number,order.value.number);assert.equal(changed.data.value.plants.length,1);
   assert.equal((await request('/api/company/orders/'+order.id,'PATCH',{revision:1,value:{status:'completed'}})).status,409);
   assert.equal((await request('/api/company/orders/'+order.id,'PATCH',{revision:2,value:{status:'completed',deliveryDate:'2027-02-30'}})).status,400);
  });
  await t.test('the retired accounting page and API are unavailable, including to admins and developers',async()=>{
   for(const actor of ['writer','reader','member','book','admin','dev','anonymous']){
    assert.equal((await request('/api/company/accounting','GET',undefined,actor)).status,actor==='anonymous'?401:404);
    for(const path of ['/buchhaltung.html','/buchhaltung.html/?section=orders'])assert.equal((await request(path,'GET',undefined,actor)).status,404);
    if(actor!=='anonymous')assert.equal(Object.hasOwn((await request('/api/session','GET',undefined,actor)).data.permissions,'accounting'),false);
   }
   assert.equal((await request('/api/company/orders','GET',undefined,'book')).status,403);
   assert.equal((await request('/api/records/offers/offers','GET',undefined,'book')).status,403);
   assert.equal((await request('/api/company/users','GET',undefined,'book')).status,403);
   assert.equal((await request('/auftraege.html','GET',undefined,'reader')).status,200);
   for(const file of ['core','sbr','offer-document','offer-pdf','image-pdf'])assert.equal((await request('/offerten/'+file+'.mjs','GET',undefined,'reader')).status,200);
  });
  await t.test('new accounts cannot receive the retired role; ordinary employee creation still works',async()=>{
   const body={companyId:'a',identifier:'finance.new',name:'Finance',role:'accounting',permissions:{},passwordMode:'random'};
   assert.equal((await request('/api/admin/users','POST',body,'dev')).status,400);
   assert.equal(db.prepare("SELECT id FROM users WHERE email='finance.new'").get(),undefined);
   const created=await request('/api/admin/users','POST',{...body,role:'member',permissions:{rails:'read',accounting:'write'}},'dev');
   assert.equal(created.status,201);assert.equal(created.data.user.role,'member');assert.equal(created.data.user.mustChangePassword,true);assert.ok(created.data.temporaryPassword.length>=12);
   assert.equal(created.data.user.permissions.rails,'read');assert.equal(Object.hasOwn(created.data.user.permissions,'accounting'),false);
  });
  await t.test('the retired role cannot be assigned through an old client or used to elevate a member',async()=>{
   const before=db.prepare("SELECT * FROM users WHERE id='book'").get();
   assert.equal((await request('/api/company/users/book','PATCH',{role:'accounting',permissions:{offers:'write'}},'admin')).status,400);
   assert.deepEqual(db.prepare("SELECT * FROM users WHERE id='book'").get(),before);
   assert.equal((await request('/api/company/users/book','PATCH',{role:'admin',permissions:{}},'admin')).status,403);
   assert.equal((await request('/api/company/users/book','PATCH',{role:'member',permissions:{rails:'read',accounting:'write'}},'admin')).status,200);
   const saved=publicUser(db.prepare("SELECT * FROM users WHERE id='book'").get());assert.equal(saved.role,'member');assert.equal(saved.permissions.rails,'read');assert.equal(Object.hasOwn(saved.permissions,'accounting'),false);
  });
  await t.test('selecting a customer company for administration never opens its orders',async()=>{
   assert.equal((await request('/api/session/company','POST',{companyId:'a'},'dev')).status,200);
   const r=await request('/api/company/orders','GET',undefined,'dev');assert.equal(r.status,200);assert.deepEqual(r.data,[]);
   assert.equal((await request('/api/company/orders','GET',undefined,'dev',{'X-Company-Id':'a'})).status,409);
   assert.equal((await request('/api/company/users/member','PATCH',{role:'accounting',permissions:{}},'dev',{'X-Company-Id':'a'})).status,400);
  });
 }finally{await new Promise(r=>app.close(r));db.close();}
});

test('exports preserve exact discounted and taxed totals and escape spreadsheet formulas',()=>{
 const d=fixture();d.customer='=HYPERLINK("bad")';d.plants[0].parts[0].items.push({...d.plants[0].parts[0].items[0],id:'second',qty:7,price:.11});const rows=parseCSV(positionsCSV([d]),';'),header=rows[0],t=totals(d);
 for(const [name,value] of [['Rabatt CHF',t.discount],['Netto CHF',t.total],['MWST CHF',t.vat],['Brutto CHF',t.gross]]){const total=rows.slice(1).reduce((sum,row)=>sum+Math.round(Number(row[header.indexOf(name)])*100),0);assert.equal(total,Math.round(value*100),name);}
 assert.ok(rows[1][header.indexOf('Kunde')].startsWith("'=HYPERLINK"));assert.match(summaryCSV([d]),/MWST %/);assert.match(summaryCSV([d]),/Kundenadresse/);
 const r={number:'R-1',date:'2026-11-25',customer:'Test',customerAddress:'Testweg',project:'Umbau',status:'signed',work:[{employee:'A',date:'2026-11-25',activity:'Umbau',hours:2}],materials:[{article:'M-1',description:'Draht',quantity:10,unit:'m'}],km:30,travelHours:1,expenses:12,signature:{name:'Kunde',signedAt:'2026-11-25T12:00:00Z'}};
 const details=reportsCSV([r],true);for(const value of ['Umbau','Draht','Fahrtzeit','Spesen','30'])assert.ok(details.includes(value));assert.match(reportsCSV([r]),/Unterschrieben am/);
});
test('confirmation PDF renders document title, original sender, references and tax totals',async()=>{
 const d={...fixture(),documentType:'order',sourceOfferNumber:'AN-123',number:'AU-9',reference:'Kunde-88',deliveryDate:'2027-01-10',validUntil:''};
 const pages=await renderOfferPages(d,'detail',{profile:{name:'Gesicherte Firma'},createCanvas:()=>{const text=[],ctx={scale(){},fillRect(){},drawImage(){},fillText(s){text.push(s);},measureText(s){return {width:s.length*5};},beginPath(){},moveTo(){},lineTo(){},stroke(){}};return {text,getContext:()=>ctx};}});
 const text=pages.flatMap(p=>p.text).join('\n');for(const value of ['Auftragsbestätigung AU-9','Gesicherte Firma','AN-123','Kunde-88','10.01.2027','Auftragstotal inkl. MWST'])assert.ok(text.includes(value),value);assert.doesNotMatch(text,/Angebotstotal/);
});
