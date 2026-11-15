import {defaultConfig,validateDispoConfig} from './dispo.mjs?v=20261115-04';
import {buildAutomaticDispo} from './dispo-auto.mjs?v=20261115-04';
// The page properties hold frame dimensions. Generating a disposition needs no dialog.
export async function editAutomaticDispo(doc,p,apply){
 const generated=await buildAutomaticDispo(doc,p);
 apply(generated);
 return generated;
}

export function editSiteSettings(p,showForm,apply){
 const c={...defaultConfig(),...p.dispoConfig};
 showForm('Einbaumasse / Reserve',[
  {key:'mode',label:'Berechnung',value:c.autoSize?'auto':'manual',options:[['auto','Automatisch innerhalb der Maximalmasse'],['manual','Manuelle Rahmenmasse beibehalten']]},
  ...[['maxWidth','Max. Einbaubreite gesamt (mm)',c.maxWidth||c.width,10000],['maxHeight','Max. Einbauhöhe (mm)',c.maxHeight||c.height,4000],['maxDepth','Max. Einbautiefe (mm, 0 = offen)',c.maxDepth||0,1500],['passageWidth','Durchgangsbreite, aufrecht (mm, 0 = offen)',c.passageWidth||0,10000],['passageHeight','Durchgangshöhe, aufrecht (mm, 0 = offen)',c.passageHeight||0,4000],['reserveMeters','Reserve-Zählerplätze gesamt (inkl. Schema)',c.reserveMeters||0,120]].map(([key,label,value,max])=>({key,label,value,type:'number',min:0,max}))
 ],data=>{
  const next=validateDispoConfig({...c,autoSize:data.mode==='auto',...Object.fromEntries(['maxWidth','maxHeight','maxDepth','passageWidth','passageHeight','reserveMeters'].map(k=>[k,Number(data[k])]))});
  if(next.autoSize&&(next.maxWidth<258||next.maxHeight<400))throw Error('Für die automatische Berechnung Einbaubreite ab 258 mm und Einbauhöhe ab 400 mm eingeben.');
  apply(next);
 });
}
