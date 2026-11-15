import {defaultConfig,validateDispoConfig,distributionTypes} from './dispo.mjs?v=20261115-22';
import {buildAutomaticDispo} from './dispo-auto.mjs?v=20261115-22';
// Only a proven capacity failure may offer a reduction; never change the
// saved page or reserve until the complete alternative has been approved.
export async function editAutomaticDispo(doc,p,apply,confirmReduction=()=>false,build=null){
 if(!build){const cache=new Map(),fetcher=url=>{if(!cache.has(url))cache.set(url,fetch(url).then(async response=>{const data=response.ok?await response.json():null;return {ok:response.ok,json:async()=>structuredClone(data)};}));return cache.get(url);};build=(d,q)=>buildAutomaticDispo(d,q,fetcher);}
 let generated;
 try{generated=await build(doc,p);}catch(error){
  const reserve=p.dispoConfig?.reserve??defaultConfig().reserve;
  if(error.code!=='DISPO_CAPACITY'||reserve<=0)throw error;
  for(let next=Math.ceil(reserve)-1;next>=0;next--){
   const candidate={...p,dispoConfig:{...p.dispoConfig,reserve:next}};
   try{generated=await build(doc,candidate);}catch(other){if(other.code!=='DISPO_CAPACITY')throw other;continue;}
   const yes=await confirmReduction(`Mit ${reserve} % Geräte-Platzreserve passt die Disposition nicht in die angegebenen Masse.

Darf die Platzreserve auf ${generated.config.reserve} % reduziert werden? Dann passen alle Geräte innerhalb der vorgegebenen Masse. Die Reserve-Zählerplätze bleiben erhalten.

Ja: reduzierte Reserve übernehmen und Dispo erzeugen.
Nein: bisherige Dispo und Einstellungen beibehalten.`);
   if(!yes)return null;
   break;
  }
  if(!generated)throw error;
 }
 apply(generated);return generated;
}

export function editSiteSettings(p,showForm,apply){
 const c={...defaultConfig(),...p.dispoConfig};
 showForm('Einbaumasse / Reserve',[
  {key:'distributionType',label:'Verteilungsart',value:c.distributionType,options:Object.entries(distributionTypes).map(([key,label])=>[key,key==='sbr'?label:label+' – noch nicht konfiguriert'])},
  {key:'supportSpacing185',label:'Max. Trägerabstand Vertigroup 185 mm (max. 1000 mm)',value:c.supportSpacing185,type:'number',min:56,max:1000},
  ...[['maxWidth','Max. Einbaubreite gesamt (mm)',c.maxWidth||c.width,10000],['maxHeight','Max. Einbauhöhe (mm)',c.maxHeight||c.height,4000],['maxDepth','Max. Einbautiefe (mm, 0 = offen)',c.maxDepth||0,1500],['passageWidth','Durchgangsbreite, aufrecht (mm, 0 = offen)',c.passageWidth||0,10000],['passageHeight','Durchgangshöhe, aufrecht (mm, 0 = offen)',c.passageHeight||0,4000],['reserveMeters','Reserve-Zählerplätze gesamt (inkl. Schema)',c.reserveMeters||0,120]].map(([key,label,value,max])=>({key,label,value,type:'number',min:0,max}))
 ],data=>{
  const next=validateDispoConfig({...c,distributionType:data.distributionType??c.distributionType,supportSpacing185:Number(data.supportSpacing185??c.supportSpacing185),autoSize:true,...Object.fromEntries(['maxWidth','maxHeight','maxDepth','passageWidth','passageHeight','reserveMeters'].map(k=>[k,Number(data[k])]))});
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
