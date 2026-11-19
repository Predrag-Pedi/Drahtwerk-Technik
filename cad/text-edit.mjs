import {functionBmk,functionData,functionKeys,findFunction} from './references.mjs?v=20261119-5';

function bmkOwner(d,e,key){const data=functionData(e,key),owner=data.role==='contact'&&data.owner&&findFunction(d,data.owner);return owner?.data?.role==='coil'?owner:null;}

// One edit path for direct double-clicks and inspector actions. BMKs remain
// function metadata so contacts, device lists and exports see the same value.
export function drawingText(d,p,e,key){
 if(key.startsWith('bmk:')){const id=key.slice(4);if(!functionKeys(e).includes(id))return null;return {title:'BMK bearbeiten',value:functionBmk(d,p,e,id),maxLength:200,reset:'Automatisches BMK',hint:bmkOwner(d,e,id)?'Ändert das BMK des zugeordneten Schützes und aller seiner Kontakte. Leer = automatisch.':'Leer lassen für Blattnummer und Strompfad.'};}
 if(key.startsWith('field:')){const field=key.slice(6);if(!['text','tag','value'].includes(field))return null;return {title:field==='tag'?'Kennzeichen bearbeiten':field==='value'?'Wert / Typ bearbeiten':'Text bearbeiten',value:e[field]||'',maxLength:field==='text'?2000:200};}
 const text=e.template?.details?.texts.find(t=>t.key===key);
 return text?{title:'Vorlagentext bearbeiten',value:e.textEdits?.[key]??text.text,maxLength:Object.values(e.functions||{}).some(f=>f.descriptionTextKey===key)?200:2000,reset:'Originaltext wiederherstellen'}:null;
}
export function applyDrawingText(d,p,e,key,value,{reset=false}={}){
 if(!drawingText(d,p,e,key)||typeof value!=='string'||value.length>(drawingText(d,p,e,key)?.maxLength||2000))throw Error('Ungültiger Text.');
 if(key.startsWith('bmk:')){let id=key.slice(4);const owner=bmkOwner(d,e,id);if(owner){e=owner.element;id=owner.key;}e.functions??={};e.functions[id]={...functionData(e,id),bmk:reset?'':value};}
 else if(key.startsWith('field:'))e[key.slice(6)]=value;
 else{e.textEdits??={};if(reset)delete e.textEdits[key];else e.textEdits[key]=value;for(const f of Object.values(e.functions||{}))if(f.descriptionTextKey===key)f.description=reset?e.template.details.texts.find(t=>t.key===key).text:value;}
}
