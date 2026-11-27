import {confirmMessage as confirm} from '../ui/locale-text.mjs';
import {api} from './client.mjs';
import {formatDocumentNumber} from './document-model.mjs';
import {swissDay} from './model.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountDocumentSettings(root){
 root.textContent='Dokumentvorlagen werden geladen …';
 try{
  let saved=await api('/company/document-settings');if(!root.isConnected)return;
  const render=()=>{
   root.innerHTML=`<form id="documentSettingsForm"><div class="cards">${[['offer','Offerte'],['order','Auftrag / Auftragsbestätigung']].map(([kind,label])=>{const s=saved.value[kind];return `<section class="card"><h2>${label}</h2><label>Präfix<input name="${kind}_prefix" value="${esc(s.prefix)}" maxlength="20"></label><div class="grid"><label>Stellen der Laufnummer<input name="${kind}_digits" type="number" min="1" max="10" required value="${s.digits}"></label><label>Nächste Laufnummer<input name="${kind}_next" type="number" min="1" max="9999999999" required value="${s.next}"></label></div><label class="check"><input name="${kind}_includeYear" type="checkbox" ${s.includeYear?'checked':''}>Jahr vor der Laufnummer anzeigen</label><p class="muted">Vorschau: <strong data-number="${kind}"></strong></p><label>Einleitung<textarea name="${kind}_intro" rows="4" maxlength="10000">${esc(s.intro)}</textarea></label><label>Schlusstext / Bedingungen<textarea name="${kind}_closing" rows="4" maxlength="10000">${esc(s.closing)}</textarea></label></section>`;}).join('')}</div><p class="muted">Gilt für neue Dokumente dieser Firma. Bestehende Nummern und Texte bleiben erhalten. Vergebene Nummern werden übersprungen. Das Jahr ändert die Darstellung; die Laufnummer läuft weiter. Aufträge übernehmen vorhandene Bedingungen der genehmigten Offerte.</p><button class="primary">Vorlagen speichern</button> <button type="button" data-reload>Neu laden</button><p role="status" data-status></p></form>`;
   const form=root.querySelector('form'),status=root.querySelector('[data-status]');
   const value=()=>Object.fromEntries(['offer','order'].map(kind=>[kind,Object.fromEntries(['prefix','digits','next','includeYear','intro','closing'].map(key=>{const input=form.elements[kind+'_'+key];return [key,key==='includeYear'?input.checked:['digits','next'].includes(key)?Number(input.value):input.value];}))]));
   const preview=()=>{const v=value();for(const kind of ['offer','order'])root.querySelector(`[data-number="${kind}"]`).textContent=formatDocumentNumber(v[kind],swissDay().slice(0,4));};
   form.oninput=preview;preview();
   form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('.primary');button.disabled=true;try{saved=await api('/company/document-settings',{method:'PUT',body:{value:value(),revision:saved.revision}});render();root.querySelector('[data-status]').textContent='Dokumentvorlagen gespeichert.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
   root.querySelector('[data-reload]').onclick=async()=>{if(!confirm('Ungespeicherte Änderungen verwerfen und Vorlagen neu laden?'))return;await mountDocumentSettings(root);};
  };render();
 }catch(error){root.textContent=error.message;}
}
