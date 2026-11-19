import {protectionPicker} from './protection-picker.mjs?v=20261119-7';
import {protectionFields} from './protection-fields.mjs?v=20261119-7';
import {terminalBands} from './terminal-markers.mjs?v=20261119-7';
import {templateFit} from './template-fit.mjs?v=20261119-7';
import {isSchemaMacro,macroAtPath} from './macro-workflow.mjs?v=20261119-7';
import {macroFields,macroBindings,outgoingFields,createMacroDraft,setMacroValue,terminalForCable,numericValue,sectionForCurrent,initializeMacroArticles,validateMacroArticles} from './macro-config.mjs?v=20261119-7';
import {templateMarkup} from './template.mjs?v=20261119-7';
import {templateName,libraryName,libraryFacets,searchText} from './library.mjs?v=20261119-7';

// All choices are drafts until inserted. Each placement receives a fresh copy.
export function macroSidebar(root,{manual,place,changed,currentPage,choose,getPercent,setPercent}){
 let template=null,draft=null,busy=false,fields=[],bindings=[];const drafts=new Map();
 const $=selector=>root.querySelector(selector),title=$('[data-macro-title]'),preview=$('[data-macro-preview]'),form=$('[data-macro-fields]'),extra=$('[data-macro-extra]'),status=$('[data-macro-status]'),notice=$('[data-macro-notice]'),names=$('[data-macro-names]'),fieldSearch=$('[data-macro-field-search]');
 const value=key=>draft.values[key]??fields.find(f=>f.key===key)?.value??'';
 const showStatus=(text,error=false)=>{status.textContent=text;status.classList.toggle('macro-error',error);};
 const filterFields=()=>{const q=searchText(fieldSearch.value);for(const label of extra.children)label.hidden=!searchText(label.textContent+' '+label.querySelector('input').value).includes(q);$('[data-macro-no-fields]').hidden=[...extra.children].some(l=>!l.hidden);};
 const redraw=()=>{if(!template)return;const factor=Math.min(64/template.width,60/template.height);preview.innerHTML=templateMarkup(template,template.width*factor,template.height*factor,{},draft.values,false,'',{},draft.side);};
 function sync(){
  for(const input of root.querySelectorAll('[data-macro-value]'))if(document.activeElement!==input)input.value=value(input.dataset.macroValue);
  for(const group of root.querySelectorAll('[data-choice-field]')){
   const selected=value(group.dataset.choiceField).trim();for(const b of group.querySelectorAll('[data-choice-value]'))b.setAttribute('aria-pressed',String(b.dataset.choiceValue===selected));
   const summary=group.querySelector('summary');if(summary)summary.textContent=[...group.querySelectorAll(':scope > .macro-choice-row button')].some(b=>b.dataset.choiceValue===selected)?'Weitere Werte':`${selected} · Weitere Werte`;
  }
  for(const b of root.querySelectorAll('[data-terminal-side]'))b.setAttribute('aria-pressed',String(b.dataset.terminalSide===draft.side));
  for(const box of root.querySelectorAll('[data-cable-info]')){
   const b=bindings.find(b=>b.cableKey===box.dataset.cableInfo),section=terminalForCable(value(b.cableKey)),manual=draft.manualCables.includes(b.cableKey),table=b.currentKey&&sectionForCurrent(value(b.currentKey),{control:b.control}),automatic=Boolean(b.currentKey&&table!==null);
   box.querySelector('output').textContent=section?`Klemmen ${section} mm²`:manual?'Klemmen: Querschnitt prüfen':b.sectionKey?`Klemmen ${value(b.sectionKey)}`:'Querschnitt nicht erkannt';
   const button=box.querySelector('button');button.hidden=!b.currentKey;button.disabled=!automatic;button.setAttribute('aria-pressed',String(!manual));button.textContent=manual?'Automatisch':'Auto';
   box.querySelector('small').textContent=manual?'Manuell · bleibt bei Stromänderung erhalten':!b.power?'Leitung aus Vorlage':!b.currentKey?'Kabel manuell · Stromzuordnung nicht eindeutig':table===null?`Kein Tabellenwert für ${value(b.currentKey)} · Kabel anpassen`:'Nach Drahtwerk-Tabelle';
  }
  redraw();changed(template,{...draft.values});
 }
 function update(){
  const page=currentPage(),schema=page?.type==='schema',percent=getPercent(),valid=Number.isFinite(percent)&&percent>=1&&percent<=200;
  $('[data-macro-paths]').hidden=!isSchemaMacro(template);
  let articleError='';if(template)try{validateMacroArticles(template,draft);}catch(e){articleError=e.message;}
  const fit=template&&page?templateFit(template,page,percent):null,wrongPage=template?.category==='Dispo'&&page?.type!=='dispo';
  for(const b of root.querySelectorAll('[data-macro-path]')){let error='';if(schema&&template&&valid)try{macroAtPath(page,template,Number(b.dataset.macroPath),{percent});}catch(e){error=e.message;}b.disabled=!schema||busy||!valid||Boolean(error)||Boolean(articleError);b.title=error||`Auf Strompfad ${b.dataset.macroPath} einsetzen`;}
  $('[data-macro-manual]').disabled=busy||!template||!valid||Boolean(articleError)||wrongPage||Boolean(fit&&!fit.schematic&&!fit.fits);
  notice.textContent=articleError|| (wrongPage?'Eine Dispositionsseite öffnen.':!valid?'Symbolgrösse oben in der Zeichenleiste korrigieren.':fit&&!fit.fits?(fit.schematic?'Vorlage zu gross: Mit der Maus platzieren wählen, dann oben «Einpassen».':`Vorlage passt nicht bei 1:${page.scale}. Blattmassstab in den Seiteneinstellungen ändern.`):'');notice.hidden=!notice.textContent;
  if(template&&!schema&&isSchemaMacro(template))showStatus('Für die Pfadwahl eine Schemaseite öffnen.');
 }
 const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
 function inputField(f,caption){
  const label=node('label',undefined,'macro-field'),span=node('span',caption),input=node('input');input.type='text';input.maxLength=2000;input.value=value(f.key);input.dataset.macroValue=f.key;
  input.oninput=()=>{setMacroValue(template,draft,f.key,input.value);sync();};label.append(span,input);return label;
 }
 function choices(f,caption,options,others=[]){
  const box=node('fieldset',undefined,'macro-choices');box.dataset.choiceField=f.key;box.append(node('legend',caption));const row=node('div',undefined,'macro-choice-row');box.append(row);
  const add=(parent,v)=>{const b=node('button',v);b.type='button';b.dataset.choiceValue=v;b.setAttribute('aria-label',`${caption}: ${v}`);b.onclick=()=>{setMacroValue(template,draft,f.key,v);sync();};parent.append(b);};
  [...new Set([...options,...(!options.includes(value(f.key))?[value(f.key)]:[])])].forEach(v=>add(row,v));
  if(f.label==='Charakteristik')return box;
  const more=node('details',undefined,'macro-other-values');more.append(node('summary','Weitere Werte'));const second=node('div',undefined,'macro-choice-row');others.filter(v=>!options.includes(v)).forEach(v=>add(second,v));more.append(second,inputField(f,'Eigener Wert'));box.append(more);return box;
 }
 function build(){
  form.replaceChildren();extra.replaceChildren();names.replaceChildren();const outgoing=outgoingFields(template),nameKeys=new Set(outgoing.map(f=>f.textKey).filter(Boolean));
  for(const f of outgoing){const label=node('label',undefined,'macro-field'),caption=outgoing.length===1?'Abgangname':`Abgangname · ${f.key}`,input=node('input');input.type='text';input.maxLength=200;input.placeholder='z. B. Küche – Steckdosen';input.value=draft.names[f.key]||'';input.oninput=()=>{draft.names[f.key]=input.value;changed(template,{...draft.values});};label.append(node('span',caption),input);names.append(label);}
  const articles=node('div',undefined,'macro-articles');form.append(articles);protectionPicker(articles,template,draft,message=>{sync();update();showStatus(message);});
  const articleKeys=new Set(protectionFields(template).flatMap(p=>Object.values(p.fields)));
  const sections=new Set(bindings.map(b=>b.sectionKey).filter(Boolean)),counts=new Map();
  const order={'Bemessungsstrom':0,'Charakteristik':1,'Fehlerstrom':2,'Spannung':3,'Kabel':4,'Querschnitt':5};
  for(const f of [...fields].sort((a,b)=>(order[a.label]??9)-(order[b.label]??9))){
   if(nameKeys.has(f.key)||sections.has(f.key)||articleKeys.has(f.key))continue;
   const n=(counts.get(f.label)||0)+1;counts.set(f.label,n);const caption=f.label+(n>1?' '+n:'');let box;
   if(f.label==='Bemessungsstrom'){
    const high=numericValue(value(f.key))>63,options=(high?[63,80,100,125,160,200,250,315]:[10,13,16,20,25,32,40,63]).map(n=>n+'A');
    box=choices(f,caption,options,[2,4,6,8,10,13,16,20,25,32,40,50,63,80,100,125,160,200,250,280,315].map(n=>n+'A'));
   }else if(f.label==='Charakteristik')box=choices(f,caption,['B','C','D']);
   else if(f.label==='Fehlerstrom')box=choices(f,caption,['10mA','30mA','100mA','300mA'],['500mA']);
   else if(f.label==='Kabel'){
    box=node('div',undefined,'macro-cable');box.append(inputField(f,caption));const info=node('div',undefined,'macro-cable-info');info.dataset.cableInfo=f.key;const auto=node('button','Automatisch');auto.type='button';auto.title='Kabel wieder nach der Stromtabelle anpassen';auto.onclick=()=>{setMacroValue(template,draft,f.key,value(f.key),{automatic:true});sync();};info.append(node('output'),auto,node('small'));box.append(info);
   }else box=inputField(f,f.primary?caption:f.value.trim().slice(0,55)||'Leerer Vorlagentext');
   (f.primary?form:extra).append(box);
  }
  $('[data-macro-more]').hidden=!extra.childElementCount;$('[data-macro-extra-title]').textContent=`Weitere Texte (${extra.childElementCount})`;filterFields();sync();
 }
 async function action(fn){if(busy||!template)return;busy=true;update();try{const message=await fn(template,{...draft.values});showStatus(message||'');}catch(e){showStatus(e.message,true);}finally{busy=false;update();}}
 fieldSearch.oninput=filterFields;
 $('[data-macro-terminal]').onclick=e=>{const b=e.target.closest('[data-terminal-side]');if(b){draft.side=b.dataset.terminalSide;sync();}};
 $('[data-macro-change]').onclick=choose;
 $('[data-macro-manual]').onclick=()=>action((t,v)=>{manual(t,v);return 'Auf dem Blatt platzieren · Esc beendet die Platzierung.';});
 $('[data-macro-paths]').onclick=e=>{const b=e.target.closest('[data-macro-path]');if(b)action((t,v)=>place(t,Number(b.dataset.macroPath),v));};
 $('[data-macro-reset]').onclick=()=>{draft=initializeMacroArticles(template,createMacroDraft(template));build();showStatus('Vorlagenwerte und automatische Kabelzuordnung wiederhergestellt.');};
 return {
  select(t){
   if(template)drafts.set(template.id,{draft:structuredClone(draft),percent:getPercent()});template=t;const saved=drafts.get(t.id);draft=initializeMacroArticles(t,createMacroDraft(t,saved?.draft));fields=macroFields(t);bindings=macroBindings(t);setPercent(saved?.percent||100);
   fieldSearch.value='';$('[data-macro-more]').open=false;$('.macro-scroll').scrollTop=0;$('[data-macro-terminal-label]').hidden=!terminalBands(t).length;root.hidden=false;title.textContent=templateName(t);$('[data-macro-meta]').textContent=libraryFacets(t).group;
   $('[data-macro-reset]').hidden=!fields.length&&!terminalBands(t).length;build();showStatus(isSchemaMacro(t)?'Werte wählen und Strompfad anklicken.':'Mit der Maus platzieren.');update();
  },update,
  sideFor(t){return t?.id===template?.id?draft.side:'original';},
  draftFor(t){return t?.id===template?.id?structuredClone(draft):createMacroDraft(t);},
  clear(){template=null;draft=null;drafts.clear();title.textContent='';root.hidden=true;}
 };
}
