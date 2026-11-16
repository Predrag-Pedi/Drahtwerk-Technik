import test from 'node:test';import assert from 'node:assert/strict';
import {projectFitFixture,fetcher} from './fixtures/smissline-project.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';import {schemaDevices} from '../cad/dispo.mjs';
import {smisslineProjectSupply} from '../cad/smissline-packing.mjs';import {validateProject} from '../cad/model.mjs';
import {editAutomaticDispo} from '../cad/dispo-ui.mjs';
test('uploaded Smissline sheet inventory fits 1008 x 2000 with full reserve and no reduction prompt',async()=>{
 const {d,p}=projectFitFixture();let prompts=0;const g=await editAutomaticDispo(d,p,()=>{},()=>{prompts++;return false;},(d,p)=>buildAutomaticDispo(d,p,fetcher));
 assert.ok(g);assert.equal(prompts,0);assert.equal(g.config.reserve,20);assert.ok(g.config.width<=1008);assert.ok(g.config.height<=2000);assert.equal(g.config.fields,1);
 for(const [kind,count]of [['switch',1],['spd',1],['fils',18],['ls',8]])assert.equal(g.elements.filter(e=>e.dispoKind===kind).length,count,kind);
 const rails=g.elements.filter(e=>e.profile==='smissline');assert.equal(rails.length,1);for(const r of rails){assert.ok(r.smisslinePE>=r.occupiedPE+Math.ceil(r.occupiedPE*.2));assert.equal(r.smisslinePE,76);}
 assert.equal(g.elements.filter(e=>e.dispoKind==='smissline-feed').length,0);
 assert.ok(g.elements.flatMap(e=>e.dispoStructure||[]).some(e=>e.profile==='wire-basket'&&e.width===200));
 Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:g.config});assert.equal(validateProject(d).pages.find(q=>q.id===p.id).dispoConfig.reserve,20);
});
test('the unique main switch supplies the current when project rated current was not filled in',async()=>{const {d,p}=projectFitFixture();d.ratedCurrent='';const g=await buildAutomaticDispo(d,p,fetcher);assert.ok(g.config.width<=1008);assert.equal(g.elements.filter(e=>e.dispoKind==='smissline-feed').length,0);});
test('implicit common supply is limited to one incomer and one main switch without meter/feeder banks',()=>{const {d,p}=projectFitFixture(),ds=schemaDevices(d).devices,config=p.dispoConfig;assert.ok(smisslineProjectSupply(ds,config));assert.equal(smisslineProjectSupply(ds,{...config,buildSystem:'standard'}),null);for(const extra of [ds.find(d=>d.incoming),ds.find(d=>d.kind==='switch'),{kind:'meter'},{kind:'fuse'}])assert.equal(smisslineProjectSupply([...ds,extra],config),null);const split=ds.map(d=>d.kind==='switch'?{...d,source:{...d.source,page:'other'}}:d);assert.equal(smisslineProjectSupply(split,config),null);});
test('explicit feed and named group remain independent from the common supply',async()=>{const {d,p}=projectFitFixture();const element=d.pages.find(p=>p.number===11).elements[0],key=element.template.labels.find(l=>l.letter==='F').key;element.functions={[key]:{role:'none',smisslineFeedFrom:'99F1',smisslineFeedCurrent:100,circuitName:'Separate Gruppe'}};const g=await buildAutomaticDispo(d,p,fetcher),feeds=g.elements.filter(e=>e.dispoKind==='smissline-feed');assert.ok(feeds.some(e=>e.tag==='Einspeisung 99F1'));assert.equal(feeds.length,1);assert.equal(g.elements.filter(e=>e.dispoKind==='switch').length,1);});

