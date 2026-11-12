import {createElement,snap,symbols} from './model.mjs?v=20261112-1';
import {elementMarkup} from './render.mjs?v=20261112-1';
export function placement(page,kind,point,grid=true,rotation=0){
 if(!point||!symbols[kind]||point.x<25||point.x>1175||point.y<35||point.y>760)return null;
 const e=createElement(page,kind,point.x,point.y);
 e.x=snap(point.x,grid);e.y=snap(point.y,grid);e.rotation=rotation;
 return e;
}
export function placementMarkup(e,page,doc){if(!e)return '';return `<g id="placementPreview" opacity=".6" pointer-events="none" aria-hidden="true"><g fill="none" stroke="#2463eb" stroke-width="1.4">${elementMarkup(e,page,doc)}</g><path d="M${e.x-7} ${e.y}h14 M${e.x} ${e.y-7}v14" stroke="#2463eb" stroke-width="1" fill="none"/><circle cx="${e.x}" cy="${e.y}" r="2" fill="#2463eb"/></g>`;}
