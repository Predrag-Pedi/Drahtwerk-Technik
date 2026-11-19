import {account,serverMode,companyProfile,can,api} from './client.mjs';
import {pageModule} from './model.mjs';
if(serverMode){
 if('serviceWorker' in navigator)for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();
 if(!account&&!location.pathname.endsWith('/login.html'))location.replace('/login.html');
 else if(account?.user.mustChangePassword&&!location.pathname.endsWith('/portal.html'))location.replace('/portal.html');
 const ready=()=>{
  if(!account)return;const p=companyProfile();
  for(const header of document.querySelectorAll('.dw-header,#editor>.editor-heading')){const link=document.createElement('a');link.href='/portal.html';link.textContent='Firmenportal';link.className='home';link.style.cssText='font:600 13px Arial;padding:8px 12px';header.append(link);}
  document.title=document.title.replace(/Standard(?: Technik)?/,p.name||'Planungsportal');
  for(const el of document.querySelectorAll('[data-storage-info]'))el.textContent='Im Betrieb gespeichert. Berechtigte Mitarbeitende können die Projekte auch auf anderen Geräten öffnen. Exporte dienen als zusätzliche Sicherung.';
  for(const el of document.querySelectorAll('.dw-brand,.suite-identity>div,.suite-sidebar-foot .brand'))el.textContent=p.name||'Planungsportal';
  for(const el of document.querySelectorAll('.foot'))if(/Drahtwerk|Planungsportal · Ihr Spezialist/i.test(el.textContent))el.textContent=p.name||'';
  const readOnly=pageModule(location.pathname.slice(1))&&!can(pageModule(location.pathname.slice(1)),true);
  const update=()=>{if(readOnly){for(const el of document.querySelectorAll('#newProject,#importProject,#demoProject,#frameDemo,#contactDemo,#projectList [data-remove],#new,#emptyAction,#deleteOffer,#duplicate,#restore')){el.disabled=true;el.title='Lesezugriff';}}for(const a of document.querySelectorAll('a[href]')){let path;try{path=new URL(a.href).pathname.replace(/^\//,'');}catch{continue;}const m=pageModule(path);if(m&&!can(m)){a.hidden=true;a.style.setProperty('display','none','important');}}};update();
  new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
  const module=pageModule(location.pathname.slice(1));if(module&&!can(module,true)){const note=document.createElement('div');note.textContent='Lesezugriff · Änderungen können nicht im Betrieb gespeichert werden.';note.style.cssText='position:fixed;bottom:0;left:0;right:0;padding:8px;background:#fff1ce;color:#684600;z-index:9999;text-align:center;font:14px Arial';document.body.append(note);}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
