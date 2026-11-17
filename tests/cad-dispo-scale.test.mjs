import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFitFixture,fetcher} from './fixtures/smissline-project.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';
import {editAutomaticDispo} from '../cad/dispo-ui.mjs';
import {validateProject,size,W} from '../cad/model.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';

for(const scale of [5,7.5,10,20])test(`Smissline → Standard → Smissline retains 1:${scale}, including saved projects`,async()=>{
 let {d,p}=projectFitFixture();p.scale=scale;
 const configurations=[];
 for(const buildSystem of ['smissline','standard','smissline']){
  p.dispoConfig.buildSystem=buildSystem;
  const before=JSON.stringify(p);
  const g=await editAutomaticDispo(d,p,g=>{
   assert.equal(JSON.stringify(p),before,'generation must not mutate the page before applying');
   Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});
  },()=>assert.fail('Changing the drawing scale must not require reducing reserve'),(doc,page)=>buildAutomaticDispo(doc,page,fetcher));
  assert.equal(g.scale,scale);assert.equal(p.scale,scale);
  assert.equal(g.config.buildSystem,buildSystem);
  configurations.push([g.config.width,g.config.height]);
  const cabinet=p.elements.find(e=>e.kind==='cabinet'),[width,height]=size(cabinet,p);
  assert.equal(width,cabinet.width*W/420/scale);
  assert.equal(height,cabinet.height*W/420/scale);
  const boxes=sceneBoxes(p).filter(b=>b.id===cabinet.id);
  const physicalWidth=Math.max(...boxes.map(b=>b.x+b.w))-Math.min(...boxes.map(b=>b.x));
  const physicalHeight=Math.max(...boxes.map(b=>b.y+b.h))-Math.min(...boxes.map(b=>b.y));
  assert.ok(Math.abs(physicalWidth-cabinet.width)<1e-6);
  assert.ok(Math.abs(physicalHeight-cabinet.height)<1e-6);
  d=validateProject(JSON.parse(JSON.stringify(d)));p=d.pages.find(q=>q.id===p.id);
  assert.equal(p.scale,scale,'export/import must retain the scale before the next system switch');
 }
 assert.notDeepEqual(configurations[0],configurations[1],'fixture must exercise different automatically sized frames');
 assert.deepEqual(configurations[0],configurations[2]);
});

test('regeneration honours a newly selected scale on an already generated page',async()=>{
 const {d,p}=projectFitFixture();
 const first=await buildAutomaticDispo(d,p,fetcher);
 Object.assign(p,{elements:first.elements,scale:20,dispoConfig:first.config});
 const second=await buildAutomaticDispo(d,p,fetcher);
 assert.equal(second.scale,20);
 const cabinet=second.elements.find(e=>e.kind==='cabinet');
 const device=second.elements.find(e=>e.dispoKind==='switch');
 const firstCabinet=first.elements.find(e=>e.kind==='cabinet');
 const firstDevice=first.elements.find(e=>e.dispoKind==='switch');
 assert.ok(Math.abs((device.x-cabinet.x)*20-(firstDevice.x-firstCabinet.x)*first.scale)<1e-6);
 assert.ok(Math.abs((device.y-cabinet.y)*20-(firstDevice.y-firstCabinet.y)*first.scale)<1e-6);
});
