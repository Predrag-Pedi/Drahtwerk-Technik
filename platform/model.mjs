export const modules={workshop:'Werkstatt & EW',cad:'Schema & Dispo',offers:'Offerten & Aufträge',heat:'Wärmeberechnung',reports:'Regierapporte'};
export const workshopTools={rails:'Schienenrechner',ew:'EW-Vorschriften',wireColors:'Drahtfarben',wires:'Litzenquerschnitte',copper:'Kupferschienen',smissline:'ABB Smissline',uniway:'Hager Uniway',spacing:'Aufbauabstände'};
export const technicalTabs={litzen:'wires',kupfer:'copper',abb:'smissline',uniway:'uniway'};
export const permissionLabels={...workshopTools,cad:modules.cad,offers:'Offerten',orders:'Aufträge',heat:modules.heat,reports:modules.reports,customers:'Kundenstamm'};
export const permissionKeys=['workshop',...Object.keys(permissionLabels)];
export const licenseModule=key=>Object.prototype.hasOwnProperty.call(workshopTools,key)?'workshop':key==='orders'?'offers':key;
export const planAllows=(plan,key)=>key==='customers'?['offers','cad','heat','reports'].some(k=>plan?.modules.includes(k)):Boolean(plan?.modules.includes(licenseModule(key)));
export const initialPlans=[
 {id:'basis',name:'Basis',modules:['workshop','reports'],seats:3},
 {id:'planung',name:'Planung',modules:['workshop','cad','reports'],seats:5},
 {id:'komplett',name:'Komplett',modules:Object.keys(modules),seats:10}
];
export const profileFields={name:'Firmenname auf Dokumenten',street:'Strasse / Nr.',postcode:'PLZ',city:'Ort',country:'Land',email:'E-Mail',phone:'Telefon',website:'Webseite',vat:'MWST-Nummer'};
export const emptyProfile=()=>Object.fromEntries([...Object.keys(profileFields),'logo'].map(k=>[k,'']));
export const swissDay=(date=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zurich'}).format(date);
export function licenseActive(company,day=swissDay()){return Boolean(company?.enabled&&company.startsOn<=day&&company.endsOn>=day);}
export function permissionsFor(user,company,plan){
 const result=Object.fromEntries(permissionKeys.map(k=>{const parent=licenseModule(k);return [k,user.role==='developer'?'write':licenseActive(company)&&planAllows(plan,k)?user.permissions?.[k]??(k==='orders'?user.permissions?.offers:undefined)??(parent==='workshop'?user.permissions?.workshop:'none')??'none':'none'];}));
 if(user.role!=='developer'&&licenseActive(company)&&planAllows(plan,'customers')&&user.permissions?.customers===undefined){const levels=['cad','offers','heat','reports'].map(k=>result[k]);result.customers=levels.includes('write')?'write':levels.includes('read')?'read':'none';}
 if(user.role==='admin'&&licenseActive(company)&&planAllows(plan,'orders'))result.orders='write';
 result.workshop=Object.keys(workshopTools).some(k=>result[k]==='write')?'write':Object.keys(workshopTools).some(k=>result[k]==='read')?'read':'none';return result;
}
export function pageTool(path,hash=''){
 if(/^(schienenrechner\.html)/.test(path))return 'rails';
 if(/^(EW\/|ew\/|ew\.html|ew-.*\.json)/.test(path))return 'ew';
 if(/^(drahtfarben\.(html|txt))/.test(path))return 'wireColors';
 if(/^(Aufbauabstaende\/|aufbauabstaende\.html|aufbau-.*\.json)/.test(path))return 'spacing';
 if(path==='technik.html')return Object.prototype.hasOwnProperty.call(technicalTabs,hash.slice(1))?technicalTabs[hash.slice(1)]:'technical';
 return pageModule(path);
}
export function pageModule(path){if(path==='auftraege.html')return 'orders';if(path==='kunden.html')return 'customers';if(/^(regie\/|regierapport\.html)/.test(path))return 'reports';if(/^(cad(?:\/|\.html))/.test(path))return 'cad';if(/^(offerten(?:\/|\.html))/.test(path))return 'offers';if(/^(waerme\/|waermeberechnung\.html)/.test(path))return 'heat';if(/^(EW\/|ew\/|Aufbauabstaende\/|(?:technik|ew|schienenrechner|drahtfarben|aufbauabstaende)\.html|(?:ew|aufbau)-.*\.json)/.test(path))return 'workshop';return null;}
