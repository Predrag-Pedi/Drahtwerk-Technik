export const clampZoom=value=>Math.max(.15,Math.min(8,value));
export function wheelFactor(delta,mode=0){const pixels=delta*(mode===1?16:mode===2?240:1);return Math.exp(-Math.max(-240,Math.min(240,pixels))*.0015);}
export function installNavigation({viewport,paper,getZoom,setZoom,isBusy=()=>false,isPanTool=()=>false,afterZoom=()=>{},windowTarget=window}){
 let pan=null;
 function zoomAt(value,clientX,clientY){if(pan||isBusy())return;const rect=viewport.getBoundingClientRect();clientX??=rect.left+viewport.clientWidth/2;clientY??=rect.top+viewport.clientHeight/2;const before=paper.getBoundingClientRect(),old=getZoom(),next=clampZoom(value);if(old===next)return;
  const x=(clientX-before.left)/old,y=(clientY-before.top)/old;setZoom(next);const after=paper.getBoundingClientRect();viewport.scrollLeft+=after.left+x*next-clientX;viewport.scrollTop+=after.top+y*next-clientY;afterZoom();
 }
 viewport.addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY)zoomAt(getZoom()*wheelFactor(e.deltaY,e.deltaMode),e.clientX,e.clientY);},{passive:false});
 viewport.addEventListener('pointerdown',e=>{if(e.button!==1&&!(e.button===0&&isPanTool()))return;if(isBusy()||pan)return;e.preventDefault();e.stopPropagation();pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-panning');},true);
 viewport.addEventListener('pointermove',e=>{if(!pan||e.pointerId!==pan.id)return;e.preventDefault();e.stopPropagation();viewport.scrollLeft=pan.left+pan.x-e.clientX;viewport.scrollTop=pan.top+pan.y-e.clientY;},true);
 function stop(e){if(!pan||e?.pointerId!==undefined&&e.pointerId!==pan.id)return;const id=pan.id;pan=null;viewport.classList.remove('is-panning');if(viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);e?.stopPropagation?.();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,stop,true);
 viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});windowTarget.addEventListener('blur',()=>stop());
 return {zoomAt,stop,isPanning:()=>pan!==null};
}
