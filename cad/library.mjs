export const libraryName=s=>String(s).replace(/^\d+[_-]?|^[A-Z]\d(?=[A-ZÄÖÜ])/,'').replaceAll('_',' ');
export function filterLibrary(items,{query='',category='',group='',scope='all',favorites=[],recent=[]}={}){
 const words=query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
 const result=items.filter(t=>(!category||t.category===category)&&(!group||t.group===group)&&(scope!=='favorites'||favorites.includes(t.id))&&(scope!=='recent'||recent.includes(t.id))&&words.every(w=>`${t.name} ${t.group} ${t.source}`.toLocaleLowerCase('de').includes(w)));
 return scope==='recent'?result.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id)):result;
}
export function rememberTemplate(recent,id){return [id,...recent.filter(x=>x!==id)].slice(0,24);}
export function readLibrarySettings(storage){try{const v=JSON.parse(storage.getItem('cad-library-settings')||'{}');return {favorites:Array.isArray(v.favorites)?v.favorites.filter(x=>typeof x==='string').slice(0,2000):[],recent:Array.isArray(v.recent)?v.recent.filter(x=>typeof x==='string').slice(0,24):[]};}catch{return {favorites:[],recent:[]};}}
