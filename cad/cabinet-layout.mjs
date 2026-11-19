import {fieldLayout} from './field-layout.mjs?v=20261119-7';
import {systemLayout} from './system-layout.mjs?v=20261119-7';
import {anBodyWidths,anDepths,fieldExtra,cabinetField} from './cabinet-options.mjs?v=20261119-7';
export {anDepths};
// Default outer widths include two 25 mm standard side walls.
export const anWidths=anBodyWidths.map(w=>w+50);
export const isCabinet=c=>['standing','wall'].includes(c.distributionType);
// Deliberately conservative PLANNING margins, not manufacturer machining data.
// Existing 250 mm mounting plates need a separate usable installation envelope.
export const cabinetMargin=60;
export const cabinetVerticalMargin=80;
// UV1 reference: 800 mm enclosure with three 250 mm apparatus columns.
// The 20 mm side allowance applies to this conventional, meter-free interior;
// it is a planning envelope, not a universal manufacturer mounting dimension.
export const conventionalCabinet= (ds,c)=>c.buildSystem==='standard'&&ds.some(d=>d.kind==='switch')&&ds.some(d=>d.incoming)&&!ds.some(d=>['meter','fuse','rse-fuse'].includes(d.kind)||d.measurementOwner||d.breakerSystem==='smissline'||d.frameStyle?.startsWith('transfer-')||d.source?.element==='incoming-supply');
export const meterDoorClearance=190;
const requiredDepth=ds=>Math.max(165,...ds.map(d=>d.depth||0))+(ds.some(d=>d.kind==='meter')?meterDoorClearance+20:50);
function checkStandingHeight(c){
 if(c.distributionType!=='standing'||c.cabinetMode==='custom'||!c.autoSize)return;
 const height=2000+(c.plinthHeight||0),limit=Math.min(c.maxHeight||Infinity,c.passageHeight||Infinity);
 if(height>limit)throw Object.assign(Error(`AN-Standschrank: 2000 mm Korpus + ${c.plinthHeight||0} mm Sockel = ${height} mm Gesamthöhe. Erlaubt sind ${limit} mm (${c.passageHeight&&c.passageHeight<c.maxHeight?'Durchgang':'Einbauhöhe'}). ${limit>=2000?'Ohne Sockel ist die Höhe möglich. Unter «Varianten vergleichen» den vollständigen Aufbau prüfen.':'Einbau- und Durchgangshöhe prüfen.'}`),{code:'DISPO_CABINET_HEIGHT'});
}
export function checkCabinet(c){
 if(c.distributionType==='wall')throw Error('Wandschränke sind bis zur Vermessung zurückgestellt.');
 checkStandingHeight(c);
 const widths=c.fieldWidths||Array(c.fields).fill(c.width/c.fields);
 if(c.distributionType==='standing'&&c.cabinetMode!=='custom'){
  if(c.height!==2000+(c.plinthHeight||0)||!anDepths.includes(c.depth)||widths.some((w,i)=>!anBodyWidths.includes(w-fieldExtra(c.cabinetOptions,i,c.fields)))||c.fields>10)throw Error('AN-Standard: 2000 mm Korpus, Katalogbreiten zuzüglich Seitenwände und Katalogtiefen verwenden. Für freie Masse Individualschrank wählen.');
 }else if(c.distributionType==='wall'){
  if(c.height<400||c.height>2000||c.depth!==230||widths.some(w=>w<400||w>2000))throw Error('AP/UP: Breite und Höhe 400–2000 mm, Tiefe 230 mm.');
 }
 if(c.distributionType==='standing'&&(c.fields>10||c.height-(c.plinthHeight||0)<400||widths.some(w=>w<400||w>3000)))throw Error('Standschrank: 1–10 Felder, je 400–3000 mm breit; Korpus mindestens 400 mm.');
 for(const [actual,limit,label] of [[c.width,c.maxWidth,'Einbaubreite'],[c.height,c.maxHeight,'Einbauhöhe'],[c.depth,c.maxDepth,'Einbautiefe'],[Math.max(...widths),c.passageWidth,'Durchgangsbreite'],[c.height,c.passageHeight,'Durchgangshöhe'],[c.depth,c.passageDepth,'Transporttiefe']])if(c.autoSize&&limit&&actual>limit)throw Error(`Schrank überschreitet ${label}.`);
}
export function cabinetLayout(devices,c){
 checkCabinet(c);
 const single=(ds,cfg)=>{
  const conventional=conventionalCabinet(ds,cfg),margin=conventional?20:cabinetMargin;
  const bodyHeight=cfg.height-(cfg.distributionType==='standing'?cfg.plinthHeight||0:0),innerWidth=Math.floor((cfg.width-2*margin-8)/250)*250+8;
  if(innerWidth<258||cfg.depth<requiredDepth(ds))return {parts:[],placed:[],overflow:ds.length?ds:[{tag:'Innenraum'}]};
  const l=systemLayout(ds,{...cfg,distributionType:'sbr',width:innerWidth,height:bodyHeight-2*cabinetVerticalMargin,depth:cfg.depth-50,fields:1,fieldWidths:undefined,...(conventional?{_cabinetConventional:true,topHeight:(cfg.cabinetMode==='custom'&&cfg.cabinetSizing!=='fixed'?(cfg.cabinetAutoTopHeight??cfg.cabinetTopHeight??800):(cfg.cabinetTopHeight??800))+200,plateWidth:250,bridgeMode:'keep',cutCenterBridge:false}:{})});
  const dx=(cfg.width-innerWidth)/2,dy=cabinetVerticalMargin;
  return {...l,parts:l.parts.map(p=>({...p,x:p.x+dx,y:p.y+dy})),placed:l.placed.map(d=>({...d,x:d.x+dx,y:d.y+dy}))};
 };
 const result=c.fields>1?fieldLayout(devices,c,single):single(devices,c);
 let offset=0;for(const [i,width]of (c.fieldWidths||Array(c.fields).fill(c.width/c.fields)).entries()){
  const field=cabinetField(c.cabinetOptions,i),body=c.height-(c.plinthHeight||0);
  for(const shelf of field.shelves){const y=body-shelf;if(shelf>body-80||result.placed.some(d=>d.x+d.width>offset+25&&d.x<offset+width-25&&d.y+d.height>y-10&&d.y<y+10)||result.parts.some(p=>p.kind==='duct'&&p.x+p.width>offset+25&&p.x<offset+width-25&&p.y+p.height>y&&p.y<y+3))throw Error(`Feld ${i+1}: Tablar bei ${shelf} mm kollidiert mit dem Innenaufbau oder liegt ausserhalb des Korpus.`);}
  offset+=width;
 }
 return result;
}
export function cabinetSiteConfig(devices,c){
 if(c.distributionType==='wall')throw Error('Wandschränke sind bis zur Vermessung zurückgestellt.');
 if(!c.autoSize||c.cabinetSizing==='fixed'){checkCabinet(c);return c;}
 if(!c.maxWidth||!c.maxHeight)throw Error('Maximale Einbaubreite und Einbauhöhe eingeben.');
 if(c.cabinetMode==='custom')return customCabinetSiteConfig(devices,c);
 checkStandingHeight(c);
 const standing=c.distributionType==='standing',maxH=Math.min(c.maxHeight,c.passageHeight||Infinity),maxW=Math.min(c.maxWidth,c.passageWidth||Infinity),maxD=Math.min(c.maxDepth||Infinity,c.passageDepth||Infinity),neededDepth=requiredDepth(devices);
 const depth=standing?anDepths.find(d=>d>=neededDepth&&d<=maxD):230;
 const heights=standing?[2000+(c.plinthHeight||0)]:Array.from({length:33},(_,i)=>400+i*50).concat(Math.min(2000,maxH)).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
 const widths=(standing?anBodyWidths:Array.from({length:33},(_,i)=>400+i*50).concat(Math.min(2000,maxW))).filter(w=>w<=maxW);
 if(!depth||depth>maxD||depth<neededDepth||!widths.length||!heights.some(h=>h<=maxH))throw Error('Kein Katalogschrank erfüllt Einbau-, Durchgangs- und Tiefenmasse. AN benötigt 2000 mm Korpus; AP/UP ist 230 mm tief.');
 // Increasing total outer width. Balanced fields first, then unequal pairs.
 for(let fields=c.cabinetFieldCount||1;fields<=(c.cabinetFieldCount||Math.min(standing?10:12,Math.floor(c.maxWidth/400)));fields++){
  const combinations=[];const append=ws=>{const outer=ws.map((w,i)=>w+(standing?fieldExtra(c.cabinetOptions,i,fields):0));if(outer.reduce((a,b)=>a+b,0)<=c.maxWidth&&outer.every(w=>w<=maxW))combinations.push(outer);};
  for(const w of widths){append(Array(fields).fill(w));if(fields===2)for(const b of widths)if(b!==w)append([w,b]);}
  // Prefer three apparatus columns in a full-height conventional cabinet when
  // the installation permits it. Narrower cabinets remain available at tighter
  // site limits, rather than stretching a small two-column build over 2 metres.
  const preferred=standing&&conventionalCabinet(devices,c)&&maxW>=800?800:0;
  combinations.sort((a,b)=>Number(a.some(w=>w<preferred))-Number(b.some(w=>w<preferred))||a.reduce((s,n)=>s+n,0)-b.reduce((s,n)=>s+n,0)||Math.max(...a)-Math.max(...b));
  for(const ws of combinations)for(const height of heights.filter(h=>h<=maxH)){
   const candidate={...c,construction:'drahtwerk',width:ws.reduce((s,w)=>s+w,0),fieldWidths:ws,fields,height,depth};
   try{if(!cabinetLayout(devices,candidate).overflow.length)return candidate;}catch(error){if(!/Zähler.*passen|Rahmen zu klein|Kein Platz|Tablar/.test(error.message))throw error;}
  }
 }
 throw Object.assign(Error('Kein passender Schrankaufbau innerhalb der Einbau- und Durchgangsmasse. Reserve oder Masse prüfen.'),{code:'DISPO_CAPACITY'});
}

