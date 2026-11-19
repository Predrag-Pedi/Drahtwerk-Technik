import {articleForFunction,articleSummary,manufacturers} from './protection-catalog.mjs?v=20261119-7';
import {createElement,ports,uid,size,symbols} from './model.mjs?v=20261119-9';
import {DRAW,bounds} from './geometry.mjs?v=20261119-7';
import {allFunctions,functionBmk,functionData,referenceLocation,contactsFor} from './references.mjs?v=20261119-7';

export function outgoingPorts(e,p){
 if(!e||e.rotation||e.template)return [];
 const all=ports(e,p),bottom=e.y+size(e,p)[1];
 return all.filter(pt=>Math.abs(pt.y-bottom)<.01).sort((a,b)=>a.x-b.x);
}
export function terminalAssembly(doc,p,settings,point,source=null){
 if(p.type!=='schema')throw Error('Klemmen auf einer Schemaseite einfügen.');
 const {name,start,count,spacing,labels=[]}=settings;
 if(typeof name!=='string'||!name.trim()||name.length>80||!Number.isInteger(start)||start<1||!Number.isInteger(count)||count<1||count>32||start+count-1>9999||!Number.isFinite(spacing)||spacing<15||spacing>100||!Array.isArray(labels)||labels.some(s=>typeof s!=='string'||s.length>80))throw Error('Klemmenbezeichnung, Anzahl und Abstand prüfen.');
 const used=doc.pages.flatMap(q=>q.elements).filter(e=>e.terminalStrip?.name===name.trim()).map(e=>e.terminalStrip.number);
 if(used.some(n=>n>=start&&n<start+count))throw Error('Diese Klemmennummer ist bereits vergeben. Eine freie Startnummer wählen.');
 const outputs=source?outgoingPorts(source,p):[];
 if(source&&outputs.length!==count)throw Error('Anzahl Klemmen muss zur Anzahl der unteren Geräteanschlüsse passen.');
 const elements=[],wires=[];
 for(let i=0;i<count;i++){
  const e=createElement(p,'terminal',point.x+i*spacing,point.y);e.x=point.x+i*spacing;e.y=point.y;e.tag='';e.terminalStrip={name:name.trim(),number:start+i,label:labels[i]||'',first:i===0};
  if(source){e.x=outputs[i].x-20;if(point.y<outputs[i].y+20)throw Error('Die Klemmen unterhalb des Geräts platzieren.');wires.push({id:uid(),points:[{x:outputs[i].x,y:outputs[i].y},{x:e.x+20,y:e.y}],from:{element:source.id,index:outputs[i].index},to:{element:e.id,index:0},label:'',dashed:labels[i]==='N'});}
  const b=bounds(e,...size(e,p));if(b.left<DRAW.left||b.right>DRAW.right||b.top<DRAW.top||b.bottom+25>DRAW.bottom)throw Error('Klemmen passen hier nicht vollständig auf das Blatt.');elements.push(e);
 }
 if(p.elements.length+p.wires.length+elements.length+wires.length>5000)throw Error('Maximal 5000 Elemente pro Seite.');
 return {elements,wires};
}

export function updateTerminal(doc,e,patch){
 const data={...e.terminalStrip,...patch};
 if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80||!Number.isInteger(data.number)||data.number<1||data.number>9999||typeof data.label!=='string'||data.label.length>80)throw Error('Klemmenleiste, Nummer und Anschluss prüfen.');
 data.name=data.name.trim();
 if(doc.pages.some(p=>p.elements.some(other=>other!==e&&other.terminalStrip?.name===data.name&&other.terminalStrip.number===data.number)))throw Error('Diese Klemmennummer ist bereits vergeben.');
 e.terminalStrip=data;
}

export function schemaRows(doc){
 return allFunctions(doc).map(f=>({f,bmk:functionBmk(doc,f.page,f.element,f.key),page:f.page.number,path:referenceLocation(f.element,f.page,f.key),type:f.element.value||f.element.template?.name||symbols[f.element.kind]?.name||f.element.kind,description:f.data.description||f.data.circuitName||f.element.circuitName||f.element.text||''}));
}
// Excel-compatible CSV, including neutralising formula-looking user text.
export function csv(rows){const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return '\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n')+'\r\n';}
export function reportRows(doc,kind){
 const base=['Auftrag','Schema','Objekt'],prefix=[doc.order||'',doc.schema||'',doc.address||''];
 const rows=schemaRows(doc);
 if(kind==='contacts')return [[...base,'Gerät','Funktion','Kontaktart','Anschlüsse','Status','Blatt/Pfad'],...rows.filter(r=>r.f.data.role==='coil').flatMap(r=>{
  const used=contactsFor(doc,r.f.page,r.f.element,r.f.key),slots=r.f.data.contactSlots;
  return slots?slots.flatMap(s=>{const cs=used.filter(c=>c.data.terminals===s.terminals);return cs.length?cs.map(c=>[...prefix,r.bmk,s.description,s.type,s.terminals,cs.length>1?'Doppelt belegt':'Belegt',referenceLocation(c.element,c.page,c.key)]):[[...prefix,r.bmk,s.description,s.type,s.terminals,'Frei','']];}):used.map(c=>[...prefix,r.bmk,c.data.description||'',c.data.contactType,c.data.terminals,'Belegt',referenceLocation(c.element,c.page,c.key)]);
 })];
 if(kind==='terminals')return [[...base,'Klemmenleiste','Nummer','Anschluss','Blatt'],...doc.pages.filter(p=>p.type==='schema').flatMap(p=>p.elements.filter(e=>e.terminalStrip).map(e=>[...prefix,e.terminalStrip.name,e.terminalStrip.number,e.terminalStrip.label,p.number])),...rows.filter(r=>r.f.element.kind==='terminal'&&!r.f.element.terminalStrip||r.f.element.template?.labels?.some(l=>l.key===r.f.key&&l.letter==='X')).map(r=>[...prefix,r.bmk,'',r.description,r.page])];
 const devices=rows.filter(r=>r.bmk&&r.f.data.role!=='contact'&&!r.f.element.terminalStrip);
 if(kind==='measurement')return [[...base,'BMK','Gerät / Typ','Verwendungszweck','Blatt/Pfad','Isolationswiderstand (MΩ)','Schleifenimpedanz (Ω)','RCD-Auslösezeit (ms)','Prüfdatum','Geprüft durch','Bemerkungen'],...devices.filter(r=>['ls','fils','fuse'].includes(r.f.element.kind)||r.f.element.template?.labels?.some(l=>l.key===r.f.key&&l.letter==='F')).map(r=>[...prefix,r.bmk,r.type,r.description,r.path,'','','','','',''])];
 return [[...base,'BMK','Gerät / Typ','Verwendungszweck','Blatt/Pfad','Hersteller','Artikelnummer','ELDAS','Artikelwerte'],...devices.map(r=>{const a=articleForFunction(r.f.element,r.f.key);return [...prefix,r.bmk,r.type,r.description,r.path,a?manufacturers[a.manufacturer]:'',a?.article||'',a?.eldas||'',a?articleSummary(a):''];})];
}
