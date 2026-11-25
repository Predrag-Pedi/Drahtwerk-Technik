import {randomUUID} from 'node:crypto';
import {audit} from './db.mjs';
import {fail} from './security.mjs';
import {companyStorageBytes,companyStorageLimit} from './storage.mjs';
import {validateStock,articleKey,stockQuantity,planInventory} from '../platform/inventory-model.mjs';
export function inventoryService({db,body,json,freshSession,requireArea,clock}){
 const read=(c,area,id)=>db.prepare('SELECT data,revision FROM records WHERE company_id=? AND area=? AND id=?').get(c,area,id);
 const list=(c,area)=>db.prepare('SELECT id,data,revision,updated_at FROM records WHERE company_id=? AND area=? ORDER BY updated_at DESC').all(c,area).map(r=>({...JSON.parse(r.data),id:r.id,revision:r.revision}));
 const items=c=>list(c,'inventoryItems');
 function write(s,area,id,value){const old=read(s.company.id,area,id),data=JSON.stringify(value),revision=(old?.revision||0)+1;if(companyStorageBytes(db,s.company.id)-(old?Buffer.byteLength(old.data):0)+Buffer.byteLength(data)>companyStorageLimit)fail(413,'Speichergrenze des Betriebs erreicht.');db.prepare('INSERT INTO records VALUES (?,?,?,?,?,?,?) ON CONFLICT(company_id,area,id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at').run(s.company.id,area,id,data,revision,s.user.id,new Date(clock()).toISOString());return {...value,id,revision};}
 const atomic=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 function bookOrder(s,doc){
  if(read(s.company.id,'inventoryOrders',doc.id))fail(409,'Der Auftrag wurde bereits im Lager gebucht.');
  const plan=planInventory(doc,items(s.company.id)),tracked=plan.filter(p=>p.tracked);
  const error=tracked.find(p=>p.error);if(error)fail(400,error.name+': '+error.error);
  for(const p of tracked){const {id,revision,...value}=p.next;write(s,'inventoryItems',p.itemId,value);}
  const lines=tracked.map(({next,...p})=>p);
  if(lines.length){write(s,'inventoryOrders',doc.id,{orderId:doc.id,number:doc.number,customer:doc.customer,project:doc.project,at:new Date(clock()).toISOString(),by:s.user.name,lines});audit(db,s.user.id,s.company.id,'inventory.order',doc.id);}
  return {lines,at:new Date(clock()).toISOString()};
 }
 async function handle({req,res,path,method,s}){
  if(path==='/api/company/inventory/preview'&&method==='POST'){
   requireArea(s,'offers');const b=await body(req,10*1024*1024),current=freshSession(req,s);requireArea(current,'offers');const plan=planInventory(b.document||{},items(current.company.id));json(res,plan.map(({next,...p})=>p));return;
  }
  if(path==='/api/company/inventory/availability'&&method==='GET'){
   requireArea(s,'offers');json(res,items(s.company.id).map(i=>({article:i.article,name:i.name,unit:i.unit,brand:i.brand,price:i.price,kind:i.kind,available:stockQuantity(i)})));return;
  }
  requireArea(s,'inventory',method!=='GET');
  const c=s.company.id;
  if(path==='/api/company/inventory'&&method==='GET'){const settings=read(c,'inventorySettings','settings');json(res,{items:items(c),settings:settings?{...JSON.parse(settings.data),revision:settings.revision}:{locationsEnabled:false,revision:0},orders:list(c,'inventoryOrders'),movements:list(c,'inventoryMovements')});return;}
  if(path==='/api/company/inventory/catalog'&&method==='GET'){
   const q=new URL(req.url,'http://localhost').searchParams.get('q')?.trim().toLowerCase()||'';if(q.length<2){json(res,[]);return;}
   const result=[],seen=new Set();const add=rows=>{for(const a of rows){if(result.length>=30)break;if(!a.profiles&&!seen.has(articleKey(a.article))&&[a.article,a.name,a.brand].join(' ').toLowerCase().includes(q)){seen.add(articleKey(a.article));result.push({article:a.article,name:a.name,unit:a.unit,brand:a.brand||'',price:a.price||0});}}};
   for(const key of ['ownCatalog','catalog']){const r=read(c,'offers',key);if(r)add(JSON.parse(r.data));}
   const head=db.prepare('SELECT upload_id FROM catalog_heads WHERE company_id=?').get(c);if(head&&result.length<30)for(const row of db.prepare('SELECT data FROM catalog_chunks WHERE upload_id=? ORDER BY seq').iterate(head.upload_id)){add(JSON.parse(row.data));if(result.length>=30)break;}
   json(res,result);return;
  }
  const fulfil=path.match(/^\/api\/company\/inventory\/orders\/([^/]+)\/fulfil$/);
  if(fulfil&&method==='POST'){
   const b=await body(req,8192),current=freshSession(req,s);requireArea(current,'inventory',true);
   json(res,atomic(()=>{
    const stored=read(c,'inventoryOrders',fulfil[1]),order=read(c,'orders',fulfil[1]);if(!stored||!order)fail(404,'Lagerauftrag nicht gefunden.');if(stored.revision!==b.revision)fail(409,'Lagerauftrag wurde geändert. Bitte neu laden.');
    const ledger=JSON.parse(stored.data),doc=JSON.parse(order.data);if(doc.status==='cancelled')fail(409,'Stornierte Aufträge werden nicht nachgebucht.');
    const plan=planInventory({plants:[{parts:[{items:ledger.lines.filter(l=>l.missing>0).map(l=>({article:l.article,name:l.name,unit:l.unit,qty:l.missing,cuts:l.missingCuts||[]}))}]}]},items(c));
    if(plan.some(l=>l.error))fail(400,plan.find(l=>l.error).error);
    if(!plan.some(l=>l.booked>0))fail(409,'Für die Fehlmengen ist noch kein passendes Material verfügbar.');
    for(const p of plan.filter(l=>l.booked>0)){
     const {id,revision,...value}=p.next;write(current,'inventoryItems',p.itemId,value);
     const line=ledger.lines.find(l=>l.itemId===p.itemId);line.booked=Number((line.booked+p.booked).toFixed(6));line.missing=p.missing;line.missingCuts=p.missingCuts;line.waste=(line.waste||0)+(p.waste||0);line.newBars=(line.newBars||0)+(p.newBars||0);line.cutPlan=[...(line.cutPlan||[]),...(p.cutPlan||[])];
    }
    const at=new Date(clock()).toISOString();ledger.followUps=[...(ledger.followUps||[]),{at,by:current.user.name,lines:plan.filter(l=>l.booked>0).map(({next,...p})=>p)}];
    const result=write(current,'inventoryOrders',fulfil[1],ledger);doc.inventory={...doc.inventory,lines:ledger.lines};write(current,'orders',doc.id,doc);audit(db,current.user.id,c,'inventory.fulfil',doc.id);return result;
   }));return;
  }
  if(path==='/api/company/inventory/settings'&&method==='PUT'){
   const b=await body(req,8192),current=freshSession(req,s);requireArea(current,'inventory',true);if(typeof b.locationsEnabled!=='boolean')fail(400,'Lagerplatz-Einstellung prüfen.');json(res,atomic(()=>{if((read(c,'inventorySettings','settings')?.revision||0)!==b.revision)fail(409,'Einstellungen wurden geändert. Bitte neu laden.');return write(current,'inventorySettings','settings',{locationsEnabled:b.locationsEnabled});}));return;
  }
  if(path==='/api/company/inventory/items'&&method==='POST'||/^\/api\/company\/inventory\/items\/[^/]+$/.test(path)&&method==='PUT'){
   const b=await body(req,262144),current=freshSession(req,s);requireArea(current,'inventory',true);const value=validateStock(b.value),id=method==='POST'?randomUUID():path.split('/').pop();
   json(res,atomic(()=>{const old=read(c,'inventoryItems',id);if(method==='PUT'&&!old)fail(404,'Lagerartikel nicht gefunden.');if((old?.revision||0)!==b.revision)fail(409,'Bestand wurde inzwischen geändert. Bitte neu laden.');
    if(items(c).some(i=>i.id!==id&&articleKey(i.article)===articleKey(value.article)))fail(409,'Diese Artikelnummer wird bereits im Lager geführt.');
    const previous=old?JSON.parse(old.data):null;
    if(previous&&['article','unit','kind','barLengthMm'].some(k=>previous[k]!==value[k]))fail(400,'Artikelnummer, Einheit und Lagerart bleiben für bestehende Lagerartikel erhalten.');
    const reason=String(b.reason||'').trim();if(!reason||reason.length>500)fail(400,'Grund der Lagerbuchung angeben.');
    const saved=write(current,'inventoryItems',id,value);write(current,'inventoryMovements',randomUUID(),{itemId:id,article:value.article,name:value.name,unit:value.unit,before:previous?stockQuantity(previous):0,after:stockQuantity(value),reason,at:new Date(clock()).toISOString(),by:current.user.name});audit(db,current.user.id,c,'inventory.saved',id);return saved;
   }),method==='POST'?201:200);return;
  }
  fail(404,'Lagerfunktion nicht gefunden.');
 }
 return {handle,bookOrder};
}
