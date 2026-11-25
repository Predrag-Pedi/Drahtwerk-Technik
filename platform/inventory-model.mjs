import {configureSbr} from '../offerten/sbr.mjs';
const invalid=message=>{throw Object.assign(Error(message),{status:400});};
export const articleKey=v=>String(v||'').normalize('NFKC').trim().toLocaleLowerCase();
export const unitKey=v=>/^(stk\.?|stück|stueck|pcs)$/i.test(String(v).trim())?'piece':/^(m|meter|lfm|laufmeter)$/i.test(String(v).trim())?'m':String(v||'').trim().toLowerCase();
const num=(v,label,max=1e9)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)invalid(label+' ist ungültig.');return v;};
export const mm=v=>Math.round(v*1000)/1000;
const amount=v=>Math.round(v*1e6)/1e6;
export const stockQuantity=item=>item.kind==='linear'?amount((item.bars*item.barLengthMm+item.remnants.reduce((n,r)=>n+r.lengthMm*r.count,0))/1000):item.quantity;
export function validateStock(raw){
 const r={};for(const key of ['article','name','unit','location','brand']){if(typeof raw?.[key]!=='string'||raw[key].length>300)invalid('Lagerartikel: Angaben prüfen.');r[key]=raw[key].trim();}
 if(!r.article||!r.name||!r.unit)invalid('Artikelnummer, Bezeichnung und Einheit ausfüllen.');
 r.kind=raw.kind;if(!['quantity','linear'].includes(r.kind))invalid('Lagerart auswählen.');r.minimum=num(raw.minimum??0,'Mindestbestand');r.price=num(raw.price??0,'Preis');
 if(r.kind==='linear'){
  if(unitKey(r.unit)!=='m')invalid('Stangenmaterial wird in Metern geführt.');r.unit='m';r.barLengthMm=num(raw.barLengthMm,'Stangenlänge',100000);r.kerfMm=num(raw.kerfMm,'Schnittbreite',100);
  if(r.barLengthMm<=0||r.kerfMm>=r.barLengthMm)invalid('Stangenlänge und Schnittbreite prüfen.');r.bars=num(raw.bars,'Stangenbestand',100000);if(!Number.isInteger(r.bars))invalid('Stangenbestand muss ganzzahlig sein.');
  if(!Array.isArray(raw.remnants)||raw.remnants.length>2000)invalid('Reststücke prüfen.');r.remnants=raw.remnants.map(x=>({lengthMm:num(x.lengthMm,'Restlänge',r.barLengthMm),count:num(x.count,'Restanzahl',100000)}));if(r.remnants.some(x=>!x.lengthMm||!x.count||!Number.isInteger(x.count)))invalid('Restlänge und Anzahl müssen positiv sein.');
 }else r.quantity=num(raw.quantity,'Bestand');
 return r;
}
export function materialDemand(doc){
 if(!doc||typeof doc!=='object'||!Array.isArray(doc.plants)||doc.plants.length>1000)invalid('Offertpositionen fehlen.');
 const list=[];for(const p of doc.plants){if(!Array.isArray(p?.parts))invalid('Anlagenteile prüfen.');for(const part of p.parts){if(!Array.isArray(part?.items))invalid('Materialpositionen prüfen.');for(const i of part.items){if(!i||typeof i.article!=='string'||!Array.isArray(i.cuts||[]))invalid('Materialposition prüfen.');
  if(!Number.isFinite(i.qty)||i.qty<0||i.qty>100000)invalid('Materialmenge ist ungültig.');if(!i.qty)continue;
  if(i.sbr){
   if(!Number.isInteger(i.qty))invalid('Dynamische Rahmen und Aufbauten benötigen eine ganze Stückzahl.');const s=i.sbr,c=configureSbr(s.template,s.width,s.height,s.counts,s.depth);
   for(const row of c.rows){if(!row.count)continue;list.push({article:row.article,name:row.name,unit:row.direction==='stueck'?'Stk.':'m',quantity:row.direction==='stueck'?row.count*i.qty:amount(row.totalMeters*i.qty),cuts:row.direction==='stueck'?[]:[{lengthMm:row.lengthMm,count:row.count*i.qty}]});}
  }else list.push({article:i.article,name:i.name,unit:i.unit,quantity:i.qty,cuts:i.cuts||[]});
 }
 }}
 const groups=new Map();for(const row of list){const key=articleKey(row.article)+'|'+unitKey(row.unit);let g=groups.get(key);if(!g){g={...row,quantity:0,cuts:[]};groups.set(key,g);}g.quantity=amount(g.quantity+row.quantity);g.cuts.push(...row.cuts);}
 return [...groups.values()];
}
// Best-fit decreasing: each piece stays intact. Every cut consumes its configured kerf.
// The plan is deterministic and conserves length; it does not promise a global optimum.
export function cutStock(stock,requested){
 const cuts=[];for(const c of requested){num(c.lengthMm,'Zuschnittlänge',100000);num(c.count,'Zuschnittanzahl',10000);if(c.lengthMm<=0||!Number.isInteger(c.count))invalid('Zuschnitte benötigen positive Längen und ganze Stückzahlen.');if(c.lengthMm>stock.barLengthMm)invalid('Ein Zuschnitt ist länger als eine ganze Stange.');for(let n=0;n<c.count;n++){cuts.push(c.lengthMm);if(cuts.length>10000)invalid('Maximal 10’000 Zuschnitte pro Artikel und Auftrag.');}}
 cuts.sort((a,b)=>b-a);
 let bars=stock.bars;const available=stock.remnants.map(r=>({...r})),used=[],missing=[];
 for(const length of cuts){
  let best=null;
  const fits=remaining=>remaining===length||remaining>=mm(length+stock.kerfMm);
  for(const u of used)if(fits(u.remaining)&&(!best||u.remaining<best.length))best={kind:'used',row:u,length:u.remaining};
  for(const r of available)if(r.count&&fits(r.lengthMm)&&(!best||r.lengthMm<best.length))best={kind:'rest',row:r,length:r.lengthMm};
  if(!best&&bars&&fits(stock.barLengthMm))best={kind:'bar',length:stock.barLengthMm};
  if(!best){missing.push(length);continue;}
  let u=best.row;if(best.kind!=='used'){if(best.kind==='bar')bars--;else best.row.count--;u={source:best.kind==='bar'?'Stange':'Reststück',lengthMm:best.length,remaining:best.length,cuts:[],wasteMm:0};used.push(u);}
  const kerf=u.remaining===length?0:stock.kerfMm;u.remaining=mm(u.remaining-length-kerf);u.wasteMm=mm(u.wasteMm+kerf);u.cuts.push(length);
 }
 const rests=new Map();for(const r of [...available,...used.filter(u=>u.remaining>0).map(u=>({lengthMm:u.remaining,count:1}))])if(r.count)rests.set(r.lengthMm,(rests.get(r.lengthMm)||0)+r.count);
 const next={...stock,bars,remnants:[...rests].map(([lengthMm,count])=>({lengthMm,count})).sort((a,b)=>a.lengthMm-b.lengthMm)};
 return {next,used,missing,quantity:amount(used.reduce((n,u)=>n+u.cuts.reduce((a,b)=>a+b,0),0)/1000),waste:amount(used.reduce((n,u)=>n+u.wasteMm,0)/1000),newBars:stock.bars-bars};
}
export function planInventory(doc,items){
 return materialDemand(doc).map(d=>{
  const matches=items.filter(i=>articleKey(i.article)===articleKey(d.article));if(!matches.length)return {...d,tracked:false};
  const item=matches[0];if(unitKey(item.unit)!==unitKey(d.unit))return {...d,tracked:true,itemId:item.id,error:'Einheit stimmt nicht mit dem Lager überein.'};
  if(item.kind==='linear'){
   const total=d.cuts.reduce((n,c)=>n+c.lengthMm*c.count,0)/1000;
   if(!d.cuts.length||Math.abs(total-d.quantity)>.0001)return {...d,tracked:true,itemId:item.id,error:'Zuschnittlängen und Stückzahlen fehlen oder stimmen nicht mit den offerierten Metern überein.'};
   const cut=cutStock(item,d.cuts);return {...d,tracked:true,itemId:item.id,available:stockQuantity(item),booked:cut.quantity,missing:amount(d.quantity-cut.quantity),waste:cut.waste,newBars:cut.newBars,cutPlan:cut.used,missingCuts:cut.missing.map(lengthMm=>({lengthMm,count:1})),next:cut.next};
  }
  const booked=Math.min(item.quantity,d.quantity);return {...d,tracked:true,itemId:item.id,available:item.quantity,booked,missing:amount(d.quantity-booked),next:{...item,quantity:amount(item.quantity-booked)}};
 });
}
