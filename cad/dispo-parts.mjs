export const partNames={frame:'Rahmen',cabinet:'Schrank',duct:'Kabelkanal',rail:'Montageschiene'};
export const partDefaults={
 frame:{width:1008,height:1920,depth:165,left:4,right:4,top:4,bottom:4,plinth:0},
 cabinet:{width:1200,height:2100,depth:400,left:50,right:50,top:60,bottom:60,plinth:100},
 duct:{length:700,width:60,depth:60,orientation:'horizontal'},
 rail:{length:700,width:35,depth:15,orientation:'horizontal'}
};
export function partFields(type){
 if(!partNames[type])throw Error('Unbekanntes Aufbauteil.');
 const enclosure=['frame','cabinet'].includes(type);
 return enclosure?[
  ['width','Breite',50,10000],['height','Gesamthöhe',50,10000],['depth','Tiefe',10,4000],
  ['left','Rand links',1,1000],['right','Rand rechts',1,1000],['top','Rand oben',1,1000],['bottom','Rand unten',1,1000],
  ...(type==='cabinet'?[['plinth','Sockelhöhe',0,1000]]:[])
 ]:[['length','Länge',10,10000],['width','Breite',10,1000],['depth',type==='rail'?'Profilhöhe':'Tiefe',type==='rail'?2:4,1000]];
}
export function partSpec(type,values){
 const data={...partDefaults[type],...values};
 for(const [key,label,min,max]of partFields(type))if(!Number.isFinite(data[key])||data[key]<min||data[key]>max)throw Error(`${label}: einen Wert zwischen ${min} und ${max} mm eingeben.`);
 const enclosure=['frame','cabinet'].includes(type);
 if(enclosure){
  if(type==='frame')data.plinth=0;
  if(data.width-data.left-data.right<10||data.height-data.plinth-data.top-data.bottom<10)throw Error('Randabstände und Sockel lassen zu wenig freien Innenraum.');
  return {kind:'cabinet',dimensions:{width:data.width,height:data.height},rotation:0,metadata:{depth:data.depth,dispoFrame:type==='frame',frameStyle:type==='frame'?'drahtwerk':'manual-cabinet',manualPart:{type,...Object.fromEntries(['left','right','top','bottom','plinth'].map(k=>[k,data[k]]))}}};
 }
 if(!['horizontal','vertical'].includes(data.orientation))throw Error('Ausrichtung wählen.');
 return {kind:type,dimensions:{width:data.length,height:data.width},rotation:data.orientation==='vertical'?90:0,metadata:{depth:data.depth,manualPart:{type},...(type==='rail'?{profile:'manual-rail'}:{})}};
}
export function partValues(e){
 const type=e.manualPart?.type;if(!partNames[type])throw Error('Kein manuell konfiguriertes Aufbauteil.');
 return ['frame','cabinet'].includes(type)?{width:e.width,height:e.height,depth:e.depth,...e.manualPart}:{length:e.width,width:e.height,depth:e.depth,orientation:e.rotation%180?'vertical':'horizontal'};
}
export function validateManualPart(e,fail){
 if(e.manualPart===undefined)return {};
 const type=e.manualPart?.type;
 try{
  if((['frame','cabinet'].includes(type)?'cabinet':type)!==e.kind)throw Error();
  const spec=partSpec(type,partValues(e));
  return {manualPart:spec.metadata.manualPart};
 }catch{fail();}
}
export function manualInterior(e){
 const m=e.manualPart;if(!m||!['frame','cabinet'].includes(m.type))return null;
 return {left:m.left,top:m.top,right:e.width-m.right,bottom:e.height-m.plinth-m.bottom};
}
