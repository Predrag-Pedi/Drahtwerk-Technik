import {confirmMessage as confirm} from '../ui/locale-text.mjs';
import {can,account,listRecords,writeRecord} from './client.mjs';
import {customerFields,contactFields,validateCustomer} from './customers-model.mjs';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collator=new Intl.Collator('de-CH',{numeric:true,sensitivity:'base'});
const writable=()=>can('customers',true);
let rows=[],current=null,dirty=false,busy=false,returnFocus=null;

function notice(text,error=false){
 for(const id of ['customerStatus','customerEditorStatus']){
  const el=$(id);if(!el)continue;el.textContent=text;el.className=error?'customer-error':'customer-meta';
 }
}
function changed(){dirty=true;notice('Änderungen noch nicht gespeichert.');}
const fields=(values,labels,prefix)=>Object.entries(labels).map(([key,label])=>`<label>${label}<input name="${prefix}${key}" maxlength="400" type="${key==='email'?'email':['phone','mobile'].includes(key)?'tel':'text'}" ${key==='name'?'required':''} value="${esc(values[key])}"></label>`).join('');

function list(){
 const active=rows.filter(r=>!r.value.archived);
 $('customerActiveCount').textContent=active.length;
 $('customerArchiveCount').textContent=rows.length-active.length;
 $('customerContactCount').textContent=active.reduce((n,r)=>n+r.value.contacts.length,0);
 $('customerCompany').textContent=account?.company?.name?`Gemeinsamer Kundenstamm · ${account.company.name}`:'Firmen, Adressen und Ansprechpersonen an einem Ort.';
 const query=$('customerSearch').value.trim().toLocaleLowerCase('de-CH');
 const visible=rows.filter(({value:c})=>(!c.archived||$('customerArchived').checked)&&[...Object.keys(customerFields).map(key=>c[key]),...c.contacts.flatMap(p=>Object.keys(contactFields).map(k=>p[k]))].join(' ').toLocaleLowerCase('de-CH').includes(query)).sort((a,b)=>collator.compare(a.value.name,b.value.name));
 $('customerCount').textContent=`${visible.length} von ${rows.length}`;
 if(!visible.length){
  const empty=!rows.length;
  $('customerList').innerHTML=`<div class="customer-empty"><h3>${empty?'Dein Kundenstamm beginnt hier.':'Keine passenden Kunden gefunden.'}</h3><p>${empty?'Erfasse eine Firma und ihre Kontaktpersonen. Dein Team kann die Angaben anschliessend in allen passenden Werkzeugen auswählen.':'Passe die Suche an oder zeige auch archivierte Kunden an.'}</p>${empty?(writable()?'<button type="button" class="customer-primary" data-new-customer>Ersten Kunden hinzufügen</button>':'<p>Mit Bearbeitungsrechten können hier Kunden erfasst werden.</p>'):'<button type="button" data-reset-search>Alle Kunden anzeigen</button>'}</div>`;
  return;
 }
 $('customerList').innerHTML=`<table class="customer-table"><caption class="customer-sr-only">Kunden mit Adressen, Kontaktpersonen und Kontaktdaten</caption><thead><tr><th scope="col">Firma / Kunde</th><th scope="col">Adresse</th><th scope="col">Kontaktpersonen</th><th scope="col">E-Mail / Telefon</th><th scope="col"><span class="customer-sr-only">Aktionen</span></th></tr></thead><tbody>${visible.map(({id,value:c})=>`<tr>
  <th scope="row" class="customer-identity"><strong>${esc(c.name)}</strong><small>${c.number?'Kundennr. '+esc(c.number):'Ohne Kundennummer'}</small>${c.archived?'<span class="customer-badge">Archiviert</span>':''}</th>
  <td class="customer-address" data-label="Adresse"><span>${esc([c.postcode,c.city].filter(Boolean).join(' '))||'Ort noch nicht erfasst'}</span><small>${esc([c.street,c.country].filter(Boolean).join(' · '))}</small></td>
  <td class="customer-people" data-label="Kontaktpersonen">${c.contacts.length?c.contacts.slice(0,2).map(p=>`<div><span>${esc(p.name)}</span>${p.role?`<small>${esc(p.role)}</small>`:''}</div>`).join('')+(c.contacts.length>2?`<small>+ ${c.contacts.length-2} weitere</small>`:''):'<small>Noch keine Kontaktperson</small>'}</td>
  <td class="customer-reach" data-label="E-Mail / Telefon">${c.email?`<span>${esc(c.email)}</span>`:''}${c.phone?`<span>${esc(c.phone)}</span>`:''}${!c.email&&!c.phone?'<small>Noch nicht erfasst</small>':''}</td>
  <td class="customer-open-cell"><button type="button" data-customer="${esc(id)}" aria-label="${esc(c.name)} öffnen">Öffnen</button></td>
 </tr>`).join('')}</tbody></table>`;
}

