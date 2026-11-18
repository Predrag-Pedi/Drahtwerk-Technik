import test from 'node:test';
import assert from 'node:assert/strict';
import {cabinetProjectFixture,fetcher} from './fixtures/smissline-project.mjs';
import {dispoVariants,cachedDispoBuild,calculateDispoVariant} from '../cad/dispo-variants.mjs';
import {buildAutomaticDispo,automaticTemplateId} from '../cad/dispo-auto.mjs';
import {validateProject} from '../cad/model.mjs';
import {schemaDevices} from '../cad/dispo.mjs';
import {editSiteSettings} from '../cad/dispo-ui.mjs';

test('37-device project compares all six primary builds without changing schema, scale, limits or reserve',async()=>{
 const {d,p}=cabinetProjectFixture(),before=JSON.stringify(d),variants=dispoVariants(p),build=cachedDispoBuild(fetcher);
 const current=await calculateDispoVariant(d,p,variants[0],build);
 assert.equal(current.code,'DISPO_CABINET_HEIGHT');assert.match(current.error,/2000 mm Korpus \+ 100 mm Sockel = 2100 mm/);
 const wanted=variants.filter(v=>v.id!=='current'&&!v.config.plinthHeight&&['standard','smissline'].includes(v.config.buildSystem));assert.equal(wanted.length,6);
 const sources=new Set(schemaDevices(d).devices.map(d=>JSON.stringify(d.source)));
 for(const v of wanted){
  const {result:g,error}=await calculateDispoVariant(d,p,v,build);assert.ok(g,v.name+': '+error);
  assert.equal(g.config.reserve,20);assert.equal(g.config.reserveMeters,0);assert.equal(g.scale,p.scale);
  assert.ok(g.config.width<=1200);assert.ok(g.config.height<=2000);assert.ok(g.config.fieldWidths.every(w=>w<=2000));
  for(const key of ['maxWidth','maxHeight','passageWidth','passageHeight'])assert.equal(g.config[key],p.dispoConfig[key]);
  const actual=new Set(g.elements.filter(e=>e.dispoSource).map(e=>JSON.stringify(e.dispoSource)));
  for(const source of sources)assert.ok(actual.has(source),v.name+' lost '+source);
  assert.equal(g.elements.filter(e=>e.dispoKind==='ls').length,16);assert.equal(g.elements.filter(e=>e.dispoKind==='fils').length,18);
  assert.equal(g.elements.some(e=>e.profile==='smissline'),v.config.buildSystem==='smissline');
  if(v.config.distributionType==='standing'){assert.equal(g.config.height,2000);assert.equal(g.config.plinthHeight,0);}
 }
 assert.equal(JSON.stringify(d),before);
});

test('variant override switches explicit Smissline devices to standard and back without editing their schema choices',async()=>{
 const {d,p}=cabinetProjectFixture();
 for(const q of d.pages.filter(q=>q.type==='schema'))for(const e of q.elements){for(const l of e.template?.labels?.filter(l=>l.letter==='F')||[]){e.functions??={};e.functions[l.key]={role:'none',breakerSystem:'smissline'};}}
 const before=JSON.stringify(d),variants=dispoVariants(p),build=cachedDispoBuild(fetcher);
 for(const id of ['standing-standard-hager-0','sbr-standard-schneider-0','standing-smissline-auto-0']){
  const v=variants.find(v=>v.id===id),{result:g,error}=await calculateDispoVariant(d,p,v,build);assert.ok(g,error);assert.equal(g.elements.some(e=>e.profile==='smissline'),v.config.buildSystem==='smissline');
  const copy=structuredClone(d),q=copy.pages.find(q=>q.id===p.id);Object.assign(q,{elements:g.elements,scale:g.scale,dispoConfig:g.config});
  const restored=validateProject(copy),r=restored.pages.find(q=>q.id===p.id);assert.equal(r.dispoConfig.systemScope,'all');
  const again=await buildAutomaticDispo(restored,r,fetcher);assert.equal(again.config.width,g.config.width);assert.equal(again.scale,p.scale);
 }
 assert.equal(JSON.stringify(d),before);
});

test('changing the system explicitly selects whole-dispo scope and preserves the basket width',()=>{
 const {p}=cabinetProjectFixture();let submit,next;
 editSiteSettings(p,(_,fields,callback)=>{submit=callback;assert.ok(fields.find(f=>f.key==='plinthHeight').options[1][1].includes('2100'));},c=>next=c);
 submit({buildSystem:'standard',systemScope:'individual',smisslineDuctWidth:300});assert.equal(next.systemScope,'all');assert.equal(next.smisslineDuctWidth,300);
});

test('Schneider integrated neutral reserves 2 or 4 PE, without shrinking multipole LS bodies',()=>{
 for(const [poles,neutral,id]of [[1,true,'tl-0534'],[3,true,'tl-0543'],[2,false,'tl-0534'],[4,false,'tl-0543']])assert.equal(automaticTemplateId({kind:'ls',poles,neutral,manufacturer:'schneider'}),id);
});

test('failed alternatives remain unavailable and never fall back to a reduced reserve or another enclosure',async()=>{
 const {d,p}=cabinetProjectFixture(),before=JSON.stringify(d),v=dispoVariants(p).find(v=>v.id==='standing-smissline-auto-0');
 v.config.maxHeight=1900;const r=await calculateDispoVariant(d,p,v,cachedDispoBuild(fetcher));assert.ok(r.error);assert.equal(r.result,undefined);assert.equal(r.config.reserve,20);
 const unknown=await calculateDispoVariant(d,p,v,async()=>{throw Error('Vorlage fehlt');});assert.equal(unknown.error,'Vorlage fehlt');assert.equal(JSON.stringify(d),before);
});
