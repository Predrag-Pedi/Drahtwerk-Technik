import {totals,line,round} from '../offerten/core.mjs';

export const orderStatuses={open:'Offen',progress:'In Bearbeitung',completed:'Abgeschlossen',cancelled:'Storniert'};
export const documentDefaults=()=>({
 offer:{prefix:'AN-',digits:5,includeYear:false,next:1,intro:'Wir offerieren Ihnen die nachfolgend beschriebenen Schaltanlagen.',closing:''},
 order:{prefix:'AU-',digits:5,includeYear:false,next:1,intro:'Vielen Dank für Ihren Auftrag. Wir bestätigen Ihnen die folgenden Leistungen gemäss Ihrer Bestellung.',closing:''}
});
export const formatDocumentNumber=(setting,year)=>setting.prefix+(setting.includeYear?year+'-':'')+String(setting.next).padStart(setting.digits,'0');
const invalid=message=>{throw Object.assign(Error(message),{status:400});};
export function validateDocumentSettings(value){
 const result={};
 for(const kind of ['offer','order']){
  const s=value?.[kind];
  if(!s||typeof s.prefix!=='string'||s.prefix.length>20||!/^[\p{L}\p{N} _./-]*$/u.test(s.prefix))invalid('Präfix: maximal 20 Buchstaben, Zahlen, Leerzeichen oder . / - _.');
  if(!Number.isInteger(s.digits)||s.digits<1||s.digits>10||!Number.isSafeInteger(s.next)||s.next<1||s.next>9999999999||typeof s.includeYear!=='boolean')invalid('Nummernkreis prüfen: 1–10 Stellen und eine positive nächste Nummer.');
  for(const key of ['intro','closing'])if(typeof s[key]!=='string'||s[key].length>10000)invalid('Vorlagentexte dürfen höchstens 10’000 Zeichen enthalten.');
  result[kind]={prefix:s.prefix,digits:s.digits,includeYear:s.includeYear,next:s.next,intro:s.intro,closing:s.closing};
 }
 return result;
}
export function validateOrderUpdate(value,old){
 if(!Object.hasOwn(orderStatuses,value?.status))invalid('Auftragsstatus auswählen.');
 const result={...old,status:value.status};
 for(const key of ['deliveryDate','reference','internalNotes']){
  const text=value[key]??'';
  if(typeof text!=='string'||text.length>(key==='internalNotes'?5000:200))invalid('Auftragsangaben sind zu lang.');
  if(key==='deliveryDate'&&text&&(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text).toISOString().slice(0,10)!==text))invalid('Lieferdatum ist ungültig.');
  result[key]=text;
 }
 return result;
}
// Quote every field and neutralise spreadsheet formulas in customer-supplied text.
export function csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{
 const text=String(value??'');return '"'+(/^[\s]*[=+@-]/u.test(text)&&typeof value!=='number'?"'":'')+text.replaceAll('"','""')+'"';
}).join(';')).join('\r\n');}
const identity=d=>[d.number,d.date,d.customerNumber||'',d.customer,d.contact||'',d.recipientAddress||'',d.customerEmail||'',d.customerPhone||'',d.project,d.address||''];
const identityHeaders=['Belegnummer','Datum','Kundennummer','Kunde','Kontaktperson','Kundenadresse','E-Mail','Telefon','Projekt','Objektadresse'];
export function summaryCSV(documents){return csv([
 ['Belegart',...identityHeaders,'Status','Offertenreferenz','Kundenreferenz','Lieferdatum','Währung','Zwischentotal CHF','Rabatt %','Rabatt CHF','Netto CHF','MWST %','MWST CHF','Brutto CHF'],
 ...documents.map(d=>{const t=totals(d);return [d.documentType==='order'?'Auftrag':'Offerte',...identity(d),d.status,d.sourceOfferNumber||'',d.reference||'',d.deliveryDate||'','CHF',t.subtotal,d.discount,t.discount,t.total,t.vatRate,t.vat,t.gross];})
]);}
export function positionsCSV(documents){
 const rows=[['Belegart',...identityHeaders,'Anlage','Anlagenteil','Position','Artikelnummer','Bezeichnung','Menge','Einheit','Verkaufspreis CHF','Betrag vor Rabatt CHF','Rabatt %','Rabatt CHF','Netto CHF','MWST %','MWST CHF','Brutto CHF','Währung']];
 for(const d of documents){
  const t=totals(d),items=d.plants.flatMap((p,pi)=>p.parts.flatMap((s,si)=>s.items.map((i,ii)=>({p,s,i,pos:`${pi+1}.${si+1}.${ii+1}`,amount:line(i,d)}))));
  // Allocate rounded discount and tax in cents. The exported rows add up exactly to the document.
  const distribute=(amount,weights)=>{const sum=weights.reduce((a,b)=>a+b,0),cents=Math.round(amount*100);if(!sum)return weights.map(()=>0);const pieces=weights.map((w,index)=>{const exact=cents*w/sum;return {index,n:Math.floor(exact),fraction:exact-Math.floor(exact)};});const remaining=cents-pieces.reduce((a,b)=>a+b.n,0);const ranked=[...pieces].sort((a,b)=>b.fraction-a.fraction);for(let n=0;n<remaining;n++)ranked[n%ranked.length].n++;return pieces.map(p=>p.n/100);};
  const discounts=distribute(t.discount,items.map(x=>x.amount.total)),net=items.map((x,i)=>round(x.amount.total-discounts[i])),tax=distribute(t.vat,net);
  items.forEach((x,i)=>rows.push([d.documentType==='order'?'Auftrag':'Offerte',...identity(d),x.p.name,x.s.name,x.pos,x.i.article,x.i.offerDescription??x.i.name,x.i.qty,x.i.unit,x.amount.unit,x.amount.total,d.discount,discounts[i],net[i],t.vatRate,tax[i],round(net[i]+tax[i]),'CHF']));
 }
 return csv(rows);
}
export function reportsCSV(reports,detail=false){
 if(!detail)return csv([['Rapportnummer','Datum','Kundennummer','Kunde','Adresse','Kontakt','E-Mail','Telefon','Projekt','Einsatzort','Status','Arbeiten abgeschlossen','Bemerkungen','Verantwortlicher Mitarbeiter','Arbeitsstunden','Fahrtstunden','Kilometer','Spesen CHF','Bestätigt durch','Ort der Unterschrift','Unterschrieben am'],...reports.map(r=>[r.number,r.date,r.customerNumber||'',r.customer,r.customerAddress,r.contact,r.customerEmail||'',r.customerPhone||'',r.project,r.location,r.status,r.completed?'Ja':'Nein',r.notes||'',r.employee||'',r.work.reduce((s,x)=>s+x.hours,0),r.travelHours,r.km,r.expenses,r.signature?.name||'',r.signature?.place||'',r.signature?.signedAt||''])]);
 return csv([['Rapportnummer','Kunde','Projekt','Art','Datum','Mitarbeiter','Artikelnummer','Tätigkeit / Material','Menge','Einheit'],...reports.flatMap(r=>[...r.work.map(w=>[r.number,r.customer,r.project,'Arbeit',w.date,w.employee,'',w.activity,w.hours,'h']),...r.materials.map(m=>[r.number,r.customer,r.project,'Material',r.date,'',m.article,m.description,m.quantity,m.unit]),...[['Fahrtzeit',r.travelHours,'h'],['Fahrstrecke',r.km,'km'],['Spesen',r.expenses,'CHF']].map(([name,qty,unit])=>[r.number,r.customer,r.project,name,r.date,r.employee,'',name,qty,unit])])]);
}
