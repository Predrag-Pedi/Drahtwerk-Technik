import {parsePages} from './core.mjs';
export const blankField=()=>({type:'SBR',b:null,h:null,t:null,percent:50,mode:'estimate',manual:null});
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
 const m=text.match(/B\s*(\d+(?:\s*\/\s*\d+)*)\s*[x×]\s*H\s*(\d+)\s*[x×]\s*T\s*(\d+)\s*mm/i);
 if(!m&&!/\bDispo\b|\bDisposition\b/i.test(text))return null;
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean), alu=lines.findIndex(s=>/Alu[ -](Selbstbau|Reihen)/i.test(s));
 const title=alu>0&&/[a-zäöü]/i.test(lines[alu-1])?lines[alu-1]:'';
 const heading=lines.find(s=>/^Dispo(?:sition)?\s+.+/i.test(s))?.replace(/^Dispo(?:sition)?\s+/i,'')||'';const name=identity(title)||identity(text)||title||heading;
 const type=/Selbstbaurahmen/i.test(text)?'SBR':/Reihenschrank/i.test(text)?'ARS':null;
 let fields=m?m[1].split('/').map(b=>({...blankField(),type:type||'SBR',b:+b.trim(),h:+m[2],t:+m[3]})):[];
 let uncertain=false;
 if(!fields.length){
  // Only propose isolated dimension labels along the upper drawing edge; review is mandatory.
  const items=page.items||[], widths=items.filter(x=>/^\d{3,4}$/.test(x.str.trim())&&+x.str>=400&&!x.rotated&&x.y<page.height*.3&&x.y>page.height*.07).sort((a,b)=>a.x-b.x);
  const heights=items.filter(x=>/^\d{4}$/.test(x.str.trim())&&x.rotated).map(x=>+x.str);
  const h=[...new Set(heights)];
  fields=widths.length>0&&widths.length<=5?widths.map(x=>({...blankField(),type:type||'ARS',b:+x.str,h:h.length===1?h[0]:null})): [blankField()];uncertain=true;
 }
 return {name,fields,page,uncertain,type};
}
export function buildPortfolio(documents,overrides={}){
 const plants=[],pending=[];const add=(name)=>{let p=plants.find(p=>norm(p.name)===norm(name));if(!p){p={id:norm(name),name,pages:[],dispos:[],warnings:[]};plants.push(p);}return p;};
 for(const doc of documents){
  const cover=doc.pages[0]?.text||'', defaultName=identity(cover)||doc.file.replace(/\.pdf$/i,'');
  let current=null;
  for(const page of doc.pages){
   const d=disposition(page);
   if(d){const name=overrides[doc.file]||(doc.role!=='dispo'&&doc.pages.filter(p=>disposition(p)).length===1?identity(cover):'')||d.name||defaultName;current=add(name);current.dispos.push({...d,priority:doc.role==='dispo'?2:1});current.pages.push(page);current.cover=doc.pages[0];}
   else if(doc.role!=='dispo'){
    if(current)current.pages.push(page);
    else if(doc.pages.some(p=>disposition(p)))continue;
    else {const key=doc.file;const chosen=overrides[key];if(chosen){add(chosen).pages.push(page);}else if(identity(cover)){add(defaultName).pages.push(page);}else if(!pending.some(p=>p.file===key))pending.push({file:key,name:defaultName});}
   }
  }
 }
 // Merge schemas with a single disposition by the explicit cover identity, even if its drawing title is absent.
 for(const p of plants){
  const ranked=p.dispos.toSorted((a,b)=>b.priority-a.priority),best=ranked[0];
  p.fields=best?best.fields.map(f=>({...f})):[blankField()];
  if(!best)p.warnings.push('Keine Dispo zugeordnet. Masse und Feldaufteilung ergänzen.');
  if(best?.uncertain)p.warnings.push('Feldmasse aus Massbeschriftungen vorgeschlagen. Tiefe und Aufteilung prüfen.');
  if(ranked.length>1)p.warnings.push('Mehrere Dispos vorhanden. Separate Dispo hat Vorrang; ältere Zeichnungen bitte abgleichen.');
  const schema=p.pages.filter(page=>!disposition(page)),parsed=parsePages(schema);
  const meta=parsePages(p.cover?[p.cover]:[]).project;const own=best?parsePages([best.page]).project:{};p.project={...meta,...parsed.project,...own,name:p.name};p.devices=parsed.devices;p.warnings.push(...parsed.warnings);
  p.sources=[...new Set(p.pages.map(page=>page.file))].map(file=>`${file} (${p.pages.filter(page=>page.file===file).length} Seiten)`);p.layoutSource=best?`${best.page.file} · Seite ${best.page.number}`:'Keine Dispo';
  const supply=best?[...best.page.text.matchAll(/Zuleitung[^\n]*?\s(\d+)\s*A\b/gi)].map(m=>+m[1]):[];const currents=[...new Set(supply.length?supply:parsed.currents.map(c=>c.amp))];if(currents.length===1)p.project.amp=currents[0];
  const refs=new Map();if(best)for(const item of best.page.items||[]){const ref=item.str.trim().replace(/^[-+]/,'');if(/^\d+F\d+[A-Za-z]?$/.test(ref)){const list=refs.get(ref)||[];list.push(item.x);refs.set(ref,list);}}
  // Field boundaries need visual confirmation. Never silently place every device into field 1.
  let boundary=null;
  if(best&&p.fields.length===2){
   const labels=p.fields.map(f=>(best.page.items||[]).filter(x=>x.str.trim()===String(f.b)&&!x.rotated&&x.y<best.page.height*.3));
   if(labels.every(a=>a.length===1)){const [a,b]=labels.map(a=>a[0].x+(a[0].width||0)/2);if(b>a)boundary=(a*p.fields[1].b+b*p.fields[0].b)/(p.fields[0].b+p.fields[1].b);}
  }
  for(const d of p.devices){d.field=p.fields.length===1?1:0;const xs=refs.get(d.ref.replace(/^[-+]/,''));if(boundary!==null&&xs?.length===1){d.field=xs[0]<boundary?1:2;d.note=(d.note||'')+' Feldvorschlag anhand Position in Dispo; prüfen.';}}
  if(p.fields.length>1)p.warnings.push('Geräte den Feldern zuordnen. Die elektrische Reihenfolge im Schema bestimmt nicht die physische Einbauposition.');
  if(best){const hh=(best.page.items||[]).filter(x=>x.rotated&&/^\d{4}$/.test(x.str.trim())).map(x=>+x.str);if(hh.some(h=>p.fields.some(f=>f.h&&h!==f.h)))p.warnings.push('Höhe in Masslinie und Beschrieb weicht ab. Feldhöhe vor Export prüfen.');}p.reviewed=false;
 }
 return {plants,pending};
}
