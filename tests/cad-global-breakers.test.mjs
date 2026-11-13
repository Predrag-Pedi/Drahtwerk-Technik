import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project,addStandardPages,validateProject,ports,page} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {validateTemplate} from '../cad/template.mjs';
import {schemaDevices,defaultConfig} from '../cad/dispo.mjs';
import {frameLayout} from '../cad/frame-layout.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';
import {elementMarkup,svgPage} from '../cad/render.mjs';
import {frame,sourcePoint,alignMacro} from '../cad/alignment.mjs';
import {trimContinuationTails} from '../cad/line-edit.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const details=read('cad/template-details.json');
const insert=(p,id,x=300)=>{const e=placement(p,'template',{x,y:100},true,0,validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]}));p.elements.push(e);return e;};
test('global choice overrides individual devices and Hager follows real L1 L2 L3 rows',async()=>{
 const d=project(),p=d.pages[1],q=d.pages[2];
 for(const [i,id] of ['tl-0025','tl-0026','tl-0027'].entries()){const e=insert(p,id,200+i*250);const key=e.template.labels.find(l=>l.letter==='F').key;e.functions={[key]:{role:'none',manufacturer:'schneider'}};}
 const devices=schemaDevices(d).devices.filter(e=>e.kind==='ls');assert.deepEqual(devices.map(e=>e.phase),['L1','L2','L3']);
 const list=devices.map(e=>({...e,manufacturer:'hager',lsMode:'allpole',width:18}));const l=frameLayout(list,defaultConfig());assert.equal(l.overflow.length,0);assert.deepEqual(l.placed.map(e=>e.y-l.placed[0].y),[0,125,250]);
 const s=frameLayout(list.map(e=>({...e,manufacturer:'schneider',width:36})),defaultConfig());assert.equal(new Set(s.placed.map(e=>e.y)).size,1);assert.deepEqual(s.placed.map(e=>e.x-s.placed[0].x),[0,36,72]);
 q.dispoConfig={...defaultConfig(),breakerManufacturer:'hager'};assert.equal(validateProject(d).pages[2].dispoConfig.breakerManufacturer,'hager');
 const generated=await buildAutomaticDispo(d,q,async path=>({ok:true,json:()=>read(path.split('?')[0])}));assert.ok(generated.elements.filter(e=>e.dispoSource).every(e=>e.manufacturer==='hager'&&e.template.id==='tl-0531'));
 p.elements[0].autoPhases={'0':'L3'};assert.equal(schemaDevices(d).devices.find(e=>e.source.element===p.elements[0].id&&e.kind==='ls').phase,'L3');
});
test('supplemental FI-LS has exact selectable inputs and persistent wire references',()=>{
 const d=project(),p=d.pages[1],m=insert(p,'tl-0007'),e=insert(p,'tl-0008',310),f=frame(e),i=f.inputs[0],line=frame(m).lines.find(l=>l.phase===i.phase&&l.x1===l.x2),target=sourcePoint(m,line.x1,i.y),local=sourcePoint({...e,x:0,y:0},i.x,i.y);e.x=target.x-local.x+4;e.y=target.y-local.y+3;assert.equal(alignMacro(e,p),true);
 const inputs=ports(e,p);assert.equal(inputs.length,f.inputs.length);assert.ok(Math.abs(inputs[0].x-target.x)<.001);assert.ok(Math.abs(inputs[0].y-target.y)<.001);
 p.wires.push({id:'branch-test',points:[{x:100,y:100},inputs[0]],from:null,to:{element:e.id,index:0},label:'',dashed:false});assert.equal(validateProject(d).pages[1].wires[0].to.index,0);
});
test('descriptions roundtrip and render beneath original macro',()=>{const d=project(),p=d.pages[1],e=insert(p,'tl-0007'),key=e.template.labels.find(l=>l.letter==='P').key;e.functions={[key]:{role:'none',description:'Allgemein – Licht'}};assert.equal(validateProject(d).pages[1].elements[0].functions[key].description,'Allgemein – Licht');assert.match(elementMarkup(e,p,d,false),/Allgemein – Licht/);});
test('standard pages are reusable, preserve project metadata and original vector artwork',()=>{const d=addStandardPages(project('Neubau'));d.ratedCurrent='125 A';assert.deepEqual(d.pages.map(p=>p.number),[1,2,6,7,8,9,10]);assert.equal(addStandardPages(d).pages.length,7);const copy=validateProject(d);assert.equal(copy.ratedCurrent,'125 A');assert.equal(copy.pages.filter(p=>p.standardType).length,5);const svg=svgPage(copy,copy.pages[2]);assert.match(svg,/125 A/);assert.match(svg,/xlink:href="#/);assert.doesNotMatch(svg,/Frauenfelderstrasse|Elektrozentrum|D\.Neziri/);});
test('continuation tails clip only phase-matched free conductors',()=>{const d=project(),p=d.pages[1],e=insert(p,'tl-0011');d.links=(e.template.details.ends||[]).map(a=>({a:{page:p.id,element:e.id,kind:'template',key:a.key},b:{page:'other'}}));const before=JSON.stringify(e.template.paths);const n=trimContinuationTails(d,p,e);assert.ok(n>0);assert.notEqual(JSON.stringify(e.template.paths),before);assert.equal(trimContinuationTails(d,p,e),0);});
test('meter-fed FI-LS share a dedicated 250 mm plate with isolated supplies',()=>{const devices=[...Array.from({length:3},(_,i)=>({kind:'fils',tag:'F'+i,width:36,height:90,depth:70,meterFed:true,supplyKey:'meter'+i,manufacturer:'hager'})),...['L1','L2','L3'].map((phase,i)=>({kind:'ls',tag:'LS'+i,width:18,height:90,depth:70,phase,manufacturer:'hager'}))];const l=frameLayout(devices,defaultConfig());assert.equal(l.overflow.length,0);const fi=l.placed.filter(e=>e.kind==='fils'),ls=l.placed.filter(e=>e.kind==='ls');assert.deepEqual(fi.map(e=>e.x-fi[0].x),[0,36,72]);assert.ok(ls.every(e=>e.x>=fi[0].x+250));assert.ok(l.parts.some(e=>e.plateType==='slots'&&e.width===250));});

test('real phase-specific RCBO templates stack with copper for Hager and use one comb row for Schneider',async()=>{
 const d=project(),p=d.pages[1],q=d.pages[2];
 for(const [i,id] of ['tl-0032','tl-0033','tl-0034','tl-0025','tl-0026','tl-0027'].entries()){
  const e=insert(p,id,150+i*160),key=e.template.labels.find(l=>l.letter==='F').key;e.functions={[key]:{circuitName:'Supply A',manufacturer:'hager',lsMode:'individual'}};
 }
 const fetcher=async path=>({ok:true,json:()=>read(path.split('?')[0])});
 for(const manufacturer of ['hager','schneider']){
  q.dispoConfig={...defaultConfig(),breakerManufacturer:manufacturer};const g=await buildAutomaticDispo(d,q,fetcher),fi=g.elements.filter(e=>e.dispoKind==='fils'),ls=g.elements.filter(e=>e.dispoKind==='ls'),structure=g.elements.find(e=>e.kind==='cabinet').dispoStructure;
  assert.deepEqual(fi.map(e=>e.phase),['L1','L2','L3']);assert.ok(fi.every(e=>e.width===36&&e.manufacturer===manufacturer));
  assert.ok(ls.every(e=>e.template.id===(manufacturer==='hager'?'tl-0531':'tl-0529')&&e.width===(manufacturer==='hager'?27:36)));
  if(manufacturer==='hager'){assert.equal(new Set(fi.map(e=>e.x)).size,1);assert.equal(new Set(fi.map(e=>e.y)).size,3);assert.ok(structure.some(e=>e.profile==='copper'));}
  else{assert.equal(new Set(fi.map(e=>e.y)).size,1);assert.ok(Math.abs(fi[1].x-fi[0].x-36*1200/420/g.scale)<.001);assert.ok(structure.some(e=>e.profile==='comb'));assert.ok(!structure.some(e=>e.profile==='copper'));}
 }
});
test('reserve is retained across openings without preventing two 5 PE Schneider RCBOs sharing a row',()=>{
 const ds=Array.from({length:4},(_,i)=>({kind:'fils',tag:'F'+i,width:90,height:119.4,depth:70,poles:3,manufacturer:'schneider',circuitName:'Supply A'}));
 const l=frameLayout(ds,{...defaultConfig(),width:258,height:720,topHeight:300,reserve:20});assert.equal(l.overflow.length,0);assert.equal(l.placed[0].y,l.placed[1].y);assert.equal(l.placed[1].x-l.placed[0].x,90);assert.equal(new Set(l.placed.map(e=>e.y)).size,2);
 const full=frameLayout(Array.from({length:6},(_,i)=>({...ds[0],tag:'F'+i})),{...defaultConfig(),width:258,height:720,topHeight:300,reserve:20});assert.equal(full.overflow.length,1);
});
test('four pole devices cannot scatter a subsequent Hager phase bank across columns',()=>{
 const base={kind:'fils',height:90,depth:70,manufacturer:'hager',circuitName:'Supply A'},ds=[...Array.from({length:4},(_,i)=>({...base,tag:'M'+i,poles:3,width:72})),...['L1','L2','L3'].map((phase,i)=>({...base,tag:'S'+i,poles:1,width:36,phase}))],l=frameLayout(ds,{...defaultConfig(),width:758,height:1120});assert.equal(l.overflow.length,0);const single=l.placed.filter(e=>e.tag[0]==='S');assert.equal(new Set(single.map(e=>e.x)).size,1);assert.deepEqual(single.map(e=>e.y-single[0].y),[0,125,250]);
});
