export const fuseSystems={conventional:'Konventionell',silas60:'Silas · 60 mm',vertigroup185:'Vertigroup · 185 mm'};
export const fuseLimits={DII:25,DIII:63,NH000:100,NH00:160,NH1:250,NH2:400,NH3:630};
export const fuseNames={DII:'DII',DIII:'DIII',NH000:'DIN000',NH00:'DIN00',NH1:'DIN1',NH2:'DIN2',NH3:'DIN3'};
export function fuseTemplate(d){
 const system=d.fuseSystem||'conventional';
 if(system==='silas60')return {DII:'tl-0600',DIII:'tl-0601',NH000:'tl-0673',NH00:'tl-0669',NH1:'tl-0670',NH2:'tl-0671',NH3:'tl-0672'}[d.fuseType];
 if(system==='vertigroup185')return d.fuseType==='NH00'?'tl-0680':['NH1','NH2','NH3'].includes(d.fuseType)?'tl-0681':undefined;
 return {DII:'tl-0582',DIII:'tl-0584',NH00:d.neutral?'tl-0581':'tl-0580'}[d.fuseType];
}
export const copperFuse=d=>d.kind==='fuse'&&['silas60','vertigroup185'].includes(d.fuseSystem);
export const neutralTemplate=d=>d.current<=160?'tl-0691':'tl-0688';
export function fuseZoneHeight(devices,current=400){
 let height=current;
 for(const d of devices.filter(copperFuse))height=Math.max(height,d.fuseSystem==='silas60'?500:900,Math.ceil((d.height+(d.neutralHeight||0)+60)/100)*100);
 return height;
}
// Build distinct mounting banks. Widths come from loaded original templates.
// Supports occupy real space, so no apparatus is placed over a support.
export function copperBanks(fuses,spacing){
 const result=[];
 for(const system of ['conventional','silas60','vertigroup185']){
  const ds=fuses.filter(d=>(d.fuseSystem||'conventional')===system);if(!ds.length)continue;
  const supported=system==='vertigroup185';if(supported&&!(spacing>55))throw Error('Vertigroup: maximalen Trägerabstand über 55 mm unter Einbaumasse / Reserve angeben.');
  const bank={system,devices:[],supports:[],width:0};let lastSupport=0;
  if(supported){bank.supports.push(0);bank.width=55;}
  for(const d of ds){const width=copperFuse(d)?Math.max(d.width,d.neutralWidth||0):d.fuseType==='NH00'?(d.neutral?126:90):d.fuseType==='DIII'?62:49;
   if(supported&&width+55>spacing)throw Error(`${d.tag}: Trägerabstand ist für diese Gerätebreite zu klein.`);
   if(supported&&bank.width+width-lastSupport>spacing){bank.supports.push(bank.width);lastSupport=bank.width;bank.width+=55;}
   bank.devices.push({d,x:bank.width,width});bank.width+=width;
  }
  if(supported){bank.supports.push(bank.width);bank.width+=55;}
  result.push(bank);
 }return result;
}
export function placeCopperBanks(fuses,{left,right,y,height,spacing,obstacles,put,add,overflow}){
 const banks=copperBanks(fuses,spacing);let cursor=left;
 for(const bank of banks){
  for(const obstacle of [...obstacles].sort((a,b)=>a.x-b.x)){if(cursor+bank.width<=obstacle.x)break;if(cursor<obstacle.x+obstacle.width)cursor=obstacle.x+obstacle.width;}
  if(cursor+bank.width>right){overflow.push(...bank.devices.map(e=>e.d));continue;}
  const conventional=bank.system==='conventional',pitch=conventional?110:bank.system==='silas60'?60:185;
  const maxH=conventional?265:Math.max(...bank.devices.map(e=>e.d.height)),neutralH=conventional?0:Math.max(...bank.devices.map(e=>e.d.neutralHeight||0));
  const top=conventional?y+65:Math.max(y+30+neutralH+30,y+height-30-maxH),center=top+maxH/2;
  if(top+maxH>y+height-10){overflow.push(...bank.devices.map(e=>e.d));continue;}
  for(let i=0;i<3;i++)add('rail',cursor,conventional?y+80+i*110:center+(i-1)*pitch-7.5,bank.width,15,{profile:'copper',frameStyle:'fuse-system:'+bank.system,depth:5,mountZ:-70,drawingLabel:['L1','L2','L3'][i]});
  if(!conventional)add('rail',cursor,y+30+neutralH/2-7.5,bank.width,15,{profile:'copper',frameStyle:'fuse-system:'+bank.system,depth:5,mountZ:-70,drawingLabel:'N'});
  for(const item of bank.devices){const {d,width}=item,x=cursor+item.x;
   if(conventional){if(d.fuseType==='NH00')for(let pole=0;pole<3;pole++)put({...d,neutral:!!d.neutral&&pole===2,width:d.neutral&&pole===2?126:90,height:45,depth:70},x,y+65+pole*110,{mountZ:3});else put({...d,width,height:265,depth:70},x,y+65,{mountZ:3});continue;}
   put(d,x+(width-d.width)/2,center-d.height/2,{mountZ:3,frameStyle:'fuse-system:'+bank.system});
   put({...d,kind:'neutral-disconnector',tag:d.tag.replace('F','N'),width:d.neutralWidth,height:d.neutralHeight,dispoTemplateId:d.neutralTemplateId},x+(width-d.neutralWidth)/2,y+30+(neutralH-d.neutralHeight)/2,{mountZ:3,frameStyle:'fuse-system:'+bank.system});
  }
  for(const sx of bank.supports)put({kind:'bus-support',width:55,height:456,depth:70,tag:'',fuseSystem:bank.system,dispoTemplateId:'tl-0870',source:{page:'',element:'bus-support',key:'$'}},cursor+sx,center-228,{mountZ:-70,frameStyle:'fuse-system:'+bank.system});
  cursor+=bank.width+20;
 }
}
