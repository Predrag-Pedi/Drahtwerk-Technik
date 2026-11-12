/* Shared compact navigation; calculator and project state stay tool-owned. */
(() => {
 const sidebar=document.querySelector('.suite-sidebar'), header=document.querySelector('.dw-header');
 if(!sidebar||!header) return;
 sidebar.id='suite-navigation';
 const offers=sidebar.querySelector('a[href="offerten.html"]');
 if(offers&&!sidebar.querySelector('a[href="cad.html"]')){const link=document.createElement('a');link.href='cad.html';link.className='suite-nav-link';link.innerHTML='<svg class="suite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8v8H8zM12 4v4M12 16v4M4 12h4M16 12h4"/></svg><span>Schema & Dispo</span>';if(location.pathname.endsWith('/cad.html'))link.setAttribute('aria-current','page');offers.after(link);}

 const toggle=document.createElement('button');
 toggle.type='button';toggle.className='suite-menu-toggle';toggle.textContent='☰';
 toggle.setAttribute('aria-label','Werkzeuge öffnen');toggle.setAttribute('aria-controls',sidebar.id);toggle.setAttribute('aria-expanded','false');
 header.prepend(toggle);
 const shade=document.createElement('button');shade.type='button';shade.className='suite-menu-shade';shade.setAttribute('aria-label','Werkzeugmenü schliessen');shade.hidden=true;sidebar.after(shade);
 function setOpen(open){document.body.classList.toggle('suite-menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Werkzeuge schliessen':'Werkzeuge öffnen');shade.hidden=!open;if(!open)toggle.focus();}
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));shade.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true')setOpen(false)});
 const mq=matchMedia('(max-width: 1180px)');mq.addEventListener('change',()=>{document.body.classList.remove('suite-menu-open');toggle.setAttribute('aria-expanded','false');shade.hidden=true});
 const steps=document.querySelector('.heat-steps');
 if(steps){const links=[...steps.querySelectorAll('a')];const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){links.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')})}},{rootMargin:'-15% 0px -55% 0px',threshold:0});links.forEach(a=>{const section=document.querySelector(a.hash);if(section)observer.observe(section)});}
})();
