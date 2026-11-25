import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {resolve} from 'node:path';
import {openDatabase,saveObject} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {token,digest} from '../server/security.mjs';
import {offer,validateOffer,offerText,totals} from '../offerten/core.mjs';
import {SBR,AUFBAU,sbrSnapshot} from '../offerten/sbr.mjs';
import {validateArticle} from '../offerten/articles.mjs';
import {cutStock,stockQuantity,validateStock,materialDemand,planInventory} from '../platform/inventory-model.mjs';
import {customerMaterials,materialStatus,receiveMaterials} from '../platform/material-model.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
import {renderOfferPages} from '../offerten/offer-pdf.mjs';
const rail=(overrides={})=>({article:'R1',name:'DIN-Schiene',unit:'m',location:'',brand:'Test',price:5,minimum:0,kind:'linear',bars:2,barLengthMm:6000,kerfMm:3,remnants:[],...overrides});
const template=(type=SBR)=>({article:'FRAME',name:'Rahmen',type,minutes:10,profiles:[{article:'R1',name:'DIN-Schiene',direction:'quer',pricePerM:5}]});
function quote(id='quote'){const d=offer();Object.assign(d,{id,number:'AN-1',status:'approved',customer:'Muster AG',rate:100,customerMaterials:[{id:'customer-1',article:'C1',name:'Kundengerät',qty:2,unit:'Stk.',notes:'Bis Lieferung bereitstellen'}]});d.plants[0].parts[0].items=[{...sbrSnapshot(template(),1500,2000,[4]),id:'frame',qty:1}];return d;}
test('four 1500 mm cuts use two 6 m bars, preserve remainders, and consume kerf',()=>{
 const s=rail(),r=cutStock(s,[{lengthMm:1500,count:4}]);assert.equal(r.newBars,2);assert.equal(r.quantity,6);assert.equal(r.waste,.012);assert.deepEqual(r.next.remnants,[{lengthMm:1491,count:1},{lengthMm:4497,count:1}]);assert.equal(stockQuantity(s),r.quantity+r.waste+stockQuantity(r.next));assert.equal(s.bars,2);
 const fractional=rail({kerfMm:2.5});const fractionResult=cutStock(fractional,[{lengthMm:1500.5,count:4}]);assert.ok(Math.abs(stockQuantity(fractional)-fractionResult.quantity-fractionResult.waste-stockQuantity(fractionResult.next))<1e-9);
 const reused=cutStock(r.next,[{lengthMm:1400,count:1}]);assert.equal(reused.newBars,0);assert.equal(reused.used[0].source,'Reststück');assert.equal(reused.used[0].remaining,88);
 const exact=cutStock(rail({bars:1}),[{lengthMm:6000,count:1}]);assert.equal(exact.waste,0);assert.equal(exact.next.bars,0);assert.equal(exact.next.remnants.length,0);
 assert.throws(()=>cutStock(s,[{lengthMm:6001,count:1}]),/länger/);
 const short=cutStock(rail({bars:1}),[{lengthMm:1500,count:4}]);assert.deepEqual(short.missing,[1500]);assert.equal(short.next.bars,0);
});
test('deterministic cutting conserves physical length for many requests and never splices pieces',()=>{
 for(let n=1;n<80;n++){const s=rail({bars:3,kerfMm:n%6,remnants:[{lengthMm:850,count:2}]}),cuts=[{lengthMm:137+n*39,count:7},{lengthMm:2222,count:2}],result=cutStock(s,cuts);assert.ok(Math.abs(stockQuantity(s)-result.quantity-result.waste-stockQuantity(result.next))<.00001);assert.ok(result.next.bars>=0);for(const u of result.used)assert.equal(u.lengthMm,u.remaining+u.wasteMm+u.cuts.reduce((a,b)=>a+b,0));}
});
test('SBR quantities and new dynamic Aufbau components survive quotation backup and drive stock demand',()=>{
 const d=quote();d.plants[0].parts[0].items[0].qty=2;assert.deepEqual(materialDemand(d).map(x=>[x.quantity,x.cuts]),[[12,[{lengthMm:1500,count:8}]]]);
 const t={...template(AUFBAU),profiles:[{article:'R1',name:'Profil',direction:'quer',pricePerM:5,deductionMm:40},{article:'D1',name:'Gerät',direction:'stueck',pricePerM:20},{article:'DEPTH',name:'Tiefe',direction:'tiefe',pricePerM:10},{article:'FIX',name:'Fix',direction:'fest',lengthMm:350,pricePerM:2}]};
 const own=validateArticle({...t,unit:'Stk.',price:0,minutes:12});const item={...sbrSnapshot(own,1000,2000,[2,3,1,1],{depth:165}),id:'assembly',qty:2};d.plants[0].parts[0].items=[item];assert.equal(item.type,AUFBAU);assert.equal(item.price,71.95);const restored=validateOffer(d);assert.equal(restored.plants[0].parts[0].items[0].sbr.template.type,AUFBAU);assert.deepEqual(materialDemand(restored),materialDemand(d));assert.equal(materialDemand(d).find(x=>x.article==='D1').quantity,6);assert.equal(totals(restored).total,totals(d).total);
 const p=planInventory(d,[{...rail({article:'D1',unit:'Stk.',kind:'quantity',quantity:5}),id:'device'}]);assert.equal(p.find(x=>x.tracked).missing,1);
 assert.throws(()=>validateStock(rail({bars:1.5})),/ganzzahlig/);assert.throws(()=>validateStock(rail({kerfMm:-1})),/ungültig/);
});
test('customer materials are unpriced, exported in all modes, and receipts validate expected quantities',async()=>{
 const d=quote(),before=totals(d);assert.equal(materialStatus(d),'pending');const restored=validateOffer(d);assert.deepEqual(restored.customerMaterials,d.customerMaterials);d.materialReceipts=receiveMaterials(d,{'customer-1':1},'Test','2026-11-25');assert.equal(materialStatus(d),'pending');d.materialReceipts=receiveMaterials(d,{'customer-1':2},'Test','2026-11-25');assert.equal(materialStatus(d),'complete');assert.deepEqual(totals(d),before);assert.throws(()=>receiveMaterials(d,{'customer-1':3},'x','x'),/erwarteten/);assert.throws(()=>receiveMaterials(d,{other:1},'x','x'));assert.throws(()=>customerMaterials([d.customerMaterials[0],d.customerMaterials[0]]),/doppelte/);
 for(const mode of ['detail','plant','totals']){assert.match(offerText(d,mode),/Kundengerät/);assert.match(offerHTML(d,mode),/Kundengerät/);const texts=[];const context={scale(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(){},measureText:t=>({width:String(t).length*5}),fillText:t=>texts.push(t)};await renderOfferPages(d,mode,{createCanvas:()=>({getContext:()=>context})});assert.ok(texts.some(t=>t.includes('Kundengerät')));}
});
test('inventory API atomically books orders, isolates companies and protects revisions and receipts',async t=>{
 const db=openDatabase(':memory:'),origin='http://localhost',auth={};
 for(const id of ['a','b'])saveObject(db,'companies',{id,name:id,planId:'komplett',startsOn:'2000-01-01',endsOn:'2099-12-31',enabled:true,seats:10,profile:{name:id}});
 for(const [id,c,role,permissions] of [['admin','a','admin',{offers:'write'}],['writer','a','member',{offers:'write'}],['reader','a','member',{inventory:'read'}],['stock','a','member',{inventory:'write'}],['other','b','admin',{}],['none','a','member',{}],['dev',null,'developer',{}]]){db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,c,id,id,role,JSON.stringify(permissions),'unused',new Date().toISOString());const sid=token();db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest(sid),id,c,'csrf',Date.now()+3600000,Date.now());auth[id]={Cookie:'test-session='+sid,'X-CSRF-Token':'csrf','X-User-Id':id,'X-Company-Id':c||'developer-dev'};}
 const docs=[quote()];const store=()=>db.prepare("INSERT INTO records VALUES ('a','offers','offers',?,1,'writer',?) ON CONFLICT(company_id,area,id) DO UPDATE SET data=excluded.data").run(JSON.stringify(docs),new Date().toISOString());store();
 const app=createApp({db,root:resolve(import.meta.dirname,'..'),origin});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const request=(path,method='GET',body,actor='admin',extra={})=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:app.address().port,path,method,headers:{Host:'localhost',Origin:origin,'Content-Type':'application/json',...auth[actor],...extra}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const raw=Buffer.concat(chunks).toString();resolve({status:res.statusCode,data:res.headers['content-type']?.includes('application/json')?JSON.parse(raw):raw});});});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});
 let item,order;
 try{
 await t.test('stock read/write, tenant, developer isolation, CSRF and optimistic concurrency',async()=>{
  assert.equal((await request('/api/company/inventory','GET',undefined,'none')).status,403);
  const result=await request('/api/company/inventory/items','POST',{value:rail({bars:1}),revision:0,reason:'Anfangsbestand'});assert.equal(result.status,201);item=result.data;
  assert.equal((await request('/api/company/inventory','GET',undefined,'reader')).data.items.length,1);
  for(const actor of ['writer','reader'])assert.equal((await request('/api/company/inventory/items/'+item.id,'PUT',{value:rail(),revision:1,reason:'test'},actor)).status,403);
  assert.equal((await request('/api/company/inventory/items/'+item.id,'PUT',{value:rail(),revision:1,reason:'test'},'other')).status,404);
  assert.equal((await request('/api/company/inventory','GET',undefined,'other')).data.items.length,0);assert.equal((await request('/api/company/inventory','GET',undefined,'dev')).data.items.length,0);
  assert.equal((await request('/api/company/inventory/items/'+item.id,'PUT',{value:rail(),revision:1,reason:'test'},'stock',{'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await request('/api/company/inventory','GET',undefined,'stock',{'X-Company-Id':'b'})).status,409);
  assert.equal((await request('/api/company/inventory/items/'+item.id,'PUT',{value:rail(),revision:0,reason:'test'},'stock')).status,409);
  assert.equal((await request('/api/records/inventoryItems/'+item.id)).status,404);
  assert.equal((await request('/lager.html','GET',undefined,'reader')).status,200);assert.equal((await request('/offerten/sbr.mjs','GET',undefined,'reader')).status,200);
 });
 await t.test('preview reads availability without writing or granting inventory management',async()=>{
  const preview=await request('/api/company/inventory/preview','POST',{document:docs[0]},'writer');assert.equal(preview.status,200);assert.equal(preview.data[0].missing,1.5);assert.equal(preview.data[0].next,undefined);assert.equal((await request('/api/company/inventory')).data.items[0].bars,1);
  assert.equal((await request('/api/company/inventory/availability','GET',undefined,'writer')).data[0].available,6);
 });
 await t.test('simultaneous conversions deduct only once and preserve source quotation',async()=>{
  const responses=await Promise.all([1,2].map(()=>request('/api/company/orders','POST',{offerId:docs[0].id,source:docs[0]},'writer')));assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);order=responses[0].data;assert.equal(order.value.inventory.lines[0].missing,1.5);assert.equal(order.value.inventory.lines[0].booked,4.5);
  let inventory=(await request('/api/company/inventory')).data;assert.equal(inventory.orders.length,1);assert.equal(inventory.items[0].bars,0);assert.deepEqual(inventory.items[0].remnants,[{lengthMm:1491,count:1}]);assert.equal(inventory.items[0].revision,2);assert.deepEqual((await request('/api/records/offers/offers','GET',undefined,'writer')).data.value,docs);
 });
 await t.test('invalid cut dimensions roll back number allocation, stock and order creation',async()=>{
  const invalid=quote('invalid');invalid.plants[0].parts[0].items[0].sbr.width=7000;docs.push(invalid);store();const before=db.prepare('SELECT COUNT(*) n FROM document_numbers').get().n;
  const result=await request('/api/company/orders','POST',{offerId:invalid.id,source:invalid},'writer');assert.equal(result.status,400);assert.equal(db.prepare('SELECT COUNT(*) n FROM document_numbers').get().n,before);assert.equal((await request('/api/company/inventory')).data.items[0].revision,2);
 });
 await t.test('restocking and shortage follow-up are audited, revision protected and idempotent',async()=>{
  const inv=(await request('/api/company/inventory')).data,current=inv.items[0];await request('/api/company/inventory/items/'+current.id,'PUT',{revision:current.revision,value:{...current,bars:1},reason:'Wareneingang'},'stock');const ledger=inv.orders[0];
  const follow=await request('/api/company/inventory/orders/'+order.id+'/fulfil','POST',{revision:ledger.revision},'stock');assert.equal(follow.status,200);assert.equal(follow.data.lines[0].missing,0);assert.equal(follow.data.lines[0].booked,6);assert.equal(follow.data.followUps.length,1);
  assert.equal((await request('/api/company/inventory/orders/'+order.id+'/fulfil','POST',{revision:ledger.revision},'stock')).status,409);assert.equal((await request('/api/company/inventory/orders/'+order.id+'/fulfil','POST',{revision:follow.data.revision},'stock')).status,409);
  const currentOrder=(await request('/api/company/orders','GET',undefined,'writer')).data.find(r=>r.id===order.id);assert.equal(currentOrder.value.inventory.lines[0].missing,0);order=currentOrder;
 });
 await t.test('different simultaneous orders cannot overdraw the same item',async()=>{
  const value={article:'D1',name:'Gerät',brand:'',location:'',unit:'Stk.',price:10,minimum:0,kind:'quantity',quantity:1};assert.equal((await request('/api/company/inventory/items','POST',{value,revision:0,reason:'Anfang'},'stock')).status,201);
  const additions=['parallel-a','parallel-b'].map(id=>{const d=quote(id);d.plants[0].parts[0].items=[{id:'device',article:'D1',name:'Gerät',unit:'Stk.',qty:1,price:10,minutes:0}];return d;});docs.push(...additions);store();
  const results=await Promise.all(additions.map(d=>request('/api/company/orders','POST',{offerId:d.id,source:d},'writer')));assert.deepEqual(results.map(r=>r.status),[201,201]);assert.deepEqual(results.map(r=>r.data.value.inventory.lines[0].booked).sort(),[0,1]);assert.deepEqual(results.map(r=>r.data.value.inventory.lines[0].missing).sort(),[0,1]);assert.equal((await request('/api/company/inventory')).data.items.find(i=>i.article==='D1').quantity,0);
 });
 await t.test('customer receipts retain partial quantities and enforce order write scope',async()=>{
  let res=await request('/api/company/orders/'+order.id,'PATCH',{revision:order.revision,value:{status:'open',received:{'customer-1':1}}},'writer');assert.equal(res.status,200);assert.equal(materialStatus(res.data.value),'pending');assert.equal(res.data.value.materialReceipts['customer-1'].by,'writer');
  assert.equal((await request('/api/company/orders/'+order.id,'PATCH',{revision:res.data.revision,value:{status:'open',received:{'customer-1':3}}},'writer')).status,400);
  res=await request('/api/company/orders/'+order.id,'PATCH',{revision:res.data.revision,value:{status:'open',received:{'customer-1':2}}},'writer');assert.equal(res.status,200);assert.equal(materialStatus(res.data.value),'complete');
  assert.equal((await request('/api/company/orders/'+order.id,'PATCH',{revision:res.data.revision,value:{status:'open',received:{'customer-1':0}}},'reader')).status,403);
 });
 }finally{await new Promise(r=>app.close(r));db.close();}
});
