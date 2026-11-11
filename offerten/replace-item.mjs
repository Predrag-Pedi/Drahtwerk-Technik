import {line} from './core.mjs?v=20261111-8';
// Preserve the position identity, location and quantity; replace all article data.
export function replaceItem(items,id,snapshot,doc){
 const index=items.findIndex(i=>i.id===id);
 if(index<0)throw Error('Die zu ersetzende Position ist nicht mehr vorhanden.');
 const old=items[index],next={...structuredClone(snapshot),id:old.id,qty:old.qty};
 line(next,doc);items[index]=next;return next;
}
