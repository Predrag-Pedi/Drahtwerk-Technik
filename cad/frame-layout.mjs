// Drahtwerk assembly grid. Confirmed plate envelope: 250/500/750 x 400 mm.
// Profile cross-sections below are simplified envelopes, not manufacturing drawings.
export const profiles={SP09048:{name:'SP 090.48',face:17,depth:99},SP45:{name:'SP 45.0',face:17,depth:45.2},EV165:{name:'EV 165',face:35,depth:150},SP165:{name:'SP 165 DIN',face:40,depth:165},AS35:{name:'AS 35.2',face:35,depth:15},BS25:{name:'BS 25.0',face:25,depth:15},AS50:{name:'AS 50.0',face:50,depth:15},ZS39:{name:'ZS 39.0',face:39,depth:22}};
export function frameLayout(devices,c){
 if(c.depth<165)throw Error('SP 165 DIN benötigt mindestens 165 mm Rahmentiefe.');
 for(const d of devices.filter(d=>d.include!==false)){if(![d.width,d.height,d.depth].every(n=>Number.isFinite(n)&&n>0&&n<=4000))throw Error(`${d.tag}: Geräteabmessungen prüfen.`);if(d.kind==='fuse'&&(!['DII','DIII','NH00'].includes(d.fuseType)||!d.current||d.current>(d.fuseType==='DII'?25:d.fuseType==='DIII'?63:160)||d.conflict))throw Error(`${d.tag}: DII/DIII/NH00 und Stromstärke prüfen.`);}
 if(![250,500,750].includes(c.plateWidth))throw Error('Plattenbreite muss 250, 500 oder 750 mm sein.');
 const parts=[],placed=[],overflow=[],cols=Math.floor((c.width-8)/c.plateWidth),left=(c.width-cols*c.plateWidth)/2,plateTop=260,fuseY=c.height-440;
 const add=(kind,x,y,width,height,extra={})=>parts.push({kind,x,y,width,height,...extra});
 if(cols<1||fuseY-plateTop<800)throw Error('Für den Drahtwerk-Aufbau mindestens eine Plattenspalte und 1500 mm Höhe vorsehen.');
 add('rail',0,0,4,c.height,{profile:'SP165',depth:165,mountZ:-165});add('rail',c.width-4,0,4,c.height,{profile:'SP165',frameStyle:'right',depth:165,mountZ:-165});
 // End profiles and simplified corner fittings; EV dimensions are visual approximations.
 add('rail',4,0,c.width-8,17,{profile:'SP45',depth:45.2,mountZ:-45.2});
 add('rail',4,c.height-17,c.width-8,17,{profile:'SP09048',depth:99,mountZ:-99});
 for(const x of [4,c.width-39])for(const y of [17,c.height-52])add('rail',x,y,35,35,{profile:'EV165',depth:150,mountZ:-160});
 for(let i=1;i<cols;i++)add('rail',left+i*c.plateWidth-12.5,35,25,c.height-70,{profile:'BS25',depth:15,mountZ:-110});
 const bar=(profile,y)=>add('rail',40,y,c.width-80,profiles[profile].face,{profile,depth:profiles[profile].depth,mountZ:profile==='ZS39'?-22:-110});
 bar('AS50',30);bar('AS35',115);bar('BS25',195);add('duct',40,185,c.width-80,60,{depth:60,mountZ:-100});
 bar('ZS39',plateTop-22);bar('ZS39',fuseY-22);
 const selected=devices.filter(d=>d.include!==false),meters=selected.filter(d=>d.kind==='meter'),fuses=selected.filter(d=>d.kind==='fuse'),terminals=selected.filter(d=>d.kind==='terminal'),regular=selected.filter(d=>!['meter','fuse','terminal'].includes(d.kind));
 const meterCols=Math.floor((c.width-8)/250),meterLeft=(c.width-meterCols*250)/2,meterRows=Math.ceil(meters.length/meterCols),meterTop=fuseY-meterRows*400,regularRows=Math.floor((meterTop-plateTop)/400);
 if(meterTop<plateTop+400&&regular.length)throw Error('Zu wenig Höhe für Geräteplatten und Zählerplätze. Breite oder Höhe erhöhen.');
 const put=(d,x,y,extra={})=>{if(d.depth>c.depth){overflow.push(d);return;}placed.push({...d,x,y,...extra});};
 let tx=55;for(const d of terminals){if(tx+d.width>c.width-55||d.height>90){overflow.push(d);continue;}put(d,tx,100);tx+=d.width+4;}
 const slots=[];
 for(let r=0;r<regularRows;r++){const y=plateTop+r*400;bar('ZS39',y-22);for(let col=0;col<cols;col++){const x=left+col*c.plateWidth;add('plate',x,y,c.plateWidth,400,{plateType:'slots',depth:3,mountZ:0});for(let row=0;row<3;row++)slots.push({x:x+20,y:y+60+row*125,used:0,width:(c.plateWidth-40)*(1-c.reserve/100)});}for(let row=0;row<3;row++)bar('AS35',y+60+row*125+20);}
 let slot=0;for(const d of regular){while(slots[slot]&&slots[slot].used+d.width>slots[slot].width)slot++;const s=slots[slot];if(!s||d.height>110||d.width>c.plateWidth-40){overflow.push(d);continue;}put(d,s.x+s.used,s.y-20,{mountZ:8-d.depth,frameStyle:'recessed'});s.used+=d.width+4;}
 // Close the unused portions of each front opening with removable blanking strips.
 for(const s of slots){const free=c.plateWidth-40-s.used;if(free>0)add('plate',s.x+s.used,s.y,free,46,{plateType:'blank',depth:3,mountZ:3});}
 for(let i=0;i<meters.length;i++){const d=meters[i],x=meterLeft+(i%meterCols)*250,y=meterTop+Math.floor(i/meterCols)*400;if(y<plateTop||d.width>210||d.height>350){overflow.push(d);continue;}add('plate',x,y,250,400,{plateType:'meter',depth:3,mountZ:0});put(d,x+(250-d.width)/2,y+45,{mountZ:3});}
 for(let r=0;r<meterRows;r++)bar('ZS39',meterTop+r*400-22);
 for(let col=0;col<cols;col++)add('plate',left+col*c.plateWidth,fuseY,c.plateWidth,400,{plateType:'fuse',depth:3,mountZ:0});
 let fx=left+25;for(const d of fuses){const w=d.fuseType==='NH00'?90:d.fuseType==='DIII'?62:49;if(fx+w>left+cols*c.plateWidth-25){overflow.push(d);continue;}if(d.fuseType==='NH00'){for(let pole=0;pole<3;pole++)put({...d,width:w,height:45,depth:70},fx,fuseY+65+pole*110,{mountZ:3});}else put({...d,width:w,height:265,depth:70},fx,fuseY+65,{mountZ:3});fx+=w+15;}
 return {parts,placed,overflow};
}
export function plateStrips(w,h,type){if(type!=='slots')return [[0,0,w,h]];const margin=20,slotHeight=46,ys=[60,185,310],strips=[];let y=0;for(const sy of ys){strips.push([0,y,w,sy-y],[0,sy,margin,slotHeight],[w-margin,sy,margin,slotHeight]);y=sy+slotHeight;}strips.push([0,y,w,h-y]);return strips;}
