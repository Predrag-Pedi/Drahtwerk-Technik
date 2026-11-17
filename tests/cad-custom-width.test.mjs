import test from 'node:test';import assert from 'node:assert/strict';
import {siteConfig} from '../cad/site-layout.mjs';import {frameLayout,plateStrips} from '../cad/frame-layout.mjs';import {defaultConfig,validateDispoConfig} from '../cad/dispo.mjs';
const devices=n=>[{kind:'switch',width:72,height:110,depth:80},{kind:'terminal',incoming:true,frameStyle:'incoming-terminal',width:80,height:100,depth:60},...Array.from({length:n},(_,i)=>({kind:i%2?'ls':'fils',tag:`F${i}`,manufacturer:'schneider',supplyKey:'main',width:i%2?18:36,height:90,depth:70,poles:1}))];
const config={...defaultConfig(),autoSize:true,maxWidth:700,maxHeight:720,passageWidth:2000,passageHeight:2000};
test('standard solution retains priority even when a wider custom frame is available',()=>{const c=siteConfig(devices(10),config);assert.equal((c.width-8)%250,0);assert.ok(c.width<700);});
test('after standard widths fail, custom plates use the complete maximum width with reserve',()=>{
 const ds=devices(40),c=siteConfig(ds,config);assert.equal(c.width,700);assert.equal(c.height,720);validateDispoConfig(c);
 const l=frameLayout(ds,c);assert.equal(l.overflow.length,0);assert.equal(l.placed.length,ds.length);
 const plates=l.parts.filter(p=>p.plateType==='slots');assert.ok(plates.some(p=>![250,500,750].includes(p.width)));assert.equal(Math.min(...plates.map(p=>p.x)),4);assert.equal(Math.max(...plates.map(p=>p.x+p.width)),696);
 for(const p of plates)for(const r of plateStrips(p.width,p.height,p.plateType,p.cutCenterBridge))assert.ok(r[2]>=0&&r[0]+r[2]<=p.width+.001);
 for(const p of l.placed)assert.ok(p.x>=4&&p.x+p.width<=696);
 assert.equal(frameLayout(ds,JSON.parse(JSON.stringify(c))).overflow.length,0);
});
test('individual planning never exceeds transport constraints or silently lowers reserve',()=>{
 assert.throws(()=>siteConfig(devices(40),{...config,passageWidth:600}),{code:"DISPO_CAPACITY"});
 const constrained=siteConfig(devices(20),{...config,passageWidth:600});assert.ok(constrained.fieldWidths.every(w=>w<=600));assert.ok(constrained.width<=700);assert.equal(constrained.reserve,20);
 assert.throws(()=>siteConfig(devices(100),config),{code:'DISPO_CAPACITY'});
});
