import {buildPortfolio} from './portfolio.mjs?v=20261027-3';
import {templateStore} from './storage.mjs?v=20261027-3';
import {SHEETS,maxPv,candidates,parsePages,validateFields} from './core.mjs?v=20261027-3';
import {readWorkbook,exportWorkbook} from './workbook.mjs?v=20261027-3';
const $=id=>document.getElementById(id),state={buffer:null,book:null,devices:[],fields:[newField()],warnings:[],busy:false};
function newField(){return{type:'SBR',b:null,h:null,t:null,percent:50,mode:'estimate',manual:null};}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===''?null:Number(v),fmt=n=>Number.isFinite(n)?n.toLocaleString('de-CH',{maximumFractionDigits:2})+' W':'–';
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
function dirty(){ edited=true; $('reviewed').checked=false; invalidateDownloads(); }
function warnings(){ $('warnings').replaceChildren(...state.warnings.map(t=>{const li=document.createElement('li');li.textContent=t;return li;})); }
function fieldResult(f,i){
 const max=state.book?maxPv(f.type,f.b,f.h,f.t,state.book.get):null;
 const dev=state.devices.filter(d=>d.field===i+1&&d.qty>0),unresolved=dev.some(d=>!d.article);
 const total=dev.reduce((n,d)=>{const c=state.book?.catalog.find(c=>c.id===d.article);return n+(c?d.qty*(c.pv+c.wire/2):0);},0);
 return {...f,max,device:total,unresolved,selected:f.mode==='devices'?(!unresolved&&dev.length?total:null):f.mode==='manual'?f.manual:max===null?null:max*f.percent/100};
}
function update(){
 try{
  state.fields.forEach((f,i)=>{const r=fieldResult(f,i);$('max'+i).textContent=fmt(r.max);$('selected'+i).textContent=fmt(r.selected);$('estimated'+i).textContent=f.mode==='estimate'?'Schätzung nach Einbaugrad':f.mode==='devices'?'Geräte inkl. ½ Verd./Kl.':'Manueller Wattwert';});
  const unresolved=state.devices.filter(d=>d.qty>0&&!d.article).length;
  $('deviceTotal').textContent=`${state.devices.reduce((s,d)=>s+d.qty,0)} Geräte · ${unresolved} nicht zugeordnet. Gerätewerte enthalten 50 % der hinterlegten Verdrahtungs-/Klemmenverluste (wie «Total Mittelwert»).`;
  $('ipk').textContent=Math.round(Number($('icp').value)*1.7)+' kA';
  updateEW();
  $('export').disabled=!state.book||state.busy||!$('reviewed').checked; $('exportAll').disabled=!state.book||state.busy; for(const id of ['template','reanalyze','plant','newProject','forgetTemplate'])$(id).disabled=state.busy;
 }catch(e){status(e.message,true);$('export').disabled=true;}
}
function updateEW(){
 const city=$('city').value.trim(),w=state.book;if(!w)return;
 const match=w.towns.find(t=>t.name.toLocaleLowerCase('de-CH')===city.toLocaleLowerCase('de-CH'));
 if(!match){$('ew').textContent=city?'Ort nicht in der Vorlage erfasst. Bitte einen Ort aus der Liste wählen.':'Ort aus der Excel-Zuordnung auswählen.';return;}
 let row;for(let i=2;i<1000;i++)if(w.get('EW-Tabelle','A'+i)===match.ew){row=i;break;}
 $('ew').textContent=row?`${match.ew} · ${w.get('EW-Tabelle','B'+row)||'ZSK nicht hinterlegt'} · Zählerplatte: ${w.get('EW-Tabelle','F'+row)||'nicht hinterlegt'} · Rohre: ${w.get('EW-Tabelle','G'+row)||'–'}`:match.ew+' · EW-Daten nicht hinterlegt';
}
function drawFields(){
 $('fields').innerHTML=state.fields.map((f,i)=>`<div class="field-card" data-field="${i}"><div class="section-head"><h3>Feld ${i+1}</h3>${i===state.fields.length-1&&i>0?'<button type="button" data-remove-field="'+i+'">Feld entfernen</button>':''}</div><div class="grid"><label>Typ<select data-key="type">${['SBR','ARS','GZK'].map(x=>`<option ${x===f.type?'selected':''}>${x}</option>`).join('')}</select></label>${[['b','Breite (mm)'],['h','Höhe (mm)'],['t','Tiefe (mm)']].map(([key,label])=>`<label>${label}<input type="number" min="1" step="any" data-key="${key}" value="${f[key]??''}" required></label>`).join('')}<label>Methode<select data-key="mode">${[['estimate','Schätzung nach Einbaugrad'],['devices','Erfasste Geräte'],['manual','Wattwert manuell']].map(([k,v])=>`<option value="${k}" ${k===f.mode?'selected':''}>${v}</option>`).join('')}</select></label><label>Einbaugrad (%)<input type="number" min="0" max="100" step="any" data-key="percent" value="${f.percent}"></label><label>Manueller Wert (W)<input type="number" min="0" step="any" data-key="manual" value="${f.manual??''}"></label></div><div class="results"><div>Max. Pv<strong id="max${i}">–</strong></div><div><span id="estimated${i}">Übernahme</span><strong id="selected${i}">–</strong></div></div></div>`).join('');update();
}
function suggest(d){const cs=state.book?candidates(d,state.book.catalog):[];d.article=cs.length===1?cs[0].id:'';}
function drawDevices(){
 $('devices').innerHTML=state.devices.map((d,i)=>{
 const cs=state.book?.catalog.filter(c=>d.kind==='OTHER'||(c.kind===d.kind&&c.system===d.system&&(!d.amp||c.amp===d.amp)&&(!d.poles||c.poles===d.poles)&&(!d.ma||c.ma===d.ma)))||[];
 return `<tr data-device="${i}" class="${d.article?'':'unresolved'}"><td><input aria-label="Gerätekennzeichen" data-key="ref" value="${escape(d.ref)}"><small>${escape(d.source)}</small>${d.note?'<small>'+escape(d.note)+'</small>':''}</td><td><select aria-label="Feld" data-key="field"><option value="0" ${!d.field?'selected':''}>Bitte zuordnen</option>${state.fields.map((_,j)=>`<option value="${j+1}" ${d.field===j+1?'selected':''}>${j+1}</option>`).join('')}</select></td><td><input aria-label="Anzahl" type="number" min="1" step="1" data-key="qty" value="${d.qty}"></td><td><select aria-label="System" data-key="system"><option value="hager" ${d.system==='hager'?'selected':''}>Hager</option><option value="smissline" ${d.system==='smissline'?'selected':''}>Smissline</option></select></td><td><select aria-label="Geräteart" data-key="kind">${[['FILS','FI/LS'],['LS','LS'],['FI','FI'],['OTHER','Andere']].map(([k,v])=>`<option value="${k}" ${d.kind===k?'selected':''}>${v}</option>`).join('')}</select><div class="mini"><select aria-label="Polzahl" data-key="poles">${[['','Polzahl'],['LN','1P+N'],['3LN','3P+N']].map(([k,v])=>`<option value="${k}" ${d.poles===k?'selected':''}>${v}</option>`).join('')}</select><input aria-label="Nennstrom A" title="Nennstrom A" type="number" min="1" data-key="amp" value="${d.amp??''}"><input aria-label="Fehlerstrom mA" title="Fehlerstrom mA" type="number" min="1" data-key="ma" value="${d.ma??''}"></div></td><td><select aria-label="Excel-Referenzartikel" data-key="article"><option value="">Bitte zuordnen</option>${cs.map(c=>`<option value="${escape(c.id)}" ${d.article===c.id?'selected':''}>${escape(c.label)} · ${c.pv} W · ${escape(c.code)}</option>`).join('')}</select><small>${d.article?escape(d.article):'Kein eindeutiger Treffer. Angaben prüfen oder «Andere» für die ganze Artikelliste wählen.'}</small></td><td><button type="button" data-remove="${i}" aria-label="Gerät entfernen">Entfernen</button></td></tr>`;
 }).join('');update();
}
const documents=[],overrides={},links={};let plants=[],active=-1,importsPending=false,edited=false;
const projectKeys=['customer','customerNo','pl','name','order','city','amp','icp'];
function invalidateDownloads(){ $('downloads').querySelectorAll('a').forEach(a=>URL.revokeObjectURL(a.href));$('downloads').replaceChildren(); }
function saveActive(){if(active<0)return;Object.assign(plants[active],{fields:state.fields,devices:state.devices,warnings:state.warnings,reviewed:$('reviewed').checked,project:Object.fromEntries(projectKeys.map(k=>[k,$(k).value]))});}
function selectPlant(i){saveActive();active=i;const p=plants[i];if(!p)return;state.fields=p.fields;state.devices=p.devices;state.warnings=p.warnings;for(const key of projectKeys)$(key).value=p.project[key]??(key==='icp'?'6':'');$('reviewed').checked=p.reviewed;$('sources').textContent='Verwendete Dispo: '+p.layoutSource+'. Quellen: '+p.sources.join(' · ');warnings();drawFields();drawDevices();}
function analyze(){
 saveActive();importsPending=false;const result=buildPortfolio(documents,overrides,links);plants=result.plants;active=-1;edited=false;invalidateDownloads();
 for(const p of plants)p.devices.forEach(suggest);
 $('plant').replaceChildren(...plants.map((p,i)=>new Option(p.name+' · '+p.fields.length+' Feld(er)',i)));
 $('pending').innerHTML=result.pending.map((p,i)=>`<label>Nicht zugeordnet: ${escape(p.file)}<select data-pending="${i}"><option value="">Anlage wählen</option>${plants.map(p=>`<option value="${escape(p.name)}">${escape(p.name)}</option>`).join('')}<option value="__new">Eigene Anlage erstellen</option></select></label>`).join('');
 $('pending').onchange=e=>{const p=result.pending[+e.target.dataset.pending];if(!p||!e.target.value)return;overrides[p.file]=e.target.value==='__new'?p.name:e.target.value;analyze();};
 $('mergeTarget').replaceChildren(new Option('Zielanlage wählen',''),...plants.map(p=>new Option(p.name,p.id)));$('mergePlant').disabled=plants.length<2;if(plants.length)selectPlant(0);status(`${plants.length} Anlagen erkannt. ${result.pending.length} Dateien noch zuzuordnen. Angaben und Feldvorschläge prüfen.`);
}
$('plant').onchange=e=>selectPlant(+e.target.value);
$('mergePlant').onclick=()=>{if(active<0||!$('mergeTarget').value)return;const source=plants[active].id,target=$('mergeTarget').value;if(source===target){status('Eine andere Zielanlage wählen.',true);return;}if(edited&&$('mergePlant').dataset.confirm!=='yes'){$('mergePlant').dataset.confirm='yes';status('Zusammenführen baut die Auswertung neu auf. Erneut klicken, um bearbeitete Eingaben zu ersetzen.');return;}delete $('mergePlant').dataset.confirm;links[source]=target;analyze();};
$('reanalyze').onclick=()=>{if(plants.some(p=>p.reviewed)&&$('reanalyze').dataset.confirm!=='yes'){ $('reanalyze').dataset.confirm='yes';status('Erneut klicken, um die Auswertung neu aufzubauen und bearbeitete Eingaben zu ersetzen.');return;}delete $('reanalyze').dataset.confirm;analyze();};
$('newProject').onclick=()=>{documents.length=0;plants=[];active=-1;importsPending=false;Object.keys(overrides).forEach(k=>delete overrides[k]);Object.keys(links).forEach(k=>delete links[k]);state.fields=[newField()];state.devices=[];state.warnings=[];projectKeys.forEach(k=>$(k).value=k==='icp'?'6':'');$('plant').replaceChildren();$('pending').replaceChildren();$('sources').textContent='';dirty();warnings();drawFields();drawDevices();status('Neuer Auftrag. Gespeicherte Vorlage bleibt verfügbar.');};
async function loadTemplate(buffer,name){if(!globalThis.JSZip)throw Error('Excel-Bibliothek konnte nicht geladen werden.');const book=await readWorkbook(buffer,globalThis.JSZip);state.buffer=buffer;state.book=book;state.devices.forEach(suggest);plants.forEach(p=>{p.devices.forEach(suggest);p.reviewed=false;});$('reviewed').checked=false;$('towns').replaceChildren(...book.towns.map(t=>new Option(t.name,t.name)));$('pdf').disabled=false;status(`${name}: ${book.catalog.length} Referenzartikel geladen.`);drawDevices();}
$('template').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;state.busy=true;dirty();update();try{if(file.size>15*1024*1024)throw Error('Excel-Vorlage ist zu gross (maximal 15 MB).');const buffer=await file.arrayBuffer();await loadTemplate(buffer,file.name);try{await templateStore('put',{buffer,name:file.name});}catch{status('Vorlage geladen, konnte aber nicht dauerhaft gespeichert werden.',true);}}catch(e){status(e.message,true);}finally{state.busy=false;update();}});
$('forgetTemplate').onclick=async()=>{try{await templateStore('delete');state.book=null;state.buffer=null;$('template').value='';$('pdf').disabled=true;dirty();update();status('Gespeicherte Vorlage gelöscht.');}catch(e){status(e.message,true);}};
$('pdf').addEventListener('change',async e=>{
 const files=Array.from(e.target.files);if(!files.length)return;state.busy=true;$('pdf').disabled=true;update();
 try{const role='auto',pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const imported=[];for(const file of files){if(file.size>40*1024*1024)throw Error(file.name+': maximal 40 MB.');const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;const pages=[];
 try{if(doc.numPages>200)throw Error('Maximal 200 Seiten pro PDF.');for(let i=1;i<=doc.numPages;i++){status(`${file.name}: Seite ${i} von ${doc.numPages}`);const page=await doc.getPage(i),content=await page.getTextContent(),vp=page.getViewport({scale:1});const items=content.items.filter(x=>'str'in x).map(x=>({str:x.str,x:x.transform[4],y:vp.height-x.transform[5],width:x.width,rotated:Math.abs(x.transform[1])>Math.abs(x.transform[0])}));pages.push({file:file.name,number:i,text:items.map(x=>x.str).join('\n'),items,height:vp.height});}}finally{await doc.destroy();}imported.push({file:file.name,role,pages});}
 for(const doc of imported){const i=documents.findIndex(d=>d.file===doc.file);if(i>=0)documents[i]=doc;else documents.push(doc);}
 importsPending=true;invalidateDownloads();if(!plants.length||!edited)analyze();else status('PDFs eingelesen. Mit «Imports auswerten / Eingaben ersetzen» die Anlagen neu erkennen lassen. Dabei werden manuelle Eingaben ersetzt.');
 }catch(e){status(e.message,true);}finally{state.busy=false;$('pdf').disabled=!state.book;e.target.value='';update();}
});
$('fields').addEventListener('input',e=>{const card=e.target.closest('[data-field]'),key=e.target.dataset.key;if(!card||!key)return;const f=state.fields[+card.dataset.field];f[key]=['type','mode'].includes(key)?e.target.value:number(e.target.value);dirty();update();});
$('fields').addEventListener('click',e=>{if(e.target.dataset.removeField!==undefined){const i=+e.target.dataset.removeField;if(state.devices.some(d=>d.field===i+1)){status('Zuerst die Geräte dieses Felds einem anderen Feld zuordnen.',true);return;}state.fields.pop();dirty();drawFields();drawDevices();}});
$('addField').onclick=()=>{if(state.fields.length>=5)return;state.fields.push(newField());dirty();drawFields();drawDevices();};
$('addDevice').onclick=()=>{state.devices.push({ref:'Manuell '+(state.devices.length+1),source:'Manuell',field:1,qty:1,system:'hager',kind:'OTHER',poles:'',amp:null,ma:null,article:''});dirty();drawDevices();};
$('devices').addEventListener('change',e=>{const row=e.target.closest('[data-device]'),key=e.target.dataset.key;if(!row||!key)return;const d=state.devices[+row.dataset.device];d[key]=['field','qty','amp','ma'].includes(key)?number(e.target.value):e.target.value;if(['system','kind','poles','amp','ma'].includes(key))suggest(d);dirty();drawDevices();});
$('devices').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){state.devices.splice(+e.target.dataset.remove,1);dirty();drawDevices();}});
$('projectForm').addEventListener('input',e=>{if(e.target.id!=='reviewed')dirty();else edited=true;update();});
function exportData(p){
 if(!validateFields(p.fields))throw Error(p.name+': Feldmasse oder Einbaugrad fehlen.');
 if(!p.reviewed)throw Error(p.name+': Angaben noch nicht geprüft.');
 if(!p.devices.every(d=>Number.isInteger(d.qty)&&d.qty>0&&Number.isInteger(d.field)&&d.field>=1&&d.field<=p.fields.length))throw Error(p.name+': Geräte einem gültigen Feld zuordnen.');
 const previous=state.devices;let fields;try{state.devices=p.devices;fields=p.fields.map(fieldResult);}finally{state.devices=previous;}
 if(fields.some(f=>!Number.isFinite(f.selected)||f.selected<0))throw Error(p.name+': Wattwerte oder Gerätezuordnungen fehlen.');
 const project={...p.project,type:fields[0].type,amp:Number(p.project.amp),icp:Number(p.project.icp)};
 if(!(project.amp>0))throw Error(p.name+': Bemessungsstrom fehlt.');
 if(!state.book.towns.some(t=>t.name.toLocaleLowerCase('de-CH')===(project.city||'').trim().toLocaleLowerCase('de-CH')))throw Error(p.name+': Ort aus der Vorlage wählen.');
 return {project,fields,devices:p.devices};
}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.textContent=name+' speichern';a.className='home';a.style.display='inline-block';a.style.margin='8px';$('downloads').append(a);}
async function runExport(all){if(!state.book||state.busy)return;saveActive();try{
 if(importsPending)throw Error('Neue Imports zuerst auswerten, damit alle Unterlagen berücksichtigt werden.');
 if($('pending').children.length)throw Error('Zuerst alle Dateien einer Anlage zuordnen.');
 const selected=all?plants:active>=0?[plants[active]]:[{name:$('name').value||'Anlage',fields:state.fields,devices:state.devices,reviewed:$('reviewed').checked,project:Object.fromEntries(projectKeys.map(k=>[k,$(k).value]))}];
 if(!selected.length)throw Error('Keine Anlagen vorhanden.');const data=selected.map(exportData);state.busy=true;update();invalidateDownloads();const zip=new JSZip();
 for(let i=0;i<data.length;i++){status(`Excel ${i+1} von ${data.length} wird erstellt …`);const blob=await exportWorkbook(state.buffer,JSZip,data[i]);const name=String(i+1).padStart(2,'0')+'_Drahtwerk_'+(data[i].project.name||'Anlage').replace(/[^a-zA-Z0-9_-]/g,'_')+'.xlsx';zip.file(name,blob);download(blob,name);}
 if(all)download(await zip.generateAsync({type:'blob'}),'Drahtwerk_Waerme_Anlagen.zip');status('Excel-Dateien erstellt. Über die Links speichern und in Excel öffnen.');
 }catch(e){status(e.message,true);}finally{state.busy=false;update();}}
$('projectForm').addEventListener('submit',e=>{e.preventDefault();runExport(false);});$('exportAll').onclick=()=>runExport(true);
drawFields();
state.busy=true;update();templateStore('get').then(async saved=>{if(saved)await loadTemplate(saved.buffer,saved.name);}).catch(()=>status('Gespeicherte Vorlage nicht verfügbar. Bitte Excel auswählen.')).finally(()=>{state.busy=false;update();});
