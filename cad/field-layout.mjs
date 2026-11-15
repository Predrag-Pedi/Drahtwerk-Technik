import {compareMeters} from './meter-layout.mjs?v=20261115-05';
const key=d=>JSON.stringify(d.source);
// Contiguous meter sequences replace the former round-robin circuit allocation.
// Each CT bay and each meter feeder travels with its source meter.
export function fieldLayout(devices,c,layout){
 const widths=c.fieldWidths||Array(c.fields).fill(c.width/c.fields),selected=devices.filter(d=>d.include!==false),groups=widths.map(()=>[]),assigned=new Set();
 const fuseZone=selected.some(d=>d.kind==='fuse'||d.incoming||d.kind==='switch'&&d.height>110);
 const config=i=>({...c,width:widths[i],fields:1,_fuseZone:fuseZone});
 const fits=(i,ds)=>{try{return !layout(ds,config(i)).overflow.length;}catch{return false;}};
 const add=(i,ds)=>{groups[i].push(...ds);ds.forEach(d=>assigned.add(d));};
 const incoming=selected.filter(d=>d.incoming||d.kind==='spd');
 if(incoming.length){if(!fits(0,incoming))return {parts:[],placed:[],overflow:incoming};add(0,incoming);}
 const meters=selected.filter(d=>d.kind==='meter').sort(compareMeters);let field=0;
 for(const meter of meters){const bundle=selected.filter(d=>d===meter||meter.measurementOwner&&d.measurementOwner===meter.measurementOwner||d.meterSource&&JSON.stringify(d.meterSource)===key(meter)).filter(d=>!assigned.has(d));
  while(field<widths.length&&!fits(field,[...groups[field],...bundle]))field++;
  if(field===widths.length)return {parts:[],placed:[],overflow:bundle};add(field,bundle);
 }
 const remaining=new Map();for(const d of selected.filter(d=>!assigned.has(d))){const name=d.circuitName||d.supplyKey||key(d);if(!remaining.has(name))remaining.set(name,[]);remaining.get(name).push(d);}
 for(const [name,ds] of remaining){const order=widths.map((_,i)=>i).sort((a,b)=>Number(groups[b].some(d=>d.circuitName===name))-Number(groups[a].some(d=>d.circuitName===name)));
  let i=order.find(i=>fits(i,[...groups[i],...ds]));if(i!==undefined){add(i,ds);continue;}
  // If the whole supply cannot fit, keep compatible phase banks together.
  const banks=new Map();for(const d of ds){const k=[d.manufacturer,d.lsMode,(d.poles||1)>=3?'multi':'small'].join('|');if(!banks.has(k))banks.set(k,[]);banks.get(k).push(d);}
  for(const bank of banks.values()){i=order.find(i=>fits(i,[...groups[i],...bank]));if(i===undefined)return {parts:[],placed:[],overflow:bank};add(i,bank);}
 }
 const parts=[],placed=[],overflow=[];let offset=0;
 for(let i=0;i<widths.length;i++){const l=layout(groups[i],config(i));parts.push(...l.parts.map(p=>({...p,x:p.x+offset})));placed.push(...l.placed.map(d=>({...d,x:d.x+offset})));overflow.push(...l.overflow);offset+=widths[i];}
 return {parts,placed,overflow};
}
