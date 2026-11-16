import test from 'node:test';import assert from 'node:assert/strict';
import {projectFitFixture,fetcher} from './fixtures/smissline-project.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';import {validateProject} from '../cad/model.mjs';
const counts=g=>Object.fromEntries(['terminal','switch','spd','ls','fils'].map(k=>[k,g.elements.filter(e=>e.dispoKind===k).length]));
for(const brand of ['schneider','hager'])for(const current of [63,125])test(`standard ${brand} ${current} A uses one supply without a false fuse bank and switches back`,async()=>{
 const {d,p}=projectFitFixture();d.ratedCurrent=current+'A';d.pages.flatMap(q=>q.elements).find(e=>e.tag==='10S0').value=current+'A';const schema=JSON.stringify(d.pages.filter(q=>q!==p));
 Object.assign(p.dispoConfig,{buildSystem:'standard',breakerManufacturer:brand});const g=await buildAutomaticDispo(d,p,fetcher);
 assert.deepEqual(counts(g),{terminal:1,switch:1,spd:1,ls:8,fils:18});assert.equal(g.config.reserve,20);assert.ok(g.config.width<=1008);assert.equal(g.config.height,720);const cabinet=g.elements.find(e=>e.kind==='cabinet'),f=1200/420/g.scale;for(const e of g.elements.filter(e=>e.dispoSource)){assert.ok(e.x>=cabinet.x);assert.ok(e.x+e.width*f<=cabinet.x+cabinet.width*f+.01);assert.ok(e.y+e.height*f<=cabinet.y+cabinet.height*f+.01);}
 assert.ok(!g.elements.some(e=>e.profile==='smissline'||e.dispoKind==='smissline-feed'||e.dispoSource?.element==='incoming-supply'));
 const parts=g.elements.flatMap(e=>e.dispoStructure||[]);assert.ok(!parts.some(p=>p.plateType==='fuse'||p.plateType==='meter'));const input=g.elements.find(e=>e.dispoKind==='terminal'),main=g.elements.find(e=>e.dispoKind==='switch');assert.ok(input.y<main.y);
 const fils=g.elements.filter(e=>e.dispoKind==='fils');if(brand==='hager'){const starts=['L1','L2','L3'].map(phase=>Math.min(...fils.filter(e=>e.phase===phase).map(e=>e.x)));assert.ok(starts.every(x=>Math.abs(x-starts[0])<.001));assert.equal(new Set(fils.map(e=>Math.round(e.y))).size,3);}
 Object.assign(p,{elements:g.elements,scale:g.scale,dispoConfig:{...g.config,buildSystem:'smissline'}});const restored=validateProject(JSON.parse(JSON.stringify(d))),q=restored.pages.find(q=>q.id===p.id),smiss=await buildAutomaticDispo(restored,q,fetcher);assert.ok(smiss.elements.some(e=>e.profile==='smissline'));assert.equal(counts(smiss).fils,18);assert.equal(counts(smiss).ls,8);
 q.dispoConfig={...smiss.config,buildSystem:'standard'};const back=await buildAutomaticDispo(restored,q,fetcher);assert.deepEqual(counts(back),counts(g));assert.equal(back.config.height,g.config.height);assert.equal(JSON.stringify(d.pages.filter(q=>q!==p)),schema);
});
