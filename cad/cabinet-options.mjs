// Choices observed in the public AN configurator on 18 November 2026.
// This is a planning configuration, not an order or manufacturer certification.
export const anBodyWidths=[400,500,600,700,750,800,850,900,1000,1100,1150,1200,1300,1400,1500,1550,1600,1700,1800,1900,2000];
export const anDepths=[300,350,400,450,500,600,700,800,900,1000];
export const choices={
 plinth:['Kein','Stahl','Aluminium'],back:['Keine','roh','Schrankfarbe'],side:['Keine','Flach','Standard'],
 roof:['Geschlossen','Standard mit PVC','Standard mit Aluminium','Standard mit Lochblech','Standard mit Bürsten','Standard mit Moosgummischieber','Standard mit Dampfsperrrahmen','Spezial Lochblechdach komplett'],
 floor:['Kein','1-teilig','2-teilig','3-teilig'],floorMaterial:['Geschlossen','PVC','Aluminium','Lochblech','Bürsten','Moosgummischieber','Dampfsperrrahmen'],mount:['Keine','Flach','Doppelabbug'],
 wings:['1-flüglig','2-flüglig'],hinge:['Links','Rechts'],angle:[112,180],
 lock:['Stangenschloss mit Schlüsselschild','Stangenschloss mit Klinkengriff','Stangenschloss mit T-Griff','Stangenschloss mit Schlüsselschild Zylinder aufgesetzt','Stangenschloss mit Schlüsselschild Zylinder versenkt','Schwenkhebelgriff 35 × 176 mm mit Stangenschloss','Schwenkhebelgriff 35 × 160 mm'],
 insert:['4-kant 6mm','4-kant 7mm','4-kant 8mm','Dorn 3-kant 7mm','Dorn 3-kant 8mm','Doppelbart 3mm','Doppelbart 5mm'],
 pocket:['Ohne','Kunststoff A4 Quer','Kunststoff A4 Hoch','Kunststoff A5 Quer','Aluminium A4 Quer'],
 accessory:['Kein','Vorbereitet für Wandbefestigungswinkel','Vorbereitet für Transportringschrauben','Wandbefestigungswinkel Standard montiert','Transportringschrauben montiert','Vorbereitet für Transportringschrauben und Wandbefestigungswinkel Standard montiert']
};
export const ralColors={'7035':['lichtgrau','#c5c7c4'],'1000':['grünbeige','#c9bb88'],'1004':['goldgelb','#e2b007'],'1007':['narzissengelb','#e5a000'],'1013':['perlweiss','#e9e5ce'],'1018':['zinkgelb','#f3da0b'],'1021':['rapsgelb','#f6b600'],'2000':['gelborange','#da6e00'],'2002':['blutorange','#cc3725'],'2004':['reinorange','#e75b12'],'2008':['hellrotorange','#ed6b21'],'3000':['feuerrot','#ab2524'],'3002':['karminrot','#a02128'],'3003':['rubinrot','#8d1d2c'],'3020':['verkehrsrot','#c1121c'],'4002':['rotviolett','#8a5a83'],'5002':['ultramarinblau','#20214f'],'5005':['signalblau','#005387'],'5007':['brillantblau','#496b83'],'5009':['azurblau','#225f78'],'5010':['enzianblau','#004f7c'],'5012':['lichtblau','#0089b6'],'5014':['taubenblau','#637d96'],'5015':['himmelblau','#007caf'],'5017':['verkehrsblau','#005b8c'],'5019':['capriblau','#005e83'],'6003':['olivgrün','#50533c'],'6011':['resedagrün','#6c7c59'],'6019':['weissgrün','#b9ceac'],'6021':['blassgrün','#8a9977'],'7001':['silbergrau','#8a9597'],'7016':['anthrazitgrau','#383e42'],'7030':['steingrau','#939388'],'7032':['kieselgrau','#b5b8b1'],'7037':['staubgrau','#7a7b7a'],'7038':['achatgrau','#b0b0a9'],'7042':['verkehrsgrau A','#8d9490'],'8011':['nussbraun','#5a3a29'],'9001':['cremeweiss','#e9e0d2'],'9002':['grauweiss','#d7d5cb'],'9005':['tiefschwarz','#0a0a0a'],'9006':['weissaluminium','#a5a5a5'],'9010':['reinweiss','#f1ece1'],'9016':['verkehrsweiss','#f1f0ea']};
export const defaultCabinetField=()=>({roof:choices.roof[1],floor:'Kein',floorMaterial:'PVC',mount:'Keine',door:true,wings:'1-flüglig',hinge:'Rechts',angle:112,lock:choices.lock[0],insert:choices.insert[0],pocket:'Ohne',shelves:[]});
export function cabinetOptions(raw={},plinthHeight=0){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ungültige Schrankoptionen.');
 const out={ral:'7035',back:'roh',sideLeft:'Standard',sideRight:'Standard',plinth:plinthHeight?'Aluminium':'Kein',accessory:'Kein',ip54:false,thirdLevel:false,fields:[],...raw};
 const check=(value,values,label)=>{if(!values.includes(value))throw Error(`Ungültige Schrankauswahl: ${label}.`);return value;};
 for(const [key,list]of [['back','back'],['sideLeft','side'],['sideRight','side'],['plinth','plinth'],['accessory','accessory']])check(out[key],choices[list],key);
 check(out.ral,Object.keys(ralColors),'RAL');
 if(!Array.isArray(out.fields)||out.fields.length>10)throw Error('Höchstens 10 Schrankfelder konfigurieren.');
 return {ral:out.ral,back:out.back,sideLeft:out.sideLeft,sideRight:out.sideRight,plinth:out.plinth,accessory:out.accessory,ip54:!!out.ip54,thirdLevel:!!out.thirdLevel,fields:out.fields.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ungültige Feldoptionen.');const f={...defaultCabinetField(),...raw};for(const k of ['roof','floor','floorMaterial','mount','wings','hinge','angle','lock','insert','pocket'])check(f[k],choices[k],k);
  if(!Array.isArray(f.shelves)||f.shelves.length>20||f.shelves.some(y=>!Number.isFinite(y)||y<80||y>3800))throw Error('Tablarhöhen: höchstens 20 Positionen, 80–3800 mm ab Korpusunterkante.');
  return Object.fromEntries([...['roof','floor','floorMaterial','mount','wings','hinge','angle','lock','insert','pocket'].map(k=>[k,f[k]]),['door',!!f.door],['shelves',[...new Set(f.shelves)].sort((a,b)=>a-b)]]);
 })};
}
export function cabinetField(options,index=0){return {...defaultCabinetField(),...(options?.fields?.[index]||options?.fields?.[0])};}
export const sideExtra=value=>value==='Standard'?25:value==='Flach'?5:0;
export function fieldExtra(options,index,count){return (index===0?sideExtra(options?.sideLeft??'Standard'):0)+(index===count-1?sideExtra(options?.sideRight??'Standard'):0);}
export function validateCabinetSettings(c){
 if(c.cabinetMode!==undefined&&!['standard','custom'].includes(c.cabinetMode))throw Error('Standard- oder Individualschrank wählen.');
 const options=cabinetOptions(c.cabinetOptions,c.plinthHeight),height=c.plinthHeight||0;
 if(![0,50,80,100,200].includes(height))throw Error('Sockelhöhe: 0, 50, 80, 100 oder 200 mm wählen.');
 // Old projects may have only a height. Explicit configurations must agree.
 if(c.cabinetOptions&&((options.plinth==='Kein')!==(height===0)||options.plinth==='Stahl'&&height!==100))throw Error('Stahlsockel: 100 mm. Ohne Sockel: 0 mm. Aluminiumsockel: 50/80/100/200 mm.');
 const count=c.cabinetFieldCount??0;if(!Number.isInteger(count)||count<0||count>10)throw Error('Anzahl Schrankfelder: automatisch oder 1–10.');
 if(c.cabinetAutoTopHeight!==undefined&&(!Number.isFinite(c.cabinetAutoTopHeight)||c.cabinetAutoTopHeight<400||c.cabinetAutoTopHeight>1000))throw Error('Berechneten Anschlussraum prüfen.');
 return {...(c.cabinetMode==='custom'&&c.cabinetSizing!=='fixed'&&c.cabinetAutoTopHeight!==undefined?{cabinetAutoTopHeight:c.cabinetAutoTopHeight}:{}),cabinetMode:c.cabinetMode||'standard',cabinetSizing:c.cabinetSizing==='fixed'?'fixed':'auto',cabinetFieldCount:count,cabinetOptions:options,plinthHeight:height};
}
