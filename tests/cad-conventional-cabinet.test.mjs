import test from 'node:test';
import assert from 'node:assert/strict';
import {cabinetProjectFixture,fetcher} from './fixtures/smissline-project.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';
import {schemaDevices,validateDispoConfig} from '../cad/dispo.mjs';
import {validateProject} from '../cad/model.mjs';
import {svgPage,dispoDrawingRails} from '../cad/render.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
import {dinBodyCenter} from '../cad/frame-layout.mjs';
import {frameBoxes,frameMarkup} from '../cad/frame-render.mjs';

const configure=(p,extra={})=>Object.assign(p.dispoConfig,{distributionType:'standing',buildSystem:'standard',systemScope:'all',maxHeight:2300,passageHeight:2300,cabinetTopHeight:800,...extra});
for(const brand of ['hager','schneider'])test(`conventional ${brand} cabinet has a separate connection room and real apparatus panels`,async()=>{
 const {d,p}=cabinetProjectFixture();configure(p,{breakerManufacturer:brand});const before=JSON.stringify(d),g=await buildAutomaticDispo(d,p,fetcher),cab=g.elements.find(e=>e.kind==='cabinet'),parts=cab.dispoStructure,f=1200/420/g.scale;
 assert.equal(g.config.width,800);assert.equal(g.config.height,2100);assert.equal(g.config.reserve,20);assert.equal(g.scale,p.scale);assert.equal(JSON.stringify(d),before);
 const ducts=parts.filter(e=>e.profile==='wiring-duct'),terminals=parts.filter(e=>e.frameStyle==='cabinet-terminal'),plates=parts.filter(e=>e.plateType==='slots');
 assert.equal(ducts.length,4);assert.equal(terminals.length,2);assert.equal(plates.length,9);assert.ok(plates.every(e=>e.width===250&&e.height<=400));assert.equal(new Set(plates.map(e=>e.x)).size,3);
 assert.ok(ducts.every(e=>e.x>=20&&e.x+e.width<=780&&e.y+e.height<=880));
 const sourceKeys=new Set(g.elements.filter(e=>e.dispoSource).map(e=>JSON.stringify(e.dispoSource)));
 for(const e of schemaDevices(d).devices)assert.ok(sourceKeys.has(JSON.stringify(e.source)),e.tag);
 const input=g.elements.find(e=>e.dispoKind==='terminal'),main=g.elements.find(e=>e.dispoKind==='switch'),spd=g.elements.find(e=>e.dispoKind==='spd'),devices=g.elements.filter(e=>['ls','fils'].includes(e.dispoKind));
 assert.ok(input.y<main.y);assert.ok(main.y<Math.min(...devices.map(e=>e.y)));assert.ok(spd.y<Math.min(...devices.map(e=>e.y)));
 // An apparatus row remains usable underneath the main switch and SPD.
 assert.ok(devices.some(e=>e.x<spd.x));
 for(const e of devices){const x=(e.x-cab.x)/f,y=(e.y-cab.y)/f+dinBodyCenter({...e,kind:e.dispoKind});assert.ok(plates.some(s=>x>=s.x+17-.01&&x+e.width<=s.x+233+.01&&y>s.y&&y<s.y+s.height));}
 assert.ok(parts.some(e=>e.profile==='AS35'&&e.y>=1080));assert.ok(!dispoDrawingRails(cab).some(e=>e.profile==='AS35'&&e.y>=1080));
 const copy=structuredClone(d),q=copy.pages.find(q=>q.id===p.id);Object.assign(q,{elements:g.elements,scale:g.scale,dispoConfig:g.config});const restored=validateProject(copy),r=restored.pages.find(q=>q.id===p.id),svg=svgPage(restored,r);
 assert.match(svg,/class="cabinet-shell" data-enclosure="standing"/);assert.match(svg,/class="cabinet-panels"/);assert.ok(sceneBoxes(r).some(e=>e.plate));assert.equal(r.dispoConfig.cabinetTopHeight,800);
 const again=await buildAutomaticDispo(restored,r,fetcher);assert.equal(again.config.width,800);assert.equal(again.elements.filter(e=>['ls','fils'].includes(e.dispoKind)).length,34);
});

test('connection room can be changed without changing SBR settings, scale or maximum plate height',async()=>{
 const {d,p}=cabinetProjectFixture();configure(p,{cabinetTopHeight:900,breakerManufacturer:'schneider'});const g=await buildAutomaticDispo(d,p,fetcher);assert.equal(g.config.topHeight,300);assert.equal(g.config.cabinetTopHeight,900);assert.equal(g.scale,p.scale);assert.ok(g.elements.flatMap(e=>e.dispoStructure||[]).filter(e=>e.plateType==='slots').every(e=>e.height<=400));
 for(const value of [399,1001,NaN])assert.throws(()=>validateDispoConfig({...p.dispoConfig,cabinetTopHeight:value}),/Anschlussraum/);
 configure(p,{cabinetTopHeight:800,maxWidth:750});const narrow=await buildAutomaticDispo(d,p,fetcher);assert.ok(narrow.config.width<=750);
});

test('Smissline without plinth retains a cabinet enclosure and SBR retains its own frame',async()=>{
 const {d,p}=cabinetProjectFixture();configure(p,{buildSystem:'smissline',plinthHeight:0});const g=await buildAutomaticDispo(d,p,fetcher),q={...p,elements:g.elements,scale:g.scale};assert.equal(g.config.height,2000);assert.match(svgPage(d,q),/data-enclosure="standing"/);assert.ok(g.elements.some(e=>e.profile==='smissline'));
 configure(p,{distributionType:'sbr',buildSystem:'standard',plinthHeight:0,breakerManufacturer:'schneider'});const sbr=await buildAutomaticDispo(d,p,fetcher);assert.equal(sbr.config.height,720);assert.doesNotMatch(svgPage(d,{...p,elements:sbr.elements,scale:sbr.scale}),/class="cabinet-shell"/);
});

test('horizontal cabinet ducts have horizontal labels and side walls in 3D',()=>{
 const duct={kind:'duct',profile:'wiring-duct',width:750,height:60,depth:60};assert.match(frameMarkup(duct,750,60),/rotate\(0\)/);const boxes=[];frameBoxes(duct,0,0,(_e,x,y,z,w,h,d)=>boxes.push({x,y,z,w,h,d}));assert.ok(boxes.some(b=>b.w===750&&b.h===3&&b.d===60));assert.ok(!boxes.some(b=>b.w===3&&b.h===60&&b.d===60));
});
