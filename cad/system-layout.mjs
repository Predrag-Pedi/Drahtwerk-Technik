import {smisslineBlocks,smisslineFeed} from './smissline-packing.mjs?v=20261117-3';
import {frameLayout} from './frame-layout.mjs?v=20261117-3';
import {fieldLayout} from './field-layout.mjs?v=20261117-3';
// Verified ABB overall dimensions including end pieces. Only original library
// rails agreeing within 2 mm are selected, reserving the larger ABB envelope.
// The 48/50 ME library envelopes differ by 18/36 mm and are excluded.
export const smisslineRails=[
 [18,364,'tl-0635',162],[20,401,'tl-0636'],[22,437,'tl-0637'],[24,473,'tl-0638'],[26,509,'tl-0639'],[28,545,'tl-0640'],[30,581,'tl-0642'],[32,617,'tl-0644'],[34,653,'tl-0646'],[36,689,'tl-0648'],[38,725,'tl-0649'],[42,797,'tl-0651'],[44,833,'tl-0652'],[46,869,'tl-0654'],[52,977,'tl-0657'],[56,1049,'tl-0659'],[58,1085,'tl-0660'],[60,1122,'tl-0661',162],[64,1194,'tl-0662'],[70,1302,'tl-0664',162],[76,1410,'tl-0665',162],[80,1482,'tl-0666',162],[86,1590,'tl-0667',162],[100,1843,'tl-0633',162]
].map(([me,length,id,width=132.6])=>({me,length,id,width}));
// Workshop mounting allowance: 20 mm corner + 25 mm wall bracket at each
// end of the DIN carrier, plus a 25 mm support angle below each bus section.
export const smisslineMount={edge:45,stop:25};
export const onSmissline=d=>['ls','fils','spd','switch'].includes(d.kind)&&d.breakerSystem==='smissline'&&(d.kind!=='switch'||d.current>0&&d.current<=63);
// Separate incoming terminals and conventional mains need their own physical
// mounting space, but do not reintroduce the conventional top/fuse zones.
export const zoneFreeSmissline=devices=>{const ds=devices.filter(d=>d.include!==false);return ds.some(onSmissline)&&ds.every(d=>!d.measurementOwner&&(onSmissline(d)||['switch','coil','ls','fils','spd'].includes(d.kind)||d.kind==='terminal'&&d.incoming));};
export const smisslineInputSpace=devices=>zoneFreeSmissline(devices)?devices.filter(d=>d.include!==false&&d.kind==='terminal'&&d.incoming).reduce((n,d)=>n+d.width+40,0):0;
function incomingLayout(devices,c,start){
 const parts=[],placed=[],overflow=[],aux=devices.filter(d=>!d.incoming),inputs=devices.filter(d=>d.incoming);
 const ductWidth=60,ductX=c.width-ductWidth-20,center=(20+ductX-20)/2;
 let y=20;
 for(const d of aux){
  const width=d.height,height=d.width;
  if(width>ductX-40||y+height+20>c.height||d.depth>c.depth){overflow.push(d);continue;}
  placed.push({...d,x:center-width/2,y,width,height,templateRotation:90,mountZ:-70});y+=height+40;
 }
 if(aux.length)parts.push({kind:'rail',profile:'AS35',frameStyle:'smissline-auxiliary',x:center-17.5,y:20,width:35,height:c.height-40,depth:15,mountZ:-110,drawingLabel:'DIN 35'});
 parts.push({kind:'duct',profile:'wiring-duct',x:ductX,y:20,width:ductWidth,height:c.height-40,depth:40,mountZ:-100,drawingLabel:'Kanal 60 × 40'});
 y=smisslineMount.edge;
 for(const d of inputs){
  const width=d.height,height=d.width;
  if(width>180||y+height+smisslineMount.edge>c.height||d.depth>c.depth){overflow.push(d);continue;}
  // The terminals clip onto the same vertical carrier as the bus below.
  placed.push({...d,x:start+(200-width)/2,y,width,height,templateRotation:90,mountZ:-100});
  y+=height+40;
 }
 return {parts,placed,overflow};
}
export const smisslineCapacity=(used,reserve)=>{const occupied=Math.ceil(used-1e-9),spare=Math.ceil(occupied*reserve/100-1e-9);return {occupied,spare,required:occupied+spare};};
export function systemLayout(devices,c){
 if(!devices.some(d=>d.include!==false&&onSmissline(d)))return frameLayout(devices,c);
 if(c.fields>1)return fieldLayout(devices,c,systemLayout);
 const active=devices.filter(d=>d.include!==false),smiss=active.filter(onSmissline),other=active.filter(d=>!onSmissline(d));
 const free=zoneFreeSmissline(active),top=free?smisslineMount.edge+smisslineInputSpace(active):Math.max(smisslineMount.edge,c.topHeight);
 const groups=new Map();for(const d of smiss){const key=JSON.stringify([d.circuitName||d.supplyKey||JSON.stringify(d.source),d.feedFrom,d.feedCurrent]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d);}
 const availableHeight=c.height-top-smisslineMount.edge-smisslineMount.stop-(!free&&other.some(d=>d.kind==='fuse'||d.incoming)?c.fuseHeight:0),railOptions=smisslineRails.filter(r=>r.length<=availableHeight);
 if(!railOptions.length)return {parts:[],placed:[],overflow:smiss};
 const max=railOptions.at(-1),lanes=[];
 // Feeders and half-PE pairs are included in the same capacity calculation.
 for(const ds of groups.values()){
  const feed=smisslineFeed(ds[0]),feedLength=feed.reduce((n,d)=>n+d.height,0);
  const direct=ds.find(d=>d.directSmisslineInput),ordered=direct?[direct,...ds.filter(d=>d!==direct)]:ds;
  let lane={blocks:[],feed:direct?[]:feed,used:direct?0:feedLength/18};
  for(const block of smisslineBlocks(ordered)){const units=block.length/18;if(smisslineCapacity(lane.used+units,c.reserve).required>max.me){if(lane.blocks.length)lanes.push(lane);lane={blocks:[],feed,used:feedLength/18};}lane.blocks.push(block);lane.used+=units;}
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
 // Equalise matching rows around a basket using original catalogue rails.
 // Check the complete paired stacks before extending: reserve may grow, but
 // mounting clearances and the available installation height must not shrink.
 for(let i=0;i+1<columns.length;i+=2){
  const left=columns[i],right=columns[i+1];
  if(left.lanes.length!==right.lanes.length)continue;
  const rails=left.lanes.map((lane,j)=>lane.rail.length>=right.lanes[j].rail.length?lane.rail:right.lanes[j].rail);
  const height=rails.reduce((n,r)=>n+r.length,0)+gap*(rails.length-1);
  if(height>availableHeight)continue;
  for(const column of [left,right]){let offset=0;column.lanes.forEach((lane,j)=>{lane.rail=rails[j];lane.offset=offset;offset+=rails[j].length+gap;});column.height=height;}
 }
 const ductWidth=c.smisslineDuctWidth||200,columnWidth=200;
 const smissWidth=Math.ceil((columns.length*columnWidth+Math.ceil(columns.length/2)*ductWidth)/250)*250,remaining=c.width-smissWidth;
 if(remaining<8||other.length&&remaining<258)return {parts:[],placed:[],overflow:smiss};
 const usedWidth=columns.length*columnWidth+Math.ceil(columns.length/2)*ductWidth;
 const start=other.length?remaining+(smissWidth-usedWidth)/2: (c.width-usedWidth)/2;
 const base=other.length?(free?incomingLayout:frameLayout)(other,{...c,width:remaining,fieldWidths:undefined,fields:1},start):{parts:[],placed:[],overflow:[]};
 if(base.overflow.length)return base;
 const perimeter=p=>['SP165','SP45','SP09048','EV165'].includes(p.profile);
 const fullFrame=frameLayout([],{...c,topHeight:free?20:c.topHeight,fields:1,fieldWidths:undefined});
 const parts=[...base.parts.filter(p=>!perimeter(p)),...fullFrame.parts.filter(p=>perimeter(p))],placed=[...base.placed];
 for(let i=0;i<columns.length;i+=2){const x=start+(i+1)*columnWidth+(i/2)*ductWidth,height=Math.max(columns[i].height,columns[i+1]?.height||0);parts.push({kind:'duct',profile:'wire-basket',x,y:free?20:top,width:ductWidth,height:height+(free?top-20:0),depth:60,mountZ:-100,drawingLabel:`Gitterbahn ${ductWidth}`});}
 for(let i=0;i<columns.length;i++){const x=start+i*columnWidth+Math.ceil(i/2)*ductWidth;parts.push({kind:'rail',profile:'AS35',frameStyle:'smissline-carrier',x:x+82.5,y:smisslineMount.edge,width:35,height:c.height-2*smisslineMount.edge,depth:15,mountZ:-115});}
 for(let i=0;i<columns.length;i++)for(const lane of columns[i].lanes){
  const r=lane.rail,x=start+i*columnWidth+Math.ceil(i/2)*ductWidth,y=top+lane.offset;
  parts.push({kind:'rail',profile:'smissline',dispoTemplateId:r.id,x:x+(columnWidth-r.width)/2,y,width:r.width,height:r.length,depth:30,mountZ:-100,drawingLabel:`${r.me} PE · belegt ${lane.capacity.occupied} · frei ${r.me-lane.capacity.occupied}`,smisslinePE:r.me,occupiedPE:lane.capacity.occupied,requiredReservePE:lane.capacity.spare});
  parts.push({kind:'rail',profile:'smissline-stop',x:x+82.5,y:y+r.length,width:35,height:smisslineMount.stop,depth:25,mountZ:-110,drawingLabel:'Stützwinkel 25'});
  let offset=20;
  for(const d of lane.feed){placed.push({...d,x:x+(columnWidth-d.width)/2,y:y+offset});offset+=d.height;}
  for(const block of lane.blocks){for(const piece of block.pieces){const d=piece.device,body=piece.role==='body';placed.push({...d,kind:body?d.kind:'smissline-accessory',tag:body?d.tag:piece.role,dispoTemplateId:piece.id,x:x+(columnWidth-(body?d.width:90))/2,y:y+offset+piece.offset,width:body?d.width:90,height:piece.length,templateRotation:piece.rotate?90:0,frameStyle:body?'smissline':'smissline-accessory',mountZ:-70});}offset+=block.length;}

 }
 return {parts,placed,overflow:[]};
}
