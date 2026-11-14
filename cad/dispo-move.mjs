import {feederOffset} from './meter-layout.mjs?v=20261114-05';
const factor=p=>1200/420/p.scale;
const device=e=>!!e.dispoSource;
const box=(p,es)=>({x:Math.min(...es.map(e=>e.x)),y:Math.min(...es.map(e=>e.y)),right:Math.max(...es.map(e=>e.x+e.width*factor(p))),bottom:Math.max(...es.map(e=>e.y+e.height*factor(p)))});
export function dispoGroup(p,id){const e=p.elements.find(e=>e.id===id);if(e?.measurementOwner){const meter=p.elements.find(q=>q.dispoKind==='meter'&&q.measurementOwner===e.measurementOwner);return meter?p.elements.filter(q=>q.measurementOwner===e.measurementOwner):[e];}if(e?.frameStyle==='incoming-terminal')return [e,...incomingCompanions(p,e)];if(!device(e||{})||e.dispoKind==='meter')return e?[e]:[];return p.elements.filter(q=>device(q)&&q.dispoKind!=='meter'&&q.frameStyle===e.frameStyle&&Math.abs(q.y-e.y)<.1&&(e.circuitName?q.circuitName===e.circuitName:q.dispoSource.element===e.dispoSource.element&&q.dispoSource.page===e.dispoSource.page));}
export function moveDispoElements(p,ids,dx,dy){
 const linked=new Set(ids);for(const e of p.elements.filter(e=>ids.has(e.id)))for(const q of e.measurementOwner?p.elements.filter(q=>q.measurementOwner===e.measurementOwner):incomingCompanions(p,e))linked.add(q.id);const moving=p.elements.filter(e=>linked.has(e.id)),before=moving.some(e=>e.dispoKind==='meter'||e.frameStyle==='incoming-terminal')?structuredClone(p.elements):null;
 if(p.type==='dispo'){const mm=1/factor(p),meters=moving.filter(e=>e.dispoKind==='meter'&&e.width===250&&e.height===400);for(const c of p.elements.filter(q=>q.dispoStructure))for(const part of c.dispoStructure)if((part.frameStyle?.startsWith('measurement:')&&meters.some(e=>part.frameStyle==='measurement:'+e.measurementOwner))||(part.plateType==='meter'&&meters.some(e=>Math.abs(c.x+part.x/mm-e.x)<.01&&Math.abs(c.y+part.y/mm-e.y)<.01))){part.x+=dx*mm;part.y+=dy*mm;}}
 for(const e of moving){e.x+=dx;e.y+=dy;}
 if(before)try{if(moving.some(e=>e.dispoKind==='meter'))alignMeterFuses(p);updateIncomingRails(p);updateSupplyBlocks(p);}catch(error){p.elements=before;throw error;}
}
// Called at drop, with a pre-drag snapshot. Swaps whole plates or explicitly selected
// device groups, preserving their internal offsets. Failed fits leave both untouched.
export function swapDispoDrop(p,before,items){
 if(p.type!=='dispo'||!items.length||items.some(s=>s.kind!=='element'))return false;
 const ids=new Set(items.map(s=>s.id)),moving=p.elements.filter(e=>ids.has(e.id));if(moving.some(e=>!device(e)||e.rotation))return false;
 if(moving.some(e=>e.measurementOwner))return swapMeasurementPair(p,before,moving.find(e=>e.measurementOwner).measurementOwner);
 const input=moving.find(e=>e.frameStyle==='incoming-terminal');if(input)return shiftIncomingBay(p,before,input.id);
 if(items.length===1&&swapMeterBay(p,before,items[0].id))return true;
 const original=before.elements.filter(e=>ids.has(e.id)),a=box(p,original),now=box(p,moving),cx=(now.x+now.right)/2,cy=(now.y+now.bottom)/2;
 const target=before.elements.find(e=>device(e)&&!ids.has(e.id)&&!e.rotation&&(e.dispoKind==='meter')===(moving[0].dispoKind==='meter')&&cx>=e.x&&cx<=e.x+e.width*factor(p)&&cy>=e.y&&cy<=e.y+e.height*factor(p));
 if(!target)return false;const targets=items.length>1?dispoGroup(before,target.id):[target],b=box(p,targets),targetIds=new Set(targets.map(e=>e.id));if(targets.some(e=>ids.has(e.id)))return false;
 const changes=[...original.map(e=>({...e,x:e.x+b.x-a.x,y:e.y+b.y-a.y})),...targets.map(e=>({...e,x:e.x+a.x-b.x,y:e.y+a.y-b.y}))];
 const overlap=(a,b)=>a.x<b.right-.01&&a.right>b.x+.01&&a.y<b.bottom-.01&&a.bottom>b.y+.01;
 const others=before.elements.filter(e=>device(e)&&!ids.has(e.id)&&!targetIds.has(e.id));
 for(const e of changes){const eb=box(p,[e]);if([...others,...changes.filter(q=>q.id!==e.id)].some(q=>overlap(eb,box(p,[q]))))throw Error('Die Gerätegruppen passen an diesen Plätzen nicht nebeneinander.');const cabinet=before.elements.find(c=>c.kind==='cabinet'&&e.x>=c.x&&e.y>=c.y&&eb.right<=c.x+c.width*factor(p)+.01&&eb.bottom<=c.y+c.height*factor(p)+.01);if(!cabinet)throw Error('Die Gruppe passt nicht in den Rahmen.');}
 // Reset structural plates first; simultaneous swaps must not move the same plate twice.
 for(const c of p.elements.filter(e=>e.dispoStructure)){const old=before.elements.find(e=>e.id===c.id);c.dispoStructure=structuredClone(old.dispoStructure);for(const part of c.dispoStructure){if(part.plateType!=='meter')continue;const oldMeter=[...original,...targets].find(e=>e.dispoKind==='meter'&&Math.abs(c.x+part.x*factor(p)-e.x)<.01&&Math.abs(c.y+part.y*factor(p)-e.y)<.01);const next=oldMeter&&changes.find(e=>e.id===oldMeter.id);if(next){part.x+=(next.x-oldMeter.x)/factor(p);part.y+=(next.y-oldMeter.y)/factor(p);}}}
 for(const e of changes)Object.assign(p.elements.find(q=>q.id===e.id),{x:e.x,y:e.y});if(changes.some(e=>e.dispoKind==='meter'))alignMeterFuses(p);updateIncomingRails(p);return true;
}
export function arrowStep(p,key,shift=false,alt=false){const step=(shift?10:alt?.1:1)*(p.type==='dispo'?factor(p):1);return {dx:key==='ArrowLeft'?-step:key==='ArrowRight'?step:0,dy:key==='ArrowUp'?-step:key==='ArrowDown'?step:0};}

