import {validateTemplate} from './template.mjs?v=20261113-12';
import {generateDispo,defaultConfig,schemaDevices} from './dispo.mjs?v=20261113-12';
import {templateAssembly,assemblyKey} from './dispo-templates.mjs?v=20261113-12';
// Original TinLine library families. No nearest-size substitute for unknown equipment.
export function automaticTemplateId(d){
 const text=d.name||'',amp=d.current||Number(text.match(/\b(\d+)\s*A\b/i)?.[1]);
 if(d.kind==='meter')return /RSE|Rundsteuer|\bTRE\b/i.test(text)?(/Res(?:erve)?[ ._-]/i.test(text)?'tl-0744':'tl-0743'):/Res(?:erve)?[ ._-]/i.test(text)?'tl-0741':'tl-0740';
 if(d.kind==='fuse')return ({DII:'tl-0582',DIII:'tl-0584',NH00:'tl-0580'})[d.fuseType];
 const poleText=text+' '+(d.schemaTemplateName||'');
 const poles=d.poles||(/LS[_ -]L[123]N/i.test(poleText)?1:Number(poleText.match(/(?:\b|_)([1-4])\s*(?:L|P|pol)/i)?.[1])||(d.width>=54?3:d.width>=36&&d.kind==='ls'?2:1)),neutral=d.neutral||/[1-4]\s*(?:L|P)\s*\+?\s*N|L[123]N/i.test(poleText);
 if(d.kind==='ls'&&d.lsMode==='individual')return 'tl-0530';
 if(d.kind==='ls'&&d.manufacturer==='schneider')return poles===1?'tl-0529':poles===3?'tl-0540':undefined;
 if(d.kind==='ls'&&d.manufacturer==='hager')return poles===1?'tl-0530':poles===3?'tl-0541':undefined;
 if(d.kind==='ls')return ({'1':'tl-0530','1N':'tl-0531','2':'tl-0534','2N':'tl-0535','3':'tl-0541','3N':'tl-0542','4':'tl-0543'})[poles+(neutral?'N':'')];
 if(d.kind==='fils')return poles===1?'tl-0626':poles===3?'tl-0624':undefined;
 if(d.kind==='coil'&&amp)return amp>=20&&amp<=50?'tl-0707':amp===63?'tl-0709':amp===100?'tl-0706':amp===250?'tl-0708':undefined;
 if(d.kind==='switch'&&amp&&/4\s*(?:P|L|pol)/i.test(text))return amp<=40?'tl-0785':amp<=63?'tl-0786':amp<=125?'tl-0787':amp<=160?'tl-0788':amp<=400?'tl-0789':undefined;
}
export function templateTextEdits(t,d){
 const edits=Object.fromEntries((t.labels||[]).map(l=>['bmk:'+l.key,d.tag||'']));
 for(const l of t.details?.texts||[]){const s=l.text.trim();if(s==='BMK')edits[l.key]=(d.tag||'')+(d.phase?' '+d.phase:'');else if(s==='ORT')edits[l.key]=d.circuitName||'';else if(s==='AN'||s==='ID')edits[l.key]='';}
 return edits;
}
export async function buildAutomaticDispo(doc,p,fetcher=fetch){
 const c={...defaultConfig(),...p.dispoConfig};
 const {devices,warnings}=schemaDevices(doc);for(const d of devices)if(['ls','fils'].includes(d.kind)&&c.breakerManufacturer!=='auto'){d.manufacturer=c.breakerManufacturer;d.lsMode='allpole';}
 const selected=devices.filter(d=>d.include!==false&&(d.kind!=='terminal'||d.incoming));
 if(!selected.length)throw Error('Keine Geräte im Schema erkannt.');
 const ids=selected.map(automaticTemplateId),missing=selected.filter((d,i)=>!ids[i]);
 if(missing.length)throw Error(`Dispo unverändert: Keine eindeutige Originalvorlage für ${missing.map(d=>d.tag+' ('+d.name+')').join(', ')}. Gerätetyp im Schema ergänzen.`);
 const get=async path=>{const r=await fetcher(path+'?v=20261113-12');if(!r.ok)throw Error('Dispo unverändert: Vorlagenbibliothek konnte nicht geladen werden.');return r.json();};
 const [details,raw]=await Promise.all([get('cad/template-details.json'),Promise.all([...new Set(ids)].map(async id=>[id,await get('cad/templates/'+id+'.json')]))]);
 const templates=new Map(raw.map(([id,t])=>[id,validateTemplate({...t,details:details[id]})]));
 for(let i=0;i<selected.length;i++){const d=selected[i],t=templates.get(ids[i]);d.dispoTemplateId=t.id;if(d.kind!=='meter'&&d.kind!=='fuse'){d.width=t.width;d.height=t.height;}d.confirmed=false;}
 const g=generateDispo(p,selected,c),bySource=new Map(selected.map((d,i)=>[JSON.stringify(d.source),templates.get(ids[i])])),choices=new Map();
 // Assembly retains the original layout geometry in 3D; each source is resolved separately
 // so RSE and ordinary meters of identical dimensions never share a mistaken mapping.
 for(const e of g.elements)if(e.dispoSource)choices.set(assemblyKey(e),bySource.get(JSON.stringify(e.dispoSource)));
 const assembled=templateAssembly(g,choices),factor=1200/420/g.scale;
 for(const e of assembled.elements)if(e.dispoSource){const t=bySource.get(JSON.stringify(e.dispoSource));e.template=structuredClone(t);e.text='';e.textEdits=templateTextEdits(t,e);
  // ORT is a centred plate caption in the source drawing. Keep longer group names
  // inside the plate instead of extending the original three-letter placeholder.
  if(e.dispoKind==='meter')for(const l of e.template.details?.texts||[])if(l.text.trim()==='ORT'){
   const run=l.runs[0],value=e.textEdits[l.key]||'',unit=Math.abs(run.matrix[0]);
   run.fontSize=Math.min(run.fontSize,t.viewWidth*.88/Math.max(1,value.length*.6*unit));
   const textWidth=value.length*run.fontSize*unit*.6;
   e.textOffsets={...e.textOffsets,[l.key]:{x:(t.viewWidth-textWidth)/2-run.matrix[4],y:0}};
  }
  if(e.dispoKind==='meter'){e.x-=(250-e.width)/2*factor;e.y-=45*factor;e.width=250;e.height=400;}
 }
 return {...assembled,warnings};
}
