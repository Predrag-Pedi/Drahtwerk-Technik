import {pathAt,localPoint} from './geometry.mjs?v=20261113-22';
import {templateLabels,templateSize} from './template.mjs?v=20261113-22';
export function functionKeys(e){return e.template?[...new Set((e.template.labels||[]).map(l=>l.key))]:['$'];}
export function functionData(e,key='$'){
 const stored=e.functions?.[key]||{};
 let role=e.kind==='coil'?'coil':e.kind==='contact'?'contact':'none';
 if(e.template&&/kontakt/i.test(e.template.group))role='contact';
 const contactType=e.template&&/öffner/i.test(e.template.name)?'NC':e.template&&/wechsler/i.test(e.template.name)?'CO':'NO';return {role,contactType,terminals:contactType==='NC'?'21–22':contactType==='CO'?'11–12–14':'13–14',autoBmk:true,...stored};
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
export function assignContact(doc,contact,owner){
 if(contact.data.role!=='contact'||owner&&owner.data.role!=='coil')throw Error('Kontakt und Schützspule auswählen.');
 contact.element.functions??={};const value={...(contact.element.functions[contact.key]||{}),role:'contact'};if(owner)value.owner={page:owner.page.id,element:owner.element.id,key:owner.key};else delete value.owner;contact.element.functions[contact.key]=value;
}
export function validateFunctions(raw,keys,fail){if(raw===undefined)return undefined;if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>3000)fail();const result={};const str=(v,max=200)=>typeof v==='string'&&v.length<=max?v:fail();
 for(const [key,f] of Object.entries(raw)){if(!keys.includes(key)||!f||!['none','coil','contact'].includes(f.role))fail();const item={role:f.role};for(const [key,values]of [['manufacturer',['auto','schneider','hager']],['lsMode',['allpole','individual']]])if(f[key]!==undefined){if(!values.includes(f[key]))fail();item[key]=f[key];}for(const name of ['description','circuitName','bmk','terminals','referenceOverride','mirrorReferenceOverride'])if(f[name]!==undefined)item[name]=str(f[name]);if(f.contactType!==undefined){if(!['NO','NC','CO'].includes(f.contactType))fail();item.contactType=f.contactType;}if(f.autoBmk!==undefined)item.autoBmk=f.autoBmk===true;if(f.owner!==undefined)item.owner={page:str(f.owner.page,100),element:str(f.owner.element,100),key:str(f.owner.key)};for(const name of ['mirrorX','mirrorY'])if(f[name]!==undefined){if(!Number.isFinite(f[name])||Math.abs(f[name])>3000)fail();item[name]=f[name];}result[key]=item;}return result;
}

export function hasLsSettings(e,key='$'){return ['ls','fils'].includes(e.kind)||Boolean(e.template?.labels?.some(l=>l.key===key&&l.letter==='F'));}

export function inspectorFunctionKey(e,preferred){const keys=functionKeys(e);return keys.includes(preferred)?preferred:e.template?.labels?.find(l=>l.letter==='P')?.key||keys.find(k=>functionData(e,k).description?.trim())||keys[0];}
