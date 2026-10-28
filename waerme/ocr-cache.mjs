export async function ocrCacheKey(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return 'ocr-v2:'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
export async function ocrCache(action,key,pages){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('drahtwerk-waerme-ocr',1);r.onupgradeneeded=()=>r.result.createObjectStore('imports',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('imports',action==='get'?'readonly':'readwrite'),s=tx.objectStore('imports');let result;
 if(action==='get'){const r=s.get(key);r.onsuccess=()=>{result=r.result?.pages;};}
 else if(action==='clear')s.clear();
 else {s.put({key,pages,saved:Date.now()});const r=s.getAll();r.onsuccess=()=>{for(const row of r.result.sort((a,b)=>b.saved-a.saved).slice(8))s.delete(row.key);};}
 tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
export function renameCachedPages(pages,file){return pages.map(page=>({...page,file}));}
