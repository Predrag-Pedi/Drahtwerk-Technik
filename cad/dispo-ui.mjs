import {defaultConfig,validateDispoConfig} from './dispo.mjs?v=20261115-08';
import {buildAutomaticDispo} from './dispo-auto.mjs?v=20261115-08';
// The page properties hold frame dimensions. Generating a disposition needs no dialog.
export async function editAutomaticDispo(doc,p,apply){
 const generated=await buildAutomaticDispo(doc,p);
 apply(generated);
 return generated;
}

export function editSiteSettings(p,showForm,apply){
 const c={...defaultConfig(),...p.dispoConfig};
 showForm('Einbaumasse / Reserve',[
  ...[['maxWidth','Max. Einbaubreite gesamt (mm)',c.maxWidth||c.width,10000],['maxHeight','Max. Einbauhöhe (mm)',c.maxHeight||c.height,4000],['maxDepth','Max. Einbautiefe (mm, 0 = offen)',c.maxDepth||0,1500],['passageWidth','Durchgangsbreite, aufrecht (mm, 0 = offen)',c.passageWidth||0,10000],['passageHeight','Durchgangshöhe, aufrecht (mm, 0 = offen)',c.passageHeight||0,4000],['reserveMeters','Reserve-Zählerplätze gesamt (inkl. Schema)',c.reserveMeters||0,120]].map(([key,label,value,max])=>({key,label,value,type:'number',min:0,max}))
 ],data=>{
  const next=validateDispoConfig({...c,autoSize:true,...Object.fromEntries(['maxWidth','maxHeight','maxDepth','passageWidth','passageHeight','reserveMeters'].map(k=>[k,Number(data[k])]))});
  if(next.autoSize&&(next.maxWidth<258||next.maxHeight<400))throw Error('Für die automatische Berechnung Einbaubreite ab 258 mm und Einbauhöhe ab 400 mm eingeben.');
  apply(next);
 });
}

export function editManualSettings(p,showForm,apply){
 const c={...defaultConfig(),...p.dispoConfig};
 showForm('Manuelle Eingabe',[
  {key:'multiple',label:'Mehrere Felder',value:c.fields>1?'yes':'no',options:[['no','Nein'],['yes','Ja']]},
  {key:'widths',label:'Feldbreiten inkl. Rahmen (mm, mit / trennen)',value:(c.fieldWidths||Array(c.fields).fill(c.width/c.fields)).join(' / ')},
  {key:'height',label:'Rahmenhöhe (mm)',value:c.height,type:'number',min:400,max:4000},
  {key:'depth',label:'Rahmentiefe (mm)',value:c.depth,type:'number',min:165,max:1500}
 ],data=>{
  const widths=String(data.widths).split('/').map(v=>Number(v.trim()));
  if(widths.some(v=>!Number.isFinite(v)||v<258))throw Error('Gültige Feldbreiten ab 258 mm eingeben.');
  if((data.multiple==='yes')!==(widths.length>1))throw Error('Bei mehreren Feldern die einzelnen Breiten mit / trennen; sonst genau eine Breite eingeben.');
  apply(validateDispoConfig({...c,autoSize:false,width:widths.reduce((a,b)=>a+b,0),fields:widths.length,fieldWidths:widths,height:Number(data.height),depth:Number(data.depth)}));
 });
}
