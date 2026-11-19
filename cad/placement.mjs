import {manualInterior} from './dispo-parts.mjs?v=20261119-6';
import {snapDispo} from './drawing-tools.mjs?v=20261119-6';
import {alignMacro} from './alignment.mjs?v=20261119-6';
import {DRAW,BUS,MM,bounds} from './geometry.mjs?v=20261119-6';
import {createElement,snap,symbols,size} from './model.mjs?v=20261119-6';
import {elementMarkup} from './render.mjs?v=20261119-6';
export function placement(page,kind,point,grid=true,rotation=0,template=null,autoConnect=true,options={}){
 if(!point||!symbols[kind]||point.x<DRAW.left||point.x>DRAW.right||point.y<DRAW.top||point.y>DRAW.bottom)return null;
 if(kind==='template'&&!template)return null;
 const e=createElement(page,kind,point.x,point.y);
 if(template&&kind==='template'){e.template=template;e.width=template.width;e.height=template.height;}
 if(options.dimensions){const {width,height}=options.dimensions;if(!Number.isFinite(width)||!Number.isFinite(height)||width<.001||height<.001||width>10000||height>10000)return null;e.width=width;e.height=height;}
 e.x=snap(point.x,grid);e.y=snap(point.y,grid);e.rotation=rotation;
 const anchor=page.type==='dispo'?placementAnchors[options.anchor]:null;
 if(anchor){const b=bounds(e,...size(e,page));e.x+=snap(point.x,grid)-(b.left+(b.right-b.left)*anchor[0]);e.y+=snap(point.y,grid)-(b.top+(b.bottom-b.top)*anchor[1]);}
 if(kind==='template'){
  const [w,h]=size(e,page),port=template.ports?.[0];
  e.autoConnect=Boolean(autoConnect&&page.type==='schema'&&page.bus&&port&&rotation===0);
  if(e.autoConnect){e.x=snap(point.x,grid)-port.x*w/template.viewWidth;e.y=BUS[port.phase]-port.y*h/template.viewHeight;}
  if(autoConnect)alignMacro(e,page);
  const b=bounds(e,w,h);if(b.right-b.left>DRAW.right-DRAW.left||b.bottom-b.top>DRAW.bottom-DRAW.top)return null;
  e.x+=Math.max(0,DRAW.left-b.left)-Math.max(0,b.right-DRAW.right);
  e.y+=Math.max(0,DRAW.top-b.top)-Math.max(0,b.bottom-DRAW.bottom);
 }
 if(anchor&&kind!=='template'){const b=bounds(e,...size(e,page));if(b.right-b.left>DRAW.right-DRAW.left||b.bottom-b.top>DRAW.bottom-DRAW.top)return null;e.x+=Math.max(0,DRAW.left-b.left)-Math.max(0,b.right-DRAW.right);e.y+=Math.max(0,DRAW.top-b.top)-Math.max(0,b.bottom-DRAW.bottom);}
 let insideBounds=null;
 if(options.clip){
  // A pointer inside a frame places the complete part inside that frame.
  // The four millimetre SBR side profiles are outside the usable plate width.
  if(page.type==='dispo'&&e.kind!=='cabinet'){
   const frames=page.elements.filter(f=>f.kind==='cabinet'&&!f.rotation).map(f=>({f,b:bounds(f,...size(f,page))})).filter(({b})=>point.x>=b.left&&point.x<=b.right&&point.y>=b.top&&point.y<=b.bottom).sort((a,b)=>(a.b.right-a.b.left)*(a.b.bottom-a.b.top)-(b.b.right-b.b.left)*(b.b.bottom-b.b.top));
   if(frames.length){const {f,b}=frames[0],inset=f.frameStyle==='drahtwerk'?4*MM/page.scale:0,own=bounds(e,...size(e,page));const interior=manualInterior(f),factor=MM/page.scale;if(interior){b.right=b.left+interior.right*factor;b.bottom=b.top+interior.bottom*factor;b.left+=interior.left*factor;b.top+=interior.top*factor;}else{b.left+=inset;b.right-=inset;}
    if(own.right-own.left<=b.right-b.left&&own.bottom-own.top<=b.bottom-b.top){insideBounds=b;e.x+=Math.max(0,b.left-own.left)-Math.max(0,own.right-b.right);e.y+=Math.max(0,b.top-own.top)-Math.max(0,own.bottom-b.bottom);}
   }
  }
  let guides=snapDispo(e,page,options.tolerance??10);if(insideBounds){const b=insideBounds,own=bounds(e,...size(e,page)),dx=Math.max(0,b.left-own.left)-Math.max(0,own.right-b.right),dy=Math.max(0,b.top-own.top)-Math.max(0,own.bottom-b.bottom);if(dx||dy){e.x+=dx;e.y+=dy;guides=null;}}if(guides)Object.defineProperty(e,'snapGuides',{value:guides,enumerable:false});
 }
 const box=bounds(e,...size(e,page));if(box.left<DRAW.left-1e-6||box.right>DRAW.right+1e-6||box.top<DRAW.top-1e-6||box.bottom>DRAW.bottom+1e-6)return null;
 if(anchor)Object.defineProperty(e,'insertionPoint',{value:{x:box.left+(box.right-box.left)*anchor[0],y:box.top+(box.bottom-box.top)*anchor[1]},enumerable:false});
 return e;
}
export const placementAnchors={'bottom-left':[0,1],'bottom-right':[1,1],'top-left':[0,0],'top-right':[1,0],center:[.5,.5]};
export function placementMarkup(e,page,doc){if(!e)return '';const q=e.insertionPoint||e;return `<g id="placementPreview" opacity=".6" pointer-events="none" aria-hidden="true"><g fill="none" stroke="#2463eb" stroke-width="1.4">${elementMarkup(e,page,doc)}</g>${snapGuidesMarkup(e.snapGuides)}<path d="M${q.x-7} ${q.y}h14 M${q.x} ${q.y-7}v14" stroke="#2463eb" stroke-width="1" fill="none"/><circle cx="${q.x}" cy="${q.y}" r="2" fill="#2463eb"/></g>`;}

export function snapGuidesMarkup(g){return g?`<g stroke="#1688a0" stroke-width=".8" stroke-dasharray="4 3" pointer-events="none">${g.x===null?'':`<path d="M${g.x} ${DRAW.top}V${DRAW.bottom}"/>`}${g.y===null?'':`<path d="M${DRAW.left} ${g.y}H${DRAW.right}"/>`}</g>`:'';}