function collect(){
 if(!current||!writable())return;
 const form=new FormData($('customerForm'));
 for(const key of Object.keys(customerFields))current.value[key]=form.get('company_'+key)||'';
 current.value.contacts=current.value.contacts.map((person,i)=>({...person,...Object.fromEntries(Object.keys(contactFields).map(key=>[key,form.get('contact_'+i+'_'+key)||'']))}));
}

function renderEditor(){
 const c=current.value,write=writable();
 $('customerEditorTitle').translate=!c.name;$('customerEditorTitle').textContent=c.name||'Neuer Kunde';
 $('customerReadOnly').hidden=write;
 $('customerEditorContent').innerHTML=`<form id="customerForm"><fieldset ${write?'':'disabled'}>
  <section class="customer-editor-section"><div class="customer-section-heading"><div><h3>Firmendaten</h3><p>Adresse und Kontaktdaten für die Auswahl in deinen Werkzeugen.</p></div>${c.archived?'<span class="customer-badge">Archiviert</span>':''}</div><div class="customer-fields">${fields(c,customerFields,'company_')}</div></section>
  <section class="customer-editor-section"><div class="customer-section-heading"><div><h3>Kontaktpersonen <span class="customer-count">${c.contacts.length}</span></h3><p>Persönliche Kontaktdaten und bei Bedarf eine abweichende Adresse.</p></div></div>
   ${c.contacts.map((person,i)=>`<section class="customer-contact" aria-labelledby="contactTitle${i}"><div class="customer-contact-heading"><h4 id="contactTitle${i}"${person.name?' translate="no"':''}>${esc(person.name||'Neue Kontaktperson')}</h4><button type="button" class="customer-danger" data-remove-contact="${i}" aria-label="${esc(person.name||'Neue Kontaktperson')} entfernen">Kontakt entfernen</button></div><div class="customer-fields">${fields(person,contactFields,'contact_'+i+'_')}</div></section>`).join('')||'<p class="customer-contact-empty">Noch keine Kontaktperson erfasst.</p>'}
   <button type="button" id="addCustomerContact" ${c.contacts.length>=100?'disabled':''}>Kontaktperson hinzufügen</button>
  </section>
 </fieldset>
 <div class="customer-editor-actions"><p id="customerEditorStatus" role="status" aria-live="polite"></p><p class="customer-help">Bereits erstellte Dokumente behalten ihre Angaben. Archivierte Kunden bleiben erhalten.</p><div class="customer-action-buttons">${write?`<button class="customer-primary" type="submit">Kunde speichern</button>${rows.some(r=>r.id===current.id)?`<button type="button" id="archiveCustomer">${c.archived?'Kunde reaktivieren':'Kunde archivieren'}</button>`:''}`:''}</div></div>
 </form>`;
 $('customerForm').oninput=changed;
 $('customerForm').onsubmit=async event=>{
  event.preventDefault();if(busy||!writable())return;collect();await save(current.value);
 };
 $('addCustomerContact').onclick=()=>{
  if(busy||!writable()||current.value.contacts.length>=100)return;
  collect();current.value.contacts.push({id:crypto.randomUUID(),name:''});renderEditor();changed();
  $('customerForm').elements.namedItem(`contact_${current.value.contacts.length-1}_name`).focus();
 };
 const archive=$('archiveCustomer');if(archive)archive.onclick=async()=>{
  if(busy||!writable())return;collect();
  if(!confirm(c.archived?'Diesen Kunden wieder zur Auswahl anbieten?':'Diesen Kunden archivieren? Bestehende Dokumente bleiben erhalten.'))return;
  await save({...current.value,archived:!current.value.archived});
 };
 for(const button of $('customerEditorContent').querySelectorAll('[data-remove-contact]'))button.onclick=()=>{
  if(busy||!writable())return;
  if(!confirm('Kontakt aus dem Kundenstamm entfernen? Bestehende Dokumente behalten ihre Angaben.'))return;
  collect();current.value.contacts.splice(Number(button.dataset.removeContact),1);renderEditor();changed();$('addCustomerContact').focus();
 };
}

