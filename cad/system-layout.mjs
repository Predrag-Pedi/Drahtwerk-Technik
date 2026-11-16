import {smisslineBlocks,smisslineFeed} from './smissline-packing.mjs?v=20261116-6';
import {frameLayout} from './frame-layout.mjs?v=20261116-6';
import {fieldLayout} from './field-layout.mjs?v=20261116-6';
// Verified ABB overall dimensions including end pieces. Only original library
// rails agreeing within 2 mm are selected, reserving the larger ABB envelope.
// The 48/50 ME library envelopes differ by 18/36 mm and are excluded.
export const smisslineRails=[
 [18,364,'tl-0635',162],[20,401,'tl-0636'],[22,437,'tl-0637'],[24,473,'tl-0638'],[26,509,'tl-0639'],[28,545,'tl-0640'],[30,581,'tl-0642'],[32,617,'tl-0644'],[34,653,'tl-0646'],[36,689,'tl-0648'],[38,725,'tl-0649'],[42,797,'tl-0651'],[44,833,'tl-0652'],[46,869,'tl-0654'],[52,977,'tl-0657'],[56,1049,'tl-0659'],[58,1085,'tl-0660'],[60,1122,'tl-0661',162],[64,1194,'tl-0662'],[70,1302,'tl-0664',162],[76,1410,'tl-0665',162],[80,1482,'tl-0666',162],[86,1590,'tl-0667',162],[100,1843,'tl-0633',162]
].map(([me,length,id,width=132.6])=>({me,length,id,width}));
export const onSmissline=d=>['ls','fils','spd','switch'].includes(d.kind)&&d.breakerSystem==='smissline'&&(d.kind!=='switch'||d.current>0&&d.current<=63);
export const smisslineCapacity=(used,reserve)=>{const occupied=Math.ceil(used-1e-9),spare=Math.ceil(occupied*reserve/100-1e-9);return {occupied,spare,required:occupied+spare};};
export function systemLayout(devices,c){
 if(!devices.some(d=>d.include!==false&&onSmissline(d)))return frameLayout(devices,c);
 if(c.fields>1)return fieldLayout(devices,c,systemLayout);
 const active=devices.filter(d=>d.include!==false),smiss=active.filter(onSmissline),other=active.filter(d=>!onSmissline(d));
 const groups=new Map();for(const d of smiss){const key=JSON.stringify([d.circuitName||d.supplyKey||JSON.stringify(d.source),d.feedFrom,d.feedCurrent]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
 const availableHeight=c.height-c.topHeight-20-(other.some(d=>d.kind==='fuse'||d.incoming)?c.fuseHeight:0),railOptions=smisslineRails.filter(r=>r.length<=availableHeight);
 if(!railOptions.length)return {parts:[],placed:[],overflow:smiss};
 const max=railOptions.at(-1),lanes=[];
 // Feeders and half-PE pairs are included in the same capacity calculation.
 for(const ds of groups.values()){
  const feed=smisslineFeed(ds[0]),feedLength=feed.reduce((n,d)=>n+d.height,0);
  let lane={blocks:[],feed,used:feedLength/18};
  for(const block of smisslineBlocks(ds)){const units=block.length/18;if(smisslineCapacity(lane.used+units,c.reserve).required>max.me){if(lane.blocks.length)lanes.push(lane);lane={blocks:[],feed,used:feedLength/18};}lane.blocks.push(block);lane.used+=units;}
  if(lane.blocks.length)lanes.push(lane);
 }
 // Size each independent rail from occupied whole PE plus the requested
 // reserve. Pack short rails vertically; never reserve an entire column per group.
 for(const lane of lanes){lane.capacity=smisslineCapacity(lane.used,c.reserve);lane.rail=railOptions.find(r=>r.me>=lane.capacity.required);if(!lane.rail)return {parts:[],placed:[],overflow:smiss};}
 const columns=[],gap=50;
 for(const lane of [...lanes].sort((a,b)=>b.rail.length-a.rail.length)){
  let column=columns.find(col=>col.height+gap+lane.rail.length<=availableHeight);
  if(!column){column={height:0,lanes:[]};columns.push(column);}
  lane.offset=column.height+(column.lanes.length?gap:0);column.lanes.push(lane);column.height=lane.offset+lane.rail.length;
 }
 const ductWidth=c.smisslineDuctWidth||200,columnWidth=200;
 const smissWidth=Math.ceil((columns.length*columnWidth+Math.ceil(columns.length/2)*ductWidth)/250)*250,remaining=c.width-smissWidth;
 if(remaining<8||other.length&&remaining<258)return {parts:[],placed:[],overflow:smiss};
 const base=other.length?frameLayout(other,{...c,width:remaining,fieldWidths:undefined,fields:1}):{parts:[],placed:[],overflow:[]};
 if(base.overflow.length)return base;
 const perimeter=p=>['SP165','SP45','SP09048','EV165'].includes(p.profile);
 const fullFrame=frameLayout([],{...c,fields:1,fieldWidths:undefined});
 const parts=[...base.parts.filter(p=>!perimeter(p)),...fullFrame.parts.filter(p=>perimeter(p)||!other.length&&['AS50','AS35'].includes(p.profile)&&p.y<c.topHeight)],placed=[...base.placed];
 const start=other.length?remaining:4;
 for(let i=0;i<columns.length;i+=2){const x=start+(i+1)*columnWidth+(i/2)*ductWidth,height=Math.max(columns[i].height,columns[i+1]?.height||0);parts.push({kind:'duct',profile:'wire-basket',x,y:c.topHeight,width:ductWidth,height,depth:60,mountZ:-100,drawingLabel:`Gitterbahn ${ductWidth}`});}
 for(let i=0;i<columns.length;i++)for(const lane of columns[i].lanes){
  const r=lane.rail,x=start+i*columnWidth+Math.ceil(i/2)*ductWidth,y=c.topHeight+lane.offset;
  parts.push({kind:'rail',profile:'smissline',dispoTemplateId:r.id,x:x+15,y,width:r.width,height:r.length,depth:30,mountZ:-100,drawingLabel:`${r.me} PE · belegt ${lane.capacity.occupied} · frei ${r.me-lane.capacity.occupied}`,smisslinePE:r.me,occupiedPE:lane.capacity.occupied,requiredReservePE:lane.capacity.spare});
  let offset=20;
  for(const d of lane.feed){placed.push({...d,x:x+20,y:y+offset});offset+=d.height;}
  for(const block of lane.blocks){for(const piece of block.pieces){const d=piece.device,body=piece.role==='body';placed.push({...d,kind:body?d.kind:'smissline-accessory',tag:body?d.tag:piece.role,dispoTemplateId:piece.id,x:x+20,y:y+offset+piece.offset,width:body?d.width:90,height:piece.length,templateRotation:piece.rotate?90:0,frameStyle:body?'smissline':'smissline-accessory',mountZ:-70});}offset+=block.length;}

 }
 return {parts,placed,overflow:[]};
}
