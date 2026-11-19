import {macroFields,isSchemaMacro} from './macro-workflow.mjs?v=20261119-2';
import {templateMarkup} from './template.mjs?v=20261119-1';
import {libraryName} from './library.mjs?v=20261119-1';

// The sidebar owns draft values only. Selecting/configuring a macro never
// changes the drawing; each placement receives a separate copy.
export function macroSidebar(root,{manual,place,changed,currentPage,choose}){
 let template=null,values={},busy=false,fields=[];
 const title=root.querySelector('[data-macro-title]'),preview=root.querySelector('[data-macro-preview]'),form=root.querySelector('[data-macro-fields]'),extra=root.querySelector('[data-macro-extra]'),status=root.querySelector('[data-macro-status]');
 const showStatus=(text,error=false)=>{status.textContent=text;status.classList.toggle('macro-error',error);};
 const redraw=()=>{if(!template)return;const factor=Math.min(110/template.width,145/template.height);preview.innerHTML=templateMarkup(template,template.width*factor,template.height*factor,{},values);};
 function update(){const schema=currentPage()?.type==='schema';root.querySelector('[data-macro-paths]').hidden=!isSchemaMacro(template);for(const b of root.querySelectorAll('[data-macro-path]'))b.disabled=!schema||busy;root.querySelector('[data-macro-manual]').disabled=busy||!template;if(template&&!schema&&isSchemaMacro(template))showStatus('Für die Pfadwahl eine Schemaseite öffnen.');}
 async function action(fn){if(busy||!template)return;busy=true;update();try{const message=await fn(template,{...values});showStatus(message||'');}catch(e){showStatus(e.message,true);}finally{busy=false;update();}}
 root.querySelector('[data-macro-change]').onclick=choose;
 root.querySelector('[data-macro-manual]').onclick=()=>action((t,v)=>{manual(t,v);return 'Auf dem Blatt platzieren · Esc beendet die Platzierung.';});
 root.querySelector('[data-macro-paths]').onclick=e=>{const b=e.target.closest('[data-macro-path]');if(b)action((t,v)=>place(t,Number(b.dataset.macroPath),v));};
 root.querySelector('[data-macro-reset]').onclick=()=>{values={};for(const input of root.querySelectorAll('[data-macro-value]'))input.value=fields.find(f=>f.key===input.dataset.macroValue).value;redraw();changed(template,values);showStatus('Originalwerte wiederhergestellt.');};
 return {
  select(t){template=t;values={};root.hidden=false;title.textContent=libraryName(t.name);fields=macroFields(t);form.replaceChildren();extra.replaceChildren();
   const counts=new Map();for(const f of fields){const n=(counts.get(f.label)||0)+1;counts.set(f.label,n);const label=document.createElement('label');label.className='macro-field';const caption=document.createElement('span');caption.textContent=f.label+(n>1?' '+n:'');const input=document.createElement('input');input.type='text';input.maxLength=2000;input.value=f.value;input.dataset.macroValue=f.key;input.title=f.value;input.oninput=()=>{values[f.key]=input.value;redraw();changed(template,{...values});};label.append(caption,input);(f.primary?form:extra).append(label);}
   root.querySelector('[data-macro-more]').hidden=!extra.childElementCount;root.querySelector('[data-macro-reset]').hidden=!fields.length;
   showStatus(isSchemaMacro(t)?'Werte einstellen und Strompfad wählen.':'Werte einstellen und mit der Maus platzieren.');redraw();update();
  },
  update,
  valuesFor(t){return t?.id===template?.id?{...values}:{};},
  clear(){template=null;values={};root.hidden=true;}
 };
}
