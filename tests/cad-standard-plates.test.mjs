import test from 'node:test';import assert from 'node:assert/strict';
import {siteConfig} from '../cad/site-layout.mjs';import {frameLayout,plateOpenings,plateStrips} from '../cad/frame-layout.mjs';import {defaultConfig} from '../cad/dispo.mjs';
test('automatic standard plates keep mixed Schneider outlets contiguous in schema order',()=>{
 const ds=[{kind:'switch',width:72,height:110,depth:80},{kind:'terminal',incoming:true,frameStyle:'incoming-terminal',width:80,height:100,depth:60},...Array.from({length:40},(_,i)=>({kind:i%2?'ls':'fils',tag:`F${i}`,manufacturer:'schneider',supplyKey:'main',width:i%2?18:36,height:90,depth:70,poles:1}))];
 const c=siteConfig(ds,{...defaultConfig(),autoSize:true,maxWidth:1008,maxHeight:2000});assert.equal(c.plateWidth,750);assert.equal(c.height,720);
 const l=frameLayout(ds,c);assert.equal(l.overflow.length,0);const plates=l.parts.filter(p=>p.plateType==='slots');assert.ok(plates.every(p=>p.height===400));assert.ok(plates.some(p=>p.width===750&&p.cutCenterBridge));
 const ordered=l.placed.filter(d=>['ls','fils'].includes(d.kind)).sort((a,b)=>a.y-b.y||a.x-b.x);assert.deepEqual(ordered.map(d=>d.tag),ds.slice(2).map(d=>d.tag));
 for(let i=1;i<ordered.length;i++)if(ordered[i].y===ordered[i-1].y)assert.equal(ordered[i].x,ordered[i-1].x+ordered[i-1].width);
});
test('250, 500 and 750 standard panels have three full openings consistently in plate geometry',()=>{
 for(const w of [250,500,750]){const openings=plateOpenings(w,true);assert.equal(openings.length,1);assert.ok(openings[0].width>w-50);const strips=plateStrips(w,400,'slots',true);for(const y of [60,185,310])assert.equal(strips.filter(r=>r[1]===y).reduce((n,r)=>n+r[2],0),w-openings[0].width);}
});
