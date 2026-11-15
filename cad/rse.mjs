export const isRse=e=>/\bRSE\b|Rundsteuer/i.test((e.template?.name||e.schemaTemplateName||'').replaceAll('_',' '));
export function rseLegend(e){if(!isRse(e))return [];const texts=e.template?.details?.texts||[],start=texts.findIndex(t=>t.text.trim()==='Legende');if(start<0)return [];return texts.slice(start+1,start+12);}
export function rsePhase(e){const i=e.template?.ports?.findIndex(p=>/^L[123]$/.test(p.phase));return i>=0?(e.autoPhases?.[i]||e.template.ports[i].phase):'L3';}
export function setRsePhase(e,phase){if(!['L1','L2','L3'].includes(phase))throw Error('RSE-Phase prüfen.');const i=e.template?.ports?.findIndex(p=>/^L[123]$/.test(p.phase));if(i<0)throw Error('RSE ohne Phasenanschluss.');e.autoPhases={...e.autoPhases,[i]:phase};}
export function groupRseFuses(devices){
 const meters=devices.filter(d=>d.kind==='meter'&&d.measurementOwner);
 for(const d of devices.filter(d=>d.kind==='rse-fuse')){
  if(!meters.length)continue;
  const matches=meters.filter(m=>m.source.page===d.source.page),named=meters.filter(m=>m.circuitName&&m.circuitName===d.circuitName);
  const candidates=matches.length===1?matches:named.length===1?named:meters;
  if(candidates.length!==1)throw Error(`${d.tag}: mehrere Wandlermessungen – RSE und zugehörige Wandlermessung auf derselben Schemaseite oder mit eindeutiger Gruppenbeschriftung anordnen.`);
  d.measurementOwner=candidates[0].measurementOwner;d.meterSource=candidates[0].source;
 }
}
