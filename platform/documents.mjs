import {account,api,can,companyProfile,addressLines,serverMode} from './client.mjs';
import {orderStatuses,summaryCSV,positionsCSV,reportsCSV} from './document-model.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
import {exportOfferPdf} from '../offerten/offer-pdf.mjs';
import {totals,money,OFFER_STATUSES} from '../offerten/core.mjs';

const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const accounting=document.body.dataset.workspace==='accounting',dialog=$('documentDialog');
const state={orders:[],offers:[],reports:[],company:companyProfile()};
let kind='orders',shown=[],selected=null,busy=false,dirty=false,loaded=false,opener=null;
const statusLabels={...OFFER_STATUSES,...orderStatuses,signed:'Unterschrieben',invoiced:'Verrechnet'};
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('.'):value||'–';
const message=text=>{$('documentsFeedback').textContent=text;};
const download=(name,content,type)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name.replace(/[^\p{L}\p{N} ._-]/gu,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
function filtered(){const query=$('documentSearch').value.trim().toLocaleLowerCase(),from=$('dateFrom').value,to=$('dateTo').value,status=$('documentStatus').value;return state[kind].filter(d=>(!query||[d.number,d.customer,d.customerNumber,d.project,d.sourceOfferNumber,d.reference].join(' ').toLocaleLowerCase().includes(query))&&(!from||d.date>=from)&&(!to||d.date<=to)&&(!status||d.status===status));}
function setKind(next){kind=next;message('');for(const b of document.querySelectorAll('[data-kind]'))b.setAttribute('aria-pressed',String(b.dataset.kind===kind));const statuses=kind==='orders'?orderStatuses:kind==='offers'?OFFER_STATUSES:{signed:'Unterschrieben',invoiced:'Verrechnet'};$('documentStatus').innerHTML='<option value="">Alle Status</option>'+Object.entries(statuses).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');render();}
function render(){
 shown=filtered().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.number).localeCompare(String(b.number),undefined,{numeric:true}));
 $('documentCount').textContent=shown.length;$('collectionTitle').textContent=kind==='orders'?'Aufträge':kind==='offers'?'Offerten':'Unterschriebene Regierapporte';
 const sum=shown.reduce((n,d)=>{try{return n+totals(d).total;}catch{return n;}},0);
 $('statTotal').textContent=state.orders.length;$('statOpen').textContent=state.orders.filter(d=>['open','progress'].includes(d.status)).length;
 $('statAmount').textContent=kind==='reports'?shown.reduce((n,r)=>n+r.work.reduce((h,w)=>h+w.hours,0),0).toLocaleString('de-CH')+' h':'CHF '+money(sum);
 $('statAmountLabel').textContent=kind==='reports'?'Arbeitsstunden · Auswahl':'Nettowert · Auswahl';
 for(const id of ['exportSummary','exportDetails','exportJSON'])$(id).disabled=!loaded||!shown.length;
 $('documentList').setAttribute('aria-busy',String(!loaded));
 $('documentList').innerHTML=shown.length?`<div class="documents-table-wrap"><table class="documents-table"><thead><tr><th>NUMMER / PROJEKT</th><th>KUNDE</th><th>DATUM</th><th>STATUS</th><th class="document-amount">${kind==='reports'?'ARBEIT / FAHRT':'NETTO / BRUTTO'}</th></tr></thead><tbody>${shown.map((d,i)=>{let amounts;try{const t=totals(d);amounts='CHF '+money(t.total)+'<small>CHF '+money(t.gross)+' inkl. MWST</small>';}catch{amounts=kind==='reports'?money(d.work.reduce((n,w)=>n+w.hours,0))+' h<small>'+esc(d.km)+' km</small>':'Betrag prüfen';}return `<tr><td><button class="document-open" data-open="${i}">${esc(d.number||'Ohne Nummer')}<small>${esc(d.project||'Ohne Projektbezeichnung')}</small></button>${d.sourceOfferNumber?'<small>Offerte '+esc(d.sourceOfferNumber)+'</small>':''}</td><td>${esc(d.customer||'Noch kein Kunde')}<small>${esc(d.contact||'')}</small></td><td>${esc(date(d.date))}${d.deliveryDate?'<small>Lieferung '+esc(date(d.deliveryDate))+'</small>':''}</td><td><span class="document-status ${esc(d.status)}">${esc(statusLabels[d.status]||d.status)}</span></td><td class="document-amount">${amounts}</td></tr>`;}).join('')}</tbody></table></div>`:`<div class="documents-empty"><h3>${state[kind].length?'Keine passenden Dokumente':'Hier erscheinen deine '+(kind==='orders'?'Aufträge':kind==='offers'?'Offerten':'bestätigten Rapporte')+'.'}</h3><p>${state[kind].length?'Passe die Suche oder den Zeitraum an.':kind==='orders'?'Öffne eine genehmigte Offerte und wähle «Auftrag erstellen».':kind==='reports'?'Nach der Unterschrift stehen Rapporte für die Abrechnung bereit.':'Erstellte Offerten werden hier zur Übergabe bereitgestellt.'}</p></div>`;
 for(const button of document.querySelectorAll('[data-open]'))button.onclick=()=>openDocument(shown[Number(button.dataset.open)],button);
}
async function load(){
 $('refreshDocuments').disabled=true;message('');
 try{if(accounting){Object.assign(state,await api('/company/accounting'));}else{const rows=await api('/company/orders');state.orders=rows.map(r=>({...r.value,_revision:r.revision}));}loaded=true;render();const id=new URLSearchParams(location.search).get('id');if(id&&!dialog.open){const d=state.orders.find(x=>x.id===id);if(d)openDocument(d);else message('Dieser Auftrag ist nicht verfügbar.');}}
 catch(error){message(error.message);if(!loaded)$('documentList').textContent='Dokumente konnten nicht geladen werden. Bitte erneut versuchen.';}
 finally{$('refreshDocuments').disabled=false;}
}
function reportHTML(r){
 const rows=(headers,items)=>'<table><thead><tr>'+headers.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+items.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 const signature=r.signature,height=700/(signature?.aspectRatio||700/220),paths=(signature?.paths||[]).map(points=>'<polyline points="'+points.map(([x,y])=>`${x*700},${y*height}`).join(' ')+'" fill="none" stroke="#183d54" stroke-width="2"/>').join('');
 return `<article><p>${addressLines(r.company||state.company).map(esc).join('<br>')}</p><h1>Regierapport ${esc(r.number)}</h1><p><strong>${esc(r.customer)}</strong><br>${esc(r.customerAddress).replaceAll('\n','<br>')}<br>${esc(r.contact)}<br>${esc([r.customerEmail,r.customerPhone].filter(Boolean).join(' · '))}</p><p>${esc(r.project)} · ${esc(date(r.date))}<br>Einsatzort: ${esc(r.location)}</p>${rows(['Datum','Mitarbeiter','Tätigkeit','Stunden'],r.work.map(w=>[date(w.date),w.employee,w.activity,w.hours]))}<h2>Material</h2>${rows(['Artikel','Bezeichnung','Menge','Einheit'],r.materials.map(m=>[m.article,m.description,m.quantity,m.unit]))}<p>Fahrt: ${esc(r.km)} km · Fahrtzeit: ${esc(r.travelHours)} h · Spesen: CHF ${money(r.expenses)}</p><p><strong>${r.completed?'Arbeiten abgeschlossen':'Weitere Arbeiten offen'}</strong></p><p>${esc(r.notes).replaceAll('\n','<br>')}</p><h2>Kundenbestätigung</h2><svg class="report-signature" viewBox="0 0 700 ${height}" role="img" aria-label="Kundenunterschrift">${paths}</svg><p>${esc(signature?.name)} · ${esc(signature?.place)}<br>${esc(signature?.signedAt?new Date(signature.signedAt).toLocaleString('de-CH',{timeZone:'Europe/Zurich'}):'')}</p></article>`;
}
function openDocument(d,button){
 selected=d;dirty=false;opener=button||document.activeElement;$('documentTitle').textContent=(kind==='orders'?'Auftrag ':kind==='offers'?'Offerte ':'Regierapport ')+(d.number||'');$('documentError').textContent='';
 const editable=!accounting&&can('orders',true),isOrder=d.documentType==='order';
 $('orderForm').hidden=!isOrder;
 if(isOrder){$('orderState').innerHTML=Object.entries(orderStatuses).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');$('orderState').value=d.status;for(const [id,key] of [['deliveryDate','deliveryDate'],['customerReference','reference'],['orderNotes','internalNotes']])$(id).value=d[key]||'';for(const el of $('orderForm').querySelectorAll('input,select,textarea'))el.disabled=!editable;$('saveOrder').hidden=!editable;}
 $('documentNotes').textContent=isOrder?'Die bestätigten Positionen, Preise und Firmendaten wurden bei der Auftragserstellung übernommen. Die Auftragsbestätigung ist keine Rechnung.':kind==='reports'?'Unterschriebener Nachweis. Für die Rechnungsstellung können Zeiten und Material exportiert werden.':'Offertendaten zur Übergabe. Eine Offerte ist keine Rechnung.';
 $('exportPdf').hidden=kind==='reports';$('printReport').hidden=kind!=='reports';
 try{$('documentPreview').innerHTML=kind==='reports'?reportHTML(d):offerHTML(d,d.outputMode||'plant',false,isOrder?d.companyProfile:state.company);}catch(error){$('documentPreview').textContent='Vorschau nicht verfügbar: '+error.message;}
 if(!dialog.open)dialog.showModal();
}
function close(){if(busy){$('documentError').textContent='Bitte warten, bis die laufende Aktion abgeschlossen ist.';return;}if(dirty&&!confirm('Ungespeicherte Auftragsangaben verwerfen?'))return;dialog.close();selected=null;dirty=false;opener?.focus();if(location.search)history.replaceState(null,'',location.pathname);}
$('closeDocument').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
$('orderForm').oninput=()=>{dirty=true;};
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
async function saveOrder(){
 if(!selected||!can('orders',true)||accounting)return false;
 const result=await api('/company/orders/'+encodeURIComponent(selected.id),{method:'PATCH',body:{revision:selected._revision,value:{status:$('orderState').value,deliveryDate:$('deliveryDate').value,reference:$('customerReference').value,internalNotes:$('orderNotes').value}}});
 const next={...result.value,_revision:result.revision};state.orders=state.orders.map(d=>d.id===next.id?next:d);openDocument(next,opener);render();return true;
}
async function run(action){if(busy)return;busy=true;for(const b of dialog.querySelectorAll('button'))b.disabled=true;try{await action();}catch(error){$('documentError').textContent=error.message;}finally{busy=false;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}}
$('orderForm').onsubmit=e=>{e.preventDefault();run(async()=>{await saveOrder();$('documentError').textContent='Auftragsangaben gespeichert.';});};
$('exportPdf').onclick=()=>run(async()=>{if(dirty&&!await saveOrder())return;const d=structuredClone(selected),blob=await exportOfferPdf(d,d.outputMode||'plant',{profile:d.companyProfile||state.company});download((d.documentType==='order'?'Auftragsbestätigung ':'Offerte ')+d.number+'.pdf',blob,'application/pdf');});
$('printReport').onclick=()=>window.print();
$('exportDocument').onclick=()=>run(async()=>{if(dirty&&!await saveOrder())return;download((selected.number||'Dokument')+'.json',JSON.stringify({format:'schaltbase-dokument',version:1,company:state.company,document:selected},null,2),'application/json');});
function exportSelection(type){try{if(!loaded)throw Error('Dokumente zuerst laden.');if(type==='json'){const data=shown.map(({_revision,...d})=>d);download('SchaltBase-'+kind+'.json',JSON.stringify({format:'schaltbase-abrechnungsunterlagen',version:1,exportedAt:new Date().toISOString(),company:state.company,kind,documents:data},null,2),'application/json');}else download('SchaltBase-'+kind+'-'+type+'.csv',kind==='reports'?reportsCSV(shown,type==='positionen'):type==='positionen'?positionsCSV(shown):summaryCSV(shown),'text/csv;charset=utf-8');message('Export erstellt: '+shown.length+' Dokumente aus der aktuellen Auswahl.');}catch(error){message('Export fehlgeschlagen: '+error.message);}}
$('exportSummary').onclick=()=>exportSelection('uebersicht');$('exportDetails').onclick=()=>exportSelection('positionen');$('exportJSON').onclick=()=>exportSelection('json');
for(const id of ['documentSearch','dateFrom','dateTo','documentStatus'])$(id).addEventListener('input',render);
for(const button of document.querySelectorAll('[data-kind]'))button.onclick=()=>setKind(button.dataset.kind);
$('refreshDocuments').onclick=load;
if(!serverMode){message('Dieses Werkzeug benötigt den Firmenzugang auf SchaltBase.');$('documentList').textContent='Bitte auf schaltbase.ch anmelden.';}
else{setKind('orders');await load();}
