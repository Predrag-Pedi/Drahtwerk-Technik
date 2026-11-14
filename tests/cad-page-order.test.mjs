import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project,page,createElement,duplicatePage,validateProject,addStandardPages} from '../cad/model.mjs';
import {reconcilePageOrder} from '../cad/page-order.mjs';
import {functionBmk} from '../cad/references.mjs';
import {inheritBus,referenceText} from '../cad/continuations.mjs';
import {placement} from '../cad/placement.mjs';
import {validateTemplate} from '../cad/template.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),fetcher=async p=>({ok:true,json:()=>read(p.split('?')[0])});
function fixture(){const d=project();addStandardPages(d);const q=page('schema',11);d.pages.push(q);return d;}
test('moving a last sheet forward assigns page numbers by order and updates native BMKs and linked references',()=>{
 const d=fixture(),last=d.pages.at(-1),first=d.pages.find(p=>p.number===10),ls=createElement(last,'ls',300,200);last.elements.push(ls);inheritBus(d,first,last);
 const before=structuredClone(d),a=d.links[0].a,ids=d.links.map(l=>JSON.stringify([l.a,l.b]));d.pages.splice(d.pages.indexOf(last),1);d.pages.splice(d.pages.indexOf(first),0,last);reconcilePageOrder(d,before);
 assert.deepEqual(d.pages.map(p=>p.number),[1,2,6,7,8,9,10,11]);assert.equal(last.number,10);assert.match(ls.tag,/^10F/);assert.match(referenceText(d,a),/^10\./);assert.deepEqual(d.links.map(l=>JSON.stringify([l.a,l.b])),ids);assert.doesNotThrow(()=>validateProject(d));
});
test('inserting and removing reserve pages shifts downstream numbers; copies receive updated native BMKs',()=>{
 const d=fixture(),source=d.pages.find(p=>p.number===10),e=createElement(source,'ls',300,200);source.elements.push(e);let before=structuredClone(d);const reserve=page('schema',12);reserve.title='Reserve';d.pages.splice(d.pages.indexOf(source),0,reserve);reconcilePageOrder(d,before);assert.equal(reserve.number,10);assert.equal(source.number,11);assert.match(e.tag,/^11F/);
 before=structuredClone(d);const copy=duplicatePage(d,source);d.pages.splice(d.pages.indexOf(source)+1,0,copy);reconcilePageOrder(d,before);assert.equal(copy.number,12);assert.match(copy.elements[0].tag,/^12F/);
 before=structuredClone(d);d.pages=d.pages.filter(p=>p.id!==reserve.id);reconcilePageOrder(d,before);assert.equal(source.number,10);assert.equal(copy.number,11);assert.match(copy.elements[0].tag,/^11F/);
});
test('template BMKs and existing disposition labels follow schema renumbering without moving devices',async()=>{
 const d=fixture(),s=d.pages.find(p=>p.number===10),p=d.pages.find(p=>p.type==='dispo'),id='tl-0025',t=validateTemplate({...read('cad/templates/'+id+'.json'),details:read('cad/template-details.json')[id]}),e=placement(s,'template',{x:300,y:100},true,0,t);s.elements.push(e);const key=t.labels.find(l=>l.letter==='F').key;
 const g=await buildAutomaticDispo(d,p,fetcher);Object.assign(p,{elements:g.elements,scale:g.scale});const body=p.elements.find(e=>e.dispoSource),oldTag=body.tag,position={x:body.x,y:body.y},before=structuredClone(d);d.pages.splice(d.pages.indexOf(s),0,page('schema',12));reconcilePageOrder(d,before);
 const tag=functionBmk(d,s,e,key);assert.match(tag,/^11F/);assert.notEqual(body.tag,oldTag);assert.equal(body.tag,tag);assert.deepEqual({x:body.x,y:body.y},position);assert.ok(Object.values(body.textEdits).some(value=>value===tag||value.startsWith(tag+' ')));assert.doesNotThrow(()=>validateProject(d));
});
test('opening an out-of-order project repairs numbers while standard-page insertion keeps its established numbering',()=>{
 const d=project(),before=structuredClone(d);addStandardPages(d);reconcilePageOrder(d,before);assert.deepEqual(d.pages.map(p=>p.number),[1,2,6,7,8,9,10]);const q=page('schema',18);d.pages.splice(6,0,q);const old=structuredClone(d);reconcilePageOrder(d,old,{repair:true});assert.equal(q.number,10);assert.equal(d.pages.at(-1).number,11);
});
test('manual function BMKs and descriptions stay unchanged',()=>{
 const d=fixture(),s=d.pages.at(-1),e=createElement(s,'coil',300,200);e.functions={$:{role:'coil',bmk:'CUSTOM-K1',description:'Blatt 11 allgemein'}};s.elements.push(e);const before=structuredClone(d);d.pages.splice(d.pages.indexOf(s),0,page('schema',12));reconcilePageOrder(d,before);assert.equal(functionBmk(d,s,e),'CUSTOM-K1');assert.equal(e.functions.$.description,'Blatt 11 allgemein');
});

test('a formerly missing sheet number does not leave a gap after moving sheet 18 ahead of 11',()=>{const d=fixture();d.pages=d.pages.filter(p=>p.number!==10);const p=page('schema',18);d.pages.splice(d.pages.findIndex(p=>p.number===11),0,p);const before=structuredClone(d);reconcilePageOrder(d,before,{repair:true});assert.equal(p.number,10);assert.equal(d.pages.at(-1).number,11);});
