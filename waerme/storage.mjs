import {serverMode,readRecord,writeRecord,deleteRecord} from '../platform/client.mjs';
export async function templateStore(action,value){if(serverMode)return action==='get'?readRecord('heatTemplate','template'):action==='delete'?deleteRecord('heatTemplate','template'):writeRecord('heatTemplate','template',value);
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('drahtwerk-waerme',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('settings',action==='get'?'readonly':'readwrite'),s=tx.objectStore('settings');const r=action==='get'?s.get('template'):action==='delete'?s.delete('template'):s.put(value,'template');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
