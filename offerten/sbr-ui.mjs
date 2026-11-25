import {profiles,configureSbr,ENDS,PVC,AUFBAU} from './sbr.mjs?v=20261111-7';
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
const money=n=>new Intl.NumberFormat('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
function field(root,title,value,oninput){const l=el('label',title),i=el('input');i.type='number';i.min='0';i.step='any';i.value=value??'';i.oninput=()=>oninput(i.value);l.append(i);root.append(l);return i;}
export function profileEditor(root,initial,catalog){
 let rows=structuredClone(initial||[]);
 root.replaceChildren();root.append(el('h3','Komponenten für Rahmen / Aufbau'),el('p','Längenmaterial wird nach Abmessung, Abzug und Anzahl berechnet. Geräte können als Stückposition geführt werden. Die Montagezeit gilt für den gesamten Rahmen oder Aufbau.'));
 const search=el('input');search.placeholder='Profil suchen: Artikelnummer, Bezeichnung, Hersteller';search.setAttribute('aria-label','Profil aus Artikelstamm suchen');root.append(search);
 const results=el('div'),list=el('div'),add=el('button','Freie Komponente hinzufügen');add.type='button';add.onclick=()=>{rows.push({article:'',name:'Neue Komponente',pricePerM:0,direction:'quer'});draw();};root.append(results,add,list);
 let timer;
 search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{results.replaceChildren();const q=search.value.trim().toLowerCase();if(q.length<2)return;catalog.filter(p=>!p.profiles&&[p.article,p.name,p.brand].join(' ').toLowerCase().includes(q)).slice(0,20).forEach(p=>{const b=el('button',p.article+' · '+p.name+' · CHF '+money(p.price)+' / '+p.unit);b.type='button';b.style.cssText='display:block;text-align:left;width:100%;margin:6px 0';b.onclick=()=>{rows.push({article:p.article,name:p.name,pricePerM:p.price??0,direction:/^(m|meter|lfm|laufmeter)$/i.test(p.unit?.trim())?'quer':'stueck'});search.value='';results.replaceChildren();draw();};results.append(b);});if(!results.children.length)results.append(el('p','Keine passenden Artikel.'));},180);};
 function draw(){list.replaceChildren();rows.forEach((p,i)=>{const box=el('div');box.className='card';const grid=el('div');grid.className='grid';
 for(const [key,title] of [['article','Artikelnummer (Lagerzuordnung)'],['name','Bezeichnung']]){const l=el('label',title),input=el('input');input.value=p[key]||'';input.onchange=()=>p[key]=input.value;l.append(input);grid.append(l);}
 const label=el('label','Berechnung'),select=el('select');for(const [value,title] of [['quer','Quer → Breite'],['laengs','Längs → Höhe'],['tiefe','Tiefe'],['fest','Fixlänge'],['stueck','Stückposition']]){const o=el('option',title);o.value=value;select.append(o);}select.value=p.direction;select.onchange=()=>{p.direction=select.value;draw();};label.append(select);grid.append(label);
 field(grid,p.direction==='stueck'?'Preis pro Stück (CHF)':'Preis pro Meter (CHF)',p.pricePerM,v=>p.pricePerM=v);
 if(p.direction!=='stueck')field(grid,'Abzug (mm)',p.deductionMm||0,v=>p.deductionMm=v);
 if(p.direction==='fest')field(grid,'Fixlänge vor Abzug (mm)',p.lengthMm||'',v=>p.lengthMm=v);
 box.append(grid);const remove=el('button','Komponente entfernen');remove.type='button';remove.onclick=()=>{rows.splice(i,1);draw();};box.append(remove);list.append(box);});}
 draw();return ()=>profiles(rows);
}
export function configuration(root,template,initial,onchange){
 const aufbau=template.type===AUFBAU;
 const state={minutes:template.minutes??0,width:initial?.width??'',height:initial?.height??'',depth:initial?.depth??'',top:initial?.top??ENDS[0],bottom:initial?.bottom??ENDS[0],pvc:initial?.pvc??PVC[1],counts:initial?.counts?.slice()||template.profiles.map(()=>0)};
 root.replaceChildren();root.append(el('h3',aufbau?'Aufbau konfigurieren':'SBR konfigurieren'),el('p','Abmessungen in mm. Anzahl je Komponente für einen Rahmen / Aufbau; 0 bedeutet nicht verwendet.'));
 const grid=el('div');grid.className='grid';root.append(grid);
 const detail=el('div');let ready=false;
 const update=()=>{if(!ready)return;detail.replaceChildren();try{const c=configureSbr(template,state.width,state.height,state.counts,state.depth);c.rows.filter(p=>p.count).forEach(p=>detail.append(el('p',p.count+' × '+p.name+(p.direction==='stueck'?' · Stückposition':' · '+p.lengthMm+' mm · '+p.totalMeters.toFixed(3)+' m')+' = CHF '+money(p.total))));detail.append(el('strong','Material pro '+(aufbau?'Aufbau':'Rahmen')+': CHF '+money(c.price)));}catch(e){detail.append(el('p',e.message));}onchange();};
 field(grid,'Breite (mm)',state.width,v=>{state.width=v;update();});
 field(grid,'Höhe (mm)',state.height,v=>{state.height=v;update();});
 field(grid,'Bauzeit pro Rahmen / Aufbau (Min.)',state.minutes,v=>{state.minutes=v;update();});
 field(grid,'Tiefe (mm)',state.depth,v=>{state.depth=v;update();});
 for(const [key,title,values] of (aufbau?[]:[['top','Ausführung oben',ENDS],['bottom','Ausführung unten',ENDS],['pvc','PVC-Platte',PVC]])){
 const label=el('label',title),select=el('select');select.setAttribute('aria-label',title);
 values.forEach(v=>{const option=el('option',v);option.value=v;select.append(option);});
 select.value=state[key];select.onchange=()=>{state[key]=select.value;update();};label.append(select);grid.append(label);
 }
 root.append(el('p','Die Bauzeit ersetzt für diese Position die Zeit aus dem Artikelstamm. Sie wird einmal pro Rahmen / Aufbau mit dem geltenden Stundensatz berechnet und im Positionspreis zusammengefasst.'));
 if(!aufbau)root.append(el('p','Tiefe, Ausführung und PVC-Farbe beschreiben den Rahmen. Die Auswahl berechnet keine zusätzlichen Materialkosten. Einzelprofile bleiben in der internen Kalkulation.'));
 template.profiles.forEach((p,i)=>{const input=field(grid,p.name+' · '+({quer:'Breite',laengs:'Höhe',tiefe:'Tiefe',fest:'Fixlänge',stueck:'Stück'}[p.direction])+' · Anzahl',state.counts[i],v=>{state.counts[i]=v;update();});input.step='1';});
 root.append(detail);ready=true;update();return ()=>{const result={...state};if(!result.depth)delete result.depth;if(aufbau)for(const key of ['top','bottom','pvc'])delete result[key];return result;};
}
