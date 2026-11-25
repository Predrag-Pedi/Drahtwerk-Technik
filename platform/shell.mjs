import {mountSupport} from './support.mjs';
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
  mountSupport();
  const style=document.createElement('link');style.rel='stylesheet';style.href='/platform/account.css';document.head.append(style);
  for(const header of document.querySelectorAll(location.pathname==='/index.html'?'#unused-header':'.dw-header,#editor>.editor-heading')){const link=document.createElement('a');link.href='/index.html';link.textContent='Dashboard';link.className='home';link.style.cssText='font:600 13px Arial;padding:8px 12px;color:inherit;text-decoration:none;border:1px solid currentColor;border-radius:8px';header.append(link);}
  for(const el of document.querySelectorAll('[data-storage-info]'))el.textContent=account.company?.internalWorkspace?'In deinem eigenen Entwickler-Arbeitsplatz gespeichert. Firmendaten bleiben getrennt.':'Im Betrieb gespeichert. Berechtigte Mitarbeitende können die Projekte auch auf anderen Geräten öffnen. Exporte dienen als zusätzliche Sicherung.';
  for(const dock of document.querySelectorAll('.suite-sidebar-foot,#accountDock'))mountAccountMenu(dock);
  const sidebar=document.querySelector('.suite-sidebar nav');
  const navIcon='<svg class="suite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12M13 13h4M13 17h4"/></svg>';
  const orderIcon='<svg class="suite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H5v18h14V8zM14 3v5h5M8 13l2 2 5-5M8 18h7"/></svg>';
  if(sidebar&&!sidebar.querySelector('a[href="cad.html"]'))sidebar.insertAdjacentHTML('beforeend','<a class="suite-nav-link" href="cad.html">'+navIcon+'<span>Schema & Dispo</span></a>');
  for(const link of document.querySelectorAll('.suite-sidebar a[href="cad.html"]'))if(!link.querySelector('svg'))link.insertAdjacentHTML('afterbegin',navIcon);
  if(sidebar&&can('orders')&&!sidebar.querySelector('a[href="auftraege.html"],a[href="/auftraege.html"]')){
   const link=document.createElement('a');link.href='/auftraege.html';link.className='suite-nav-link';link.innerHTML=orderIcon+'<span>Aufträge</span>';if(location.pathname==='/auftraege.html')link.setAttribute('aria-current','page');
   const anchor=sidebar.querySelector('a[href="offerten.html"],a[href="/offerten.html"]');if(anchor)anchor.after(link);else{let heading=[...sidebar.querySelectorAll('.suite-nav-label')].find(el=>el.textContent.trim()==='Büro');if(!heading){heading=document.createElement('p');heading.className='suite-nav-label';heading.textContent='Büro';sidebar.append(heading);}heading.after(link);}
  }
  if(sidebar&&can('customers'))sidebar.insertAdjacentHTML('beforeend','<p class="suite-nav-label">Stammdaten</p><a class="suite-nav-link" href="kunden.html">'+navIcon+'<span>Kundenstamm</span></a>');
  if(dev)sidebar?.insertAdjacentHTML('beforeend','<p class="suite-nav-label">Entwickler</p><a class="suite-nav-link" href="/portal.html?section=businesses"><span>Lizenzen & Berechtigungen</span></a>');
  if(dev&&!document.querySelector('#portalNav'))for(const header of document.querySelectorAll(sidebar?'#editor>.editor-heading':'.dw-header,#editor>.editor-heading')){const a=document.createElement('a');a.href='/portal.html?section=businesses';a.className='home';a.textContent='Lizenzen & Berechtigungen';header.append(a);}
  if(dev&&document.body.classList.contains('suite-index')){
   const section=document.createElement('section');section.className='developer-tools';section.innerHTML='<div class="suite-section-heading"><div><p class="suite-kicker">DEIN ENTWICKLERBEREICH</p><h2 class="section-title">Verwaltung</h2></div></div><a class="developer-card" href="/portal.html?section=businesses"><span class="developer-symbol" aria-hidden="true">⌘</span><span><strong>Lizenzen & Berechtigungen</strong><small>Betriebe eröffnen, Benutzer anlegen und Zugriffe verwalten.</small></span><span aria-hidden="true">↗</span></a>';
   document.querySelector('.suite-content > .foot')?.before(section);
  }
  if(document.body.classList.contains('suite-index')&&can('customers')){const section=document.createElement('section');section.className='developer-tools';section.innerHTML='<div class="suite-section-heading"><div><p class="suite-kicker">GEMEINSAM IM BETRIEB</p><h2 class="section-title">Kundenstamm</h2></div></div><a class="developer-card" href="kunden.html">'+navIcon+'<span><strong>Kunden & Kontaktpersonen</strong><small>Einmal erfassen. In allen Werkzeugen auswählen.</small></span><span aria-hidden="true">↗</span></a>';document.querySelector('.suite-content > .foot')?.before(section);}
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
