import {offerHTML} from './offer-document.mjs?v=20261111-16';
import {description} from './core.mjs?v=20261111-16';
import {offerItemName} from './sbr.mjs?v=20261111-8';
export function textTargets(doc){
 const entries=[];
 const field=(obj,key,id,value=obj[key]??'')=>entries.push({id,value,set:text=>obj[key]=text});
 field(doc,'intro','intro');field(doc,'closing','closing');
 doc.plants.forEach((p,pi)=>{
 field(p,'name','p'+pi+'name');field(p,'offerDescription','p'+pi+'desc',description(p));
 p.parts.forEach((s,si)=>{const base='p'+pi+'s'+si;field(s,'name',base+'name');field(s,'notes',base+'notes');
 s.items.forEach((i,ii)=>field(i,'offerDescription',base+'i'+ii,offerItemName(i)));
 });
 });return entries;
}
export function applyTexts(doc,changes){
 const targets=textTargets(doc),allowed=new Map(targets.map(t=>[t.id,t]));
 for(const [key,value] of Object.entries(changes)){if(!allowed.has(key)||typeof value!=='string'||value.length>=50000)throw Error('Ungültiger oder zu langer Angebotstext.');}
 for(const [key,value] of Object.entries(changes)){const target=allowed.get(key);if(value!==target.value)target.set(value);}
}
export function editOfferTexts(doc,mode,onSave){
 const dialog=document.createElement('dialog');dialog.className='drawer';dialog.style.cssText='width:min(100vw,1100px);max-width:100vw;';
 const head=document.createElement('div');head.className='drawer-head';
 const title=document.createElement('h2');title.textContent='Angebotstexte bearbeiten';head.append(title);
 const body=document.createElement('div');body.className='drawer-body';
 const hint=document.createElement('p');hint.textContent='Blaue Textbereiche anklicken, ändern oder mit zusätzlichen Absätzen ergänzen. Preise und Mengen bleiben berechnet. Manuell angepasste Beschreibungen werden als eigener Angebotstext gespeichert.';body.append(hint);
 const preview=document.createElement('div');preview.innerHTML=offerHTML(doc,mode,true);body.append(preview);
 const foot=document.createElement('div');foot.className='drawer-foot bar';
 const save=document.createElement('button');save.className='primary';save.textContent='Texte übernehmen';
 const cancel=document.createElement('button');cancel.textContent='Abbrechen';
 const error=document.createElement('p');error.setAttribute('role','alert');
 const close=()=>{dialog.close();dialog.remove();};
 cancel.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 save.onclick=()=>{try{const changes=Object.fromEntries([...preview.querySelectorAll('[data-offer-text]')].map(e=>[e.dataset.offerText,e.innerText.replace(/\r\n/g,'\n')]));
 applyTexts(doc,changes);onSave();close();}catch(e){error.textContent=e.message;}};
 foot.append(save,cancel,error);dialog.append(head,body,foot);document.body.append(dialog);dialog.showModal();
}
