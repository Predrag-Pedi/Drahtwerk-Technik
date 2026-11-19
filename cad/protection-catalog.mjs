import {protectionArticles,catalogSources,catalogDate} from './protection-articles.mjs?v=20261119-6';
import {protectionFields} from './protection-fields.mjs?v=20261119-6';
export {protectionArticles,catalogDate};
export const manufacturers={hager:'Hager',schneider:'Schneider'};
const byId=new Map(protectionArticles.map(a=>[a.id,a]));
export const articleById=id=>byId.get(id)||null;
export const articleSource=a=>a.source==='feller-live'?`https://online-katalog.feller.ch/de/product?fnr=${encodeURIComponent(a.article)}`:catalogSources[a.source].url+'#page='+a.sourcePage;
export function compatibleArticles(profile){return protectionArticles.filter(a=>a.kind===profile.kind&&(a.poles===profile.poles||a.kind==='fi'&&({'1P+N':'2P','3P+N':'4P'}[profile.poles]===a.poles||{'2P':'1P+N','4P':'3P+N'}[profile.poles]===a.poles)));}
export const articleValue=(a,field)=>field==='current'?a.current+'A':field==='residual'?a.residual+'mA':a[field]??'';
const norm=(v,field)=>['current','residual'].includes(field)?Number(String(v).match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.')):String(v).replace(/\s/g,'').toUpperCase();
export function matchingArticles(t,profile,values={}){
 const texts=t.details?.texts||[];return compatibleArticles(profile).filter(a=>Object.entries(profile.fields).every(([field,key])=>{
  if(['article','voltage'].includes(field))return true;
  const original=texts.find(x=>x.key===key)?.text||'',value=values[key]??original;
  if(['A','FI','CHARLS','CHARFI'].includes(original)&&!Object.hasOwn(values,key))return true;
  return norm(articleValue(a,field),field)===norm(value,field);
 }));
}
export function preferredArticle(list,previous={}){
 const score=a=>['manufacturer','series','current','curve','residual','rcdType','selective','icn','icu'].reduce((n,k)=>n+(a[k]===previous[k]?({manufacturer:100,series:50,current:20,curve:12,residual:10,rcdType:8,selective:6}[k]||2):0),0)+(a.icn===6?1:0);
 return [...list].sort((a,b)=>score(b)-score(a)||a.article.localeCompare(b.article))[0]||null;
}
export function articleSummary(a){return [manufacturers[a.manufacturer],a.article,a.poles,a.curve,a.current+' A',a.residual?a.residual+' mA':'',a.rcdType?'Typ '+a.rcdType:'',a.selective?'selektiv S':'',a.icn?'Icn '+a.icn+' kA':'',a.icu?'Icu '+a.icu+' kA':'',a.inc?'Inc '+a.inc+' kA (mit Vorsicherung)':'',a.voltage,a.modules?a.modules+' TE':''].filter(Boolean).join(' · ');}
export function articleForFunction(e,key){
 const a=articleById(e.functions?.[key]?.protectionArticleId),profile=a&&protectionFields(e.template).find(p=>p.key===key);
 return profile&&matchingArticles(e.template,profile,e.textEdits).some(x=>x.id===a.id)?a:null;
}
export function articleFieldOwner(e,textKey){return protectionFields(e.template).find(p=>e.functions?.[p.key]?.protectionArticleId&&Object.values(p.fields).includes(textKey));}