// Exchange one 250 x 400 meter bay with a 250 mm section of an apparatus panel.
// All devices in that bay move together, including different circuits and rows.
export function swapMeterBay(p,before,id){
 const old=before.elements.find(e=>e.id===id),moved=p.elements.find(e=>e.id===id),f=factor(p);
 if(old?.dispoKind!=='meter'||old.width!==250||old.height!==400)return false;
 const cx=moved.x+125*f,cy=moved.y+200*f;
 for(const cabinet of before.elements.filter(e=>e.dispoStructure&&!e.rotation)){
  const panel=cabinet.dispoStructure.find(s=>s.plateType==='slots'&&cx>=cabinet.x+s.x*f&&cx<cabinet.x+(s.x+s.width)*f&&cy>=cabinet.y+s.y*f&&cy<cabinet.y+(s.y+s.height)*f);
  if(!panel)continue;
  if(panel.height!==400||panel.width%250!==0)throw Error('Der Zählerplatz benötigt einen vollständigen Bereich von 250 × 400 mm.');
   const cellX=panel.x+Math.floor(((cx-cabinet.x)/f-panel.x)/250)*250,cellY=panel.y;
  const sourceX=(old.x-cabinet.x)/f,sourceY=(old.y-cabinet.y)/f;
  const meterPlate=cabinet.dispoStructure.find(s=>s.plateType==='meter'&&Math.abs(s.x-sourceX)<.01&&Math.abs(s.y-sourceY)<.01);
  if(!meterPlate)throw Error('Zählerplatte und Gerätebereich müssen zum selben Rahmen gehören.');
  const target={x:cabinet.x+cellX*f,y:cabinet.y+cellY*f,right:cabinet.x+(cellX+250)*f,bottom:cabinet.y+(cellY+400)*f};
  const intersects=b=>b.x<target.right-.01&&b.right>target.x+.01&&b.y<target.bottom-.01&&b.bottom>target.y+.01;
  const displaced=before.elements.filter(e=>device(e)&&e.id!==id&&intersects(box(p,[e])));
  if(displaced.some(e=>e.rotation||e.dispoKind==='meter'||box(p,[e]).x<target.x-.01||box(p,[e]).right>target.right+.01||box(p,[e]).y<target.y-.01||box(p,[e]).bottom>target.bottom+.01))throw Error('Ein Gerät überschreitet die 250-mm-Plattengrenze. Die Gruppe zuerst innerhalb des Gerätebereichs anordnen.');
  const deltaX=old.x-target.x,deltaY=old.y-target.y;
  const changes=displaced.map(e=>({...e,x:e.x+deltaX,y:e.y+deltaY}));
  const other=before.elements.filter(e=>device(e)&&e.id!==id&&!displaced.some(q=>q.id===e.id));
  if(changes.some(e=>{const a=box(p,[e]);return other.some(q=>{const b=box(p,[q]);return a.x<b.right-.01&&a.right>b.x+.01&&a.y<b.bottom-.01&&a.bottom>b.y+.01;});}))throw Error('Am bisherigen Zählerplatz ist nicht genug Platz für die Geräte.');
  const structure=[];
  for(const part of cabinet.dispoStructure){
   if(part===meterPlate){structure.push({...part,x:cellX,y:cellY});continue;}
   const movable=part.plateType==='slots'||part.plateType==='blank'||part.profile==='AS35';
   const left=Math.max(part.x,cellX),right=Math.min(part.x+part.width,cellX+250);
   if(!movable||right<=left||part.y<cellY-.01||part.y+part.height>cellY+400+.01){structure.push(structuredClone(part));continue;}
   if(part.x<left)structure.push({...part,width:left-part.x});
   if(part.x+part.width>right)structure.push({...part,x:right,width:part.x+part.width-right});
   structure.push({...part,x:sourceX+left-cellX,y:sourceY+part.y-cellY,width:right-left});
  }
  p.elements.find(e=>e.id===cabinet.id).dispoStructure=structure;
  Object.assign(moved,{x:target.x,y:target.y});for(const e of changes)Object.assign(p.elements.find(q=>q.id===e.id),{x:e.x,y:e.y});if(changes.some(e=>e.dispoKind==='meter'))alignMeterFuses(p);updateIncomingRails(p);return true;
 }
 return false;
}

