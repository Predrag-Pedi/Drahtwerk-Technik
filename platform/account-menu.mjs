import {templateTools} from './workshop-model.mjs';
import {account,api} from './client.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAccountMenu(target){
 if(!target||!account)return;
 const dev=account.user.role==='developer',manager=dev||account.user.role==='admin';
 target.className='account-dock';
 target.innerHTML=`<details class="account-menu"><summary><span class="account-avatar" aria-hidden="true">${esc(account.user.name.split(/\s+/).map(s=>s[0]).slice(0,2).join(''))}</span><span class="account-person"><strong>${esc(account.user.name)}</strong><small>${esc(dev?'Entwickler':account.company?.name||'Kein Betrieb')}</small></span><span class="account-chevron" aria-hidden="true">⌃</span></summary><div class="account-options">${dev?'<a href="/portal.html?section=businesses">Lizenzen & Berechtigungen</a>':''}${manager&&account.company&&!account.company.internalWorkspace?'<a href="/portal.html?section=company">Firmeneinstellungen</a><a href="/portal.html?section=users">Mitarbeitende & Rechte</a>':''}${account.company&&Object.keys(templateTools).some(k=>account.permissions[k]==='write')?'<a href="/portal.html?section=workshop">Werkstattvorlagen</a>':''}<a href="/portal.html?section=personal">Mein Konto</a>${dev&&account.company&&!account.company.internalWorkspace?'<button type="button" data-own-workspace>Zum Entwickler-Arbeitsplatz</button>':''}<button type="button" data-sign-out>Abmelden</button><p class="account-error" role="alert"></p></div></details>`;
 target.querySelector('[data-sign-out]').onclick=async()=>{try{await api('/logout',{method:'POST',body:{}});location.replace('/');}catch(e){target.querySelector('.account-error').textContent=e.message;}};
 const own=target.querySelector('[data-own-workspace]');if(own)own.onclick=async()=>{try{await api('/session/company',{method:'POST',body:{companyId:null}});location.assign('/index.html');}catch(e){target.querySelector('.account-error').textContent=e.message;}};
 target.addEventListener('keydown',e=>{if(e.key==='Escape')target.querySelector('details').open=false;});
 document.addEventListener('click',e=>{if(!target.contains(e.target))target.querySelector('details').open=false;});
}
