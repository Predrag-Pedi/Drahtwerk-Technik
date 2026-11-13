const factor=p=>1200/420/p.scale;
const device=e=>!!e.dispoSource;
const box=(p,es)=>({x:Math.min(...es.map(e=>e.x)),y:Math.min(...es.map(e=>e.y)),right:Math.max(...es.map(e=>e.x+e.width*factor(p))),bottom:Math.max(...es.map(e=>e.y+e.height*factor(p)))});
export function dispoGroup(p,id){const e=p.elements.find(e=>e.id===id);if(!device(e||{})||e.dispoKind==='meter')return e?[e]:[];return p.elements.filter(q=>device(q)&&q.dispoKind!=='meter'&&q.frameStyle===e.frameStyle&&Math.abs(q.y-e.y)<.1&&(e.circuitName?q.circuitName===e.circuitName:q.dispoSource.element===e.dispoSource.element&&q.dispoSource.page===e.dispoSource.page));}
export function moveDispoElements(p,ids,dx,dy){
 const moving=p.elements.filter(e=>ids.has(e.id)),before=moving.some(e=>e.dispoKind==='meter')?structuredClone(p.elements):null;
 if(p.type==='dispo'){const mm=1/factor(p),meters=moving.filter(e=>e.dispoKind==='meter'&&e.width===250&&e.height===400);for(const c of p.elements.filter(q=>q.dispoStructure))for(const part of c.dispoStructure)if(part.plateType==='meter'&&meters.some(e=>Math.abs(c.x+part.x/mm-e.x)<.01&&Math.abs(c.y+part.y/mm-e.y)<.01)){part.x+=dx*mm;part.y+=dy*mm;}}
 for(const e of moving){e.x+=dx;e.y+=dy;}
 if(before)try{alignMeterFuses(p);}catch(error){p.elements=before;throw error;}
}
// Called at drop, with a pre-drag snapshot. Swaps whole plates or explicitly selected
// device groups, preserving their internal offsets. Failed fits leave both untouched.
export function swapDispoDrop(p,before,items){
 if(p.type!=='dispo'||!items.length||items.some(s=>s.kind!=='element'))return false;
 const ids=new Set(items.map(s=>s.id)),moving=p.elements.filter(e=>ids.has(e.id));if(moving.some(e=>!device(e)||e.rotation))return false;
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
 for(const e of changes)Object.assign(p.elements.find(q=>q.id===e.id),{x:e.x,y:e.y});alignMeterFuses(p);return true;
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
  Object.assign(moved,{x:target.x,y:target.y});for(const e of changes)Object.assign(p.elements.find(q=>q.id===e.id),{x:e.x,y:e.y});alignMeterFuses(p);return true;
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
  positions.set(e,center-(column[0]===meter?e.width*f:0));
 }
 // Preserve independent bottom equipment whenever it still fits. When a moved
 // feeder occupies its old place, relocate the entire three-pole assembly.
 for(const c of p.elements.filter(e=>e.kind==='cabinet')){
  const within=e=>e.x>=c.x-.01&&e.x+e.width*f<=c.x+c.width*f+.01&&e.y>=c.y&&e.y<c.y+c.height*f;
  const occupied=[...positions].filter(([e])=>within(e)).map(([e,x])=>({x,w:e.width*f}));
  const groups=new Map();for(const e of p.elements.filter(e=>within(e)&&!e.meterSource&&(e.dispoKind==='fuse'||e.incoming))){const key=JSON.stringify(e.dispoSource)||e.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
  for(const group of groups.values()){
   const e=group[0],w=e.width*f;let x=e.x;
   if(occupied.some(b=>x<b.x+b.w-.01&&x+w>b.x+.01)){
    x=c.x+21*f;for(const b of [...occupied].sort((a,b)=>a.x-b.x)){if(x+w<=b.x+.01)break;x=Math.max(x,b.x+b.w);}
    if(x+w>c.x+(c.width-12)*f)throw Error('Kein Platz für die Bezügersicherungen an den neuen Zählerpositionen.');
   }
   occupied.push({x,w});for(const part of group)positions.set(part,x);
  }
 }
 for(const [e,x] of positions)e.x=x;

}
