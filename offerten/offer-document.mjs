import {offerItemName} from './sbr.mjs?v=20261111-8';
import {logoData} from './logo.mjs?v=20261111-4';
import {visibleInTotals,totals,line,description,money,priceMode,offerText} from './core.mjs?v=20261111-14';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines=v=>esc(v).replace(/\n/g,'<br>');
// Inline table styles also travel with the rich-text clipboard representation.
export function offerHTML(doc,value='plant',editing=false){
 const mode=priceMode(value);offerText(doc,mode);const t=totals(doc),detail=mode==='detail',cols=detail?5:4;
 const editable=(text,key)=>editing?' <span data-offer-text="'+key+'" contenteditable="plaintext-only" role="textbox" aria-label="Angebotstext '+key+'" style="display:block;white-space:pre-wrap;min-height:1.5em;padding:6px;border:1px dashed #7297c6;background:#f4f8ff;">'+esc(text)+'</span>':lines(text);
 const cell='padding:9px 8px;border-bottom:1px solid #e2e7ed;vertical-align:top;';
 const td=(v,align='left')=>`<td style="${cell}text-align:${align};${align==='right'?'white-space:nowrap;':''}">${v}</td>`;
 const totalRow=(label,amount)=>`<tr class="document-total"><td colspan="${cols-1}" style="${cell}font-weight:700;">${esc(label)}</td>${td('<strong>'+money(amount)+'</strong>','right')}</tr>`;
 const date=/^\d{4}-\d{2}-\d{2}$/.test(doc.date)?doc.date.split('-').reverse().join('.'):doc.date;
 const dateText=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('.'):v;
 let html=`<article class="quote-document" style="font-family:Arial,sans-serif;color:#172c43;font-size:13px;line-height:1.5;"><header>
 <table style="width:100%;border-collapse:collapse;margin-bottom:30px;"><tr><td style="width:52%;vertical-align:top;"><img src="${logoData}" alt="Drahtwerk" style="display:block;width:190px;max-width:100%;height:auto;margin-bottom:14px;"/><strong>Drahtwerk GmbH</strong><br>Lochackerstrasse 4<br>8424 Embrach</td><td style="vertical-align:bottom;padding-left:20px;"><strong>${lines(doc.customer)}</strong>${doc.recipientAddress?'<br>'+lines(doc.recipientAddress):''}</td></tr></table>
 <h1 style="font-size:24px;margin:0;padding-bottom:10px;border-bottom:2px solid #173f70;">Offerte${doc.number?' '+esc(doc.number):''}</h1>
 ${doc.project?'<p style="font-size:16px;font-weight:700;margin:10px 0;">'+lines(doc.project)+'</p>':''}
 <table style="width:100%;font-size:12px;border-collapse:collapse;border-bottom:1px solid #dbe4ee;margin-bottom:18px;"><tr>${td('Datum: '+esc(date||'–'))}${td(doc.contact?'Ihr Ansprechpartner: '+esc(doc.contact):'')}</tr><tr>${td(doc.validUntil?'Gültig bis: '+esc(dateText(doc.validUntil)):'MWST-Nr.: CHE-242.474.758 MWST')}${td(doc.customerNumber?'Kundennummer: '+esc(doc.customerNumber):'Alle Preise in CHF')}</tr></table>
 ${doc.address?'<p><strong>Objektadresse</strong><br>'+lines(doc.address)+'</p>':''}</header><p>${editable(doc.intro,'intro')}</p>`;
 doc.plants.forEach((p,pi)=>{
 if(mode==='totals'){
 html+='<section class="document-plant"><h2 style="font-size:18px;border-bottom:2px solid #173f70;padding-bottom:8px;margin:28px 0 12px;">'+(pi+1)+'. '+editable(p.name,'p'+pi+'name')+'</h2>';
 if(description(p)||editing)html+='<p>'+editable(description(p),'p'+pi+'desc')+'</p>';
 p.parts.forEach((part,si)=>{
 html+='<h3 style="font-size:14px;">'+(pi+1)+'.'+(si+1)+' '+editable(part.name,'p'+pi+'s'+si+'name')+'</h3>';
 if(part.notes||editing)html+='<p>'+editable(part.notes,'p'+pi+'s'+si+'notes')+'</p>';
 part.items.forEach((item,ii)=>{if(visibleInTotals(item))html+='<div style="margin:12px 0;"><strong>'+esc((pi+1)+'.'+(si+1)+'.'+(ii+1))+'</strong> '+editable(offerItemName(item),'p'+pi+'s'+si+'i'+ii)+'<p>'+esc(item.qty)+' '+esc(item.unit||'Stk.')+'</p></div>';});
 });
 html+='<table style="border-collapse:collapse;width:100%;font-size:13px;"><tbody><tr>'+td('<strong>'+esc('Total '+p.name)+'</strong>')+td('<strong>CHF '+money(t.plants[pi].total)+'</strong>','right')+'</tr></tbody></table></section>';
 return;
 }

 html+=`<section class="document-plant"><h2 style="font-size:18px;border-bottom:2px solid #173f70;padding-bottom:8px;margin:28px 0 12px;">${pi+1}. ${editable(p.name,'p'+pi+'name')}</h2><table style="border-collapse:collapse;width:100%;font-size:13px;"><thead><tr style="background:#eef3f8;">${['Pos.','Artikelbezeichnung','Menge / Einheit',...(detail?['Einzelpreis','Betrag']:['Betrag'])].map((v,i)=>`<th style="${cell}text-align:${i>1?'right':'left'};">${v}</th>`).join('')}</tr></thead><tbody>`;
 if(description(p)||editing)html+='<tr>'+td('')+td('<strong>Schrank / Ausführung</strong><br>'+editable(description(p),'p'+pi+'desc'))+td('')+(detail?td(''):'')+td('')+'</tr>';
 // Five columns in detailed mode; four in grouped modes.
 p.parts.forEach((s,si)=>{
 html+=`<tr><td colspan="${detail?5:4}" style="padding:18px 8px 8px;font-weight:700;">${pi+1}.${si+1} ${editable(s.name,'p'+pi+'s'+si+'name')}${(s.notes||editing)?'<div style="font-weight:400;">'+editable(s.notes,'p'+pi+'s'+si+'notes')+'</div>':''}</td></tr>`;
 s.items.forEach((i,ii)=>{const l=line(i,doc);html+='<tr>'+td(`${pi+1}.${si+1}.${ii+1}`)+td(editable(offerItemName(i),'p'+pi+'s'+si+'i'+ii))+td(esc(i.qty)+' '+esc(i.unit||'Stk.'),'right')+(detail?td(money(l.unit),'right')+td(money(l.total),'right'):td('','right'))+'</tr>';});
 if(mode!=='plant')html+=totalRow('Total '+s.name,t.plants[pi].parts[si].total);
 });html+=totalRow('Total '+p.name,t.plants[pi].total)+'</tbody></table></section>';
 });
 html+='<section class="document-summary"><h2 style="font-size:18px;margin-top:30px;">Zusammenstellung</h2><table style="border-collapse:collapse;width:100%;font-size:13px;">';
 t.plants.forEach((p,i)=>{html+='<tr>'+td(esc(`${i+1}. ${doc.plants[i].name}`))+td('CHF '+money(p.total),'right')+'</tr>';});
 html+='<tr>'+td('Zwischentotal')+td('CHF '+money(t.subtotal),'right')+'</tr>';
 if(doc.discount)html+='<tr>'+td('Rabatt '+esc(doc.discount)+' %')+td('−CHF '+money(t.discount),'right')+'</tr>';
 html+='<tr>'+td('<strong>Angebotstotal exkl. MWST</strong>')+td('<strong>CHF '+money(t.total)+'</strong>','right')+'</tr>';
 html+='<tr>'+td('Zzgl. MWST '+money(t.vatRate)+' %')+td('CHF '+money(t.vat),'right')+'</tr><tr style="background:#eef3f8;border-top:2px solid #173f70;">'+td('<strong>Angebotstotal inkl. MWST</strong>')+td('<strong>CHF '+money(t.gross)+'</strong>','right')+'</tr></table></section>';
 if(doc.closing||editing)html+='<p style="margin-top:24px;">'+editable(doc.closing,'closing')+'</p>';
 return html+'<footer style="margin-top:36px;padding-top:12px;border-top:1px solid #b8c9da;font-size:10px;color:#617389;">Drahtwerk GmbH · Lochackerstrasse 4 · 8424 Embrach<br>info@drahtwerk.ch · 044 666 69 70 · www.drahtwerk.ch<br>MWST-Nr.: CHE-242.474.758 MWST</footer></article>';
}
