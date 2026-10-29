import test from 'node:test';import assert from 'node:assert/strict';
import {parsePages} from '../waerme/core.mjs';import {buildPortfolio} from '../waerme/portfolio.mjs';
const page=(text,number=1)=>({text,number,file:'schema.pdf',height:800,items:[]});
test('Compact and inline native ratings distinguish LS, FI and FI/LS',()=>{
 const r=parsePages([page('-6F1\nLS C 3x25A\n-6F2\nLS C 13A\nPhase L1\n-6F4\nFI/LS C 13A 30mA\nPhase L2\n-4F4 LS 4P 50A\n-4F5 FI 4P 63A 300mA\n-17F1\nFI/LS C13A 30mA\nPhase L3')]);
 assert.deepEqual(r.devices.map(d=>[d.ref,d.kind,d.amp,d.ma,d.poles]),[['-6F1','LS',25,null,'3LN'],['-6F2','LS',13,null,'LN'],['-6F4','FILS',13,30,'LN'],['-4F4','LS',50,null,'3LN'],['-4F5','FI',63,300,'3LN'],['-17F1','FILS',13,30,'LN']]);
});
test('Numbered automation modules are devices; coil terminals and channel names are not',()=>{
 const r=parsePages([page('A1\nA2\n-5K3\nSchütz\n-27A2\nRelay Extension\nQ1\nS1\n-26G1\nNetzteil 24V')]);
 assert.deepEqual(r.devices.map(d=>d.ref),['-5K3','-27A2','-26G1']);assert.equal(r.devices[0].kind,'CONTACTOR');
});
test('Single disposition at the end retains preceding circuit pages',()=>{
 const r=buildPortfolio([{file:'schema.pdf',pages:[page('Deckblatt'),page('-6F4\nFI/LS C 13A 30mA\nPhase L2',2),page('Dispo\nB1000x H2000x T165mm',3)]}]);assert.equal(r.plants.length,1);assert.equal(r.plants[0].devices[0].ref,'-6F4');
});
test('AZK scope stays separate, mixed AZK/HV control page stays with HV',()=>{
 const r=buildPortfolio([{file:'schema.pdf',pages:[page('Deckblatt'),page('+AZK Aussenzählerkasten\n-3F1\n40A',3),page('+AZK Aussenzählerkasten\n+HV Hauptverteilung\n-5K3\nSchütz',5),page('Dispo\nB1000x H2000x T165mm',31)]}]);assert.equal(r.plants.length,2);assert.deepEqual(r.plants.find(p=>p.name==='Aussenzählerkasten').devices.map(d=>d.ref),['-3F1']);assert.deepEqual(r.plants.find(p=>p.name!=='Aussenzählerkasten').devices.map(d=>d.ref),['-5K3']);
});
