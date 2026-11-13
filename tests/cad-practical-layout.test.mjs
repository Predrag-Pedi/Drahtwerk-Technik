import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {frameLayout} from '../cad/frame-layout.mjs';
import {schemaDevices,defaultConfig} from '../cad/dispo.mjs';
import {project,validateProject} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {validateTemplate} from '../cad/template.mjs';
import {buildAutomaticDispo,automaticTemplateId} from '../cad/dispo-auto.mjs';
import {moveDispoElements,swapDispoDrop} from '../cad/dispo-move.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const details=read('cad/template-details.json'),fetcher=async path=>({ok:true,json:()=>read(path.split('?')[0])});
const insert=(d,id,x=300)=>{const p=d.pages[1],e=placement(p,'template',{x,y:100},true,0,validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]}));p.elements.push(e);return e;};
test('same supply LS and 2P RCBO share copper with exactly three PE reserve while groups stay contiguous',()=>{
 const base={height:98,depth:70,manufacturer:'hager',poles:1,lsMode:'allpole'},ds=[];
 // Deliberately interleaved input order: layout must group by supply before family.
 for(const name of ['A','B'])for(const phase of ['L1','L2','L3'])ds.push({...base,tag:name+'FI'+phase,kind:'fils',width:36,phase,circuitName:name});
 for(const name of ['A','B']){ds.push({...base,tag:name+'4P',kind:'fils',width:72,poles:3,circuitName:name});for(const phase of ['L1','L2','L3'])ds.push({...base,tag:name+'LS'+phase,kind:'ls',width:27,phase,circuitName:name});}
 const l=frameLayout(ds,{...defaultConfig(),width:1258,height:1520});assert.equal(l.overflow.length,0);
 for(const name of ['A','B'])for(const phase of ['L1','L2','L3']){const ls=l.placed.find(e=>e.tag===name+'LS'+phase),fi=l.placed.find(e=>e.tag===name+'FI'+phase);assert.equal(fi.x-ls.x-ls.width,54);assert.equal(fi.y,ls.y);assert.ok(l.parts.some(e=>e.profile==='copper'&&e.x===ls.x&&e.width===117));}
 const a=l.placed.filter(e=>e.circuitName==='A'),b=l.placed.filter(e=>e.circuitName==='B');assert.ok(Math.max(...a.map(e=>e.x+e.width))<=Math.min(...b.map(e=>e.x)));
});
test('DIN00 with N uses 126 mm original in every row and N hardware survives persistence',async()=>{
 const d=project(),e=insert(d,'tl-0018'),key=e.template.labels.find(l=>l.letter==='F').key;
 // Turn the fuse into the same 100 A DIN00 family used by outgoing feeders.
 const label=e.template.details.texts.find(t=>/25A/.test(t.text));assert.ok(label);e.textEdits={[label.key]:'100A DIN00'};
 const device=schemaDevices(d).devices.find(e=>e.kind==='fuse');assert.equal(device.neutral,true);assert.equal(automaticTemplateId(device),'tl-0581');
 const g=await buildAutomaticDispo(d,d.pages[2],fetcher),fuses=g.elements.filter(e=>e.dispoKind==='fuse');assert.equal(fuses.length,3);assert.ok(fuses.every(e=>e.template.id==='tl-0581'&&e.width===126));
 Object.assign(d.pages[2],{elements:g.elements,scale:g.scale});const p=validateProject(d).pages[2];assert.ok(p.elements.filter(e=>e.dispoKind==='fuse').every(e=>e.neutral));assert.ok(sceneBoxes(p).some(b=>b.color==='#3186b8'&&fuses.some(e=>e.id===b.id)));
});
test('incoming blocks use original current bands and outgoing terminals remain omitted',async()=>{
 for(const [amp,id] of [[63,'tl-0552'],[100,'tl-0552'],[125,'tl-0553'],[160,'tl-0553']]){const d=project();d.ratedCurrent=amp+' A';insert(d,'tl-0000');insert(d,'tl-0007',600);const g=await buildAutomaticDispo(d,d.pages[2],fetcher),incoming=g.elements.filter(e=>e.incoming);assert.equal(incoming.length,1);assert.equal(incoming[0].template.id,id);assert.equal(g.elements.filter(e=>e.dispoKind==='terminal').length,1);}
 const d=project();d.ratedCurrent='125 A';insert(d,'tl-0007');let g=await buildAutomaticDispo(d,d.pages[2],fetcher);assert.equal(g.elements.filter(e=>e.incoming).length,1);d.ratedCurrent='200 A';await assert.rejects(buildAutomaticDispo(d,d.pages[2],fetcher),/Bemessungsstrom/);
});
test('meter feeder anchors meet at column centre and follow a plate swap after save and reopen',async()=>{
 const d=project();for(let i=0;i<3;i++)insert(d,'tl-0007',200+i*250);const q=d.pages[2];q.dispoConfig={...defaultConfig(),width:508,height:1520};const g=await buildAutomaticDispo(d,q,fetcher);Object.assign(q,{elements:g.elements,scale:g.scale});const p=validateProject(d).pages[2],f=1200/420/p.scale,meters=p.elements.filter(e=>e.dispoKind==='meter'),fuse=m=>p.elements.find(e=>e.meterSource?.element===m.dispoSource.element);
 const [upper,lower,other]=meters;assert.ok(Math.abs(fuse(upper).x-(upper.x+125*f))<1e-8);assert.ok(Math.abs(fuse(lower).x+fuse(lower).width*f-(lower.x+125*f))<1e-8);
 const before=structuredClone(p),y=fuse(lower).y,items=[{kind:'element',id:lower.id}];moveDispoElements(p,new Set([lower.id]),other.x-lower.x,0);assert.ok(swapDispoDrop(p,before,items));assert.ok(Math.abs(fuse(lower).x-(lower.x+(125-fuse(lower).width)*f))<1e-8);assert.equal(fuse(lower).y,y);assert.ok(Math.abs(fuse(other).x+fuse(other).width*f-(other.x+125*f))<1e-8);
});
test('a shared copper bank has one heading across its reserved gap',async()=>{const {dispoCaptionGroups}=await import('../cad/render.mjs');const f=1/3.5,p={scale:10,elements:[{dispoKind:'ls',circuitName:'A',x:0,y:100,width:27},{dispoKind:'fils',circuitName:'A',x:81*f,y:100,width:36}]};assert.equal(dispoCaptionGroups(p).length,1);});
test('moving a meter relocates a conflicting independent NH assembly as a whole',async()=>{const {alignMeterFuses}=await import('../cad/dispo-move.mjs');const f=1/3.5,m={id:'m',dispoKind:'meter',x:250*f,y:400*f,width:250,height:400,dispoSource:{page:'s',element:'m',key:'P'}};const feeder={id:'f',dispoKind:'fuse',x:76*f,y:900*f,width:49,height:265,meterSource:m.dispoSource},nh=Array.from({length:3},(_,i)=>({id:'n'+i,dispoKind:'fuse',x:326*f,y:(900+i*110)*f,width:126,height:45,dispoSource:{page:'s',element:'n',key:'F'}})),p={scale:10,elements:[{id:'c',kind:'cabinet',x:0,y:0,width:1008,height:1520},m,feeder,...nh]};alignMeterFuses(p);assert.ok(Math.abs(feeder.x-326*f)<1e-8);assert.equal(new Set(nh.map(e=>e.x)).size,1);assert.ok(nh[0].x+126*f<=feeder.x);});
