import {parsePages,defaultIcp} from './core.mjs?v=20261030-2';
export const blankField=()=>({type:'SBR',b:null,h:null,t:null,percent:50,surchargePercent:0,mode:'devices',manual:null});
const norm=s=>s.toLowerCase().replace(/[^a-z0-9äöü]+/g,' ').trim();
// Extract installation addresses, preferring explicit project blocks over company addresses.
export function objectAddress(pages){
 const candidates=[];
 for(const page of pages){
  const text=(page.text||'').split('\n').map(s=>s.trim()).filter(Boolean).join('\n'), re=/([A-ZÄÖÜ][\p{L}.-]*(?:strasse|straße|weg|gasse|platz|rain|halde|boden|allee)\s+\d+[a-z]?(?:\s*[+\/–-]\s*(?:\d+[a-z]?|[A-Z]))?)\s*[,\n ]+\s*(\d{4})\s+([A-ZÄÖÜ][\p{L}.-]*(?:[ \t]+(?:am|an|im|in|ob|unter|bei|der|den|[A-ZÄÖÜ][\p{L}.-]*))*)/gu;
  // Some CAD title blocks emit their three address lines in reverse reading order.
  const reverse=/^([A-ZÄÖÜ][\p{L} .-]+)\n(\d{4})\n([A-ZÄÖÜ][\p{L} .-]*\s+\d+\s*[A-Za-z]?(?:[+\/–-](?:\d+[a-z]?|[A-Z]))?)$/gmu;
  for(const m of text.matchAll(reverse))candidates.push({value:m[3]+', '+m[2]+' '+m[1],score:/Objekt:/.test(text)?15+m.index/Math.max(1,text.length):5});
  for(const m of text.matchAll(re)){
   const before=text.slice(Math.max(0,m.index-180),m.index);
   const company=/\b(?:AG|GmbH)\s*$/.test(before.trim());
   const project=/Objekt|Projekt|Bauvorhaben|Bauobjekt|Installationsadresse/i.test(before);
   if(company&&!project)continue;
   candidates.push({value:m[1].replace(/\s+/g,' ') + ', '+m[2]+' '+m[3].trim(),score:(project?10:0)});
  }
 }
 return candidates.sort((a,b)=>b.score-a.score)[0]?.value||'';
}
export function identity(text){
 if(/Unterverteilung\s+Neubau\s+Haus\s+[A-Z]\s*[-–]\s*[A-Z]/i.test(text))return text.match(/Unterverteilung\s+Neubau\s+Haus\s+[A-Z]\s*[-–]\s*[A-Z]/i)[0].replace(/\s+/g,' ');
 if(/Unterverteilung\s+E-Mobility/i.test(text))return 'Unterverteilung E-Mobility';
 if(/Einspeisefeld\s+EVU/i.test(text))return 'Einspeisefeld EVU';
 const cabinet=text.match(/\b\d+\.HVE\.\d+\s*\/\s*Grobverteilung[^\n]*/i);if(cabinet)return cabinet[0].trim();

 const house=text.match(/(?:HV\s*)?Haus\s+([A-Z]|\d+)\b/i)||text.match(/\bHV([A-Z])\b/);if(house)return 'HV Haus '+house[1].toUpperCase();
 if(/Dispo\s+(?:UV\s+)?Linke\s+Wand/i.test(text))return 'UV Linke Wand Allgemein';
 if(/Dispo\s+Rechte\s+Wand/i.test(text))return 'Rechte Wand';
 if(/00-HV_ALLG|HV Allgemein|Allgemein\s+Hauptverteilung/i.test(text))return 'HV Allgemein';
 // CAD exports may emit all cover labels before their values instead of row by row.
 const description=text.match(/Projektbeschreibung:[ \t]*(?:\r?\n[ \t]*)?(Hauptverteilung|Unterverteilung)([^\r\n]*)/i);
 if(description)return (description[1]+description[2]).trim();
 if(/ELEKTROSCHEMA/i.test(text)&&/Projektbeschreibung:/i.test(text)){
  const names=[...text.matchAll(/^[ \t]*(Hauptverteilung|Unterverteilung)[ \t]*$/gim)].map(m=>m[1]);
  if(new Set(names.map(n=>n.toLowerCase())).size===1)return names[0];
 }
 return '';
}
export function disposition(page){
 const text=page.text;if(/Allgemeine Hinweise|Symbolverzeichnis|Inhaltsverzeichnis|Anschluss-?\s*und\s*Umgebungsbedingungen|ELEKTROSCHEMA/i.test(text))return null;
 const bare=text.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)\s*mm\s*\(BxHxT\)/i);
 const m=text.match(/B\s*(\d+(?:\s*\/\s*\d+)*)\s*[x×]\s*H\s*(\d+)\s*(?:\([^)]*\)\s*)?[x×]\s*([TH])\s*(\d+)\s*mm/i)||(bare?[bare[0],bare[1],bare[2],'T',bare[3]]:null);
 if(!m&&!/^\s*(?:Dispo|Disposition)(?:\s*$|[ \t]+(?:HV|UV|Hauptverteilung|Unterverteilung|Rechte|Linke)\b)/im.test(text))return null;
 const lines=text.split('\n').map(s=>s.trim()).filter(Boolean), alu=lines.findIndex(s=>/Alu[ -](Selbstbau|Reihen)/i.test(s));
 const title=alu>0&&/[a-zäöü]/i.test(lines[alu-1])&&!/^\d*[FSPKYQ]\d+(?:\.\d+)*$/i.test(lines[alu-1])?lines[alu-1]:'';
 const heading=lines.find(s=>/^Dispo(?:sition)?\s+.+/i.test(s))?.replace(/^Dispo(?:sition)?\s+/i,'')||'';const cabinet=/Alu-Aussenzählerkasten/i.test(text)?'Aussenzählerkasten':lines.find(s=>/^(?:Unterverteilung|Hauptverteilung)\s+Auftrag:/i.test(s))?.split(/\s+Auftrag:/i)[0];const name=identity(title)||identity(text)||cabinet||title||heading;
 const type=/Feldverteiler\s+Hager|Hager\s+(?:univers|Feldverteiler)/i.test(text)?'Hager':/Selbstbaurahmen/i.test(text)?'SBR':/Alu-Aussenzählerkasten/i.test(text)?'GZK':/Reihenschrank/i.test(text)?'ARS':null;
 let fields=m?m[1].split('/').map(b=>({...blankField(),type:type||'SBR',b:+b.trim(),h:+m[2],t:+m[4]})):[];
 let uncertain=false;
 if(!fields.length){
  // Only propose isolated dimension labels along the upper drawing edge; review is mandatory.
  const items=page.items||[], widths=items.filter(x=>/^\d{3,4}$/.test(x.str.trim())&&+x.str>=400&&!x.rotated&&x.y<page.height*.5&&x.y>page.height*.07).sort((a,b)=>a.x-b.x);
  const heights=items.filter(x=>/^\d{4}$/.test(x.str.trim())&&x.rotated);
  const h=[...new Set(heights.map(x=>+x.str))];
  const heightFor=x=>{const left=heights.filter(a=>a.x<x.x).sort((a,b)=>b.x-a.x)[0];return left?+left.str:h.length===1?h[0]:null;};
  fields=widths.length>0&&widths.length<=5?widths.map(x=>({...blankField(),type:type||'ARS',b:+x.str,h:heightFor(x)})): [blankField()];uncertain=true;
 }
 return {name,fields,page,uncertain,type,depthWarning:m&&m[3].toUpperCase()==='H'?`Im Beschrieb steht H${m[4]} statt T${m[4]}. Als Tiefe übernommen; bitte prüfen.`:''};
}
const refSet=pages=>new Set(pages.flatMap(p=>[...p.text.matchAll(/\b\d*[FSPKYQ]\d+(?:\.\d+)*[A-Za-z]?\b/g)].map(m=>m[0])));
const fileStem=file=>norm(file.replace(/^\d{4}-\d{2}-\d{2}[_ -]*/, '').replace(/\.pdf$/i,''));
function mergeScore(layout,schema){
 const a=identity(layout.dispos?.[0]?.page.text||layout.cover?.text||''),b=identity(schema.cover?.text||'');if(a&&b&&a!==b)return 0;
 const ar=refSet(layout.pages),br=refSet(schema.pages.filter(p=>!disposition(p)));const overlap=[...ar].filter(r=>br.has(r)).length;
 if(overlap<3){const li=identity(layout.dispos?.[0]?.page.text||layout.cover?.text||''),si=identity(schema.cover?.text||'');if(!(overlap>0&&li&&li===si))return 0;}
 const af=fileStem(layout.pages[0].file),bf=fileStem(schema.pages[0].file);
 const related=af===bf||af.startsWith(bf+' ')||bf.startsWith(af+' ');
 // References alone are not unique across different cabinets. Require project/name evidence too.
 const coverWords=p=>new Set((p.cover?.text||'').split(/\s+/).filter(w=>/^[A-ZÄÖÜ]{4,}$/.test(w)&&!['ELEKTROSCHEMA','DISPO'].includes(w)));
 const ac=coverWords(layout),bc=coverWords(schema),shared=[...ac].some(w=>bc.has(w));
 const address=t=>[...t.matchAll(/[^\n]*(?:strasse|straße|weg|gasse)\s+\d+[^\n]*/gi)].at(-1)?.[0]?.trim().toLowerCase();
 const projectAddress=t=>{const body=t.slice(t.indexOf('Objekt:'));return address(body);};
 const la=projectAddress(layout.cover?.text||''),sa=projectAddress(schema.cover?.text||'');
 const designation=t=>t.match(/^(?:Hauptverteilung|Unterverteilung|HV|UV)\s+[^\n]+/im)?.[0]?.trim().toLowerCase();
 const ld=designation(layout.cover?.text||''),sd=designation(schema.cover?.text||'');
 const cabinetId=t=>t?.match(/\b[A-Z]\d{2,}\b/i)?.[0];if(cabinetId(ld)&&cabinetId(sd)&&cabinetId(ld)!==cabinetId(sd))return 0;
 const sameAddress=la&&la===sa&&ld&&ld===sd;
 const street=f=>f.match(/([a-zäöü]+(?:weg|strasse|straße|gasse))\s+(\d+[a-z]?)/i)?.[0]?.toLowerCase();
 const layoutStreet=street(layout.pages[0].file),schemaStreet=street(schema.pages[0].file);
 const sameFileAddress=layoutStreet&&layoutStreet===schemaStreet;
 const streets=t=>[...t.matchAll(/([a-zäöü]+(?:weg|strasse|straße|gasse))\s+(\d+[a-z]?)/gi)].map(m=>norm(m[0]));
 const sharedStreet=streets(layout.cover?.text||'').some(a=>streets(schema.cover?.text||'').includes(a));
 const laObject=objectAddress(layout.cover?[layout.cover]:[]),saObject=objectAddress(schema.cover?[schema.cover]:[]);
 const sameObject=laObject&&norm(laObject)===norm(saObject);
 return (related||shared||sameAddress||sameFileAddress||sharedStreet||sameObject||a&&a===b)&&overlap/Math.min(ar.size,br.size)>=.4?overlap:0;
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
   if(!d&&/^\+AZK\s+Aussenzählerkasten\s*$/m.test(page.text)&&!/^\+HV\s+Hauptverteilung/m.test(page.text)){const p=add('Aussenzählerkasten');p.pages.push(page);p.cover=doc.pages[0];p.hasSchema=true;continue;}
   if(d){const name=overrides[doc.file]||(drawings.length===1?identity(cover):'')||d.name||defaultName;current=add(name);current.dispos.push({...d,priority,cover:doc.pages[0]});current.pages.push(page);current.cover=doc.pages[0];current.hasSchema ||= hasSchema;}
   else if(hasSchema){
    if(current)current.pages.push(page);
    else if(drawings.length===1){const layout=disposition(drawings[0]);const name=overrides[doc.file]||identity(cover)||layout.name||defaultName;current=add(name);current.pages.push(page);current.cover=doc.pages[0];current.hasSchema=true;}
    else if(drawings.length)continue;
    else {const chosen=overrides[doc.file]||identity(cover);if(chosen){const p=add(chosen);p.pages.push(page);p.cover=doc.pages[0];p.hasSchema=true;}else if(!pending.some(p=>p.file===doc.file))pending.push({file:doc.file,name:defaultName});}
   }
  }
 }
 // A catalogued field distributor may have no disposition. Match its order explicitly.
 for(const item of [...pending]){
  const doc=documents.find(d=>d.file===item.file),au=doc.pages.map(p=>p.text).join(' ').match(/\bAU-\d+\b/)?.[0];
  const matches=orders.filter(o=>au&&parseOrder(o).order===au);
  if(matches.length!==1)continue;
  const order=matches[0],body=order.pages.map(p=>p.text).join(' '),hager=body.match(/(?:AP-)?Feldverteiler\s+Hager|Hager\s+univers/i),dims=hager&&body.slice(hager.index).match(/(\d+)\s*[×x]\s*(\d+)\s*[×x]\s*(\d+)\s*mm/i);
  if(!dims)continue;
  const p=add(item.name),layoutPage={...order.pages[0],text:'Dispo\nFeldverteiler Hager\nB'+dims[1]+'x H'+dims[2]+'x T'+dims[3]+'mm\n'+au};
  p.pages.push(...doc.pages);p.cover=doc.pages[0];p.hasSchema=true;p.dispos.push({...disposition(layoutPage),priority:0});
  const supply=body.slice(hager.index).match(/Zuleitung[^\n]*?\b(\d+)\s*A\b/i);p.orderSupply=supply?+supply[1]:null;
  p.warnings.push('Hager-Feldverteiler: Masse aus Auftragsbestätigung, Max. Pv aus ARS,AL,GZK.');pending.splice(pending.indexOf(item),1);
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
  if(!p.hasSchema)p.warnings.push('Für diese Anlage fehlt das Schema. Der Gerätebestand kann aus der Dispo nicht vollständig berechnet werden.');
  if(!best)p.warnings.push('Keine Dispo zugeordnet. Masse und Feldaufteilung ergänzen.');
  if(best&&/UV\s+Allgemein/i.test(best.page.text)&&p.fields.length>1)p.warnings.push('UV Allgemein wird als zusätzliches Feld der Hauptverteilung gemeinsam berechnet. Bemessungsstrom der Gesamtanlage gemäss Hauptschalter.');
  if(best?.uncertain)p.warnings.push('Feldmasse aus Massbeschriftungen vorgeschlagen. Tiefe und Aufteilung prüfen.');
  if(ranked.length>1)p.warnings.push('Mehrere Dispos vorhanden. Separate Dispo hat Vorrang; ältere Zeichnungen bitte abgleichen.');
  const schema=p.pages.filter(page=>!disposition(page)),parsed=parsePages(schema);
  const meta=parsePages(p.cover?[p.cover]:[]).project;const own=best?parsePages([best.page]).project:{};p.project={...meta,...parsed.project,...own,name:p.name};p.project.object=objectAddress([...schema,...(best?[best.page]:[]),...(best?.cover?[best.cover]:p.cover?[p.cover]:[])]);const schemaAddress=objectAddress(schema),layoutAddress=objectAddress(best?.cover?[best.cover]:[]),sa=schemaAddress.match(/,\s*(\d{4})\s+(.+)$/),la=layoutAddress.match(/,\s*(\d{4})\s+(.+)$/);if(sa&&la&&sa[1]!==la[1]&&norm(sa[2])===norm(la[2]))p.warnings.push('Abweichende Postleitzahl: Schema '+sa[1]+', Dispo '+la[1]+'. Objektadresse prüfen.');p.devices=parsed.devices;if(best&&/smissline/i.test(best.page.text))for(const d of p.devices)if(['LS','FILS','FI'].includes(d.kind)){d.system='smissline';d.note+=' Smissline gemäss zugeordnetem Dispo.';}p.warnings.push(...parsed.warnings,...parsed.ignored.filter(s=>s.includes('kein Privatzähler')||s.includes('gemäss Vorgabe ausgeschlossen')||s.includes('Reserve ohne angeschlossene Stromlinien')));
  p.sources=[...new Set(p.pages.map(page=>page.file))].map(file=>`${file} (${p.pages.filter(page=>page.file===file).length} Seiten)`);p.layoutSource=best?`${best.page.file} · Seite ${best.page.number}`:'Keine Dispo';
  const supply=best?[...best.page.text.matchAll(/(?:Zuleitung|HAK)[^\n]*?\s(\d+)\s*A\b/gi)].map(m=>+m[1]):[];const mains=parsed.devices.filter(d=>d.kind==='MAIN'&&d.amp).map(d=>d.amp);const currents=[...new Set(mains.length?mains:supply.length?supply:parsed.currents.map(c=>c.amp))];if(currents.length===1)p.project.amp=currents[0];else if(p.orderSupply)p.project.amp=p.orderSupply;
  const refs=new Map();if(best)for(const item of best.page.items||[]){for(const match of item.str.matchAll(/(?<![\w])[-+]?\d*[FSPKYQ]\d+(?:\.\d+)*[A-Za-z]?(?![\w])/g)){const ref=match[0].replace(/^[-+]/,'');const list=refs.get(ref)||[];list.push(item.x+(item.width||0)*match.index/Math.max(1,item.str.length));refs.set(ref,list);}}
  assignFields(p.devices,p.fields,best?.page,refs);
  if(p.devices.some(d=>d.fieldMethod==='slots'))p.warnings.push('Nicht im Dispo lokalisierte Geräte automatisch nach Platzeinheiten und Feldbreiten verteilt (Näherung).');
  if(best){const hh=(best.page.items||[]).filter(x=>x.rotated&&/^\d{4}$/.test(x.str.trim())).map(x=>+x.str);if(hh.some(h=>p.fields.some(f=>f.h&&h!==f.h)))p.warnings.push('Höhe in Masslinie und Beschrieb weicht ab. Feldhöhe vor Export prüfen.');}p.reviewed=false;p.smisslineInstalled=!!best&&/smissline/i.test(best.page.text);p.project.icp=defaultIcp(p.devices,p.smisslineInstalled);p.icpManual=false;
  for(const order of orders){const info=parseOrder(order);if(info.order===p.project.order||overrides[order.file]===p.name||best&&best.page.text.includes('/'+info.order.replace('AU-',''))&&(/Selbstbaurahmen/i.test(best.page.text)===/Selbstbaurahmen/i.test(order.pages.map(p=>p.text).join(' ')))){Object.assign(p.project,info);p.project.name=p.name;const construction=order.pages.map(x=>x.text).join(' '),depth=construction.match(/\bT\s*(\d+)\s*mm/i);for(const f of p.fields){if(!f.t&&depth)f.t=+depth[1];if(!best?.type){const sbr=/Alu[ -]Selbstbaurahmen/i.test(construction),ars=/Alu[ -]Reihenschrank/i.test(construction);if(sbr&&!ars)f.type='SBR';if(ars&&!sbr)f.type='ARS';}}p.sources.push(order.file+' (Auftragsbestätigung)');}}

 }
 for(const order of orders)if(!plants.some(p=>p.sources.some(s=>s.startsWith(order.file+' ('))))pending.push({file:order.file,name:order.file});return {plants,pending};
}

