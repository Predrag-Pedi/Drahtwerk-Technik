import test from 'node:test';import assert from 'node:assert/strict';
import {project,page,duplicatePage,validateProject,addStandardPages} from '../cad/model.mjs';
import {reconcilePageOrder} from '../cad/page-order.mjs';
test('new working sheets and repeated copies receive numbered names without copy suffixes',()=>{
 const d=project();addStandardPages(d);const prefix=d.pages.filter(p=>p.number<10).map(p=>[p.number,p.title]);const source=d.pages.find(p=>p.number===10);assert.equal(source.title,'Seite 10');source.title='Einspeisung';let last=source;
 for(let n=11;n<=15;n++){const before=structuredClone(d),q=duplicatePage(d,last);d.pages.splice(d.pages.indexOf(last)+1,0,q);reconcilePageOrder(d,before);assert.equal(q.title,`Seite ${q.number}`);assert.equal(q.number,n);last=q;}
 assert.equal(source.title,'Einspeisung');assert.deepEqual(d.pages.filter(p=>p.number<10).map(p=>[p.number,p.title]),prefix);assert.equal(page('schema',16).title,'Seite 16');
});
test('legacy generic names migrate on load while custom and introductory titles survive',()=>{
 const d=project();addStandardPages(d);const p=d.pages.find(p=>p.number===10);p.title='Elektroschema';for(const [n,title]of [[11,'Neue Seite'],[12,'Neue Seite – Kopie – Kopie'],[13,'Seite 77'],[14,'Wohnung 1'],[15,'Wohnung 1 – Kopie']]){const q=page('schema',n);q.title=title;d.pages.push(q);}const prefix=d.pages.filter(p=>p.number<10).map(p=>p.title),saved=validateProject(d);
 for(const n of [10,11,12,13])assert.equal(saved.pages.find(p=>p.number===n).title,`Seite ${n}`);assert.equal(saved.pages.find(p=>p.number===14).title,'Wohnung 1');assert.equal(saved.pages.find(p=>p.number===15).title,'Wohnung 1 – Kopie');assert.deepEqual(saved.pages.filter(p=>p.number<10).map(p=>p.title),prefix);
});
test('inserting and removing sheets refreshes automatic names along with their sheet numbers',()=>{
 const d=project();addStandardPages(d);let before=structuredClone(d);const q=page('schema',11);d.pages.splice(d.pages.findIndex(p=>p.number===10),0,q);reconcilePageOrder(d,before);assert.equal(q.title,'Seite 10');assert.equal(d.pages.at(-1).title,'Seite 11');before=structuredClone(d);d.pages=d.pages.filter(p=>p.id!==q.id);reconcilePageOrder(d,before);assert.equal(d.pages.at(-1).title,'Seite 10');
});
