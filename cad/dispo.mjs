import {DRAW} from './geometry.mjs?v=20261113-22';
import {frame,sourcePoint} from './alignment.mjs?v=20261113-22';
import {frameLayout} from './frame-layout.mjs?v=20261113-22';
import {deviceText,fuseRating,circuitName,circuitNames} from './circuit-data.mjs?v=20261113-22';
import {createElement,W} from './model.mjs?v=20261113-22';
import {allFunctions,functionBmk} from './references.mjs?v=20261113-22';
// Planning envelopes, deliberately not manufacturer-specific article dimensions.
const envelopes={ls:[18,90,75],fils:[36,90,75],fuse:[54,100,85],switch:[90,140,110],coil:[54,90,90],timer:[36,90,70],meter:[180,260,120],terminal:[8,60,45]};
export function schemaDevices(doc){
 const devices=[],warnings=[],seen=new Set();
 for(const {page,element:e,key,data} of allFunctions(doc)){
  if(data.role==='contact'){if(!data.owner)warnings.push(`Blatt ${page.number}: Kontakt ohne zugeordneten Schütz.`);continue;}
  if(['text','rect','dimension','junction','reference','cabinet','rail','duct','module'].includes(e.kind))continue;
  const tag=functionBmk(doc,page,e,key);
  // Only incoming supply blocks are carried over; outgoing X terminals stay in the schema.
  const isTerminal=e.kind==='terminal'||tag.match(/[A-Z]+/i)?.[0]?.toUpperCase()==='X';
  const isIncoming=isTerminal&&(/einspeis|zuleitung|hauptklemme/i.test(deviceText(e,key)+' '+(e.template?.name||'')+' '+(e.text||'')));
  if(isTerminal&&!isIncoming)continue;
  if(!tag){warnings.push(`Blatt ${page.number}: Gerät ohne BMK.`);continue;}
  if(seen.has(tag)){warnings.push(`${tag}: mehrfach vorhanden; einmal übernommen. BMK prüfen.`);continue;}seen.add(tag);
  let kind=data.role==='coil'?'coil':e.kind;
  if(kind==='template'){const letter=tag.match(/[A-Z]+/i)?.[0]?.toUpperCase();kind=({F:'fuse',Q:'switch',S:'switch',K:'coil',P:'meter',Y:'meter',X:'terminal'})[letter]||'unknown';}
  const content=deviceText(e,key);
  // Classify each function inside a mixed macro from its own labels. A residual
  // current (mA) denotes FI-LS even when the macro itself is named «Zähler».
  const residual=/\b\d+(?:[.,]\d+)?\s*mA\b/i.test(content),curve=/\b[BCD]\s*\d+|\d+\s*A\s*[/ ]*\s*[BCD]\b/i.test(content);
  const singleFuse=(e.template?.labels||[]).filter(l=>l.letter==='F').length===1;
  if(e.template&&kind==='fuse'&&(residual||curve||singleFuse&&/(?:^|_)LS(?:_|$)|FI.?LS/i.test(e.template.name)))kind=residual||/FI.?LS/i.test(content)||(singleFuse&&/FI.?LS/i.test(e.template.name))?'fils':'ls';
  const poles=/\b1\s+2\s+3\s+4\s+5\s+6\b/.test(content)?3:/\b1\s+2\s+N\s+N\b|\b1\s+N\b/.test(content)?1:undefined;
  const rating=kind==='fuse'?fuseRating(content):isIncoming?{current:fuseRating(content).current||Number(String(doc.ratedCurrent||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'))||null}:{};if(rating.conflict)warnings.push(`${tag}: widersprüchliche Sicherungsangabe.`);if(kind==='fuse'&&!rating.fuseType)warnings.push(`${tag}: DII/DIII oder Stromstärke fehlt.`);
  let [width,height,depth]=envelopes[kind]||[54,100,80];
  if(['ls','fils'].includes(kind)&&/3L|3P|3.pol/i.test(content+' '+(e.template?.name||'')))width=kind==='fils'?72:54;
  const incoming=isIncoming;
  if(circuitNames(doc,{page:page.id,element:e.id}).length>1)throw Error(`${tag}: mehrere Einspeisegruppen verbunden. Verbindungen im Schema trennen.`);
  const inputs=frame(e)?.inputs||[];const meterParent=e.template?.labels?.some(l=>l.letter==='P')?e:inputs.length?page.elements.find(parent=>parent.id!==e.id&&parent.template?.labels?.some(l=>l.letter==='P')&&inputs.every(i=>{const pt=sourcePoint(e,i.x,i.y);return frame(parent)?.lines.some(l=>{const a=sourcePoint(parent,l.x1,l.y1),b=sourcePoint(parent,l.x2,l.y2);return l.phase===i.phase&&Math.abs(a.x-b.x)<.01&&Math.abs(a.x-pt.x)<.1&&pt.y>=Math.min(a.y,b.y)-.1&&pt.y<=Math.max(a.y,b.y)+.1;});})):null;
  const phases=[...new Set((e.template?.ports?.length?e.template.ports:inputs).map((pt,i)=>e.autoPhases?.[i]||pt.phase).filter(v=>/^L[123]$/.test(v)))];
  const meterKey=meterParent?.template?.labels?.find(l=>l.letter==='P')?.key;
  const meterSource=kind==='fuse'&&meterKey?{page:page.id,element:meterParent.id,key:meterKey}:undefined;
  devices.push({meterSource,meterFed:kind==='fils'&&!!meterParent,phase:phases.length===1?phases[0]:'',supplyKey:meterParent?meterParent.id:'bus:'+page.id,manufacturer:data.manufacturer||'auto',lsMode:data.lsMode||'allpole',poles,neutral:/\bN\b/.test(content)||kind==='fuse'&&(e.template?.ports?.length?e.template.ports:inputs).some(pt=>pt.phase==='N'),schemaTemplateName:e.template?.name||'',...rating,incoming,meterState:'prepared',circuitName:data.circuitName||circuitName(doc,{page:page.id,element:e.id}),source:{page:page.id,element:e.id,key},tag,kind,name:e.template?`${key} · ${content||e.template.name.replaceAll('_',' ')}`:e.value||e.text||kind,width,height,depth,confirmed:false,include:true,pageNumber:page.number});
 }
 for(const p of doc.pages.filter(p=>p.type==='schema'))for(const e of p.elements)if(e.template&&!e.template.labels?.length)warnings.push(`Blatt ${p.number}: «${e.template.name}» ohne auswertbare Gerätekennzeichen.`);
 return {devices,warnings};
}
export const defaultConfig=()=>({width:1008,height:1520,depth:165,fields:1,frame:true,reserve:20,construction:'drahtwerk',plateWidth:500,topHeight:300,fuseHeight:400,meterState:'prepared',rearPanel:false,breakerManufacturer:'auto'});
export function validateDispoConfig(c){if(!c||![c.width,c.height,c.depth,c.fields,c.reserve].every(Number.isFinite)||c.width<300||c.width>10000||c.height<400||c.height>4000||c.depth<100||c.depth>1500||!Number.isInteger(c.fields)||c.fields<1||c.fields>12||c.reserve<0||c.reserve>60||c.width/c.fields<250)throw Error('Schrankmasse prüfen: Breite 300–10000, Höhe 400–4000, Tiefe 100–1500 mm; mindestens 250 mm je Feld.');if(c.fieldWidths!==undefined&&(!Array.isArray(c.fieldWidths)||c.fieldWidths.length!==c.fields||!c.fieldWidths.every(n=>Number.isFinite(n)&&n>=258)||Math.abs(c.fieldWidths.reduce((a,b)=>a+b,0)-c.width)>.01))throw Error('Feldbreiten müssen zur Anzahl Felder und Gesamtbreite passen.');return {...(c.fieldWidths?{fieldWidths:[...c.fieldWidths]}:{}),width:c.width,height:c.height,depth:c.depth,fields:c.fields,reserve:c.reserve,frame:!!c.frame,construction:c.construction==='drahtwerk'?'drahtwerk':'generic',plateWidth:[250,500,750].includes(c.plateWidth)?c.plateWidth:500,topHeight:Number.isFinite(c.topHeight)?Math.max(200,Math.min(500,c.topHeight)):300,fuseHeight:Number.isFinite(c.fuseHeight)?Math.max(200,Math.min(600,c.fuseHeight)):400,meterState:c.meterState==='installed'?'installed':'prepared',rearPanel:!!c.rearPanel,breakerManufacturer:['auto','hager','schneider'].includes(c.breakerManufacturer)?c.breakerManufacturer:'auto'};}
export function layoutDevices(devices,config){
 const c=validateDispoConfig(config),placed=[],overflow=[],rails=[],ducts=[],fieldWidth=c.width/c.fields;
 let field=0,y=100,x=60,rowHeight=0,row=false;
 const available=fieldWidth-120,usable=available*(1-c.reserve/100);
 function closeRow(){if(!row)return;rails.push({x:field*fieldWidth+45,y:y+rowHeight*.6,width:fieldWidth-90,height:35});ducts.push({x:field*fieldWidth+45,y:y+rowHeight+25,width:fieldWidth-90,height:40});y+=rowHeight+95;x=60;rowHeight=0;row=false;}
 for(const d of devices.filter(d=>d.include!==false).sort((a,b)=>(a.kind==='terminal'?0:1)-(b.kind==='terminal'?0:1))){
  if(![d.width,d.height,d.depth].every(n=>Number.isFinite(n)&&n>0&&n<=4000))throw Error(`${d.tag}: gültige Geräteabmessungen eingeben.`);
  if(d.width>usable||d.height>c.height-220||d.depth>c.depth-60){overflow.push(d);continue;}
  if(x-60+d.width>usable)closeRow();
  if(y+Math.max(rowHeight,d.height)>c.height-120){closeRow();field++;y=100;}
  if(field>=c.fields){overflow.push(d);continue;}
  placed.push({...d,x:field*fieldWidth+x,y});x+=d.width;rowHeight=Math.max(rowHeight,d.height);row=true;
 }
 closeRow();return {placed,overflow,rails,ducts};
}
export function planDispo(devices,c){return c.construction==='drahtwerk'?frameLayout(devices,validateDispoConfig(c)):layoutDevices(devices,c);}
export function generateDispo(p,devices,config){
 const c=validateDispoConfig(config),layout=planDispo(devices,c);if(layout.overflow.length)throw Error(`Kein Platz für ${layout.overflow.map(d=>d.tag).join(', ')}. Schrank vergrössern, Felder ergänzen oder Geräteauswahl anpassen.`);
 const required=Math.max(c.width/350,c.height/225),scale=p.elements.some(e=>!e.generatedDispo)?p.scale:([1,2,5,10,20,50,100].find(s=>s>=required)||100),factor=W/420/scale,origin={x:(DRAW.left+DRAW.right-c.width*factor)/2,y:(DRAW.top+DRAW.bottom-c.height*factor)/2};
 const elements=[];
 const add=(kind,x,y,width,height,extra={})=>{const e=createElement(p,kind,0,0);Object.assign(e,{x:origin.x+x*factor,y:origin.y+y*factor,width,height,generatedDispo:true,...extra});elements.push(e);return e;};
 add('cabinet',0,0,c.width,c.height,{depth:c.depth,text:'',dispoFrame:c.frame,frameStyle:c.construction});
 if(c.construction==='drahtwerk'){for(const r of layout.parts){const {kind,x,y,width,height,...extra}=r;add(kind,x,y,width,height,extra);}for(const d of layout.placed)add('module',d.x,d.y,d.width,d.height,{tag:d.tag,text:d.kind==='meter'?'kWh':'',depth:d.depth,phase:d.phase||'',manufacturer:d.manufacturer||'auto',lsMode:d.lsMode||'allpole',mountZ:d.mountZ??-100,frameStyle:d.frameStyle||'',dispoSource:d.source,dispoKind:d.kind,dimensionsConfirmed:d.confirmed,fuseType:d.fuseType||'',current:d.current??0,circuitName:d.circuitName||'',meterState:d.meterState||c.meterState,incoming:!!d.incoming,neutral:!!d.neutral,...(d.meterSource?{meterSource:d.meterSource}:{})});return {elements,scale,config:c};}
 for(let f=0;f<c.fields;f++){
  add('duct',f*c.width/c.fields+15,60,25,c.height-120,{depth:60});
  add('duct',(f+1)*c.width/c.fields-40,60,25,c.height-120,{depth:60});
 }
 for(const r of layout.rails)add('rail',r.x,r.y,r.width,r.height,{depth:15});
 for(const r of layout.ducts)add('duct',r.x,r.y,r.width,r.height,{depth:40});
 for(const d of layout.placed)add('module',d.x,d.y,d.width,d.height,{tag:d.tag,text:d.kind==='unknown'?'?':d.kind==='meter'?'kWh':'',value:'',depth:d.depth,dispoSource:d.source,dispoKind:d.kind,dimensionsConfirmed:d.confirmed});
 return {elements,scale,config:c};
}
export function validateDispoMetadata(e,fail){const out={};if(e.dispoStructure!==undefined){if(!Array.isArray(e.dispoStructure)||e.dispoStructure.length>5000)fail();out.dispoStructure=e.dispoStructure.map(p=>{if(!p||!['rail','plate','duct'].includes(p.kind)||!['x','y','width','height'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=20000)||p.width<=0||p.height<=0)fail();return {kind:p.kind,x:p.x,y:p.y,width:p.width,height:p.height,...validateDispoMetadata(Object.fromEntries(['profile','plateType','frameStyle','mountZ','depth'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])),fail)};});}for(const k of ['phase','manufacturer','lsMode','profile','plateType','frameStyle','fuseType','circuitName','dispoGeometryKind','meterState'])if(e[k]!==undefined){if(typeof e[k]!=='string'||e[k].length>200)fail();out[k]=e[k];}for(const k of ['mountZ','current'])if(e[k]!==undefined){if(!Number.isFinite(e[k])||Math.abs(e[k])>4000)fail();out[k]=e[k];}if(e.neutral!==undefined)out.neutral=!!e.neutral;if(e.meterSource){out.meterSource={};for(const k of ['page','element','key']){if(typeof e.meterSource[k]!=='string'||e.meterSource[k].length>200)fail();out.meterSource[k]=e.meterSource[k];}}if(e.incoming!==undefined)out.incoming=!!e.incoming;if(e.generatedDispo!==undefined)out.generatedDispo=e.generatedDispo===true;if(e.dispoFrame!==undefined)out.dispoFrame=e.dispoFrame===true;if(e.depth!==undefined){if(!Number.isFinite(e.depth)||e.depth<=0||e.depth>4000)fail();out.depth=e.depth;}if(e.dimensionsConfirmed!==undefined)out.dimensionsConfirmed=e.dimensionsConfirmed===true;if(e.dispoKind!==undefined){if(typeof e.dispoKind!=='string'||e.dispoKind.length>40)fail();out.dispoKind=e.dispoKind;}if(e.dispoSource){out.dispoSource={};for(const k of ['page','element','key']){if(typeof e.dispoSource[k]!=='string'||e.dispoSource[k].length>200)fail();out.dispoSource[k]=e.dispoSource[k];}}return out;}

export function drahtwerkDemo(d){
 const p=d.pages.find(p=>p.type==='schema');p.title='Zählergruppen';
 for(const [i,name] of ['Allgemein','E-Mobility','Wohnung 1'].entries()){
  const meter=createElement(p,'meter',180+i*300,260);meter.text=name;meter.circuitName=name;p.elements.push(meter);
  const fuse=createElement(p,'fuse',180+i*300,130);fuse.value=i===1?'DIII 63 A':'DII 25 A';p.elements.push(fuse);
  p.wires.push({id:crypto.randomUUID(),points:[{x:fuse.x+20,y:190},{x:meter.x+20,y:260}],from:{element:fuse.id,index:1},to:{element:meter.id,index:0},label:'',dashed:false});
  for(let n=0;n<4;n++){const e=createElement(p,'ls',180+i*300+n*45,500);e.value='C13 A';e.circuitName=name;p.elements.push(e);}
 }
 const q=d.pages.find(p=>p.type==='dispo'),g=generateDispo(q,schemaDevices(d).devices,defaultConfig());Object.assign(q,{title:'Drahtwerk · Selbstbaurahmen',elements:g.elements,scale:g.scale,dispoConfig:g.config,grid:false});return d;
}
