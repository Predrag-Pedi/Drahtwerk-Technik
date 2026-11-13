import {alignMacro} from './alignment.mjs?v=20261113-21';
import {DRAW,BUS,bounds} from './geometry.mjs?v=20261113-21';
import {createElement,snap,symbols,size} from './model.mjs?v=20261113-21';
import {elementMarkup} from './render.mjs?v=20261113-21';
export function placement(page,kind,point,grid=true,rotation=0,template=null,autoConnect=true){
 if(!point||!symbols[kind]||point.x<DRAW.left||point.x>DRAW.right||point.y<DRAW.top||point.y>DRAW.bottom)return null;
 if(kind==='template'&&!template)return null;
 const e=createElement(page,kind,point.x,point.y);
 if(template&&kind==='template'){e.template=template;e.width=template.width;e.height=template.height;}
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
 return e;
}
export function placementMarkup(e,page,doc){if(!e)return '';return `<g id="placementPreview" opacity=".6" pointer-events="none" aria-hidden="true"><g fill="none" stroke="#2463eb" stroke-width="1.4">${elementMarkup(e,page,doc)}</g><path d="M${e.x-7} ${e.y}h14 M${e.x} ${e.y-7}v14" stroke="#2463eb" stroke-width="1" fill="none"/><circle cx="${e.x}" cy="${e.y}" r="2" fill="#2463eb"/></g>`;}
