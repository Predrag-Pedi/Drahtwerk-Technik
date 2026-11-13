// Drahtwerk assembly grid. Confirmed plate envelope: 250/500 x 400 mm.
// Profile cross-sections below are simplified envelopes, not manufacturing drawings.
export const profiles={SP165:{name:'SP 165 DIN',face:40,depth:165},AS35:{name:'AS 35.2',face:35,depth:15},BS25:{name:'BS 25.0',face:25,depth:15},AS50:{name:'AS 50.0',face:50,depth:15},ZS39:{name:'ZS 39.0',face:39,depth:22}};
export function frameLayout(devices,c){
 if(c.depth<165)throw Error('SP 165 DIN benötigt mindestens 165 mm Rahmentiefe.');
 for(const d of devices.filter(d=>d.include!==false)){if(![d.width,d.height,d.depth].every(n=>Number.isFinite(n)&&n>0&&n<=4000))throw Error(`${d.tag}: Geräteabmessungen prüfen.`);if(d.kind==='fuse'&&(!['DII','DIII'].includes(d.fuseType)||!d.current||d.current>(d.fuseType==='DII'?25:63)||d.conflict))throw Error(`${d.tag}: DII/DIII und Stromstärke prüfen.`);}
 const parts=[],placed=[],overflow=[],cols=Math.floor((c.width-8)/c.plateWidth),left=(c.width-cols*c.plateWidth)/2,plateTop=260,fuseY=c.height-440;
 const add=(kind,x,y,width,height,extra={})=>parts.push({kind,x,y,width,height,...extra});
 if(cols<1||fuseY-plateTop<800)throw Error('Für den Drahtwerk-Aufbau mindestens eine Plattenspalte und 1500 mm Höhe vorsehen.');
 add('rail',0,0,4,c.height,{profile:'SP165',depth:165,mountZ:-165});add('rail',c.width-4,0,4,c.height,{profile:'SP165',frameStyle:'right',depth:165,mountZ:-165});
 for(let i=1;i<cols;i++)add('rail',left+i*c.plateWidth-12.5,35,25,c.height-70,{profile:'BS25',depth:15,mountZ:-110});
 const bar=(profile,y)=>add('rail',40,y,c.width-80,profiles[profile].face,{profile,depth:profiles[profile].depth,mountZ:profile==='ZS39'?-22:-110});
 bar('AS50',30);bar('AS35',115);bar('BS25',195);add('duct',40,185,c.width-80,60,{depth:60,mountZ:-100});
 bar('ZS39',plateTop-22);bar('ZS39',fuseY-22);bar('ZS39',c.height-40);
 const selected=devices.filter(d=>d.include!==false),meters=selected.filter(d=>d.kind==='meter'),fuses=selected.filter(d=>d.kind==='fuse'),terminals=selected.filter(d=>d.kind==='terminal'),regular=selected.filter(d=>!['meter','fuse','terminal'].includes(d.kind));
 const meterCols=Math.floor((c.width-8)/250),meterLeft=(c.width-meterCols*250)/2,meterRows=Math.ceil(meters.length/meterCols),meterTop=fuseY-meterRows*400,regularRows=Math.floor((meterTop-plateTop)/400);
 if(meterTop<plateTop+400&&regular.length)throw Error('Zu wenig Höhe für Geräteplatten und Zählerplätze. Breite oder Höhe erhöhen.');
 const put=(d,x,y,extra={})=>{if(d.depth>c.depth){overflow.push(d);return;}placed.push({...d,x,y,...extra});};
 let tx=55;for(const d of terminals){if(tx+d.width>c.width-55||d.height>90){overflow.push(d);continue;}put(d,tx,100);tx+=d.width+4;}
 const slots=[];
 for(let r=0;r<regularRows;r++){const y=plateTop+r*400;bar('ZS39',y-22);for(let col=0;col<cols;col++){const x=left+col*c.plateWidth;add('plate',x,y,c.plateWidth,400,{plateType:'slots',depth:3,mountZ:0});for(let row=0;row<3;row++)slots.push({x:x+20,y:y+60+row*125,used:0,width:(c.plateWidth-40)*(1-c.reserve/100)});}for(let row=0;row<3;row++)bar('AS35',y+60+row*125+20);}
 let slot=0;for(const d of regular){while(slots[slot]&&slots[slot].used+d.width>slots[slot].width)slot++;const s=slots[slot];if(!s||d.height>110||d.width>c.plateWidth-40){overflow.push(d);continue;}put(d,s.x+s.used,s.y-20,{mountZ:-80});s.used+=d.width+4;}
 for(let i=0;i<meters.length;i++){const d=meters[i],x=meterLeft+(i%meterCols)*250,y=meterTop+Math.floor(i/meterCols)*400;if(y<plateTop||d.width>210||d.height>350){overflow.push(d);continue;}add('plate',x,y,250,400,{plateType:'meter',depth:3,mountZ:0});put(d,x+(250-d.width)/2,y+45,{mountZ:3});}
 for(let r=0;r<meterRows;r++)bar('ZS39',meterTop+r*400-22);
 for(let col=0;col<cols;col++)add('plate',left+col*c.plateWidth,fuseY,c.plateWidth,400,{plateType:'fuse',depth:3,mountZ:0});
 let fx=left+25;for(const d of fuses){const w=d.fuseType==='DIII'?70:60;if(fx+w>left+cols*c.plateWidth-25){overflow.push(d);continue;}put({...d,width:w,height:230,depth:70},fx,fuseY+65,{mountZ:3});fx+=w+15;}
 return {parts,placed,overflow};
}
export function plateStrips(w,h,type){if(type!=='slots')return [[0,0,w,h]];const margin=20,slotHeight=46,ys=[60,185,310],strips=[];let y=0;for(const sy of ys){strips.push([0,y,w,sy-y],[0,sy,margin,slotHeight],[w-margin,sy,margin,slotHeight]);y=sy+slotHeight;}strips.push([0,y,w,h-y]);return strips;}
