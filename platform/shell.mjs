import {account,serverMode,publicPage,can,canTool} from './client.mjs';
import {pageModule,pageTool,technicalTabs} from './model.mjs';
import {mountAccountMenu} from './account-menu.mjs';
if(serverMode){
 // Old offline registrations must never delay the account menu or permissions.
 if('serviceWorker' in navigator)Promise.resolve().then(()=>navigator.serviceWorker.getRegistrations()).then(rs=>Promise.all(rs.map(r=>r.unregister()))).catch(error=>console.warn('Offline-Registrierung konnte nicht entfernt werden.',error));
 if(!account&&!publicPage())location.replace('/login.html');
 else if(account?.user.mustChangePassword&&!publicPage()&&!location.pathname.endsWith('/portal.html'))location.replace('/portal.html?section=personal');
 const ready=()=>{
  if(!account||publicPage())return;
  const dev=account.user.role==='developer';
  const style=document.createElement('link');style.rel='stylesheet';style.href='/platform/account.css';document.head.append(style);
  for(const header of document.querySelectorAll(location.pathname==='/index.html'?'#unused-header':'.dw-header,#editor>.editor-heading')){const link=document.createElement('a');link.href='/index.html';link.textContent='Dashboard';link.className='home';link.style.cssText='font:600 13px Arial;padding:8px 12px;color:inherit;text-decoration:none;border:1px solid currentColor;border-radius:8px';header.append(link);}
  for(const el of document.querySelectorAll('[data-storage-info]'))el.textContent='Im Betrieb gespeichert. Berechtigte Mitarbeitende können die Projekte auch auf anderen Geräten öffnen. Exporte dienen als zusätzliche Sicherung.';
  for(const dock of document.querySelectorAll('.suite-sidebar-foot,#accountDock'))mountAccountMenu(dock);
  const sidebar=document.querySelector('.suite-sidebar nav');
  if(sidebar&&!sidebar.querySelector('a[href="cad.html"]'))sidebar.insertAdjacentHTML('beforeend','<a class="suite-nav-link" href="cad.html"><span>Schema & Dispo</span></a>');
  if(dev&&document.body.classList.contains('suite-index')){
   sidebar?.insertAdjacentHTML('beforeend','<p class="suite-nav-label">Entwickler</p><a class="suite-nav-link" href="/portal.html?section=businesses"><span>Lizenzen & Berechtigungen</span></a>');
   const section=document.createElement('section');section.className='developer-tools';section.innerHTML='<div class="suite-section-heading"><div><p class="suite-kicker">DEIN ENTWICKLERBEREICH</p><h2 class="section-title">Verwaltung</h2></div></div><a class="developer-card" href="/portal.html?section=businesses"><span class="developer-symbol" aria-hidden="true">⌘</span><span><strong>Lizenzen & Berechtigungen</strong><small>Betriebe eröffnen, Benutzer anlegen und Zugriffe verwalten.</small></span><span aria-hidden="true">↗</span></a>';
   document.querySelector('.suite-content')?.append(section);
  }
  const module=pageModule(location.pathname.slice(1)),readOnly=module&&!can(module,true);
  const update=()=>{
   if(readOnly)for(const el of document.querySelectorAll('#newProject,#importProject,#demoProject,#frameDemo,#contactDemo,#projectList [data-remove],#new,#emptyAction,#deleteOffer,#duplicate,#restore')){el.disabled=true;el.title='Lesezugriff';}
   for(const a of document.querySelectorAll('a[href]')){let url;try{url=new URL(a.href);}catch{continue;}if(url.origin!==location.origin)continue;const tool=pageTool(url.pathname.replace(/^\//,''),url.hash);if(tool&&!canTool(tool)){a.dataset.accessHidden='true';a.hidden=true;a.style.setProperty('display','none','important');}}
   for(const label of document.querySelectorAll('.suite-sidebar .suite-nav-label')){let visible=false;for(let item=label.nextElementSibling;item&&!item.classList.contains('suite-nav-label');item=item.nextElementSibling){if(item.matches('a,button')&&!item.hidden&&item.style.display!=='none')visible=true;}label.hidden=!visible;}
   for(const tiles of document.querySelectorAll('.suite-index .tiles')){const n=[...tiles.querySelectorAll('.tile')].filter(a=>!a.hidden).length,heading=tiles.previousElementSibling;tiles.hidden=!n;if(heading?.classList.contains('suite-section-heading')){heading.hidden=!n;const count=heading.querySelector(':scope > span'),label=`${n} ${n===1?'Werkzeug':'Werkzeuge'}`;if(count&&count.textContent!==label)count.textContent=label;}}
  };update();new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
  if(location.pathname==='/technik.html'){
   const ids=technicalTabs;
   const restrictTabs=()=>{const enabled=Object.keys(ids).filter(k=>can(ids[k]));for(const [key,tool] of Object.entries(ids)){const allowed=can(tool);for(const el of document.querySelectorAll(`[data-tab="${key}"],#panel-${key}`))if(!allowed){el.hidden=true;el.style.setProperty('display','none','important');}}if(!enabled.includes(location.hash.slice(1))&&enabled.length)location.replace('#'+enabled[0]);};
   restrictTabs();window.addEventListener('hashchange',restrictTabs);
  }
  if(readOnly){const note=document.createElement('div');note.className='account-readonly';note.textContent='Lesezugriff · Änderungen können nicht im Betrieb gespeichert werden.';document.body.append(note);}
  if(document.body.classList.contains('suite-index')&&!dev&&!Object.values(account.permissions).some(p=>p!=='none')){const note=document.createElement('p');note.className='account-empty';note.textContent='Aktuell ist kein Werkzeug freigeschaltet. Dein Firmenadministrator kann deine Berechtigungen prüfen.';document.querySelector('.suite-content').append(note);}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
