import {protectionFields} from './protection-fields.mjs?v=20261119-7';
import {articleById,compatibleArticles,matchingArticles,preferredArticle,articleValue} from './protection-catalog.mjs?v=20261119-7';
import {functionData} from './references.mjs?v=20261119-7';

// Drahtwerk's supplied table, not a general ampacity calculation. No
// interpolation for ratings absent from that table (e.g. 50 A or 400 A).
export const currentSections=new Map([[8,1],[10,1.5],[13,1.5],[16,2.5],[20,4],[25,6],[32,10],[40,10],[63,16],[80,25],[100,35],[125,50],[160,70],[200,95],[250,120],[280,150],[315,185]]);
export const terminalSections=[2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300];
export const numericValue=value=>Number(String(value).match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));
export function sectionForCurrent(value,{control=false}={}){const a=numericValue(value);return currentSections.get(a)??(control&&a>0&&a<8?.75:null);}
export function terminalForCable(value){const section=parseCable(value)?.section;if(!section)return null;return terminalSections.find(n=>n>=section)??null;}
// The final number is the cross-section. Preserve type, core count, multipliers
// and unit spelling. A diameter such as G51 2x2x0.8mm is deliberately excluded.
export function parseCable(value){const text=String(value),m=/(?<prefix>\d+\s*(?:[x×gG]\s*\d+\s*)*[x×gG]\s*)(?<section>\d+(?:[.,]\d+)?)\s*mm(?:2|²)(?!\d)/i.exec(text);if(!m)return null;const start=m.index+m.groups.prefix.length;return {section:Number(m.groups.section.replace(',','.')),start,end:start+m.groups.section.length};}
export function cableWithSection(value,section){const cable=parseCable(value);return cable?String(value).slice(0,cable.start)+String(section)+String(value).slice(cable.end):value;}
export function macroFields(t){
 return (t.details?.texts||[]).filter(t=>!/^\s*(?:\d+|L[123]?|N|PE|PEN|[+-])\s*$/.test(t.text)).map(t=>{
  const value=t.text.trim();let label='Vorlagentext',primary=false;
  if(/^\d+(?:[.,]\d+)?\s*A$/i.test(value)){label='Bemessungsstrom';primary=true;}
  else if(/^[BCD]$/.test(value)){label='Charakteristik';primary=true;}
  else if(/^\d+(?:[.,]\d+)?\s*mA$/i.test(value)){label='Fehlerstrom';primary=true;}
  else if(/\d\s*[x×gG]\s*\d/i.test(value)){label='Kabel';primary=true;}
  else if(/^\d+(?:[.,]\d+)?\s*mm[²2]$/i.test(value)){label='Querschnitt';primary=true;}
  else if(/^\d+\s*V(?:AC|DC)?$/i.test(value)){label='Spannung';primary=true;}
  return {key:t.key,label,value:t.text,primary};
 });
}
const point=f=>f?.runs?.[0]?.matrix.slice(4)||f?.matrix?.slice(4)||[0,0];
const branch=key=>String(key).replace(/[A-Z]+/gi,'').split('.')[0];
const nearest=(list,p)=>[...list].sort((a,b)=>Math.hypot(...point(a).map((v,i)=>v-p[i]))-Math.hypot(...point(b).map((v,i)=>v-p[i])))[0];
export function macroBindings(t){
 const fields=macroFields(t),texts=t.details?.texts||[],labels=t.labels||[],at=key=>texts.find(f=>f.key===key),amps=fields.filter(f=>f.label==='Bemessungsstrom').map(f=>({...f,source:at(f.key),device:nearest(labels.filter(l=>['F','Q'].includes(l.letter)),point(at(f.key)))}));
 return fields.filter(f=>f.label==='Kabel').map(cable=>{
  const cp=point(at(cable.key)),terminal=nearest(labels.filter(l=>l.letter==='X'),cp),alignedTerminal=terminal&&Math.abs(point(terminal)[0]-cp[0])<t.viewWidth*.04?terminal:null;
  let candidates=alignedTerminal?amps.filter(a=>a.device&&branch(a.device.key)===branch(alignedTerminal.key)):[];
  if(candidates.length!==1){const columns=[...amps].sort((a,b)=>Math.abs(point(a.source)[0]-cp[0])-Math.abs(point(b.source)[0]-cp[0]));const first=columns[0],distance=first?Math.abs(point(first.source)[0]-cp[0]):Infinity,next=columns[1]?Math.abs(point(columns[1].source)[0]-cp[0]):Infinity;candidates=first&&(amps.length===1||distance<t.viewWidth*.15&&next-distance>t.viewWidth*.04)?[first]:[];}
  const current=candidates.length===1?candidates[0]:null;
  const sections=fields.filter(f=>f.label==='Querschnitt'&&Math.abs(point(at(f.key))[0]-cp[0])<t.viewWidth*.025&&point(at(f.key))[1]<cp[1]).sort((a,b)=>Math.abs(point(at(a.key))[1]-cp[1])-Math.abs(point(at(b.key))[1]-cp[1]));
  const section=sections[0]||null;
  return {cableKey:cable.key,currentKey:parseCable(cable.value)?current?.key||null:null,deviceKey:current?.device?.key||null,terminalKey:alignedTerminal?.key||null,sectionKey:section?.key||null,control:/steuersicherung|steuerabgang/i.test(t.name+' '+t.group),power:Boolean(parseCable(cable.value))};
 });
}
export function outgoingFields(t){
 const texts=t.details?.texts||[],fields=macroFields(t),labels=t.labels||[],out=[];
 for(const b of macroBindings(t)){
  const device=labels.find(l=>l.key===b.deviceKey),meter=device&&labels.find(l=>l.letter==='P'&&branch(l.key)===branch(device.key)),key=(meter||device)?.key;
  if(!key||out.some(o=>o.key===key))continue;
  const cable=texts.find(f=>f.key===b.cableKey),cp=point(cable),terminals=labels.filter(l=>l.key===b.terminalKey),bottom=terminals.length?Math.max(...terminals.map(l=>point(l)[1])):cp[1]-.14*t.viewHeight;
  const name=fields.find(f=>!f.primary&&Math.abs(point(texts.find(t=>t.key===f.key))[0]-cp[0])<t.viewWidth*.025&&point(texts.find(t=>t.key===f.key))[1]>bottom&&point(texts.find(t=>t.key===f.key))[1]<cp[1]);
  out.push({key,textKey:name?.key||null,value:name&&!/^[.\s-]*$/.test(name.value)?name.value:''});
 }
 if(!out.length){const key=labels.find(l=>l.letter==='P')?.key||labels.find(l=>l.letter==='F')?.key;if(key)out.push({key,textKey:null,value:''});}
 return out;
}
export function createMacroDraft(t,saved){
 if(saved)return structuredClone(saved);
 const draft={values:{},manualCables:[],side:'original',names:{}};
 for(const f of outgoingFields(t))draft.names[f.key]=f.value;
 // Keep non-power cables intact, and correct legacy 1.5 mm² terminal sizes.
 for(const f of macroFields(t).filter(f=>f.label==='Querschnitt'))if(numericValue(f.value)<2.5)draft.values[f.key]='2.5mm²';
 syncMacroCables(t,draft);return draft;
}
export function syncMacroCables(t,draft){
 const texts=t.details?.texts||[],read=key=>draft.values[key]??texts.find(t=>t.key===key)?.text??'',sections=new Map();
 for(const b of macroBindings(t)){
  if(b.currentKey&&!draft.manualCables.includes(b.cableKey)){const section=sectionForCurrent(read(b.currentKey),{control:b.control});if(section!==null)draft.values[b.cableKey]=cableWithSection(read(b.cableKey),section);}
  const section=terminalForCable(read(b.cableKey));if(section&&b.sectionKey)sections.set(b.sectionKey,Math.max(section,sections.get(b.sectionKey)||0));
 }
 for(const [key,section] of sections)draft.values[key]=section+'mm²';
 return draft;
}
export function setMacroValue(t,draft,key,value,{automatic=false}={}){
 const field=macroFields(t).find(f=>f.key===key);if(!field||typeof value!=='string'||value.length>2000)throw Error('Ungültiger Makrowert.');
 draft.values[key]=value;
 if(field.label==='Kabel'){draft.manualCables=draft.manualCables.filter(k=>k!==key);if(!automatic)draft.manualCables.push(key);}
 return syncMacroCables(t,draft);
}
export function applyMacroValues(e,values={}){
 const allowed=new Set((e.template?.details?.texts||[]).map(t=>t.key));
 for(const [key,value]of Object.entries(values)){
  if(!allowed.has(key)||typeof value!=='string'||value.length>2000)throw Error('Ungültiger Makrowert.');
  e.textEdits??={};if(value===e.template.details.texts.find(t=>t.key===key).text)delete e.textEdits[key];else e.textEdits[key]=value;
 }
 return e;
}
export function applyMacroDraft(e,draft){
 validateMacroArticles(e.template,draft);
 applyMacroValues(e,draft.values);
 for(const [key,id]of Object.entries(draft.articles||{})){if(!id)continue;const a=articleById(id);e.functions??={};const data={...functionData(e,key)};delete data.protectionArticleId;delete data.protectionSpecId;
  if(draft.manufacturerBound?.[key]!==false){data.protectionArticleId=id;data.manufacturer=a.manufacturer;}
  else {data.protectionSpecId=id;data.manufacturer='auto';}e.functions[key]=data;}
 for(const {key,textKey} of outgoingFields(e.template)){
  const name=draft.names[key]??'';if(typeof name!=='string'||name.length>200)throw Error('Abgangname darf höchstens 200 Zeichen enthalten.');
  if(!name&&!textKey)continue;
  e.functions??={};e.functions[key]={...functionData(e,key),description:name};
  if(textKey){e.functions[key].descriptionTextKey=textKey;applyMacroValues(e,{[textKey]:name});}
 }
 for(const b of macroBindings(e.template)){
  const value=draft.values[b.cableKey]??e.template.details.texts.find(t=>t.key===b.cableKey)?.text,section=terminalForCable(value);
  if(section&&b.terminalKey){e.functions??={};e.functions[b.terminalKey]={...functionData(e,b.terminalKey),terminalSection:section};}
 }
 return e;
}
// Some imported sheets have no terminal-size text. Add that annotation without
// moving terminals; existing size texts continue to use ordinary text edits.
export function extraTerminalSections(e){
 if(!Object.values(e.functions||{}).some(f=>f.terminalSection))return [];
 const result=[],seen=new Set();for(const b of macroBindings(e.template)){
  const section=e.functions?.[b.terminalKey]?.terminalSection;if(!section||b.sectionKey||seen.has(b.terminalKey))continue;seen.add(b.terminalKey);
  const label=e.template.labels.filter(l=>l.key===b.terminalKey).sort((a,b)=>point(b)[1]-point(a)[1])[0];if(label)result.push({key:b.terminalKey,section,x:label.matrix[4],y:label.matrix[5]-label.fontSize*1.6,fontSize:label.fontSize});
 }return result;
}

