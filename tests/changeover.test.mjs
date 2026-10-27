import test from 'node:test';import assert from 'node:assert/strict';import {parsePages,suggestArticle} from '../waerme/core.mjs';
const page=(number,text)=>({file:'test.pdf',number,text});
const catalog=[{kind:'CONTACTOR',code:'ESC425S',amp:25,pv:8.8},{kind:'CONTACTOR',code:'ESC225S',amp:25,pv:5.2}];
test('Changeover contacts before a coil page count once and choose Hager 25 A 4S',()=>{
 const a=page(1,'11\n12 14\n41K4'),b=page(2,'A1\nA2\n41K4\n11\n14\n12');
 for(const pages of [[a,b],[b,a]]){const ds=parsePages(pages).devices;assert.equal(ds.length,1);assert.equal(ds[0].kind,'CONTACTOR');assert.equal(ds[0].poles,'4S');assert.equal(suggestArticle(ds[0],catalog).code,'ESC425S');}
});
test('Earlier unclassified contact is enriched by a later coil rather than dropped',()=>{
 const ds=parsePages([page(1,'52K3\n21\n22'),page(2,'A1\nA2\n52K3')]).devices;assert.equal(ds.length,1);assert.equal(ds[0].kind,'CONTACTOR');assert.equal(suggestArticle(ds[0],catalog).code,'ESC425S');
});
test('Known timers are not replaced by the contactor fallback',()=>{
 for(const pages of [[page(1,'61K5\nMinuterie'),page(2,'A1\nA2\n61K5\n11\n12\n14')],[page(2,'A1\nA2\n61K5\n11\n12\n14'),page(1,'61K5\nMinuterie')]])assert.equal(parsePages(pages).devices[0].kind,'TIMER');
});
