const sourceKey=s=>JSON.stringify(s);
// A measurement bay belongs to its meter through stable source IDs, not BMKs.
export function measurementGroups(doc,devices,warnings){
 for(const meter of devices.filter(d=>d.kind==='meter')){
  const peers=devices.filter(d=>d.source.page===meter.source.page&&d.source.element===meter.source.element),cts=peers.filter(d=>d.kind==='transformer');
  const feeders=devices.filter(d=>d.kind==='fuse'&&(sourceKey(d.meterSource)===sourceKey(meter.source)||peers.includes(d)));
  const current=Math.max(0,...feeders.map(d=>d.current||0));
  if(!cts.length&&current<=80)continue;
  const owner=sourceKey(meter.source);meter.measurementOwner=owner;
  const voltage=feeders.filter(d=>d.current>0&&d.current<=25).sort((a,b)=>a.current-b.current)[0];
  const test=peers.find(d=>d.kind==='test-terminal');
  for(const d of [...cts,voltage,test].filter(Boolean)){d.measurementOwner=owner;d.meterSource=meter.source;}
  if(voltage)voltage.kind='voltage-fuse';
  const make=(kind,key)=>({kind,tag:'',name:kind,circuitName:meter.circuitName,source:{...meter.source,key:meter.source.key+':'+key},measurementOwner:owner,meterSource:meter.source,width:100,height:90,depth:70,include:true});
  if(!test)devices.push(make('test-terminal','test'));
  if(!voltage)devices.push(make('voltage-fuse','voltage'));
  if(!cts.length){for(let i=1;i<=3;i++)devices.push({...make('transformer','ct'+i),phase:'L'+i});warnings.push(`${meter.tag}: über 80 A – Wandlermodul ergänzt. Trennstelle, Spannungsabsicherung und Messkreis im Schema vervollständigen.`);}
 }
}
