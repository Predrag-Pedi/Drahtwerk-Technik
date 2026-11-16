import {isCabinet,cabinetLayout} from './cabinet-layout.mjs?v=20261116-10';
import {systemLayout} from './system-layout.mjs?v=20261116-10';
import {isRse,groupRseFuses} from './rse.mjs?v=20261116-10';
import {measurementGroups} from './metering.mjs?v=20261116-10';
import {DRAW} from './geometry.mjs?v=20261116-10';
import {meterParentFor,frame} from './alignment.mjs?v=20261116-10';
import {deviceText,protectionKind,fuseRating,disconnectBlade,circuitName,circuitNames} from './circuit-data.mjs?v=20261116-10';
import {createElement,W} from './model.mjs?v=20261116-10';
import {allFunctions,functionBmk} from './references.mjs?v=20261116-10';
// Planning envelopes, deliberately not manufacturer-specific article dimensions.
const envelopes={ls:[18,90,75],fils:[36,90,75],fuse:[54,100,85],switch:[90,140,110],coil:[54,90,90],timer:[36,90,70],meter:[180,260,120],spd:[72,134.8,75],terminal:[8,60,45]};
export function schemaDevices(doc){
 const devices=[],warnings=[],seen=new Set();
 for(const {page,element:e,key,data} of allFunctions(doc)){
  if(data.role==='contact'){if(!data.owner)warnings.push(`Blatt ${page.number}: Kontakt ohne zugeordneten Schütz.`);continue;}
  if(['text','rect','dimension','junction','reference','cabinet','rail','duct','module'].includes(e.kind))continue;
  const tag=functionBmk(doc,page,e,key);
  // Only incoming supply blocks are carried over; outgoing X terminals stay in the schema.
  const isTerminal=e.kind==='terminal'||tag.match(/[A-Z]+/i)?.[0]?.toUpperCase()==='X';
  const isIncoming=isTerminal&&(/einspeis|zuleitung|hauptklemme/i.test(deviceText(e,key)+' '+(e.template?.name||'')+' '+(e.text||'')));
  const isTest=isTerminal&&/stromwandler/i.test(e.template?.name||'')&&(e.template?.labels||[]).some(l=>l.key===key.replace('X','P'));
  if(isTerminal&&!isIncoming&&!isTest)continue;
  if(!tag){warnings.push(`Blatt ${page.number}: Gerät ohne BMK.`);continue;}
  if(seen.has(tag)){warnings.push(`${tag}: mehrfach vorhanden; einmal übernommen. BMK prüfen.`);continue;}seen.add(tag);
  let kind=data.role==='coil'?'coil':e.kind;
  if(kind==='template'){const letter=tag.match(/[A-Z]+/i)?.[0]?.toUpperCase();kind=({F:'fuse',Q:'switch',S:'switch',K:'coil',P:'meter',Y:'meter',X:'terminal'})[letter]||'unknown';}
  if(isTest)kind='test-terminal';
  if(kind==='unknown'&&/^\d*T/.test(tag)&&/stromwandler/i.test(e.template?.name||''))kind='transformer';
  const content=deviceText(e,key);
  if(kind==='fuse')kind=protectionKind(e,key)||kind;
  const poles=/\b1\s+2\s+3\s+4\s+5\s+6\b/.test(content)?3:/\b1\s+2\s+N\s+N\b|\b1\s+N\b/.test(content)?1:undefined;
  if(kind==='fuse'&&disconnectBlade(content)&&!fuseRating(content,doc.ratedCurrent).current)throw Error(`${tag}: Trennmesser DIN00 – Bemessungsstrom in den Projektdaten ergänzen.`);
  const rating=kind==='fuse'?fuseRating(content,doc.ratedCurrent,data.fuseSystem,data.fuseSize):isIncoming?{current:fuseRating(content).current||Number(String(doc.ratedCurrent||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'))||null}:{};if(rating.conflict)warnings.push(`${tag}: widersprüchliche Sicherungsangabe.`);if(kind==='fuse'&&!rating.fuseType)warnings.push(`${tag}: DII/DIII oder Stromstärke fehlt.`);
  let [width,height,depth]=envelopes[kind]||[54,100,80];
  if(['ls','fils'].includes(kind)&&/3L|3P|3.pol/i.test(content+' '+(e.template?.name||'')))width=kind==='fils'?72:54;
  const incoming=isIncoming;
  if(circuitNames(doc,{page:page.id,element:e.id}).length>1)throw Error(`${tag}: mehrere Einspeisegruppen verbunden. Verbindungen im Schema trennen.`);
  const inputs=frame(e)?.inputs||[];const meterParent=meterParentFor(e,page);
  const phases=[...new Set((e.template?.ports?.length?e.template.ports:inputs).map((pt,i)=>e.autoPhases?.[i]||pt.phase).filter(v=>/^L[123]$/.test(v)))];
  // The library explicitly identifies direct meter outlets. Their classification
  // must not depend on sub-pixel overlap of separately placed macro lines.
  const meterFed=['ls','fils'].includes(kind)&&(!!meterParent||['tl-0008','tl-0009','tl-0010'].includes(e.template?.id)||/Zusatzabgang[_ -]L[123]\b/i.test(e.template?.name||''));
  const meterKey=meterParent?.template?.labels?.find(l=>l.letter==='P')?.key;
  const meterSource=['fuse','ls','fils'].includes(kind)&&meterKey?{page:page.id,element:meterParent.id,key:meterKey}:undefined;
  if(kind==='fuse'&&isRse(e))kind='rse-fuse';
  devices.push({smisslineHK:data.smisslineHK,smisslineNeutral:data.smisslineNeutral,smisslineFeedCurrent:data.smisslineFeedCurrent,smisslineFeedFrom:data.smisslineFeedFrom,current:Number(content.match(/\b(\d+)\s*A\b/i)?.[1])||0,breakerSystemExplicit:data.breakerSystem!==undefined,fuseSystemExplicit:data.fuseSystem!==undefined,breakerSystem:data.breakerSystem||'conventional',fuseSystem:data.fuseSystem||'conventional',meterSource,meterFed,phase:phases.length===1?phases[0]:'',supplyKey:meterParent?meterParent.id:meterFed?'meter-outlet:'+e.id:'bus:'+page.id,manufacturer:data.manufacturer||'auto',lsMode:data.lsMode||'allpole',poles,neutral:/\bN\b/.test(content)||kind==='fuse'&&(e.template?.ports?.length?e.template.ports:inputs).some(pt=>pt.phase==='N'),schemaTemplateName:e.template?.name||'',...rating,incoming,meterState:'prepared',circuitName:data.circuitName||(meterFed&&!meterParent?'':circuitName(doc,{page:page.id,element:e.id})),source:{page:page.id,element:e.id,key},tag,kind,name:e.template?`${key} · ${content||e.template.name.replaceAll('_',' ')}`:e.value||e.text||kind,width,height,depth,confirmed:false,include:true,pageNumber:page.number});
 }
 for(const p of doc.pages.filter(p=>p.type==='schema'))for(const e of p.elements)if(e.template&&!e.template.labels?.length)warnings.push(`Blatt ${p.number}: «${e.template.name}» ohne auswertbare Gerätekennzeichen.`);
 measurementGroups(doc,devices,warnings);groupRseFuses(devices);return {devices,warnings};
}
export const distributionTypes={sbr:'SBR',standing:'Standschrank',wall:'Wandschrank',field:'Feldverteiler'};
export function assertConfiguredDistribution(c){if(['field','wall'].includes(c.distributionType))throw Object.assign(Error(`${distributionTypes[c.distributionType]} ist noch nicht konfiguriert. Wandschränke sind bis zur Vermessung zurückgestellt. Unterstützt sind SBR und AN-Standschränke.`),{code:'DISPO_TYPE_NOT_CONFIGURED'});}
export const defaultConfig=()=>({distributionType:'sbr',buildSystem:'standard',smisslineDuctWidth:200,passageDepth:0,width:1008,height:1520,depth:165,fields:1,frame:true,reserve:20,construction:'drahtwerk',plateWidth:500,groupColors:true,bridgeMode:'auto',cutCenterBridge:false,topHeight:300,fuseHeight:400,supportSpacing185:1000,meterState:'prepared',rearPanel:false,breakerManufacturer:'auto',autoSize:false,maxWidth:0,maxHeight:0,maxDepth:0,passageWidth:0,passageHeight:0,reserveMeters:0});
export function validateDispoConfig(c){if(c?.smisslineDuctWidth!==undefined&&![200,300].includes(c.smisslineDuctWidth))throw Error('Smissline-Gitterbahn: 200 oder 300 mm wählen.');if(c?.buildSystem!==undefined&&!['standard','smissline','silas60','vertigroup185'].includes(c.buildSystem))throw Error('Unbekanntes Aufbausystem.');if(c?.distributionType!==undefined&&!Object.hasOwn(distributionTypes,c.distributionType))throw Error('Unbekannte Verteilungsart.');if(!c||![c.width,c.height,c.depth,c.fields,c.reserve].every(Number.isFinite)||c.width<258||c.width>10000||c.height<400||c.height>4000||c.depth<100||c.depth>1500||!Number.isInteger(c.fields)||c.fields<1||c.fields>12||c.reserve<0||c.reserve>60||c.width/c.fields<250)throw Error('Schrankmasse prüfen: Breite 258–10000, Höhe 400–4000, Tiefe 100–1500 mm; mindestens 250 mm je Feld.');if(c.fieldWidths!==undefined&&(!Array.isArray(c.fieldWidths)||c.fieldWidths.length!==c.fields||!c.fieldWidths.every(n=>Number.isFinite(n)&&n>=258)||Math.abs(c.fieldWidths.reduce((a,b)=>a+b,0)-c.width)>.01))throw Error('Feldbreiten müssen zur Anzahl Felder und Gesamtbreite passen.');for(const k of ['maxWidth','maxHeight','maxDepth','passageWidth','passageHeight','passageDepth','reserveMeters'])if(c[k]!==undefined&&(!Number.isFinite(c[k])||c[k]<0||c[k]>(k==='reserveMeters'?120:k.endsWith('Height')?4000:10000)))throw Error('Einbau-, Durchgangsmasse und Reserveplätze prüfen.');if(c.reserveMeters!==undefined&&!Number.isInteger(c.reserveMeters))throw Error('Reserveplätze als ganze Anzahl eingeben.');return {plinthHeight:[0,100,200].includes(c.plinthHeight)?c.plinthHeight:0,wallMount:c.wallMount==='up'?'up':'ap',buildSystem:c.buildSystem||'standard',passageDepth:c.passageDepth||0,supportSpacing185:Number.isFinite(c.supportSpacing185)&&c.supportSpacing185>0?Math.min(1000,c.supportSpacing185):1000,distributionType:c.distributionType||'sbr',groupColors:c.groupColors!==false,bridgeMode:['keep','remove'].includes(c.bridgeMode)?c.bridgeMode:'auto',cutCenterBridge:!!c.cutCenterBridge,autoSize:!!c.autoSize,maxWidth:c.maxWidth||0,maxHeight:c.maxHeight||0,maxDepth:c.maxDepth||0,passageWidth:c.passageWidth||0,passageHeight:c.passageHeight||0,reserveMeters:c.reserveMeters||0,...(c.fieldWidths?{fieldWidths:[...c.fieldWidths]}:{}),width:c.width,height:c.height,depth:c.depth,fields:c.fields,reserve:c.reserve,frame:!!c.frame,construction:c.construction==='drahtwerk'?'drahtwerk':'generic',plateWidth:[250,500,750].includes(c.plateWidth)?c.plateWidth:500,topHeight:Number.isFinite(c.topHeight)?Math.max(200,Math.min(500,c.topHeight)):300,fuseHeight:Number.isFinite(c.fuseHeight)?Math.max(200,Math.min(1600,c.fuseHeight)):400,meterState:c.meterState==='installed'?'installed':'prepared',rearPanel:!!c.rearPanel,breakerManufacturer:['auto','hager','schneider'].includes(c.breakerManufacturer)?c.breakerManufacturer:'auto'};}
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
export function planDispo(devices,c){return isCabinet(c)?cabinetLayout(devices,validateDispoConfig(c)):c.construction==='drahtwerk'?systemLayout(devices,validateDispoConfig(c)):layoutDevices(devices,c);}
export function generateDispo(p,devices,config){
 const c=validateDispoConfig(config);assertConfiguredDistribution(c);const layout=planDispo(devices,c);if(layout.overflow.length)throw Object.assign(Error(`Kein Platz für ${layout.overflow.map(d=>d.tag).join(', ')}. Schrank vergrössern, Felder ergänzen oder Geräteauswahl anpassen.`),{code:'DISPO_CAPACITY'});
 if(c.construction==='drahtwerk')c.cutCenterBridge=layout.parts.some(p=>p.cutCenterBridge);
 const required=Math.max(c.width/350,c.height/225),scale=p.elements.some(e=>!e.generatedDispo)?p.scale:([1,2,5,10,20,50,100].find(s=>s>=required)||100),factor=W/420/scale,origin={x:(DRAW.left+DRAW.right-c.width*factor)/2,y:(DRAW.top+DRAW.bottom-c.height*factor)/2};
 const elements=[];
 const add=(kind,x,y,width,height,extra={})=>{const e=createElement(p,kind,0,0);Object.assign(e,{x:origin.x+x*factor,y:origin.y+y*factor,width,height,generatedDispo:true,...extra});elements.push(e);return e;};
 if(c.construction==='drahtwerk'&&c.fields>1){let offset=0;for(const width of c.fieldWidths||Array(c.fields).fill(c.width/c.fields)){add('cabinet',offset,0,width,c.height,{depth:c.depth,text:'',dispoFrame:c.frame,frameStyle:isCabinet(c)?'almatec-'+(c.distributionType==='standing'?'an':c.wallMount||'ap'):c.construction,doorClearance:isCabinet(c)&&devices.some(d=>d.kind==='meter')?190:0,plinthHeight:c.distributionType==='standing'?c.plinthHeight||0:0});offset+=width;}}else add('cabinet',0,0,c.width,c.height,{depth:c.depth,text:'',dispoFrame:c.frame,frameStyle:isCabinet(c)?'almatec-'+(c.distributionType==='standing'?'an':c.wallMount||'ap'):c.construction,doorClearance:isCabinet(c)&&devices.some(d=>d.kind==='meter')?190:0,plinthHeight:c.distributionType==='standing'?c.plinthHeight||0:0});
 if(c.construction==='drahtwerk'){for(const r of layout.parts){const {kind,x,y,width,height,...extra}=r;add(kind,x,y,width,height,extra);}for(const d of layout.placed)add('module',d.x,d.y,d.width,d.height,{templateRotation:d.templateRotation||0,fuseSystem:d.fuseSystem||'conventional',dispoTemplateId:d.dispoTemplateId||'',meterFed:!!d.meterFed,measurementOwner:d.measurementOwner||'',tag:d.tag,text:d.kind==='meter'?'kWh':'',depth:d.depth,phase:d.phase||'',manufacturer:d.manufacturer||'auto',lsMode:d.lsMode||'allpole',mountZ:d.mountZ??-100,frameStyle:d.frameStyle||'',dispoSource:d.source,dispoKind:d.kind,dimensionsConfirmed:d.confirmed,fuseType:d.fuseType||'',current:d.current??0,circuitName:d.circuitName||'',meterState:d.meterState||c.meterState,incoming:!!d.incoming,neutral:!!d.neutral,...(d.meterSource?{meterSource:d.meterSource}:{})});return {elements,scale,config:c};}
 for(let f=0;f<c.fields;f++){
  add('duct',f*c.width/c.fields+15,60,25,c.height-120,{depth:60});
  add('duct',(f+1)*c.width/c.fields-40,60,25,c.height-120,{depth:60});
 }
 for(const r of layout.rails)add('rail',r.x,r.y,r.width,r.height,{depth:15});
 for(const r of layout.ducts)add('duct',r.x,r.y,r.width,r.height,{depth:40});
 for(const d of layout.placed)add('module',d.x,d.y,d.width,d.height,{templateRotation:d.templateRotation||0,fuseSystem:d.fuseSystem||'conventional',dispoTemplateId:d.dispoTemplateId||'',meterFed:!!d.meterFed,measurementOwner:d.measurementOwner||'',tag:d.tag,text:d.kind==='unknown'?'?':d.kind==='meter'?'kWh':'',value:'',depth:d.depth,dispoSource:d.source,dispoKind:d.kind,dimensionsConfirmed:d.confirmed});
 return {elements,scale,config:c};
}
export function validateDispoMetadata(e,fail){const out={};if(e.dispoStructure!==undefined){if(!Array.isArray(e.dispoStructure)||e.dispoStructure.length>5000)fail();out.dispoStructure=e.dispoStructure.map(p=>{if(!p||!['rail','plate','duct'].includes(p.kind)||!['x','y','width','height'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=20000)||p.width<=0||p.height<=0)fail();return {kind:p.kind,x:p.x,y:p.y,width:p.width,height:p.height,...validateDispoMetadata(Object.fromEntries(['profile','plateType','frameStyle','mountZ','depth','cutCenterBridge','drawingLabel'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])),fail)};});}for(const k of ['fuseSystem','dispoTemplateId','drawingLabel','measurementOwner','inputOwner','phase','manufacturer','lsMode','profile','plateType','frameStyle','fuseType','circuitName','dispoGeometryKind','meterState'])if(e[k]!==undefined){if(typeof e[k]!=='string'||e[k].length>200)fail();out[k]=e[k];}for(const k of ['smisslinePE','occupiedPE','requiredReservePE','mountZ','current','plinthHeight','templateRotation','doorClearance'])if(e[k]!==undefined){if(!Number.isFinite(e[k])||Math.abs(e[k])>4000)fail();out[k]=e[k];}if(e.cutCenterBridge!==undefined)out.cutCenterBridge=!!e.cutCenterBridge;if(e.meterFed!==undefined)out.meterFed=!!e.meterFed;if(e.neutral!==undefined)out.neutral=!!e.neutral;if(e.meterSource){out.meterSource={};for(const k of ['page','element','key']){if(typeof e.meterSource[k]!=='string'||e.meterSource[k].length>200)fail();out.meterSource[k]=e.meterSource[k];}}if(e.spdCoupled!==undefined)out.spdCoupled=!!e.spdCoupled;if(e.incoming!==undefined)out.incoming=!!e.incoming;if(e.generatedDispo!==undefined)out.generatedDispo=e.generatedDispo===true;if(e.dispoFrame!==undefined)out.dispoFrame=e.dispoFrame===true;if(e.depth!==undefined){if(!Number.isFinite(e.depth)||e.depth<=0||e.depth>4000)fail();out.depth=e.depth;}if(e.dimensionsConfirmed!==undefined)out.dimensionsConfirmed=e.dimensionsConfirmed===true;if(e.dispoKind!==undefined){if(typeof e.dispoKind!=='string'||e.dispoKind.length>40)fail();out.dispoKind=e.dispoKind;}if(e.dispoSource){out.dispoSource={};for(const k of ['page','element','key']){if(typeof e.dispoSource[k]!=='string'||e.dispoSource[k].length>200)fail();out.dispoSource[k]=e.dispoSource[k];}}return out;}

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
