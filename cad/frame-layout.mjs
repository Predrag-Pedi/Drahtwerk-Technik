// Drahtwerk assembly grid. Confirmed plate envelope: 250/500/750 x 400 mm.
// Profile cross-sections below are simplified envelopes, not manufacturing drawings.
export const profiles={SP09048:{name:'SP 090.48',face:17,depth:99},SP45:{name:'SP 45.0',face:17,depth:45.2},EV165:{name:'EV 165',face:35,depth:150},SP165:{name:'SP 165 DIN',face:40,depth:165},AS35:{name:'AS 35.2',face:35,depth:15},BS25:{name:'BS 25.0',face:25,depth:15},AS50:{name:'AS 50.0',face:50,depth:15},ZS39:{name:'ZS 39.0',face:39,depth:22}};
export const plateOpenings=width=>Array.from({length:Math.floor(width/250)},(_,i)=>({x:i*250+17,width:216}));
export function frameLayout(devices,c){
 if(c.fields>1){
  const widths=c.fieldWidths?.length===c.fields?c.fieldWidths:Array(c.fields).fill(c.width/c.fields),parts=[],placed=[],overflow=[],groups=Array.from({length:c.fields},()=>[]),names=[...new Set(devices.map(d=>d.circuitName).filter(Boolean))];
  for(const d of devices){const i=d.circuitName?names.indexOf(d.circuitName)%c.fields:0;groups[i].push(d);}
  let offset=0;for(let i=0;i<c.fields;i++){const l=frameLayout(groups[i],{...c,width:widths[i],fields:1});parts.push(...l.parts.map(e=>({...e,x:e.x+offset})));placed.push(...l.placed.map(e=>({...e,x:e.x+offset})));offset+=widths[i];overflow.push(...l.overflow);}
  return {parts,placed,overflow};
 }

 if(c.depth<165)throw Error('SP 165 DIN benötigt mindestens 165 mm Rahmentiefe.');
 for(const d of devices.filter(d=>d.include!==false)){if(![d.width,d.height,d.depth].every(n=>Number.isFinite(n)&&n>0&&n<=4000))throw Error(`${d.tag}: Geräteabmessungen prüfen.`);if(d.kind==='fuse'&&(!['DII','DIII','NH00'].includes(d.fuseType)||!d.current||d.current>(d.fuseType==='DII'?25:d.fuseType==='DIII'?63:160)||d.conflict))throw Error(`${d.tag}: DII/DIII/NH00 und Stromstärke prüfen.`);}
 if(![250,500,750].includes(c.plateWidth))throw Error('Plattenbreite muss 250, 500 oder 750 mm sein.');
 const selected=devices.filter(d=>d.include!==false),hasFuses=selected.some(d=>d.kind==='fuse'||d.incoming||d.kind==='switch'&&d.height>110),fuseHeight=c.fuseHeight||400;
 const parts=[],placed=[],overflow=[],cols=Math.ceil(Math.floor((c.width-8)/250)*250/c.plateWidth),left=(c.width-Math.floor((c.width-8)/250)*250)/2,plateTop=c.topHeight||300,fuseY=c.height-20-(hasFuses?fuseHeight:0);
 const add=(kind,x,y,width,height,extra={})=>parts.push({kind,x,y,width,height,...extra});
 if(cols<1||fuseY<=plateTop)throw Error('Rahmen zu klein für die gewählten Platten und Zonen.');
 add('rail',0,0,4,c.height,{profile:'SP165',depth:165,mountZ:-165});add('rail',c.width-4,0,4,c.height,{profile:'SP165',frameStyle:'right',depth:165,mountZ:-165});
 // End profiles and simplified corner fittings; EV dimensions are visual approximations.
 add('rail',4,0,c.width-8,17,{profile:'SP45',depth:45.2,mountZ:-45.2});
 add('rail',4,c.height-17,c.width-8,17,{profile:'SP09048',depth:99,mountZ:-99});
 for(const x of [4,c.width-39])for(const y of [17,c.height-52])add('rail',x,y,35,35,{profile:'EV165',depth:150,mountZ:-160});
 for(let i=1;i<cols;i++)add('rail',left+i*c.plateWidth-12.5,35,25,c.height-70,{profile:'BS25',depth:15,mountZ:-110});
 const bar=(profile,y)=>add('rail',40,y,c.width-80,profiles[profile].face,{profile,depth:profiles[profile].depth,mountZ:profile==='ZS39'?-22:-110});
 bar('AS50',30);bar('AS35',plateTop-145);bar('BS25',plateTop-85);add('duct',40,plateTop-75,c.width-80,60,{depth:60,mountZ:-100});
 add('plate',left,17,c.width-2*left,plateTop-17,{plateType:'cover',depth:3,mountZ:0});
 bar('ZS39',plateTop-22);bar('ZS39',fuseY-22);
 if(c.rearPanel)add('plate',4,17,c.width-8,c.height-34,{plateType:'rear',depth:3,mountZ:-c.depth});
 const meters=selected.filter(d=>d.kind==='meter'),fuses=selected.filter(d=>d.kind==='fuse'),terminals=selected.filter(d=>d.kind==='terminal'&&d.incoming&&d.frameStyle!=='incoming-terminal'),inputs=selected.filter(d=>d.frameStyle==='incoming-terminal'),spds=selected.filter(d=>d.kind==='spd'),bottom=selected.filter(d=>d.kind==='switch'&&d.height>110),regular=selected.filter(d=>!['meter','fuse','terminal','spd'].includes(d.kind)&&!bottom.includes(d));
 const meterCols=Math.floor((c.width-8)/250),meterLeft=(c.width-meterCols*250)/2,meterRows=Math.ceil(meters.length/meterCols),meterTop=fuseY-meterRows*400,regularRows=Math.floor((meterTop-plateTop)/400),shortPanel=meterTop-plateTop-regularRows*400>=200;
 if(meterTop<plateTop+200&&regular.length&&!(meterTop>=plateTop&&meters.length%meterCols))throw Error('Zu wenig Höhe für Geräteplatten und Zählerplätze. Breite oder Höhe erhöhen.');
 const gap=meterTop-(plateTop+regularRows*400+(shortPanel?200:0));if(gap>0)add('plate',left,meterTop-gap,c.width-2*left,gap,{plateType:'cover',depth:3,mountZ:0});
 const put=(d,x,y,extra={})=>{if(d.depth>c.depth){overflow.push(d);return;}placed.push({...d,x,y,...extra});};

 const slots=[],hasMeterFeed=regular.some(d=>d.meterFed)||inputs.length>0||spds.length>0,devicePlateWidth=c.plateWidth,panels=[];for(let x=left;x<c.width-left;){const pw=Math.min(hasMeterFeed&&x===left?250:devicePlateWidth,c.width-left-x);panels.push({x,pw});x+=pw;}
 for(let r=0;r<regularRows+(shortPanel?1:0);r++){const y=plateTop+r*400,ph=r<regularRows?400:200,slotYs=ph===400?[60,185,310]:[60];bar('ZS39',y-22);for(const {x,pw} of panels){add('plate',x,y,pw,ph,{plateType:'slots',depth:3,mountZ:0});for(const sy of slotYs)for(const opening of plateOpenings(pw))slots.push({row:slotYs.indexOf(sy),x:x+opening.x,y:y+sy,used:0,panelWidth:250,width:216});}for(const sy of slotYs)bar('AS35',y+sy+7.5);}
 // Fill the unused cells beside the upper partial meter row with existing device-panel envelopes.
 if(meters.length%meterCols){const y=meterTop;let x=meterLeft+(meters.length%meterCols)*250;while(x<c.width-meterLeft){const pw=Math.min(devicePlateWidth,c.width-meterLeft-x);add('plate',x,y,pw,400,{plateType:'slots',depth:3,mountZ:0});for(const sy of [60,185,310]){for(const opening of plateOpenings(pw))slots.push({row:[60,185,310].indexOf(sy),x:x+opening.x,y:y+sy,used:0,panelWidth:250,width:216});add('rail',x+20,y+sy+7.5,pw-40,35,{profile:'AS35',depth:15,mountZ:-110});}x+=pw;}}
 slots.sort((a,b)=>a.y-b.y||a.x-b.x);
 const panelKey=s=>s.x+':'+(s.y-s.row*125);const inputPanels=new Set();
 if(inputs.length||spds.length){
  const bays=[...new Map(slots.filter(s=>s.row===0&&slots.some(q=>q.x===s.x&&q.y===s.y+250)).map(s=>[panelKey(s),s])).values()];
  for(let i=0;i<Math.max(inputs.length,spds.length);i++){const bay=bays[i];if(!bay){overflow.push(...[inputs[i],spds[i]].filter(Boolean));continue;}inputPanels.add(panelKey(bay));const y=bay.y-60,x=bay.x-17;const panel=parts.find(p=>p.plateType==='slots'&&p.x===x&&p.y===y&&p.width===250);if(panel)panel.plateType='cover';for(const rail of [...parts])if(rail.profile==='AS35'&&!rail.frameStyle&&rail.y>=y&&rail.y<y+400&&rail.x<x+250&&rail.x+rail.width>x){const end=rail.x+rail.width;if(rail.x<x)parts.push({...rail,width:x-rail.x});rail.x=x+250;rail.width=Math.max(0,end-rail.x);if(!rail.width)parts.splice(parts.indexOf(rail),1);}
   if(inputs[i]){const d=inputs[i];put(d,x+(250-d.width)/2,y+70,{mountZ:-70,frameStyle:'incoming-terminal'});add('rail',x+125,y+135,c.width-40-(x+125),35,{profile:'AS35',frameStyle:'incoming:'+d.source.element,depth:15,mountZ:-110});}
   if(spds[i]){const d=spds[i];put(d,x+(250-d.width)/2,y+230,{mountZ:-70});add('rail',x+17,y+290,216,35,{profile:'AS35',depth:15,mountZ:-110});}
  }
 }
 const usableSlots=slots.filter(s=>!inputPanels.has(panelKey(s)));slots.splice(0,slots.length,...usableSlots);
 const meterPanels=new Set();if(regular.some(d=>d.meterFed)&&slots.length)meterPanels.add(panelKey(slots[0]));
 const owners=new Map(),named=[...new Set(regular.filter(d=>!d.meterFed).map(d=>d.circuitName).filter(Boolean))],separatePanels=named.length>1&&named.length<=[...new Set(slots.map(panelKey))].filter(k=>!meterPanels.has(k)).length;
 const phaseStack=d=>d.manufacturer==='hager'&&!d.meterFed&&['ls','fils'].includes(d.kind)&&(d.poles||1)===1&&/^L[123]$/.test(d.phase||'');
 const capacity=slots.length*216*(1-c.reserve/100);let occupied=0;
 const form=d=>phaseStack(d)?'phase-bank':d.kind==='ls'&&(d.lsMode==='individual'||d.manufacturer!=='schneider'&&(d.poles||1)===1)?'single':(d.poles||1)>=3?'multipole':'two-pole';
 const family=d=>[d.circuitName||d.supplyKey||JSON.stringify(d.source)||'unknown',d.manufacturer||'auto',d.lsMode||'allpole',d.manufacturer==='hager'&&d.lsMode!=='individual'?phaseStack(d)?'phase-bank':(d.poles||1):''].join('|');
 const buckets=new Map();for(const d of regular){const key=family(d);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(d);}const groupOrder=[...new Set(regular.map(d=>d.circuitName||d.supplyKey||JSON.stringify(d.source)||'unknown'))],ordered=[...buckets.values()].sort((a,b)=>Number(!!b[0].meterFed)-Number(!!a[0].meterFed)||groupOrder.indexOf(a[0].circuitName||a[0].supplyKey||JSON.stringify(a[0].source)||'unknown')-groupOrder.indexOf(b[0].circuitName||b[0].supplyKey||JSON.stringify(b[0].source)||'unknown')||Number((b[0].poles||1)>1)-Number((a[0].poles||1)>1)).flatMap(group=>group.sort((a,b)=>Number(a.kind==='fils')-Number(b.kind==='fils'))),connections=new Map();
 for(const d of ordered){const key=family(d),individual=d.kind==='ls'&&d.lsMode==='individual',count=individual?(d.poles||1):1;
  if(occupied+d.width*count>capacity){overflow.push(d);continue;}
  let chosen=null;
  for(const first of [...slots].sort((a,b)=>Number(owners.get(panelKey(b))===d.circuitName&&!!d.circuitName)-Number(owners.get(panelKey(a))===d.circuitName&&!!d.circuitName)||Number(slots.some(s=>panelKey(s)===panelKey(b)&&s.group===key))-Number(slots.some(s=>panelKey(s)===panelKey(a)&&s.group===key)))){if(separatePanels&&d.circuitName&&!d.meterFed&&owners.has(panelKey(first))&&owners.get(panelKey(first))!==d.circuitName)continue;if(first.phaseFamily&&first.phaseFamily!==key)continue;if(phaseStack(d)&&slots.some(s=>panelKey(s)===panelKey(first)&&(s.used&&s.group!==key||s.phaseFamily&&s.phaseFamily!==key)))continue;if(first.form&&first.form!==form(d))continue;if(d.manufacturer==='hager'&&!d.meterFed&&first.group&&first.group!==key)continue;if(d.meterFed?!meterPanels.has(panelKey(first)):meterPanels.has(panelKey(first)))continue;if(phaseStack(d)&&!individual&&first.row!==Number(d.phase[1])-1)continue;const rows=Array.from({length:count},(_,i)=>slots.find(s=>s.x===first.x&&Math.abs(s.y-first.y-i*125)<.1));if(rows.some(s=>!s||s.form&&s.form!==form(d)||d.manufacturer==='hager'&&!d.meterFed&&s.group&&s.group!==key))continue;const transition=phaseStack(d)&&d.kind==='fils'&&rows.some(s=>s.lastKind==='ls')?54:0;const used=Math.max(...rows.map(s=>s.used))+transition+(rows.some(s=>s.circuitName&&d.circuitName&&s.circuitName!==d.circuitName)?18:0);if(rows.some(s=>used+d.width>s.width)||d.height>120)continue;const group=buckets.get(key),needed=group.reduce((n,e)=>n+e.width,0);if((d.poles||1)>1&&group[0]===d&&needed>first.width-used&&slots.some(s=>s.used===0&&s.width>=needed&&(!separatePanels||!owners.has(panelKey(s))||owners.get(panelKey(s))===d.circuitName)))continue;chosen={rows,used};break;}
  if(!chosen){overflow.push(d);continue;}
  if(phaseStack(d))for(const s of slots.filter(s=>panelKey(s)===panelKey(chosen.rows[0])))s.phaseFamily=key;
  occupied+=d.width*count;
  for(const [i,s]of chosen.rows.entries()){if(chosen.used>s.used)add('plate',s.x+s.used,s.y,chosen.used-s.used,46,{plateType:'blank',depth:3,mountZ:3});put(d,s.x+chosen.used,s.y+25-d.height/2,{mountZ:8-d.depth,frameStyle:'recessed',phase:individual?'L'+(i+1):(d.phase||'')});s.used=chosen.used+d.width;s.lastKind=d.kind;s.group=key;s.form=form(d);s.circuitName=d.circuitName||'';if(separatePanels&&d.circuitName&&!d.meterFed)owners.set(panelKey(s),d.circuitName);
   if(d.circuitName&&(individual||d.manufacturer==='schneider'||d.manufacturer==='hager')){const k=key+'|'+s.y+'|'+s.x,group=connections.get(k)||{x:s.x+chosen.used,y:s.y+55,width:0,profile:individual||phaseStack(d)?'copper':'comb'};group.width=s.used-(group.x-s.x);connections.set(k,group);}
  }
 }
 for(const g of connections.values())if(g.width>0)add('rail',g.x,g.y,g.width,10,{profile:g.profile,depth:3,mountZ:-35});
 // Close the unused portions of each front opening with removable blanking strips.
 for(const s of slots){const free=216-s.used;if(free>0)add('plate',s.x+s.used,s.y,free,46,{plateType:'blank',depth:3,mountZ:3});}
 for(let i=0;i<meters.length;i++){const d=meters[i],partial=meters.length%meterCols,col=partial&&i>=partial?(i-partial)%meterCols:i%meterCols,row=partial?(i<partial?0:1+Math.floor((i-partial)/meterCols)):Math.floor(i/meterCols),x=meterLeft+col*250,y=meterTop+row*400;if(y<plateTop||d.width>210||d.height>350){overflow.push(d);continue;}add('plate',x,y,250,400,{plateType:'meter',depth:3,mountZ:0});put(d,x+(250-d.width)/2,y+45,{mountZ:3,meterState:c.meterState||'prepared'});}
 for(let r=0;r<meterRows;r++)bar('ZS39',meterTop+r*400-22);
 if(hasFuses)for(let col=0;col<cols;col++)add('plate',left+col*c.plateWidth,fuseY,Math.min(c.plateWidth,c.width-left-(left+col*c.plateWidth)),fuseHeight,{plateType:'fuse',depth:3,mountZ:0});
 if(hasFuses)for(let pole=0;pole<3;pole++)add('rail',40,fuseY+80+pole*110,c.width-80,15,{profile:'copper',depth:5,mountZ:-70});
 // Place associated feeders at the common centre of their meter column.
 const occupiedBottom=[],widthOf=d=>d.fuseType==='NH00'?(d.neutral?126:90):d.fuseType==='DIII'?62:49;
 const meterOf=d=>d.meterSource&&placed.find(m=>m.kind==='meter'&&JSON.stringify(m.source)===JSON.stringify(d.meterSource));
 const anchors=new Map();for(const d of fuses){const m=meterOf(d);if(!m)continue;const center=m.x+m.width/2,column=placed.filter(q=>q.kind==='meter'&&Math.abs(q.x+q.width/2-center)<.1).sort((a,b)=>b.y-a.y),w=widthOf(d);anchors.set(d,center-(column[0]===m?w:0));}
 const reserve=(x,w)=>{if(x<left+8||x+w>c.width-left-8||occupiedBottom.some(b=>x<b.x+b.w-.01&&x+w>b.x+.01))return false;occupiedBottom.push({x,w});return true;};
 const free=w=>{let x=left+17;for(const b of [...occupiedBottom].sort((a,b)=>a.x-b.x)){if(x+w<=b.x)break;x=Math.max(x,b.x+b.w);}return x;};
 for(const [d,x] of anchors)if(!reserve(x,widthOf(d))){overflow.push(d);anchors.set(d,null);}
 for(const d of [...terminals,...bottom]){const x=free(d.width);if(d.height>fuseHeight-40||!reserve(x,d.width)){overflow.push(d);continue;}put(d,x,fuseY+30,{mountZ:8-d.depth});}
 for(const d of fuses){const w=widthOf(d),x=anchors.has(d)?anchors.get(d):free(w);if(x===null)continue;if(fuseHeight<330||!anchors.has(d)&&!reserve(x,w)){overflow.push(d);continue;}if(d.fuseType==='NH00'){for(let pole=0;pole<3;pole++)put({...d,neutral:!!d.neutral&&pole===2,width:d.neutral&&pole===2?126:90,height:45,depth:70},x,fuseY+65+pole*110,{mountZ:3});}else put({...d,width:w,height:265,depth:70},x,fuseY+65,{mountZ:3});}

 return {parts,placed,overflow};
}
export function plateStrips(w,h,type){if(type==='meter'){const x=(w-90)/2,y=h-45;return [[0,0,w,y],[0,y,x,22],[x+90,y,w-x-90,22],[0,y+22,w,h-y-22]];}if(type!=='slots')return [[0,0,w,h]];const slotHeight=46,ys=h>=400?[60,185,310]:[60],strips=[],openings=plateOpenings(w);let y=0;for(const sy of ys){strips.push([0,y,w,sy-y]);let x=0;for(const opening of openings){if(opening.x>x)strips.push([x,sy,opening.x-x,slotHeight]);x=opening.x+opening.width;}if(x<w)strips.push([x,sy,w-x,slotHeight]);y=sy+slotHeight;}strips.push([0,y,w,h-y]);return strips;}
