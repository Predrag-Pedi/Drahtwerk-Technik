import test from 'node:test';import assert from 'node:assert/strict';
import {projectFitFixture,fetcher} from './fixtures/smissline-project.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';import {schemaDevices} from '../cad/dispo.mjs';
import {smisslineProjectSupply} from '../cad/smissline-packing.mjs';import {validateProject} from '../cad/model.mjs';
import {editAutomaticDispo} from '../cad/dispo-ui.mjs';
test('uploaded Smissline sheet inventory fits 1008 x 2000 with full reserve and no reduction prompt',async()=>{
 const {d,p}=projectFitFixture();let prompts=0;const g=await editAutomaticDispo(d,p,()=>{},()=>{prompts++;return false;},(d,p)=>buildAutomaticDispo(d,p,fetcher));
 assert.ok(g);assert.equal(prompts,0);assert.equal(g.config.reserve,20);assert.ok(g.config.width<=1008);assert.ok(g.config.height<=2000);assert.equal(g.config.fields,1);
 for(const [kind,count]of [['switch',1],['spd',1],['fils',18],['ls',8]])assert.equal(g.elements.filter(e=>e.dispoKind===kind).length,count,kind);
 const rails=g.elements.filter(e=>e.profile==='smissline');assert.equal(rails.length,2);for(const r of rails){assert.ok(r.smisslinePE>=r.occupiedPE+Math.ceil(r.occupiedPE*.2));assert.equal(r.smisslinePE,42);}
 assert.equal(g.elements.filter(e=>e.dispoKind==='smissline-feed').length,2);
 assert.ok(g.elements.flatMap(e=>e.dispoStructure||[]).some(e=>e.profile==='wire-basket'&&e.width===200));
 Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});assert.equal(validateProject(d).pages.find(q=>q.id===p.id).dispoConfig.reserve,20);
});
test('the unique main switch supplies the current when project rated current was not filled in',async()=>{const {d,p}=projectFitFixture();d.ratedCurrent='';const g=await buildAutomaticDispo(d,p,fetcher);assert.ok(g.config.width<=1008);assert.equal(g.elements.filter(e=>e.dispoKind==='smissline-feed').length,2);});
test('implicit common supply is limited to one incomer and one main switch without meter/feeder banks',()=>{const {d,p}=projectFitFixture(),ds=schemaDevices(d).devices,config=p.dispoConfig;assert.ok(smisslineProjectSupply(ds,config));assert.equal(smisslineProjectSupply(ds,{...config,buildSystem:'standard'}),null);for(const extra of [ds.find(d=>d.incoming),ds.find(d=>d.kind==='switch'),{kind:'meter'},{kind:'fuse'}])assert.equal(smisslineProjectSupply([...ds,extra],config),null);const split=ds.map(d=>d.kind==='switch'?{...d,source:{...d.source,page:'other'}}:d);assert.equal(smisslineProjectSupply(split,config),null);});
test('explicit feed and named group remain independent from the common supply',async()=>{const {d,p}=projectFitFixture();const element=d.pages.find(p=>p.number===11).elements[0],key=element.template.labels.find(l=>l.letter==='F').key;element.functions={[key]:{role:'none',smisslineFeedFrom:'99F1',smisslineFeedCurrent:100,circuitName:'Separate Gruppe'}};const g=await buildAutomaticDispo(d,p,fetcher),feeds=g.elements.filter(e=>e.dispoKind==='smissline-feed');assert.ok(feeds.some(e=>e.tag==='Einspeisung 99F1'));assert.ok(feeds.some(e=>e.tag!=='Einspeisung 99F1'));});
