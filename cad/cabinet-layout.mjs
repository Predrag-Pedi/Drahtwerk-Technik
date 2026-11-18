import {fieldLayout} from './field-layout.mjs?v=20261118-3';
import {systemLayout} from './system-layout.mjs?v=20261118-3';
// Public Almatec configurator, checked 2026-11-16. Custom reference cabinets
// are not silently promoted to catalogue sizes. All dimensions are outer mm.
export const anWidths=[400,500,600,700,750,800,850,900,1000,1100,1150,1200,1300,1400,1500,1550,1600,1700,1800,1900,2000];
export const anDepths=[300,350,400,450,500,600,700,800,900,1000];
export const isCabinet=c=>['standing','wall'].includes(c.distributionType);
// Deliberately conservative PLANNING margins, not manufacturer machining data.
// Existing 250 mm mounting plates need a separate usable installation envelope.
export const cabinetMargin=60;
export const cabinetVerticalMargin=80;
export const meterDoorClearance=190;
const requiredDepth=ds=>Math.max(165,...ds.map(d=>d.depth||0))+(ds.some(d=>d.kind==='meter')?meterDoorClearance+20:50);
function checkStandingHeight(c){
 if(c.distributionType!=='standing'||!c.autoSize)return;
 const height=2000+(c.plinthHeight||0),limit=Math.min(c.maxHeight||Infinity,c.passageHeight||Infinity);
 if(height>limit)throw Object.assign(Error(`AN-Standschrank: 2000 mm Korpus + ${c.plinthHeight||0} mm Sockel = ${height} mm Gesamthöhe. Erlaubt sind ${limit} mm (${c.passageHeight&&c.passageHeight<c.maxHeight?'Durchgang':'Einbauhöhe'}). ${limit>=2000?'Ohne Sockel ist die Höhe möglich. Unter «Varianten vergleichen» den vollständigen Aufbau prüfen.':'Einbau- und Durchgangshöhe prüfen.'}`),{code:'DISPO_CABINET_HEIGHT'});
}
export function checkCabinet(c){
 if(c.distributionType==='wall')throw Error('Wandschränke sind bis zur Vermessung zurückgestellt.');
 checkStandingHeight(c);
 const widths=c.fieldWidths||Array(c.fields).fill(c.width/c.fields);
 if(c.distributionType==='standing'){
  if(c.height!==2000+(c.plinthHeight||0)||!anDepths.includes(c.depth)||widths.some(w=>!anWidths.includes(w))||c.fields>10)throw Error('AN: Korpus 2000 mm, Sockel 0/100/200 mm und Katalogbreiten/-tiefen verwenden.');
 }else if(c.distributionType==='wall'){
  if(c.height<400||c.height>2000||c.depth!==230||widths.some(w=>w<400||w>2000))throw Error('AP/UP: Breite und Höhe 400–2000 mm, Tiefe 230 mm.');
 }
 for(const [actual,limit,label] of [[c.width,c.maxWidth,'Einbaubreite'],[c.height,c.maxHeight,'Einbauhöhe'],[c.depth,c.maxDepth,'Einbautiefe'],[Math.max(...widths),c.passageWidth,'Durchgangsbreite'],[c.height,c.passageHeight,'Durchgangshöhe'],[c.depth,c.passageDepth,'Transporttiefe']])if(c.autoSize&&limit&&actual>limit)throw Error(`Schrank überschreitet ${label}.`);
}
export function cabinetLayout(devices,c){
 checkCabinet(c);
 const single=(ds,cfg)=>{
  const bodyHeight=cfg.height-(cfg.distributionType==='standing'?cfg.plinthHeight||0:0),innerWidth=Math.floor((cfg.width-2*cabinetMargin-8)/250)*250+8;
  if(innerWidth<258||cfg.depth<requiredDepth(ds))return {parts:[],placed:[],overflow:ds.length?ds:[{tag:'Innenraum'}]};
  const l=systemLayout(ds,{...cfg,distributionType:'sbr',width:innerWidth,height:bodyHeight-2*cabinetVerticalMargin,depth:cfg.depth-50,fields:1,fieldWidths:undefined});
  const dx=(cfg.width-innerWidth)/2,dy=cabinetVerticalMargin;
  return {...l,parts:l.parts.map(p=>({...p,x:p.x+dx,y:p.y+dy})),placed:l.placed.map(d=>({...d,x:d.x+dx,y:d.y+dy}))};
 };
 return c.fields>1?fieldLayout(devices,c,single):single(devices,c);
}
export function cabinetSiteConfig(devices,c){
 if(c.distributionType==='wall')throw Error('Wandschränke sind bis zur Vermessung zurückgestellt.');
 if(!c.autoSize){checkCabinet(c);return c;}
 if(!c.maxWidth||!c.maxHeight)throw Error('Maximale Einbaubreite und Einbauhöhe eingeben.');
 checkStandingHeight(c);
 const standing=c.distributionType==='standing',maxH=Math.min(c.maxHeight,c.passageHeight||Infinity),maxW=Math.min(c.maxWidth,c.passageWidth||Infinity),maxD=Math.min(c.maxDepth||Infinity,c.passageDepth||Infinity),neededDepth=requiredDepth(devices);
 const depth=standing?anDepths.find(d=>d>=neededDepth&&d<=maxD):230;
 const heights=standing?[2000+(c.plinthHeight||0)]:Array.from({length:33},(_,i)=>400+i*50).concat(Math.min(2000,maxH)).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
 const widths=(standing?anWidths:Array.from({length:33},(_,i)=>400+i*50).concat(Math.min(2000,maxW))).filter(w=>w<=maxW);
 if(!depth||depth>maxD||depth<neededDepth||!widths.length||!heights.some(h=>h<=maxH))throw Error('Kein Katalogschrank erfüllt Einbau-, Durchgangs- und Tiefenmasse. AN benötigt 2000 mm Korpus; AP/UP ist 230 mm tief.');
 // Increasing total outer width. Balanced fields first, then unequal pairs.
 for(let fields=1;fields<=Math.min(standing?10:12,Math.floor(c.maxWidth/400));fields++){
  const combinations=[];
  for(const w of widths){if(w*fields<=c.maxWidth)combinations.push(Array(fields).fill(w));if(fields===2)for(const b of widths)if(b!==w&&w+b<=c.maxWidth)combinations.push([w,b]);}
  combinations.sort((a,b)=>a.reduce((s,n)=>s+n,0)-b.reduce((s,n)=>s+n,0)||Math.max(...a)-Math.max(...b));
  for(const ws of combinations)for(const height of heights.filter(h=>h<=maxH)){
   const candidate={...c,construction:'drahtwerk',width:ws.reduce((s,w)=>s+w,0),fieldWidths:ws,fields,height,depth};
   try{if(!cabinetLayout(devices,candidate).overflow.length)return candidate;}catch(error){if(!/Zähler.*passen|Rahmen zu klein|Kein Platz/.test(error.message))throw error;}
  }
 }
 throw Object.assign(Error('Kein passender Schrankaufbau innerhalb der Einbau- und Durchgangsmasse. Reserve oder Masse prüfen.'),{code:'DISPO_CAPACITY'});
}
