import {tariffInputs,tariffOutputs,tariffDevices,tariffName,tariffOutputName,tariffTargets,tariffSource,assignTariff} from './tariffs.mjs?v=20261118-6';
export function tariffInspector(root,doc,p,e,{field,button,change,navigate}){
 if(p.type!=='schema'||!tariffInputs(e).length&&!tariffOutputs(e).length)return;
 const box=document.createElement('section');box.className='reference-settings';root.append(box);const heading=document.createElement('h3');heading.textContent='Tarifdrähte / RSE-Verweise';box.append(heading);
 const note=document.createElement('p');note.textContent='Jeden Leiter einzeln zuordnen. Ein RSE-Ausgang kann mehrere Zähler versorgen. Die Verweise werden in beiden Richtungen nachgeführt.';box.append(note);
 for(const a of tariffInputs(e)){
 const ref=e.tariffAssignments?.[a.input],options=[['','Nicht zugeordnet'],...tariffDevices(doc,true).flatMap(s=>tariffOutputs(s.element).map(output=>[JSON.stringify({page:s.page.id,element:s.element.id,output}),`${tariffName(doc,s.page,s.element)} · ${tariffOutputName(s.element,output)}`]))];
 if(ref&&!tariffSource(doc,ref))options.push([JSON.stringify(ref),'Ziel fehlt – bitte neu zuordnen']);
 field(box,`Zähleranschluss ${a.input} – RSE / Leiter`,ref?JSON.stringify(ref):'',v=>change(()=>assignTariff(doc,e,a.input,v?JSON.parse(v):null)),{options});
 const source=tariffSource(doc,ref);if(source)button(box,'Zum RSE wechseln',()=>navigate(source.page.id,source.element.id));
 }
 for(const output of tariffOutputs(e)){
 const group=document.createElement('details'),summary=document.createElement('summary'),targets=tariffTargets(doc,p,e,output);summary.textContent=`${tariffOutputName(e,output)} (${targets.length} Anschlüsse)`;group.append(summary);box.append(group);group.open=targets.length>0;
 for(const t of targets){const row=document.createElement('div');group.append(row);button(row,`${tariffName(doc,t.page,t.element)} · Eingang ${t.input}`,()=>navigate(t.page.id,t.element.id));button(row,'Zuordnung entfernen',()=>change(()=>assignTariff(doc,t.element,t.input,null)));}
 const available=tariffDevices(doc).flatMap(t=>tariffInputs(t.element).filter(a=>!targets.some(s=>s.element.id===t.element.id&&s.page.id===t.page.id&&s.input===a.input)).map(a=>{const ref=t.element.tariffAssignments?.[a.input];return [JSON.stringify({page:t.page.id,element:t.element.id,input:a.input}),`${tariffName(doc,t.page,t.element)} · Eingang ${a.input}${ref?' (bisherige Zuordnung ersetzen)':''}`];}));
 field(group,'Zähleranschluss hinzufügen','',v=>{if(!v)return;const r=JSON.parse(v),meter=doc.pages.find(p=>p.id===r.page)?.elements.find(e=>e.id===r.element);change(()=>assignTariff(doc,meter,r.input,{page:p.id,element:e.id,output}));},{options:[['','Zähler / Eingang wählen'],...available]});
 }
}
