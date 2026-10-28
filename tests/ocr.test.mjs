import test from 'node:test';import assert from 'node:assert/strict';
import {needsOcr,ocrPage} from '../waerme/ocr.mjs';import {parsePages} from '../waerme/core.mjs';import {buildPortfolio} from '../waerme/portfolio.mjs';
const word=(text,x,y,confidence=90)=>({text,confidence,bbox:{x0:x,y0:y,x1:x+30,y1:y+10}});
test('Grid-only text triggers OCR, readable schema text does not',()=>{assert.equal(needsOcr('123456789ABCDEF'.split('').map(str=>({str}))),true);assert.equal(needsOcr([{str:'F302'},{str:'16A'}]),false);assert.equal(needsOcr(['Datum','Kunde','Auftrag','Verteilung'].map(str=>({str}))),false);});
test('OCR associates ratings with each reference spatially, not with the next column',()=>{
 const data={text:'27F2 27F5 FI-LSC FI-LSC 13A/30mA 16A/30mA',words:[word('27F2',100,100),word('27F5',400,100),word('FI-LSC',100,130),word('FI-LSC',400,130),word('13A/30mA',100,160),word('16A/30mA',400,160)]};
 const page={...ocrPage(data,3),file:'outline.pdf',number:1};const r=parsePages([page]);assert.deepEqual(r.devices.map(d=>[d.ref,d.kind,d.amp,d.ma]),[['27F2','FILS',13,30],['27F5','FILS',16,30]]);assert.ok(r.warnings.some(w=>w.includes('Texterkennung')));
});
test('Low-confidence references are not silently converted to certain devices',()=>{const p=ocrPage({text:'12F3',words:[word('12F3',100,100,12)]},3);assert.equal(p.ocrDeviceText,'');assert.equal(parsePages([{...p,file:'test.pdf',number:1}]).devices.length,0);});
test('Matching street filenames plus overlapping devices link outlined schema and disposition',()=>{
 const make=(file,text)=>({file,pages:[{file,number:1,text,items:[]}]});const layout=make('2026-09-28_HV Musterweg 6.pdf','Dispo\n12F2\n12F3\n13F2\nAlu-Selbstbaurahmen\nB1508/1258x H1920x T165mm');
 const schema=make('Schema_Musterweg 6-Kopieren.pdf','12F2\n25A\n12F3\n13A\nC\n13F2\n25A');const r=buildPortfolio([layout,schema]);assert.equal(r.pending.length,0);assert.equal(r.plants[0].devices.length,3);assert.notEqual(r.plants[0].name,'13F2');
});
