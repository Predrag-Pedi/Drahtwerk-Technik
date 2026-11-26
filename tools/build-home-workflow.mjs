import {readFileSync,writeFileSync} from 'node:fs';
import {cadClips, heroCad} from './home-cad-clips.mjs';
import {quoteTotal,workflowScene,workflowClips} from '../platform/workflow-demo.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function frame(caption, detail, content, index) {
 return `<div class="clip-frame" data-frame${index ? ' hidden' : ''} data-caption="${esc(caption)}" data-detail="${esc(detail || '')}">${content}</div>`;
}
const frames = steps => steps.map(([scene, caption, detail], index) => frame(caption, detail, workflowScene(scene), index)).join('\n');
const replace=(html,key,content)=>{
 const start=`<!-- ${key}:start -->`,end=`<!-- ${key}:end -->`,block=`${start}\n${content}\n${end}`;
 if(html.includes(start))return html.replace(new RegExp(`${start}[\\s\\S]*?${end}`),()=>block);
 return html.replace(`<!-- ${key} -->`,block);
};
let home=readFileSync('home.html','utf8');
home = replace(home, 'offer-calculation', workflowScene('estimate'));
home = replace(home, 'offer-saved-total', `<b>${quoteTotal}</b>`);
const tabs = {offers:'Offerte', orders:'Auftrag', schema:'Schema', dispo:'Dispo', together:'Schema + Dispo', inventory:'Lager & Zuschnitt'};
home = replace(home, 'workflow-tabs', Object.entries(tabs).map(([id,label], i) =>
 `<button id="tab-${id}" type="button" role="tab" aria-selected="${i===0}" aria-controls="panel-${id}" tabindex="${i===0 ? 0 : -1}" data-demo="${id}">${label}</button>`
).join('\n'));
home = replace(home, 'workflow-panels', Object.entries(workflowClips).map(([id,c]) =>
 `<div id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}" tabindex="0" data-title="${esc(c.title)}" data-description="${esc(c.description)}" hidden><div class="clip main-clip flow-clip" id="clip-${id}" data-clip data-step-ms="6000"><div class="clip-stage">${frames(c.steps)}</div></div></div>`
).join('\n'));
home = replace(home, 'cad-panels', Object.entries(cadClips).map(([id,c]) => {
 const scenes = c.steps.map(([caption,detail,content], i) => frame(caption,detail,content,i)).join('\n');
 return `<div id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}" tabindex="0" data-title="${esc(c.title)}" data-description="${esc(c.description)}" hidden><div class="clip main-clip" id="clip-${id}" data-clip data-step-ms="6500"><div class="clip-stage">${scenes}</div></div></div>`;
}).join('\n'));
const tour = [
 ['Offerte', 'offerten', 'Material und Montage kalkulieren', workflowScene('estimate')],
 ['Auftrag', 'auftraege', 'Die bestätigte Offerte als Auftrag eröffnen', workflowScene('order')],
 ['Schema', 'schema', 'Zähler und Abgänge im Browser zeichnen', heroCad.schema()],
 ['Dispo', 'dispo', 'Aus den Schema-Geräten den Aufbau berechnen', heroCad.dispo()],
 ['Lager', 'lager', 'Die Materialbuchung zum Auftrag nachschlagen', workflowScene('booking')],
];
home = replace(home, 'hero-workflow', tour.map(([, ,caption,content],i) => frame(caption,'',content,i)).join('\n'));
home = replace(home, 'hero-chapters', tour.map(([label,slug],i) =>
 `<a href="/produkte/${slug}.html" data-hero-step="${i}"${i===0 ? ' aria-current="step"' : ''}>${label}</a>`
).join('\n'));
home=replace(home,'inventory-card',`<article class="tool-card" id="tool-inventory"><div class="tool-preview"><div class="tool-window-title">Lager<span>PRODUKTDEMO</span></div><div class="clip mini-clip flow-mini" id="clip-stock-mini" data-clip data-step-ms="6000"><div class="clip-stage">${frames([['inventory','Bestand für den Betrieb erfassen'],['booking','Material automatisch abbuchen']])}</div><div class="mini-controls"><span data-clip-caption>Bestand für den Betrieb erfassen</span><button type="button" data-clip-toggle aria-label="Lagervorführung pausieren">Pause</button></div></div></div><div class="tool-copy"><p class="eyebrow">Lagerverwaltung</p><h3>Wissen, was noch da ist.</h3><p>Geräte, Platten und Schienen verwalten. Mit optionalen Lagerplätzen, nachvollziehbaren Auftragsbuchungen und Reststücken aus dem Zuschnitt.</p><a class="product-detail-link" href="/produkte/lager.html">Funktionen entdecken</a></div></article>`);
writeFileSync('home.html',home);
