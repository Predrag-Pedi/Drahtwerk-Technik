import {parsePages} from './core.mjs?v=20261027-5';
export const blankField=()=>({type:'SBR',b:null,h:null,t:null,percent:50,mode:'devices',manual:null});
const norm=s=>s.toLowerCase().replace(/[^a-z0-9äöü]+/g,' ').trim();
export function identity(text){
 const house=text.match(/(?:HV\s*)?Haus\s+([A-Z]|\d+)\b/i)||text.match(/\bHV([A-Z])\b/);if(house)return 'HV Haus '+house[1].toUpperCase();
 if(/Dispo\s+(?:UV\s+)?Linke\s+Wand/i.test(text))return 'UV Linke Wand Allgemein';
 if(/Dispo\s+Rechte\s+Wand/i.test(text))return 'Rechte Wand';
 if(/00-HV_ALLG|HV Allgemein|Allgemein\s+Hauptverteilung/i.test(text))return 'HV Allgemein';
 return '';
}
export function disposition(page){
 const text=page.text;if(/Allgemeine Hinweise|Symbolverzeichnis|Inhaltsverzeichnis|Anschluss-?\s*und\s*Umgebungsbedingungen|ELEKTROSCHEMA/i.test(text))return null;
 const m=text.match(/B\s*(\d+(?:\s*\/\s*\d+)*)\s*[x×]\s*H\s*(\d+)\s*[x×]\s*([TH])\s*(\d+)\s*mm/i);
 if(!m&&!/\bDispo\b|\bDisposition\b/i.test(text))return null;
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean), alu=lines.findIndex(s=>/Alu[ -](Selbstbau|Reihen)/i.test(s));
 const title=alu>0&&/[a-zäöü]/i.test(lines[alu-1])?lines[alu-1]:'';
 const heading=lines.find(s=>/^Dispo(?:sition)?\s+.+/i.test(s))?.replace(/^Dispo(?:sition)?\s+/i,'')||'';const name=identity(title)||identity(text)||title||heading;
 const type=/Selbstbaurahmen/i.test(text)?'SBR':/Reihenschrank/i.test(text)?'ARS':null;
 let fields=m?m[1].split('/').map(b=>({...blankField(),type:type||'SBR',b:+b.trim(),h:+m[2],t:+m[4]})):[];
 let uncertain=false;
 if(!fields.length){
  // Only propose isolated dimension labels along the upper drawing edge; review is mandatory.
  const items=page.items||[], widths=items.filter(x=>/^\d{3,4}$/.test(x.str.trim())&&+x.str>=400&&!x.rotated&&x.y<page.height*.3&&x.y>page.height*.07).sort((a,b)=>a.x-b.x);
  const heights=items.filter(x=>/^\d{4}$/.test(x.str.trim())&&x.rotated).map(x=>+x.str);
  const h=[...new Set(heights)];
  fields=widths.length>0&&widths.length<=5?widths.map(x=>({...blankField(),type:type||'ARS',b:+x.str,h:h.length===1?h[0]:null})): [blankField()];uncertain=true;
 }
 return {name,fields,page,uncertain,type,depthWarning:m&&m[3].toUpperCase()==='H'?`Im Beschrieb steht H${m[4]} statt T${m[4]}. Als Tiefe übernommen; bitte prüfen.`:''};
}
const refSet=pages=>new Set(pages.flatMap(p=>[...p.text.matchAll(/\b\d+[FSPKY]\d+(?:\.\d+)*[A-Za-z]?\b/g)].map(m=>m[0])));
const fileStem=file=>norm(file.replace(/^\d{4}-\d{2}-\d{2}[_ -]*/, '').replace(/\.pdf$/i,''));
function mergeScore(layout,schema){
 const a=identity(layout.cover?.text||''),b=identity(schema.cover?.text||'');if(a&&b&&a!==b)return 0;
 const ar=refSet(layout.pages),br=refSet(schema.pages.filter(p=>!disposition(p)));const overlap=[...ar].filter(r=>br.has(r)).length;
 if(overlap<3)return 0;
 const af=fileStem(layout.pages[0].file),bf=fileStem(schema.pages[0].file);
 const related=af===bf||af.startsWith(bf+' ')||bf.startsWith(af+' ');
 // References alone are not unique across different cabinets. Require project/name evidence too.
 const coverWords=p=>new Set((p.cover?.text||'').split(/\s+/).filter(w=>/^[A-ZÄÖÜ]{4,}$/.test(w)&&!['ELEKTROSCHEMA','DISPO'].includes(w)));
 const ac=coverWords(layout),bc=coverWords(schema),shared=[...ac].some(w=>bc.has(w));
 return (related||shared||a&&a===b)&&overlap/Math.min(ar.size,br.size)>=.4?overlap:0;
}
export function buildPortfolio(documents,overrides={},links={}){
 const plants=[],pending=[];const add=(name)=>{let p=plants.find(p=>norm(p.name)===norm(name));if(!p){p={id:norm(name),name,pages:[],dispos:[],warnings:[],hasSchema:false};plants.push(p);}return p;};
 const orders=documents.filter(d=>/Auftragsbestätigung/i.test(d.pages.map(p=>p.text).join(' ')));
 for(const doc of documents.filter(d=>!orders.includes(d))){
  const cover=doc.pages[0]?.text||'', defaultName=identity(cover)||doc.file.replace(/^\d{4}-\d{2}-\d{2}[_ -]*/, '').replace(/\.pdf$/i,'');
  const drawings=doc.pages.filter(p=>disposition(p));
  const hasSchema=doc.pages.some(p=>!disposition(p)&&! /Inhaltsverzeichnis|Symbolverzeichnis|Allgemeine Hinweise|Anschluss-?\s*und\s*Umgebungsbedingungen/i.test(p.text)&&refSet([p]).size>0);
  // Detect content per file, even when both PDFs were uploaded with one import-role choice.
  const priority=!hasSchema?2:1;
  let current=null;
  for(const page of doc.pages){
   const d=disposition(page);
   if(d){const name=overrides[doc.file]||(drawings.length===1?identity(cover):'')||d.name||defaultName;current=add(name);current.dispos.push({...d,priority});current.pages.push(page);current.cover=doc.pages[0];current.hasSchema ||= hasSchema;}
   else if(hasSchema){
    if(current)current.pages.push(page);
    else if(drawings.length)continue;
    else {const chosen=overrides[doc.file]||identity(cover);if(chosen){const p=add(chosen);p.pages.push(page);p.cover=doc.pages[0];p.hasSchema=true;}else if(!pending.some(p=>p.file===doc.file))pending.push({file:doc.file,name:defaultName});}
   }
  }
 }
 const merge=(from,to)=>{to.pages.push(...from.pages);to.dispos.push(...from.dispos);to.warnings.push(...from.warnings,'Schema und separate Dispo gemeinsam zugeordnet. Quellen prüfen.');to.hasSchema ||= from.hasSchema;if(!to.cover)to.cover=from.cover;plants.splice(plants.indexOf(from),1);};
 // Resolve pure schemas using the same evidence without assigning them arbitrarily to the only cabinet.
 for(const item of [...pending]){const doc=documents.find(d=>d.file===item.file),probe={pages:doc.pages,cover:doc.pages[0]};const hits=plants.filter(p=>!p.hasSchema&&mergeScore(p,probe)>0);if(hits.length===1){const p=hits[0];p.pages.push(...doc.pages);p.hasSchema=true;pending.splice(pending.indexOf(item),1);}}
 for(const from of [...plants].filter(p=>!p.hasSchema)){
  const hits=plants.filter(p=>p!==from&&p.hasSchema).map(p=>({p,score:mergeScore(from,p)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(hits.length===1)merge(from,hits[0].p);
  else if(hits.length>1)from.warnings.push('Mehrere Schemas passen zu dieser Dispo. Anlage manuell zusammenführen.');
 }
 for(const [source,target] of Object.entries(links)){const a=plants.find(p=>p.id===source),b=plants.find(p=>p.id===target);if(a&&b&&a!==b)merge(a,b);}
 // Merge schemas with a single disposition by the explicit cover identity, even if its drawing title is absent.
 for(const p of plants){
  const ranked=p.dispos.toSorted((a,b)=>b.priority-a.priority),best=ranked[0];
  p.fields=best?best.fields.map(f=>({...f})):[blankField()];
  if(best?.depthWarning)p.warnings.push(best.depthWarning);
  if(!best)p.warnings.push('Keine Dispo zugeordnet. Masse und Feldaufteilung ergänzen.');
  if(best?.uncertain)p.warnings.push('Feldmasse aus Massbeschriftungen vorgeschlagen. Tiefe und Aufteilung prüfen.');
  if(ranked.length>1)p.warnings.push('Mehrere Dispos vorhanden. Separate Dispo hat Vorrang; ältere Zeichnungen bitte abgleichen.');
  const schema=p.pages.filter(page=>!disposition(page)),parsed=parsePages(schema);
  const meta=parsePages(p.cover?[p.cover]:[]).project;const own=best?parsePages([best.page]).project:{};p.project={...meta,...parsed.project,...own,name:p.name};p.devices=parsed.devices;p.warnings.push(...parsed.warnings);
  p.sources=[...new Set(p.pages.map(page=>page.file))].map(file=>`${file} (${p.pages.filter(page=>page.file===file).length} Seiten)`);p.layoutSource=best?`${best.page.file} · Seite ${best.page.number}`:'Keine Dispo';
  const supply=best?[...best.page.text.matchAll(/Zuleitung[^\n]*?\s(\d+)\s*A\b/gi)].map(m=>+m[1]):[];const currents=[...new Set(supply.length?supply:parsed.currents.map(c=>c.amp))];if(currents.length===1)p.project.amp=currents[0];
  const refs=new Map();if(best)for(const item of best.page.items||[]){const ref=item.str.trim().replace(/^[-+]/,'');if(/^\d+[FSPKY]\d+(?:\.\d+)*[A-Za-z]?$/.test(ref)){const list=refs.get(ref)||[];list.push(item.x);refs.set(ref,list);}}
  // Field boundaries need visual confirmation. Never silently place every device into field 1.
  let boundary=null;
  if(best&&p.fields.length===2){
   const labels=p.fields.map(f=>(best.page.items||[]).filter(x=>x.str.trim()===String(f.b)&&!x.rotated&&x.y<best.page.height*.3));
   const centres=p.fields[0].b===p.fields[1].b&&labels[0].length===2?labels[0].map(x=>x.x+(x.width||0)/2).sort((a,b)=>a-b):labels.every(a=>a.length===1)?labels.map(a=>a[0].x+(a[0].width||0)/2):[];
   if(centres.length===2){const [a,b]=centres;if(b>a)boundary=(a*p.fields[1].b+b*p.fields[0].b)/(p.fields[0].b+p.fields[1].b);}
  }
  for(const d of p.devices){d.field=p.fields.length===1?1:0;const xs=refs.get(d.ref.replace(/^[-+]/,''));if(boundary!==null&&xs?.length===1){d.field=xs[0]<boundary?1:2;d.note=(d.note||'')+' Feldvorschlag anhand Position in Dispo; prüfen.';}}
  if(p.fields.length>1)p.warnings.push('Geräte den Feldern zuordnen. Die elektrische Reihenfolge im Schema bestimmt nicht die physische Einbauposition.');
  if(best){const hh=(best.page.items||[]).filter(x=>x.rotated&&/^\d{4}$/.test(x.str.trim())).map(x=>+x.str);if(hh.some(h=>p.fields.some(f=>f.h&&h!==f.h)))p.warnings.push('Höhe in Masslinie und Beschrieb weicht ab. Feldhöhe vor Export prüfen.');}p.reviewed=false;
  for(const order of orders){const info=parseOrder(order);if(info.order===p.project.order||overrides[order.file]===p.name){Object.assign(p.project,info);p.project.name=p.name;p.sources.push(order.file+' (Auftragsbestätigung)');p.warnings.push('PL aus «Ihr Ansprechpartner» vorgeschlagen; Zuständigkeit prüfen.');}}

 }
 for(const order of orders)if(!plants.some(p=>p.sources.some(s=>s.startsWith(order.file+' ('))))pending.push({file:order.file,name:order.file});return {plants,pending};
}

export function parseOrder(doc){const text=doc.pages.map(p=>p.text).join('\n'),lines=text.split('\n').map(s=>s.trim()).filter(Boolean);const after=label=>{const i=lines.findIndex(l=>l===label);return i>=0?lines[i+1]:'';};const date=after('Datum:').match(/(\d{2})\.(\d{2})\.(\d{4})/);const delivery=after('Lieferadresse');return {customer:lines[0]||'',customerNo:after('Kundennummer:'),pl:after('Ihr Ansprechpartner:'),date:date?`${date[3]}-${date[2]}-${date[1]}`:'',order:text.match(/\bAU-\d+\b/)?.[0]||'',city:delivery.match(/\b\d{4}\s+([^,]+)/)?.[1]?.trim()||''};}
