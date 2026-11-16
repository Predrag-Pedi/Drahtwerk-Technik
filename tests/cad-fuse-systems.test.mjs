import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {project,createElement,validateProject} from '../cad/model.mjs';import {fuseRating} from '../cad/circuit-data.mjs';import {fuseTemplate,copperBanks} from '../cad/fuse-systems.mjs';import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';import {defaultConfig} from '../cad/dispo.mjs';
const fetcher=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+url.split('?')[0],import.meta.url)))});
function fixture(system,values,extra={}){const d=project(),s=d.pages[1],p=d.pages[2];s.number=10;p.dispoConfig={...defaultConfig(),width:2008,height:2500,...extra};for(const [i,value]of values.entries()){const e=createElement(s,'fuse',100+i*100,200);e.tag='10F'+(i+1);e.value=value;e.functions={$:{role:'none',fuseSystem:system}};s.elements.push(e);}return {d,p};}
test('current ranges and explicit sizes honor the mounting system',()=>{
 for(const [amps,type]of [[25,'DII'],[63,'DIII'],[100,'NH000'],[160,'NH00'],[250,'NH1'],[400,'NH2'],[630,'NH3']])assert.equal(fuseRating(amps+'A',null,'silas60').fuseType,type);
 assert.equal(fuseRating('100A',null,'vertigroup185').fuseType,'NH00');assert.equal(fuseRating('DIN000 100A',null,'vertigroup185').fuseType,'NH00');
 assert.equal(fuseRating('DIN00 200A',null,'silas60').conflict,true);assert.equal(fuseRating('631A',null,'silas60').conflict,true);
 assert.equal(fuseTemplate({kind:'fuse',fuseType:'NH3',fuseSystem:'silas60'}),'tl-0672');assert.equal(fuseTemplate({fuseType:'NH3',fuseSystem:'vertigroup185'}),'tl-0681');
});
test('Silas original templates, N disconnectors and four copper rails survive saving',async()=>{
 const {d,p}=fixture('silas60',['DII 25A','DIII 63A','DIN000 100A','DIN00 160A','DIN1 250A','DIN2 400A','DIN3 630A']);const g=await buildAutomaticDispo(d,p,fetcher);
 assert.deepEqual(g.elements.filter(e=>e.dispoKind==='fuse').map(e=>e.template.id),['tl-0600','tl-0601','tl-0673','tl-0669','tl-0670','tl-0671','tl-0672']);
 const n=g.elements.filter(e=>e.dispoKind==='neutral-disconnector');assert.equal(n.length,7);assert.deepEqual(n.map(e=>e.template.id),Array(4).fill('tl-0691').concat(Array(3).fill('tl-0688')));
 const rails=g.elements.flatMap(e=>e.dispoStructure||[]).filter(e=>e.frameStyle==='fuse-system:silas60');assert.equal(rails.length,4);const phases=rails.filter(e=>e.drawingLabel!=='N');assert.ok(Math.abs(phases[1].y-phases[0].y-60)<1e-6);
 assert.ok(g.config.fuseHeight>=500);Object.assign(p,{elements:g.elements,dispoConfig:g.config,scale:g.scale});const restored=validateProject(d);assert.equal(restored.pages[1].elements[0].functions.$.fuseSystem,'silas60');assert.equal(restored.pages[2].elements.filter(e=>e.dispoKind==='neutral-disconnector').length,7);
});
test('Vertigroup uses original 800 mm modules and inserts end and intermediate supports',async()=>{
 const {d,p}=fixture('vertigroup185',['100A','250A','400A','630A'],{supportSpacing185:250});const g=await buildAutomaticDispo(d,p,fetcher),f=g.elements.filter(e=>e.dispoKind==='fuse'),supports=g.elements.filter(e=>e.dispoKind==='bus-support');
 assert.deepEqual(f.map(e=>e.template.id),['tl-0680','tl-0681','tl-0681','tl-0681']);assert.ok(f.every(e=>e.height===800));assert.ok(supports.length>2);assert.ok(supports.every(e=>e.template.id==='tl-0870'));
 const rails=g.elements.flatMap(e=>e.dispoStructure||[]).filter(e=>e.frameStyle==='fuse-system:vertigroup185'&&e.drawingLabel!=='N');assert.ok(Math.abs(rails[1].y-rails[0].y-185)<1e-6);
});
test('invalid support spacing fails before altering the drawing',async()=>{const {d,p}=fixture('vertigroup185',['100A'],{supportSpacing185:40});const before=structuredClone(p);await assert.rejects(buildAutomaticDispo(d,p,fetcher),/Trägerabstand/);assert.deepEqual(p,before);});
test('mixed conventional and Silas banks keep separate rail pitches and the N follows its fuse',async()=>{
 const {d,p}=fixture('silas60',['DIN00 160A','DIII 63A']);d.pages[1].elements[1].functions.$.fuseSystem='conventional';const g=await buildAutomaticDispo(d,p,fetcher);Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});
 assert.equal(g.config.fuseHeight,500);const f=g.elements.find(e=>e.dispoKind==='fuse'&&e.fuseSystem==='silas60'),n=g.elements.find(e=>e.dispoKind==='neutral-disconnector');
 const {moveDispoElements}=await import('../cad/dispo-move.mjs');const dx=n.x-f.x,dy=n.y-f.y;moveDispoElements(p,new Set([f.id]),3,0);assert.ok(Math.abs(n.x-f.x-dx)<1e-6);assert.equal(n.y-f.y,dy);
 const rails=p.elements.flatMap(e=>e.dispoStructure||[]).filter(r=>r.frameStyle?.startsWith('fuse-system:'));const a=rails.find(r=>r.frameStyle==='fuse-system:conventional'),b=rails.find(r=>r.frameStyle==='fuse-system:silas60');assert.ok(a.x+a.width<=b.x);
});

