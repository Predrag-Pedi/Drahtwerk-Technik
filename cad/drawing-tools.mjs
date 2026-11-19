import {manualInterior} from './dispo-parts.mjs?v=20261119-6';
import {MM,DRAW,bounds,localPoint} from './geometry.mjs?v=20261119-6';
import {size,createElement} from './model.mjs?v=20261119-6';

const drawable=e=>['cabinet','plate','rail','duct','module'].includes(e.kind)||e.kind==='template'&&e.template?.category==='Dispo';
export const elementBox=(e,p)=>bounds(e,...size(e,p));
const union=bs=>({left:Math.min(...bs.map(b=>b.left)),right:Math.max(...bs.map(b=>b.right)),top:Math.min(...bs.map(b=>b.top)),bottom:Math.max(...bs.map(b=>b.bottom))});
// Tolerance is in drawing units, supplied from screen pixels by the UI.
export function snapBox(p,box,excluded=[],tolerance=10){
 let dx=0,dy=0,bestX=Infinity,bestY=Infinity,gx=null,gy=null;
 const candidates=(a,b,c,d)=>[[a,c,0],[a,d,0],[b,c,0],[b,d,0],[(a+b)/2,(c+d)/2,1]];
 for(const e of p.elements){if(excluded.includes(e.id)||!drawable(e))continue;const b=elementBox(e,p),rank=e.kind==='cabinet'?2:0;
  if(e.kind==='cabinet'&&!e.rotation){const m=manualInterior(e),f=MM/p.scale;if(m){b.right=b.left+m.right*f;b.bottom=b.top+m.bottom*f;b.left+=m.left*f;b.top+=m.top*f;}else if(e.frameStyle==='drahtwerk'){b.left+=4*f;b.right-=4*f;}}
  // Edges clip to edges; only centres align to centres. Neighbouring devices
  // take precedence over the enclosing cabinet, whose width may include margins.
  if(box.bottom>=b.top-tolerance&&box.top<=b.bottom+tolerance)for(const [own,x,type] of candidates(box.left,box.right,b.left,b.right)){const d=x-own,score=(rank+type)*(tolerance+1)+Math.abs(d);if(Math.abs(d)<=tolerance&&score<bestX){bestX=score;dx=d;gx=x;}}
  if(box.right>=b.left-tolerance&&box.left<=b.right+tolerance)for(const [own,y,type] of candidates(box.top,box.bottom,b.top,b.bottom)){const d=y-own,score=(rank+type)*(tolerance+1)+Math.abs(d);if(Math.abs(d)<=tolerance&&score<bestY){bestY=score;dy=d;gy=y;}}
 }
 if(box.left+dx<DRAW.left||box.right+dx>DRAW.right){dx=0;gx=null;}
 if(box.top+dy<DRAW.top||box.bottom+dy>DRAW.bottom){dy=0;gy=null;}
 return {dx,dy,guides:{x:gx,y:gy}};
}
export function snapDispo(e,p,tolerance=10){
 if(p.type!=='dispo'||!drawable(e))return null;
 const r=snapBox(p,elementBox(e,p),[e.id],tolerance);e.x+=r.dx;e.y+=r.dy;return r.guides;
}
export function snapMove(p,before,items,dx,dy,tolerance=10){
 if(p.type!=='dispo'||items.some(s=>s.kind!=='element'))return {dx,dy};
 const ids=items.map(s=>s.id),moving=before.elements.filter(e=>ids.includes(e.id));if(!moving.length||moving.some(e=>!drawable(e)))return {dx,dy};
 // Coupled parts travel with their owner and must not become snap targets.
 const owners=new Set(moving.map(e=>e.measurementOwner).filter(Boolean));
 const exclude=before.elements.filter(e=>ids.includes(e.id)||owners.has(e.measurementOwner)||moving.some(m=>m.frameStyle==='incoming-terminal'&&e.dispoKind==='spd'&&m.spdCoupled!==false)).map(e=>e.id);
 const box=union(moving.map(e=>elementBox({...e,x:e.x+dx,y:e.y+dy},p))),r=snapBox(before,box,exclude,tolerance);
 return {dx:dx+r.dx,dy:dy+r.dy,guides:r.guides};
}
export function nearestDrawingPoint(p,pt,tolerance=10){
 let best={...pt},distance=tolerance;
 for(const e of p.elements){if(e.kind==='dimension')continue;const [w,h]=size(e,p);
  for(const [x,y] of [[0,0],[w,0],[0,h],[w,h],[w/2,0],[w/2,h],[0,h/2],[w,h/2]]){const q=localPoint(e,w,h,x,y),d=Math.hypot(q.x-pt.x,q.y-pt.y);if(d<distance){distance=d;best={...q,ref:{element:e.id,local:{x:w?x/w:0,y:h?y/h:0}}};}}
 }return best;
}
export function makeDimension(p,a,b,c,axis='auto'){
 const vertical=axis==='vertical'||axis==='auto'&&Math.abs(b.y-a.y)>Math.abs(b.x-a.x);
 if(Math.abs(vertical?b.y-a.y:b.x-a.x)<.01)return null;
 const e=createElement(p,'dimension',0,0);e.x=Math.min(a.x,b.x);e.y=Math.min(a.y,b.y);
 e.width=Math.max(1,Math.abs(b.x-a.x));e.height=Math.max(1,Math.abs(b.y-a.y));
 e.measure={a:{x:a.x-e.x,y:a.y-e.y},b:{x:b.x-e.x,y:b.y-e.y},axis:vertical?'vertical':'horizontal',offset:(vertical?c.x-e.x:c.y-e.y)};
 return e;
}
export function dimensionGeometry(e,p){
 const m=e.measure;if(!m)return null;const {a,b,offset:o}=m,v=m.axis==='vertical';
 const value=Math.abs(v?b.y-a.y:b.x-a.x)/MM*(p.type==='dispo'?p.scale:1);
 const text=`${Number(value.toFixed(1)).toLocaleString('de-CH')} mm`;
 return {text,vertical:v,x:v?o-7:(a.x+b.x)/2,y:v?(a.y+b.y)/2:o-7,
  path:v?`M${a.x} ${a.y}H${o} M${b.x} ${b.y}H${o} M${o} ${a.y}V${b.y} M${o-3} ${a.y+3}l6 -6 M${o-3} ${b.y+3}l6 -6`:`M${a.x} ${a.y}V${o} M${b.x} ${b.y}V${o} M${a.x} ${o}H${b.x} M${a.x-3} ${o+3}l6 -6 M${b.x-3} ${o+3}l6 -6`};
}
export function validateMeasure(m,fail){if(m===undefined)return {};if(!m||!['horizontal','vertical'].includes(m.axis))fail();const n=v=>Number.isFinite(v)&&Math.abs(v)<=20000?v:fail();return {measure:{axis:m.axis,offset:n(m.offset),a:{x:n(m.a?.x),y:n(m.a?.y)},b:{x:n(m.b?.x),y:n(m.b?.y)}}};}
export function orthogonalRoute(points,verticalFirst=false){
 const out=[];for(const b of points){const a=out.at(-1);if(a&&a.x!==b.x&&a.y!==b.y)out.push(verticalFirst?{x:a.x,y:b.y}:{x:b.x,y:a.y});if(!a||a.x!==b.x||a.y!==b.y)out.push({x:b.x,y:b.y});}
 // Remove collinear vertices; an actual reversal is rejected by the bundle builder.
 return out.filter((p,i)=>!i||i===out.length-1||!((out[i-1].x===p.x&&p.x===out[i+1].x||out[i-1].y===p.y&&p.y===out[i+1].y)&&((p.x-out[i-1].x)*(out[i+1].x-p.x)+(p.y-out[i-1].y)*(out[i+1].y-p.y)>=0)));
}
export function parallelRoutes(points,count=1,spacing=5*MM,verticalFirst=false){
 const route=orthogonalRoute(points,verticalFirst);if(route.length<2)return [];
 if(!Number.isInteger(count)||count<1||count>5||!Number.isFinite(spacing)||spacing<=0)throw Error('Ungültiger Leitungsabstand.');
 const normals=route.slice(1).map((b,i)=>{const a=route[i],d=Math.hypot(b.x-a.x,b.y-a.y);return {x:-(b.y-a.y)/d,y:(b.x-a.x)/d};});
 const result=Array.from({length:count},(_,i)=>route.map((p,j)=>{const a=normals[Math.max(0,j-1)],b=normals[Math.min(j,normals.length-1)],off=i*spacing;
  if(j>0&&j<route.length-1&&a.x*b.x+a.y*b.y<-.9)throw Error('Leitungszug nicht unmittelbar zurückführen.');
  return {x:p.x+(a.x===b.x?a.x:a.x+b.x)*off,y:p.y+(a.y===b.y?a.y:a.y+b.y)*off};
 }));
 // A corner shorter than the outside offset would reverse a conductor.
 for(const r of result)for(let j=1;j<r.length;j++)if((r[j].x-r[j-1].x)*(route[j].x-route[j-1].x)+(r[j].y-r[j-1].y)*(route[j].y-route[j-1].y)<=0)throw Error('Mehr Platz für den Leitungsbogen lassen.');
 return result;
}
