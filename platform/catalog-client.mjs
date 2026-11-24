import {api,account,readRecord} from './client.mjs';
let revision=0,scope='',uploading=false;
const currentScope=()=>account?.user.id+':'+account?.company?.id;
if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(uploading){event.preventDefault();event.returnValue='';}});
export async function readCatalog(){
 for(let attempt=0;attempt<2;attempt++)try{
  const key=currentScope(),meta=await api('/company/catalog',{timeoutMs:30000});let items=[];
  if(meta.legacy)items=await readRecord('offers','catalog')||[];
  else for(let i=0;i<meta.chunks;i++){const part=await api(`/company/catalog/chunks/${meta.uploadId}/${i}`,{timeoutMs:30000});for(const item of part)items.push(item);}
  if(!meta.legacy&&items.length!==meta.count)throw Error('Der Katalog ist unvollständig. Bitte neu laden.');
  if(key!==currentScope())throw Error('Der Betrieb wurde gewechselt. Bitte neu laden.');revision=meta.revision;scope=key;return items;
 }catch(error){if(error.status!==409||attempt)throw error;}
}
export async function writeCatalog(items){
 if(uploading)throw Error('Ein Katalogimport läuft bereits.');if(scope!==currentScope())throw Error('Bitte zuerst den bestehenden Katalog laden.');
 if(!Array.isArray(items))throw Error('Ungültiger Katalog.');uploading=true;let id;
 try{
  ({id}=await api('/company/catalog/imports',{method:'POST',body:{revision,count:items.length},timeoutMs:30000}));
  let chunk=[],size=2,seq=0;
  const flush=async()=>{if(!chunk.length)return;await api(`/company/catalog/imports/${id}/${seq++}`,{method:'PUT',body:{items:chunk},timeoutMs:60000});chunk=[];size=2;};
  for(const item of items){const n=new TextEncoder().encode(JSON.stringify(item)).length+1;if(n>1024*1024)throw Error('Ein einzelner Artikel überschreitet 1 MB.');if(size+n>1024*1024||chunk.length>=1000)await flush();chunk.push(item);size+=n;}
  await flush();const result=await api(`/company/catalog/imports/${id}/commit`,{method:'POST',body:{},timeoutMs:60000});revision=result.revision;id=null;
 }finally{if(id)await api(`/company/catalog/imports/${id}`,{method:'DELETE',body:{},timeoutMs:10000}).catch(()=>{});uploading=false;}
}