export function parseOrder(doc){
 const text=doc.pages.map(p=>p.text).join('\n'),lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
 const after=label=>{const i=lines.findIndex(l=>l.startsWith(label));return i>=0?(lines[i].slice(label.length).trim()||lines[i+1]||''):'';};
 const date=after('Datum:').match(/(\d{2})\.(\d{2})\.(\d{4})/),delivery=text.split('Lieferadresse')[1]?.split(/Guten Tag|Sehr geehrt|Pos\./)[0]||'';
 // Recipient/salutation belongs to the customer. "Ihr Ansprechpartner" is the issuer.
 const salutation=text.match(/(?:Guten Tag|Sehr geehrter Herr|Sehr geehrte Frau)\s+([^\n,]+)/i)?.[1]?.trim();
 const recipient=lines.find(l=>/^(?:Herr|Frau)\s+/.test(l))?.replace(/^(?:Herr|Frau)\s+/,'').trim();
 const name=[salutation,recipient].find(n=>n&&n.split(/\s+/).length>=2&&!/Djevat|Neziri/i.test(n))||'';
 return {customer:(lines.findIndex(l=>/^(?:Herr|Frau)\s+/.test(l))>0?lines[lines.findIndex(l=>/^(?:Herr|Frau)\s+/.test(l))-1]:'')||lines.find(l=>!/Drahtwerk/i.test(l)&&/\b(?:AG|GmbH)\b/.test(l))||'',customerNo:after('Kundennummer:').match(/^\d+/)?.[0]||'',pl:name,date:date?`${date[3]}-${date[2]}-${date[1]}`:'',order:text.match(/\bAU-\d+\b/)?.[0]||'',city:delivery.match(/\b\d{4}\s+([^,]+)/)?.[1]?.trim()||''};
}
export function moduleUnits(d){
 if(d.kind==='LS')return d.poles==='3LN'||d.poles==='4P'?3:1;
 if(d.kind==='FILS')return d.poles==='3LN'||d.poles==='4P'?4:2;
 return d.poles==='3LN'||d.poles==='4P'||d.poles==='4S'?4:2;
}
export function assignFields(devices,fields,page,refs=new Map()){
 if(!fields.length)return;
 const labels=(page?.items||[]).filter(x=>!x.rotated&&x.y<page.height*.5&&fields.some(f=>String(f.b)===x.str.trim())).sort((a,b)=>a.x-b.x);
 const centres=labels.length===fields.length&&labels.every((x,i)=>+x.str===fields[i].b)?labels.map(x=>x.x+(x.width||0)/2):[];
 const boundaries=centres.slice(1).map((x,i)=>(centres[i]*fields[i+1].b+x*fields[i].b)/(fields[i].b+fields[i+1].b));
 const loads=fields.map(()=>0),widths=fields.map(f=>f.b>0?f.b:1);
 for(const d of devices){
  d.field=fields.length===1?1:0;d.fieldMethod=fields.length===1?'single':'';
  const xs=refs.get(d.ref.replace(/^[-+]/,''));
  if(centres.length&&xs?.length){const targets=xs.map(x=>boundaries.filter(b=>x>=b).length+1);if(targets.every(f=>f===targets[0])){d.field=targets[0];d.fieldMethod='dispo';}}
  if(d.field)loads[d.field-1]+=moduleUnits(d)*(d.qty||1);
 }
 for(const d of devices.filter(d=>!d.field)){
  const units=moduleUnits(d)*(d.qty||1);let target=0;
  for(let i=1;i<fields.length;i++)if((loads[i]+units)/widths[i]<(loads[target]+units)/widths[target])target=i;
  d.field=target+1;d.fieldMethod='slots';loads[target]+=units;
 }
 for(const d of devices)d.note=(d.note||'')+(d.fieldMethod==='slots'?' Feld automatisch nach Platzeinheiten/Feldbreite verteilt (Näherung).':d.fieldMethod==='dispo'?' Feld anhand Kennzeichen im Dispo.':'');
}
