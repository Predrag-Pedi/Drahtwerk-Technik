import frames from './macro-frames.mjs?v=20261113-6';
import {MM,BUS,DRAW,bounds} from './geometry.mjs?v=20261113-6';
export function frame(e){const t=e.template,f=frames[t?.id];return f&&t.category==='Schema'&&Math.abs(f.viewWidth-t.viewWidth)<.01&&Math.abs(f.viewHeight-t.viewHeight)<.01?f:null;}
export function macroScale(e){const f=frame(e);return f?{x:MM*e.width/e.template.width,y:MM*e.height/e.template.height}:null;}
export function sourcePoint(e,x,y){const f=frame(e),s=macroScale(e);return {x:e.x+(f.x/f.unit+x)*s.x,y:e.y+(f.y/f.unit-y)*s.y};}
function fits(e){const f=frame(e),s=macroScale(e),b=bounds(e,f.viewWidth/f.unit*s.x,f.viewHeight/f.unit*s.y);return b.left>=DRAW.left&&b.right<=DRAW.right&&b.top>=DRAW.top&&b.bottom<=DRAW.bottom;}
// Match every free branch input to the same macro, with the same conductor identity.
export function alignMacro(e,page,tolerance=45){
 const f=frame(e);if(!f||e.rotation!==0||page.type!=='schema')return false;
 const s=macroScale(e);if(!f.inputs.length)return false;
 let best=null;
 for(const parent of page.elements){
  const target=frame(parent);if(parent.id===e.id||!target||parent.rotation!==0)continue;
  const ps=macroScale(parent);if(Math.abs(ps.x-s.x)>1e-5||Math.abs(ps.y-s.y)>1e-5)continue;
  for(const line of target.lines){
   const input=f.inputs[0];if(line.phase!==input.phase||Math.abs(line.x1-line.x2)>1e-5)continue;
   const p=sourcePoint(parent,line.x1,input.y),local=sourcePoint({...e,x:0,y:0},input.x,input.y);
   const candidate={...e,x:p.x-local.x,y:p.y-local.y};
   const distance=Math.hypot(candidate.x-e.x,candidate.y-e.y);
   if(distance>tolerance||best&&distance>=best.distance||!fits(candidate))continue;
   if(!f.inputs.every(i=>{const q=sourcePoint(candidate,i.x,i.y);return target.lines.some(l=>{if(l.phase!==i.phase||Math.abs(l.x1-l.x2)>1e-5)return false;const a=sourcePoint(parent,l.x1,l.y1),b=sourcePoint(parent,l.x2,l.y2);return Math.abs(q.x-a.x)<.05&&q.y>=Math.min(a.y,b.y)-.05&&q.y<=Math.max(a.y,b.y)+.05;});}))continue;
   best={...candidate,distance};
  }
 }
 if(!best)return false;e.x=best.x;e.y=best.y;return true;
}
export function alignPage(page){
 let count=0;
 for(const e of page.elements){const f=frame(e);if(!f||e.rotation!==0||!e.autoConnect||!page.bus||page.type!=='schema')continue;const port=e.template.ports?.[0];if(!port)continue;const s=macroScale(e),next={...e,y:BUS[port.phase]-port.y/f.unit*s.y};if(fits(next)&&Math.abs(e.y-next.y)>.001){e.y=next.y;count++;}}
 for(const e of page.elements){const before=[e.x,e.y];if(alignMacro(e,page,150)&&(Math.abs(e.x-before[0])>.001||Math.abs(e.y-before[1])>.001))count++;}
 return count;
}
