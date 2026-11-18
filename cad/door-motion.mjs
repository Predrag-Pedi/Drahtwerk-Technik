// A single animation clock with independent, interruptible field transitions.
export function createDoorMotion({angles:initial,limits,onChange,now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id),reducedMotion=()=>false}){
 const angles={...initial},transitions=new Map();let pending=null,closed=false;
 const sample=time=>{for(const [id,t]of transitions){const progress=Math.max(0,Math.min(1,(time-t.start)/t.duration)),ease=progress*progress*(3-2*progress);angles[id]=progress===1?t.to:t.from+(t.to-t.from)*ease;if(progress===1)transitions.delete(id);}};
 const queue=()=>{if(!closed&&pending===null&&transitions.size)pending=requestFrame(tick);};
 function tick(time){pending=null;if(closed)return;sample(time);onChange({...angles},transitions.size>0);queue();}
 function target(ids,value,immediate=false){
  if(closed||!Number.isFinite(value))return;const time=now();sample(time);
  for(const id of ids){if(!(id in angles))continue;const to=Math.max(0,Math.min(limits[id],value));
   if(immediate||reducedMotion()){transitions.delete(id);angles[id]=to;}
   else if(transitions.get(id)?.to!==to){const distance=Math.abs(to-angles[id]);if(distance<.001){angles[id]=to;transitions.delete(id);}else transitions.set(id,{from:angles[id],to,start:time,duration:300+distance*4});}
  }
  if(!transitions.size&&pending!==null){cancelFrame(pending);pending=null;}
  onChange({...angles},transitions.size>0);queue();
 }
 return {animate:(ids,value)=>target(ids,value),set:(ids,value)=>target(ids,value,true),destroy(){closed=true;if(pending!==null)cancelFrame(pending);pending=null;transitions.clear();}};
}
