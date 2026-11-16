import {smisslineBlocks,smisslineFeed} from './smissline-packing.mjs?v=20261116-5';
import {frameLayout} from './frame-layout.mjs?v=20261116-5';
import {fieldLayout} from './field-layout.mjs?v=20261116-5';
// Verified ABB overall dimensions including end pieces. Only original library
// rails agreeing within 2 mm are selected, reserving the larger ABB envelope.
// The 48/50 ME library envelopes differ by 18/36 mm and are excluded.
export const smisslineRails=[
 [18,364,'tl-0635',162],[20,401,'tl-0636'],[22,437,'tl-0637'],[24,473,'tl-0638'],[26,509,'tl-0639'],[28,545,'tl-0640'],[30,581,'tl-0642'],[32,617,'tl-0644'],[34,653,'tl-0646'],[36,689,'tl-0648'],[38,725,'tl-0649'],[42,797,'tl-0651'],[44,833,'tl-0652'],[46,869,'tl-0654'],[52,977,'tl-0657'],[56,1049,'tl-0659'],[58,1085,'tl-0660'],[60,1122,'tl-0661',162],[64,1194,'tl-0662'],[70,1302,'tl-0664',162],[76,1410,'tl-0665',162],[80,1482,'tl-0666',162],[86,1590,'tl-0667',162],[100,1843,'tl-0633',162]
].map(([me,length,id,width=132.6])=>({me,length,id,width}));
export const onSmissline=d=>['ls','fils','spd','switch'].includes(d.kind)&&d.breakerSystem==='smissline'&&(d.kind!=='switch'||d.current>0&&d.current<=63);
export function systemLayout(devices,c){
 if(!devices.some(onSmissline))return frameLayout(devices,c);
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
  for(const block of smisslineBlocks(ds)){const units=block.length/18;if((lane.used+units)*(1+c.reserve/100)>max.me){if(lane.blocks.length)lanes.push(lane);lane={blocks:[],feed,used:feedLength/18};}lane.blocks.push(block);lane.used+=units;}
  if(lane.blocks.length)lanes.push(lane);
 }
 const laneWidth=250,smissWidth=lanes.length*laneWidth,remaining=c.width-smissWidth;
 if(remaining<8||other.length&&remaining<258)return {parts:[],placed:[],overflow:smiss};
 const base=other.length?frameLayout(other,{...c,width:remaining,fieldWidths:undefined,fields:1}):{parts:[],placed:[],overflow:[]};
 if(base.overflow.length)return base;
 const perimeter=p=>['SP165','SP45','SP09048','EV165'].includes(p.profile);
 const fullFrame=frameLayout([],{...c,fields:1,fieldWidths:undefined});
 const parts=[...base.parts.filter(p=>!perimeter(p)),...fullFrame.parts.filter(p=>perimeter(p)||!other.length&&['AS50','AS35'].includes(p.profile)&&p.y<c.topHeight)],placed=[...base.placed];
 for(let i=0;i<lanes.length;i++){
  const lane=lanes[i],r=railOptions.find(r=>r.me>=lane.used*(1+c.reserve/100));if(!r)return {parts:[],placed:[],overflow:lane.blocks.flatMap(b=>b.pieces.map(p=>p.device))};
  const x=(other.length?remaining:4)+i*laneWidth,y=c.topHeight;
  parts.push({kind:'rail',profile:'smissline',dispoTemplateId:r.id,x:x+15,y,width:r.width,height:r.length,depth:30,mountZ:-100,drawingLabel:`Smissline ${r.me} ME`});
  parts.push({kind:'duct',x:x+190,y,width:50,height:r.length,depth:60,mountZ:-100});
  let offset=20;
  for(const d of lane.feed){placed.push({...d,x:x+20,y:y+offset});offset+=d.height;}
  for(const block of lane.blocks){for(const piece of block.pieces){const d=piece.device,body=piece.role==='body';placed.push({...d,kind:body?d.kind:'smissline-accessory',tag:body?d.tag:piece.role,dispoTemplateId:piece.id,x:x+20,y:y+offset+piece.offset,width:body?d.width:90,height:piece.length,templateRotation:piece.rotate?90:0,frameStyle:body?'smissline':'smissline-accessory',mountZ:-70});}offset+=block.length;}

 }
 return {parts,placed,overflow:[]};
}
