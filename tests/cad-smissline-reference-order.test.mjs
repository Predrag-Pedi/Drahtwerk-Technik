import test from 'node:test';import assert from 'node:assert/strict';
import {systemLayout} from '../cad/system-layout.mjs';import {defaultConfig} from '../cad/dispo.mjs';
import {dispoDrawingRails} from '../cad/render.mjs';
import {frameBoxes,frameMarkup} from '../cad/frame-render.mjs';
const devices=()=>[
 {kind:'terminal',incoming:true,tag:'10X0',width:70,height:100,depth:60},
 {kind:'switch',current:125,tag:'10S0',width:90,height:110,depth:80},
 {kind:'coil',tag:'20K1',width:36,height:85,depth:65},
 ...Array.from({length:11},(_,i)=>({kind:'fils',tag:'11F'+i,breakerSystem:'smissline',width:90,height:36,depth:80,feedCurrent:125,feedFrom:'10S0',supplyKey:'main',dispoTemplateId:'tl-0534',poles:1}))
];
const config={...defaultConfig(),buildSystem:'smissline',width:758,height:1000,topHeight:500,fuseHeight:1600};
test('reference order is vertical DIN, cable duct, shortened Smissline, basket',()=>{
 const l=systemLayout(devices(),config);assert.equal(l.overflow.length,0);
 const din=l.parts.find(p=>p.profile==='AS35'&&p.height>p.width),duct=l.parts.find(p=>p.profile==='wiring-duct'),rail=l.parts.find(p=>p.profile==='smissline'),basket=l.parts.find(p=>p.profile==='wire-basket');
 assert.ok(din.x+din.width<duct.x);assert.ok(duct.x+duct.width<rail.x);assert.ok(rail.x+rail.width<basket.x);
 for(const tag of ['10S0','20K1']){const d=l.placed.find(d=>d.tag===tag);assert.equal(d.templateRotation,90);assert.ok(d.x<=din.x&&d.x+d.width>=din.x+din.width);assert.ok(d.x+d.width<duct.x);}
 const input=l.placed.find(d=>d.incoming);assert.ok(input.x>duct.x+duct.width);assert.ok(input.y+input.height+40<=rail.y);assert.ok(input.x+input.width<basket.x);
 assert.equal(rail.y,155);assert.equal(basket.y,20);assert.ok(rail.y+rail.height<=config.height-20);assert.ok(rail.smisslinePE>=rail.occupiedPE+Math.ceil(rail.occupiedPE*.2));
 assert.ok(!l.parts.some(p=>p.profile==='AS50'||p.profile==='copper'));const drawing=dispoDrawingRails({dispoStructure:l.parts});assert.ok(drawing.some(r=>r.frameStyle==='smissline-auxiliary'&&r.height>r.width));assert.ok(!drawing.some(r=>r.frameStyle==='smissline-input'));assert.equal(input.templateRotation,90);assert.equal(input.width,100);assert.equal(input.height,70);const carrier=l.parts.find(p=>p.frameStyle==='smissline-carrier');assert.equal(input.x+input.width/2,carrier.x+carrier.width/2);assert.equal(input.y,45);
});
test('pure Smissline keeps the direct compact arrangement without auxiliary duct',()=>{
 const ds=devices().filter(d=>d.breakerSystem==='smissline'),l=systemLayout(ds,{...config,width:508});assert.equal(l.overflow.length,0);assert.ok(!l.parts.some(p=>p.profile==='wiring-duct'));assert.equal(l.parts.find(p=>p.profile==='smissline').y,45);
});
test('vertical 60 x 40 cable duct has side walls along its length in 2D and 3D',()=>{
 const d=systemLayout(devices(),config).parts.find(p=>p.profile==='wiring-duct'),boxes=[];frameBoxes(d,0,0,(e,x,y,z,w,h,depth)=>boxes.push({x,y,z,w,h,depth}));
 assert.match(frameMarkup(d,d.width,d.height),/Kanal 60/);assert.ok(boxes.some(b=>b.w===60&&b.h===d.height&&b.depth===3));assert.ok(boxes.some(b=>b.x===57&&b.w===3&&b.h===d.height));assert.ok(boxes.filter(b=>b.w===3&&b.h===7&&b.depth===37).length>10);
});

test('DIN carriers lose 90 mm and each bus section has a 25 mm supporting angle',()=>{
 const ds=devices().filter(d=>d.breakerSystem==='smissline').slice(0,2).map((d,i)=>({...d,supplyKey:'separate'+i}));
 const l=systemLayout(ds,{...config,width:508});assert.equal(l.overflow.length,0);
 const carriers=l.parts.filter(p=>p.frameStyle==='smissline-carrier'),rails=l.parts.filter(p=>p.profile==='smissline'),stops=l.parts.filter(p=>p.profile==='smissline-stop');
 assert.equal(carriers.length,1);assert.equal(carriers[0].y,45);assert.equal(carriers[0].height,config.height-90);assert.equal(rails.length,2);assert.equal(stops.length,rails.length);
 for(const r of rails){const stop=stops.find(p=>p.y===r.y+r.height);assert.ok(stop);assert.equal(stop.height,25);assert.ok(stop.y+stop.height<=config.height-45);assert.ok(!rails.some(q=>q!==r&&q.y<stop.y+stop.height&&q.y+q.height>stop.y));}
 const drawing=dispoDrawingRails({dispoStructure:l.parts});assert.ok(drawing.some(p=>p.frameStyle==='smissline-carrier'));assert.equal(drawing.filter(p=>p.profile==='smissline-stop').length,2);
 const boxes=[];frameBoxes(stops[0],0,0,(e,x,y,z,w,h,d)=>boxes.push({w,h,d}));assert.deepEqual(boxes,[{w:35,h:25,d:3},{w:35,h:3,d:25}]);
});
test('mounting space cannot be consumed as reserve at a fixed height limit',()=>{
 const ds=devices().filter(d=>d.breakerSystem==='smissline').slice(0,6);
 const short=systemLayout(ds,{...config,width:508,height:515}),fit=systemLayout(ds,{...config,width:508,height:516});
 assert.ok(short.overflow.length);assert.equal(fit.overflow.length,0);const r=fit.parts.find(p=>p.profile==='smissline');assert.equal(r.smisslinePE,20);assert.equal(r.occupiedPE,16);assert.equal(r.requiredReservePE,4);assert.equal(r.y+r.height+25+45,516);
});
