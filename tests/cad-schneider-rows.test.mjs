import test from 'node:test';import assert from 'node:assert/strict';
import {frameLayout} from '../cad/frame-layout.mjs';import {defaultConfig,generateDispo} from '../cad/dispo.mjs';import {project,validateProject} from '../cad/model.mjs';import {dispoCaptionGroups} from '../cad/render.mjs';
const base={kind:'fils',height:90,depth:70,manufacturer:'schneider',lsMode:'allpole',circuitName:'E-Mobility'};
test('Schneider small devices stay above four-pole devices when separation costs no extra row',()=>{const ds=[...Array.from({length:4},(_,i)=>({...base,tag:'S'+i,width:36,poles:1})),...Array.from({length:2},(_,i)=>({...base,tag:'L'+i,width:90,poles:3}))],l=frameLayout(ds,{...defaultConfig(),width:258,height:720,reserve:0});assert.equal(l.overflow.length,0);const small=l.placed.filter(d=>d.poles===1),large=l.placed.filter(d=>d.poles===3);assert.ok(Math.min(...large.map(d=>d.y))>Math.max(...small.map(d=>d.y)));});
test('Schneider may mix on one comb when only one opening is available',()=>{const ds=[{...base,width:36,poles:1},{...base,width:90,poles:3},{...base,width:90,poles:3}],l=frameLayout(ds,{...defaultConfig(),width:258,height:520,reserve:0});assert.equal(l.overflow.length,0);assert.equal(new Set(l.placed.map(d=>d.y)).size,1);assert.ok(l.parts.some(p=>p.profile==='comb'&&p.width===216));});
test('independent meter outlets retain their own heading, spacing and separate combs after save',()=>{const d=project(),p=d.pages[2],ds=[...Array.from({length:3},(_,i)=>({...base,width:36,poles:1,tag:'M'+i,meterFed:true,supplyKey:'meter'+i,source:{page:'s',element:'f'+i,key:'$'}})),{...base,width:90,poles:3,tag:'Other',source:{page:'s',element:'other',key:'$'}}];const g=generateDispo(p,ds,{...defaultConfig(),width:758,height:1120});Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});const restored=validateProject(d).pages[2],fed=restored.elements.filter(e=>e.meterFed);assert.equal(fed.length,3);const f=1200/420/p.scale;assert.equal(fed[1].x,fed[0].x);assert.ok(Math.abs(fed[1].y-fed[0].y-125*f)<.001);const captions=dispoCaptionGroups(restored);assert.ok(captions.some(g=>g.name==='Zählerabgänge'));assert.ok(captions.some(g=>g.name==='E-Mobility'));assert.equal(g.elements.filter(e=>e.profile==='comb'&&e.width===36).length,0);});
test('multiple Hager outlets from the same meter follow phase rows',()=>{const ds=['L1','L2','L3'].map((phase,i)=>({...base,manufacturer:'hager',width:36,poles:1,phase,meterFed:true,supplyKey:'one-meter',tag:'F'+i})),l=frameLayout(ds,{...defaultConfig(),width:508,height:1120});assert.equal(l.overflow.length,0);assert.deepEqual(l.placed.map(e=>e.y-l.placed[0].y),[0,125,250]);assert.ok(l.parts.some(p=>p.profile==='copper'));});
test('automatic bridge and mixed Schneider row leave the bottom rail free',()=>{
 const ds=[...Array.from({length:13},(_,i)=>({...base,tag:'S'+i,width:36,poles:1})),...Array.from({length:3},(_,i)=>({...base,tag:'L'+i,width:90,poles:3}))];
 const c={...defaultConfig(),width:508,height:720,reserve:20},l=frameLayout(ds,c);
 assert.equal(l.overflow.length,0);assert.equal(new Set(l.placed.map(d=>d.y)).size,2);
 assert.ok(l.parts.some(p=>p.plateType==='slots'&&p.cutCenterBridge));
 const lastSmall=l.placed.find(d=>d.tag==='S12');assert.ok(l.placed.filter(d=>d.poles===3).every(d=>d.y===lastSmall.y));
 assert.ok(l.placed.every(d=>d.y<600));
 const doc=project(),p=doc.pages[2],g=generateDispo(p,ds,c);Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});
 const saved=validateProject(doc).pages[2];assert.equal(saved.dispoConfig.bridgeMode,'auto');assert.equal(saved.dispoConfig.cutCenterBridge,true);
});
test('automatic bridge keeps the centre when removal offers no layout benefit',()=>{
 const l=frameLayout([{...base,width:36,poles:1}],{...defaultConfig(),width:508,height:720,reserve:0});
 assert.equal(l.overflow.length,0);assert.ok(l.parts.filter(p=>p.plateType==='slots').every(p=>!p.cutCenterBridge));
});
