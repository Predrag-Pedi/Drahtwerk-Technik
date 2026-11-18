// Visual planning geometry for the configured entry assemblies. The dimensions
// of rims, seals and perforations are illustrative, not fabrication dimensions.
export function cableEntryBoxes({width:w,depth:d,position,selection,material,color}){
 if(selection==='Kein')return [];
 const roof=position==='roof',full=selection==='Spezial Lochblechdach komplett';
 material=roof?(full?'Lochblech':selection.replace('Standard mit ','')):material;
 const parts=[],rim=Math.min(full?8:24,w/8,d/8),thickness=3;
 const add=(x,z,width,depth,fill,role='panel',height=thickness,offset=0,shape)=>{
  if(width>0&&depth>0)parts.push({x,y:offset,z,w:width,h:height,d:depth,color:fill,shape,entry:{position,material,role}});
 };
 if(roof&&selection==='Geschlossen'){add(0,0,w,d,color);return parts;}
 // Outer sheet surrounds the actual insert; nothing covers it from underneath.
 add(0,0,w,rim,color,'rim');add(0,d-rim,w,rim,color,'rim');
 add(0,rim,rim,d-2*rim,color,'rim');add(w-rim,rim,rim,d-2*rim,color,'rim');
 const count=roof?1:parseInt(selection,10)||1,gap=3,iw=w-2*rim,slot=(d-2*rim-(count-1)*gap)/count;
 for(let i=0;i<count;i++){
  const x=rim,z=rim+i*(slot+gap),h=slot;
  if(material==='Lochblech'){add(x,z,iw,h,'#b9bfc2','perforated',3,0,'entryPerforated');continue;}
  if(material==='Bürsten'){
   const rail=Math.min(8,h/5),seam=Math.min(3,h/12),n=Math.min(72,Math.max(8,Math.floor(iw/10))),pitch=iw/n;
   add(x,z,iw,rail,'#9ca5aa','brush-holder',5);add(x,z+h-rail,iw,rail,'#9ca5aa','brush-holder',5);
   for(let j=0;j<n;j++){const xx=x+j*pitch;add(xx,z+rail,pitch*.82,(h-2*rail-seam)/2,'#30373b','brush',4,0,'entryBristle');add(xx,z+(h+seam)/2,pitch*.82,(h-2*rail-seam)/2,'#3b4246','brush',4,0,'entryBristle');}
   continue;
  }
  if(material==='Moosgummischieber'){
   const rail=Math.min(8,h/5),seam=Math.min(2,h/12);
   add(x,z,iw,rail,'#b9bfc2','seal-holder',5);add(x,z+h-rail,iw,rail,'#b9bfc2','seal-holder',5);
   add(x,z+rail,iw,(h-2*rail-seam)/2,'#363a3c','foam',8);add(x,z+(h+seam)/2,iw,(h-2*rail-seam)/2,'#45494b','foam',8);continue;
  }
  if(material==='Dampfsperrrahmen'){
   const seal=Math.min(10,h/5),height=14;
   add(x,z,iw,seal,'#535b60','seal-frame',height);add(x,z+h-seal,iw,seal,'#535b60','seal-frame',height);
   add(x,z+seal,seal,h-2*seal,'#535b60','seal-frame',height);add(x+iw-seal,z+seal,seal,h-2*seal,'#535b60','seal-frame',height);
   add(x+seal,z+seal,iw-2*seal,h-2*seal,'#9aabae','membrane',2,6);continue;
  }
  add(x,z,iw,h,material==='PVC'?'#e2e2d9':material==='Aluminium'?'#aab5bc':color,'infill');
 }
 return parts;
}