// Free-size planning search: retain the requested reserve, use the site ceiling
// including its exact (non-grid) limit, then reduce height without changing width.
function customCabinetSiteConfig(devices,c){
 const maxH=Math.min(4000,c.maxHeight,c.passageHeight||Infinity),maxW=Math.min(3000,c.maxWidth,c.passageWidth||Infinity),maxD=Math.min(1500,c.maxDepth||Infinity,c.passageDepth||Infinity),depth=Math.ceil(requiredDepth(devices)/10)*10;
 if(depth>maxD||maxW<400||maxH-(c.plinthHeight||0)<400)throw Object.assign(Error('Individualschrank: Einbau- oder Durchgangsmasse reichen nicht aus.'),{code:'DISPO_CAPACITY'});
 // Layout capacity changes only at a 250 mm inner-column boundary.
 const widths=[...new Set([400,Math.floor(maxW),...[20,60].flatMap(m=>Array.from({length:12},(_,i)=>Math.ceil(((i+1)*250+8+2*m)/25)*25))])].filter(w=>w>=400&&w<=maxW).sort((a,b)=>a-b);
 const heights=[...new Set([Math.floor(maxH),...Array.from({length:Math.max(0,Math.floor((maxH-600)/25)+1)},(_,i)=>600+i*25)])].sort((a,b)=>a-b);
 const conventional=conventionalCabinet(devices,c);
 for(let fields=c.cabinetFieldCount||1;fields<=(c.cabinetFieldCount||Math.min(10,Math.floor(c.maxWidth/400)));fields++){
  // Prefer a low, useful cabinet: search height first, then increasing width.
  for(const height of heights)for(const w of widths){if(w*fields>c.maxWidth)continue;
   const candidate={...c,construction:'drahtwerk',fields,fieldWidths:Array(fields).fill(w),width:w*fields,height,depth};
   // A shorter connection room is only used in the explicitly automatic custom
   // mode; never alter the user's conventional room height in fixed dimensions.
   if(conventional)candidate.cabinetAutoTopHeight=Math.max(400,Math.min(c.cabinetTopHeight??800,height-(c.plinthHeight||0)-780));
   try{if(!cabinetLayout(devices,candidate).overflow.length)return candidate;}catch(error){if(!/Zähler.*passen|Rahmen zu klein|Kein Platz|Tablar/.test(error.message))throw error;}
  }
 }
 throw Object.assign(Error('Kein Individualschrank mit vollständiger Bestückung und Reserve innerhalb der Einbau- und Durchgangsmasse.'),{code:'DISPO_CAPACITY'});
}
