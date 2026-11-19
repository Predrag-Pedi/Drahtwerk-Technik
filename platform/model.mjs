export const modules={workshop:'Werkstatt & EW',cad:'Schema & Dispo',offers:'Offerten',heat:'Wärmeberechnung'};
export const initialPlans=[
 {id:'basis',name:'Basis',modules:['workshop'],seats:3},
 {id:'planung',name:'Planung',modules:['workshop','cad'],seats:5},
 {id:'komplett',name:'Komplett',modules:Object.keys(modules),seats:10}
];
export const profileFields={name:'Firmenname auf Dokumenten',street:'Strasse / Nr.',postcode:'PLZ',city:'Ort',country:'Land',email:'E-Mail',phone:'Telefon',website:'Webseite',vat:'MWST-Nummer'};
export const emptyProfile=()=>Object.fromEntries([...Object.keys(profileFields),'logo'].map(k=>[k,'']));
export const swissDay=(date=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zurich'}).format(date);
export function licenseActive(company,day=swissDay()){return Boolean(company?.enabled&&company.startsOn<=day&&company.endsOn>=day);}
export function permissionsFor(user,company,plan){return Object.fromEntries(Object.keys(modules).map(k=>[k,user.role==='developer'?'write':licenseActive(company)&&plan?.modules.includes(k)?user.permissions?.[k]||'none':'none']));}
export function pageModule(path){if(/^(cad(?:\/|\.html))/.test(path))return 'cad';if(/^(offerten(?:\/|\.html))/.test(path))return 'offers';if(/^(waerme\/|waermeberechnung\.html)/.test(path))return 'heat';if(/^(EW\/|ew\/|Aufbauabstaende\/|(?:technik|ew|schienenrechner|drahtfarben|aufbauabstaende)\.html|(?:ew|aufbau)-.*\.json)/.test(path))return 'workshop';return null;}
