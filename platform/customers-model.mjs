export const customerFields={name:'Firma / Kundenname',number:'Kundennummer',street:'Strasse / Nr.',postcode:'PLZ',city:'Ort',country:'Land',email:'E-Mail',phone:'Telefon'};
export const contactFields={name:'Name',role:'Funktion',street:'Strasse / Nr. (falls abweichend)',postcode:'PLZ',city:'Ort',country:'Land',email:'E-Mail',phone:'Telefon',mobile:'Mobiltelefon'};
export function validateCustomer(value){
 const fail=message=>{throw Object.assign(Error(message),{status:400});};
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Kundendaten fehlen.');
 const clean=(obj,fields)=>Object.fromEntries(Object.keys(fields).map(k=>{const v=obj?.[k]??'';if(typeof v!=='string'||v.length>400)fail('Kundenfelder dürfen höchstens 400 Zeichen enthalten.');return [k,v.trim()];}));
 const customer={...clean(value,customerFields),archived:value.archived===true,contacts:[]};
 if(!customer.name)fail('Bitte einen Firmennamen eingeben.');
 if(!Array.isArray(value.contacts)||value.contacts.length>100)fail('Höchstens 100 Kontaktpersonen pro Kunde.');
 const ids=new Set();customer.contacts=value.contacts.map(person=>{if(!person||typeof person!=='object'||Array.isArray(person))fail('Ungültige Kontaktperson.');const p=clean(person,contactFields);if(!p.name)fail('Jede Kontaktperson benötigt einen Namen.');if(typeof person.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(person.id)||ids.has(person.id))fail('Ungültige oder doppelte Kontaktperson.');ids.add(person.id);return {...p,id:person.id};});
 for(const p of [customer,...customer.contacts])if(p.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))fail('Bitte die E-Mail-Adresse prüfen.');
 return customer;
}
export function customerSnapshot(customer,person){
 const address=person?.street?person:customer;
 return {customer:customer.name,number:customer.number,contact:person?.name||'',email:person?.email||customer.email,phone:person?.phone||person?.mobile||customer.phone,address:[address.street,[address.postcode,address.city].filter(Boolean).join(' '),address.country].filter(Boolean).join('\n')};
}
