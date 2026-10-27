import {SHEETS,maxPv,candidates,parsePages,validateFields} from './core.mjs';
import {readWorkbook,exportWorkbook} from './workbook.mjs';
const $=id=>document.getElementById(id),state={buffer:null,book:null,devices:[],fields:[newField()],warnings:[],busy:false};
function newField(){return{type:'SBR',b:null,h:null,t:null,percent:50,mode:'estimate',manual:null};}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===''?null:Number(v),fmt=n=>Number.isFinite(n)?n.toLocaleString('de-CH',{maximumFractionDigits:2})+' W':'–';
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
function dirty(){ $('reviewed').checked=false; }
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
  $('export').disabled=!state.book||state.busy||!$('reviewed').checked;
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
 return `<tr data-device="${i}" class="${d.article?'':'unresolved'}"><td><input aria-label="Gerätekennzeichen" data-key="ref" value="${escape(d.ref)}"><small>${escape(d.source)}</small>${d.note?'<small>'+escape(d.note)+'</small>':''}</td><td><select aria-label="Feld" data-key="field">${state.fields.map((_,j)=>`<option value="${j+1}" ${d.field===j+1?'selected':''}>${j+1}</option>`).join('')}</select></td><td><input aria-label="Anzahl" type="number" min="1" step="1" data-key="qty" value="${d.qty}"></td><td><select aria-label="System" data-key="system"><option value="hager" ${d.system==='hager'?'selected':''}>Hager</option><option value="smissline" ${d.system==='smissline'?'selected':''}>Smissline</option></select></td><td><select aria-label="Geräteart" data-key="kind">${[['FILS','FI/LS'],['LS','LS'],['FI','FI'],['OTHER','Andere']].map(([k,v])=>`<option value="${k}" ${d.kind===k?'selected':''}>${v}</option>`).join('')}</select><div class="mini"><select aria-label="Polzahl" data-key="poles">${[['','Polzahl'],['LN','1P+N'],['3LN','3P+N']].map(([k,v])=>`<option value="${k}" ${d.poles===k?'selected':''}>${v}</option>`).join('')}</select><input aria-label="Nennstrom A" title="Nennstrom A" type="number" min="1" data-key="amp" value="${d.amp??''}"><input aria-label="Fehlerstrom mA" title="Fehlerstrom mA" type="number" min="1" data-key="ma" value="${d.ma??''}"></div></td><td><select aria-label="Excel-Referenzartikel" data-key="article"><option value="">Bitte zuordnen</option>${cs.map(c=>`<option value="${escape(c.id)}" ${d.article===c.id?'selected':''}>${escape(c.label)} · ${c.pv} W · ${escape(c.code)}</option>`).join('')}</select><small>${d.article?escape(d.article):'Kein eindeutiger Treffer. Angaben prüfen oder «Andere» für die ganze Artikelliste wählen.'}</small></td><td><button type="button" data-remove="${i}" aria-label="Gerät entfernen">Entfernen</button></td></tr>`;
 }).join('');update();
}
$('template').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;state.book=null;state.buffer=null;state.busy=true;$('pdf').disabled=true;dirty();update();
 try{if(!globalThis.JSZip)throw Error('Excel-Bibliothek konnte nicht geladen werden. Internetverbindung prüfen und Seite neu laden.');if(file.size>15*1024*1024)throw Error('Excel-Vorlage ist zu gross (maximal 15 MB).');
  const buffer=await file.arrayBuffer(),book=await readWorkbook(buffer,globalThis.JSZip);state.buffer=buffer;state.book=book;state.devices.forEach(suggest);
  $('towns').replaceChildren(...book.towns.map(t=>new Option(t.name,t.name)));$('pdf').disabled=false;status(`${file.name}: ${book.catalog.length} Referenzartikel geladen.`);drawDevices();
 }catch(e){status(e.message,true);}finally{state.busy=false;update();}
});
$('pdf').addEventListener('change',async e=>{
 const files=Array.from(e.target.files);if(!files.length)return;state.busy=true;$('pdf').disabled=true;dirty();update();
 try{status('PDFs werden ausgelesen …');const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  const pages=[];for(const file of files){if(file.size>40*1024*1024)throw Error(file.name+': maximal 40 MB pro PDF.');const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
   try{if(doc.numPages>200)throw Error(file.name+': maximal 200 Seiten.');for(let i=1;i<=doc.numPages;i++){status(`${file.name}: Seite ${i} von ${doc.numPages}`);const page=await doc.getPage(i),content=await page.getTextContent();pages.push({file:file.name,number:i,text:content.items.filter(x=>'str'in x).map(x=>x.str).join('\n')});}}finally{await doc.destroy();}}
  const parsed=parsePages(pages);state.warnings=[...parsed.warnings,...parsed.ignored.map(s=>s+': Anschlussbedingungen übersprungen.')];
  const existing=new Set(state.devices.map(d=>d.ref));for(const d of parsed.devices)if(!existing.has(d.ref)){suggest(d);state.devices.push(d);existing.add(d.ref);}
  for(const key of ['name','order','city'])if(!$ (key).value&&parsed.project[key])$(key).value=parsed.project[key];
  if(parsed.project.type)state.fields[0].type=parsed.project.type;
  if(parsed.dimensions.length===1&&!state.fields[0].b)Object.assign(state.fields[0],parsed.dimensions[0]);
  else if(parsed.dimensions.length>1)state.warnings.push('Mehrere Abmessungen gefunden: '+parsed.dimensions.map(d=>`${d.b} × ${d.h} × ${d.t} mm (${d.source})`).join('; ')+'. Bitte den Feldern zuordnen.');
  const currents=[...new Set(parsed.currents.map(c=>c.amp))];if(currents.length===1&&!$('amp').value)$('amp').value=currents[0];else if(currents.length>1)state.warnings.push('Abweichende Stromangaben ausserhalb der Anschlussbedingungen: '+currents.join(' / ')+' A. Bitte festlegen.');
  if(pages.every(p=>p.text.replace(/\s/g,'').length<30))state.warnings.push('Das PDF enthält keinen auslesbaren Text. Scans benötigen manuelle Eingaben; eine OCR-Erkennung ist hier nicht enthalten.');
  warnings();drawFields();drawDevices();status(`${parsed.devices.length} Geräte erkannt. Angaben und Vollständigkeit bitte prüfen.`);
 }catch(e){status('PDF konnte nicht verarbeitet werden: '+e.message,true);}finally{state.busy=false;$('pdf').disabled=!state.book;update();}
});
$('fields').addEventListener('input',e=>{const card=e.target.closest('[data-field]'),key=e.target.dataset.key;if(!card||!key)return;const f=state.fields[+card.dataset.field];f[key]=['type','mode'].includes(key)?e.target.value:number(e.target.value);dirty();update();});
$('fields').addEventListener('click',e=>{if(e.target.dataset.removeField!==undefined){const i=+e.target.dataset.removeField;if(state.devices.some(d=>d.field===i+1)){status('Zuerst die Geräte dieses Felds einem anderen Feld zuordnen.',true);return;}state.fields.pop();dirty();drawFields();drawDevices();}});
$('addField').onclick=()=>{if(state.fields.length>=5)return;state.fields.push(newField());dirty();drawFields();drawDevices();};
$('addDevice').onclick=()=>{state.devices.push({ref:'Manuell '+(state.devices.length+1),source:'Manuell',field:1,qty:1,system:'hager',kind:'OTHER',poles:'',amp:null,ma:null,article:''});dirty();drawDevices();};
$('devices').addEventListener('change',e=>{const row=e.target.closest('[data-device]'),key=e.target.dataset.key;if(!row||!key)return;const d=state.devices[+row.dataset.device];d[key]=['field','qty','amp','ma'].includes(key)?number(e.target.value):e.target.value;if(['system','kind','poles','amp','ma'].includes(key))suggest(d);dirty();drawDevices();});
$('devices').addEventListener('click',e=>{if(e.target.dataset.remove!==undefined){state.devices.splice(+e.target.dataset.remove,1);dirty();drawDevices();}});
$('projectForm').addEventListener('input',e=>{if(e.target.id!=='reviewed')dirty();update();});
$('projectForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!state.book||state.busy)return;
 try{if(!validateFields(state.fields))throw Error('Bitte gültige Feldmasse und einen Einbaugrad von 0 bis 100 % eingeben.');
  if(!state.devices.every(d=>Number.isInteger(d.qty)&&d.qty>0))throw Error('Gerätestückzahlen müssen ganze Zahlen grösser null sein.');
  const fields=state.fields.map(fieldResult);if(fields.some(f=>!Number.isFinite(f.selected)||f.selected<0))throw Error('Für die gewählte Methode fehlen Wattwerte oder Gerätezuordnungen.');
  const project=Object.fromEntries(['customer','customerNo','pl','name','order','city'].map(k=>[k,$(k).value.trim()]));project.type=fields[0].type;project.amp=Number($('amp').value);project.icp=Number($('icp').value);
  if(!state.book.towns.some(t=>t.name.toLocaleLowerCase('de-CH')===project.city.toLocaleLowerCase('de-CH')))throw Error('Bitte einen gültigen Ort aus der Vorlage auswählen.');
  if(!$('reviewed').checked)throw Error('Bitte die Angaben zuerst prüfen.');
  state.busy=true;update();status('Excel wird erstellt …');const blob=await exportWorkbook(state.buffer,globalThis.JSZip,{project,fields,devices:state.devices});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Drahtwerk_Waerme_'+(project.order||project.name||'Projekt').replace(/[^a-zA-Z0-9_-]/g,'_')+'.xlsx';const old=document.getElementById('downloadReady');if(old){URL.revokeObjectURL(old.href);old.remove();}a.id='downloadReady';a.textContent='Excel-Datei jetzt speichern';a.className='home';a.style.display='inline-block';a.style.margin='12px';$('export').after(a);status('Excel erstellt. Mit «Excel-Datei jetzt speichern» herunterladen und in Excel öffnen.');
 }catch(e){status(e.message,true);}finally{state.busy=false;update();}
});
drawFields();
