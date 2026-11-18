import {defaultConfig,validateDispoConfig,schemaDevices} from './dispo.mjs?v=20261118-7';
import {buildAutomaticDispo} from './dispo-auto.mjs?v=20261118-7';

export function dispoVariants(p){
 const c=validateDispoConfig({...defaultConfig(),...p.dispoConfig});
 // Reuse the user's installation limits, not the dimensions of the last build.
 const base={...c,autoSize:true,maxWidth:c.maxWidth||c.width,maxHeight:c.maxHeight||c.height};
 const variants=[{id:'current',name:'Aktuelle Einstellungen',config:{...base}}];
 const systems=[['standard','hager','Standard · Hager'],['standard','schneider','Standard · Schneider'],['smissline','auto','Smissline'],['silas60','auto','Silas · 60 mm'],['vertigroup185','auto','Vertigroup · 185 mm']];
 for(const type of ['sbr','standing','custom'])for(const [system,manufacturer,label]of systems){
  const plinths=type!=='sbr'?[...new Set([0,c.plinthHeight||0])]:[0];
  for(const plinthHeight of plinths)variants.push({id:[type,system,manufacturer,plinthHeight].join('-'),name:`${type==='sbr'?'SBR':`${type==='custom'?'Individualschrank':'Standschrank AN'} · ${plinthHeight?plinthHeight+' mm Sockel':'ohne Sockel'}`} / ${label}`,config:{...base,distributionType:type==='custom'?'standing':type,cabinetMode:type==='custom'?'custom':'standard',cabinetSizing:'auto',cabinetOptions:{...base.cabinetOptions,plinth:plinthHeight?(base.cabinetOptions.plinth==='Stahl'?'Stahl':'Aluminium'):'Kein'},buildSystem:system,breakerManufacturer:manufacturer,systemScope:'all',plinthHeight}});
 }
 return variants;
}

export function cachedDispoBuild(fetcher=fetch){
 const cache=new Map();
 const get=url=>{if(!cache.has(url))cache.set(url,fetcher(url).then(async r=>{const data=r.ok?await r.json():null;return {ok:r.ok,json:async()=>structuredClone(data)};}));return cache.get(url);};
 return (d,p)=>buildAutomaticDispo(d,p,get);
}

// No apply, persistence or reserve reduction during a comparison. Every row
// represents a complete build or the actual reason that build is unavailable.
export async function calculateDispoVariant(doc,p,variant,build=cachedDispoBuild()){
 try{
  if(variant.id!=='current'&&['silas60','vertigroup185'].includes(variant.config.buildSystem)&&!schemaDevices(doc).devices.some(d=>d.kind==='fuse'))throw Error('Dieses Schema enthält keine Schmelzsicherungen für Silas / Vertigroup. Für LS und FI-LS Standard oder Smissline wählen.');
  return {...variant,result:await build(doc,{...p,dispoConfig:variant.config})};
 }
 catch(error){return {...variant,error:error.message,code:error.code||''};}
}

export function dispoVariantName(c){return `${c.distributionType==='sbr'?'SBR':(c.cabinetMode==='custom'?'Individualschrank':'Standschrank AN')+' · '+(c.plinthHeight?c.plinthHeight+' mm Sockel':'ohne Sockel')} / ${{standard:'Standard',smissline:'Smissline',silas60:'Silas · 60 mm',vertigroup185:'Vertigroup · 185 mm'}[c.buildSystem]}${c.buildSystem==='standard'&&c.breakerManufacturer!=='auto'?' · '+({hager:'Hager',schneider:'Schneider'}[c.breakerManufacturer]):''}`;}
