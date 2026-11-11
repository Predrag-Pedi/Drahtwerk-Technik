import {profiles,configureSbr,ENDS,PVC} from './sbr.mjs?v=20261111-7';
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
const money=n=>new Intl.NumberFormat('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
function field(root,title,value,oninput){const l=el('label',title),i=el('input');i.type='number';i.min='0';i.step='any';i.value=value??'';i.oninput=()=>oninput(i.value);l.append(i);root.append(l);return i;}
export function profileEditor(root,initial,catalog){
 let rows=structuredClone(initial||[]);
 root.replaceChildren();root.append(el('h3','Profile für diesen Rahmen'),el('p','Quer = Breite, längs = Höhe. Preise je Meter; Zuschnitt ohne Längenabzug. Die Montagezeit gilt für den gesamten Rahmen.'));
 const search=el('input');search.placeholder='Profil suchen: Artikelnummer, Bezeichnung, Hersteller';search.setAttribute('aria-label','Profil aus Artikelstamm suchen');root.append(search);
 const results=el('div'),list=el('div');root.append(results,list);
 let timer;
 search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{results.replaceChildren();const q=search.value.trim().toLowerCase();if(q.length<2)return;catalog.filter(p=>!p.profiles&&[p.article,p.name,p.brand].join(' ').toLowerCase().includes(q)).slice(0,20).forEach(p=>{const b=el('button',p.article+' · '+p.name+' · CHF '+money(p.price)+' / '+p.unit);b.type='button';b.style.cssText='display:block;text-align:left;width:100%;margin:6px 0';b.onclick=()=>{rows.push({article:p.article,name:p.name,pricePerM:/^(m|meter|lfm|laufmeter)$/i.test(p.unit?.trim())?p.price:'',direction:'quer'});search.value='';results.replaceChildren();draw();};results.append(b);});if(!results.children.length)results.append(el('p','Keine passenden Artikel.'));},180);};
 function draw(){list.replaceChildren();rows.forEach((p,i)=>{const box=el('div');box.className='card';box.append(el('strong',p.article+' · '+p.name));const grid=el('div');grid.className='grid';const label=el('label','Ausrichtung'),select=el('select');for(const [value,title] of [['quer','Quer → Breite'],['laengs','Längs → Höhe']]){const o=el('option',title);o.value=value;select.append(o);}select.value=p.direction;select.onchange=()=>p.direction=select.value;label.append(select);grid.append(label);field(grid,'Preis pro Meter (CHF)',p.pricePerM,v=>p.pricePerM=v);box.append(grid);if(p.pricePerM==='')box.append(el('p','Der Katalogpreis ist nicht je Meter. Bitte den umgerechneten Meterpreis eintragen.'));const remove=el('button','Profil entfernen');remove.type='button';remove.onclick=()=>{rows.splice(i,1);draw();};box.append(remove);list.append(box);});}
 draw();return ()=>profiles(rows);
}
export function configuration(root,template,initial,onchange){
 const state={minutes:template.minutes??0,width:initial?.width??'',height:initial?.height??'',depth:initial?.depth??'',top:initial?.top??ENDS[0],bottom:initial?.bottom??ENDS[0],pvc:initial?.pvc??PVC[1],counts:initial?.counts?.slice()||template.profiles.map(()=>0)};
 root.replaceChildren();root.append(el('h3','SBR konfigurieren'),el('p','Abmessungen in mm. Anzahl je Profil für einen Rahmen; 0 bedeutet nicht verwendet.'));
 const grid=el('div');grid.className='grid';root.append(grid);
 const detail=el('div');let ready=false;
 const update=()=>{if(!ready)return;detail.replaceChildren();try{const c=configureSbr(template,state.width,state.height,state.counts);c.rows.filter(p=>p.count).forEach(p=>detail.append(el('p',p.count+' × '+p.name+' · '+p.lengthMm+' mm · '+p.totalMeters.toFixed(3)+' m × CHF '+money(p.pricePerM)+' = CHF '+money(p.total))));detail.append(el('strong','Material pro Rahmen: CHF '+money(c.price)));}catch(e){detail.append(el('p',e.message));}onchange();};
 field(grid,'Breite (mm)',state.width,v=>{state.width=v;update();});
 field(grid,'Höhe (mm)',state.height,v=>{state.height=v;update();});
 field(grid,'Bauzeit pro Rahmen (Min.)',state.minutes,v=>{state.minutes=v;update();});
 field(grid,'Tiefe (mm)',state.depth,v=>{state.depth=v;update();});
 for(const [key,title,values] of [['top','Ausführung oben',ENDS],['bottom','Ausführung unten',ENDS],['pvc','PVC-Platte',PVC]]){
 const label=el('label',title),select=el('select');select.setAttribute('aria-label',title);
 values.forEach(v=>{const option=el('option',v);option.value=v;select.append(option);});
 select.value=state[key];select.onchange=()=>{state[key]=select.value;update();};label.append(select);grid.append(label);
 }
 root.append(el('p','Die Bauzeit ersetzt für diese Position die Zeit aus dem Artikelstamm. Sie wird einmal pro Rahmen mit dem geltenden Stundensatz berechnet und im Rahmenpreis zusammengefasst.'));
 root.append(el('p','Tiefe, Ausführung und PVC-Farbe beschreiben den Rahmen. Die Auswahl berechnet keine zusätzlichen Materialkosten. Einzelprofile bleiben in der internen Kalkulation.'));
 template.profiles.forEach((p,i)=>{const input=field(grid,p.name+' · '+(p.direction==='quer'?'quer':'längs')+' · Anzahl',state.counts[i],v=>{state.counts[i]=v;update();});input.step='1';});
 root.append(detail);ready=true;update();return ()=>state;
}
