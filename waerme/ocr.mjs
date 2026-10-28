import {hasCoil} from './symbols.mjs?v=20261028-7';
// OCR is loaded only for pages whose text layer contains no useful drawing labels.
export function needsOcr(items){const text=items.map(x=>x.str).join(' ');return !/\b\d*[FSPKYQ]\d+(?:\.\d+)*\b/i.test(text)&&items.filter(x=>/[a-zäöü]{3}/i.test(x.str)).length<4;}
const refPattern=/^[-+]?\d*[FSPKYQ]\d+(?:\.\d+)*[A-Z]?$/;
export function ocrPage(data,scale,raster){
 const words=(data.words||data.blocks?.flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words)))||[]);
 const items=words.filter(w=>w.text?.trim()).map(w=>({str:w.text.trim(),x:w.bbox.x0/scale,y:w.bbox.y1/scale,width:(w.bbox.x1-w.bbox.x0)/scale,height:(w.bbox.y1-w.bbox.y0)/scale,confidence:w.confidence,rotated:false}));
 let anchors=items.filter(w=>refPattern.test(w.str.toUpperCase())&&w.confidence>=35).map(w=>({...w,str:w.str.toUpperCase()}));
 if(anchors.some(a=>/^\d+[FSPKYQ]/.test(a.str)))anchors=anchors.filter(a=>!/^K\d+$/.test(a.str));
 const symbols={};if(raster)for(const a of anchors)if(/K\d/.test(a.str)&&hasCoil(raster,a,scale))symbols[a.str]='coil';
 const blocks=anchors.map(a=>({a,local:[]}));
 // Assign each word once; no repeated full sorts for every reference/word pair.
 for(const w of items){if(refPattern.test(w.str.toUpperCase()))continue;let chosen=null,best=Infinity;
  for(const b of blocks){const dy=w.y-b.a.y,dx=w.x+w.width/2-b.a.x-b.a.width/2;
   if(dy<(/[KS]\d/.test(b.a.str)?-55:-3)||dy>42||Math.abs(dx)>=55)continue;
   const score=dx*dx+dy*dy;if(score<best){best=score;chosen=b;}
  }if(chosen)chosen.local.push(w);
 }

 return {items,symbols,text:data.text||items.map(x=>x.str).join('\n'),ocr:true,ocrDeviceText:blocks.map(({a,local})=>[a.str,...local.toSorted((u,v)=>u.y-v.y||u.x-v.x).map(w=>w.str)].join('\n')).join('\n')};
}
// Retry only ambiguous F labels, using a narrow crop that excludes adjacent
// circuit symbols. Whole-page sparse OCR frequently turns LSC into 'ic'.
const protectiveLabel=/FI[\s/-]*LS|\bLS[BCD]?\b|\bDIII?\b|Schmelz|Sicherung|\bNH\b|\bSPD\b|T[12]\s*\/\s*T[12]/i;
export function refinementTargets(page){return page.items.filter(a=>/^\d*F\d+(?:\.\d+)*$/i.test(a.str)&&a.confidence>=35).filter(a=>{const blocks=page.ocrDeviceText.split(/(?=^[-+]?\d*[FSPKYQ]\d+(?:\.\d+)*$)/m);return !protectiveLabel.test(blocks.find(b=>b.split('\n')[0]===a.str.toUpperCase())||'');});}
export function refineDeviceText(page,ref,text){
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines[0]?.toUpperCase()!==ref.toUpperCase()||!protectiveLabel.test(lines.slice(1).join(' ')))return false;
 const blocks=page.ocrDeviceText.split(/(?=^[-+]?\d*[FSPKYQ]\d+(?:\.\d+)*$)/m);
 page.ocrDeviceText=blocks.map(b=>b.split('\n')[0]===ref.toUpperCase()?ref.toUpperCase()+'\n'+lines.slice(1).join('\n')+'\n':b).join('');return true;
}
let library;
function loadLibrary(){if(!library)library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';script.onload=()=>resolve(globalThis.Tesseract);script.onerror=()=>{library=null;reject(Error('Texterkennung konnte nicht geladen werden. Internetverbindung prüfen.'));};document.head.append(script);});return library;}
export function createOcrReader(report){let worker,current='';return {
 async read(page,label){current=label;report(label+': Texterkennung wird vorbereitet …');if(!worker){const api=await loadLibrary();worker=await api.createWorker('deu+eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',logger:m=>report(current+': Texterkennung '+Math.round((m.progress||0)*100)+' %')});await worker.setParameters({tessedit_pageseg_mode:'11',user_defined_dpi:'216'});}
 const base=page.getViewport({scale:1}),scale=Math.min(3,3200/Math.max(base.width,base.height)),vp=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
 try{await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;const {data}=await worker.recognize(canvas,{}, {text:true,blocks:true});const result=ocrPage(data,scale,canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height));
 const targets=refinementTargets(result);
 if(targets.length){await worker.setParameters({tessedit_pageseg_mode:'6'});try{for(const a of targets){
 const left=Math.max(0,Math.floor((a.x-10)*scale)),top=Math.max(0,Math.floor((a.y-a.height-3)*scale));
 const rectangle={left,top,width:Math.min(canvas.width-left,Math.ceil((a.width+14)*scale)),height:Math.min(canvas.height-top,Math.ceil((a.height+41)*scale))};
 const retry=await worker.recognize(canvas,{rectangle},{text:true});refineDeviceText(result,a.str,retry.data.text||'');
 }}finally{await worker.setParameters({tessedit_pageseg_mode:'11'});}}
 return result;}finally{canvas.width=canvas.height=0;}
 },async close(){if(worker){await worker.terminate();worker=null;}}
 };}
