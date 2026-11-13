import test from 'node:test';
import assert from 'node:assert/strict';
import {frameLayout,plateStrips} from '../cad/frame-layout.mjs';
import {defaultConfig,generateDispo,validateDispoConfig} from '../cad/dispo.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
import {project,validateProject} from '../cad/model.mjs';
const device=(kind,extra={})=>({kind,tag:kind,width:kind==='meter'?180:36,height:kind==='meter'?260:90,depth:70,...extra});
test('dispo omits outgoing terminals but retains explicitly assigned incoming terminal',()=>{
 const l=frameLayout([device('ls'),device('terminal',{tag:'X2'}),device('terminal',{tag:'X0',incoming:true})],defaultConfig());
 assert.deepEqual(l.placed.map(d=>d.tag).sort(),['X0','ls']);
});
test('compact device-only frame has no invented meter or fuse zone',()=>{
 const l=frameLayout([device('ls')],{...defaultConfig(),width:758,height:1000});
 assert.equal(l.overflow.length,0);assert.ok(!l.parts.some(e=>e.plateType==='meter'||e.plateType==='fuse'));
 assert.ok(l.parts.some(e=>e.width===250&&e.plateType==='slots'));
});
test('prepared meters have hardware instead of blue screen and retain state through backup',()=>{
 const d=project(),p=d.pages[2],g=generateDispo(p,[device('meter')],defaultConfig());Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});
 const q=validateProject(d).pages[2],m=q.elements.find(e=>e.dispoKind==='meter');assert.equal(m.meterState,'prepared');
 const boxes=sceneBoxes(q).filter(b=>b.id===m.id);assert.ok(boxes.length>5);assert.ok(!boxes.some(b=>b.color==='#214d64'));
 assert.ok(!plateStrips(250,400,'meter').some(([x,y,w,h])=>125>x&&125<x+w&&365>y&&365<y+h));
});
test('unequal fields preserve circuit groups and do not cross field boundaries',()=>{
 const c={...defaultConfig(),width:2266,fields:2,fieldWidths:[1008,1258]},l=frameLayout([device('meter',{circuitName:'Allgemein'}),device('ls',{circuitName:'Allgemein'}),device('meter',{circuitName:'E-Mobility'})],validateDispoConfig(c));
 assert.equal(l.overflow.length,0);assert.ok(l.placed.filter(d=>d.circuitName==='Allgemein').every(d=>d.x+d.width<1008));assert.ok(l.placed.filter(d=>d.circuitName==='E-Mobility').every(d=>d.x>=1008));
 assert.throws(()=>validateDispoConfig({...c,fieldWidths:[1008,1008]}),/Feldbreiten/);
});
test('devices can occupy panels alongside meter places without overlap',()=>{
 const l=frameLayout([device('meter'),device('ls')],{...defaultConfig(),width:758,height:800});assert.equal(l.overflow.length,0);
 const m=l.placed.find(d=>d.kind==='meter'),s=l.placed.find(d=>d.kind==='ls');assert.ok(s.x>=m.x+m.width);assert.ok(l.parts.some(p=>p.plateType==='slots'&&p.y===l.parts.find(p=>p.plateType==='meter').y));
});
test('rear PVC panel remains distinct and big main switch fits below meter',()=>{
 const l=frameLayout([device('meter'),device('switch',{width:90,height:140})],{...defaultConfig(),rearPanel:true,fuseHeight:200});assert.equal(l.overflow.length,0);assert.ok(l.parts.some(p=>p.plateType==='rear'&&p.mountZ===-165));assert.ok(l.placed.find(d=>d.kind==='switch').y>l.placed.find(d=>d.kind==='meter').y);
});
test('unmapped structural parts remain in 3D and persist without inventing 2D templates',async()=>{
 const {templateAssembly,assemblyKey}=await import('../cad/dispo-templates.mjs');const {readFileSync}=await import('node:fs');const t=JSON.parse(readFileSync(new URL('../cad/templates/tl-0580.json',import.meta.url)));
 const d=project(),p=d.pages[2],g=generateDispo(p,[device('meter')],defaultConfig()),m=g.elements.find(e=>e.dispoKind==='meter');m.dispoSource={page:'schema',element:'meter',key:'$'};
 const assembled=templateAssembly(g,new Map([[assemblyKey(m),t]]));Object.assign(p,{elements:assembled.elements,scale:g.scale,dispoConfig:g.config});
 const q=validateProject(d).pages[2];assert.equal(q.elements.length,2);assert.ok(q.elements.find(e=>e.kind==='cabinet').dispoStructure.length>10);assert.ok(sceneBoxes(q).some(b=>b.plate));assert.ok(sceneBoxes(q).some(b=>b.color==='#bfc6cd'));
});
