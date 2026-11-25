import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {audit} from './db.mjs';
import {fail,text} from './security.mjs';
import {companyStorageBytes,companyStorageLimit} from './storage.mjs';
import {swissDay,planAllows} from '../platform/model.mjs';
import {validateOffer,totals} from '../offerten/core.mjs';
import {documentDefaults,validateDocumentSettings,formatDocumentNumber,validateOrderUpdate} from '../platform/document-model.mjs';

export function documentsHandler({db,body,json,freshSession,requireArea,clock}){
 const record=(company,area,id)=>db.prepare('SELECT data,revision,updated_at FROM records WHERE company_id=? AND area=? AND id=?').get(company,area,id);
 const read=(company,area,id,fallback)=>{const r=record(company,area,id);return r?JSON.parse(r.data):fallback;};
 const settings=c=>({value:read(c,'documentSettings','settings',documentDefaults()),revision:record(c,'documentSettings','settings')?.revision||0});
 function write(s,area,id,value){
  const old=record(s.company.id,area,id),data=JSON.stringify(value);
  if(companyStorageBytes(db,s.company.id)-(old?Buffer.byteLength(old.data):0)+Buffer.byteLength(data)>companyStorageLimit)fail(413,'Speichergrenze des Betriebs erreicht.');
  const revision=(old?.revision||0)+1;
  db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?) ON CONFLICT(company_id,area,id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at').run(s.company.id,area,id,data,revision,s.user.id,new Date(clock()).toISOString());
  return {value,revision};
 }
 function atomic(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 function number(s,kind,id){
  const existing=db.prepare('SELECT number FROM document_numbers WHERE company_id=? AND kind=? AND document_id=?').get(s.company.id,kind,id);if(existing)return existing.number;
  const config=settings(s.company.id).value,setting=config[kind],year=swissDay(new Date(clock())).slice(0,4);
  const used=new Set((kind==='offer'?read(s.company.id,'offers','offers',[]):db.prepare("SELECT data FROM records WHERE company_id=? AND area='orders'").all(s.company.id).map(r=>JSON.parse(r.data))).map(d=>String(d.number||'').toLocaleLowerCase()));
  let result;
  for(let attempt=0;attempt<100000;attempt++){
   if(setting.next>9999999999)fail(409,'Nummernkreis ausgeschöpft. Bitte die Dokumentvorlagen prüfen.');
   result=formatDocumentNumber(setting,year);setting.next++;
   if(!used.has(result.toLocaleLowerCase())&&!db.prepare('SELECT 1 FROM document_numbers WHERE company_id=? AND kind=? AND number=? COLLATE NOCASE').get(s.company.id,kind,result))break;
   result=null;
  }
  if(!result)fail(409,'Bitte eine freie nächste Nummer in den Dokumentvorlagen festlegen.');
  db.prepare('INSERT INTO document_numbers(company_id,kind,number,document_id) VALUES (?,?,?,?)').run(s.company.id,kind,result,id);
  write(s,'documentSettings','settings',config);return result;
 }
 const orders=c=>db.prepare("SELECT id,data,revision,updated_at FROM records WHERE company_id=? AND area='orders' ORDER BY updated_at DESC").all(c).map(r=>({id:r.id,value:JSON.parse(r.data),revision:r.revision,updatedAt:r.updated_at}));
 const manager=s=>{if(!['admin','developer'].includes(s.user.role))fail(403,'Nur Firmenadministratoren können Dokumentvorlagen ändern.');requireArea(s,'orders',true);};
 return async function handle({req,res,path,method,s}){
  if(path==='/api/company/document-settings'){
   if(method==='GET'){if(!['read','write'].includes(s.permissions.offers))requireArea(s,'orders');else requireArea(s,'offers');json(res,settings(s.company.id));return;}
   if(method==='PUT'){manager(s);const b=await body(req,65536),current=freshSession(req,s);manager(current);const value=validateDocumentSettings(b.value);json(res,atomic(()=>{if(b.revision!==settings(current.company.id).revision)fail(409,'Vorlagen oder Nummernkreis wurden inzwischen geändert. Bitte neu laden.');const result=write(current,'documentSettings','settings',value);audit(db,current.user.id,current.company.id,'document.settings');return result;}));return;}
  }
  if(path==='/api/company/offer-number'&&method==='POST'){
   requireArea(s,'offers',true);const b=await body(req,8192),current=freshSession(req,s);requireArea(current,'offers',true);const id=text(b.id,100);if(!/^[a-zA-Z0-9_-]+$/.test(id))fail(400,'Ungültige Offerten-ID.');
   json(res,atomic(()=>({number:number(current,'offer',id),template:settings(current.company.id).value.offer})));return;
  }
  if(path==='/api/company/orders'&&method==='GET'){requireArea(s,'orders');json(res,orders(s.company.id));return;}
  if(path==='/api/company/orders'&&method==='POST'){
   requireArea(s,'orders',true);requireArea(s,'offers',true);const b=await body(req,10*1024*1024),current=freshSession(req,s);requireArea(current,'orders',true);requireArea(current,'offers',true);
   const result=atomic(()=>{
    const sourceId=text(b.offerId,100),existing=db.prepare('SELECT order_id FROM order_sources WHERE company_id=? AND offer_id=?').get(current.company.id,sourceId);
    if(existing){const r=record(current.company.id,'orders',existing.order_id);return {id:existing.order_id,value:JSON.parse(r.data),revision:r.revision,existing:true};}
    const source=read(current.company.id,'offers','offers',[]).find(d=>d.id===sourceId);
    if(!source)fail(404,'Offerte nicht gefunden. Bitte zuerst speichern.');
    if(source.status!=='approved')fail(409,'Nur eine genehmigte Offerte kann in einen Auftrag umgewandelt werden.');
    if(!isDeepStrictEqual(source,b.source))fail(409,'Die Offerte wurde inzwischen geändert. Bitte neu laden und prüfen.');
    let snapshot;try{snapshot=validateOffer(source);totals(snapshot);}catch(e){fail(400,e.message);}
    if(!snapshot.customer.trim()||!snapshot.number.trim()||!snapshot.plants.some(p=>p.parts.some(t=>t.items.some(i=>i.qty>0))))fail(400,'Kunde, Offertennummer und mindestens eine Position mit Menge ausfüllen.');
    const id=randomUUID(),config=settings(current.company.id).value.order;
    const value={...snapshot,id,documentType:'order',status:'open',number:number(current,'order',id),date:swissDay(new Date(clock())),validUntil:'',sourceOfferId:sourceId,sourceOfferNumber:source.number,sourceOfferDate:source.date,sourceOfferSnapshot:structuredClone(source),companyProfile:structuredClone(current.company.profile||{}),intro:config.intro,closing:source.closing||config.closing,deliveryDate:'',reference:'',internalNotes:'',createdAt:new Date(clock()).toISOString()};
    const saved=write(current,'orders',id,value);db.prepare('INSERT INTO order_sources VALUES (?,?,?)').run(current.company.id,sourceId,id);audit(db,current.user.id,current.company.id,'order.created',id);return {id,...saved};
   });json(res,result,result.existing?200:201);return;
  }
  const order=path.match(/^\/api\/company\/orders\/([^/]+)$/);
  if(order&&method==='PATCH'){
   requireArea(s,'orders',true);const b=await body(req,16384),current=freshSession(req,s);requireArea(current,'orders',true);
   json(res,atomic(()=>{const old=record(current.company.id,'orders',order[1]);if(!old)fail(404,'Auftrag nicht gefunden.');if(b.revision!==old.revision)fail(409,'Der Auftrag wurde inzwischen geändert. Bitte neu laden.');const saved=write(current,'orders',order[1],validateOrderUpdate(b.value,JSON.parse(old.data)));audit(db,current.user.id,current.company.id,'order.updated',order[1]);return {id:order[1],...saved};}));return;
  }
  if(path==='/api/company/accounting'&&method==='GET'){
   requireArea(s,'accounting');const offers=planAllows(s.plan,'offers')?read(s.company.id,'offers','offers',[]):[];
   // The export area has its own role gate. It never opens the general records API.
   json(res,{orders:planAllows(s.plan,'orders')?orders(s.company.id).map(r=>r.value):[],offers,reports:planAllows(s.plan,'reports')?db.prepare("SELECT id,data FROM records WHERE company_id=? AND area='reports'").all(s.company.id).map(r=>({...JSON.parse(r.data),id:r.id})).filter(r=>['signed','invoiced'].includes(r.status)):[],exportedAt:new Date(clock()).toISOString(),company:s.company.profile||{}});return;
  }
  fail(405,'Methode nicht erlaubt.');
 };
}
