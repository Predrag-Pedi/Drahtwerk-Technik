const invalid=message=>{throw Object.assign(Error(message),{status:400});};
export function customerMaterials(raw=[]){
 if(!Array.isArray(raw)||raw.length>500)invalid('Maximal 500 Positionen angeliefertes Material.');
 const ids=new Set();return raw.map(r=>{
  if(!r||typeof r.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)||ids.has(r.id)||['__proto__','constructor','prototype'].includes(r.id))invalid('Kundenmaterial: ungültige oder doppelte Position.');ids.add(r.id);
  const row={id:r.id};for(const key of ['article','name','unit','notes']){const v=r[key]??'';if(typeof v!=='string'||v.length>2000)invalid('Kundenmaterial: Text zu lang.');row[key]=v.trim();}
  if(!row.name||!row.unit||!Number.isFinite(r.qty)||r.qty<=0||r.qty>1e7)invalid('Kundenmaterial: Bezeichnung, Einheit und positive Menge ausfüllen.');row.qty=r.qty;return row;
 });
}
export function materialStatus(doc){const rows=doc.customerMaterials||[];return rows.length?(rows.every(r=>(doc.materialReceipts?.[r.id]?.qty||0)>=r.qty)?'complete':'pending'):'none';}
export const materialLabel=doc=>({none:'',pending:'Angeliefertes Material ausstehend',complete:'Angeliefertes Material vollständig'})[materialStatus(doc)];
export function receiveMaterials(old,values,actor,at){
 if(!values||typeof values!=='object'||Array.isArray(values))invalid('Liefermengen fehlen.');
 const rows=customerMaterials(old.customerMaterials),allowed=new Map(rows.map(r=>[r.id,r])),next={...old.materialReceipts};
 for(const [id,qty] of Object.entries(values)){const row=allowed.get(id);if(!row||typeof qty!=='number'||!Number.isFinite(qty)||qty<0||qty>row.qty)invalid('Erhaltene Menge muss zwischen 0 und der erwarteten Menge liegen.');if((next[id]?.qty||0)!==qty)next[id]={qty,by:actor,at};}
 return next;
}
