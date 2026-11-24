import {account,api,serverMode} from './client.mjs';
import {managedCompany} from './session-context.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=v=>new Date(v).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
const mode=r=>r.mode==='write'?'Lesen und bearbeiten':'Nur lesen';
const statusLabels={pending:'Antwort ausstehend',approved:'Freigegeben',denied:'Abgelehnt',cancelled:'Anfrage zurückgezogen',ended:'Support beendet',revoked:'Freigabe widerrufen',expired:'Zeit abgelaufen'};
const listeners=new Set(),dismissed=new Set();
let state=null,started=false,busy=false,dialog=null,bar=null,notice=null,timer=null,locked=false,serverOffset=0,lastState='',pollError='';
const styles=()=>{if(document.getElementById('sb-support-style'))return;const link=document.createElement('link');link.id='sb-support-style';link.rel='stylesheet';link.href='/platform/support.css';document.head.append(link);};
function modal(title,contents){
 if(dialog?.open)return null;
 styles();const el=document.createElement('dialog');el.className='sb-support-dialog';el.setAttribute('aria-labelledby','sb-support-title');
 el.innerHTML=`<div class="sb-support-dialog-head"><div><p class="sb-support-kicker">SCHALTBASE SUPPORT</p><h2 id="sb-support-title">${esc(title)}</h2></div><button type="button" data-close aria-label="Schliessen">×</button></div>${contents}<p class="sb-support-error" role="alert"></p>`;
 document.body.append(el);dialog=el;el.querySelector('[data-close]').onclick=()=>el.close();el.addEventListener('close',()=>{if(el.dataset.requestId)dismissed.add(el.dataset.requestId);el.remove();if(dialog===el)dialog=null;renderGlobal();});el.showModal();return el;
}
function errorIn(el,error){el.querySelector('.sb-support-error').textContent=error.message;}
async function action(id,kind){await api('/support/requests/'+encodeURIComponent(id)+'/'+kind,{method:'POST',body:{},timeoutMs:15000});}
function lock(){
 if(locked)return;locked=true;dialog?.close();document.body.classList.add('sb-support-locked');
 const el=document.createElement('div');el.className='sb-support-lock';el.setAttribute('role','alert');
 el.innerHTML='<section><p class="sb-support-kicker">SUPPORTZUGRIFF</p><h1>Dieser Zugriff ist beendet.</h1><p>Die Firmenplattform wurde geschlossen oder die Sitzung in einem anderen Fenster gewechselt. Firmendaten können hier nicht mehr geöffnet oder gespeichert werden.</p><a href="/portal.html?section=users">Zurück zur Betriebsverwaltung</a></section>';
 document.body.append(el);clearTimeout(timer);
}
function checkContext(next){
 if(account.user.role!=='developer')return;
 if(next.context.companyId!==account.company?.id||next.context.supportId!==(account.support?.id||null))lock();
}
function renderGlobal(){
 if(!started||locked)return;
 const grant=account.support,active=account.user.role==='developer'?(grant?[grant]:[]):state?.active||[];
 if(active.length){
  const signature=JSON.stringify(active)+pollError;
  if(bar.dataset.signature!==signature){
   bar.dataset.signature=signature;bar.innerHTML=active.map(r=>`<div class="sb-support-bar-row"><div><strong>${grant?'Supportzugriff':'Support freigegeben'} · ${esc(r.companyName)}</strong><span>${grant?'Freigabe: '+esc(r.approvedByName):esc(r.developerName)} · Alle Werkzeuge · ${mode(r)} · bis ${time(r.expiresAt)}${pollError?' · Verbindung wird geprüft':''}</span></div><button type="button" data-stop="${esc(r.id)}">${grant?'Support beenden':'Zugriff widerrufen'}</button></div>`).join('');
  }
  bar.hidden=false;document.body.classList.add('sb-support-active');
 }else{bar.hidden=true;document.body.classList.remove('sb-support-active');document.documentElement.style.setProperty('--sb-support-height','0px');}
 const incoming=state?.incoming||[];
 notice.hidden=!incoming.length;notice.textContent=incoming.length===1?'Supportanfrage ansehen':`${incoming.length} Supportanfragen ansehen`;
 if(!dialog?.open&&!document.querySelector('dialog[open]')&&document.visibilityState!=='hidden'){
  const r=incoming.find(r=>!dismissed.has(r.id));if(r)showConsent(r);
 }
}
function showConsent(r){
 const el=modal('Supportzugriff erlauben?',`<p><strong>${esc(r.developerName)}</strong> möchte die Plattform von <strong>${esc(r.companyName)}</strong> zur Fehlerbehebung öffnen.</p><div class="sb-support-reason"><span>Grund der Anfrage</span><p>${esc(r.reason)}</p></div><dl class="sb-support-details"><div><dt>Zugriff</dt><dd>Alle Werkzeuge und Werkzeugdaten der Firma</dd></div><div><dt>Berechtigung</dt><dd>${mode(r)}</dd></div><div><dt>Dauer</dt><dd>${r.durationMinutes} Minuten ab deiner Zustimmung</dd></div></dl><p class="sb-support-explanation">Die Freigabe umfasst auch Bereiche, die du selbst nicht siehst. Deine eigenen Berechtigungen bleiben unverändert. Du kannst den Zugriff jederzeit über den Supporthinweis widerrufen. Anfrage und Zugriff werden protokolliert.</p><label class="sb-support-confirm"><input type="checkbox" data-consent> Ich erlaube diesen Supportzugriff für unsere Firma.</label><p class="sb-support-meta">Diese Anfrage läuft um ${time(r.requestExpiresAt)} ab.</p><div class="sb-support-actions"><button type="button" data-deny>Ablehnen</button><button type="button" class="sb-support-primary" data-approve disabled>Zugriff bewilligen</button></div>`);
 if(!el)return;el.dataset.requestId=r.id;
 const yes=el.querySelector('[data-approve]'),no=el.querySelector('[data-deny]'),check=el.querySelector('[data-consent]');check.onchange=()=>yes.disabled=!check.checked;
 for(const [button,kind] of [[yes,'approve'],[no,'deny']])button.onclick=async()=>{if(kind==='approve'&&!check.checked)return;yes.disabled=no.disabled=true;try{await action(r.id,kind);dismissed.add(r.id);el.close();await poll();}catch(e){errorIn(el,e);yes.disabled=!check.checked;no.disabled=false;}};
}
async function poll(){
 if(!started||busy||locked||document.visibilityState==='hidden')return;
 busy=true;clearTimeout(timer);
 try{
  const next=await api('/support/state',{method:'POST',body:{visible:true},timeoutMs:10000});
  if(Number.isFinite(next.serverTime))serverOffset=next.serverTime-Date.now();
  checkContext(next);if(locked)return;
  state=next;pollError='';const signature=JSON.stringify({...next,serverTime:undefined});
  if(dialog?.dataset.requestId&&!next.incoming.some(r=>r.id===dialog.dataset.requestId))dialog.close();
  if(signature!==lastState){lastState=signature;for(const listener of listeners)listener(state);}
  renderGlobal();
 }catch(e){pollError=e.message;renderGlobal();for(const listener of listeners)listener(state);}
 finally{busy=false;if(!locked)timer=setTimeout(poll,8000);}
}
export function mountSupport(){
 if(started||!serverMode||!account||account.user.mustChangePassword)return;
 started=true;styles();bar=document.createElement('div');bar.className='sb-support-bar';bar.hidden=true;document.body.prepend(bar);
 notice=document.createElement('button');notice.className='sb-support-notification';notice.type='button';notice.hidden=true;notice.onclick=()=>{if(state?.incoming[0])showConsent(state.incoming[0]);};document.body.append(notice);
 bar.onclick=async e=>{const b=e.target.closest('[data-stop]');if(!b)return;b.disabled=true;try{await action(b.dataset.stop,'stop');if(account.support)lock();else await poll();}catch(error){pollError=error.message;renderGlobal();b.disabled=false;}};
 const resize=()=>document.documentElement.style.setProperty('--sb-support-height',bar.hidden?'0px':bar.getBoundingClientRect().height+'px');
 if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(bar);else window.addEventListener('resize',resize);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')poll();});window.addEventListener('pageshow',poll);window.addEventListener('focus',poll);
 // The browser hides an expired support page even if the network is offline.
 if(account.support)setInterval(()=>{if(Date.now()+serverOffset>=account.support.expiresAt)lock();},1000);
 renderGlobal();resize();poll();
}
async function requestSupport(company){
 const el=modal('Supportzugriff anfordern',`<p>Wähle die angemeldete Person, die den Zugriff auf <strong>${esc(company.name)}</strong> bewilligen soll.</p><form class="sb-support-form"><fieldset><legend>Angemeldete Personen</legend><div data-people role="status">Personen werden geladen …</div><button type="button" data-refresh>Liste aktualisieren</button></fieldset><label>Grund für den Zugriff<textarea name="reason" required minlength="5" maxlength="500" rows="3" placeholder="Zum Beispiel: Speichern eines Regierapports prüfen"></textarea></label><div class="sb-support-grid"><label>Berechtigung<select name="mode"><option value="write">Lesen und bearbeiten</option><option value="read">Nur lesen</option></select></label><label>Dauer<select name="duration"><option value="15">15 Minuten</option><option value="30" selected>30 Minuten</option><option value="60">60 Minuten</option></select></label></div><p class="sb-support-explanation">Die ausgewählten Personen erhalten die Anfrage direkt im geöffneten Werkzeug. Eine Zustimmung genügt; eine Ablehnung beendet die Anfrage. Der Zugriff umfasst alle Werkzeuge dieser Firma. Ohne Freigabe bleiben ihre Werkzeugdaten gesperrt.</p><div class="sb-support-actions"><button type="submit" class="sb-support-primary" disabled>Anfrage senden</button></div></form>`);
 if(!el)return;
 const form=el.querySelector('form'),people=el.querySelector('[data-people]'),send=form.querySelector('[type=submit]'),refresh=el.querySelector('[data-refresh]');
 const load=async()=>{refresh.disabled=true;send.disabled=true;try{const online=await api('/support/recipients',{timeoutMs:10000});people.innerHTML=online.length?online.map(p=>`<label class="sb-support-person"><input type="checkbox" name="recipient" value="${esc(p.id)}"><span><strong>${esc(p.name)}</strong><small>${p.role==='admin'?'Firmenadministrator':'Mitarbeiter'} · Online</small></span></label>`).join(''):'<p class="sb-support-meta">Zurzeit ist niemand aus diesem Betrieb online. Die Person muss SchaltBase öffnen und angemeldet sein. Danach kannst du die Liste aktualisieren.</p>';}catch(e){people.textContent='Die Personen konnten nicht geladen werden.';errorIn(el,e);}finally{refresh.disabled=false;}};
 people.onchange=()=>send.disabled=!people.querySelector('input:checked');refresh.onclick=load;await load();
 form.onsubmit=async e=>{e.preventDefault();send.disabled=true;const values=new FormData(form);try{await api('/support/requests',{method:'POST',body:{companyId:company.id,recipientIds:values.getAll('recipient'),reason:values.get('reason'),mode:values.get('mode'),durationMinutes:Number(values.get('duration'))},timeoutMs:15000});el.close();await poll();}catch(error){errorIn(el,error);send.disabled=false;}};
}
export function mountSupportPanel(target){
 const company=managedCompany(account);if(!target||account?.user.role!=='developer'||!company)return ()=>{};
 mountSupport();target.className='sb-support-panel';
 const render=()=>{
  const r=state?.outgoing.find(r=>r.companyId===company.id),ongoing=r&&['pending','approved'].includes(r.status);
  target.innerHTML=`<div><p class="sb-support-kicker">BETRIEB · ${esc(company.name)}</p><h2>${ongoing?statusLabels[r.status]:'Support für diesen Betrieb'}</h2><p>${ongoing?(r.status==='pending'?'Anfrage an '+r.recipients.map(u=>esc(u.name)).join(', ')+'. Antwort möglich bis '+time(r.requestExpiresAt)+'.':'Bewilligt von '+esc(r.approvedByName)+' · Alle Werkzeuge · '+mode(r)+' · bis '+time(r.expiresAt)+'.'):'Fordere die Freigabe einer angemeldeten Person an, um die Firmenplattform zur Fehlerbehebung zu öffnen.'}</p>${r&&!ongoing?`<p class="sb-support-meta">Letzte Anfrage: ${statusLabels[r.status]}</p>`:''}${pollError?'<p class="sb-support-error">Verbindung konnte nicht geprüft werden. Der Status wird erneut geladen.</p>':''}</div><div class="sb-support-actions">${ongoing?(r.status==='approved'?(account.support?.id===r.id?'<a class="sb-support-primary" href="/index.html">Firmenplattform öffnen</a>':'<button type="button" class="sb-support-primary" data-enter>Firmenplattform öffnen</button>'):'')+`<button type="button" data-stop>${r.status==='pending'?'Anfrage zurückziehen':'Support beenden'}</button>`:'<button type="button" class="sb-support-primary" data-request>Supportzugriff anfordern</button>'}</div>`;
  target.querySelector('[data-request]')?.addEventListener('click',()=>requestSupport(company));
  target.querySelector('[data-enter]')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await action(r.id,'enter');location.assign('/index.html');}catch(error){pollError=error.message;render();}});
  target.querySelector('[data-stop]')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await action(r.id,'stop');if(account.support?.id===r.id)location.assign('/portal.html?section=users');else await poll();}catch(error){pollError=error.message;render();}});
 };
 listeners.add(render);render();return ()=>listeners.delete(render);
}
