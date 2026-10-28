import {ocrCache,ocrCacheKey,renameCachedPages} from './ocr-cache.mjs?v=20261028-5';
import {needsOcr,createOcrReader} from './ocr.mjs?v=20261028-5';
import {drawingItems,drawingLines} from './drawing.mjs?v=20261028-5';
import {buildPortfolio} from './portfolio.mjs?v=20261028-5';
import {templateStore} from './storage.mjs?v=20261028-5';
import {SHEETS,maxPv,candidates,suggestArticle,DEVICE_KINDS,parsePages,validateFields,defaultIcp,peakCurrent} from './core.mjs?v=20261028-5';
import {readWorkbook,exportWorkbook} from './workbook.mjs?v=20261028-5';
const $=id=>document.getElementById(id),state={buffer:null,book:null,devices:[],fields:[newField()],warnings:[],busy:false,icpManual:false};
function newField(){return{type:'SBR',b:null,h:null,t:null,percent:50,mode:'devices',manual:null};}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===''?null:Number(v),fmt=n=>Number.isFinite(n)?n.toLocaleString('de-CH',{maximumFractionDigits:2})+' W':'–';
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
function dirty(){ edited=true; $('reviewed').checked=false; invalidateDownloads(); }
function warnings(){ $('warnings').replaceChildren(...state.warnings.map(t=>{const li=document.createElement('li');li.textContent=t;return li;})); }
function fieldResult(f,i){
 const max=state.book?maxPv(f.type,f.b,f.h,f.t,state.book.get):null;
 const dev=state.devices.filter(d=>d.field===i+1&&d.qty>0),unresolved=dev.some(d=>!d.article);
 let total=null,calculationError='';try{if(state.book&&dev.length&&!unresolved)total=state.book.deviceTotal(dev);}catch(e){calculationError=e.message;}
 return {...f,max,device:total,calculationError,unresolved,selected:f.mode==='devices'?total:f.mode==='manual'?f.manual:max===null?null:max*f.percent/100};
}
function update(){
 try{
  state.fields.forEach((f,i)=>{const r=fieldResult(f,i);const card=document.querySelector('[data-field="'+i+'"]');if(card){card.querySelector('[data-key="percent"]').disabled=f.mode!=='estimate';card.querySelector('[data-key="manual"]').disabled=f.mode!=='manual';}$('max'+i).textContent=fmt(r.max);$('selected'+i).textContent=r.calculationError&&f.mode==='devices'?r.calculationError:fmt(r.selected);$('estimated'+i).textContent=f.mode==='estimate'?'Schätzung nach Einbaugrad':f.mode==='devices'?'Geräte gemäss Excel-Total':'Manueller Wattwert';});
  const unresolved=state.devices.filter(d=>d.qty>0&&!d.article).length;
  $('deviceTotal').textContent=`${state.devices.reduce((s,d)=>s+d.qty,0)} Geräte · ${unresolved} nicht zugeordnet. Berechnung anhand der Excel-Formeln bis «Total Verlustleistung Pv». Fehlende Verlustleistungswerte müssen ergänzt werden.`;
  if(!state.icpManual)$('icp').value=defaultIcp(state.devices,plants[active]?.smisslineInstalled);
  const ipk=peakCurrent($('icp').value);$('ipk').textContent=ipk===null?'–':ipk+' kA';
  updateEW();
  $('export').disabled=!state.book||state.busy||!$('reviewed').checked; $('exportAll').disabled=!state.book||state.busy; for(const id of ['template','reanalyze','plant','newProject','forgetTemplate','clearOcrCache'])$(id).disabled=state.busy;
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
function suggest(d){
 if(d.kind==='SPD'&&d.manualLoss==null)d.manualLoss=5;
 const cs=state.book?candidates(d,state.book.catalog):[],c=state.book?suggestArticle(d,state.book.catalog):null;
 d.article=c?.id||'';
 if(c){
  const assumptions=[];
  if(!d.poles&&c.poles){d.poles=c.poles;assumptions.push('Polzahl aus Referenz angenommen');}
  if(c.amp>d.amp&&d.amp&&['FUSE','NH','MAIN'].includes(d.kind))assumptions.push('nächsthöherer Tabellenstrom');
  if(cs.length>1&&d.kind!=='CONTACTOR')assumptions.push('mittlere Verlustleistung aus passenden Tabellenartikeln; Näherung');
  d.referenceNote='Excel-Referenz: '+c.label+(assumptions.length?' ('+assumptions.join('; ')+')':'');
 }else d.referenceNote='';
}

function drawDevices(){
 $('devices').innerHTML=state.devices.map((d,i)=>{
 const cs=state.book?(d.kind==='OTHER'?state.book.catalog:candidates(d,state.book.catalog)):[];
 return `<tr data-device="${i}" class="${d.article?'':'unresolved'}"><td><input aria-label="Gerätekennzeichen" data-key="ref" value="${escape(d.ref)}"><small>${escape(d.source)}</small>${d.note?'<small>'+escape(d.note)+'</small>':''}${d.referenceNote?'<small>'+escape(d.referenceNote)+'</small>':''}</td><td><select aria-label="Feld" data-key="field"><option value="0" ${!d.field?'selected':''}>Bitte zuordnen</option>${state.fields.map((_,j)=>`<option value="${j+1}" ${d.field===j+1?'selected':''}>${j+1}</option>`).join('')}</select></td><td><input aria-label="Anzahl" type="number" min="1" step="1" data-key="qty" value="${d.qty}"></td><td><select aria-label="System" data-key="system"><option value="hager" ${d.system==='hager'?'selected':''}>Hager</option><option value="smissline" ${d.system==='smissline'?'selected':''}>Smissline</option></select></td><td><select aria-label="Geräteart" data-key="kind">${DEVICE_KINDS.map(([k,v])=>`<option value="${k}" ${d.kind===k?'selected':''}>${v}</option>`).join('')}</select><div class="mini"><select aria-label="Polzahl" data-key="poles">${[['','Polzahl'],['LN','1P+N'],['3LN','3P+N'],['4P','4-polig'],['2S','2 Schliesser'],['4S','4 Schliesser']].map(([k,v])=>`<option value="${k}" ${d.poles===k?'selected':''}>${v}</option>`).join('')}</select><input aria-label="Nennstrom A" title="Nennstrom A" type="number" min="1" data-key="amp" value="${d.amp??''}"><input aria-label="Fehlerstrom mA" title="Fehlerstrom mA" type="number" min="1" data-key="ma" value="${d.ma??''}"></div></td><td><select aria-label="Excel-Referenzartikel" data-key="article"><option value="">Bitte zuordnen</option>${cs.map(c=>`<option value="${escape(c.id)}" ${d.article===c.id?'selected':''}>${escape(c.label)} · ${c.pv} W · ${escape(c.code)}</option>`).join('')}</select>${d.kind==='SPD'?`<label>Verlustleistung je Gerät (W)<input aria-label="Verlustleistung je Gerät W" type="number" min="0" step="any" data-key="manualLoss" value="${d.manualLoss??''}"></label><small>Vorgabe: 5 W je SPD, bei Bedarf anpassbar.</small>`:''}<small>${d.article?escape(d.article):'Kein eindeutiger Treffer. Angaben prüfen oder «Andere» für die ganze Artikelliste wählen.'}</small></td><td><button type="button" data-remove="${i}" aria-label="Gerät entfernen">Entfernen</button></td></tr>`;
 }).join('');update();
}
const documents=[],overrides={},links={};let plants=[],active=-1,importsPending=false,edited=false;
const projectKeys=['customer','customerNo','pl','name','order','city','amp','icp','date'];
function invalidateDownloads(){ $('downloads').querySelectorAll('a').forEach(a=>URL.revokeObjectURL(a.href));$('downloads').replaceChildren(); }
function saveActive(){if(active<0)return;Object.assign(plants[active],{fields:state.fields,devices:state.devices,warnings:state.warnings,icpManual:state.icpManual,reviewed:$('reviewed').checked,project:Object.fromEntries(projectKeys.map(k=>[k,$(k).value]))});}
function selectPlant(i){saveActive();active=i;const p=plants[i];if(!p)return;state.icpManual=!!p.icpManual;state.fields=p.fields;state.devices=p.devices;state.warnings=[...p.warnings,...(state.book?.corrections||[])];for(const key of projectKeys)$(key).value=p.project[key]??(key==='icp'?'6':'');$('reviewed').checked=p.reviewed;$('sources').textContent='Verwendete Dispo: '+p.layoutSource+'. Quellen: '+p.sources.join(' · ');warnings();drawFields();drawDevices();}
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
$('newProject').onclick=()=>{documents.length=0;plants=[];active=-1;importsPending=false;Object.keys(overrides).forEach(k=>delete overrides[k]);Object.keys(links).forEach(k=>delete links[k]);state.icpManual=false;state.fields=[newField()];state.devices=[];state.warnings=[];projectKeys.forEach(k=>$(k).value=k==='icp'?'6':'');$('plant').replaceChildren();$('pending').replaceChildren();$('sources').textContent='';dirty();warnings();drawFields();drawDevices();status('Neuer Auftrag. Gespeicherte Vorlage bleibt verfügbar.');};
async function loadTemplate(buffer,name){if(!globalThis.JSZip)throw Error('Excel-Bibliothek konnte nicht geladen werden.');const book=await readWorkbook(buffer,globalThis.JSZip);state.buffer=buffer;state.book=book;state.devices.forEach(suggest);plants.forEach(p=>{p.devices.forEach(suggest);p.reviewed=false;});$('reviewed').checked=false;$('towns').replaceChildren(...book.towns.map(t=>new Option(t.name,t.name)));$('pdf').disabled=false;status(`${name}: ${book.catalog.length} Referenzartikel geladen.`);drawDevices();}
$('template').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;state.busy=true;dirty();update();try{if(file.size>15*1024*1024)throw Error('Excel-Vorlage ist zu gross (maximal 15 MB).');const buffer=await file.arrayBuffer();await loadTemplate(buffer,file.name);try{await templateStore('put',{buffer,name:file.name});}catch{status('Vorlage geladen, konnte aber nicht dauerhaft gespeichert werden.',true);}}catch(e){status(e.message,true);}finally{state.busy=false;update();}});
$('clearOcrCache').onclick=async()=>{try{await ocrCache('clear');status('Gespeicherte PDF-Texterkennung gelöscht.');}catch{status('Texterkennungsspeicher konnte nicht gelöscht werden.',true);}};
$('forgetTemplate').onclick=async()=>{try{await templateStore('delete');state.book=null;state.buffer=null;$('template').value='';$('pdf').disabled=true;dirty();update();status('Gespeicherte Vorlage gelöscht.');}catch(e){status(e.message,true);}};
$('pdf').addEventListener('change',async e=>{
 const files=Array.from(e.target.files);if(!files.length)return;state.busy=true;$('pdf').disabled=true;update();
 const ocr=createOcrReader(message=>status(message));
 try{const role='auto',pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const imported=[];for(const file of files){if(file.size>40*1024*1024)throw Error(file.name+': maximal 40 MB.');const bytes=new Uint8Array(await file.arrayBuffer());let cacheKey=null,cached;try{cacheKey=await ocrCacheKey(bytes);cached=await ocrCache('get',cacheKey);}catch{}if(cached){status(file.name+': gespeicherte Texterkennung übernommen.');imported.push({file:file.name,role,pages:renameCachedPages(cached,file.name)});continue;}const doc=await pdfjs.getDocument({data:bytes,isEvalSupported:false}).promise;const pages=[];
 try{if(doc.numPages>200)throw Error('Maximal 200 Seiten pro PDF.');for(let i=1;i<=doc.numPages;i++){status(`${file.name}: Seite ${i} von ${doc.numPages}`);const page=await doc.getPage(i),content=await page.getTextContent(),vp=page.getViewport({scale:1});let items=drawingItems(content,vp),text=items.map(x=>x.str).join('\n'),recognized={};if(needsOcr(items)){recognized=await ocr.read(page,`${file.name}: Seite ${i} von ${doc.numPages}`);items=recognized.items;text=recognized.text;}let drawing;try{if(!recognized.ocr&&/\bReserve\b|\bRes\./i.test(text))drawing=drawingLines(await page.getOperatorList(),pdfjs.OPS,vp);}catch{drawing={complete:false,segments:[]};}pages.push({file:file.name,number:i,...recognized,text,items,height:vp.height,drawing});}}finally{await doc.destroy();}if(cacheKey&&pages.some(p=>p.ocr))try{await ocrCache('put',cacheKey,pages);}catch{}imported.push({file:file.name,role,pages});}
 for(const doc of imported){const i=documents.findIndex(d=>d.file===doc.file);if(i>=0)documents[i]=doc;else documents.push(doc);}
 importsPending=true;invalidateDownloads();if(!plants.length||!edited)analyze();else status('PDFs eingelesen. Mit «Imports auswerten / Eingaben ersetzen» die Anlagen neu erkennen lassen. Dabei werden manuelle Eingaben ersetzt.');
 }catch(e){status(e.message,true);}finally{await ocr.close().catch(()=>{});state.busy=false;$('pdf').disabled=!state.book;e.target.value='';update();}
});
$('fields').addEventListener('input',e=>{const card=e.target.closest('[data-field]'),key=e.target.dataset.key;if(!card||!key)return;const f=state.fields[+card.dataset.field];f[key]=['type','mode'].includes(key)?e.target.value:number(e.target.value);dirty();update();});
$('fields').addEventListener('click',e=>{if(e.target.dataset.removeField!==undefined){const i=+e.target.dataset.removeField;if(state.devices.some(d=>d.field===i+1)){status('Zuerst die Geräte dieses Felds einem anderen Feld zuordnen.',true);return;}state.fields.pop();dirty();drawFields();drawDevices();}});
$('addField').onclick=()=>{if(state.fields.length>=5)return;state.fields.push(newField());dirty();drawFields();drawDevices();};
$('addDevice').onclick=()=>{state.devices.push({ref:'Manuell '+(state.devices.length+1),source:'Manuell',field:1,qty:1,system:'hager',kind:'OTHER',poles:'',amp:null,ma:null,article:''});dirty();drawDevices();};
$('devices').addEventListener('change',e=>{const row=e.target.closest('[data-device]'),key=e.target.dataset.key;if(!row||!key)return;const d=state.devices[+row.dataset.device];d[key]=['field','qty','amp','ma','manualLoss'].includes(key)?number(e.target.value):e.target.value;if(['system','kind','poles','amp','ma'].includes(key))suggest(d);dirty();drawDevices();});
$('devices').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){state.devices.splice(+e.target.dataset.remove,1);dirty();drawDevices();}});
$('projectForm').addEventListener('input',e=>{if(e.target.id==='icp')state.icpManual=true;if(e.target.id!=='reviewed')dirty();else edited=true;update();});
function exportData(p){
 if(!validateFields(p.fields))throw Error(p.name+': Feldmasse oder Einbaugrad fehlen.');
 if(!p.reviewed)throw Error(p.name+': Angaben noch nicht geprüft.');
 if(!p.devices.every(d=>Number.isInteger(d.qty)&&d.qty>0&&Number.isInteger(d.field)&&d.field>=1&&d.field<=p.fields.length))throw Error(p.name+': Geräte einem gültigen Feld zuordnen.');
 const previous=state.devices;let fields;try{state.devices=p.devices;fields=p.fields.map(fieldResult);}finally{state.devices=previous;}
 if(fields.some(f=>!Number.isFinite(f.selected)||f.selected<0))throw Error(p.name+': Wattwerte oder Gerätezuordnungen fehlen.');
 const project={...p.project,type:fields[0].type,amp:Number(p.project.amp),icp:Number(p.project.icp)};
 if(peakCurrent(project.icp)===null)throw Error(p.name+': Icp muss eine positive Zahl in kA sein.');
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
