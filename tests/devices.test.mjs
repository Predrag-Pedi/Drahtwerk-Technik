import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePages,classify,candidates,suggestArticle} from '../waerme/core.mjs';
const page=text=>({file:'test.pdf',number:1,text});
test('Main switches and auxiliary references are collected, repeated contacts counted once',()=>{
 const r=parsePages([page('10S2\nHauptschalter\n160A\n1\n2\n3\n4\n5\n6\n61K7\nA1\nA2\n61K7\n11\n12\n60P3\nSchaltuhr\n22Y3\nPrivatzähler')]);
 assert.equal(r.devices.length,4);assert.equal(r.devices[0].kind,'MAIN');assert.equal(r.devices[0].amp,160);assert.equal(r.devices.filter(d=>d.ref==='61K7').length,1);assert.equal(r.devices[2].kind,'CLOCK');assert.equal(r.devices[3].kind,'METER');
});
test('Fuse ranges use DII through 25 A, DIII through 63 A and NH above; absent 13 A uses 16 A',()=>{
 const cat=['DII Element 16A 3LN','DII Element 25A 3LN','DIII Element 25A 3LN','DIII Element 40A 3LN','DIII Element 63A 3LN','Hager NH - Element 160A 3LN'].map(label=>({label,...classify(label)}));
 for(const [amp,index] of [[13,0],[25,1],[32,3],[63,4],[160,5]]){
  const d=parsePages([page(`1F1\n${amp}A\n5\n6`)]).devices[0];assert.equal(d.kind,amp>63?'NH':'FUSE');assert.equal(candidates(d,cat)[0],cat[index]);
 }
});
test('Time switch reference is chosen, but incompatible main-switch variants remain reviewable',()=>{
 const clocks=[{kind:'CLOCK',code:'EG103',pv:2},{kind:'CLOCK',code:'EG203',pv:4}];assert.equal(suggestArticle({kind:'CLOCK'},clocks),clocks[0]);
 assert.equal(suggestArticle({kind:'MAIN',amp:160},[{kind:'MAIN',amp:160,pv:26},{kind:'MAIN',amp:160,pv:12}]),undefined);
});
test('Confirmed symbol interpretations cannot leak into an unrelated drawing with identical references',()=>{
 const text='10S2\n160A\n13F2.1\n160A\n60P3\nL\nN\n61K7\nA1\nA2';
 const ds=parsePages([page(text)]).devices;assert.equal(ds.find(d=>d.ref==='60P3').kind,'OTHER');
});
