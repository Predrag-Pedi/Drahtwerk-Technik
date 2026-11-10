/* Storage boundary for saved calculations. A future server adapter can keep this API. */
const DB='drahtwerk-waerme-projects';
async function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'id'});r.result.createObjectStore('summaries',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Bitte andere geöffnete Wärmeberechnungsfenster schliessen.'));});}
async function transaction(stores,mode,run){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let value;try{run(tx,v=>{value=v;});}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Speichern abgebrochen.'));});}finally{db.close();}}
export const projectRepository={
 list:()=>transaction(['summaries'],'readonly',(tx,done)=>{const r=tx.objectStore('summaries').getAll();r.onsuccess=()=>done(r.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}),
 load:id=>transaction(['projects'],'readonly',(tx,done)=>{const r=tx.objectStore('projects').get(id);r.onsuccess=()=>done(r.result);}),
 save:record=>transaction(['projects','summaries'],'readwrite',tx=>{tx.objectStore('projects').put(record);const {snapshot,...summary}=record;tx.objectStore('summaries').put(summary);})
};
export function projectSummary(snapshot){
 const entries=snapshot.plants.length?snapshot.plants:[snapshot.current];
 const primary=entries[snapshot.active>=0?snapshot.active:0]||entries[0];
 const p=primary.project||{};
 return {title:p.name?.trim()||'Neue Wärmeberechnung',order:p.order?.trim()||'',customer:p.customer?.trim()||'',plantCount:entries.length,fieldCount:entries.reduce((n,p)=>n+p.fields.length,0),deviceCount:entries.reduce((n,p)=>n+p.devices.reduce((n,d)=>n+(Number(d.qty)||0),0),0)};
}
export function assertSnapshot(s){
 if(!s||s.version!==1||!Array.isArray(s.documents)||!Array.isArray(s.plants)||!s.current||!Array.isArray(s.current.fields)||!Array.isArray(s.current.devices)||!s.current.project||!Array.isArray(s.pendingFiles))throw Error('Diese gespeicherte Wärmeberechnung kann nicht geöffnet werden.');
 if(!Number.isInteger(s.active)||s.active< -1||s.active>=s.plants.length)throw Error('Ungültige gespeicherte Anlagenauswahl.');
 for(const p of [s.current,...s.plants])if(!Array.isArray(p.fields)||!p.fields.length||!Array.isArray(p.devices)||!p.project)throw Error('Gespeicherte Projektdaten sind unvollständig.');
 return s;
}
