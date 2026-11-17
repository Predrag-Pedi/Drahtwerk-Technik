import {smisslineTemplate,smisslineFeed,smisslineProjectSupply,commonProjectSupply} from './smissline-packing.mjs?v=20261117-8';
import {smisslineRails,onSmissline} from './system-layout.mjs?v=20261117-8';
import {fuseTemplate,copperFuse,neutralTemplate,fuseZoneHeight} from './fuse-systems.mjs?v=20261117-8';
import {siteConfig,reserveMeters,isReserveMeter} from './site-layout.mjs?v=20261117-8';
import {horizontalCT} from './ct-template.mjs?v=20261117-8';
import {updateIncomingRails,updateSupplyBlocks} from './dispo-move.mjs?v=20261117-8';
import {validateTemplate} from './template.mjs?v=20261117-8';
import {generateDispo,assertConfiguredDistribution,defaultConfig,schemaDevices,validateDispoConfig} from './dispo.mjs?v=20261117-8';
import {templateAssembly,assemblyKey} from './dispo-templates.mjs?v=20261117-8';
// Original TinLine library families. No nearest-size substitute for unknown equipment.
export function automaticTemplateId(d){
 if(['ls','fils'].includes(d.kind)&&d.breakerSystem&&d.breakerSystem==='uniway')throw Error(`${d.tag}: ${d.breakerSystem==='smissline'?'Smissline':'Uniway'} ist gewählt; die automatische Disposition für dieses System ist noch nicht konfiguriert.`);
 const text=d.name||'',amp=d.current||Number(text.match(/\b(\d+)\s*A\b/i)?.[1]);
 if(d.incoming)return d.source?.element==='incoming-supply'?(amp>0&&amp<=100?'tl-0552':amp>100&&amp<=160?'tl-0553':undefined):'tl-0746';
 if(d.kind==='test-terminal')return 'tl-0745';
 if(d.kind==='rse-fuse')return d.measurementOwner?'tl-0608':'tl-0605';
 if(d.kind==='voltage-fuse')return 'tl-0612';
 if(d.kind==='transformer')return 'tl-0849';
 if(onSmissline(d))return smisslineTemplate(d);
 if(d.kind==='spd')return 'tl-0735';
 if(d.kind==='meter')return /RSE|Rundsteuer|\bTRE\b/i.test(text)?(/Res(?:erve)?[ ._-]/i.test(text)?'tl-0744':'tl-0743'):isReserveMeter(d)?'tl-0741':'tl-0740';
 if(d.kind==='fuse')return fuseTemplate(d);
 const poleText=text+' '+(d.schemaTemplateName||'');
 const poles=d.poles||(/LS[_ -]L[123]N/i.test(poleText)?1:Number(poleText.match(/(?:\b|_)([1-4])\s*(?:L|P|pol)/i)?.[1])||(d.width>=54?3:d.width>=36&&d.kind==='ls'?2:1)),neutral=d.neutral||/[1-4]\s*(?:L|P)\s*\+?\s*N|L[123]N/i.test(poleText);
 if(onSmissline(d))return smisslineTemplate(d);
 if(d.kind==='ls'&&d.lsMode==='individual')return 'tl-0530';
 if(d.kind==='ls'&&d.manufacturer==='schneider')return poles<=2?'tl-0530':poles<=4?'tl-0541':undefined;
 if(d.kind==='ls'&&d.manufacturer==='hager')return poles===1?(neutral?'tl-0531':'tl-0530'):poles===3?(neutral?'tl-0542':'tl-0541'):poles===2?'tl-0534':poles===4?'tl-0543':undefined;
 if(d.kind==='ls')return ({'1':'tl-0530','1N':'tl-0531','2':'tl-0534','2N':'tl-0535','3':'tl-0541','3N':'tl-0542','4':'tl-0543'})[poles+(neutral?'N':'')];
 if(d.kind==='fils')return poles===1||poles===2&&neutral?'tl-0626':poles===3||poles===4?'tl-0624':undefined;
 if(d.kind==='coil'&&amp)return amp>=20&&amp<=50?'tl-0707':amp===63?'tl-0709':amp===100?'tl-0706':amp===250?'tl-0708':undefined;
 if(d.kind==='switch'&&amp)return amp<=40?'tl-0785':amp<=63?'tl-0786':amp<=125?'tl-0787':amp<=160?'tl-0788':amp<=400?'tl-0789':amp<=1000?'tl-0790':amp<=1250?'tl-0791':amp<=1600?'tl-0792':undefined;
}
export function templateTextEdits(t,d){
 const edits=Object.fromEntries((t.labels||[]).map(l=>['bmk:'+l.key,d.tag||'']));
 for(const l of t.details?.texts||[]){const s=l.text.trim();if(s==='BMK')edits[l.key]=(d.tag||'')+(d.phase?' '+d.phase:'');else if(s==='ORT')edits[l.key]=d.circuitName||'';else if(s==='AN'||s==='ID')edits[l.key]='';}
 return edits;
}
export async function buildAutomaticDispo(doc,p,fetcher=fetch){
 let c=validateDispoConfig({...defaultConfig(),...p.dispoConfig});assertConfiguredDistribution(c);
 const {devices,warnings}=schemaDevices(doc);
 if(c.buildSystem==='smissline')for(const d of devices.filter(d=>['ls','fils','spd','switch'].includes(d.kind)&&!d.breakerSystemExplicit))d.breakerSystem='smissline';
 if(['silas60','vertigroup185'].includes(c.buildSystem))for(const d of devices.filter(d=>d.kind==='fuse'&&!d.fuseSystemExplicit)){d.fuseSystem=c.buildSystem;if(c.buildSystem==='vertigroup185'&&['DII','DIII','NH000'].includes(d.fuseType))d.fuseType='NH00';}
for(const d of devices)if(['ls','fils'].includes(d.kind)&&c.breakerManufacturer!=='auto'){d.manufacturer=c.breakerManufacturer;d.lsMode='allpole';}
 // A project may omit the incoming schematic sheet; its rated current still
 // defines the required supply block. Never infer it by adding outgoing currents.
 const rated=Number(String(doc.ratedCurrent||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));
 const ordinary=c.buildSystem==='standard'&&!c.reserveMeters&&devices.some(d=>d.kind==='switch')&&devices.some(d=>d.incoming)&&!devices.some(d=>d.include!==false&&(['meter','fuse','rse-fuse'].includes(d.kind)||d.measurementOwner));
 if(ordinary){const supply=commonProjectSupply(devices);if(supply)for(const d of devices)if(!d.circuitName&&!d.meterFed&&!d.smisslineFeedFrom)d.supplyKey=supply.key;}
 if(!ordinary&&c.buildSystem!=='smissline'&&(devices.some(d=>d.incoming)||rated>0))devices.push({kind:'terminal',incoming:true,current:rated,tag:'',name:'Einspeisblock',width:53,height:320,depth:70,source:{page:p.id,element:'incoming-supply',key:'$'}});
 devices.push(...reserveMeters(devices,c.reserveMeters,p.id));
 const commonSupply=smisslineProjectSupply(devices,c);
 if(commonSupply?.directMain&&!(rated>63)){commonSupply.directInput.include=false;commonSupply.directMain.directSmisslineInput=true;}
 const selected=devices.filter(d=>d.include!==false&&(d.kind!=='terminal'||d.incoming));
 if(!selected.length)throw Error('Keine Geräte im Schema erkannt.');
 if(selected.some(d=>d.fuseSystem==='vertigroup185')&&!(c.supportSpacing185>55))throw Error('Vertigroup: maximalen Trägerabstand über 55 mm unter Einbaumasse / Reserve angeben.');
 for(const d of selected.filter(onSmissline)){const candidates=devices.filter(q=>q!==d&&!onSmissline(q)&&['fuse','switch'].includes(q.kind)&&(d.smisslineFeedFrom?q.tag===d.smisslineFeedFrom:q.circuitName&&q.circuitName===d.circuitName)),upstream=candidates.length===1?candidates[0]:null;const common=!d.circuitName&&!d.meterFed&&!d.smisslineFeedFrom&&!upstream?commonSupply:null;if(common)d.supplyKey=common.key;d.feedCurrent=d.smisslineFeedCurrent||upstream?.current||common?.current||rated;d.feedFrom=d.smisslineFeedFrom||upstream?.tag||common?.from||'';d.feedSource=upstream?.source||common?.source||d.source;smisslineFeed(d);}
 if(selected.some(d=>onSmissline(d)&&!d.feedFrom))warnings.push('Smissline: Quellsicherung der Einspeisung nicht eindeutig verbunden. BMK unter Smissline-Einspeisung im Schema ergänzen.');

 const ids=selected.map(automaticTemplateId),missing=selected.filter((d,i)=>!ids[i]);
 if(missing.some(d=>d.incoming))throw Error('Einspeisblock: Bemessungsstrom in den Projektdaten ergänzen (Vorlagen bis 100 A bzw. bis 160 A).');
 if(missing.length)throw Error(`Dispo unverändert: Keine eindeutige Originalvorlage für ${missing.map(d=>d.tag+' ('+d.name+')').join(', ')}. Gerätetyp im Schema ergänzen.`);
 const get=async path=>{const r=await fetcher(path+'?v=20261117-8');if(!r.ok)throw Error('Dispo unverändert: Vorlagenbibliothek konnte nicht geladen werden.');return r.json();};
 const [details,raw]=await Promise.all([get('cad/template-details.json'),Promise.all([...new Set([...ids,...(selected.some(onSmissline)?[...smisslineRails.map(r=>r.id),'tl-0524','tl-0630','tl-0632']:[]),...selected.filter(copperFuse).map(neutralTemplate),...(selected.some(d=>d.fuseSystem==='vertigroup185')?['tl-0870']:[]),...(ids.includes('tl-0581')?['tl-0580']:[])])].map(async id=>[id,await get('cad/templates/'+id+'.json')]))]);
 const templates=new Map(raw.map(([id,t])=>[id,id==='tl-0849'?horizontalCT(validateTemplate({...t,details:details[id]})):validateTemplate({...t,details:details[id]})]));
 for(let i=0;i<selected.length;i++){const d=selected[i],t=templates.get(ids[i]);d.dispoTemplateId=t.id;if(d.incoming&&t.id==='tl-0746')d.frameStyle='incoming-terminal';if(d.kind!=='meter'&&(d.kind!=='fuse'||copperFuse(d))){d.width=d.kind==='fils'&&d.manufacturer==='schneider'&&t.id==='tl-0624'?90:t.width;d.height=t.height;d.poles??=({'tl-0529':1,'tl-0530':1,'tl-0531':1,'tl-0534':2,'tl-0540':3,'tl-0541':3,'tl-0542':3,'tl-0543':4,'tl-0624':3,'tl-0626':1})[t.id];}if(onSmissline(d)){d.width=t.height;d.height=t.width;d.templateRotation=90;}d.confirmed=false;}
 for(const d of selected.filter(copperFuse)){const n=templates.get(neutralTemplate(d));d.neutralTemplateId=n.id;d.neutralWidth=n.width;d.neutralHeight=n.height;}
 c.fuseHeight=fuseZoneHeight(selected,c.fuseHeight);
 c=siteConfig(selected,c);
 if(c.fields>1&&!selected.some(d=>d.source?.element==='incoming-supply'))warnings.push('Feldübergabeblöcke fehlen: Bemessungsstrom in den Projektdaten ergänzen und neu erzeugen.');
 const g=generateDispo(p,selected,c),bySource=new Map(selected.map((d,i)=>[JSON.stringify(d.source),templates.get(ids[i])])),choices=new Map();
 const originalFor=e=>e.dispoTemplateId&&!(e.dispoKind==='fuse'&&e.fuseType==='NH00'&&e.fuseSystem==='conventional')?templates.get(e.dispoTemplateId):e.frameStyle?.startsWith('transfer-')?bySource.get(JSON.stringify(selected.find(d=>d.source?.element==='incoming-supply')?.source)):e.dispoKind==='fuse'&&e.fuseType==='NH00'?templates.get(e.neutral?'tl-0581':'tl-0580'):bySource.get(JSON.stringify(e.dispoSource));
 // Assembly retains the original layout geometry in 3D; each source is resolved separately
 // so RSE and ordinary meters of identical dimensions never share a mistaken mapping.
 for(const e of g.elements)if(e.dispoSource||e.profile==='smissline')choices.set(assemblyKey(e),originalFor(e));
 const assembled=templateAssembly(g,choices),factor=1200/420/g.scale;
 for(const e of assembled.elements)if(e.dispoSource){const t=originalFor(e);e.template=structuredClone(t);e.text='';e.textEdits=templateTextEdits(t,e);
  if(e.dispoKind==='smissline-feed')for(const l of e.template.details?.texts||[])if(l.text.trim()==='BMK')for(const run of l.runs){const value=e.textEdits[l.key]||'',unit=Math.max(Math.abs(run.matrix[0]),Math.abs(run.matrix[1]),1);run.fontSize=Math.min(run.fontSize,t.viewWidth*.8/Math.max(1,value.length*.6*unit));}
  // ORT is a centred plate caption in the source drawing. Keep longer group names
  // inside the plate instead of extending the original three-letter placeholder.
  if(e.dispoKind==='meter')for(const l of e.template.details?.texts||[])if(['BMK','ORT'].includes(l.text.trim())){
   const run=l.runs[0],value=e.textEdits[l.key]||'',unit=Math.abs(run.matrix[0]);
   run.fontSize=Math.min(run.fontSize,t.viewWidth*.88/Math.max(1,value.length*.6*unit));
   const textWidth=value.length*run.fontSize*unit*.6;
   e.textOffsets={...e.textOffsets,[l.key]:{x:t.viewWidth/2-run.matrix[4],y:0}};
  }
  if(e.dispoKind==='meter'){e.x-=(250-e.width)/2*factor;e.y-=45*factor;e.width=250;e.height=400;}
 }
 for(const e of assembled.elements.filter(e=>e.profile==='smissline'||e.templateRotation===90)){const t=templates.get(e.dispoTemplateId),cx=e.x+e.width*factor/2,cy=e.y+e.height*factor/2;if(e.profile==='smissline')e.textEdits=templateTextEdits(t,{tag:''});e.width=e.dispoKind==='smissline-accessory'?e.height:t.width;e.height=t.height;e.x=cx-e.width*factor/2;e.y=cy-e.height*factor/2;e.rotation=90;}
 const assembledPage={...p,elements:assembled.elements,scale:assembled.scale};
 const inputs=assembled.elements.filter(e=>e.frameStyle==='incoming-terminal');for(const e of assembled.elements.filter(e=>e.dispoKind==='spd')){const input=inputs.find(i=>Math.abs(i.x+i.width*factor/2-e.x-e.width*factor/2)<125*factor);if(input)e.inputOwner=input.dispoSource.element;}
 updateIncomingRails(assembledPage);updateSupplyBlocks(assembledPage);
 const cabinets=assembled.elements.filter(e=>e.kind==='cabinet'),fieldOf=e=>cabinets.findIndex(b=>e.x>=b.x-.01&&e.x<b.x+b.width*factor);
 const separated=[...new Set(assembled.elements.filter(e=>e.dispoKind==='meter'&&e.circuitName).filter(m=>assembled.elements.some(e=>e.dispoSource&&e.dispoKind!=='meter'&&e.circuitName===m.circuitName&&fieldOf(e)!==fieldOf(m))).map(m=>m.circuitName))];
 if(separated.length)warnings.push('Feldübergreifende Abgänge erforderlich: '+separated.join(', ')+'. Kein vollständig gemeinsamer Aufbau innerhalb der gewählten Masse gefunden.');
 return {...assembled,warnings};
}
