import {choices,ralColors,cabinetOptions,cabinetField,anBodyWidths,anDepths,fieldExtra} from './cabinet-options.mjs?v=20261119-4';
import {defaultConfig,validateDispoConfig} from './dispo.mjs?v=20261119-4';
import {checkCabinet} from './cabinet-layout.mjs?v=20261119-4';
import {cachedDispoBuild} from './dispo-variants.mjs?v=20261119-4';
import {svgPage} from './render.mjs?v=20261119-4';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function configureCabinet({config,doc,page,submitLabel='Übernehmen',onApply}){
 return new Promise(resolve=>{
  let c={...defaultConfig(),...structuredClone(config),distributionType:'standing'},o=cabinetOptions(c.cabinetOptions,c.plinthHeight),fieldIndex=0,answer=null,revision=0;
  const dialog=el('dialog',undefined,'cad-workflow-dialog cabinet-config-dialog'),head=el('div',undefined,'workflow-heading'),close=el('button','Abbrechen');head.append(el('h2','Schrank konfigurieren'),close);close.onclick=()=>dialog.close();dialog.append(head);
  dialog.append(el('p','Standardmasse nach AN-Katalog oder Individualschrank mit freien Massen. Die Bestückung und Geräte-Platzreserve werden mitgeprüft.','hint'));
  const layout=el('div',undefined,'cabinet-config-layout'),form=el('form',undefined,'cabinet-config-form'),preview=el('section',undefined,'cabinet-config-preview');layout.append(form,preview);dialog.append(layout);
  const error=el('p','','workflow-error');error.setAttribute('role','alert');const footer=el('div',undefined,'cabinet-config-actions'),test=el('button','Aufbau prüfen'),save=el('button',submitLabel,'primary');test.type=save.type='button';footer.append(error,test,save);dialog.append(footer);
  const build=cachedDispoBuild();let inputs={},fInputs={};
  const section=title=>{const s=el('fieldset'),l=el('legend',title);s.append(l);form.append(s);return s;};
  function input(parent,key,label,value,options,type='text',target=inputs){const l=el('label',undefined,'field'),n=el(options?'select':'input');n.setAttribute('aria-label',label);l.append(el('span',label),n);if(options)for(const v of options){const [a,b]=Array.isArray(v)?v:[v,v],opt=el('option',b);opt.value=a;n.append(opt);}else{n.type=type;if(type==='number'){n.min='0';n.step='1';}}if(type==='checkbox')n.checked=!!value;else n.value=value??'';target[key]=n;parent.append(l);return n;}
  function collectField(){if(!fInputs.roof)return;const f={...cabinetField(o,fieldIndex)};for(const [k,n]of Object.entries(fInputs))f[k]=k==='shelves'?n.value.trim()?n.value.split(/[;,/]+/).map(v=>Number(v.trim())):[]:k==='angle'?Number(n.value):n.type==='checkbox'?n.checked:n.value;while(o.fields.length<=fieldIndex)o.fields.push(cabinetField(o,0));o.fields[fieldIndex]=f;}
  function read(){
   collectField();for(const k of ['ral','back','sideLeft','sideRight','plinth','accessory'])o[k]=inputs[k].value;for(const k of ['ip54','thirdLevel'])o[k]=inputs[k].checked;
   const mode=inputs.mode.value,sizing=inputs.sizing.value,count=Number(inputs.count.value),plinthHeight=o.plinth==='Kein'?0:Number(inputs.plinthHeight.value);
   let next={...c,cabinetMode:mode,cabinetSizing:sizing,cabinetFieldCount:count,plinthHeight,cabinetOptions:o,autoSize:true};
   for(const k of ['maxWidth','maxHeight','maxDepth','passageWidth','passageHeight','passageDepth'])next[k]=Number(inputs[k].value);
   if(sizing==='fixed'){
    const values=inputs.widths.value.split('/').map(v=>Number(v.trim()));if(values.some(w=>!Number.isFinite(w)||w<=0))throw Error('Feldbreiten mit / getrennt eingeben.');
    if(count&&values.length!==count)throw Error('Anzahl Feldbreiten und Felder stimmen nicht überein.');
    const ws=values.map((w,i)=>w+(mode==='standard'?fieldExtra(o,i,values.length):0));next={...next,fields:ws.length,fieldWidths:ws,width:ws.reduce((a,b)=>a+b,0),height:(mode==='standard'?2000:Number(inputs.bodyHeight.value))+plinthHeight,depth:Number(inputs.depth.value),cabinetTopHeight:Number(inputs.topHeight.value)};
   }
   next=validateDispoConfig(next);if(next.maxWidth<400||next.maxHeight<400)throw Error('Maximale Einbaubreite und Gesamthöhe ab 400 mm eingeben.');if(sizing==='fixed')checkCabinet(next);return next;
  }
  function fieldsEditor(){
   const area=form.querySelector('[data-field-options]');area.replaceChildren();fInputs={};const f=cabinetField(o,fieldIndex);
   for(const [k,label]of [['roof','Dachblech'],['floor','Bodenblech'],['floorMaterial','Bodenblech – Füllung'],['mount','Montageplatte']])input(area,k,label,f[k],choices[k],'text',fInputs);
   input(area,'door','Türe vorhanden',f.door,null,'checkbox',fInputs);
   for(const [k,label]of [['wings','Türflügel'],['hinge','Bandung / Türanschlag'],['angle','Scharnieröffnung (°)'],['lock','Schliessung'],['insert','Schliesseinsatz'],['pocket','Schematasche']])input(area,k,label,f[k],choices[k],'text',fInputs);
   input(area,'shelves','Tablare ab Korpusunterkante (mm, mit / trennen)',f.shelves.join(' / '),null,'text',fInputs);
   const enable=()=>{for(const k of ['wings','hinge','angle','lock','insert','pocket'])fInputs[k].disabled=!fInputs.door.checked;fInputs.hinge.disabled=!fInputs.door.checked||fInputs.wings.value==='2-flüglig';fInputs.floorMaterial.disabled=fInputs.floor.value==='Kein';};fInputs.door.onchange=fInputs.wings.onchange=fInputs.floor.onchange=enable;enable();
  }
  function drawForm(){
   form.replaceChildren();inputs={};
   const dims=section('Bauart und Masse');
   input(dims,'mode','Schrankausführung',c.cabinetMode||'standard',[['standard','Standardschrank · Almatec AN'],['custom','Individualschrank · freie Masse']]);
   input(dims,'sizing','Abmessungen bestimmen',c.cabinetSizing||'auto',[['auto','Automatisch passend berechnen'],['fixed','Masse vorgeben']]);
   input(dims,'count','Anzahl Felder',c.cabinetFieldCount||0,[[0,'Automatisch'],...Array.from({length:10},(_,i)=>[i+1,`${i+1} Feld(er)`])]);
   input(dims,'widths','Feldbreiten (mm, mit / trennen)',(c.fieldWidths||[c.width]).map((w,i,a)=>c.cabinetMode==='custom'?w:anBodyWidths.includes(w-fieldExtra(o,i,a.length))?w-fieldExtra(o,i,a.length):1000).join(' / '));
   input(dims,'bodyHeight','Korpushöhe ohne Sockel (mm)',c.cabinetMode==='custom'?c.height-(c.plinthHeight||0):2000,null,'number');input(dims,'depth','Schranktiefe (mm)',Math.max(300,c.depth),null,'number');
   input(dims,'topHeight','Anschlussraum bei festen Massen (mm)',c.cabinetTopHeight??800,null,'number');
   const info=el('p','','hint');dims.append(info);
   const site=section('Einbau und Transport');for(const [key,label]of [['maxWidth','Max. Einbaubreite gesamt'],['maxHeight','Max. Gesamthöhe inkl. Sockel'],['maxDepth','Max. Einbautiefe (0 = offen)'],['passageWidth','Durchgangsbreite (0 = offen)'],['passageHeight','Durchgangshöhe (0 = offen)'],['passageDepth','Transporttiefe (0 = offen)']])input(site,key,label+' · mm',c[key]||(key==='maxWidth'?c.width:key==='maxHeight'?c.height:0),null,'number');
   const general=section('Gehäuse');input(general,'ral','Farbe RAL',o.ral,Object.entries(ralColors).map(([k,v])=>[k,`${k} · ${v[0]}`]));
   for(const [k,label,list]of [['back','Rückwand','back'],['sideLeft','Seitenwand links','side'],['sideRight','Seitenwand rechts','side'],['plinth','Sockelmaterial','plinth'],['accessory','Zubehör','accessory']])input(general,k,label,o[k],choices[list]);input(general,'plinthHeight','Sockelhöhe (mm)',c.plinthHeight||100,[50,80,100,200]);
   input(general,'ip54','Ausführung IP54 anfordern',o.ip54,null,'checkbox');input(general,'thirdLevel','3. Gleiterebene',o.thirdLevel,null,'checkbox');
   const fs=section('Feld und Türen'),selector=input(fs,'field','Feld bearbeiten',fieldIndex,Array.from({length:Math.max(c.cabinetFieldCount||c.fields||1,o.fields.length)},(_,i)=>[i,`Feld ${i+1}`]));const all=el('button','Diese Optionen für alle Felder');all.type='button';fs.append(all);const area=el('div',undefined,'cabinet-field-grid');area.dataset.fieldOptions='';fs.append(area);fieldsEditor();
   selector.onchange=()=>{collectField();fieldIndex=Number(selector.value);fieldsEditor();};all.onclick=()=>{collectField();o.fields=Array.from({length:selector.options.length},()=>structuredClone(o.fields[fieldIndex]));error.textContent='Feldoptionen für alle Felder übernommen.';};
   const controls=()=>{const fixed=inputs.sizing.value==='fixed',standard=inputs.mode.value==='standard';for(const k of ['widths','bodyHeight','depth','topHeight'])inputs[k].closest('label').hidden=!fixed;inputs.bodyHeight.disabled=standard;inputs.widths.previousSibling.textContent=standard?'Korpus-Feldbreiten ohne Seitenwände (mm, mit / trennen)':'Feld-Aussenbreiten inkl. Seitenwände (mm, mit / trennen)';info.textContent=standard?`AN: Korpus 2000 mm. Korpusbreiten: ${anBodyWidths.join(', ')} mm. Tiefen: ${anDepths.join(', ')} mm. Seitenwände Standard +25 / Flach +5 mm je Aussenseite.`:'Freie Aussenmasse. Automatik sucht einen niedrigen passenden Aufbau und berücksichtigt Sockel, Durchgang, Innenausbau und Reserve. Anschlussraum wird bei Bedarf bis 400 mm verkürzt.';};inputs.mode.onchange=inputs.sizing.onchange=controls;controls();
   inputs.plinth.onchange=()=>{inputs.plinthHeight.disabled=inputs.plinth.value==='Kein'||inputs.plinth.value==='Stahl';if(inputs.plinth.value==='Stahl')inputs.plinthHeight.value='100';};inputs.plinth.onchange();
   inputs.count.onchange=()=>{collectField();const count=Number(inputs.count.value)||c.fields||1;selector.replaceChildren();for(let i=0;i<count;i++){const opt=el('option',`Feld ${i+1}`);opt.value=i;selector.append(opt);}fieldIndex=Math.min(fieldIndex,count-1);selector.value=fieldIndex;fieldsEditor();};
  }
  preview.append(el('h3','Aufbau und Beschreibung'),el('p','Wähle die Schrankausführung und Ausstattung. «Aufbau prüfen» zeigt den vollständig berechneten Entwurf.','hint'));
  form.oninput=()=>{revision++;preview.querySelector('[data-preview-state]')?.remove();const n=el('p','Konfiguration geändert – Aufbau erneut prüfen.','hint');n.dataset.previewState='';preview.append(n);};form.onsubmit=e=>e.preventDefault();
  test.onclick=async()=>{const version=revision;error.textContent='';error.className='workflow-error';test.disabled=true;save.disabled=true;try{const config=read(),g=await build(doc,{...page,dispoConfig:config});if(!dialog.open||version!==revision)return;preview.replaceChildren(el('h3',`${g.config.width} × ${g.config.height} × ${g.config.depth} mm`));const drawing=el('div',undefined,'cabinet-config-drawing');drawing.innerHTML=svgPage(doc,{...page,elements:g.elements,dispoConfig:g.config,grid:false},{grid:false,frame:false});preview.append(drawing);const text=el('pre',g.elements.find(e=>e.dispoDescription)?.text||'');preview.append(text);error.className='cabinet-config-success';error.textContent='Aufbau passt mit '+g.config.reserve+' % Geräte-Platzreserve.';}catch(e){error.textContent=e.message;}finally{test.disabled=false;save.disabled=false;}};
  save.onclick=async()=>{
   if(save.disabled)return;const version=revision;error.textContent='';error.className='workflow-error';save.disabled=true;test.disabled=true;
   try{
    const next=read(),result=onApply?await build(doc,{...page,dispoConfig:next}):null;
    if(!dialog.open)return;
    if(version!==revision){error.textContent='Konfiguration wurde während der Prüfung geändert. Bitte erneut übernehmen.';return;}
    if(onApply)onApply(result);
    answer=result?.config||next;dialog.close();
   }catch(e){error.textContent=e.message;}
   finally{save.disabled=false;test.disabled=false;}
  };
  drawForm();document.body.append(dialog);dialog.onclose=()=>{dialog.remove();resolve(answer);};dialog.showModal();
 });
}
