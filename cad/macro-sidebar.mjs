import {terminalBands} from './terminal-markers.mjs?v=20261119-4';
import {templateFit} from './template-fit.mjs?v=20261119-4';
import {macroFields,isSchemaMacro,macroAtPath} from './macro-workflow.mjs?v=20261119-4';
import {templateMarkup} from './template.mjs?v=20261119-4';
import {libraryName,libraryFacets,searchText} from './library.mjs?v=20261119-4';

// The sidebar owns draft values only. Selecting/configuring a macro never
// changes the drawing; each placement receives a separate copy.
export function macroSidebar(root,{manual,place,changed,currentPage,choose,getPercent,setPercent,setPageScale}){
 let template=null,values={},busy=false,fields=[],side='original';const drafts=new Map();
 const title=root.querySelector('[data-macro-title]'),preview=root.querySelector('[data-macro-preview]'),form=root.querySelector('[data-macro-fields]'),extra=root.querySelector('[data-macro-extra]'),status=root.querySelector('[data-macro-status]');
 const sideInput=root.querySelector('[data-macro-terminal]'),sizeInput=root.querySelector('[data-macro-size]'),fitStatus=root.querySelector('[data-macro-fit-status]'),fitButton=root.querySelector('[data-macro-fit]');
 const fieldSearch=root.querySelector('[data-macro-field-search]');
 const filterFields=()=>{const q=searchText(fieldSearch.value);for(const label of extra.children)label.hidden=!searchText(label.textContent+' '+label.querySelector('input').value).includes(q);root.querySelector('[data-macro-no-fields]').hidden=[...extra.children].some(l=>!l.hidden);};
 fieldSearch.oninput=filterFields;
 const showStatus=(text,error=false)=>{status.textContent=text;status.classList.toggle('macro-error',error);};
 const redraw=()=>{if(!template)return;const factor=Math.min(64/template.width,86/template.height);preview.innerHTML=templateMarkup(template,template.width*factor,template.height*factor,{},values,false,'',{},side);};
 function update(){
  const page=currentPage(),schema=page?.type==='schema',percent=getPercent(),valid=Number.isFinite(percent)&&percent>=1&&percent<=200;
  root.querySelector('[data-macro-paths]').hidden=!isSchemaMacro(template);
  if(document.activeElement!==sizeInput)sizeInput.value=String(percent);
  const fit=template&&page?templateFit(template,page,percent):null;
  for(const b of root.querySelectorAll('[data-macro-path]')){let error='';if(schema&&template&&valid)try{macroAtPath(page,template,Number(b.dataset.macroPath),{percent});}catch(e){error=e.message;}b.disabled=!schema||busy||!valid||Boolean(error);b.title=error||`Auf Strompfad ${b.dataset.macroPath} einsetzen`;}
  const wrongPage=template?.category==='Dispo'&&page?.type!=='dispo';
  root.querySelector('[data-macro-manual]').disabled=busy||!template||!valid||!fit?.fits||wrongPage;
  fitButton.hidden=!fit||fit.fits||!valid||wrongPage;fitButton.disabled=busy;
  if(fit){fitStatus.textContent=wrongPage?'Für diese Aufbauvorlage eine Dispositionsseite öffnen.':!valid?'Symbolgrösse zwischen 1 und 200 % wählen.':fit.fits?(fit.schematic?`Passt auf das Blatt · Symbolgrösse ${percent} %`:`Passt bei Massstab 1:${page.scale} · Originalmasse ${template.width} × ${template.height} mm`):(fit.schematic?'Die Vorlage ist grösser als der Zeichenbereich.':`Zu gross für 1:${page.scale}. Die Originalmasse bleiben erhalten.`);if(!fit.fits||wrongPage||!valid)root.querySelector('.macro-sizing').open=true;fitButton.textContent=fit.schematic?`Grafik mit ${fit.suggestedPercent} % einpassen`:`Blattmassstab auf 1:${fit.suggestedScale} setzen`;}
  if(template&&!schema&&isSchemaMacro(template))showStatus('Für die Pfadwahl eine Schemaseite öffnen.');
 }
 sideInput.onchange=()=>{side=sideInput.value;redraw();changed(template,values);};
 sizeInput.oninput=()=>{setPercent(Number(sizeInput.value));update();};
 fitButton.onclick=()=>{const fit=templateFit(template,currentPage(),getPercent());if(fit.schematic)setPercent(fit.suggestedPercent);else if(fit.suggestedScale)setPageScale(fit.suggestedScale);update();};
 async function action(fn){if(busy||!template)return;busy=true;update();try{const message=await fn(template,{...values});showStatus(message||'');}catch(e){showStatus(e.message,true);}finally{busy=false;update();}}
 root.querySelector('[data-macro-change]').onclick=choose;
 root.querySelector('[data-macro-manual]').onclick=()=>action((t,v)=>{manual(t,v);return 'Auf dem Blatt platzieren · Esc beendet die Platzierung.';});
 root.querySelector('[data-macro-paths]').onclick=e=>{const b=e.target.closest('[data-macro-path]');if(b)action((t,v)=>place(t,Number(b.dataset.macroPath),v));};
 root.querySelector('[data-macro-reset]').onclick=()=>{values={};side='original';sideInput.value=side;for(const input of root.querySelectorAll('[data-macro-value]'))input.value=fields.find(f=>f.key===input.dataset.macroValue).value;filterFields();redraw();changed(template,values);showStatus('Originalwerte wiederhergestellt.');};
 return {
  select(t){if(template)drafts.set(template.id,{values:{...values},side,percent:getPercent()});template=t;const draft=drafts.get(t.id);values={...draft?.values};side=draft?.side||'original';setPercent(draft?.percent||100);sideInput.value=side;fieldSearch.value='';root.querySelector('[data-macro-more]').open=false;root.querySelector('.macro-sizing').open=false;root.querySelector('.macro-scroll').scrollTop=0;root.querySelector('[data-macro-terminal-label]').hidden=!terminalBands(t).length;root.querySelector('[data-macro-size-label]').hidden=t.category!=='Schema';root.hidden=false;title.textContent=libraryName(t.name);root.querySelector('[data-macro-meta]').textContent=libraryFacets(t).group;fields=macroFields(t).sort((a,b)=>Number(a.label==='Kabel')-Number(b.label==='Kabel'));form.replaceChildren();extra.replaceChildren();
   const counts=new Map();for(const f of fields){const n=(counts.get(f.label)||0)+1;counts.set(f.label,n);const label=document.createElement('label');label.className='macro-field'+(f.label==='Kabel'?' macro-field-wide':'');const caption=document.createElement('span');caption.textContent=f.primary?f.label+(n>1?' '+n:''):f.value.trim().slice(0,55)||'Leerer Vorlagentext';const input=document.createElement('input');input.type='text';input.maxLength=2000;input.value=values[f.key]??f.value;input.dataset.macroValue=f.key;input.title=f.value;input.oninput=()=>{values[f.key]=input.value;redraw();changed(template,{...values});};label.append(caption,input);(f.primary?form:extra).append(label);}
   root.querySelector('[data-macro-more]').hidden=!extra.childElementCount;root.querySelector('[data-macro-extra-title]').textContent=`Weitere Texte (${extra.childElementCount})`;filterFields();root.querySelector('[data-macro-reset]').hidden=!fields.length&&!terminalBands(t).length;
   showStatus(isSchemaMacro(t)?'Werte einstellen und Strompfad wählen.':'Werte einstellen und mit der Maus platzieren.');redraw();update();
  },
  update,
  sideFor(t){return t?.id===template?.id?side:'original';},
  valuesFor(t){return t?.id===template?.id?{...values}:{};},
  clear(){template=null;values={};drafts.clear();title.textContent='';root.hidden=true;}
 };
}
