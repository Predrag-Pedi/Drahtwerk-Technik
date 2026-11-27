import {confirmMessage as confirm} from '../ui/locale-text.mjs';
import {materialStatus,materialLabel} from './material-model.mjs';
import {inventoryLines} from './inventory-view.mjs';
import {api,can,companyProfile,serverMode} from './client.mjs';
import {orderStatuses,summaryCSV,positionsCSV} from './document-model.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
import {exportOfferPdf} from '../offerten/offer-pdf.mjs';
import {totals,money} from '../offerten/core.mjs';

const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dialog=$('documentDialog');
const state={orders:[],company:companyProfile()};
let shown=[],selected=null,busy=false,dirty=false,loaded=false,opener=null;

const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('.'):value||'–';
const message=text=>{$('documentsFeedback').textContent=text;};
const download=(name,content,type)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name.replace(/[^\p{L}\p{N} ._-]/gu,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
function filtered(){const query=$('documentSearch').value.trim().toLocaleLowerCase(),from=$('dateFrom').value,to=$('dateTo').value,status=$('documentStatus').value;return state.orders.filter(d=>(!query||[d.number,d.customer,d.customerNumber,d.project,d.sourceOfferNumber,d.reference].join(' ').toLocaleLowerCase().includes(query))&&(!from||d.date>=from)&&(!to||d.date<=to)&&(!status||d.status===status));}
function render(){
 shown=filtered().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.number).localeCompare(String(b.number),undefined,{numeric:true}));
 $('documentCount').textContent=shown.length;$('collectionTitle').textContent='Aufträge';
 const sum=shown.reduce((n,d)=>{try{return n+totals(d).total;}catch{return n;}},0);
 $('statTotal').textContent=state.orders.length;$('statOpen').textContent=state.orders.filter(d=>['open','progress'].includes(d.status)).length;
 $('statAmount').textContent='CHF '+money(sum);
 $('statAmountLabel').textContent='Nettowert · Auswahl';
 for(const id of ['exportSummary','exportDetails','exportJSON'])$(id).disabled=!loaded||!shown.length;
 $('documentList').setAttribute('aria-busy',String(!loaded));
 $('documentList').innerHTML=shown.length?`<div class="documents-table-wrap"><table class="documents-table"><thead><tr><th>NUMMER / PROJEKT</th><th>KUNDE</th><th>DATUM</th><th>STATUS</th><th class="document-amount">NETTO / BRUTTO</th></tr></thead><tbody>${shown.map((d,i)=>{let amounts;try{const t=totals(d);amounts='CHF '+money(t.total)+'<small>CHF '+money(t.gross)+' inkl. MWST</small>';}catch{amounts='Betrag prüfen';}return `<tr><td><button class="document-open" data-open="${i}">${esc(d.number||'Ohne Nummer')}<small>${esc(d.project||'Ohne Projektbezeichnung')}</small></button>${d.sourceOfferNumber?'<small>Offerte '+esc(d.sourceOfferNumber)+'</small>':''}</td><td>${esc(d.customer||'Noch kein Kunde')}<small>${esc(d.contact||'')}</small></td><td>${esc(date(d.date))}${d.deliveryDate?'<small>Lieferung '+esc(date(d.deliveryDate))+'</small>':''}</td><td><span class="document-status ${esc(d.status)}">${esc(orderStatuses[d.status]||d.status)}</span>${materialStatus(d)!=='none'?'<br><span class="stock-status '+materialStatus(d)+'">'+materialLabel(d)+'</span>':''}${d.inventory?.lines?.some(l=>l.missing>0)?'<br><span class="stock-status pending">Lagermaterial fehlt</span>':''}</td><td class="document-amount">${amounts}</td></tr>`;}).join('')}</tbody></table></div>`:`<div class="documents-empty"><h3>${state.orders.length?'Keine passenden Dokumente':'Hier erscheinen deine Aufträge.'}</h3><p>${state.orders.length?'Passe die Suche oder den Zeitraum an.':'Öffne eine genehmigte Offerte und wähle «Auftrag erstellen».'}</p></div>`;
 for(const button of document.querySelectorAll('[data-open]'))button.onclick=()=>openDocument(shown[Number(button.dataset.open)],button);
}
async function load(){
 $('refreshDocuments').disabled=true;message('');
 try{const rows=await api('/company/orders');state.orders=rows.map(r=>({...r.value,_revision:r.revision}));loaded=true;render();const id=new URLSearchParams(location.search).get('id');if(id&&!dialog.open){const d=state.orders.find(x=>x.id===id);if(d)openDocument(d);else message('Dieser Auftrag ist nicht verfügbar.');}}
 catch(error){message(error.message);if(!loaded)$('documentList').textContent='Dokumente konnten nicht geladen werden. Bitte erneut versuchen.';}
 finally{$('refreshDocuments').disabled=false;}
}
function openDocument(d,button){
 selected=d;dirty=false;opener=button||document.activeElement;$('documentTitle').textContent='Auftrag '+(d.number||'');$('documentError').textContent='';
 const editable=can('orders',true);
 $('receivedMaterials').hidden=!d.customerMaterials?.length;
 $('receivedMaterials').innerHTML=d.customerMaterials?.length?'<h3>Angeliefertes Material</h3><p><span class="stock-status '+materialStatus(d)+'">'+materialLabel(d)+'</span></p>'+d.customerMaterials.map((r,i)=>'<div class="inventory-receipt"><strong>'+esc(r.name)+'</strong><small>'+esc(r.article)+' · Erwartet: '+r.qty+' '+esc(r.unit)+(r.notes?' · '+esc(r.notes):'')+'</small><label>Erhalten ('+esc(r.unit)+')<input type="number" min="0" max="'+r.qty+'" step="any" data-received="'+i+'" value="'+(d.materialReceipts?.[r.id]?.qty||0)+'"></label>'+(editable?'<button type="button" data-complete="'+i+'">Vollständig erhalten</button>':'')+(d.materialReceipts?.[r.id]?'<small>Zuletzt erfasst: '+esc(d.materialReceipts[r.id].by)+' · '+esc(new Date(d.materialReceipts[r.id].at).toLocaleString('de-CH'))+'</small>':'')+'</div>').join(''):'';
 for(const b of $('receivedMaterials').querySelectorAll('[data-complete]'))b.onclick=()=>{const i=Number(b.dataset.complete);$('receivedMaterials').querySelector('[data-received="'+i+'"]').value=d.customerMaterials[i].qty;dirty=true;};
 $('orderStock').hidden=!d.inventory?.lines?.length;
 $('orderStock').innerHTML=d.inventory?.lines?.length?'<h3>Lagerauszug</h3>'+inventoryLines(d.inventory.lines):'';

 $('orderState').innerHTML=Object.entries(orderStatuses).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');$('orderState').value=d.status;for(const [id,key] of [['deliveryDate','deliveryDate'],['customerReference','reference'],['orderNotes','internalNotes']])$(id).value=d[key]||'';for(const el of $('orderForm').querySelectorAll('input,select,textarea'))el.disabled=!editable;$('saveOrder').hidden=!editable;
 $('documentNotes').textContent='Die bestätigten Positionen, Preise und Firmendaten wurden bei der Auftragserstellung übernommen. Die Auftragsbestätigung ist keine Rechnung.';
 try{$('documentPreview').innerHTML=offerHTML(d,d.outputMode||'plant',false,d.companyProfile);}catch(error){$('documentPreview').textContent='Vorschau nicht verfügbar: '+error.message;}
 if(!dialog.open)dialog.showModal();
}
function close(){if(busy){$('documentError').textContent='Bitte warten, bis die laufende Aktion abgeschlossen ist.';return;}if(dirty&&!confirm('Ungespeicherte Auftragsangaben verwerfen?'))return;dialog.close();selected=null;dirty=false;opener?.focus();if(location.search)history.replaceState(null,'',location.pathname);}
$('closeDocument').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
$('orderForm').oninput=()=>{dirty=true;};
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
async function saveOrder(){
 if(!selected||!can('orders',true))return false;
 const result=await api('/company/orders/'+encodeURIComponent(selected.id),{method:'PATCH',body:{revision:selected._revision,value:{status:$('orderState').value,deliveryDate:$('deliveryDate').value,reference:$('customerReference').value,internalNotes:$('orderNotes').value,received:Object.fromEntries([...$('receivedMaterials').querySelectorAll('[data-received]')].map(input=>[selected.customerMaterials[Number(input.dataset.received)].id,Number(input.value)]))}}});
 const next={...result.value,_revision:result.revision};state.orders=state.orders.map(d=>d.id===next.id?next:d);openDocument(next,opener);render();return true;
}
async function run(action){if(busy)return;busy=true;for(const b of dialog.querySelectorAll('button'))b.disabled=true;try{await action();}catch(error){$('documentError').textContent=error.message;}finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}}
$('orderForm').onsubmit=e=>{e.preventDefault();run(async()=>{await saveOrder();$('documentError').textContent='Auftragsangaben gespeichert.';});};
$('exportPdf').onclick=()=>run(async()=>{if(dirty&&!await saveOrder())return;const d=structuredClone(selected),blob=await exportOfferPdf(d,d.outputMode||'plant',{profile:d.companyProfile||state.company});download('Auftragsbestätigung '+d.number+'.pdf',blob,'application/pdf');});
$('exportDocument').onclick=()=>run(async()=>{if(dirty&&!await saveOrder())return;download((selected.number||'Dokument')+'.json',JSON.stringify({format:'schaltbase-dokument',version:1,company:state.company,document:selected},null,2),'application/json');});
function exportSelection(type){try{if(!loaded)throw Error('Dokumente zuerst laden.');if(type==='json'){const data=shown.map(({_revision,...d})=>d);download('SchaltBase-orders.json',JSON.stringify({format:'schaltbase-abrechnungsunterlagen',version:1,exportedAt:new Date().toISOString(),company:state.company,kind:'orders',documents:data},null,2),'application/json');}else download('SchaltBase-orders-'+type+'.csv',type==='positionen'?positionsCSV(shown):summaryCSV(shown),'text/csv;charset=utf-8');message('Export erstellt: '+shown.length+' Dokumente aus der aktuellen Auswahl.');}catch(error){message('Export fehlgeschlagen: '+error.message);}}
$('exportSummary').onclick=()=>exportSelection('uebersicht');$('exportDetails').onclick=()=>exportSelection('positionen');$('exportJSON').onclick=()=>exportSelection('json');
for(const id of ['documentSearch','dateFrom','dateTo','documentStatus'])$(id).addEventListener('input',render);
$('refreshDocuments').onclick=load;
if(!serverMode){message('Dieses Werkzeug benötigt den Firmenzugang auf SchaltBase.');$('documentList').textContent='Bitte auf schaltbase.ch anmelden.';}
else{$('documentStatus').innerHTML='<option value="">Alle Status</option>'+Object.entries(orderStatuses).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');render();await load();}
