import {repairMask} from './template-masks.mjs?v=20261113-23';
import {pathHash,validateDetails} from './template-text.mjs?v=20261113-23';
import {frame,macroScale} from './alignment.mjs?v=20261113-23';
import {MM,pathAt,localPoint} from './geometry.mjs?v=20261113-23';
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
 return {...semantic,...(raw.details?{details:validateDetails(raw.details,fail)}:{}),id:str(raw.id),name:str(raw.name),category:raw.category==='Dispo'?'Dispo':'Schema',group:str(raw.group),source:str(raw.source),width:number(raw.width,10000),height:number(raw.height,10000),viewWidth:number(raw.viewWidth),viewHeight:number(raw.viewHeight),paths:raw.paths.map(p=>{if(typeof p.d!=='string'||!p.d.length||p.d.length>500000||!safePath.test(p.d)||(chars+=p.d.length)>5000000)fail();if(!['none','#000000','#ffffff'].includes(p.fill)||!['none','#000000','#ffffff'].includes(p.stroke)||!Number.isFinite(p.sw)||p.sw<0||p.sw>1e6)fail();return {d:p.d,fill:p.fill,stroke:p.stroke,sw:p.sw};})};
}
const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function templateMarkup(t,w,h,labelValues={},edits={},editor=false,lineHits='',offsets={}){
 const matrix=(r,key)=>{const m=[...r.matrix],o=offsets[key];if(o){m[4]+=o.x;m[5]+=o.y;}return m.join(' ');};
 const hidden=new Set((t.details?.texts||[]).filter(l=>Object.hasOwn(edits,l.key)).flatMap(l=>l.hashes));
 const graphic=t.paths.map(p=>repairMask(p,t)).filter(p=>!hidden.size||!hidden.has(pathHash(p.d))).map(p=>`<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${Math.max(p.sw,.75/Math.min(w/t.viewWidth,h/t.viewHeight))}"/>`).join('');
 let texts=(t.labels||[]).map(l=>`<text ${editor?`data-template-text="bmk:${escapeText(l.key)}" pointer-events="all"`:''} transform="matrix(${matrix(l,'bmk:'+l.key)})" font-family="Arial,sans-serif" font-size="${l.fontSize}" fill="#000000" stroke="none">${escapeText(edits['bmk:'+l.key]??labelValues[l.key]??l.text)}</text>`).join('');
 for(const l of t.details?.texts||[]){const edited=Object.hasOwn(edits,l.key);const lines=(edited?edits[l.key]:l.text).split('\n');
 if(edited)lines.forEach((text,i)=>{const r=l.runs[i]||l.runs[0];if(!r)return;texts+=`<text transform="matrix(${matrix(r,l.key)})" y="${i>=l.runs.length?i*r.fontSize*1.2:0}" font-family="Arial,sans-serif" ${t.category==='Dispo'&&t.width===250&&t.height===400&&['BMK','ORT'].includes(l.text.trim())?'text-anchor="middle"':''} font-size="${r.fontSize}" fill="#000000" stroke="none">${escapeText(text)}</text>`;});
 if(editor)l.runs.forEach((r,i)=>{const len=Math.max(r.text.length,lines[i]?.length||0,1);texts+=`<rect data-template-text="${escapeText(l.key)}" transform="matrix(${matrix(r,l.key)})" x="0" y="${-r.fontSize}" width="${len*r.fontSize*.63}" height="${r.fontSize*1.25}" fill="transparent" stroke="none" pointer-events="all"/>`;});
 }
 return `<svg width="${w}" height="${h}" viewBox="0 0 ${t.viewWidth} ${t.viewHeight}" overflow="visible" preserveAspectRatio="none"><g stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd">${graphic}${lineHits}${texts}</g></svg>`;
}
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
