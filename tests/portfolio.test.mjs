import test from 'node:test';import assert from 'node:assert/strict';import {buildPortfolio,disposition} from '../waerme/portfolio.mjs';
const page=(text,number=1,items=[])=>({text,number,file:'test.pdf',height:600,items});
const doc=(file,role,pages)=>({file,role,pages:pages.map(p=>({...p,file}))});
test('Separate Dispo wins in either import order and preserves separate devices per plant',()=>{
 const schema=n=>doc(n,'schema',[page('ELEKTROSCHEMA\nHaus '+n+'\nHauptverteilung'),page('Dispo\nB1000x H2000x T200mm',2),page('15F1\n16A\nC\n30mA',3)]);
 const own=doc('own','dispo',[page('HV Haus A\nAlu-Selbstbaurahmen\nB1758/758x H1600x T165mm'),page('HV Haus B\nAlu-Selbstbaurahmen\nB2008x H1520x T165mm',2)]);
 for(const docs of [[schema('A'),schema('B'),own],[own,schema('B'),schema('A')]]){const r=buildPortfolio(docs);assert.equal(r.plants.length,2);const a=r.plants.find(p=>p.name==='HV Haus A');assert.deepEqual(a.fields.map(f=>f.b),[1758,758]);assert.equal(a.devices[0].field,0);assert.ok(r.plants.every(p=>p.devices.length===1));}
});
test('Combined PDF separates additional distribution and ignores mentions in general notes',()=>{
 assert.equal(disposition(page('Allgemeine Hinweise\nGrobdisposition des Planers')),null);
 const r=buildPortfolio([doc('combined','schema',[page('ELEKTROSCHEMA'),page('Dispo Rechte Wand\nB825/1825x H2200x T400mm',2),page('11F1\n16A\nC',3),page('Dispo UV Linke Wand\nB1625x H2100x T400mm',4),page('11F1\n13A\nC',5)])]);
 assert.equal(r.plants.length,2);assert.equal(r.plants[0].fields.length,2);assert.equal(r.plants[1].devices[0].amp,13);
});
test('Unknown schema stays pending until explicit assignment',()=>{const d=doc('unlabelled','schema',[page('ELEKTROSCHEMA'),page('1F1\n16A\nC',2)]);assert.equal(buildPortfolio([d]).pending.length,1);assert.equal(buildPortfolio([d],{unlabelled:'My plant'}).plants[0].devices.length,1);});
test('Position-based field proposal requires unique dimension labels and reference position',()=>{
 const r=buildPortfolio([doc('schema','schema',[page('ELEKTROSCHEMA\nAllgemein\nHauptverteilung'),page('Dispo\nB1000/500x H2000x T200mm',2,[{str:'1000',x:100,y:100,width:0},{str:'500',x:300,y:100,width:0},{str:'11F1',x:120,y:200},{str:'12F1',x:300,y:200}]),page('11F1\n16A\nC\n12F1\n16A\nC',3)])]);assert.deepEqual(r.plants[0].devices.map(d=>d.field),[1,2]);
});
test('Different file titles join using shared project and devices, independent of import-role and order',()=>{
 const schema=doc('2026-08-31_HV Sample.pdf','schema',[page('ELEKTROSCHEMA\nTechnikraum\nSAMPLE'),page('DISPO',2),page('11F1\n16A\nC\n12F1.1\n16A\nC\n13F1\n16A\nC',3)]);
 const layout=doc('2026-10-15_HV Sample Street.pdf','schema',[page('ELEKTROSCHEMA\nSAMPLE'),page('Dispo\nB1258/1258x H1918x H165mm\n11F1\n12F1.1\n13F1',2)]);
 for(const role of ['schema','dispo'])for(const docs of [[schema,layout],[layout,schema]]){const r=buildPortfolio(docs.map(d=>({...d,role})));assert.equal(r.plants.length,1);const p=r.plants[0];assert.equal(p.devices.length,3);assert.deepEqual(p.fields.map(f=>[f.b,f.h,f.t]),[[1258,1918,null],[1258,1918,null]]);assert.equal(p.sources.length,2);assert.ok(p.layoutSource.includes('2026-10-15'));assert.ok(p.warnings.some(w=>w.includes('H165')));}
});
test('Ambiguous repeated device references do not merge unrelated plants; manual link remains available',()=>{
 const s=n=>doc(n+'.pdf','schema',[page('ELEKTROSCHEMA\n'+n),page('Dispo',2),page('11F1\n16A\n12F1\n16A\n13F1\n16A',3)]);
 const d=doc('Layout.pdf','schema',[page('Dispo\nB1000x H2000x T200mm\n11F1\n12F1\n13F1')]);
 const r=buildPortfolio([s('Alpha'),s('Beta'),d]);assert.equal(r.plants.length,3);const joined=buildPortfolio([s('Alpha'),s('Beta'),d],{},{layout:'alpha'});assert.equal(joined.plants.length,2);assert.equal(joined.plants.find(p=>p.id==='alpha').sources.length,2);
});
