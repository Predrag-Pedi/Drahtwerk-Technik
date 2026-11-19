import {allFunctions,functionBmk,functionData,findFunction,contactsFor,configureContacts,referenceLocation} from './references.mjs?v=20261119-7';
import {uid} from './model.mjs?v=20261119-9';
import {reportRows,csv} from './schema-assembly.mjs?v=20261119-7';
import {download} from './export.mjs?v=20261119-7';

const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function button(parent,text,action){const b=node('button',text);b.type='button';b.onclick=action;parent.append(b);return b;}
function modal(title){const d=node('dialog',undefined,'cad-workflow-dialog'),h=node('div',undefined,'workflow-heading');h.append(node('h2',title));button(h,'Schliessen',()=>d.close()).setAttribute('aria-label',title+' schliessen');d.append(h);const body=node('div');d.append(body);const error=node('p','', 'workflow-error');error.setAttribute('role','alert');d.append(error);document.body.append(d);d.onclose=()=>d.remove();d.showModal();return {dialog:d,body,error};}
function input(parent,label,value,type='text'){const l=node('label',undefined,'field');l.append(node('span',label));const e=node('input');e.type=type;e.value=value;e.setAttribute('aria-label',label);l.append(e);parent.append(l);return e;}

export function openContacts({getDoc,change,place,navigate,selected}){
 const {dialog,body,error}=modal('Kontakte / Belegung');let ref=null,draft=[];
 const refresh=()=>{
  const doc=getDoc(),owners=allFunctions(doc).filter(f=>f.data.role==='coil');body.replaceChildren();error.textContent='';
  if(!owners.length){body.append(node('p','Zuerst eine Schützspule einsetzen. Bei einem vorhandenen Relais oder Aktor in den Eigenschaften die Funktion «Schütz / Relaisspule» wählen.'));button(body,'Schützspule einfügen',()=>{dialog.close();place({kind:'coil'});});return;}
  const owner=owners.find(f=>ref&&f.page.id===ref.page&&f.element.id===ref.element&&f.key===ref.key)||owners.find(f=>f.element.id===selected)||owners[0];ref={page:owner.page.id,element:owner.element.id,key:owner.key};
  const label=node('label',undefined,'field');label.append(node('span','Schütz / Relais / Aktor'));const select=node('select');select.setAttribute('aria-label','Schütz / Relais / Aktor');owners.forEach((f,i)=>{const o=node('option',`${functionBmk(doc,f.page,f.element,f.key)} · ${f.data.description||f.element.text||f.element.template?.name||'Schütz'} · Blatt ${f.page.number}`);o.value=String(i);o.selected=f===owner;select.append(o);});select.onchange=()=>{const f=owners[Number(select.value)];ref={page:f.page.id,element:f.element.id,key:f.key};refresh();};label.append(select);body.append(label);
  const description=input(body,'Funktionstext des Geräts',owner.data.description||'');
  const used=contactsFor(doc,owner.page,owner.element,owner.key);
  draft=structuredClone(owner.data.contactSlots||used.map(c=>({id:uid(),type:c.data.contactType,terminals:c.data.terminals,description:c.data.description||''})));
  const table=node('table',undefined,'workflow-table');const head=node('tr');for(const text of ['Kontaktart','Anschlüsse','Funktion / Kanal','Belegung','Aktion'])head.append(node('th',text));table.append(head);body.append(table);
  const toolbar=node('div',undefined,'workflow-actions');body.append(toolbar);
  const save=()=>{const current=findFunction(getDoc(),ref);if(!current)throw Error('Gerät wurde entfernt.');change(()=>{configureContacts(getDoc(),current,draft);current.element.functions[current.key].description=description.value;});};
  const drawRows=()=>{while(table.children.length>1)table.lastChild.remove();draft.forEach((slot,index)=>{
   const row=node('tr'),type=node('select');type.setAttribute('aria-label',`Kontaktart ${index+1}`);for(const [v,t]of [['NO','Schliesser'],['NC','Öffner'],['CO','Wechsler']]){const o=node('option',t);o.value=v;o.selected=v===slot.type;type.append(o);}type.onchange=()=>slot.type=type.value;
   const terminals=node('input');terminals.value=slot.terminals;terminals.setAttribute('aria-label',`Anschlüsse ${index+1}`);terminals.oninput=()=>slot.terminals=terminals.value;
   const caption=node('input');caption.value=slot.description;caption.setAttribute('aria-label',`Kontaktfunktion ${index+1}`);caption.oninput=()=>slot.description=caption.value;
   const contacts=used.filter(c=>c.data.terminals===slot.terminals),state=node('span',contacts.length?contacts.length>1?'Doppelt belegt':`Belegt · ${referenceLocation(contacts[0].element,contacts[0].page,contacts[0].key)}`:'Frei',contacts.length?'occupied':'available');
   type.disabled=terminals.disabled=contacts.length>0;
   for(const content of [type,terminals,caption,state]){const td=node('td');td.append(content);row.append(td);}
   const actions=node('td');row.append(actions);
   if(contacts.length)button(actions,'Zum Kontakt',()=>{dialog.close();navigate(contacts[0]);});
   else {button(actions,'Platzieren',()=>{try{save();dialog.close();place({kind:'assigned-contact',owner:ref,slotId:slot.id});}catch(e){error.textContent=e.message;}});button(actions,'Entfernen',()=>{draft.splice(index,1);drawRows();});}
   table.append(row);
  });};drawRows();
  for(const [type,label]of [['NO','+ Schliesser'],['NC','+ Öffner'],['CO','+ Wechsler']])button(toolbar,label,()=>{let n=1;const taken=draft.flatMap(s=>s.terminals.split(/[\s,;–—-]+/));while(taken.some(t=>Math.floor(Number(t)/10)===n))n++;const terminals=(type==='NO'?[3,4]:type==='NC'?[1,2]:[1,2,4]).map(k=>n*10+k).join('–');draft.push({id:uid(),type,terminals,description:''});drawRows();});
  body.append(node('p','Freie Kontakte wählen und auf dem Blatt platzieren. Kennzeichen und Gegenverweise werden übernommen. Belegte Anschlüsse können nicht nochmals vergeben werden.','hint'));
  const footer=node('div',undefined,'workflow-actions');button(footer,'Belegung speichern',()=>{try{save();refresh();}catch(e){error.textContent=e.message;}}).className='primary';button(footer,'Zum Gerät',()=>{dialog.close();navigate(owner);});body.append(footer);
 };refresh();
}

