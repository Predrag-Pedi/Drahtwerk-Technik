import test from 'node:test';import assert from 'node:assert/strict';
import {buildPortfolio,objectAddress} from '../waerme/portfolio.mjs';
import {parsePages} from '../waerme/core.mjs';
const page=(text,number=1,items=[])=>({text,number,items,height:600});
const doc=(file,pages)=>({file,pages:pages.map(p=>({...p,file}))});
const cover='ELEKTROSCHEMA\nObjekt:\nKunde GmbH\nKundenweg 7\n8111\nKundenort\nProjektort\n8222\nProjektstrasse 1+3';
const items=[{str:'1508',x:170,y:195},{str:'1258',x:370,y:195},{str:'1008',x:675,y:235},{str:'1920',x:50,y:345,rotated:true},{str:'1410',x:585,y:370,rotated:true},{str:'400',x:500,y:450,rotated:true},{str:'102Q1',x:90,y:430},{str:'114F2',x:200,y:430},{str:'116F2',x:230,y:430},{str:'202F2',x:650,y:430}];
const layout=doc('layout.pdf',[page(cover+'\nAU-12345'),page('Dispo\nHauptverteilung\nUV Allgemein\nAU-12345\n102Q1\n114F2\n116F2\n202F2',2,items)]);
const schema=doc('different-schema.pdf',[page(cover),page('Einspeisung von HAK\n1\n2\n3\n4\n5\n6\n7\n8\n102Q1\n125A',2),page('114F2\n125A\n116F2\n63A\n202F2\n32A\nC',3)]);
const order=doc('order.pdf',[page('Auftragsbestätigung\nAU-12345\nKunde GmbH\nHerr Test Person\nGuten Tag Test Person\nAlu-Selbstbaurahmen\nB1508/1508x H1920x T165mm')]);
test('Several cabinets on one layout join the schema and preserve three measured fields in either import order',()=>{
 for(const docs of [[layout,schema,order],[schema,order,layout]]){
  const r=buildPortfolio(docs);assert.deepEqual(r.pending,[]);assert.equal(r.plants.length,1);
  const p=r.plants[0];assert.deepEqual(p.fields.map(f=>[f.b,f.h,f.t]),[[1508,1920,165],[1258,1920,165],[1008,1410,165]]);
  assert.equal(p.project.amp,125);assert.equal(p.devices.length,4);assert.equal(p.devices.find(d=>d.ref==='202F2').field,3);
  assert.equal(p.project.object,'Projektstrasse 1+3, 8222 Projektort');
 }
});
test('Project address wins over customer address in reversed CAD title blocks',()=>assert.equal(objectAddress([page(cover)]),'Projektstrasse 1+3, 8222 Projektort'));
test('A rated Q switch at the HAK incoming supply is the main switch, unrelated Q references are not',()=>{
 assert.equal(parsePages(schema.pages).devices.find(d=>d.ref==='102Q1').kind,'MAIN');
 assert.equal(parsePages([page('102Q1\n125A')]).devices[0].kind,'OTHER');
});
