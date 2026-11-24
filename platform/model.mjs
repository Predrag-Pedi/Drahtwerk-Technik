export const modules={workshop:'Werkstatt & EW',cad:'Schema & Dispo',offers:'Offerten',heat:'Wärmeberechnung',reports:'Regierapporte'};
export const workshopTools={rails:'Schienenrechner',ew:'EW-Vorschriften',wireColors:'Drahtfarben',wires:'Litzenquerschnitte',copper:'Kupferschienen',smissline:'ABB Smissline',uniway:'Hager Uniway',spacing:'Aufbauabstände'};
export const technicalTabs={litzen:'wires',kupfer:'copper',abb:'smissline',uniway:'uniway'};
export const permissionLabels={...workshopTools,cad:modules.cad,offers:modules.offers,heat:modules.heat,reports:modules.reports};
export const permissionKeys=['workshop',...Object.keys(permissionLabels)];
export const licenseModule=key=>Object.prototype.hasOwnProperty.call(workshopTools,key)?'workshop':key;
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
 const result=Object.fromEntries(permissionKeys.map(k=>{const parent=licenseModule(k);return [k,user.role==='developer'?'write':licenseActive(company)&&plan?.modules.includes(parent)?user.permissions?.[k]??(parent==='workshop'?user.permissions?.workshop:'none')??'none':'none'];}));
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
export function pageModule(path){if(/^(regie\/|regierapport\.html)/.test(path))return 'reports';if(/^(cad(?:\/|\.html))/.test(path))return 'cad';if(/^(offerten(?:\/|\.html))/.test(path))return 'offers';if(/^(waerme\/|waermeberechnung\.html)/.test(path))return 'heat';if(/^(EW\/|ew\/|Aufbauabstaende\/|(?:technik|ew|schienenrechner|drahtfarben|aufbauabstaende)\.html|(?:ew|aufbau)-.*\.json)/.test(path))return 'workshop';return null;}
