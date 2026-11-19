import {configureCabinet} from './cabinet-config-ui.mjs?v=20261119-1';
import {dispoVariants,cachedDispoBuild,calculateDispoVariant} from './dispo-variants.mjs?v=20261119-1';
import {svgPage} from './render.mjs?v=20261119-1';

const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export function openDispoVariants({doc,page,onApply,initialError=''}){
 const dialog=node('dialog',undefined,'cad-workflow-dialog dispo-variants-dialog'),heading=node('div',undefined,'workflow-heading');
 heading.append(node('h2','Varianten vergleichen'));
 const close=node('button','Schliessen');close.type='button';close.onclick=()=>dialog.close();close.setAttribute('aria-label','Variantenvergleich schliessen');heading.append(close);dialog.append(heading);
 const variants=dispoVariants(page),base=variants[0].config;
 dialog.append(node('p',`Einbau: max. ${base.maxWidth} × ${base.maxHeight} mm${base.maxDepth?' × '+base.maxDepth+' mm tief':''} · Geräte-Platzreserve ${base.reserve} % · ${base.reserveMeters} Reserve-Zählerplätze · Massstab 1:${page.scale}`,'variant-limits'));
 dialog.append(node('p','Zuerst Varianten vergleichen und die gewünschte Anordnung wählen. Die Schrankausstattung legst du beim Übernehmen fest. Dein Schema bleibt erhalten.','hint'));
 const filters=node('div',undefined,'variant-filters');
 function filter(label,options){const l=node('label',undefined,'field'),select=node('select');select.setAttribute('aria-label',label);l.append(node('span',label),select);for(const [value,title]of options){const o=node('option',title);o.value=value;select.append(o);}filters.append(l);return select;}
 const enclosure=filter('Verteilung vergleichen',[['all','SBR und Standschrank'],['sbr','SBR'],['standing','Standschrank']]);
 const system=filter('System vergleichen',[['common','Standard und Smissline'],['all','Alle verfügbaren Systeme'],['standard','Standard · Hager / Schneider'],['smissline','Smissline'],['silas60','Silas · 60 mm'],['vertigroup185','Vertigroup · 185 mm']]);
 dialog.append(filters);
 const layout=node('div',undefined,'variant-layout'),list=node('div',undefined,'variant-list'),detail=node('section',undefined,'variant-detail');list.setAttribute('aria-label','Aufbauvarianten');layout.append(list,detail);dialog.append(layout);
 const progress=node('p','Varianten werden berechnet …','hint');progress.setAttribute('role','status');dialog.append(progress);
 const rows=new Map();let active=null,closed=false,selecting=false;
 function show(row){
  active=row;for(const [id,r]of rows)r.button.setAttribute('aria-pressed',String(id===row.id));
  detail.replaceChildren(node('h3',row.name));
  if(!row.result){detail.append(node('p',row.error||'Wird berechnet …',row.error?'workflow-error':'hint'));return;}
  const g=row.result,c=g.config;
  detail.append(node('p',`${c.width} × ${c.height} × ${c.depth} mm · ${c.fields} Feld(er) · ${c.reserve} % Geräte-Platzreserve`,'variant-dimensions'));
  if(c.distributionType==='standing')detail.append(node('p',`${c.cabinetMode==='custom'?'Individualschrank':'AN-Standard'}: ${c.height-c.plinthHeight} mm Korpus + ${c.plinthHeight} mm Sockel`,'hint'));
  const preview=node('div',undefined,'variant-preview');preview.innerHTML=svgPage(doc,{...page,elements:g.elements,wires:[],grid:false},{grid:false,frame:false});
  const cabinets=g.elements.filter(e=>e.kind==='cabinet'),f=1200/420/g.scale;
  if(cabinets.length){const left=Math.min(...cabinets.map(e=>e.x))-45,top=Math.min(...cabinets.map(e=>e.y))-40,right=Math.max(...cabinets.map(e=>e.x+e.width*f))+20,bottom=Math.max(...cabinets.map(e=>e.y+e.height*f))+20;preview.querySelector('svg').setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`);}
  detail.append(preview);const description=g.elements.find(e=>e.dispoDescription);if(description)detail.append(node('pre',description.text,'variant-description'));
  for(const warning of g.warnings||[])detail.append(node('p',warning,'hint'));
  const apply=node('button','Diese Variante übernehmen','primary');apply.type='button';apply.disabled=selecting;
  apply.onclick=async()=>{
   if(selecting||closed)return;selecting=true;apply.disabled=true;
   try{
    if(c.distributionType==='standing'){
     const next=await configureCabinet({config:c,doc,page,submitLabel:'Schrank übernehmen',onApply:result=>{if(closed)throw Error('Variantenvergleich wurde geschlossen.');onApply(result);}});
     if(!next||closed)return;
    }else onApply(g);
    dialog.close();
   }catch(e){progress.textContent=e.message;}
   finally{selecting=false;if(!closed&&active)show(active);}
  };detail.append(apply);
 }
 function visible(row){return row.id==='current'||(enclosure.value==='all'||row.config.distributionType===enclosure.value)&&(system.value==='all'||system.value==='common'&&['standard','smissline'].includes(row.config.buildSystem)||system.value===row.config.buildSystem);}
 function filterRows(){for(const r of rows.values())r.button.hidden=!visible(r);if(active&&!visible(active))show([...rows.values()].find(visible));}
 for(const v of variants){const button=node('button',undefined,'variant-card'),title=node('strong',v.name),status=node('span','Wird berechnet …');button.type='button';button.append(title,status);const row={...v,button,status,...(v.id==='current'&&initialError?{error:initialError}:{})};rows.set(v.id,row);button.onclick=()=>show(row);list.append(button);}
 enclosure.onchange=system.onchange=filterRows;filterRows();show(rows.get('current'));
 document.body.append(dialog);dialog.onclose=()=>{closed=true;dialog.remove();};dialog.showModal();
 const build=cachedDispoBuild();
 (async()=>{
  // Calculate commonly used alternatives first; allow close/cancel between builds.
  const queue=[...rows.values()].sort((a,b)=>Number(!visible(a))-Number(!visible(b)));
  let done=0,ok=0;
  for(const row of queue){
   await new Promise(resolve=>setTimeout(resolve,0));if(closed)return;
   const result=await calculateDispoVariant(doc,page,row,build);if(closed)return;Object.assign(row,result);
   const c=row.result?.config;row.status.textContent=c?`${c.width} × ${c.height} × ${c.depth} mm · passt`:'Nicht möglich · Grund ansehen';row.button.classList.add(c?'variant-fits':'variant-blocked');if(c)ok++;
   if(active===row)show(row);progress.textContent=`${++done} / ${queue.length} geprüft · ${ok} passende Varianten`;
  }
 })().catch(error=>{if(!closed)progress.textContent=error.message;});
 return dialog;
}
