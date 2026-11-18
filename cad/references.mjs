import {protectionKind} from './circuit-data.mjs?v=20261118-1';
import {pathAt,localPoint} from './geometry.mjs?v=20261118-1';
import {templateLabels,templateSize} from './template.mjs?v=20261118-1';
export function functionKeys(e){return e.template?[...new Set((e.template.labels||[]).map(l=>l.key))]:['$'];}
export function functionData(e,key='$'){
 const stored=e.functions?.[key]||{};
 let role=e.kind==='coil'?'coil':e.kind==='contact'?'contact':'none';
 if(e.template&&/kontakt/i.test(e.template.group))role='contact';
 const contactType=e.template&&/öffner/i.test(e.template.name)?'NC':e.template&&/wechsler/i.test(e.template.name)?'CO':'NO';return {role,contactType,terminals:contactType==='NC'?'21–22':contactType==='CO'?'11–12–14':'13–14',autoBmk:true,...stored,...(stored.terminals?{terminals:terminalPins(stored.terminals).join('–')}:{} )};
}
export function functionPoint(e,p,key='$'){
 if(e.template){const l=e.template.labels?.find(l=>l.key===key),[w,h]=templateSize(e,p);return localPoint(e,w,h,l?l.anchor.x*w/e.template.viewWidth:w/2,l?l.anchor.y*h/e.template.viewHeight:h/2);}
 return {x:e.x+e.width/2,y:e.y+e.height/2};
}
export function referenceLocation(e,p,key='$'){return `${p.number}.${pathAt(functionPoint(e,p,key).x)}`;}
export function allFunctions(doc){return doc.pages.filter(p=>p.type==='schema').flatMap(page=>page.elements.flatMap(element=>functionKeys(element).map(key=>({page,element,key,data:functionData(element,key)}))));}
export function findFunction(doc,ref){if(!ref)return null;const page=doc.pages.find(p=>p.id===ref.page),element=page?.elements.find(e=>e.id===ref.element);return element&&functionKeys(element).includes(ref.key)?{page,element,key:ref.key,data:functionData(element,ref.key)}:null;}
export function functionBmk(doc,page,e,key='$'){
 const data=functionData(e,key);if(data.role==='contact'&&data.owner){const owner=findFunction(doc,data.owner);if(owner?.data.role==='coil')return ownBmk(owner.page,owner.element,owner.key);}
 return ownBmk(page,e,key);
}
function ownBmk(page,e,key){const data=functionData(e,key);if(data.bmk)return data.bmk;if(e.template)return templateLabels(e,page)[key]||key;if(data.role!=='none'&&data.autoBmk!==false){const path=pathAt(functionPoint(e,page,key).x),base=`${page.number}K${path}`;const peers=page.elements.filter(x=>!x.template&&functionData(x).role==='coil'&&pathAt(functionPoint(x,page,'$').x)===path),n=peers.findIndex(x=>x.id===e.id)+1;return n>1?`${base}.${n}`:base;}return e.tag;}
export function contactsFor(doc,page,e,key='$'){return allFunctions(doc).filter(f=>f.data.role==='contact'&&f.data.owner?.page===page.id&&f.data.owner.element===e.id&&f.data.owner.key===key).sort((a,b)=>a.page.number-b.page.number||functionPoint(a.element,a.page,a.key).x-functionPoint(b.element,b.page,b.key).x);}
const sameFunction=(a,b)=>a.page.id===b.page.id&&a.element.id===b.element.id&&a.key===b.key;
const terminalPins=value=>String(value||'').trim().toUpperCase().split(/[\s,;–—-]+/).filter(Boolean);
export function validateContactSlots(slots){
 if(!Array.isArray(slots)||slots.length>64)throw Error('Maximal 64 Kontakte konfigurieren.');
 const pins=new Set(),ids=new Set();
 return slots.map(s=>{if(!s||typeof s.id!=='string'||!s.id||s.id.length>100||ids.has(s.id)||!['NO','NC','CO'].includes(s.type)||typeof s.terminals!=='string'||s.terminals.length>80||typeof(s.description??'')!=='string'||(s.description||'').length>200)throw Error('Kontaktart, Anschlüsse und Bezeichnung prüfen.');
  const terminals=terminalPins(s.terminals);if(terminals.length!==(s.type==='CO'?3:2)||new Set(terminals).size!==terminals.length||terminals.some(pin=>pins.has(pin)))throw Error('Kontaktanschlüsse müssen eindeutig sein; zwei Anschlüsse pro Kontakt, drei beim Wechsler.');
  terminals.forEach(pin=>pins.add(pin));ids.add(s.id);return {id:s.id,type:s.type,terminals:terminals.join('–'),description:s.description||''};
 });
}
export function contactOccupancy(doc,owner){
 const assigned=contactsFor(doc,owner.page,owner.element,owner.key);
 return (owner.data.contactSlots||[]).map(slot=>({...slot,contacts:assigned.filter(c=>terminalPins(c.data.terminals).some(pin=>terminalPins(slot.terminals).includes(pin)))}));
}
export function checkContactAssignment(doc,contact,owner,data=contact.data){
 if(!owner||owner.data.role!=='coil')throw Error('Zugehörigen Schütz / Aktor auswählen.');
 const pins=terminalPins(data.terminals);if(pins.length!==(data.contactType==='CO'?3:2)||new Set(pins).size!==pins.length)throw Error('Kontaktanschlüsse prüfen.');
 const occupied=contactsFor(doc,owner.page,owner.element,owner.key).find(c=>!sameFunction(c,contact)&&terminalPins(c.data.terminals).some(pin=>pins.includes(pin)));
 if(occupied)throw Error(`Kontakt ${data.terminals} ist bereits auf Blatt/Pfad ${referenceLocation(occupied.element,occupied.page,occupied.key)} belegt.`);
 if(owner.data.contactSlots&&!owner.data.contactSlots.some(s=>s.type===data.contactType&&s.terminals===pins.join('–')))throw Error('Dieser Kontakt ist am Gerät nicht konfiguriert. Belegungsliste prüfen.');
}
export function configureContacts(doc,owner,slots){
 const next=validateContactSlots(slots),candidate={...owner,data:{...owner.data,contactSlots:next}};
 const contacts=contactsFor(doc,owner.page,owner.element,owner.key);
 for(const c of contacts)checkContactAssignment(doc,c,candidate);
 owner.element.functions??={};owner.element.functions[owner.key]={...functionData(owner.element,owner.key),contactSlots:next};
 for(const c of contacts){const slot=next.find(s=>s.terminals===c.data.terminals);c.element.functions[c.key]={...c.data,description:slot.description,terminals:slot.terminals};}
}
export function updateFunction(doc,contact,patch){
 const previous=functionData(contact.element,contact.key),data={...previous,...patch};
 if(!contact.element.template&&previous.contactType==='CO'&&(data.contactType!=='CO'||data.role!=='contact')&&contact.page.wires.some(w=>[w.from,w.to].some(r=>r?.element===contact.element.id&&r.index===2)))throw Error('Zuerst die Verbindung am dritten Wechsleranschluss lösen.');
 if(data.role!=='coil'){
  if(contactsFor(doc,contact.page,contact.element,contact.key).length)throw Error('Zuerst die zugeordneten Kontakte lösen.');
  delete data.contactSlots;
 }
 if(data.role!=='contact')delete data.owner;
 if(data.role==='contact')data.terminals=terminalPins(data.terminals).join('–');
 if(data.role==='contact'&&data.owner)checkContactAssignment(doc,contact,findFunction(doc,data.owner),data);
 contact.element.functions??={};contact.element.functions[contact.key]=data;
}
export function assignContact(doc,contact,owner,slotId){
 if(contact.data.role!=='contact'||owner&&owner.data.role!=='coil')throw Error('Kontakt und Schützspule auswählen.');
 const value={...functionData(contact.element,contact.key),role:'contact'};
 if(owner){
  if(slotId){const slot=owner.data.contactSlots?.find(s=>s.id===slotId);if(!slot)throw Error('Kontakt nicht mehr vorhanden.');Object.assign(value,{contactType:slot.type,terminals:slot.terminals,description:slot.description});}
  checkContactAssignment(doc,contact,owner,value);value.owner={page:owner.page.id,element:owner.element.id,key:owner.key};
 }else delete value.owner;
 contact.element.functions??={};contact.element.functions[contact.key]=value;
}
export function validateFunctions(raw,keys,fail){if(raw===undefined)return undefined;if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>3000)fail();const result={};const str=(v,max=200)=>typeof v==='string'&&v.length<=max?v:fail();
 for(const [key,f] of Object.entries(raw)){if(!keys.includes(key)||!f||!['none','coil','contact'].includes(f.role))fail();const item={role:f.role};if(f.contactSlots!==undefined){if(f.role!=='coil')fail();try{item.contactSlots=validateContactSlots(f.contactSlots);}catch{fail();}}for(const name of ['smisslineHK','smisslineNeutral'])if(f[name]!==undefined){if(typeof f[name]!=='boolean')fail();item[name]=f[name];}if(f.smisslineFeedCurrent!==undefined){if(!Number.isFinite(f.smisslineFeedCurrent)||f.smisslineFeedCurrent<0||f.smisslineFeedCurrent>1600)fail();item.smisslineFeedCurrent=f.smisslineFeedCurrent;}for(const [key,values]of [['fuseSystem',['conventional','silas60','vertigroup185']],['fuseSize',['auto','DII','DIII','NH000','NH00','NH1','NH2','NH3']],['breakerSystem',['conventional','smissline','uniway']],['manufacturer',['auto','schneider','hager']],['lsMode',['allpole','individual']]])if(f[key]!==undefined){if(!values.includes(f[key]))fail();item[key]=f[key];}for(const name of ['smisslineFeedFrom','description','circuitName','bmk','terminals','referenceOverride','mirrorReferenceOverride'])if(f[name]!==undefined)item[name]=str(f[name]);if(f.contactType!==undefined){if(!['NO','NC','CO'].includes(f.contactType))fail();item.contactType=f.contactType;}if(f.autoBmk!==undefined)item.autoBmk=f.autoBmk===true;if(f.owner!==undefined)item.owner={page:str(f.owner.page,100),element:str(f.owner.element,100),key:str(f.owner.key)};for(const name of ['mirrorX','mirrorY'])if(f[name]!==undefined){if(!Number.isFinite(f[name])||Math.abs(f[name])>3000)fail();item[name]=f[name];}result[key]=item;}return result;
}

export function hasLsSettings(e,key='$'){return ['ls','fils'].includes(protectionKind(e,key));}

export function inspectorFunctionKey(e,preferred){const keys=functionKeys(e);return keys.includes(preferred)?preferred:e.template?.labels?.find(l=>l.letter==='P')?.key||keys.find(k=>functionData(e,k).description?.trim())||keys[0];}
