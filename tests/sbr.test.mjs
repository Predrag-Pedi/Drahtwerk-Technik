import test from 'node:test';
import assert from 'node:assert/strict';
import {SBR,configureSbr,sbrSnapshot} from '../offerten/sbr.mjs';
import {validateArticle} from '../offerten/articles.mjs';
import {offer,line,validateOffer} from '../offerten/core.mjs';
const template=()=>({article:'SBR-1',name:'Alu-Rahmen',type:SBR,minutes:30,rate:null,profiles:[{article:'VSAS-Q',name:'Querprofil',direction:'quer',pricePerM:10},{article:'VSAS-L',name:'Längsprofil',direction:'laengs',pricePerM:20}]});
test('Width and height convert mm to meters and count each profile independently',()=>{const c=configureSbr(template(),1000,2000,[3,2]);assert.equal(c.price,110);assert.deepEqual(c.rows.map(p=>p.totalMeters),[3,4]);assert.equal(configureSbr(template(),500,1200,[4,2]).price,68);});
test('Unused profile counts are allowed; missing dimensions, negative prices and fractional counts are rejected',()=>{assert.equal(configureSbr(template(),1000,2000,[0,2]).price,80);for(const args of [['',2000,[2,2]],[1000,0,[2,2]],[1000,2000,[0,0]],[1000,2000,[1.5,2]],[1000,2000,[]]])assert.throws(()=>configureSbr(template(),...args));const t=template();t.profiles[0].pricePerM='';assert.throws(()=>configureSbr(t,1000,2000,[2,2]));});
test('Dynamic article saves profile components instead of requiring a fixed material price',()=>{const a=validateArticle({...template(),price:'',source:'own',unit:'m'});assert.equal(a.price,0);assert.equal(a.unit,'Stk.');assert.equal(a.profiles.length,2);assert.throws(()=>validateArticle({...template(),profiles:[]}));});
test('Quote snapshot protects prices and applies labour, markup and frame quantity once',()=>{const t=template(),i={...sbrSnapshot(t,1000,2000,[3,2]),qty:2};t.profiles[0].pricePerM=999;assert.equal(i.sbr.template.profiles[0].pricePerM,10);const d=offer();d.rate=100;d.markup=10;assert.deepEqual(line(i,d),{unit:171,total:342});assert.match(i.name,/1000 × 2000/);});
test('Backup and restore retain an editable configuration',()=>{const d=offer();d.rate=100;d.plants[0].parts[0].items=[{...sbrSnapshot(template(),1000,2000,[3,2]),qty:1}];const restored=validateOffer(JSON.parse(JSON.stringify(d))).plants[0].parts[0].items[0];assert.equal(restored.price,110);assert.deepEqual(restored.sbr.counts,[3,2]);assert.equal(sbrSnapshot(restored.sbr.template,500,2000,[3,2]).price,95);});

import {offerItemName} from '../offerten/sbr.mjs';
import {offerText} from '../offerten/core.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
test('Depth and independent finishes survive offer backup without changing profile costs',()=>{
 const item={...sbrSnapshot(template(),1000,2000,[3,2],{depth:400,top:'Moosgummi',bottom:'Kabeleinführung mit PVC abgedeckt',pvc:'Transparent'}),qty:1};
 const d=offer();d.rate=100;d.plants[0].parts[0].items=[item];
 const restored=validateOffer(JSON.parse(JSON.stringify(d))).plants[0].parts[0].items[0];
 assert.equal(restored.sbr.depth,400);assert.equal(restored.sbr.top,'Moosgummi');assert.equal(restored.sbr.bottom,'Kabeleinführung mit PVC abgedeckt');assert.equal(restored.sbr.pvc,'Transparent');assert.equal(restored.price,110);
 assert.match(offerItemName(restored),/1000 × 2000 × 400/);
 for(const mode of ['detail','plant','summary'])for(const render of [offerText,offerHTML]){
 const text=render(d,mode);assert.match(text,/Moosgummi/);assert.match(text,/Transparent/);assert.doesNotMatch(text,/Querprofil|Längsprofil|VSAS-Q|VSAS-L/);
 }
});
test('Old SBR positions hide legacy profile descriptions without requiring new fields',()=>{
 const i={...sbrSnapshot(template(),1000,2000,[3,2]),qty:1};i.name+='\n3 × SECRET-PROFILE';
 const d=offer();d.rate=100;d.plants[0].parts[0].items=[i];
 for(const render of [offerText,offerHTML]){const text=render(d,'detail');assert.doesNotMatch(text,/SECRET-PROFILE|Querprofil|Längsprofil/);assert.match(text,/160.00/);}
});
test('Explicit invalid depth and unknown finishes are rejected',()=>{
 for(const options of [{depth:''},{depth:0},{depth:-1},{top:'falsch'},{bottom:'falsch'},{pvc:'falsch'}])assert.throws(()=>sbrSnapshot(template(),1000,2000,[3,2],options));
});
test('Build time overrides the template once per frame without changing the catalog',()=>{
 const t=template(),d=offer();d.rate=120;
 const i={...sbrSnapshot(t,1000,2000,[3,2],{minutes:90}),qty:2};
 assert.equal(t.minutes,30);assert.equal(i.minutes,90);assert.equal(i.sbr.template.minutes,90);
 assert.deepEqual(line(i,d),{unit:290,total:580});
 d.plants[0].parts[0].items=[i];
 const restored=validateOffer(JSON.parse(JSON.stringify(d))).plants[0].parts[0].items[0];
 assert.equal(restored.minutes,90);
 assert.equal(sbrSnapshot(restored.sbr.template,1200,2000,[3,2],restored.sbr).minutes,90);
 assert.equal(sbrSnapshot(t,1000,2000,[3,2],{minutes:0}).minutes,0);
 for(const minutes of ['',-1,Infinity,'abc'])assert.throws(()=>sbrSnapshot(t,1000,2000,[3,2],{minutes}));
});
