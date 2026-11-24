import {randomUUID} from 'node:crypto';
import {fail} from './security.mjs';
import {audit} from './db.mjs';
import {companyStorageBytes,companyStorageLimit} from './storage.mjs';
export function catalogHandler({db,body,json,freshSession,requireArea,clock}){
 const head=company=>db.prepare('SELECT * FROM catalog_heads WHERE company_id=?').get(company);
 const legacy=company=>db.prepare("SELECT revision,length(CAST(data AS BLOB)) bytes FROM records WHERE company_id=? AND area='offers' AND id='catalog'").get(company);
 const revision=company=>head(company)?.revision??legacy(company)?.revision??0;
 const remove=id=>db.prepare('DELETE FROM catalog_imports WHERE id=?').run(id);
 return async({req,res,path,method,s})=>{
  if(!path.startsWith('/api/company/catalog'))return false;
  requireArea(s,'offers',method!=='GET');const company=s.company.id;
  db.prepare('DELETE FROM catalog_imports WHERE expires<? AND id NOT IN (SELECT upload_id FROM catalog_heads)').run(clock());
  if(path==='/api/company/catalog'&&method==='GET'){
   const h=head(company);json(res,h?{revision:h.revision,uploadId:h.upload_id,count:h.count,chunks:h.chunks}:{revision:revision(company),legacy:Boolean(legacy(company)),count:0,chunks:0});return true;
  }
  if(path==='/api/company/catalog/imports'&&method==='POST'){
   const b=await body(req,2*1024*1024);requireArea(freshSession(req,s),'offers',true);
   if(b.revision!==revision(company))fail(409,'Der Katalog wurde geändert. Bitte neu laden.');
   if(!Number.isInteger(b.count)||b.count<0||b.count>500000)fail(400,'Maximal 500 000 Artikel pro Katalog.');
   if(db.prepare('SELECT COUNT(*) n FROM catalog_imports WHERE company_id=? AND id NOT IN (SELECT upload_id FROM catalog_heads)').get(company).n>=2)fail(409,'Es laufen bereits zwei Importe. Bitte diese abschliessen oder abbrechen.');
   const id=randomUUID();db.prepare('INSERT INTO catalog_imports VALUES (?,?,?,?,?,?)').run(id,company,s.user.id,b.revision,b.count,clock()+2*60*60*1000);json(res,{id});return true;
  }
  const read=path.match(/^\/api\/company\/catalog\/chunks\/([\w-]+)\/(\d+)$/);
  if(read&&method==='GET'){
   if(head(company)?.upload_id!==read[1])fail(409,'Der Katalog wurde geändert. Bitte neu laden.');
   const row=db.prepare('SELECT data FROM catalog_chunks WHERE upload_id=? AND seq=?').get(read[1],Number(read[2]));if(!row)fail(404,'Katalogteil fehlt.');res.setHeader('Content-Type','application/json');res.end(row.data);return true;
  }
  const route=path.match(/^\/api\/company\/catalog\/imports\/([\w-]+)(?:\/(commit|\d+))?$/);if(!route)fail(404,'Katalogaktion nicht gefunden.');
  const upload=()=>{const u=db.prepare('SELECT * FROM catalog_imports WHERE id=? AND company_id=? AND user_id=?').get(route[1],company,s.user.id);if(!u||head(company)?.upload_id===u.id)fail(404,'Import nicht gefunden oder bereits abgeschlossen.');return u;};
  let u=upload();
  if(method==='DELETE'&&!route[2]){remove(u.id);json(res,{ok:true});return true;}
  if(method==='PUT'&&/^\d+$/.test(route[2])){
   const b=await body(req,2*1024*1024);requireArea(freshSession(req,s),'offers',true);u=upload();
   if(!Array.isArray(b.items)||!b.items.length||b.items.length>2000||b.items.some(x=>!x||typeof x!=='object'||Array.isArray(x)))fail(400,'Ungültiger Katalogteil.');
   const seq=Number(route[2]);if(!Number.isSafeInteger(seq)||seq>10000)fail(400,'Ungültige Teilnummer.');
   const data=JSON.stringify(b.items),bytes=Buffer.byteLength(data),old=db.prepare('SELECT bytes,count FROM catalog_chunks WHERE upload_id=? AND seq=?').get(u.id,seq);
   const sums=db.prepare('SELECT COALESCE(SUM(bytes),0) bytes,COALESCE(SUM(count),0) count FROM catalog_chunks WHERE upload_id=?').get(u.id);
   if(sums.bytes-(old?.bytes||0)+bytes>companyStorageLimit||sums.count-(old?.count||0)+b.items.length>u.count)fail(413,'Import überschreitet die Artikelanzahl oder 500 MB.');
   db.prepare('INSERT INTO catalog_chunks VALUES (?,?,?,?,?) ON CONFLICT(upload_id,seq) DO UPDATE SET data=excluded.data,bytes=excluded.bytes,count=excluded.count').run(u.id,seq,data,bytes,b.items.length);json(res,{ok:true});return true;
  }
  if(method==='POST'&&route[2]==='commit'){
   await body(req,2*1024*1024);requireArea(freshSession(req,s),'offers',true);u=upload();
   db.exec('BEGIN IMMEDIATE');try{
    if(u.revision!==revision(company))fail(409,'Ein anderer Benutzer hat den Katalog geändert. Bitte neu laden.');
    const sum=db.prepare('SELECT COUNT(*) chunks,COALESCE(SUM(count),0) count,COALESCE(SUM(bytes),0) bytes,MIN(seq) first,MAX(seq) last FROM catalog_chunks WHERE upload_id=?').get(u.id);
    if(sum.count!==u.count||(sum.chunks&&(sum.first!==0||sum.last!==sum.chunks-1)))fail(400,'Import ist unvollständig. Der bisherige Katalog bleibt erhalten.');
    const previous=head(company),old=legacy(company);if(companyStorageBytes(db,company)-(previous?.bytes||0)-(old?.bytes||0)+sum.bytes>companyStorageLimit)fail(413,'Speichergrenze des Betriebs erreicht (500 MB).');
    const next=u.revision+1;db.prepare('INSERT INTO catalog_heads VALUES (?,?,?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET upload_id=excluded.upload_id,revision=excluded.revision,count=excluded.count,chunks=excluded.chunks,bytes=excluded.bytes').run(company,u.id,next,sum.count,sum.chunks,sum.bytes);
    db.prepare("DELETE FROM records WHERE company_id=? AND area='offers' AND id='catalog'").run(company);if(previous)remove(previous.upload_id);audit(db,s.user.id,company,'catalog.imported',String(sum.count));db.exec('COMMIT');json(res,{ok:true,revision:next,count:sum.count});return true;
   }catch(e){db.exec('ROLLBACK');throw e;}
  }
  fail(405,'Katalogaktion nicht erlaubt.');
 };
}
