import {emptyProfile} from './model.mjs';
export const serverMode=globalThis.__companyMode===true;
export let account=null;
export async function api(path,{method='GET',body}={}){
 const response=await fetch('/api'+path,{method,credentials:'same-origin',cache:'no-store',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(account?{'X-CSRF-Token':account.csrf,'X-Company-Id':account.company?.id||'','X-User-Id':account.user.id}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const result=await response.json();if(!response.ok){const e=Object.assign(Error(result.error||'Anfrage fehlgeschlagen.'),{status:response.status});if(response.status===401&&path!=='/login'&&typeof document!=='undefined'&&!location.pathname.endsWith('/login.html')){document.dispatchEvent(new CustomEvent('account-expired'));location.replace('/login.html');}throw e;}return result;
}
export async function refreshAccount(){account=await api('/session');return account;}
if(serverMode){try{await refreshAccount();}catch(e){if(e.status!==401)throw e;}}
export const companyProfile=()=>({...emptyProfile(),...(account?.company?.profile||{})});
export const can=(module,write=false)=>!serverMode||Boolean(account?.company&&['write',...(!write?['read']:[])].includes(account.permissions?.[module]));
export const localScope=()=>serverMode?`company:${account?.company?.id||'none'}:user:${account?.user?.id||'none'}:`:'';
export const savedLabel=()=>serverMode?'Im Betrieb gespeichert':'In diesem Browser gespeichert';
export function addressLines(p=companyProfile()){return [p.name,p.street,[p.postcode,p.city].filter(Boolean).join(' '),p.country].filter(Boolean);}
export function footerLines(p=companyProfile()){return [addressLines(p).join(' · '),[p.email,p.phone,p.website].filter(Boolean).join(' · '),p.vat?'MWST-Nr.: '+p.vat:''].filter(Boolean);}
// Binary Excel templates and snapshots retain their byte representation over JSON.
export async function pack(value){if(value instanceof ArrayBuffer||ArrayBuffer.isView(value)||typeof Blob!=='undefined'&&value instanceof Blob){const bytes=value instanceof ArrayBuffer?new Uint8Array(value):ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):new Uint8Array(await value.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return {__portalBinary:true,type:value instanceof ArrayBuffer?'ArrayBuffer':value.constructor.name,mime:value.type||'',data:btoa(raw)};}if(Array.isArray(value))return Promise.all(value.map(pack));if(value&&typeof value==='object')return Object.fromEntries(await Promise.all(Object.entries(value).map(async([k,v])=>[k,await pack(v)])));return value;}
export function unpack(value){if(value?.__portalBinary===true&&typeof value.data==='string'){const bytes=Uint8Array.from(atob(value.data),c=>c.charCodeAt(0));return value.type==='ArrayBuffer'?bytes.buffer:value.type==='Blob'?new Blob([bytes],{type:value.mime}):bytes;}if(Array.isArray(value))return value.map(unpack);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,unpack(v)]));return value;}
const revisions=new Map(),unsaved=new Set(),key=(area,id)=>`${account?.user.id}:${account?.company?.id}:${area}:${id}`;
let pendingWrites=0;
if(serverMode&&typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(pendingWrites||unsaved.size){event.preventDefault();event.returnValue='';}});
export async function listRecords(area){const result=await api('/records/'+area);for(const r of result)revisions.set(key(area,r.id),r.revision);return result.map(r=>({id:r.id,value:unpack(r.value)}));}
export async function readRecord(area,id){const r=await api('/records/'+area+'/'+encodeURIComponent(id));revisions.set(key(area,id),r.revision);return r.value===null?undefined:unpack(r.value);}
export async function writeRecord(area,id,value){const k=key(area,id);pendingWrites++;unsaved.add(k);try{const r=await api('/records/'+area+'/'+encodeURIComponent(id),{method:'PUT',body:{value:await pack(value),revision:revisions.get(k)||0}});revisions.set(k,r.revision);unsaved.delete(k);}finally{pendingWrites--;}}
export async function deleteRecord(area,id){const k=key(area,id);pendingWrites++;try{await api('/records/'+area+'/'+encodeURIComponent(id),{method:'DELETE',body:{revision:revisions.get(k)||0}});revisions.delete(k);unsaved.delete(k);}finally{pendingWrites--;}}