export function openReports(doc){
 const {body}=modal('Auswertungen');body.append(node('p','Die Listen übernehmen Kennzeichen, Typen, Funktionen und Blattverweise aus dem aktuellen Projekt.'));
 for(const [kind,name]of [['devices','Geräteliste'],['terminals','Klemmenliste'],['contacts','Kontakt-Belegung'],['measurement','Messprotokoll-Vorlage']]){
  const rows=reportRows(doc,kind);button(body,`${name} · ${rows.length-1} Einträge · CSV`,()=>download(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'}),`${doc.order||doc.name} - ${name}.csv`));
 }
 body.append(node('p','Die Messprotokoll-Vorlage enthält die Schutzgeräte und leere Messfelder. Messwerte und Prüfergebnis werden nach der tatsächlichen Prüfung eingetragen. CSV-Dateien lassen sich in Excel öffnen.','hint'));
}

export function openPrintSelection(doc,currentId,exportPages){
 const {dialog,body,error}=modal('PDF / Seitenauswahl'),selected=new Set(doc.pages.map(p=>p.id)),controls=[];
 const bar=node('div',undefined,'workflow-actions');body.append(bar);
 for(const [title,predicate]of [['Alle Seiten',()=>true],['Aktuelle Seite',p=>p.id===currentId],['Nur Schema',p=>p.type==='schema'],['Nur Dispo',p=>p.type==='dispo']])button(bar,title,()=>{selected.clear();for(const p of doc.pages)if(predicate(p))selected.add(p.id);controls.forEach(([p,c])=>c.checked=selected.has(p.id));});
 const list=node('div',undefined,'print-page-list');body.append(list);
 for(const p of doc.pages){const l=node('label'),c=node('input');c.type='checkbox';c.checked=true;c.onchange=()=>c.checked?selected.add(p.id):selected.delete(p.id);l.append(c,node('span',`${p.number} · ${p.title}`));list.append(l);controls.push([p,c]);}
 body.append(node('p','A3 quer · Seitenmassstäbe bleiben erhalten · Lesezeichen und enthaltene Querverweise sind anklickbar.','hint'));
 button(body,'PDF erstellen',()=>{if(!selected.size){error.textContent='Mindestens eine Seite auswählen.';return;}dialog.close();exportPages(doc.pages.filter(p=>selected.has(p.id)).map(p=>p.id));}).className='primary';
}