async function save(value){
 let candidate;try{candidate=validateCustomer(value);}catch(error){notice(error.message,true);return;}
 busy=true;$('customerEditorContent').inert=true;$('customerEditor').setAttribute('aria-busy','true');notice('Kunde wird gespeichert …');
 let saved=false;
 try{
  await writeRecord('customers',current.id,candidate);
  current.value=candidate;dirty=false;
  const index=rows.findIndex(r=>r.id===current.id);
  if(index<0)rows.push(structuredClone(current));else rows[index]=structuredClone(current);
  list();renderEditor();notice(candidate.archived?'Kunde archiviert. Die Angaben bleiben erhalten.':'Kunde im Betrieb gespeichert.');saved=true;
 }catch(error){notice('Speichern fehlgeschlagen: '+error.message,true);}
 finally{busy=false;$('customerEditorContent').inert=false;$('customerEditor').removeAttribute('aria-busy');}
 if(saved)$('customerForm').querySelector('[type="submit"]').focus({preventScroll:true});
}

function openCustomer(record,trigger){
 if(busy)return;returnFocus=trigger;current=structuredClone(record);dirty=false;notice('');renderEditor();
 $('customerEditor').showModal();$('customerEditor').scrollTop=0;
 if(!rows.some(r=>r.id===current.id))$('customerForm').elements.namedItem('company_name').focus();
}
function closeCustomer(){
 if(busy||dirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;
 dirty=false;current=null;$('customerEditor').close();notice('');
 // Saving redraws the list, so the original opener may no longer be connected.
 const id=returnFocus?.dataset?.customer;
 const target=returnFocus?.isConnected?returnFocus:[...$('customerList').querySelectorAll('[data-customer]')].find(el=>el.dataset.customer===id);
 (target||$('newCustomer').hidden&&$('customerSearch')||$('newCustomer')).focus();
}
function newCustomer(trigger){if(!writable())return;openCustomer({id:crypto.randomUUID(),value:{name:'',country:'Schweiz',contacts:[],archived:false}},trigger);}

async function load(){
 if(busy)return;busy=true;$('refreshCustomers').disabled=true;$('newCustomer').disabled=true;$('customerList').setAttribute('aria-busy','true');
 try{rows=await listRecords('customers');list();notice('');$('newCustomer').disabled=false;}
 catch(error){notice('Kunden konnten nicht geladen werden: '+error.message,true);if(!rows.length)$('customerList').innerHTML='<p class="customer-list-loading">Bitte versuche es mit «Aktualisieren» erneut.</p>';}
 finally{busy=false;$('refreshCustomers').disabled=false;$('customerList').setAttribute('aria-busy','false');}
}
$('customerList').onclick=event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-new-customer'))newCustomer(button);
 else if(button.hasAttribute('data-reset-search')){$('customerSearch').value='';$('customerArchived').checked=true;list();$('customerSearch').focus();}
 else if(button.dataset.customer){const record=rows.find(r=>r.id===button.dataset.customer);if(record)openCustomer(record,button);}
};
$('newCustomer').hidden=!writable();$('newCustomer').onclick=event=>newCustomer(event.currentTarget);
$('closeCustomer').onclick=closeCustomer;
$('customerEditor').addEventListener('cancel',event=>{event.preventDefault();closeCustomer();});
$('customerSearch').oninput=list;$('customerArchived').onchange=list;$('refreshCustomers').onclick=load;
window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
await load();
