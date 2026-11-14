import {functionBmk} from './references.mjs?v=20261114-05';

// Page IDs remain stable: links and device ownership survive reordering.
export function reconcilePageOrder(doc,before,{repair=false}={}){
 const originalNumbers=new Map(doc.pages.map(p=>[p.id,p.number]));
 const reordered=doc.pages.length!==before.pages.length||doc.pages.some((p,i)=>p.id!==before.pages[i]?.id);
 const addedStandards=doc.pages.some(p=>p.standardType&&!before.pages.some(q=>q.id===p.id));
 if((reordered||repair)&&!addedStandards){
  const regular=before.pages.filter(p=>!p.standardType&&!['cover','index'].includes(p.type));
  const start=Math.min(...(regular.length?regular:before.pages).map(p=>p.number));
  const numbers=before.pages.map(p=>p.number).filter(n=>n<start).sort((a,b)=>a-b);
  const prefixLength=numbers.length;
  while(numbers.length<doc.pages.length)numbers.push(start+numbers.length-prefixLength);
  if(numbers[doc.pages.length-1]>9999)throw Error('Maximale Blattnummer 9999 erreicht.');
  doc.pages.forEach((p,i)=>p.number=numbers[i]);
 }
 const oldPages=new Map(before.pages.map(p=>[p.id,p]));
 for(const p of doc.pages){
  const oldNumber=oldPages.get(p.id)?.number??originalNumbers.get(p.id);if(oldNumber===p.number||p.type!=='schema')continue;
  for(const e of p.elements){
   if(!e.template&&!e.dispoSource&&new RegExp('^'+oldNumber+'[A-Z]').test(e.tag||''))e.tag=p.number+e.tag.slice(String(oldNumber).length);
  }
 }
 // Disposition labels are cached from their schema source; refresh only BMKs,
 // preserving geometry, supply descriptions, manual texts and phase suffixes.
 for(const p of doc.pages)for(const e of p.elements){
  if(!e.dispoSource)continue;const ref=e.dispoSource,sourcePage=doc.pages.find(p=>p.id===ref.page),source=sourcePage?.elements.find(q=>q.id===ref.element);
  if(!source||sourcePage.type!=='schema')continue;
  const oldPage=oldPages.get(ref.page),oldSource=oldPage?.elements.find(q=>q.id===ref.element);
  if(!oldSource)continue;
  const oldBmk=functionBmk(before,oldPage,oldSource,ref.key),newBmk=functionBmk(doc,sourcePage,source,ref.key);
  if(!oldBmk||oldBmk===newBmk)continue;
  const replace=value=>typeof value==='string'&&(value===oldBmk||value.startsWith(oldBmk+'.')||value.startsWith(oldBmk+' '))?newBmk+value.slice(oldBmk.length):value;
  e.tag=replace(e.tag);
  for(const key of Object.keys(e.textEdits||{}))if(key.startsWith('bmk:')||e.template?.details?.texts?.some(t=>t.key===key&&t.text.trim()==='BMK'))e.textEdits[key]=replace(e.textEdits[key]);
 }
 return doc;
}
