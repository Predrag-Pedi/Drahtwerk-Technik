import {BUS} from './geometry.mjs?v=20261113-9';
import {ports,wirePoints} from './model.mjs?v=20261113-9';
// Read texts belonging to one macro function, never an unrelated fuse elsewhere in the macro.
export function deviceText(e,key='$'){
 if(!e.template)return [e.value,e.text].filter(Boolean).join(' ');
 const labels=[...new Map((e.template.labels||[]).map(l=>[l.key,l])).values()],target=labels.find(l=>l.key===key);if(!target)return '';
 return (e.template.details?.texts||[]).filter(t=>{const r=t.runs?.[0];if(!r)return false;const x=r.matrix[4],y=r.matrix[5];return labels.reduce((best,l)=>Math.hypot(x-l.matrix[4],y-l.matrix[5])<Math.hypot(x-best.matrix[4],y-best.matrix[5])?l:best,labels[0]).key===key;}).map(t=>e.textEdits?.[t.key]??t.text).join(' ');
}
export function fuseRating(text){
 const amps=[...String(text).matchAll(/(?:^|[^\w.])(\d+(?:[.,]\d+)?)\s*A(?![a-z])/gi)].map(m=>Number(m[1].replace(',','.'))).filter(n=>n>0),unique=[...new Set(amps)];
 const explicit=/\bNH\s*00\b/i.test(text)?'NH00':/\bD\s*III\b/i.test(text)?'DIII':/\bD\s*II\b/i.test(text)?'DII':'';const current=unique.length===1?unique[0]:null;
 const inferred=current!==null&&current<=25?'DII':current!==null&&current<=63?'DIII':current!==null&&current<=160?'NH00':'';
 return {current,fuseType:explicit||inferred,ratingInferred:!explicit,conflict:unique.length>1||explicit==='DII'&&current>25||explicit==='DIII'&&current>63||explicit==='NH00'&&current>160};
}
export function localCircuitName(e){if(e.circuitName?.trim())return e.circuitName.trim();const names=[...new Set(Object.values(e.functions||{}).map(f=>f.circuitName?.trim()).filter(Boolean))];if(names.length===1)return names[0];if(names.length>1)return '';if(e.template){const named=(e.template.details?.texts||[]).map(t=>e.textEdits?.[t.key]??t.text).filter(t=>/^(Allgemein|E[- .]?Mob(?:ility|ilität|\.)?|Wohnung\b.*|Whg\.?\s*.*|Wärmepumpe|WP|Gewerbe|Hauswart)$/i.test(t.trim()));if(new Set(named).size===1)return named[0].trim();}if(e.kind==='meter'&&e.text?.trim())return e.text.trim();if(e.template&&(e.template.labels||[]).some(l=>l.letter==='P')&&e.text?.trim())return e.text.trim();return '';}
export function circuitNames(doc,start){
 const queue=[start],seen=new Set(),names=new Set();let visits=0;
 const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1;
 while(queue.length&&visits++<10000){const n=queue.shift(),key=JSON.stringify(n);if(seen.has(key))continue;seen.add(key);const p=doc.pages.find(p=>p.id===n.page);if(!p)continue;
  if(n.kind==='point'){const a=p.connectionPoints?.find(a=>a.id===n.id);if(a)for(const w of p.wires){const pts=wirePoints(p,w);if(near(a,pts[0])||near(a,pts.at(-1)))queue.push({page:p.id,wire:w.id});}}
  if(n.element){const e=p.elements.find(e=>e.id===n.element);if(!e)continue;const explicitNames=[...new Set(Object.values(e.functions||{}).map(f=>f.circuitName?.trim()).filter(Boolean))];if(explicitNames.length>1){explicitNames.forEach(n=>names.add(n));continue;}const name=localCircuitName(e);if(name){names.add(name);continue;}if(p.bus&&e.autoConnect&&e.rotation===0)for(const port of e.template?.ports||[])queue.push({page:p.id,kind:'bus',phase:port.phase});for(const w of p.wires)if([w.from,w.to].some(r=>r?.element===e.id))queue.push({page:p.id,wire:w.id});}
  if(n.wire){const w=p.wires.find(w=>w.id===n.wire);if(!w)continue;for(const ref of [w.from,w.to])if(ref?.element)queue.push({page:p.id,element:ref.element});else if(ref?.wire)queue.push({page:p.id,wire:ref.wire});const points=wirePoints(p,w);if(p.bus)for(const pt of [points[0],points.at(-1)])for(const [phase,y]of Object.entries(BUS))if(Math.abs(pt.y-y)<1&&pt.x>=60&&pt.x<=1140)queue.push({page:p.id,kind:'bus',phase});for(const e of p.elements)if(ports(e,p).some(a=>near(a,points[0])||near(a,points.at(-1))))queue.push({page:p.id,element:e.id});for(const other of p.wires)if(other!==w&&[other.from,other.to].some(r=>r?.wire===w.id))queue.push({page:p.id,wire:other.id});}
  for(const l of doc.links||[])for(const [a,b] of [[l.a,l.b],[l.b,l.a]])if(a.page===n.page&&((n.wire&&a.wire===n.wire)||(n.element&&a.element===n.element)||(n.kind==='bus'&&a.kind==='bus'&&a.phase===n.phase)||(n.id&&a.id===n.id))){if(l.name)names.add(l.name);queue.push(b);}
 }
 return [...names];
}
export function circuitName(doc,start){const names=circuitNames(doc,start);return names.length===1?names[0]:'';}
