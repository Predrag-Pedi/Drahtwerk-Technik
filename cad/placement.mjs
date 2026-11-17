import {snapDispo} from './drawing-tools.mjs?v=20261117-5';
import {alignMacro} from './alignment.mjs?v=20261117-5';
import {DRAW,BUS,bounds} from './geometry.mjs?v=20261117-5';
import {createElement,snap,symbols,size} from './model.mjs?v=20261117-5';
import {elementMarkup} from './render.mjs?v=20261117-5';
export function placement(page,kind,point,grid=true,rotation=0,template=null,autoConnect=true,options={}){
 if(!point||!symbols[kind]||point.x<DRAW.left||point.x>DRAW.right||point.y<DRAW.top||point.y>DRAW.bottom)return null;
 if(kind==='template'&&!template)return null;
 const e=createElement(page,kind,point.x,point.y);
 if(template&&kind==='template'){e.template=template;e.width=template.width;e.height=template.height;}
 if(options.dimensions){const {width,height}=options.dimensions;if(!Number.isFinite(width)||!Number.isFinite(height)||width<.001||height<.001||width>10000||height>10000)return null;e.width=width;e.height=height;}
 e.x=snap(point.x,grid);e.y=snap(point.y,grid);e.rotation=rotation;
 if(kind==='template'){
  const [w,h]=size(e,page),port=template.ports?.[0];
  e.autoConnect=Boolean(autoConnect&&page.type==='schema'&&page.bus&&port&&rotation===0);
  if(e.autoConnect){e.x=snap(point.x,grid)-port.x*w/template.viewWidth;e.y=BUS[port.phase]-port.y*h/template.viewHeight;}
  if(autoConnect)alignMacro(e,page);
  const b=bounds(e,w,h);if(b.right-b.left>DRAW.right-DRAW.left||b.bottom-b.top>DRAW.bottom-DRAW.top)return null;
  e.x+=Math.max(0,DRAW.left-b.left)-Math.max(0,b.right-DRAW.right);
  e.y+=Math.max(0,DRAW.top-b.top)-Math.max(0,b.bottom-DRAW.bottom);
 }
 if(options.clip){const guides=snapDispo(e,page,options.tolerance??10);if(guides)Object.defineProperty(e,'snapGuides',{value:guides,enumerable:false});}
 const box=bounds(e,...size(e,page));if(box.left<DRAW.left||box.right>DRAW.right||box.top<DRAW.top||box.bottom>DRAW.bottom)return null;
 return e;
}
export function placementMarkup(e,page,doc){if(!e)return '';return `<g id="placementPreview" opacity=".6" pointer-events="none" aria-hidden="true"><g fill="none" stroke="#2463eb" stroke-width="1.4">${elementMarkup(e,page,doc)}</g>${snapGuidesMarkup(e.snapGuides)}<path d="M${e.x-7} ${e.y}h14 M${e.x} ${e.y-7}v14" stroke="#2463eb" stroke-width="1" fill="none"/><circle cx="${e.x}" cy="${e.y}" r="2" fill="#2463eb"/></g>`;}

export function snapGuidesMarkup(g){return g?`<g stroke="#1688a0" stroke-width=".8" stroke-dasharray="4 3" pointer-events="none">${g.x===null?'':`<path d="M${g.x} ${DRAW.top}V${DRAW.bottom}"/>`}${g.y===null?'':`<path d="M${DRAW.left} ${g.y}H${DRAW.right}"/>`}</g>`:'';}
