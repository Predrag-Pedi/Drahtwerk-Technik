import {requestJSON} from './request.mjs';

const form=document.querySelector('#loginForm'),message=document.querySelector('#message'),password=document.querySelector('#password'),toggle=document.querySelector('#showPassword');
const button=form.querySelector('[type="submit"]'),serverMode=globalThis.__companyMode===true;
const destination=mustChange=>mustChange?'/portal.html?section=personal':'/index.html';
const sessionCheck=new AbortController();
let loginStarted=false;

toggle.onclick=()=>{const show=password.type==='password';password.type=show?'text':'password';toggle.setAttribute('aria-pressed',String(show));toggle.setAttribute('aria-label',show?'Passwort verbergen':'Passwort anzeigen');};
// Install the submit handler before any session request. Never let a slow or
// broken session lookup turn a login into a native form navigation.
form.onsubmit=async event=>{
 event.preventDefault();if(!serverMode||button.disabled)return;
 loginStarted=true;sessionCheck.abort();button.disabled=true;message.textContent='Anmeldung läuft …';
 try{
  const {response,result}=await requestJSON('/api/login',{
   method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))
  },{timeoutMs:15000});
  if(!response.ok)throw Error(result?.error||'Anmeldung fehlgeschlagen.');
  if(result?.ok!==true)throw Error('Die Anmeldung wurde nicht bestätigt. Bitte erneut versuchen.');
  form.reset();location.replace(destination(result.mustChangePassword));
 }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
};

if(!serverMode){form.hidden=true;message.textContent='Der Firmenzugang ist auf dieser Adresse noch nicht eingerichtet.';}
else{
 button.disabled=false;
 message.textContent=new URLSearchParams(location.search).has('changed')?'Passwort geändert. Bitte erneut anmelden.':'';
 // An existing session is a convenience redirect, not a prerequisite for login.
 requestJSON('/api/session',{credentials:'same-origin',cache:'no-store'},{timeoutMs:15000,signal:sessionCheck.signal})
  .then(({response,result})=>{if(!loginStarted&&response.ok&&result?.user?.id)location.replace(destination(result.user.mustChangePassword));})
  .catch(()=>{}); // The enabled login form remains usable if this check fails.
}
