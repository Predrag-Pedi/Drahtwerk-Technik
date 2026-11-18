import {isCabinet,cabinetSiteConfig} from './cabinet-layout.mjs?v=20261118-3';
import {systemLayout,zoneFreeSmissline,smisslineRails,smisslineInputSpace,smisslineMount} from './system-layout.mjs?v=20261118-3';
export const isReserveMeter=d=>d.kind==='meter'&&/\bRes(?:erve)?(?:\b|\.)/i.test((d.name||'')+' '+(d.circuitName||''));
export function reserveMeters(devices,count,pageId){
 const present=devices.filter(isReserveMeter).length;
 return Array.from({length:Math.max(0,count-present)},(_,i)=>({kind:'meter',tag:'',name:'Reserve Zähler',circuitName:'Reserve',width:180,height:260,depth:120,include:true,source:{page:pageId,element:'dispo-reserve-meter-'+i,key:'$'}}));
}
// Dimensions are clear usable limits. Upright transport only; no assumption
// about tilting, turns or removal of components. Every frame adds its own 8 mm.
export function siteConfig(devices,c){
 if(isCabinet(c))return cabinetSiteConfig(devices,c);
 if(!c.autoSize)return c;
 const depth=Math.max(165,...devices.filter(d=>d.include!==false).map(d=>Number(d.depth)||0));
 if(c.maxDepth&&depth>c.maxDepth)throw Error('Benötigte Rahmentiefe überschreitet die maximale Einbautiefe.');
 if(c.passageDepth&&depth>c.passageDepth)throw Error('Benötigte Tiefe überschreitet die maximale Transporttiefe.');
 const active=devices.filter(d=>d.include!==false),compact=zoneFreeSmissline(active);
 c={...c,depth};
 if(!(c.maxWidth>=258&&c.maxHeight>=400))throw Error('Maximale Einbaubreite und Einbauhöhe eingeben.');
 const maxH=Math.min(c.maxHeight,c.passageHeight||c.maxHeight),maxW=Math.min(c.maxWidth,c.passageWidth||c.maxWidth),perField=Math.floor((maxW-8)/250);
 if(!perField)throw Error('Durchgang zu schmal: Ein 250er-Feld benötigt mindestens 258 mm Breite.');
 if(maxH<400)throw Error('Einbau- oder Durchgangshöhe zu klein.');
 const conventional=c.buildSystem==='standard'&&active.some(d=>d.kind==='switch')&&active.some(d=>d.incoming)&&!active.some(d=>['meter','fuse','rse-fuse'].includes(d.kind)||d.measurementOwner);
 const heights=[...new Set([1,2,3,4,5,6,7,8].map(n=>(compact?20:c.topHeight)+(!compact&&!conventional&&devices.some(d=>d.kind==='fuse'||d.incoming)?c.fuseHeight:0)+20+n*400).filter(h=>h<=maxH).concat(maxH,compact?smisslineRails.map(r=>r.length+2*smisslineMount.edge+smisslineMount.stop+smisslineInputSpace(active)).filter(h=>h<=maxH&&h>=400):[]))].sort((a,b)=>a-b);
 // Prefer a slightly larger local circuit arrangement over cross-field wiring.
 for(const custom of [false,true])for(const [local,upper] of [[true,true],[true,false],[false,true],[false,false]])for(let fields=1;fields<=Math.min(12,Math.floor(c.maxWidth/258));fields++){
  const maxCols=Math.min(fields*perField,Math.floor((c.maxWidth-fields*8)/250));
  const sizes=[];for(let cols=fields;cols<=maxCols;cols++)for(const height of heights)sizes.push([cols,height]);if(conventional)sizes.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  for(const [cols,height] of sizes){
   if(custom&&cols!==fields)continue;
   const customTotal=Math.min(c.maxWidth,fields*maxW);
   const balanced=Array.from({length:fields},(_,i)=>Math.floor(cols/fields)+(i<cols%fields?1:0));
   // Balanced first, with a wider leading field when needed for incoming gear.
   const options=[balanced,[...balanced].reverse()];let remaining=cols;const wide=[];for(let i=0;i<fields;i++){const n=Math.min(perField,remaining-(fields-i-1));wide.push(n);remaining-=n;}options.push(wide,[...wide].reverse());
   for(const cells of options){if(devices.filter(d=>d.kind==='meter').length>cols*Math.min(3,Math.floor((height-c.topHeight-20)/400)))continue;if(Math.max(...cells)>perField)continue;const fieldWidths=custom?Array.from({length:fields},(_,i)=>i===fields-1?customTotal-Math.floor(customTotal/fields)*(fields-1):Math.floor(customTotal/fields)):cells.map(n=>n*250+8);if(custom&&fieldWidths.every(w=>(w-8)%250===0))continue;const candidate={...c,...(conventional?{plateWidth:Math.min(750,Math.ceil((Math.max(...fieldWidths)-8)/250)*250),bridgeMode:c.bridgeMode==='auto'?'remove':c.bridgeMode}:{}),_preferLocal:local,_upperDevices:upper,construction:'drahtwerk',width:fieldWidths.reduce((a,b)=>a+b,0),height,fields,fieldWidths};
    try{const layout=systemLayout(devices,candidate);if(!layout.overflow.length){
     if(compact){const rails=layout.parts.filter(p=>p.profile==='smissline');if(rails.length){const height=Math.max(400,...rails.map(r=>r.y+r.height+smisslineMount.edge+smisslineMount.stop),...layout.placed.map(d=>d.y+d.height+20)),tight={...candidate,height};if(!systemLayout(devices,tight).overflow.length)return tight;}}
     return candidate;
    }}catch{}
   }
  }
 }
 throw Object.assign(Error('Kein passender Aufbau innerhalb der Einbau- und Durchgangsmasse. Masse, Reserveplätze oder Geräteaufteilung prüfen; die Grenzen wurden nicht überschritten.'),{code:'DISPO_CAPACITY'});
}
