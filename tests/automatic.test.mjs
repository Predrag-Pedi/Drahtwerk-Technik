import test from 'node:test';import assert from 'node:assert/strict';
import {parseOrder,assignFields,moduleUnits} from '../waerme/portfolio.mjs';
import {parsePages,suggestArticle} from '../waerme/core.mjs';
test('PL comes from customer recipient; issuer and absent surnames are never used',()=>{
 const order=text=>parseOrder({pages:[{text}]});
 assert.equal(order('Kunde AG\nIhr Ansprechpartner:\nNeziri Djevat\nGuten Tag Fabio Beispiel').pl,'Fabio Beispiel');
 assert.equal(order('Kunde AG\nHerr Fabio Beispiel\nGuten Tag Fabio\nIhr Ansprechpartner:\nNeziri Djevat').pl,'Fabio Beispiel');
 assert.equal(order('Kunde AG\nIhr Ansprechpartner:\nNeziri Djevat').pl,'');
 assert.equal(order('Kunde AG\nGuten Tag Fabio').pl,'');
 assert.equal(order('Datum: 17.09.2026\nKundennummer: 001268').customerNo,'001268');
});
test('Hager contactor selection uses poles/current, defaulting to 25 A 4S when absent',()=>{
 const cat=[2,4].flatMap(p=>[25,40,63].map(amp=>({kind:'CONTACTOR',amp,code:`ESC${p}${amp}S`})));
 assert.equal(suggestArticle({kind:'CONTACTOR'},cat).code,'ESC425S');
 assert.equal(suggestArticle({kind:'CONTACTOR',amp:32,contacts:'2S'},cat).code,'ESC240S');
 assert.equal(suggestArticle({kind:'CONTACTOR',amp:63,contacts:'4S'},cat).code,'ESC463S');
 assert.equal(suggestArticle({kind:'CONTACTOR',amp:80},cat),undefined);
});
test('Normal kWh meter excluded, explicitly private meter retained',()=>{
 const ds=parsePages([{file:'test.pdf',number:1,text:'15F2\n25A\n15P2.2\nDVH4013\nkWh\n22Y3\nPrivatzähler'}]).devices;
 assert.equal(ds.some(d=>d.ref==='15P2.2'),false);assert.equal(ds.find(d=>d.ref==='22Y3').kind,'METER');assert.equal(ds[0].kind,'FUSE');
});
test('Dispo positions take priority; remaining modules are distributed to every valid field',()=>{
 assert.deepEqual([{kind:'LS',poles:'LN'},{kind:'LS',poles:'3LN'},{kind:'FILS',poles:'LN'},{kind:'FILS',poles:'3LN'}].map(moduleUnits),[1,3,2,4]);
 const ds=Array.from({length:12},(_,i)=>({ref:`${i}F1`,kind:'LS',poles:'LN',qty:1}));
 const page={height:1000,items:[{str:'1000',x:100,y:100},{str:'500',x:300,y:100}]};
 assignFields(ds,[{b:1000},{b:500}],page,new Map([['0F1',[310]]]));
 assert.equal(ds[0].field,2);assert.equal(ds[0].fieldMethod,'dispo');assert.ok(ds.every(d=>[1,2].includes(d.field)));
 assert.deepEqual([1,2].map(f=>ds.filter(d=>d.field===f).length),[8,4]);
 const three=Array.from({length:9},(_,i)=>({ref:String(i),kind:'FILS',poles:'3LN',qty:1}));assignFields(three,[{b:500},{b:500},{b:500}],null);assert.deepEqual([1,2,3].map(f=>three.filter(d=>d.field===f).length),[3,3,3]);
});
