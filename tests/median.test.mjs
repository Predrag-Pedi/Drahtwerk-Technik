import test from 'node:test';import assert from 'node:assert/strict';import {middleLossArticle,suggestArticle,parsePages} from '../waerme/core.mjs';
test('Median loss selection is independent of row order and duplicated loss values',()=>{
 const cs=[{id:'a',pv:1},{id:'b',pv:4},{id:'c',pv:10},{id:'d',pv:10},{id:'e',pv:10}];assert.equal(middleLossArticle(cs).pv,4);assert.equal(middleLossArticle(cs.toReversed()).id,'b');
 assert.equal(suggestArticle({kind:'OTHER'},[{kind:'OTHER',pv:4}]),undefined);
});
test('Reference selection never mixes systems, current ratings or known poles',()=>{
 const d={kind:'LS',system:'hager',amp:63,poles:'3LN'};
 const cs=[12,15,20].map(pv=>({...d,pv}));cs.push({...d,system:'smissline',pv:16},{...d,amp:80,pv:16},{...d,poles:'LN',pv:16});assert.equal(suggestArticle(d,cs).pv,15);
});
test('Meter exclusion works on unrelated filenames and references, retaining private meters and clocks',()=>{
 for(const label of ['MID 25A','Hutschienen-\nStormzähler','Stromzähler','Energiezähler','kWh']){
 const r=parsePages([{file:'other-project.pdf',number:3,text:`84P7\n${label}\n85P1\nPrivatzähler\n86P2\nSchaltuhr`}]);assert.equal(r.devices.some(d=>d.ref==='84P7'),false);assert.ok(r.devices.some(d=>d.ref==='85P1'));assert.ok(r.devices.some(d=>d.ref==='86P2'));assert.equal(r.ignored.length,1);
 }
});
test('Three-phase terminals preceding the reference are recognized',()=>{
 const ds=parsePages([{file:'any.pdf',number:1,text:'1\n2\n3\n4\n5\n6\nN\nN\n15F5\n20A\nC'}]).devices;assert.equal(ds[0].poles,'3LN');assert.equal(ds[0].kind,'LS');
});
