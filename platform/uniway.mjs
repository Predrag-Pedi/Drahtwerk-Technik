import {uniwayRows,uniwaySource,selectUniway} from './uniway-model.mjs';

const input=document.getElementById('uniwayUnits'),result=document.getElementById('uniwayResult');
const table=document.getElementById('uniwayRows'),note=document.getElementById('uniwayNote');
const source=document.getElementById('uniwaySource'),jump=document.getElementById('uniwayJump');
const fmt=value=>value.toLocaleString('de-CH');
source.href=uniwaySource.url;
table.innerHTML=uniwayRows.map(row=>`<tr data-units="${row.units}"><th scope="row">${row.units}</th><td>${fmt(row.systemLength)} mm${row.note?' †':''}</td><td>${fmt(row.copperLength)} mm</td><td>${row.bases10||'–'}</td><td>${row.bases6||'–'}</td></tr>`).join('');

function render(){
 const selection=selectUniway(input.validity.badInput?'invalid':input.value),row=selection.row;
 input.setAttribute('aria-invalid',String(selection.status==='invalid'||selection.status==='unavailable'));
 for(const tr of table.rows){const selected=Number(tr.dataset.units)===row?.units;tr.classList.toggle('selected',selected);if(selected)tr.setAttribute('aria-current','true');else tr.removeAttribute('aria-current');}
 jump.disabled=!row;note.hidden=!row?.note;note.textContent=row?.note||'';
 if(!row){result.textContent={empty:'Platzeinheiten eingeben, um die nächste passende Kombination zu finden.',invalid:'Bitte eine positive Anzahl Platzeinheiten in Schritten von 0,5 eingeben.',unavailable:'Keine passende Kombination in der Tabelle. Sie reicht bis 120 Platzeinheiten.'}[selection.status];return;}
 result.innerHTML=`<span>Nächste tabellierte Kombination</span><strong>${row.units} Platzeinheiten</strong><small>${fmt(selection.requested)} benötigt · ${fmt(selection.reserve)} Reserve · 1 Platzeinheit = 18 mm</small><dl class="uniway-values"><div><dt>System inkl. Endstück</dt><dd>${fmt(row.systemLength)} mm${row.note?' †':''}</dd></div><div><dt>Kupferschienenlänge</dt><dd>${fmt(row.copperLength)} mm</dd></div><div><dt>UW-xxx-10</dt><dd>${row.bases10} Stück</dd></div><div><dt>UW-xxx-6</dt><dd>${row.bases6} Stück</dd></div></dl>`;
}
input.addEventListener('input',render);
jump.addEventListener('click',()=>{
 const selected=table.querySelector('.selected');if(!selected)return;
 const wrap=table.closest('.tablewrap');wrap.scrollTop+=selected.getBoundingClientRect().top-wrap.getBoundingClientRect().top-wrap.querySelector('thead').getBoundingClientRect().height;
 wrap.focus({preventScroll:true});
});
render();
