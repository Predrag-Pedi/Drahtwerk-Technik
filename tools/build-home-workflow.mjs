import {readFileSync,writeFileSync} from 'node:fs';
import {workflowScene,workflowClips} from '../platform/workflow-demo.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const frames=steps=>steps.map(([scene,caption,detail],i)=>`<div class="clip-frame" data-frame${i?' hidden':''} data-caption="${esc(caption)}" data-detail="${esc(detail||'')}">${workflowScene(scene)}</div>`).join('\n');
const replace=(html,key,content)=>{
 const start=`<!-- ${key}:start -->`,end=`<!-- ${key}:end -->`,block=`${start}\n${content}\n${end}`;
 if(html.includes(start))return html.replace(new RegExp(`${start}[\\s\\S]*?${end}`),()=>block);
 return html.replace(`<!-- ${key} -->`,block);
};
let home=readFileSync('home.html','utf8');
home=replace(home,'workflow-tabs',Object.keys(workflowClips).map((id,i)=>`<button id="tab-${id}" type="button" role="tab" aria-selected="${i===0}" aria-controls="panel-${id}" tabindex="${i===0?0:-1}" data-demo="${id}">${id==='orders'?'Aufträge':'Lager & Zuschnitt'}</button>`).join('\n'));
home=replace(home,'workflow-panels',Object.entries(workflowClips).map(([id,c],i)=>`<div id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}" tabindex="0" data-title="${esc(c.title)}" data-description="${esc(c.description)}"${i?' hidden':''}><div class="clip main-clip flow-clip" id="clip-${id}" data-clip data-step-ms="6000"><div class="clip-stage">${frames(c.steps)}</div></div></div>`).join('\n'));
if(!home.includes('<!-- hero-workflow:start -->'))home=home.replace(/(<div class="clip hero-clip"[\s\S]*?<div class="clip-stage">)[\s\S]*?(<div class="mini-controls">)/,`$1<!-- hero-workflow --></div>\n$2`);
home=replace(home,'hero-workflow',frames([['hero','Auftrag erstellt. Lager aktualisiert.'],['booking','Jede Abbuchung nachvollziehen.']]));
home=home.replace('id="hero-clip" data-clip','id="hero-clip" data-step-ms="6000" data-clip');
home=replace(home,'inventory-card',`<article class="tool-card" id="tool-inventory"><div class="tool-preview"><div class="tool-window-title">Lager<span>PRODUKTDEMO</span></div><div class="clip mini-clip flow-mini" id="clip-stock-mini" data-clip data-step-ms="6000"><div class="clip-stage">${frames([['inventory','Bestand für den Betrieb erfassen'],['booking','Material automatisch abbuchen']])}</div><div class="mini-controls"><span data-clip-caption>Bestand für den Betrieb erfassen</span><button type="button" data-clip-toggle aria-label="Lagervorführung pausieren">Pause</button></div></div></div><div class="tool-copy"><p class="eyebrow">Lagerverwaltung</p><h3>Wissen, was noch da ist.</h3><p>Geräte, Platten und Schienen verwalten. Mit optionalen Lagerplätzen, nachvollziehbaren Auftragsbuchungen und Reststücken aus dem Zuschnitt.</p><a class="product-detail-link" href="/produkte/lager.html">Funktionen entdecken</a></div></article>`);
writeFileSync('home.html',home);