// The source relation survives saving; BMK text and manual plate order are not identifiers.
export function alignMeterFuses(p){
 const f=factor(p),meters=p.elements.filter(e=>e.dispoKind==='meter'),positions=new Map();
 for(const e of p.elements.filter(e=>e.dispoKind==='fuse'&&e.meterSource)){
  const meter=meters.find(m=>JSON.stringify(m.dispoSource)===JSON.stringify(e.meterSource));if(!meter)continue;
  const center=meter.x+meter.width*f/2,cabinet=p.elements.find(c=>c.kind==='cabinet'&&center>=c.x&&center<c.x+c.width*f&&meter.y>=c.y&&meter.y<c.y+c.height*f);
  const column=meters.filter(m=>Math.abs(m.x+m.width*f/2-center)<.1&&(!cabinet||m.y>=cabinet.y&&m.y<cabinet.y+cabinet.height*f)).sort((a,b)=>b.y-a.y);
  const width=Math.max(e.width,...p.elements.filter(q=>q.dispoKind==='fuse'&&JSON.stringify(q.meterSource)===JSON.stringify(e.meterSource)).map(q=>q.width));
  positions.set(e,Math.max(cabinet?cabinet.x+12*f:-Infinity,center+feederOffset(column.map(m=>Math.max(0,...p.elements.filter(q=>q.dispoKind==='fuse'&&JSON.stringify(q.meterSource)===JSON.stringify(m.dispoSource)).map(q=>q.width))),column.indexOf(meter))*f));
 }
 // Preserve independent bottom equipment whenever it still fits. When a moved
 // feeder occupies its old place, relocate the entire three-pole assembly.
 for(const c of p.elements.filter(e=>e.kind==='cabinet')){
  const within=e=>e.x>=c.x-.01&&e.x+e.width*f<=c.x+c.width*f+.01&&e.y>=c.y&&e.y<c.y+c.height*f;
  const occupied=[...positions].filter(([e])=>within(e)).map(([e,x])=>({x,w:e.width*f}));
  const groups=new Map();for(const e of p.elements.filter(e=>within(e)&&!e.meterSource&&(e.dispoKind==='fuse'||e.incoming&&e.frameStyle!=='incoming-terminal'))){const key=JSON.stringify(e.dispoSource)||e.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
  for(const group of groups.values()){
   const e=group[0],w=Math.max(...group.map(part=>part.width))*f;let x=e.x;
   if(occupied.some(b=>x<b.x+b.w-.01&&x+w>b.x+.01)){
    x=c.x+21*f;for(const b of [...occupied].sort((a,b)=>a.x-b.x)){if(x+w<=b.x+.01)break;x=Math.max(x,b.x+b.w);}
    if(x+w>c.x+(c.width-12)*f)throw Error('Kein Platz für die Bezügersicherungen an den neuen Zählerpositionen.');
   }
   occupied.push({x,w});for(const part of group)positions.set(part,x);
  }
 }
 for(const [e,x] of positions)e.x=x;

}

export function updateIncomingRails(p){
 const f=factor(p);
 for(const c of p.elements.filter(e=>e.dispoStructure))for(const r of c.dispoStructure){
  if(!r.frameStyle?.startsWith('incoming:'))continue;
  const owner=p.elements.find(e=>e.frameStyle==='incoming-terminal'&&e.dispoSource?.element===r.frameStyle.slice(9));if(!owner)continue;
  const center=(owner.x-c.x)/f+owner.width/2,edge=center<c.width/2?c.width-40:40;
  r.x=Math.min(center,edge);r.width=Math.max(1,Math.abs(center-edge));r.y=(owner.y-c.y)/f+owner.height*.55;
 }
}

// Input and SPD share a movable bay, without involving the bottom fuse bank.
export function incomingCompanions(p,e){
 if(e.frameStyle!=='incoming-terminal'||e.spdCoupled===false)return [];
 const f=factor(p);return p.elements.filter(q=>q.dispoKind==='spd'&&(q.inputOwner?q.inputOwner===e.dispoSource?.element:Math.abs(q.x+q.width*f/2-e.x-e.width*f/2)<125*f&&q.y>e.y&&q.y<e.y+400*f));
}
export function updateSupplyBlocks(p){
 const f=factor(p);
 for(const c of p.elements.filter(e=>e.kind==='cabinet')){
  const input=p.elements.find(e=>e.frameStyle==='incoming-terminal'&&e.x>=c.x&&e.x<c.x+c.width*f&&e.y>=c.y&&e.y<c.y+c.height*f);if(!input)continue;
  for(const b of p.elements.filter(e=>e.dispoSource?.element==='incoming-supply'&&e.x>=c.x-.01&&e.x<c.x+c.width*f&&e.y>=c.y&&e.y<c.y+c.height*f)){
   const x=c.x+(input.x+input.width*f/2<c.x+c.width*f/2?21:c.width-21-b.width)*f;
   const a={x,right:x+b.width*f,y:b.y,bottom:b.y+b.height*f};
   if(p.elements.some(e=>e.id!==b.id&&device(e)&&e.dispoKind==='fuse'&&e.x<a.right-.01&&e.x+e.width*f>a.x+.01&&e.y<a.bottom-.01&&e.y+e.height*f>a.y+.01))throw Error('Am Rand ist kein Platz für den Einspeisblock. Die unteren Sicherungen bleiben unverändert.');
   b.x=x;
  }
 }
}
export function shiftIncomingBay(p,before,id){
 const old=before.elements.find(e=>e.id===id),moved=p.elements.find(e=>e.id===id),f=factor(p);
 if(old?.frameStyle!=='incoming-terminal')return false;
 for(const c of before.elements.filter(e=>e.dispoStructure&&!e.rotation)){
  const source=c.dispoStructure.find(s=>s.plateType==='cover'&&s.width===250&&s.height===400&&old.x>=c.x+s.x*f-.01&&old.x<c.x+(s.x+250)*f&&old.y>=c.y+s.y*f&&old.y<c.y+(s.y+400)*f);if(!source)continue;
  const cx=(moved.x+moved.width*f/2-c.x)/f,cy=(moved.y+moved.height*f/2-c.y)/f;
  const target=c.dispoStructure.find(s=>s.plateType==='slots'&&s.height===400&&Math.abs(s.y-source.y)<.01&&cx>=s.x&&cx<s.x+s.width&&cy>=s.y&&cy<s.y+400);if(!target)continue;
  const dest=target.x+Math.floor((cx-target.x)/250)*250,delta=dest-source.x,lo=Math.min(dest,source.x),hi=Math.max(dest,source.x)+250;
  const shift=x=>Math.abs(x-source.x)<.01?delta:delta>0?-250:250;
  const companions=new Set(incomingCompanions(before,old).map(e=>e.id));
  const changes=[];
  for(const e of before.elements.filter(device)){
   if(e.id===id||companions.has(e.id)){changes.push({id:e.id,x:e.x+delta*f,y:e.y});continue;}
   if(e.dispoKind==='spd'&&old.spdCoupled===false)continue;
   const x=(e.x-c.x)/f,y=(e.y-c.y)/f;if(y>=source.y+400-.01||y+e.height<=source.y+.01||x>=hi-.01||x+e.width<=lo+.01)continue;
   const cell=source.x+Math.floor((x-source.x+.01)/250)*250;
   if(e.rotation||e.dispoKind==='meter'||x<lo-.01||x+e.width>cell+250+.01||y<source.y-.01||y+e.height>source.y+400+.01)throw Error('Die Gerätegruppe überschreitet eine Modulgrenze. Bitte innerhalb des 250er-Moduls anordnen.');
   changes.push({id:e.id,x:e.x+shift(cell)*f,y:e.y});
  }
  if(old.spdCoupled===false){const fixed=before.elements.filter(e=>e.dispoKind==='spd'&&!changes.some(q=>q.id===e.id));for(const q of changes){const e=before.elements.find(e=>e.id===q.id);if(fixed.some(s=>q.x<s.x+s.width*f-.01&&q.x+e.width*f>s.x+.01&&q.y<s.y+s.height*f-.01&&q.y+e.height*f>s.y+.01))throw Error('Der entkoppelte SPD belegt den Zielbereich. Bitte zuerst separat verschieben.');}}
  const structure=[];
  for(const r of c.dispoStructure){
   if(r.frameStyle?.startsWith('incoming:')){structure.push({...r});continue;}
   if(!(r.plateType==='slots'||r.plateType==='cover'&&r===source||r.plateType==='blank'||['AS35','copper','comb'].includes(r.profile))||r.y<source.y-.01||r.y+r.height>source.y+400+.01){structure.push({...r});continue;}
   const cuts=[r.x,...Array.from({length:Math.round((hi-lo)/250)+1},(_,i)=>lo+i*250).filter(x=>x>r.x+.01&&x<r.x+r.width-.01),r.x+r.width].sort((a,b)=>a-b);
   for(let i=0;i<cuts.length-1;i++){const x=cuts[i],w=cuts[i+1]-x,cell=source.x+Math.floor((x-source.x+.01)/250)*250;structure.push({...r,x:x+(x>=lo-.01&&x<hi-.01?shift(cell):0),width:w});}
  }
  p.elements.find(e=>e.id===c.id).dispoStructure=structure;
  for(const q of changes)Object.assign(p.elements.find(e=>e.id===q.id),{x:q.x,y:q.y});
  updateIncomingRails(p);updateSupplyBlocks(p);return true;
 }
 return false;
}

// Exchange a meter plus its lower 250 mm measurement module as one 250 x 800 bay.
function swapMeasurementPair(p,before,owner){
 const f=factor(p),old=before.elements.find(e=>e.dispoKind==='meter'&&e.measurementOwner===owner),meter=p.elements.find(e=>e.id===old?.id);if(!old||!meter)return false;
 const cabinet=before.elements.find(c=>c.dispoStructure&&old.x>=c.x&&old.x<c.x+c.width*f);if(!cabinet)return false;
 const px=(meter.x-cabinet.x)/f+125,py=(meter.y-cabinet.y)/f+200;
 const target=cabinet.dispoStructure.find(s=>['meter','slots','cover'].includes(s.plateType)&&s.height===400&&px>=s.x&&px<s.x+s.width&&py>=s.y&&py<s.y+s.height);if(!target)return false;
 const tx=cabinet.x+(target.x+Math.floor((px-target.x)/250)*250)*f,ty=cabinet.y+target.y*f,dx=tx-old.x,dy=ty-old.y;
 if(Math.abs(dx)+Math.abs(dy)<.01)return false;
 const area={x:tx,y:ty,right:tx+250*f,bottom:ty+800*f},hit=b=>b.x<area.right-.01&&b.right>area.x+.01&&b.y<area.bottom-.01&&b.bottom>area.y+.01,inside=b=>b.x>=area.x-.01&&b.right<=area.right+.01&&b.y>=area.y-.01&&b.bottom<=area.bottom+.01;
 const sources=before.elements.filter(e=>e.measurementOwner===owner),displaced=before.elements.filter(e=>device(e)&&e.measurementOwner!==owner&&hit(box(p,[e])));
 if(displaced.some(e=>!inside(box(p,[e])))||area.bottom>cabinet.y+(cabinet.height-400)*f+.01)throw Error('Wandlermessung benötigt zwei freie 250-mm-Module übereinander.');
 if(displaced.some(e=>e.measurementOwner&&before.elements.some(q=>q.measurementOwner===e.measurementOwner&&!displaced.includes(q))))throw Error('Eine andere Wandlermessung kann nur vollständig getauscht werden.');
 const changes=[...sources.map(e=>({...e,x:e.x+dx,y:e.y+dy})),...displaced.map(e=>({...e,x:e.x-dx,y:e.y-dy}))];
 const others=before.elements.filter(e=>device(e)&&!changes.some(q=>q.id===e.id));for(const e of changes){const b=box(p,[e]);if(others.some(q=>{const a=box(p,[q]);return b.x<a.right-.01&&b.right>a.x+.01&&b.y<a.bottom-.01&&b.bottom>a.y+.01;}))throw Error('Am Ziel ist nicht genügend Platz für die gesamte Messgruppe.');}
 const sx=(old.x-cabinet.x)/f,sy=(old.y-cabinet.y)/f,xx=(tx-cabinet.x)/f,yy=(ty-cabinet.y)/f,structure=[];
 for(const part of cabinet.dispoStructure){const src=part.x>=sx-.01&&part.x+part.width<=sx+250+.01&&part.y>=sy-.01&&part.y+part.height<=sy+800+.01;const dest=part.x>=xx-.01&&part.x+part.width<=xx+250+.01&&part.y>=yy-.01&&part.y+part.height<=yy+800+.01;if(src)structure.push({...part,x:part.x+dx/f,y:part.y+dy/f});else if(dest)structure.push({...part,x:part.x-dx/f,y:part.y-dy/f});else if((part.plateType||part.profile==='AS35')&&part.y>=yy-.01&&part.y+part.height<=yy+800+.01&&part.x<xx+250-.01&&part.x+part.width>xx+.01){const l=Math.max(part.x,xx),r=Math.min(part.x+part.width,xx+250);if(part.x<l-.01)structure.push({...part,width:l-part.x});if(part.x+part.width>r+.01)structure.push({...part,x:r,width:part.x+part.width-r});structure.push({...part,x:l-dx/f,y:part.y-dy/f,width:r-l});}else structure.push(structuredClone(part));}
 p.elements.find(e=>e.id===cabinet.id).dispoStructure=structure;for(const e of changes)Object.assign(p.elements.find(q=>q.id===e.id),{x:e.x,y:e.y});alignMeterFuses(p);return true;
}
