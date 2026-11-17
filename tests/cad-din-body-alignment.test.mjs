import test from 'node:test';import assert from 'node:assert/strict';
import {frameLayout,dinBodyCenter} from '../cad/frame-layout.mjs';import {defaultConfig} from '../cad/dispo.mjs';
const incoming=[{kind:'switch',tag:'S',width:110,height:110,depth:80},{kind:'terminal',incoming:true,frameStyle:'incoming-terminal',width:80,height:100,depth:60},{kind:'spd',width:72,height:134.8,depth:80,dispoTemplateId:'tl-0735'}];
test('body rather than label or neutral extension is centred on the physical DIN rail',()=>{
 const ds=[...incoming,...[{dispoTemplateId:'tl-0531',height:98,width:27},{dispoTemplateId:'tl-0624',height:119.4,width:72},{dispoTemplateId:'tl-0626',height:90,width:36}].map((d,i)=>({...d,kind:'fils',tag:'F'+i,depth:80,manufacturer:'schneider',supplyKey:'main',poles:1}))];
 const l=frameLayout(ds,{...defaultConfig(),width:758,height:720,plateWidth:750,bridgeMode:'remove'});assert.equal(l.overflow.length,0);
 for(const d of l.placed.filter(d=>['switch','spd','fils'].includes(d.kind))){assert.ok(l.parts.some(r=>r.profile==='AS35'&&Math.abs(r.y+r.height/2-d.y-dinBodyCenter(d))<.001));}
 assert.equal(dinBodyCenter({dispoTemplateId:'tl-0531',height:98}),45);
 assert.ok(dinBodyCenter({dispoTemplateId:'tl-0735',height:134.8})>89);
});
test('Hager outlets share a 750 mm panel after a leading 250 mm service panel',()=>{
 const ds=[...incoming,...Array.from({length:16},(_,i)=>({kind:'ls',width:27,height:98,depth:80,dispoTemplateId:'tl-0531',manufacturer:'hager',supplyKey:'main',poles:1,phase:'L'+(i%3+1)})),...Array.from({length:18},(_,i)=>({kind:'fils',width:36,height:90,depth:80,dispoTemplateId:'tl-0626',manufacturer:'hager',supplyKey:'main',poles:1,phase:'L'+(i%3+1)}))];
 const l=frameLayout(ds,{...defaultConfig(),width:1008,height:720,plateWidth:750,bridgeMode:'remove'});assert.equal(l.overflow.length,0);assert.deepEqual(l.parts.filter(p=>p.plateType==='slots').map(p=>p.width),[250,750]);
 assert.ok(l.parts.some(p=>p.profile==='BS25'&&p.x===241.5));
 for(const phase of ['L1','L2','L3']){const row=l.placed.filter(d=>d.kind==='fils'&&d.phase===phase).sort((a,b)=>a.x-b.x);assert.equal(row.length,6);for(let i=1;i<row.length;i++)assert.equal(row[i].x,row[i-1].x+36);assert.ok(1004-(row.at(-1).x+36)>=108);}
});