test('Vertigroup uses the 1000 mm default for old and new projects and limits spans',async()=>{
 const bank=copperBanks(Array.from({length:12},()=>({kind:'fuse',fuseSystem:'vertigroup185',fuseType:'NH1',width:100,neutralWidth:100})),1000)[0];
 assert.ok(bank.supports.length>=3);for(let i=1;i<bank.supports.length;i++)assert.ok(bank.supports[i]-bank.supports[i-1]<=1000);
 for(const supportSpacing185 of [undefined,0,1000,1500]){
 const {d,p}=fixture('vertigroup185',Array(12).fill('250A'),{supportSpacing185});const g=await buildAutomaticDispo(d,p,fetcher);
 assert.equal(g.config.supportSpacing185,1000);const xs=g.elements.filter(e=>e.dispoKind==='bus-support').map(e=>e.x).sort((a,b)=>a-b);
 assert.ok(xs.length>=3);for(let i=1;i<xs.length;i++)assert.ok(xs[i]-xs[i-1]<=1000);
 }
});
test('conventional larger sizes reuse the confirmed originals with real dimensions and N companions',async()=>{
 const {d,p}=fixture('conventional',['DIN000 100A','DIN1 250A','DIN2 400A','DIN3 630A','DIII 63A']);const g=await buildAutomaticDispo(d,p,fetcher);
 const f=g.elements.filter(e=>e.dispoKind==='fuse');assert.deepEqual(f.map(e=>e.template.id).sort(),['tl-0673','tl-0670','tl-0671','tl-0672','tl-0584'].sort());
 for(const e of f)assert.equal(e.fuseSystem,'conventional');const nh=f.filter(e=>e.fuseType!=='DIII');assert.deepEqual(nh.map(e=>e.width),[53,190,210,260]);
 assert.equal(g.elements.filter(e=>e.dispoKind==='neutral-disconnector').length,4);
 Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});const n=p.elements.find(e=>e.dispoKind==='neutral-disconnector'),a=nh[0],dy=n.y-a.y,dx=n.x-a.x;
 const {moveDispoElements}=await import('../cad/dispo-move.mjs');moveDispoElements(p,new Set([a.id]),3,0);assert.equal(n.y-a.y,dy);assert.ok(Math.abs(n.x-a.x-dx)<1e-6);
});
test('global 60/185 mm selection controls fuse originals while standard preserves per-device choices',async()=>{
 for(const [buildSystem,expected]of [['standard','tl-0580'],['silas60','tl-0669'],['vertigroup185','tl-0680']]){const {d,p}=fixture('conventional',['DIN00 160A'],{buildSystem});const g=await buildAutomaticDispo(d,p,fetcher);assert.equal(g.elements.find(e=>e.dispoKind==='fuse').template.id,expected);}
});
