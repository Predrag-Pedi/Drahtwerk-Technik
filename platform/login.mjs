import {serverMode,account,api} from './client.mjs';
const form=document.querySelector('#loginForm'),message=document.querySelector('#message');
if(!serverMode){form.hidden=true;message.textContent='Der Firmenzugang ist auf dieser Adresse noch nicht eingerichtet.';}
else if(account)location.replace('/portal.html');
if(new URLSearchParams(location.search).has('changed'))message.textContent='Passwort geändert. Bitte erneut anmelden.';
form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;message.textContent='';try{await api('/login',{method:'POST',body:Object.fromEntries(new FormData(form))});form.reset();location.replace('/portal.html');}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};
