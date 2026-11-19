import {MM,DRAW,bounds} from './geometry.mjs?v=20261119-6';
import {createElement,snap,size} from './model.mjs?v=20261119-6';
import {snapBox} from './drawing-tools.mjs?v=20261119-6';
import {partSpec} from './dispo-parts.mjs?v=20261119-6';

// Snap the picked point, never translate the finished part away from its start.
export function linearPartPoint(p,point,{grid=true,objectSnap=true,tolerance=8}={}){
 const q={x:snap(point.x,grid),y:snap(point.y,grid)};
 if(!objectSnap)return q;
 const {guides}=snapBox(p,{left:point.x,right:point.x,top:point.y,bottom:point.y},[],tolerance);
 return {x:guides.x??q.x,y:guides.y??q.y};
}

// The two points mark the ends of the centreline; profile width is symmetric.
export function linearPartBetween(p,type,profile,start,point){
 if(p.type!=='dispo'||!['rail','duct'].includes(type))throw Error('Kanal oder Schiene auf einer Dispo-Seite wählen.');
 if(![start?.x,start?.y,point?.x,point?.y,p.scale].every(Number.isFinite)||p.scale<=0)throw Error('Ungültige Zeichnungspunkte.');
 const vertical=Math.abs(point.y-start.y)>Math.abs(point.x-start.x),end=vertical?{x:start.x,y:point.y}:{x:point.x,y:start.y};
 const factor=MM/p.scale,length=Number((Math.abs(vertical?end.y-start.y:end.x-start.x)/factor).toFixed(9));
 if(length<10)return null;
 const spec=partSpec(type,{...profile,length,orientation:vertical?'vertical':'horizontal'});
 const element=Object.assign(createElement(p,type,0,0),spec.dimensions,spec.metadata,{rotation:spec.rotation});
 element.x=(start.x+end.x)/2-length*factor/2;
 element.y=(start.y+end.y)/2-element.height*factor/2;
 const b=bounds(element,...size(element,p)),eps=1e-7;
 const inside=b.left>=DRAW.left-eps&&b.right<=DRAW.right+eps&&b.top>=DRAW.top-eps&&b.bottom<=DRAW.bottom+eps;
 return {element,start:{x:start.x,y:start.y},end,length,inside};
}
