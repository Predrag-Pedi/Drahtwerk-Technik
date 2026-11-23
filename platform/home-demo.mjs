// Public, illustrative tours only. Never open or modify a customer's project.
const tours={
 dispo:{title:'SchaltBase / Schema & Dispo',kicker:'SCHEMA & DISPO',heading:'Vom Stromkreis zum Aufbau.',description:'Geräte im Schema erfassen, den Rahmen konfigurieren und die Disposition als Grundlage für die weitere Planung erzeugen.',steps:[['Schema aufbauen','Geräte und Stromkreise erfassen.'],['Aufbau definieren','Abmessungen und Reserve festlegen.'],['Dispo weiterplanen','Ergebnis prüfen und anpassen.']]},
 offers:{title:'SchaltBase / Offerten',kicker:'OFFERTEN',heading:'Aus Positionen wird ein Angebot.',description:'Projekt anlegen, Material und Arbeit kalkulieren und die Offerte für die weitere Bearbeitung im Betrieb speichern.',steps:[['Projekt anlegen','Kunde und Anlage erfassen.'],['Positionen kalkulieren','Material und Arbeit zusammenstellen.'],['Speichern & weitergeben','Gemeinsam weiterarbeiten und exportieren.']]}
};
const $=id=>document.getElementById(id),tabs=[...document.querySelectorAll('[data-demo]')],steps=[...document.querySelectorAll('[data-step]')],scenes=[...document.querySelectorAll('[data-scene]')];
const playIcon='<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m7 4 14 8-14 8z"/></svg>',pauseIcon='<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
const duration=15000,stepDuration=5000;
let tour='dispo',elapsed=0,playing=false,previous=0,frame=0,activeStep=-1;
const time=ms=>'0:'+String(Math.floor(ms/1000)).padStart(2,'0');
function draw(){
 const step=Math.min(2,Math.floor(elapsed/stepDuration));
 if(step!==activeStep){activeStep=step;for(const scene of scenes)scene.hidden=scene.dataset.scene!==`${tour}-${step}`;for(const button of steps){if(Number(button.dataset.step)===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');}}
 $('demo-progress').value=elapsed;$('demo-progress').setAttribute('aria-valuetext',`${Math.floor(elapsed/1000)} von 15 Sekunden`);$('demo-time').textContent=`${time(elapsed)} / 0:15`;
}
function pause(){playing=false;cancelAnimationFrame(frame);$('demo-play').innerHTML=playIcon+'<span>Abspielen</span>';$('demo-play').setAttribute('aria-label','Demo abspielen');}
function tick(now){if(!playing)return;elapsed=Math.min(duration,elapsed+now-previous);previous=now;draw();if(elapsed>=duration)pause();else frame=requestAnimationFrame(tick);}
function play(){if(playing)return;if(elapsed>=duration)elapsed=0;playing=true;previous=performance.now();$('demo-play').innerHTML=pauseIcon+'<span>Pause</span>';$('demo-play').setAttribute('aria-label','Demo pausieren');frame=requestAnimationFrame(tick);}
function select(name){pause();tour=name;elapsed=0;activeStep=-1;const data=tours[name];for(const tab of tabs){const selected=tab.dataset.demo===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;$('panel-'+tab.dataset.demo).hidden=!selected;}$('demo-window-title').textContent=data.title;$('demo-kicker').textContent=data.kicker;$('demo-title').textContent=data.heading;$('demo-description').textContent=data.description;steps.forEach((button,i)=>{button.querySelector('strong').textContent=data.steps[i][0];button.querySelector('small').textContent=data.steps[i][1];});draw();}
for(const tab of tabs){tab.addEventListener('click',()=>select(tab.dataset.demo));tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(tabs.indexOf(tab)+1)%tabs.length];select(target.dataset.demo);target.focus();});}
for(const step of steps)step.addEventListener('click',()=>{pause();elapsed=Number(step.dataset.step)*stepDuration;draw();});
$('demo-play').addEventListener('click',()=>playing?pause():play());$('demo-restart').addEventListener('click',()=>{pause();elapsed=0;draw();});$('demo-progress').addEventListener('input',e=>{pause();elapsed=Number(e.target.value);draw();});
// Motion starts only after an explicit play action; do not run hidden tours.
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();},{threshold:0}).observe($('demo-player'));
document.querySelector('[data-start-demo]').addEventListener('click',()=>{select('dispo');});
document.querySelector('[data-demo-controls]').hidden=false;draw();
