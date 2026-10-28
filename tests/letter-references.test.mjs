import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePages} from '../waerme/core.mjs';
import {buildPortfolio} from '../waerme/portfolio.mjs';
const page=(text,number=1,items=[])=>({text,number,items,height:600});
const doc=(file,pages)=>({file,pages:pages.map(p=>({...p,file}))});
test('Letter-first devices, preceding SPD/main labels, and utility exclusions',()=>{
 const p=doc('test.pdf',[page('SPD T1+2\n100A\nF106\nEinspeisung\nLasttrennschalter\n1\n2\n3\n4\n5\n6\n7\n8\nQ101\n100A'),page('F302\n16A\n30mA\nA\nC\n1\n2\n3\n4\n5\n6\nN\nN\nP112\nRSE\nP115\nZFA\nP122\nRes.\nP136\nkWh\nP140\nRS485',2)]);
 const r=parsePages(p.pages);assert.deepEqual(r.devices.map(d=>[d.ref,d.kind]),[['F106','SPD'],['Q101','MAIN'],['F302','FILS']]);assert.equal(r.devices[0].manualLoss,5);assert.equal(r.devices[2].poles,'3LN');assert.equal(r.currents[0].amp,100);
});
test('Separate files join by project address, cabinet designation and overlapping references in either order',()=>{
 const cover='ELEKTROSCHEMA\nObjekt:\nHauptverteilung E01\nAmt für Hochbauten\nKundenstrasse 20\nMusterweg 12';
 const layout=doc('own-layout.pdf',[page(cover+'\nAU-00123'),page('Dispo\nHV E01\nAlu-Reihenschrank\nB825/1125x H2100x T400mm\nSmissline\nQ101\nF302\nF304\nF306\nAU-00123',2,[{str:'825',x:100,y:100},{str:'1125',x:300,y:100},{str:'F302 F304 F306',x:300,y:200,width:60}])]);
 const schema=doc('external.pdf',[page(cover),page('Lasttrennschalter\nQ101\n100A\nF302\n16A\n30mA\nC\nF304\n16A\n30mA\nC\nF306\n16A\n30mA\nC',2)]);
 const order=doc('order.pdf',[page('Elektroteam\nHerr Max Muster\nAuftragsbestätigung\nAU-00123\nKundennummer:\n001234\nDatum:\n16.09.2026\nGuten Tag Max Muster')]);
 for(const docs of [[layout,schema,order],[order,schema,layout]]){
 const r=buildPortfolio(docs);assert.equal(r.plants.length,1);assert.equal(r.pending.length,0);const p=r.plants[0];assert.deepEqual(p.fields.map(f=>[f.b,f.h,f.t]),[[825,2100,400],[1125,2100,400]]);assert.equal(p.project.customer,'Elektroteam');assert.equal(p.project.pl,'Max Muster');assert.equal(p.project.customerNo,'001234');assert.ok(p.devices.filter(d=>d.kind==='FILS').every(d=>d.system==='smissline'&&d.field===2&&d.fieldMethod==='dispo'));
 }
 const unrelated={...schema,pages:schema.pages.map(p=>({...p,text:p.text.replace('Hauptverteilung E01','Unterverteilung E02')}))};assert.equal(buildPortfolio([layout,unrelated]).pending.length,1);
});
test('An explicitly labelled clock without reference remains visible with its source',()=>{const r=parsePages(doc('clock.pdf',[page('Zeitschaltuhr\nF612\n13A\n30mA\nC\nS612\n1\n0\nH\nA')]).pages);assert.equal(r.devices.filter(d=>d.kind==='CLOCK').length,1);assert.equal(r.devices.find(d=>d.ref==='S612').kind,'CONTROL');});
