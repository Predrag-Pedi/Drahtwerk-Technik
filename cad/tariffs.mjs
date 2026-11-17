import {templateSize} from './template.mjs?v=20261117-3';
import {localPoint} from './geometry.mjs?v=20261117-3';
import {functionBmk,referenceLocation} from './references.mjs?v=20261117-3';
import {rseLegend} from './rse.mjs?v=20261117-3';
// Audited text anchors in the original 200_Messung macros. Never infer
// tariff connections from power ports, proximity, or a printed page number.
const inputs={'tl-0007':[17,18,19,20,21,22],'tl-0011':[17,18,19,20,21,22],'tl-0012':[21,22,23,24,25,26],'tl-0013':[5,6,7,8,9,10]};
export function tariffInputs(e){const keys=inputs[e.template?.id];return keys?[0,1].map(input=>({input,label:'t'+keys[input*3],reference:'t'+keys[input*3+1],star:'t'+keys[input*3+2]})):[];}
export const tariffOutputs=e=>e.template?.id==='tl-0014'?[0,1,2,3,4,5]:[];
export const tariffKey=e=>e.template?.labels?.find(l=>l.letter==='P')?.key;
export function tariffDevices(doc,source=false){return doc.pages.filter(p=>p.type==='schema').flatMap(page=>page.elements.filter(e=>(source?tariffOutputs(e):tariffInputs(e)).length).map(element=>({page,element})));}
export function tariffName(doc,p,e){const key=tariffKey(e),description=e.functions?.[key]?.description;return functionBmk(doc,p,e,key)+(description?' · '+description:'');}
export function tariffOutputName(e,output){const row=rseLegend(e)[output];return `${output} · ${row?(e.textEdits?.[row.key]??row.text):''}`;}
export function tariffSource(doc,ref){if(!ref)return null;const page=doc.pages.find(p=>p.id===ref.page&&p.type==='schema'),element=page?.elements.find(e=>e.id===ref.element);return element&&tariffOutputs(element).includes(ref.output)?{page,element,output:ref.output}:null;}
export function assignTariff(doc,meter,input,source){if(!tariffInputs(meter).some(a=>a.input===input))throw Error('Unbekannter Tarifanschluss.');if(source&&!tariffSource(doc,source))throw Error('RSE-Ausgang ist nicht mehr vorhanden.');meter.tariffAssignments??={};if(source)meter.tariffAssignments[input]={page:source.page,element:source.element,output:source.output};else delete meter.tariffAssignments[input];}
export function tariffTargets(doc,page,element,output){return tariffDevices(doc).flatMap(m=>tariffInputs(m.element).filter(a=>{const r=m.element.tariffAssignments?.[a.input];return r?.page===page.id&&r.element===element.id&&r.output===output;}).map(a=>({...m,input:a.input})));}
export function validateTariffs(raw,fail){if(raw===undefined)return undefined;if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>2)return fail();const out={};for(const [k,r]of Object.entries(raw)){if(!['0','1'].includes(k)||!r||!Number.isInteger(r.output)||r.output<0||r.output>5||!['page','element'].every(k=>typeof r[k]==='string'&&r[k].length>0&&r[k].length<=100))return fail();out[k]={page:r.page,element:r.element,output:r.output};}return out;}
export function tariffTextEdits(doc,e){const edits={...e.textEdits};for(const a of tariffInputs(e)){// Remove the library's misleading fixed 1.2 / 10.7 references, including unassigned inputs.
 edits[a.reference]='';const r=tariffSource(doc,e.tariffAssignments?.[a.input]);if(r){edits[a.label]=String(r.output);edits[a.star]='';}}
 if(tariffOutputs(e).length)for(const [out,key]of [[0,'t49'],[1,'t47']])if(tariffTargets(doc,doc.pages.find(p=>p.elements.includes(e))||{},e,out).length)edits[key]='';return edits;
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function anchor(e,p,key,dx=0,dy=0){const r=e.template.details?.texts.find(t=>t.key===key)?.runs[0];if(!r)return null;const [w,h]=templateSize(e,p),o=e.textOffsets?.[key]||{x:0,y:0};return localPoint(e,w,h,(r.matrix[4]+o.x+dx)*w/e.template.viewWidth,(r.matrix[5]+o.y+dy)*h/e.template.viewHeight);}
function link(doc,target,x,y,anchor='start'){const {page,element}=target,key=tariffKey(element),ref=referenceLocation(element,page,key);return `<text x="${x}" y="${y}" font-size="9" text-anchor="${anchor}" fill="#1767aa" stroke="none" data-pdf-page="${esc(page.id)}" data-tariff-target="${esc(JSON.stringify({page:page.id,element:element.id}))}" cursor="pointer"><title>${esc(tariffName(doc,page,element))}</title>${esc(ref)}</text>`;}
export function tariffMarkup(doc,p,e){if(p.type!=='schema')return '';let result='';for(const a of tariffInputs(e)){const r=tariffSource(doc,e.tariffAssignments?.[a.input]),pt=anchor(e,p,a.star,-20,-30);if(r&&pt)result+=link(doc,r,pt.x,pt.y,'end');}
 let bottom=-Infinity;
 for(const output of tariffOutputs(e)){const targets=tariffTargets(doc,p,e,output);if(!targets.length)continue;const key=['t48','t46','t42','t43','t44','t45'][output],pt=anchor(e,p,key,260,100);if(!pt)continue;
 // Each target remains an independent PDF hit box, even on the same sheet.
 const right=Math.min(1145,...p.elements.filter(o=>o!==e&&o.x>pt.x+45).map(o=>o.x-12)),width=Math.max(45,right-pt.x),step=40,cols=Math.max(1,Math.floor(width/step)),y=Math.max(pt.y,bottom+11);
 if(y>pt.y+.5)result+=`<path d="M${pt.x-3} ${pt.y} L${pt.x} ${y} H${pt.x+3}" fill="none" stroke="#182c42" stroke-width=".6"/>`;
 targets.forEach((target,i)=>{result+=link(doc,target,pt.x+(i%cols)*step,y+Math.floor(i/cols)*11);});bottom=y+Math.floor((targets.length-1)/cols)*11;
 }return result;
}
