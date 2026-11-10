import {ready,calculationBusy,captureCalculation,restoreCalculation,resetCalculation} from './app.mjs?v=20261110-8';
import {projectRepository,projectSummary} from './projects.mjs?v=20261110-8';
const $=id=>document.getElementById(id),editor=$('heatEditor');
let records=[],current=null,changed=false,working=false,applying=false;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s).toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'});
function controls(){const busy=working||calculationBusy();for(const id of ['heatSave','heatClose','heatNew','heatNewEmpty'])$(id).disabled=busy;}
function saveState(message){$('heatSaveState').textContent=message;}
function render(){
 const q=$('heatSearch').value.trim().toLocaleLowerCase('de-CH');const shown=records.filter(r=>[r.title,r.order,r.customer].join(' ').toLocaleLowerCase('de-CH').includes(q));
 $('heatCount').textContent=records.length;$('heatPlantCount').textContent=records.reduce((n,r)=>n+r.plantCount,0);
 $('heatEmpty').hidden=!!records.length;$('heatProjects').closest('.heat-list-wrap').hidden=!records.length;
 $('heatProjects').innerHTML=shown.map(r=>`<tr><td><button class="heat-project-open" type="button" data-open="${escape(r.id)}"><span class="heat-order">${escape(r.order||'Ohne Auftragsnummer')}</span><strong>${escape(r.title)}</strong></button></td><td>${escape(r.customer||'–')}</td><td>${r.plantCount} Anlage(n) · ${r.fieldCount} Feld(er)</td><td>${escape(date(r.updatedAt))}</td><td><button type="button" data-open="${escape(r.id)}" aria-label="${escape(r.title)} öffnen">Öffnen</button></td></tr>`).join('');
 $('heatListStatus').textContent=records.length&&!shown.length?'Keine passenden Berechnungen gefunden.':'';
}
async function refresh(){records=await projectRepository.list();render();}
function lock(value){working=value;document.querySelector('.heat-editor-content').inert=value;controls();}
function show(){editor.showModal();document.body.classList.add('heat-editor-open');document.querySelector('.heat-editor-content').scrollTop=0;}
async function create(){if(working||calculationBusy())return;applying=true;try{resetCalculation();current=null;changed=true;$('heatEditorTitle').textContent='Neue Wärmeberechnung';saveState('Noch nicht gespeichert');show();}finally{applying=false;controls();}}
async function open(id){if(working||calculationBusy())return;lock(true);applying=true;try{const record=await projectRepository.load(id);if(!record)throw Error('Diese Berechnung ist nicht mehr verfügbar.');await restoreCalculation(record.snapshot);current=record;changed=false;$('heatEditorTitle').textContent=record.title;saveState('Gespeichert am '+date(record.updatedAt));show();}catch(e){$('heatListStatus').textContent='Öffnen nicht möglich: '+e.message;}finally{applying=false;lock(false);}}
async function save(){
 if(working||calculationBusy())return;
 lock(true);saveState('Wird gespeichert …');
 try{const snapshot=captureCalculation();const now=new Date().toISOString();const record={id:current?.id||crypto.randomUUID(),createdAt:current?.createdAt||now,updatedAt:now,...projectSummary(snapshot),snapshot};await projectRepository.save(record);current=record;changed=false;$('heatEditorTitle').textContent=record.title;saveState('Gespeichert am '+date(now));try{await refresh();}catch{saveState('Gespeichert. Übersicht bitte nach dem Schliessen neu laden.');}}
 catch(e){saveState('Speichern fehlgeschlagen: '+e.message+' Bitte erneut versuchen; der Entwurf bleibt geöffnet.');}
 finally{lock(false);}
}
function close(){if(working||calculationBusy())return;if(changed&&!confirm('Ungespeicherte Änderungen verwerfen und schliessen? Zum Behalten bitte abbrechen und «Speichern» wählen.'))return;editor.close();document.body.classList.remove('heat-editor-open');changed=false;}
$('heatNew').onclick=create;$('heatNewEmpty').onclick=create;$('heatSave').onclick=save;$('heatClose').onclick=close;
$('heatSearch').addEventListener('input',render);
$('heatProjects').addEventListener('click',e=>{const button=e.target.closest('[data-open]');if(button)open(button.dataset.open);});
editor.addEventListener('cancel',e=>{e.preventDefault();close();});
const reset=$('newProject').onclick;$('newProject').onclick=()=>{if(editor.open&&!confirm('Alle Eingaben dieses Entwurfs leeren? Der gespeicherte Stand bleibt bis zum nächsten Speichern erhalten.'))return;reset();};
document.addEventListener('heat-change',()=>{if(applying||!editor.open)return;changed=true;saveState('Ungespeicherte Änderungen');});
document.addEventListener('heat-state',controls);
window.addEventListener('beforeunload',e=>{if(editor.open&&(changed||working||calculationBusy())){e.preventDefault();e.returnValue='';}});
// Native anchors also work without JS; avoid changing the overview URL while editing.
editor.querySelectorAll('.heat-steps a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();editor.querySelector(a.hash)?.scrollIntoView({behavior:'auto',block:'start'});}));
controls();await ready;controls();try{await refresh();}catch(e){$('heatListStatus').textContent='Lokaler Speicher nicht verfügbar: '+e.message;}
