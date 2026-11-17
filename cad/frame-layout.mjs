import {apGeometry} from './rse.mjs?v=20261117-4';
import {fuseLimits,copperFuse,fuseZoneHeight,placeCopperBanks} from './fuse-systems.mjs?v=20261117-4';
import {fieldLayout} from './field-layout.mjs?v=20261117-4';
import {meterCells,feederOffset,packFeederBanks} from './meter-layout.mjs?v=20261117-4';
// Drahtwerk assembly grid. Confirmed plate envelope: 250/500/750 x 400 mm.
// Profile cross-sections below are simplified envelopes, not manufacturing drawings.
export const profiles={SP09048:{name:'SP 090.48',face:17,depth:99},SP45:{name:'SP 45.0',face:17,depth:45.2},EV165:{name:'EV 165',face:35,depth:150},SP165:{name:'SP 165 DIN',face:40,depth:165},AS35:{name:'AS 35.2',face:35,depth:15},BS25:{name:'BS 25.0',face:25,depth:15},AS50:{name:'AS 50.0',face:50,depth:15},ZS39:{name:'ZS 39.0',face:39,depth:22}};
export const plateOpenings=(width,cut=false)=>![250,500,750].includes(width)?[{x:Math.min(24,width/4),width:width-2*Math.min(24,width/4)}]:cut&&width>=500?[{x:24,width:width-48}]:width===500?([{x:24,width:216},{x:260,width:216}]):Array.from({length:Math.floor(width/250)},(_,i)=>({x:i*250+17,width:216}));
// Visual body centres in original library coordinates. Labels above a body
// and the longer neutral module must not shift the body off the DIN centre.
export function dinBodyCenter(d){
 const id=d.dispoTemplateId;
 if(['tl-0531','tl-0535','tl-0542'].includes(id))return 45;
 if(['tl-0624','tl-0625'].includes(id))return d.height*(1959+9998)/20000;
 if(id==='tl-0735')return d.height*(3323+10000)/20000;
 return d.height/2;
}
// Compare complete valid layouts before selecting a construction variant.
// Fewer occupied rows per supply leave whole rails free; then prefer a
// narrower group footprint, preserving separated pole rows on an exact tie.
function layoutScore(layout){
 const groups=new Map(),poleRows=new Map();
 for(const d of layout.placed.filter(d=>['ls','fils'].includes(d.kind)&&!d.meterFed)){
  const key=d.circuitName||d.supplyKey||JSON.stringify(d.source)||'unknown';
  if(!groups.has(key))groups.set(key,{rows:new Set(),left:Infinity,right:-Infinity});
  const poleKey=key+'|'+((d.poles||1)>=3?'large':'small');if(!poleRows.has(poleKey))poleRows.set(poleKey,new Set());poleRows.get(poleKey).add(Math.round(d.y+d.height/2));
  const g=groups.get(key);g.rows.add(Math.round(d.y+d.height/2));g.left=Math.min(g.left,d.x);g.right=Math.max(g.right,d.x+d.width);
 }
 return [layout.overflow.length,[...groups.values()].reduce((n,g)=>n+g.rows.size,0),[...poleRows.values()].reduce((n,rows)=>n+rows.size,0),[...groups.values()].reduce((n,g)=>n+g.right-g.left,0)];
}
function bestLayout(variants){
 const results=[];let error;
 for(const build of variants){try{results.push(build());}catch(e){error=e;}}
 if(!results.length)throw error;
 return results.sort((a,b)=>{const x=layoutScore(a),y=layoutScore(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;})[0];
}
export function frameLayout(devices,c){
 const requiredFuseHeight=fuseZoneHeight(devices,c.fuseHeight||400);if(requiredFuseHeight>(c.fuseHeight||400))c={...c,fuseHeight:requiredFuseHeight};
 if(c.fields>1)return fieldLayout(devices,c,frameLayout);
 if(!c._bridgeResolved){const modes=c.bridgeMode==='keep'?[false]:c.bridgeMode==='remove'?[true]:[false,true];return bestLayout(modes.map(cut=>()=>frameLayout(devices,{...c,_bridgeResolved:true,cutCenterBridge:cut})));}
 if(c._stackMeterSingles===undefined&&devices.some(d=>d.meterFed)){try{const stacked=frameLayout(devices,{...c,_stackMeterSingles:true});if(!stacked.overflow.length)return stacked;}catch{}return frameLayout(devices,{...c,_stackMeterSingles:false});}
 if(c._schneiderRows===undefined&&devices.some(d=>d.manufacturer==='schneider'))return bestLayout([true,false].map(separate=>()=>frameLayout(devices,{...c,_schneiderRows:separate})));
 if(c._upperDevices===undefined){try{const top=frameLayout(devices,{...c,_upperDevices:true});if(!top.overflow.length)return top;}catch{}return frameLayout(devices,{...c,_upperDevices:false});}

 if(c.depth<165)throw Error('SP 165 DIN benötigt mindestens 165 mm Rahmentiefe.');
 for(const d of devices.filter(d=>d.include!==false)){if(![d.width,d.height,d.depth].every(n=>Number.isFinite(n)&&n>0&&n<=4000))throw Error(`${d.tag}: Geräteabmessungen prüfen.`);if(d.kind==='fuse'&&(!Object.hasOwn(fuseLimits,d.fuseType)||!d.current||d.current>fuseLimits[d.fuseType]||d.conflict))throw Error(`${d.tag}: Sicherungsbaugrösse und Stromstärke prüfen.`);}
 if(![250,500,750].includes(c.plateWidth))throw Error('Plattenbreite muss 250, 500 oder 750 mm sein.');
 const selected=devices.filter(d=>d.include!==false),ordinary=c.buildSystem==='standard'&&selected.some(d=>d.kind==='switch')&&selected.some(d=>d.incoming)&&!selected.some(d=>['meter','fuse','rse-fuse'].includes(d.kind)||d.measurementOwner||d.frameStyle?.startsWith('transfer-')||d.source?.element==='incoming-supply'),hasFuses=!ordinary&&(c._fuseZone||selected.some(d=>d.kind==='fuse'||d.kind==='rse-fuse'&&!d.measurementOwner||d.incoming||d.kind==='switch'&&d.height>110)),fuseHeight=c.fuseHeight||400;
 const customWidth=(c.width-8)%250!==0,usableWidth=customWidth?c.width-8:Math.floor((c.width-8)/250)*250,cols=Math.ceil(usableWidth/c.plateWidth),panelPitch=customWidth?usableWidth/cols:c.plateWidth;
 const leadingService=ordinary&&selected.some(d=>d.manufacturer==='hager')&&usableWidth>750&&usableWidth%250===0;
 const parts=[],placed=[],overflow=[],left=(c.width-usableWidth)/2,plateTop=c.topHeight||300,fuseY=c.height-20-(hasFuses?fuseHeight:0);
 const add=(kind,x,y,width,height,extra={})=>parts.push({kind,x,y,width,height,...extra});
 if(cols<1||fuseY<=plateTop)throw Error('Rahmen zu klein für die gewählten Platten und Zonen.');
 add('rail',0,0,4,c.height,{profile:'SP165',depth:165,mountZ:-165});add('rail',c.width-4,0,4,c.height,{profile:'SP165',frameStyle:'right',depth:165,mountZ:-165});
 // End profiles and simplified corner fittings; EV dimensions are visual approximations.
 add('rail',4,0,c.width-8,17,{profile:'SP45',depth:45.2,mountZ:-45.2});
 add('rail',4,c.height-17,c.width-8,17,{profile:'SP09048',depth:99,mountZ:-99});
 for(const x of [4,c.width-39])for(const y of [17,c.height-52])add('rail',x,y,35,35,{profile:'EV165',depth:150,mountZ:-160});
 for(let i=1;i<(leadingService?1+Math.ceil((usableWidth-250)/panelPitch):cols);i++)add('rail',left+(leadingService?250+(i-1)*panelPitch:i*panelPitch)-12.5,35,25,c.height-70,{profile:'BS25',depth:15,mountZ:-110});
 const bar=(profile,y)=>add('rail',40,y,c.width-80,profiles[profile].face,{profile,depth:profiles[profile].depth,mountZ:profile==='ZS39'?-22:-110});
 bar('AS50',30);bar('AS35',plateTop-145);bar('BS25',plateTop-85);add('duct',40,plateTop-75,c.width-80,60,{depth:60,mountZ:-100});
 add('plate',left,17,c.width-2*left,plateTop-17,{plateType:'cover',depth:3,mountZ:0});
 bar('ZS39',plateTop-22);bar('ZS39',fuseY-22);
 if(c.rearPanel)add('plate',4,17,c.width-8,c.height-34,{plateType:'rear',depth:3,mountZ:-c.depth});
 const rseFuses=selected.filter(d=>d.kind==='rse-fuse'&&!d.measurementOwner);
 const meters=selected.filter(d=>d.kind==='meter'),fuses=selected.filter(d=>d.kind==='fuse'),terminals=selected.filter(d=>d.kind==='terminal'&&d.incoming&&d.frameStyle!=='incoming-terminal'),inputs=selected.filter(d=>d.frameStyle==='incoming-terminal'),spds=selected.filter(d=>d.kind==='spd'),bottom=selected.filter(d=>!ordinary&&d.kind==='switch'&&d.height>110),measurement=selected.filter(d=>d.measurementOwner&&d.kind!=='meter'),regular=selected.filter(d=>!d.measurementOwner&&!['meter','fuse','rse-fuse','terminal','spd'].includes(d.kind)&&!bottom.includes(d)&&!(ordinary&&d.kind==='switch'));
 const meterCols=Math.floor((c.width-8)/250),meterLeft=(c.width-meterCols*250)/2;
 const apparatusHeight=ordinary&&regular.some(d=>d.manufacturer==='schneider')&&fuseY-plateTop>=525&&fuseY-plateTop<800?525:400;
 const meterPlan=meterCells(meters,meterCols,Math.min(3,Math.floor((fuseY-plateTop)/400))),meterRows=meterPlan.rows,meterTop=fuseY-meterRows*400,regularRows=Math.floor((meterTop-plateTop)/apparatusHeight),shortPanel=meterTop-plateTop-regularRows*apparatusHeight>=200;
 if(meterTop<plateTop)throw Error('Zu wenig Höhe für Zählerplätze und Messmodule.');
 const gap=meterTop-(plateTop+regularRows*apparatusHeight+(shortPanel?200:0));if(gap>0)add('plate',left,meterTop-gap,c.width-2*left,gap,{plateType:'cover',depth:3,mountZ:0});
 const put=(d,x,y,extra={})=>{if(d.depth>c.depth){overflow.push(d);return;}placed.push({...d,x,y,...extra});};

 const slots=[],hasMeterFeed=regular.some(d=>d.meterFed)||!ordinary&&(inputs.length>0||spds.length>0),devicePlateWidth=panelPitch,panels=[];for(let x=left;x<c.width-left;){const pw=Math.min((hasMeterFeed||leadingService)&&x===left?250:devicePlateWidth,c.width-left-x);panels.push({x,pw});x+=pw;}
 for(let r=0;r<regularRows+(shortPanel?1:0);r++){const y=plateTop+r*apparatusHeight,ph=r<regularRows?apparatusHeight:200,slotYs=ph===525?[60,185,310,435]:ph===400?[60,185,310]:[60];bar('ZS39',y-22);for(const {x,pw} of panels){add('plate',x,y,pw,ph,{plateType:'slots',cutCenterBridge:!!c.cutCenterBridge&&pw>=500,depth:3,mountZ:0});for(const sy of slotYs)for(const opening of plateOpenings(pw,c.cutCenterBridge))slots.push({row:slotYs.indexOf(sy),x:x+opening.x,y:y+sy,used:0,panelWidth:pw,width:opening.width});}for(const sy of slotYs)bar('AS35',y+sy+7.5);}
 // Unused trailing meter cells remain prepared apparatus panels, even when
 // all current devices fit above. This does not add reserve meter places.
 // In a mixed row, apparatus may only follow the last meter/measurement
 // bay. Earlier holes remain covers; never insert devices before meters.
 for(let row=0;row<meterRows;row++)for(let col=0;col<meterCols;){
  if(meterPlan.occupied.has(row*meterCols+col)){col++;continue;}
  if(Array.from({length:meterCols-col-1},(_,i)=>row*meterCols+col+i+1).some(cell=>meterPlan.occupied.has(cell))){add('plate',meterLeft+col*250,meterTop+row*400,250,400,{plateType:'cover',depth:3,mountZ:0});col++;continue;}
  let count=1;while(count<devicePlateWidth/250&&col+count<meterCols&&!meterPlan.occupied.has(row*meterCols+col+count))count++;
  const x=meterLeft+col*250,y=meterTop+row*400,pw=count*250;add('plate',x,y,pw,400,{plateType:'slots',cutCenterBridge:!!c.cutCenterBridge&&pw>=500,depth:3,mountZ:0});
  for(const [r,sy] of [60,185,310].entries()){for(const opening of plateOpenings(pw,c.cutCenterBridge))slots.push({row:r,x:x+opening.x,y:y+sy,used:0,panelWidth:pw,width:opening.width});add('rail',x+20,y+sy+7.5,pw-40,35,{profile:'AS35',depth:15,mountZ:-110});}col+=count;
 }
 const reserveSlots=[];
 if(c._upperDevices)for(let i=slots.length-1;i>=0;i--)if(slots[i].y>=meterTop)reserveSlots.push(...slots.splice(i,1));
 slots.sort((a,b)=>a.y-b.y||a.x-b.x);
 const panelKey=s=>s.x+':'+(s.y-s.row*125);const inputPanels=new Set();
 if(!ordinary&&(inputs.length||spds.length)){
  const bays=[...new Map(slots.filter(s=>s.row===0&&slots.some(q=>q.x===s.x&&q.y===s.y+250)).map(s=>[panelKey(s),s])).values()];
  for(let i=0;i<Math.max(inputs.length,spds.length);i++){const bay=bays[i];if(!bay){overflow.push(...[inputs[i],spds[i]].filter(Boolean));continue;}inputPanels.add(panelKey(bay));const y=bay.y-60,x=bay.x-17;const panel=parts.find(p=>p.plateType==='slots'&&p.x===x&&p.y===y&&p.width===250);if(panel)panel.plateType='cover';for(const rail of [...parts])if(rail.profile==='AS35'&&!rail.frameStyle&&rail.y>=y&&rail.y<y+400&&rail.x<x+250&&rail.x+rail.width>x){const end=rail.x+rail.width;if(rail.x<x)parts.push({...rail,width:x-rail.x});rail.x=x+250;rail.width=Math.max(0,end-rail.x);if(!rail.width)parts.splice(parts.indexOf(rail),1);}
   if(inputs[i]){const d=inputs[i];put(d,x+(250-d.width)/2,y+70,{mountZ:-70,frameStyle:'incoming-terminal'});add('rail',x+125,y+135,c.width-40-(x+125),35,{profile:'AS35',frameStyle:'incoming:'+d.source.element,depth:15,mountZ:-110});}
   if(spds[i]){const d=spds[i];put(d,x+(250-d.width)/2,y+230,{mountZ:-70});add('rail',x+17,y+290,216,35,{profile:'AS35',depth:15,mountZ:-110});}
  }
 }
 if(ordinary){
  // The incoming terminal belongs to the top terminal rail, not to a meter
  // plate or a synthetic bottom supply bank. Main and SPD occupy apparatus rows.
  let right=c.width-40;
  for(const d of inputs){const x=right-d.width,y=plateTop-110-d.height;if(x<40||y<17){overflow.push(d);continue;}put(d,x,y,{mountZ:-70,frameStyle:'conventional-input'});right=x-18;}
  for(const d of [...selected.filter(d=>d.kind==='switch'),...spds]){const slot=slots.find(s=>s.row===0&&s.used+d.width<=s.width&&d.height<=160);if(!slot){overflow.push(d);continue;}put(d,slot.x+slot.used,slot.y+25-dinBodyCenter(d),{mountZ:-70,frameStyle:'conventional-apparatus'});slot.used+=d.width+18;}
 }
 // Keep the area beneath incoming apparatus out of the outgoing reserve.
 if(ordinary){const serviceEnd=Math.max(0,...slots.filter(s=>s.used>0).map(s=>s.x+s.used));for(const s of slots){s.serviceInset=Math.max(0,Math.min(s.width,serviceEnd-s.x));s.used=Math.max(s.used,s.serviceInset);}}
 const usableSlots=slots.filter(s=>!inputPanels.has(panelKey(s)));slots.splice(0,slots.length,...usableSlots);
 // Independent single meter outlets need no shared phase comb. Stack them
 // in a narrow column, leaving the rest of each rail available to other groups.
 const singles=regular.filter(d=>c._stackMeterSingles!==false&&d.meterFed&&d.supplyKey&&regular.filter(q=>q.meterFed&&q.supplyKey===d.supplyKey).length===1&&(d.poles||1)<=2);
 let singleWidth=0;
 for(const d of singles){const slot=[...slots].sort((a,b)=>a.x-b.x||a.y-b.y).find(s=>!s.singleOutlet&&s.width>=d.width+18&&d.height<=120);if(!slot){overflow.push(d);regular.splice(regular.indexOf(d),1);continue;}slot.singleOutlet=d;put(d,slot.x,slot.y+25-dinBodyCenter(d),{mountZ:8-d.depth,frameStyle:'recessed'});singleWidth+=d.width;regular.splice(regular.indexOf(d),1);}
 for(const s of slots){const same=slots.filter(q=>panelKey(q)===panelKey(s)&&q.singleOutlet);if(same.length){s.used=Math.max(...same.map(q=>q.singleOutlet.width))+18;s.reservedMeter=true;}}
 const meterPanels=new Set();if(regular.some(d=>d.meterFed)&&slots.length)meterPanels.add(panelKey(slots[0]));
 const owners=new Map(),named=[...new Set(regular.filter(d=>!d.meterFed).map(d=>d.circuitName).filter(Boolean))],separatePanels=named.length>1&&named.length<=[...new Set(slots.map(panelKey))].filter(k=>!meterPanels.has(k)).length;
 const phaseStack=d=>d.manufacturer==='hager'&&(!d.meterFed||regular.filter(e=>e.meterFed&&e.supplyKey===d.supplyKey).length>1)&&['ls','fils'].includes(d.kind)&&(d.poles||1)===1&&/^L[123]$/.test(d.phase||'');
 const capacity=slots.reduce((n,s)=>n+s.width,0)*(ordinary?1/(1+c.reserve/100):1-c.reserve/100);let occupied=singleWidth+slots.reduce((n,s)=>n+s.used,0);
 const form=d=>d.manufacturer==='schneider'&&d.lsMode!=='individual'?'schneider':phaseStack(d)?'phase-bank':d.kind==='ls'&&(d.lsMode==='individual'||d.manufacturer!=='schneider'&&(d.poles||1)===1)?'single':(d.poles||1)>=3?'multipole':'two-pole';
 const family=d=>[d.meterFed?'meter:'+d.supplyKey:d.circuitName||d.supplyKey||JSON.stringify(d.source)||'unknown',d.manufacturer||'auto',d.lsMode||'allpole',d.manufacturer==='hager'&&d.lsMode!=='individual'?phaseStack(d)?'phase-bank':(d.poles||1):''].join('|');
 const buckets=new Map();for(const d of regular){const key=family(d);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(d);}const groupOrder=[...new Set(regular.map(d=>d.circuitName||d.supplyKey||JSON.stringify(d.source)||'unknown'))],ordered=[...buckets.values()].sort((a,b)=>Number(!!b[0].meterFed)-Number(!!a[0].meterFed)||groupOrder.indexOf(a[0].circuitName||a[0].supplyKey||JSON.stringify(a[0].source)||'unknown')-groupOrder.indexOf(b[0].circuitName||b[0].supplyKey||JSON.stringify(b[0].source)||'unknown')||Number((a[0].poles||1)>=3)-Number((b[0].poles||1)>=3)).flatMap(group=>ordinary&&group[0].manufacturer==='schneider'?group:group.sort((a,b)=>Number((a.poles||1)>=3)-Number((b.poles||1)>=3)||Number(a.kind==='fils')-Number(b.kind==='fils'))),connections=new Map(),schneiderCursor=new Map();
 for(const d of ordered){const key=family(d),individual=d.kind==='ls'&&d.lsMode==='individual',count=individual?(d.poles||1):1;
  if(occupied+d.width*count>capacity){overflow.push(d);continue;}
  let chosen=null;
  for(const first of [...slots].sort((a,b)=>ordinary&&d.manufacturer==='schneider'?a.y-b.y||a.x-b.x:Number(owners.get(panelKey(b))===d.circuitName&&!!d.circuitName)-Number(owners.get(panelKey(a))===d.circuitName&&!!d.circuitName)||Number(slots.some(s=>panelKey(s)===panelKey(b)&&s.group===key))-Number(slots.some(s=>panelKey(s)===panelKey(a)&&s.group===key)))){if(ordinary&&d.manufacturer==='schneider'){const last=schneiderCursor.get(key);if(last&&(first.y<last.y||first.y===last.y&&first.x<last.x))continue;}if(!ordinary&&c._schneiderRows&&d.manufacturer==='schneider'&&(d.poles||1)>=3&&placed.some(e=>['ls','fils'].includes(e.kind)&&family(e)===key&&(e.poles||1)<3&&first.y<=e.y+e.height/2-25+.1))continue;if(separatePanels&&d.circuitName&&!d.meterFed&&owners.has(panelKey(first))&&owners.get(panelKey(first))!==d.circuitName)continue;if(first.phaseFamily&&first.phaseFamily!==key)continue;if(phaseStack(d)&&slots.some(s=>panelKey(s)===panelKey(first)&&(s.used>(s.serviceInset||0)&&!s.reservedMeter&&s.group!==key||s.phaseFamily&&s.phaseFamily!==key)))continue;if(first.form&&first.form!==form(d))continue;if(d.manufacturer==='hager'&&!d.meterFed&&first.group&&first.group!==key)continue;if(d.meterFed?!meterPanels.has(panelKey(first)):meterPanels.has(panelKey(first)))continue;if(phaseStack(d)&&!individual&&first.row!==Number(d.phase[1])-1)continue;const rows=Array.from({length:count},(_,i)=>slots.find(s=>s.x===first.x&&Math.abs(s.y-first.y-i*125)<.1));if(rows.some(s=>!s||s.form&&s.form!==form(d)||d.manufacturer==='hager'&&!d.meterFed&&s.group&&s.group!==key))continue;const alignFils=ordinary&&phaseStack(d)&&d.kind==='fils',phaseRows=slots.filter(s=>panelKey(s)===panelKey(first)),filsStart=alignFils?(first.phaseFilsStart??Math.max(...phaseRows.map(s=>s.used))+(phaseRows.some(s=>s.lastKind==='ls')?18:0)):0;const transition=!alignFils&&phaseStack(d)&&d.kind==='fils'&&rows.some(s=>s.lastKind==='ls')?Math.min(54,Math.ceil(3*c.reserve/20)*18):0;const used=Math.max(filsStart,...rows.map(s=>s.used))+transition+(d.meterFed&&rows.some(s=>s.group&&s.group!==key)?18:0)+(rows.some(s=>s.circuitName&&d.circuitName&&s.circuitName!==d.circuitName)?18:0);if(rows.some(s=>used+d.width+(ordinary?Math.ceil(Math.max(0,used+d.width-(s.serviceInset||0))*c.reserve/100/18)*18:0)>s.width)||d.height>120)continue;const group=buckets.get(key),needed=group.reduce((n,e)=>n+e.width,0);if((d.poles||1)>1&&group[0]===d&&needed>first.width-used&&slots.some(s=>s.used===0&&s.width>=needed&&(!separatePanels||!owners.has(panelKey(s))||owners.get(panelKey(s))===d.circuitName)))continue;chosen={rows,used,...(alignFils?{filsStart}:{})};break;}
  if(!chosen){overflow.push(d);continue;}
  if(ordinary&&d.manufacturer==='schneider')schneiderCursor.set(key,chosen.rows[0]);
  if(chosen.filsStart!==undefined)for(const s of slots.filter(s=>panelKey(s)===panelKey(chosen.rows[0])))s.phaseFilsStart=chosen.filsStart;
  if(phaseStack(d))for(const s of slots.filter(s=>panelKey(s)===panelKey(chosen.rows[0])))s.phaseFamily=key;
  occupied+=d.width*count;
  for(const [i,s]of chosen.rows.entries()){if(chosen.used>s.used)add('plate',s.x+s.used,s.y,chosen.used-s.used,46,{plateType:'blank',depth:3,mountZ:3});put(d,s.x+chosen.used,s.y+25-dinBodyCenter(d),{mountZ:8-d.depth,frameStyle:'recessed',phase:individual?'L'+(i+1):(d.phase||'')});s.used=chosen.used+d.width;s.lastKind=d.kind;s.group=key;s.form=form(d);s.circuitName=d.circuitName||'';if(separatePanels&&d.circuitName&&!d.meterFed)owners.set(panelKey(s),d.circuitName);
   if((d.circuitName||ordinary&&d.supplyKey)&&(individual||d.manufacturer==='schneider'||d.manufacturer==='hager')){const k=key+'|'+s.y+'|'+s.x,group=connections.get(k)||{x:s.x+chosen.used,y:s.y+55,width:0,profile:individual||phaseStack(d)?'copper':'comb'};group.width=s.used-(group.x-s.x);connections.set(k,group);}
  }
 }
 for(const g of connections.values())if(g.width>0)add('rail',g.x,g.y,g.width,10,{profile:g.profile,depth:3,mountZ:-35});
 // Close the unused portions of each front opening with removable blanking strips.
 for(const s of [...slots,...reserveSlots]){const free=s.width-s.used;if(free>0)add('plate',s.x+s.used,s.y,free,46,{plateType:'blank',depth:3,mountZ:3});}
 for(const [d,cell] of meterPlan.cells){const col=cell%meterCols,row=Math.floor(cell/meterCols),x=meterLeft+col*250,y=meterTop+row*400;if(d.width>210||d.height>350){overflow.push(d);continue;}add('plate',x,y,250,400,{plateType:'meter',depth:3,mountZ:0});put(d,x+(250-d.width)/2,y+45,{mountZ:3,meterState:c.meterState||'prepared'});
 if(d.measurementOwner){const my=y+400,style='measurement:'+d.measurementOwner;add('plate',x,my,250,400,{plateType:'cover',frameStyle:style,depth:3,mountZ:0});for(const sy of [60,185,310])add('rail',x+17,my+sy+7.5,216,35,{profile:'AS35',frameStyle:style,depth:15,mountZ:-110});const group=measurement.filter(q=>q.measurementOwner===d.measurementOwner),ct=group.filter(q=>q.kind==='transformer'),ctWidth=ct.reduce((n,q)=>n+q.width,0);
 const ap=[...group.filter(q=>q.kind==='rse-fuse'),...group.filter(q=>q.kind==='voltage-fuse')],apWidth=ap.reduce((n,q)=>n+apGeometry(q).width,0);
 for(const q of group){const index=ct.indexOf(q),ai=ap.indexOf(q),top=ai>=0?335-apGeometry(q).centerY:q.kind==='test-terminal'?20:155,dx=ai>=0?(250-apWidth)/2+ap.slice(0,ai).reduce((n,e)=>n+apGeometry(e).width,0)-apGeometry(q).left:index<0?(250-q.width)/2:(250-ctWidth)/2+ct.slice(0,index).reduce((n,e)=>n+e.width,0);if(dx<(ai>=0?17:0)||top+q.height>400){overflow.push(q);continue;}put(q,x+dx,my+top,{mountZ:3,frameStyle:style});}}}
 for(let r=0;r<meterRows;r++)bar('ZS39',meterTop+r*400-22);
 if(hasFuses)for(let col=0;col<cols;col++)add('plate',left+col*panelPitch,fuseY,Math.min(panelPitch,c.width-left-(left+col*panelPitch)),fuseHeight,{plateType:'fuse',depth:3,mountZ:0});
 if(hasFuses&&!fuses.some(copperFuse))for(let pole=0;pole<3;pole++)add('rail',40,fuseY+80+pole*110,c.width-80,15,{profile:'copper',depth:5,mountZ:-70});
 // Place associated feeders at the common centre of their meter column.
 const occupiedBottom=[],widthOf=d=>d.fuseType==='NH00'?(d.neutral?126:90):d.fuseType==='DIII'?62:49;
 const meterOf=d=>d.meterSource&&placed.find(m=>m.kind==='meter'&&JSON.stringify(m.source)===JSON.stringify(d.meterSource));
 const anchors=new Map();for(const d of fuses){const m=meterOf(d);if(!m)continue;const center=m.x+m.width/2,column=placed.filter(q=>q.kind==='meter'&&Math.abs(q.x+q.width/2-center)<.1).sort((a,b)=>b.y-a.y),widths=column.map(q=>Math.max(0,...fuses.filter(f=>meterOf(f)===q).map(widthOf)));anchors.set(d,Math.max(left+8,center+feederOffset(widths,column.indexOf(m))));}
 const reserve=(x,w)=>{if(x<left+8||x+w>c.width-left-8||occupiedBottom.some(b=>x<b.x+b.w-.01&&x+w>b.x+.01))return false;occupiedBottom.push({x,w});return true;};
 const free=w=>{let x=left+17;for(const b of [...occupiedBottom].sort((a,b)=>a.x-b.x)){if(x+w<=b.x)break;x=Math.max(x,b.x+b.w);}return x;};
 // Handover blocks stay at the adjoining frame edges and count towards capacity.
 const handovers=terminals.filter(d=>d.frameStyle?.startsWith('transfer-'));
 for(const d of handovers){const x=d.frameStyle==='transfer-left'?left+8:c.width-left-8-d.width;if(d.height>fuseHeight-40||!reserve(x,d.width)){overflow.push(d);continue;}put(d,x,fuseY+30,{mountZ:8-d.depth});}
 for(const d of [...terminals.filter(d=>!handovers.includes(d)),...bottom]){
  const input=placed.find(e=>e.frameStyle==='incoming-terminal'),rightSide=input&&input.x+input.width/2>c.width/2,preferred=d.source?.element==='incoming-supply'?(rightSide?c.width-21-d.width:21):free(d.width);
  const slots=packFeederBanks([{key:d,width:d.width,preferred}],left+8,c.width-left-8,occupiedBottom.map(b=>({x:b.x,width:b.w}))),x=slots?.get(d);
  if(d.height>fuseHeight-40||x===undefined||!reserve(x,d.width)){overflow.push(d);continue;}put(d,x,fuseY+30,{mountZ:8-d.depth});
 }
 for(const d of rseFuses){const m=meterOf(d)||placed.find(q=>q.kind==='meter'&&q.source?.element===d.source?.element&&q.source?.page===d.source?.page),preferred=m?m.x+(m.width-d.width)/2:free(d.width),x=reserve(preferred,d.width)?preferred:free(d.width);if(x!==preferred&&!reserve(x,d.width)||x+d.width>c.width-left-8){overflow.push(d);continue;}const row=['L1','L2','L3'].indexOf(d.phase),y=fuseY+87.5+Math.max(0,row)*110-d.height/2;put(d,x,y,{mountZ:3,frameStyle:'rse-fuse'});}
 if(fuses.some(copperFuse)){placeCopperBanks(fuses,{left:left+8,right:c.width-left-8,y:fuseY,height:fuseHeight,spacing:c.supportSpacing185,obstacles:occupiedBottom.map(b=>({x:b.x,width:b.w})),put,add,overflow});}
 else {
 const banks=fuses.map((d,i)=>({key:d,width:widthOf(d),preferred:anchors.get(d)??free(widthOf(d))+i*.001})).sort((a,b)=>a.preferred-b.preferred);
 const fitted=packFeederBanks(banks,left+8,c.width-left-8,occupiedBottom.map(b=>({x:b.x,width:b.w})));
 if(!fitted)overflow.push(...fuses);
 else for(const d of fuses){const w=widthOf(d),x=fitted.get(d);if(fuseHeight<330){overflow.push(d);continue;}if(d.fuseType==='NH00'){for(let pole=0;pole<3;pole++)put({...d,neutral:!!d.neutral&&pole===2,width:d.neutral&&pole===2?126:90,height:45,depth:70},x,fuseY+65+pole*110,{mountZ:3});}else put({...d,width:w,height:265,depth:70},x,fuseY+65,{mountZ:3});}
 }

 return {parts,placed,overflow};
}
export function plateStrips(w,h,type,cut=false){if(type==='meter'){const x=(w-90)/2,y=h-45;return [[0,0,w,y],[0,y,x,22],[x+90,y,w-x-90,22],[0,y+22,w,h-y-22]];}if(type!=='slots')return [[0,0,w,h]];const slotHeight=46,ys=h===525?[60,185,310,435]:h>=400?[60,185,310]:[60],strips=[],openings=plateOpenings(w,cut);let y=0;for(const sy of ys){strips.push([0,y,w,sy-y]);let x=0;for(const opening of openings){if(opening.x>x)strips.push([x,sy,opening.x-x,slotHeight]);x=opening.x+opening.width;}if(x<w)strips.push([x,sy,w-x,slotHeight]);y=sy+slotHeight;}strips.push([0,y,w,h-y]);return strips;}

// Join mechanical DIN supports across adjacent apparatus panels, never across a
// meter/input bay or across electrically separate copper/comb conductors.
export function joinDinRails(parts,panels=parts){
 const out=parts.map(p=>({...p}));
 const supports=out.filter(p=>p.kind==='rail'&&p.profile==='AS35'&&!p.frameStyle).sort((a,b)=>Math.abs(a.y-b.y)>.01?a.y-b.y:a.x-b.x);
 const covered=(a,b)=>{let end=a.x;for(const p of panels.filter(p=>p.plateType==='slots'&&a.y+a.height/2>=p.y&&a.y+a.height/2<=p.y+p.height).sort((a,b)=>a.x-b.x)){if(p.x>end+.01)continue;end=Math.max(end,p.x+p.width);}return end>=b.x+b.width-.01;};
 for(let i=0;i<supports.length;i++){const a=supports[i];if(!out.includes(a))continue;for(let j=i+1;j<supports.length;j++){const b=supports[j];if(!out.includes(b)||Math.abs(a.y-b.y)>.01||Math.abs(a.height-b.height)>.01||a.mountZ!==b.mountZ||a.depth!==b.depth||b.x>a.x+a.width+40.01||!covered(a,b))continue;a.width=Math.max(a.x+a.width,b.x+b.width)-a.x;out.splice(out.indexOf(b),1);}}
 return out;
}
