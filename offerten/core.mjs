import {restoreSbr,offerItemName} from './sbr.mjs?v=20261111-6';
// All monetary inputs are CHF excluding VAT. Round sale unit price, then line totals.
export const uid=()=>Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
export const money=n=>new Intl.NumberFormat('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function number(value){
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 let s=String(value??'').trim().replace(/[’'\s]/g,'');
 if(!s)return null;
 if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');}
 else s=s.replace(',','.');
 return /^\d+(?:\.\d+)?$/.test(s)?Number(s):null;
}
export const part=(name='Feld 1')=>({id:uid(),name,notes:'',items:[]});
export const plant=(name='Hauptverteilung')=>({id:uid(),name,type:'',width:'',height:'',depth:'',ip:'',colour:'',notes:'',parts:[part()]});
export const offer=()=>({id:uid(),number:'',customer:'',address:'',project:'',date:new Date().toLocaleDateString('sv-SE'),intro:'Wir offerieren Ihnen die nachfolgend beschriebenen Schaltanlagen.',closing:'',markup:0,rate:0,discount:0,outputMode:'plant',plants:[plant()]});
export function line(item,doc){
 if(!item.name?.trim())throw Error('Eine Position hat keine Bezeichnung.');
 for(const [v,label] of [[item.qty,'Menge'],[item.price,'Grundpreis'],[item.minutes,'Montagezeit'],[doc.markup,'Materialzuschlag'],[doc.rate,'Stundensatz'],[doc.discount,'Rabatt']])if(!Number.isFinite(v)||v<0)throw Error(`${item.name}: ${label} fehlt oder ist ungültig.`);
 if(doc.discount>100)throw Error('Rabatt darf höchstens 100 % betragen.');
 const rate=item.rate??doc.rate;if(!Number.isFinite(rate)||rate<0)throw Error('Artikel-Stundensatz ist ungültig.');
 if(item.minutes>0&&rate===0)throw Error('Für Montagezeiten bitte einen Stundensatz eingeben.');
 const unit=round(item.price*(1+doc.markup/100)+item.minutes*rate/60);
 const total=round(unit*item.qty);if(!Number.isFinite(total)||total>1e12)throw Error('Positionsbetrag zu gross. Bitte Eingaben prüfen.');return {unit,total};
}
export function totals(doc){
 const plants=doc.plants.map(p=>({id:p.id,parts:p.parts.map(s=>({id:s.id,total:round(s.items.reduce((a,i)=>a+line(i,doc).total,0))}))}));
 for(const p of plants)p.total=round(p.parts.reduce((a,s)=>a+s.total,0));
 const subtotal=round(plants.reduce((a,p)=>a+p.total,0)),discount=round(subtotal*doc.discount/100);
 return {plants,subtotal,discount,total:round(subtotal-discount)};
}
export function description(p){return [p.type,[p.width,p.height,p.depth].some(Boolean)?`B × H × T: ${p.width||'–'} × ${p.height||'–'} × ${p.depth||'–'} mm`:'',p.ip?`Schutzart: ${p.ip}`:'',p.colour?`Farbe: ${p.colour}`:'',p.notes].filter(Boolean).join('\n');}
export const priceMode=value=>value===true?'detail':value===false?'summary':['detail','plant','summary'].includes(value)?value:'plant';
export function offerText(doc,mode=true){
 mode=priceMode(mode);const t=totals(doc);if(!doc.plants.some(p=>p.parts.some(s=>s.items.length)))throw Error('Bitte zuerst Positionen hinzufügen.');
 const out=[`OFFERTE${doc.number?' '+doc.number:''}`,doc.project,doc.customer,doc.address,doc.date?`Datum: ${doc.date}`:'','',doc.intro,''];
 doc.plants.forEach((p,pi)=>{out.push(`${pi+1}. ${p.name}`,description(p),'');
 out.push(mode==='detail'?'Pos. / Artikelbezeichnung\tMenge\tEinheit\tEinzelpreis CHF\tBetrag CHF':'Pos. / Artikelbezeichnung\tMenge\tEinheit');
 p.parts.forEach((s,si)=>{out.push('',`${pi+1}.${si+1} ${s.name}`,s.notes);
 s.items.forEach((i,ii)=>{const l=line(i,doc);out.push(`${pi+1}.${si+1}.${ii+1} ${offerItemName(i)}\t${i.qty}\t${i.unit||'Stk.'}${mode==='detail'?'\t'+money(l.unit)+'\t'+money(l.total):''}`);});
 if(mode!=='plant')out.push(`Total ${s.name}: CHF ${money(t.plants[pi].parts[si].total)}`);});out.push('',`Total ${p.name}: CHF ${money(t.plants[pi].total)}`,'');});
 out.push('ZUSAMMENSTELLUNG');t.plants.forEach((p,i)=>out.push(`${i+1}. ${doc.plants[i].name}\tCHF ${money(p.total)}`));
 out.push(`Zwischentotal: CHF ${money(t.subtotal)}`);if(doc.discount)out.push(`Rabatt ${doc.discount} %: −CHF ${money(t.discount)}`);out.push(`Angebotstotal exkl. MWST: CHF ${money(t.total)}`,'',doc.closing);
 return out.filter(x=>x!==undefined).join('\n').replace(/\n{3,}/g,'\n\n');
}

export function parseCSV(text,delimiter){
 text=text.replace(/^\uFEFF/,'');
 if(!delimiter){const head=text.split(/\r?\n/)[0];delimiter=[';','\t',','].sort((a,b)=>head.split(b).length-head.split(a).length)[0];}
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||cell==='')quoted=!quoted;else cell+=c;}else if(c===delimiter&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('CSV: Anführungszeichen nicht geschlossen.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 if(rows.length<2)throw Error('CSV benötigt eine Kopfzeile und mindestens einen Artikel.');
 return rows;
}
export function catalogRows(rows,map){
 if(['article','name','price'].some(k=>map[k]===undefined||map[k]===''))throw Error('Artikelnummer, Bezeichnung und Preis zuweisen.');
 const seen=new Set();
 return rows.slice(1).map((r,idx)=>{const get=k=>map[k]!==''&&map[k]!==undefined?String(r[Number(map[k])]??'').trim():'';
 const article=get('article'),name=get('name'),price=number(get('price')),base=get('per')?number(get('per')):1,minutes=get('minutes')?number(get('minutes')):0;
 if(!article||!name||price===null||base===null||base<=0||minutes===null)throw Error(`CSV-Zeile ${idx+2}: Artikel, Bezeichnung, Preis, Preiseinheit oder Minuten ungültig.`);
 if(seen.has(article))throw Error(`CSV-Zeile ${idx+2}: doppelte Artikelnummer ${article}. Bitte eindeutige Artikelnummern verwenden.`);seen.add(article);
 const rate=get('rate')?number(get('rate')):null;if(get('rate')&&rate===null)throw Error(`CSV-Zeile ${idx+2}: Stundensatz ungültig.`);
 return {article,name,price:price/base,minutes,rate,type:get('type')||'Artikel',source:'import',unit:get('unit')||'Stk.',category:get('category')||'Allgemein',brand:get('brand')};});
}
// Reconstruct imported backups from explicitly allowed fields, never assign arbitrary keys.
export function validateOffer(raw){
 const fail=()=>{throw Error('Ungültige Offertendatei.');};const str=v=>typeof v==='string'&&v.length<50000?v:fail();
 const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:fail();
 if(!raw||!Array.isArray(raw.plants)||!raw.plants.length)fail();
 const d={id:uid(),outputMode:priceMode(raw.outputMode)};for(const k of ['number','customer','address','project','date','intro','closing'])d[k]=str(raw[k]);for(const k of ['markup','rate','discount'])d[k]=num(raw[k]);if(d.discount>100)fail();
 d.plants=raw.plants.map(p=>{const q={id:uid()};for(const k of ['name','type','width','height','depth','ip','colour','notes'])q[k]=str(p[k]);if(!Array.isArray(p.parts)||!p.parts.length)fail();q.parts=p.parts.map(s=>{if(!Array.isArray(s.items))fail();return {id:uid(),name:str(s.name),notes:str(s.notes),items:s.items.map(i=>({id:uid(),...(i.sbr?{sbr:restoreSbr(i.sbr)}:{}),article:str(i.article),name:str(i.name),unit:str(i.unit),qty:num(i.qty),price:i.price===null?null:num(i.price),minutes:num(i.minutes),rate:i.rate==null?null:num(i.rate),type:i.type===undefined?'Artikel':str(i.type)}))};});return q;});return d;
}
