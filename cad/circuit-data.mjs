import {isRse} from './rse.mjs?v=20261118-3';
import {fuseLimits} from './fuse-systems.mjs?v=20261118-3';
import {BUS} from './geometry.mjs?v=20261118-3';
import {ports,wirePoints} from './model.mjs?v=20261118-3';
// Read texts belonging to one macro function, never an unrelated fuse elsewhere in the macro.
export function deviceText(e,key='$'){
 if(!e.template)return [e.value,e.text].filter(Boolean).join(' ');
 const labels=[...new Map((e.template.labels||[]).map(l=>[l.key,l])).values()],target=labels.find(l=>l.key===key);if(!target)return '';
 return (e.template.details?.texts||[]).filter(t=>{const r=t.runs?.[0];if(!r)return false;const x=r.matrix[4],y=r.matrix[5];return labels.reduce((best,l)=>Math.hypot(x-l.matrix[4],y-l.matrix[5])<Math.hypot(x-best.matrix[4],y-best.matrix[5])?l:best,labels[0]).key===key;}).map(t=>e.textEdits?.[t.key]??t.text).join(' ');
}
export function disconnectBlade(text){return /\bTrennmesser\b/i.test(text)&&/\b(?:NH|DIN)\s*0\s*0\b/i.test(text);}
export function fuseRating(text,ratedCurrent,system='conventional',override='auto'){
 if(disconnectBlade(text)){const current=Number(String(ratedCurrent||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'))||null;const fuseType=override==='auto'?'NH00':override;return {current,fuseType,ratingInferred:override==='auto',conflict:!fuseLimits[fuseType]||current>fuseLimits[fuseType],neutral:true};}
 const amps=[...String(text).matchAll(/(?:^|[^\w.])(\d+(?:[.,]\d+)?)\s*A(?![a-z])/gi)].map(m=>Number(m[1].replace(',','.'))).filter(n=>n>0),unique=[...new Set(amps)];
 const raw=String(text).match(/\b(?:NH|DIN)\s*(000|00|[123])\b/i)?.[1];
 const explicit=raw?'NH'+raw:/\bD\s*III\b/i.test(text)?'DIII':/\bD\s*II\b/i.test(text)?'DII':'';
 const current=unique.length===1?unique[0]:null;
 const inferred=current!==null?Object.keys(fuseLimits).find(k=>current<=fuseLimits[k]&&(k!=='NH000'||system!=='vertigroup185')&&(!['DII','DIII'].includes(k)||system!=='vertigroup185'))||'':'';
 let fuseType=override!=='auto'?override:explicit||inferred;if(system==='vertigroup185'&&fuseType==='NH000')fuseType='NH00';
 return {current,fuseType,ratingInferred:!explicit&&override==='auto',conflict:unique.length>1||!fuseLimits[fuseType]||current>fuseLimits[fuseType]};
}
export function localCircuitName(e){if(e.circuitName?.trim())return e.circuitName.trim();const names=[...new Set(Object.values(e.functions||{}).map(f=>f.circuitName?.trim()).filter(Boolean))];if(names.length===1)return names[0];if(names.length>1)return '';const meterKeys=new Set((e.template?.labels||[]).filter(l=>l.letter==='P').map(l=>l.key));const descriptions=[...new Set(Object.entries(e.functions||{}).filter(([key])=>e.kind==='meter'||meterKeys.has(key)).map(([,f])=>f.description?.trim()).filter(Boolean))];if(descriptions.length===1)return descriptions[0];if(e.template&&!isRse(e)&&!/stromwandler/i.test(e.template.name)){const named=(e.template.details?.texts||[]).map(t=>e.textEdits?.[t.key]??t.text).filter(t=>/^(Allgemein|E[- .]?Mob(?:ility|ilität|\.)?|Wohnung\b.*|Whg\.?\s*.*|Wärmepumpe|WP|Gewerbe|Hauswart)$/i.test(t.trim()));if(new Set(named).size===1)return named[0].trim();}if(e.kind==='meter'&&e.text?.trim())return e.text.trim();if(e.template&&(e.template.labels||[]).some(l=>l.letter==='P')&&e.text?.trim())return e.text.trim();return '';}
export function circuitNames(doc,start){
 const queue=[start],seen=new Set(),names=new Set();let visits=0;
 const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1;
 while(queue.length&&visits++<10000){const n=queue.shift(),key=JSON.stringify(n);if(seen.has(key))continue;seen.add(key);const p=doc.pages.find(p=>p.id===n.page);if(!p)continue;
  if(n.kind==='point'){const a=p.connectionPoints?.find(a=>a.id===n.id);if(a)for(const w of p.wires){const pts=wirePoints(p,w);if(near(a,pts[0])||near(a,pts.at(-1)))queue.push({page:p.id,wire:w.id});}}
  if(n.element){const e=p.elements.find(e=>e.id===n.element);if(!e)continue;const explicitNames=[...new Set(Object.values(e.functions||{}).map(f=>f.circuitName?.trim()).filter(Boolean))];if(explicitNames.length>1){explicitNames.forEach(n=>names.add(n));continue;}const name=localCircuitName(e);if(name){names.add(name);continue;}if(p.bus&&e.autoConnect&&e.rotation===0)for(const [i,port] of (e.template?.ports||[]).entries())queue.push({page:p.id,kind:'bus',phase:e.autoPhases?.[i]||port.phase});for(const w of p.wires)if([w.from,w.to].some(r=>r?.element===e.id))queue.push({page:p.id,wire:w.id});}
  if(n.wire){const w=p.wires.find(w=>w.id===n.wire);if(!w)continue;for(const ref of [w.from,w.to])if(ref?.element)queue.push({page:p.id,element:ref.element});else if(ref?.wire)queue.push({page:p.id,wire:ref.wire});const points=wirePoints(p,w);if(p.bus)for(const pt of [points[0],points.at(-1)])for(const [phase,y]of Object.entries(BUS))if(Math.abs(pt.y-y)<1&&pt.x>=60&&pt.x<=1140)queue.push({page:p.id,kind:'bus',phase});for(const e of p.elements)if(ports(e,p).some(a=>near(a,points[0])||near(a,points.at(-1))))queue.push({page:p.id,element:e.id});for(const other of p.wires)if(other!==w&&[other.from,other.to].some(r=>r?.wire===w.id))queue.push({page:p.id,wire:other.id});}
  for(const l of doc.links||[])for(const [a,b] of [[l.a,l.b],[l.b,l.a]])if(a.page===n.page&&((n.wire&&a.wire===n.wire)||(n.element&&a.element===n.element)||(n.kind==='bus'&&a.kind==='bus'&&a.phase===n.phase)||(n.id&&a.id===n.id))){if(l.name)names.add(l.name);queue.push(b);}
 }
 return [...names];
}
export function circuitName(doc,start){const names=circuitNames(doc,start);return names.length===1?names[0]:'';}

// Audited original SPD symbols, including CT circuits and spark gaps.
// Stable identities survive renamed library entries and edited amp placeholders.
const spdTemplates=new Set(['tl-0004','tl-0005','tl-0006','tl-0109','tl-0186','tl-0187','tl-0188','tl-0189','tl-0190','tl-0191']);
export function spdFunction(e,key){
 if(spdTemplates.has(e.template?.id))return true;
 // This macro contains both the arrester and its separate NH00 upstream fuse.
 if(e.template?.id==='tl-0108')return key==='120F1';
 return null;
}
// Classify the selected function, not the enclosing mixed meter macro.
export function protectionKind(e,key='$'){
 const label=e.template?.labels?.find(l=>l.key===key);
 if(e.template?label?.letter!=='F':!['fuse','ls','fils'].includes(e.kind))return '';
 const text=deviceText(e,key),name=e.template?.name||'';
 const knownSpd=spdFunction(e,key);
 if(knownSpd===true)return 'spd';
 const singleFunction=new Set((e.template?.labels||[]).filter(l=>l.letter==='F').map(l=>l.key)).size===1;
 if(knownSpd!==false&&(/\bSPD\b|Überspannungs[-\s]*(?:ableiter|schutz)|Typ\s*CT[12]|Surge|Funkenstrecke/i.test(text)||singleFunction&&/\bSPD\b|Überspannung|Typ\s*CT[12]|Surge|Funkenstrecke/i.test(name+' '+(e.template?.group||''))))return 'spd';
 if(['ls','fils'].includes(e.kind))return e.kind;
 const single=(e.template?.labels||[]).filter(l=>l.letter==='F').length===1;
 if(/\b\d+(?:[.,]\d+)?\s*mA\b|FI.?LS/i.test(text)||single&&/FI.?LS/i.test(name))return 'fils';
 if(/\b[BCD]\s*\d+|\d+\s*A\s*[/ ]*\s*[BCD]\b/i.test(text)||single&&/(?:^|_)LS(?:_|$)/i.test(name))return 'ls';
 return 'fuse';
}
