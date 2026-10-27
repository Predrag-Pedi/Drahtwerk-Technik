import {SHEETS,classify} from './core.mjs?v=20261027-3';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('Ungültiges XML in Excel-Datei');return d;};
const tags=(n,t)=>Array.from(n.getElementsByTagNameNS('*',t));
const text=(n,t)=>tags(n,t)[0]?.textContent??'';
const ser=d=>new XMLSerializer().serializeToString(d);
function el(doc,name,value){const n=doc.createElementNS(NS,name);if(value!==undefined)n.textContent=String(value);return n;}
function col(a){return a.match(/^[A-Z]+/)[0].split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);}
export async function readWorkbook(buffer,Zip){
  const zip=await Zip.loadAsync(buffer),load=async p=>{const f=zip.file(p);if(!f)throw Error('Excel-Bestandteil fehlt: '+p);return xml(await f.async('string'));};
  const book=await load('xl/workbook.xml'),rels=await load('xl/_rels/workbook.xml.rels');
  const strings=zip.file('xl/sharedStrings.xml')?tags(await load('xl/sharedStrings.xml'),'si').map(n=>tags(n,'t').map(t=>t.textContent).join('')):[];
  const paths=new Map(tags(rels,'Relationship').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const sheets=new Map();
  for(const s of tags(book,'sheet')){
    const id=s.getAttribute('r:id'),target=paths.get(id);if(!target)throw Error('Blattbezug fehlt');
    const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
    const doc=await load(path),cells=new Map();
    for(const c of tags(doc,'c')){const t=c.getAttribute('t'),v=text(c,'v');cells.set(c.getAttribute('r'),{node:c,value:t==='s'?strings[+v]:t==='inlineStr'?tags(c,'t').map(n=>n.textContent).join(''):t==='str'?v:v!==''?Number(v):null,formula:text(c,'f')});}
    sheets.set(s.getAttribute('name'),{path,doc,cells});
  }
  for(const n of Object.values(SHEETS))if(!sheets.has(n))throw Error('Die Drahtwerk-Vorlage benötigt das Blatt «'+n+'».');
  const get=(s,a)=>sheets.get(s)?.cells.get(a)?.value??null;
  const catalog=[];
  for(const name of [SHEETS.fine,SHEETS.supply]){
    let section='';
    const sheet=sheets.get(name),rows=tags(sheet.doc,'row');
    for(const row of rows){const r=Number(row.getAttribute('r')),label=get(name,'B'+r),pv=get(name,'E'+r),formula=sheet.cells.get('F'+r)?.formula;
      if(typeof label!=='string')continue;
      if(/^(Hager|ABB)/i.test(label)&&typeof pv!=='number'&&!/^Total/i.test(label))section=label;
      // Keep the Smissline family through subsection headings that omit its name.
      if(/^ABB/i.test(section)&&r>=356&&r<=465&&name===SHEETS.fine)section+=' SMISSLINE';
      if(typeof pv==='number'&&!/^Total/i.test(label)&&sheet.cells.get('F'+r)?.node&&tags(sheet.cells.get('F'+r).node,'f').length>0){
        const c=classify(label,section);catalog.push({id:name+'!'+r,sheet:name,row:r,label,code:String(get(name,'G'+r)||''),pv,wire:typeof get(name,'J'+r)==='number'?get(name,'J'+r):0,...c});
      }
    }
  }
  const towns=[];const ts=sheets.get('EW-Zuweisung');if(ts)for(const r of tags(ts.doc,'row')){const i=r.getAttribute('r'),name=get('EW-Zuweisung','A'+i),ew=get('EW-Zuweisung','B'+i);if(typeof name==='string'&&typeof ew==='string')towns.push({name,ew});}
  return {zip,book,rels,sheets,catalog,towns,get};
}
function put(w,sheet,addr,value,formula){
  const s=w.sheets.get(sheet);if(!s)throw Error('Blatt fehlt: '+sheet);
  let cell=s.cells.get(addr)?.node;
  if(!cell){const data=tags(s.doc,'sheetData')[0],rn=parseInt(addr.replace(/\D/g,''));let row=tags(data,'row').find(r=>+r.getAttribute('r')===rn);
    if(!row){row=el(s.doc,'row');row.setAttribute('r',rn);const next=tags(data,'row').find(r=>+r.getAttribute('r')>rn);data.insertBefore(row,next||null);}
    cell=el(s.doc,'c');cell.setAttribute('r',addr);const next=tags(row,'c').find(c=>col(c.getAttribute('r'))>col(addr));row.insertBefore(cell,next||null);s.cells.set(addr,{node:cell});
  }
  for(const child of Array.from(cell.childNodes))if(['f','v','is'].includes(child.localName))cell.removeChild(child);
  cell.removeAttribute('t');
  if(formula)cell.appendChild(el(s.doc,'f',formula));
  if(value!==null&&value!==undefined){if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Ungültiger Zahlenwert '+addr);cell.appendChild(el(s.doc,'v',value));}else {cell.setAttribute('t','inlineStr');const is=el(s.doc,'is');is.appendChild(el(s.doc,'t',value));cell.appendChild(is);}}
}
export async function exportWorkbook(original,Zip,data){
  const w=await readWorkbook(original,Zip),p=data.project;
  for(const [a,k] of Object.entries({B7:'customer',H7:'customerNo',B8:'pl',B9:'name',H9:'order',H10:'type',H14:'city',H24:'amp',D26:'icp'}))put(w,SHEETS.project,a,p[k]??'');
  put(w,SHEETS.project,'H26',Math.round(p.icp*1.7),'ROUND(D26*1.7,0)');
  // Fix the confirmed field-3 reference; preserve all other workbook formulas.
  put(w,SHEETS.project,'D32',null,"'"+SHEETS.fine+"'!F748");
  // Each export is a fresh project: clear prior article quantities and field totals.
  for(const c of w.catalog)put(w,c.sheet,'A'+c.row,null);
  const counts=new Map();for(const d of data.devices){if(d.article&&d.qty>0)counts.set(d.article,(counts.get(d.article)||0)+d.qty);}
  for(const [id,qty] of counts){const c=w.catalog.find(c=>c.id===id);if(c)put(w,c.sheet,'A'+c.row,qty);}
  for(let i=0;i<5;i++){
    const f=data.fields[i];put(w,SHEETS.sbr,'B'+(28+i),f?.type==='SBR'?f.max:null);put(w,SHEETS.ars,'B'+(30+i),f&&f.type!=='SBR'?f.max:null);
    put(w,SHEETS.fine,'F'+(746+i),f?f.selected:null);
  }
  for(const [type,name,row] of [['SBR',SHEETS.sbr,9],['ARS',SHEETS.ars,10]]){
    const f=data.fields.find(f=>type==='SBR'?f.type==='SBR':f.type!=='SBR');
    for(const [c,k] of [['B','b'],['C','h'],['D','t']])put(w,name,c+row,f?f[k]:null);
  }
  // Exact location matching in the app prevents LOOKUP silently selecting a neighbouring town.
  const found=w.towns.find(t=>t.name.toLocaleLowerCase('de-CH')===p.city.trim().toLocaleLowerCase('de-CH'));
  put(w,SHEETS.project,'H15',null,'IFERROR(INDEX(\'EW-Zuweisung\'!B:B,MATCH(H14,\'EW-Zuweisung\'!A:A,0)),"Ort nicht erfasst")');
  if(found)put(w,SHEETS.project,'H14',found.name);
  // Add a transparent record of every field's dimensions, calculation mode and device sources.
  const rid='rIdWaermeExport',sheetId=Math.max(...tags(w.book,'sheet').map(n=>+n.getAttribute('sheetId')))+1;
  const name='Webapp Eingaben';if(w.sheets.has(name))throw Error('Bitte die ursprüngliche Vorlage auswählen, nicht einen bereits erzeugten Webapp-Export.');
  const rows=[['Drahtwerk Wärmeberechnung – Eingaben'],['Feld','Typ','Breite mm','Höhe mm','Tiefe mm','Max. Pv W','Einbaugrad %','Methode','Übernommen W'],...data.fields.map((f,i)=>[i+1,f.type,f.b,f.h,f.t,f.max,f.percent,f.mode,f.selected]),[],['Gerät','PDF-Quelle','Feld','Anzahl','Referenzartikel','Pv je Gerät W','Verd./Kl. je Gerät W'],...data.devices.map(d=>{const c=w.catalog.find(c=>c.id===d.article);return[d.ref,d.source,d.field,d.qty,c?c.label+' / '+c.code:'Nicht zugeordnet',c?.pv??'',c?.wire??''];}),[],['Gerätemethode: Summe Geräte + 50 % der hinterlegten Verdrahtungs-/Klemmenverluste (Mittelwert).'],['Schätzung: Max. Pv × Einbaugrad. Keine Geräteberechnung.'],['Die Max.-Pv-Rechenblätter zeigen jeweils die Masse des ersten Felds der Bauart. Alle Felder sind hier dokumentiert.']];
  const doc=xml('<worksheet xmlns="'+NS+'"><sheetData/></worksheet>'),sd=tags(doc,'sheetData')[0];
  rows.forEach((values,i)=>{const row=el(doc,'row');row.setAttribute('r',i+1);values.forEach((v,j)=>{const c=el(doc,'c');c.setAttribute('r',String.fromCharCode(65+j)+(i+1));if(typeof v==='number')c.appendChild(el(doc,'v',v));else{c.setAttribute('t','inlineStr');const is=el(doc,'is');is.appendChild(el(doc,'t',String(v)));c.appendChild(is);}row.appendChild(c);});sd.appendChild(row);});
  const sh=el(w.book,'sheet');sh.setAttribute('name',name);sh.setAttribute('sheetId',sheetId);sh.setAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','r:id',rid);tags(w.book,'sheets')[0].appendChild(sh);
  const rel=w.rels.createElementNS(w.rels.documentElement.namespaceURI,'Relationship');rel.setAttribute('Id',rid);rel.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet');rel.setAttribute('Target','worksheets/waerme.xml');w.rels.documentElement.appendChild(rel);
  const ct=xml(await w.zip.file('[Content_Types].xml').async('string')),ov=ct.createElementNS(ct.documentElement.namespaceURI,'Override');ov.setAttribute('PartName','/xl/worksheets/waerme.xml');ov.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');ct.documentElement.appendChild(ov);
  // Invalidate stale caches and calculation chain; Excel recalculates the preserved formula network on open.
  for(const s of w.sheets.values()){for(const c of tags(s.doc,'c'))if(tags(c,'f').length)for(const v of tags(c,'v'))c.removeChild(v);w.zip.file(s.path,ser(s.doc));}
  for(const r of tags(w.rels,'Relationship'))if(/\/calcChain$/.test(r.getAttribute('Type')))r.parentNode.removeChild(r);
  for(const r of tags(ct,'Override'))if(/calcChain.xml$/.test(r.getAttribute('PartName')))r.parentNode.removeChild(r);
  w.zip.remove('xl/calcChain.xml');let calc=tags(w.book,'calcPr')[0];if(!calc){calc=el(w.book,'calcPr');w.book.documentElement.appendChild(calc);}calc.setAttribute('calcMode','auto');calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');
  w.zip.file('xl/workbook.xml',ser(w.book));w.zip.file('xl/_rels/workbook.xml.rels',ser(w.rels));w.zip.file('[Content_Types].xml',ser(ct));w.zip.file('xl/worksheets/waerme.xml',ser(doc));
  return w.zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
}
