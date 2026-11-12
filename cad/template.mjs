import {frame,macroScale} from './alignment.mjs?v=20261112-5';
import {MM,pathAt,localPoint} from './geometry.mjs?v=20261112-5';
const safePath=/^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/;
export function validateTemplate(raw){
 const fail=()=>{throw Error('Ungültige Vorlage');};
 const number=(v,max=1e8)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=max?v:fail();
 const str=v=>typeof v==='string'&&v.length<2000?v:fail();
 if(!raw||!Array.isArray(raw.paths)||!raw.paths.length||raw.paths.length>15000)fail();
 let chars=0;
 const finite=v=>Number.isFinite(v)&&Math.abs(v)<1e8?v:fail();
 const labels=(raw.labels||[]);if(!Array.isArray(labels)||labels.length>3000)fail();
 const ports=(raw.ports||[]);if(!Array.isArray(ports)||ports.length>100)fail();
 const semantic=raw.semanticVersion===2?{semanticVersion:2,labels:labels.map(l=>{if(!Array.isArray(l.matrix)||l.matrix.length!==6||!/^\d*[A-Z]+(?:\d+(?:\.\d+)?)?$/.test(l.text)||!/^([A-Z]+)$/.test(l.letter))fail();return {text:str(l.text),key:str(l.key),letter:l.letter,matrix:l.matrix.map(finite),fontSize:number(l.fontSize),anchor:{x:finite(l.anchor.x),y:finite(l.anchor.y)}};}),ports:ports.map(p=>{if(!['L1','L2','L3','N'].includes(p.phase))fail();return {x:finite(p.x),y:finite(p.y),phase:p.phase};})}:{};
 return {...semantic,id:str(raw.id),name:str(raw.name),category:raw.category==='Dispo'?'Dispo':'Schema',group:str(raw.group),source:str(raw.source),width:number(raw.width,10000),height:number(raw.height,10000),viewWidth:number(raw.viewWidth),viewHeight:number(raw.viewHeight),paths:raw.paths.map(p=>{if(typeof p.d!=='string'||!p.d.length||p.d.length>500000||!safePath.test(p.d)||(chars+=p.d.length)>5000000)fail();if(!['none','#000000','#ffffff'].includes(p.fill)||!['none','#000000','#ffffff'].includes(p.stroke)||!Number.isFinite(p.sw)||p.sw<0||p.sw>1e6)fail();return {d:p.d,fill:p.fill,stroke:p.stroke,sw:p.sw};})};
}
const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function templateMarkup(t,w,h,labelValues={}){return `<svg width="${w}" height="${h}" viewBox="0 0 ${t.viewWidth} ${t.viewHeight}" overflow="visible" preserveAspectRatio="none"><g stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd">${t.paths.map(p=>`<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${Math.max(p.sw,.75/Math.min(w/t.viewWidth,h/t.viewHeight))}"/>`).join('')}${(t.labels||[]).map(l=>`<text transform="matrix(${l.matrix.join(' ')})" font-family="Arial,sans-serif" font-size="${l.fontSize}" fill="#000000" stroke="none">${escapeText(labelValues[l.key]??l.text)}</text>`).join('')}</g></svg>`;}
export function templateSize(e,page){const f=frame(e),scale=macroScale(e);if(f)return [f.viewWidth/f.unit*scale.x,f.viewHeight/f.unit*scale.y];const factor=MM/(e.template.category==='Dispo'?page.scale:1);return [e.width*factor,e.height*factor];}
export function templateLabels(e,p){
 const used=new Map(),result={};
 // Derive consistently from geometry, so page renumbering, moving and Undo update labels too.
 const elements=p.elements.some(x=>x.id===e.id)?p.elements:[...p.elements,e];
 for(const item of elements){
  if(item.kind!=='template'||!item.template?.labels)continue;
  const [w,h]=templateSize(item,p),seen=new Set();
  for(const l of item.template.labels){if(seen.has(l.key))continue;seen.add(l.key);
   const anchor=localPoint(item,w,h,l.anchor.x*w/item.template.viewWidth,l.anchor.y*h/item.template.viewHeight);
   const base=`${p.number}${l.letter}${pathAt(anchor.x)}`,n=(used.get(base)||0)+1;used.set(base,n);
   if(item.id===e.id)result[l.key]=n===1?base:`${base}.${n}`;
  }
 }
 return result;
}