// Only the catalogue-aware UI opts drafts into strict article validation. Old
// projects stay readable and do not acquire a manufacturer/article silently.
export function selectMacroArticle(t,draft,key,id,{bind=true}={}){
 const profile=protectionFields(t).find(p=>p.key===key),a=articleById(id);
 if(!profile||!a||!compatibleArticles(profile).some(x=>x.id===id))throw Error('Artikel passt nicht zur Geräteart oder Polzahl der Vorlage.');
 draft.articles??={};draft.articles[key]=id;draft.manufacturerBound??={};draft.manufacturerBound[key]=bind;
 for(const [field,textKey]of Object.entries(profile.fields)){
  if(!bind&&['article','voltage'].includes(field)){draft.values[textKey]=field==='article'?'':t.details.texts.find(x=>x.key===textKey)?.text||'';continue;}
  const value=articleValue(a,field);if(value!=='')draft.values[textKey]=String(value);
 }
 return syncMacroCables(t,draft);
}
export function initializeMacroArticles(t,draft){
 draft.articles??={};draft.manufacturerBound??={};
 for(const p of protectionFields(t)){
  if(draft.articles[p.key]&&matchingArticles(t,p,draft.values).some(a=>a.id===draft.articles[p.key]))continue;
  const a=preferredArticle(matchingArticles(t,p,draft.values),{series:'Clario iC40',manufacturer:/Hager/i.test(t.name)?'hager':'schneider',current:13,curve:'C',residual:30,rcdType:'A',selective:false});
  if(a)selectMacroArticle(t,draft,p.key,a.id,{bind:false});else {draft.articles[p.key]='';draft.manufacturerBound[p.key]=false;}
 }
 return draft;
}
export function validateMacroArticles(t,draft){
 if(!draft.articles)return;
 const keys=new Set(protectionFields(t).map(p=>p.key));if(Object.keys(draft.articles).some(key=>!keys.has(key)))throw Error('Unbekannte Gerätefunktion für Katalogartikel.');
 for(const p of protectionFields(t).filter(p=>Object.hasOwn(draft.articles,p.key)))if(!draft.articles[p.key]||!matchingArticles(t,p,draft.values).some(a=>a.id===draft.articles[p.key]))throw Error(`Für ${p.key} einen passenden Katalogartikel wählen.`);
}
