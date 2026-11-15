import {findFunction} from './references.mjs?v=20261115-23';
import {localCircuitName} from './circuit-data.mjs?v=20261115-23';
import {meterParentFor} from './alignment.mjs?v=20261115-23';
const palette=['#1556b0','#7b2cbf','#008078','#c04a00','#00823b','#b51f54','#68521a','#42556b','#9d398e','#766800','#00668c','#974237'];
const normal=name=>String(name||'').trim().toLocaleLowerCase('de');
const named=name=>{const k=normal(name);return k&&!/^(reserve|zählerabgänge)$/.test(k)?k:'';};
const fixed=k=>k==='allgemein'?0:/^e[- .]?mob/.test(k)?1:/^(wärmepumpe|wp)$/.test(k)?2:/^wohnung [123]$/.test(k)?Number(k.at(-1))+2:k==='gewerbe'?6:/^gesam{1,2}tmessung$/.test(k)?7:null;
export function groupColor(name,names=[]){
 const key=named(name);if(!key)return null;
 const keys=[...new Set([...names,name].map(named).filter(Boolean))].sort(),used=new Set(keys.map(fixed).filter(n=>n!==null)),colors=new Map();
 for(const k of keys){const f=fixed(k);if(f!==null){colors.set(k,palette[f]);continue;}
  let hash=0;for(const c of k)hash=(hash*31+c.charCodeAt(0))>>>0;
  let index=3+hash%(palette.length-3);for(let n=0;n<palette.length&&used.has(index);n++)index=(index+1)%palette.length;
  used.add(index);colors.set(k,palette[index]);
 }return colors.get(key);
}
export function deviceGroup(doc,e){
 if(e.reserve||e.meterState==='reserve')return '';
 const source=findFunction(doc,e.dispoSource);
 let owner=findFunction(doc,e.meterSource);
 // Older saved dispositions may lack meterSource. Resolve from the original
 // branch geometry, never from the closest tag or a neighbouring apartment.
 if(!owner&&source&&e.meterFed){const parent=meterParentFor(source.element,source.page),key=parent?.template?.labels?.find(l=>l.letter==='P')?.key;if(key)owner=findFunction(doc,{page:source.page.id,element:parent.id,key});}
 const name=f=>f&&(f.data.circuitName||f.data.description||localCircuitName(f.element));
 return name(owner)||e.circuitName||name(source)||'';
}
export function pageGroupColor(doc,p,name){return groupColor(name,p.elements.map(e=>deviceGroup(doc,e)));}
export function deviceColor(doc,p,e){return p.type==='dispo'&&p.dispoConfig?.groupColors!==false&&e.dispoSource?pageGroupColor(doc,p,deviceGroup(doc,e)):null;}
