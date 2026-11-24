import {serverMode,account,api} from './client.mjs';
const form=document.querySelector('#loginForm'),message=document.querySelector('#message'),password=document.querySelector('#password'),toggle=document.querySelector('#showPassword');
const destination=mustChange=>mustChange?'/portal.html?section=personal':'/index.html';
if(!serverMode){form.hidden=true;message.textContent='Der Firmenzugang ist auf dieser Adresse noch nicht eingerichtet.';}
else if(account)location.replace(destination(account.user.mustChangePassword));
if(new URLSearchParams(location.search).has('changed'))message.textContent='Passwort geändert. Bitte erneut anmelden.';
toggle.onclick=()=>{const show=password.type==='password';password.type=show?'text':'password';toggle.setAttribute('aria-pressed',String(show));toggle.setAttribute('aria-label',show?'Passwort verbergen':'Passwort anzeigen');};
form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;message.textContent='';try{const result=await api('/login',{method:'POST',body:Object.fromEntries(new FormData(form)),timeoutMs:15000});form.reset();location.replace(destination(result.mustChangePassword));}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};