test('direct 63 A main removes only disposition input, starts its rail and leaves schema intact',async()=>{
 const {d,p}=projectFitFixture(),before=JSON.stringify(d.pages.filter(q=>q!==p));const g=await buildAutomaticDispo(d,p,fetcher);
 assert.equal(JSON.stringify(d.pages.filter(q=>q!==p)),before);
 assert.equal(g.elements.filter(e=>e.dispoKind==='terminal').length,0);
 const main=g.elements.find(e=>e.dispoKind==='switch'),spd=g.elements.find(e=>e.dispoKind==='spd');assert.ok(main.y<spd.y);
 const parts=g.elements.flatMap(e=>e.dispoStructure||[]);assert.ok(!parts.some(e=>e.kind==='copper'));assert.ok(!parts.some(e=>e.profile==='DIN35'));
});
for(const current of [64,125])test(`incoming ${current} A retains terminals and conventional main`,async()=>{
 const {d,p}=projectFitFixture();d.ratedCurrent=current+'A';d.pages.flatMap(p=>p.elements).find(e=>e.tag==='10S0').value=current+'A';
 const g=await buildAutomaticDispo(d,p,fetcher);assert.ok(g.elements.some(e=>e.dispoKind==='terminal'));const main=g.elements.find(e=>e.dispoKind==='switch');assert.equal(main.dispoTemplateId,'tl-0787');assert.ok(g.elements.some(e=>e.dispoKind==='smissline-feed'&&e.tag==='Einspeisung 10S0'));
});
test('explicit conventional main below 63 A retains input terminals',async()=>{
 const {d,p}=projectFitFixture(),main=d.pages.flatMap(p=>p.elements).find(e=>e.tag==='10S0');main.functions={'$':{role:'none',breakerSystem:'conventional'}};
 const g=await buildAutomaticDispo(d,p,fetcher);assert.ok(g.elements.some(e=>e.dispoKind==='terminal'));assert.equal(g.elements.find(e=>e.dispoKind==='switch').dispoTemplateId,'tl-0786');
});

test('a second rail retains its feeder from the direct main and counts its PE',async()=>{
 const {d,p}=projectFitFixture();p.dispoConfig.maxHeight=1200;const g=await buildAutomaticDispo(d,p,fetcher),rails=g.elements.filter(e=>e.profile==='smissline'),feeds=g.elements.filter(e=>e.dispoKind==='smissline-feed');
 assert.equal(rails.length,2);assert.equal(feeds.length,1);assert.equal(feeds[0].tag,'Einspeisung 10S0');assert.equal(rails.reduce((n,r)=>n+r.occupiedPE,0),64);for(const r of rails)assert.ok(r.smisslinePE>=r.occupiedPE+Math.ceil(r.occupiedPE*.2));
});
test('a higher stated incoming current prevents removal of the incoming terminals',async()=>{
 const {d,p}=projectFitFixture();d.ratedCurrent='125A';const g=await buildAutomaticDispo(d,p,fetcher);assert.ok(g.elements.some(e=>e.dispoKind==='terminal'));
});

test('pure Smissline uses rail length plus frame clearance, without Galip or 400 mm height steps',async()=>{
 const {d,p}=projectFitFixture(),g=await buildAutomaticDispo(d,p,fetcher);assert.equal(g.config.width,508);assert.equal(g.config.height,1525);assert.equal(g.config.topHeight,300);assert.equal(g.config.reserve,20);
 const parts=g.elements.flatMap(e=>e.dispoStructure||[]);assert.ok(!parts.some(p=>p.profile==='AS50'||p.profile==='AS35'&&p.frameStyle!=='smissline-carrier'));const carrier=parts.find(p=>p.frameStyle==='smissline-carrier');assert.ok(Math.abs(carrier.y-45)<1e-6);assert.ok(Math.abs(carrier.height-(g.config.height-90))<1e-6);
 const basket=parts.find(p=>p.profile==='wire-basket');assert.ok(Math.abs(basket.y-20)<1e-6);assert.ok(Math.abs(g.config.height-basket.y-basket.height-70)<1e-6);
 const rail=g.elements.find(e=>e.profile==='smissline');assert.equal(rail.occupiedPE,60);assert.equal(rail.requiredReservePE,12);assert.equal(rail.smisslinePE,76);
});

test('Smissline with a conventional 125 A main ignores legacy top and fuse zones',async()=>{
 const run=async(topHeight,fuseHeight)=>{const {d,p}=projectFitFixture();d.ratedCurrent='125A';d.pages.flatMap(p=>p.elements).find(e=>e.tag==='10S0').value='125A';Object.assign(p.dispoConfig,{topHeight,fuseHeight});return buildAutomaticDispo(d,p,fetcher);};
 const a=await run(200,200),b=await run(500,1600);
 assert.equal(a.config.width,b.config.width);assert.equal(a.config.height,b.config.height);
 for(const g of [a,b]){assert.ok(g.elements.some(e=>e.dispoKind==='terminal'));assert.equal(g.elements.find(e=>e.dispoKind==='switch').dispoTemplateId,'tl-0787');const parts=g.elements.flatMap(e=>e.dispoStructure||[]);assert.ok(!parts.some(p=>p.profile==='AS50'));const basket=parts.find(p=>p.profile==='wire-basket');assert.ok(Math.abs(basket.y-20)<1e-6);assert.ok(g.config.height<1920);}
});
