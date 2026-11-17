import test from 'node:test';import assert from 'node:assert/strict';
import {frameLayout,plateStrips} from '../cad/frame-layout.mjs';import {defaultConfig} from '../cad/dispo.mjs';
const config={...defaultConfig(),width:758,height:845,plateWidth:500};
const devices=[{kind:'switch',tag:'10S0',width:72,height:110,depth:80},{kind:'terminal',incoming:true,frameStyle:'incoming-terminal',tag:'10X0',width:80,height:100,depth:60},...Array.from({length:50},(_,i)=>({kind:i%2?'ls':'fils',tag:`11F${i}`,manufacturer:'schneider',supplyKey:'main',width:i%2?18:36,height:90,depth:70,poles:1}))];
test('four-row 525 mm apparatus plates keep mixed Schneider sequence and right-side reserve',()=>{
 const l=frameLayout(devices,config);assert.equal(l.overflow.length,0);assert.ok(l.parts.some(p=>p.plateType==='slots'&&p.height===525));
 const ds=l.placed.filter(d=>['ls','fils'].includes(d.kind)).sort((a,b)=>a.y-b.y||a.x-b.x);assert.deepEqual(ds.map(d=>d.tag),devices.slice(2).map(d=>d.tag));
 assert.equal(new Set(ds.map(d=>d.y)).size,4);
 const main=l.placed.find(d=>d.kind==='switch');assert.ok(ds.every(d=>d.x>=main.x+main.width+18));
 for(const y of new Set(ds.map(d=>d.y))){const row=ds.filter(d=>d.y===y);const end=Math.max(...row.map(d=>d.x+d.width));assert.ok(end<config.width-40);}
 assert.ok(plateStrips(500,525,'slots',true).some(r=>r[1]===481));
});
