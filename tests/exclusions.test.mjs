import test from 'node:test';import assert from 'node:assert/strict';import {parsePages,spdLoss,classify,suggestArticle} from '../waerme/core.mjs';
const page=(text,items=[])=>({file:'unrelated.pdf',number:1,text,items});
test('Utility communication and reserve measurements excluded without project-specific references',()=>{
 for(const label of ['RSE','NKE','ZFA','RS485','Res.','Reserve']){
  const r=parsePages([page(`88P1\n${label}\n89F2\n16A\nC`)]);assert.deepEqual(r.devices.map(d=>d.ref),['89F2']);assert.ok(r.ignored[0].includes('gemäss Vorgabe ausgeschlossen'));
 }
});
test('Spatial RS485 label belongs only to the closest equipment; a neighbouring clock remains',()=>{
 const items=[{str:'88P1',x:100,y:100},{str:'RS485',x:110,y:110},{str:'89P1',x:250,y:100}];
 const r=parsePages([page('88P1\n1\n2\n89P1\nSchaltuhr',items)]);assert.deepEqual(r.devices.map(d=>d.ref),['89P1']);
});
test('Control switches use Schrack H-0-A, without converting the main switch',()=>{
 const d=parsePages([page('10S2\nHauptschalter\n160A\n40S4\n0\nA\nH')]).devices;assert.equal(d[0].kind,'MAIN');assert.equal(d[1].kind,'CONTROL');
 const label='Schrack Steuer-Schalter H -0 -A 1pol.',c={label,...classify(label),pv:.5};assert.equal(suggestArticle(d[1],[c]),c);
});
test('SPD defaults to 5 W per whole device, preserves explicit overrides, rejects invalid losses',()=>{
 const d=parsePages([page('1F1\nÜberspannungsschutz')]).devices[0];assert.equal(d.manualLoss,5);assert.equal(d.poles,'4P');assert.equal(spdLoss({}),5);assert.equal(spdLoss({manualLoss:2.5}),2.5);assert.equal(spdLoss({manualLoss:0}),0);assert.throws(()=>spdLoss({manualLoss:-1}));
});
