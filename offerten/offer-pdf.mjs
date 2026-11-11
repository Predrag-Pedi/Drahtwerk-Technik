import {offerItemName} from './sbr.mjs?v=20261111-8';
import {visibleInTotals,offerText,totals,line,description,money,priceMode} from './core.mjs?v=20261111-14';
import {logoData} from './logo.mjs?v=20261111-4';
import {imagePdf} from './image-pdf.mjs?v=20261111-4';
// A4 pages at 3x resolution; rows wrap and continue on fresh pages.
export async function renderOfferPages(doc,mode='plant',env={}){
 mode=priceMode(mode);offerText(doc,mode);const t=totals(doc),detail=mode==='detail';
 const create=env.createCanvas||(()=>document.createElement('canvas'));
 const logo=await (env.loadImage?env.loadImage(logoData):new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Firmenlogo konnte nicht geladen werden.'));i.src=logoData;}));
 const pages=[];let canvas,ctx,y,table=false;
 const cols=detail?[36,75,355,425,487]:[36,75,405,487],widths=detail?[33,274,64,57,72]:[33,324,76,72];
 function font(size=10,bold=false){ctx.font=`${bold?'bold ':''}${size}px Arial, sans-serif`;ctx.fillStyle='#172f4b';ctx.textBaseline='top';}
 function newPage(){canvas=create();canvas.width=1786;canvas.height=2526;ctx=canvas.getContext('2d');ctx.scale(3,3);ctx.fillStyle='white';ctx.fillRect(0,0,596,842);ctx.drawImage(logo,36,24,142,53.15);font(9);ctx.fillText('Offerte '+(doc.number||''),360,44);y=96;pages.push(canvas);}
 function wrap(text,width,size=10,bold=false){font(size,bold);const out=[];for(const para of String(text??'').split('\n')){let row='';for(const word of para.split(/\s+/)){if(row&&ctx.measureText(row+' '+word).width>width){out.push(row);row='';}for(const ch of (row?' ':'')+word){if(ctx.measureText(row+ch).width>width&&row){out.push(row);row='';}row+=ch;}}out.push(row);}return out;}
 function tableHead(){font(8,true);ctx.fillStyle='#edf2f7';ctx.fillRect(36,y,523,25);font(8,true);const names=detail?['Pos.','Artikelbezeichnung','Menge / Einheit','Einzelpreis','Betrag']:['Pos.','Artikelbezeichnung','Menge / Einheit','Betrag'];names.forEach((n,i)=>ctx.fillText(n,cols[i],y+8));y+=29;}
 function ensure(height){if(y+height>770){newPage();if(table)tableHead();}}
 function paragraph(text,size=10,bold=false){const lines=wrap(text,523,size,bold);for(const l of lines){ensure(size*1.4);font(size,bold);ctx.fillText(l,36,y);y+=size*1.4;}y+=7;}
 function row(values,bold=false,fill=false){const texts=values.map((v,i)=>wrap(v,widths[i]-6,9,bold));let offset=0;const count=Math.max(...texts.map(a=>a.length));if(count*12+10<650)ensure(count*12+10);while(offset<count){ensure(25);const take=Math.min(count-offset,Math.max(1,Math.floor((770-y-10)/12)));const h=take*12+10;if(fill){ctx.fillStyle='#edf2f7';ctx.fillRect(36,y,523,h);}font(9,bold);texts.forEach((ls,i)=>ls.slice(offset,offset+take).forEach((l,j)=>{const x=i>=2?cols[i]+widths[i]-6-ctx.measureText(l).width:cols[i];ctx.fillText(l,x,y+5+j*12);}));y+=h;ctx.strokeStyle='#e1e7ee';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(36,y);ctx.lineTo(559,y);ctx.stroke();offset+=take;}}
 function total(label,value){const v=detail?['',label,'','',money(value)]:['',label,'',money(value)];row(v,true,true);}
 newPage();
 // Letterhead: company at left, recipient at right, followed by compact offer metadata.
 const left=wrap('Drahtwerk GmbH\nLochackerstrasse 4\n8424 Embrach',245,9);
 const right=wrap([doc.customer,doc.recipientAddress].filter(Boolean).join('\n'),235,10);
 const count=Math.max(left.length,right.length);
 for(let i=0;i<count;i++){ensure(14);if(left[i]){font(9,i===0);ctx.fillText(left[i],36,y);}if(right[i]){font(10,i===0);ctx.fillText(right[i],324,y);}y+=14;}
 y+=24;paragraph('Offerte '+(doc.number||''),20,true);
 ctx.strokeStyle='#173f70';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(36,y);ctx.lineTo(559,y);ctx.stroke();y+=12;
 if(doc.project)paragraph(doc.project,12,true);
 const date=v=>String(v||'').split('-').reverse().join('.');
 paragraph(['Datum: '+date(doc.date),doc.validUntil?'Gültig bis: '+date(doc.validUntil):'',doc.contact?'Ihr Ansprechpartner: '+doc.contact:'',doc.customerNumber?'Kundennummer: '+doc.customerNumber:''].filter(Boolean).join('\n'),9);
 if(doc.address)paragraph('Objektadresse: '+doc.address,9);
 paragraph('Alle Preise in CHF. Positionspreise exkl. MWST.',8);y+=5;paragraph(doc.intro);

 doc.plants.forEach((p,pi)=>{table=false;ensure(90);paragraph(`${pi+1}. ${p.name}`,14,true);if(mode==='totals'){if(description(p))paragraph(description(p));
 p.parts.forEach((part,si)=>{ensure(60);paragraph(`${pi+1}.${si+1} ${part.name}`,11,true);if(part.notes)paragraph(part.notes);part.items.forEach((item,ii)=>{if(visibleInTotals(item)){paragraph(`${pi+1}.${si+1}.${ii+1} ${offerItemName(item)}`);paragraph(`${item.qty} ${item.unit||'Stk.'}`);}});});total('Total '+p.name,t.plants[pi].total);y+=20;return;}table=true;tableHead();if(description(p))row(detail?['','Schrank / Ausführung\n'+description(p),'','','']:['','Schrank / Ausführung\n'+description(p),'','']);p.parts.forEach((s,si)=>{ensure(60);row(detail?['',`${pi+1}.${si+1} ${s.name}`,'','','']:['',`${pi+1}.${si+1} ${s.name}`,'',''],true);if(s.notes)row(detail?['',s.notes,'','','']:['',s.notes,'','']);s.items.forEach((i,ii)=>{const l=line(i,doc);row([`${pi+1}.${si+1}.${ii+1}`,offerItemName(i),`${i.qty} ${i.unit||'Stk.'}`,...(detail?[money(l.unit),money(l.total)]:[''])]);});if(mode!=='plant')total('Total '+s.name,t.plants[pi].parts[si].total);});total('Total '+p.name,t.plants[pi].total);table=false;y+=20;});
 ensure(Math.min(650,50+(t.plants.length+4+(doc.discount?1:0))*34));paragraph('Zusammenstellung',14,true);t.plants.forEach((p,i)=>total(`${i+1}. ${doc.plants[i].name}`,p.total));total('Zwischentotal',t.subtotal);if(doc.discount)total(`Rabatt ${doc.discount} %`,-t.discount);total('Angebotstotal exkl. MWST',t.total);total('Zzgl. MWST '+money(t.vatRate)+' %',t.vat);total('Angebotstotal inkl. MWST',t.gross);y+=14;if(doc.closing)paragraph(doc.closing);
 pages.forEach((c,i)=>{const g=c.getContext('2d');g.strokeStyle='#b8c9da';g.lineWidth=.5;g.beginPath();g.moveTo(36,789);g.lineTo(559,789);g.stroke();g.font='7px Arial';g.fillStyle='#65758a';g.fillText('Drahtwerk GmbH · Lochackerstrasse 4 · 8424 Embrach',36,798);g.fillText('info@drahtwerk.ch · 044 666 69 70 · www.drahtwerk.ch',36,809);g.fillText('MWST-Nr.: CHE-242.474.758 MWST',36,820);g.fillText(`Seite ${i+1} / ${pages.length}`,505,820);});return pages;
}
export async function exportOfferPdf(doc,mode){const canvases=await renderOfferPages(doc,mode),pages=[];for(const c of canvases){const b=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.96));if(!b)throw Error('PDF-Seite konnte nicht erstellt werden.');pages.push({width:c.width,height:c.height,bytes:new Uint8Array(await b.arrayBuffer())});c.width=c.height=1;}return imagePdf(pages);}
