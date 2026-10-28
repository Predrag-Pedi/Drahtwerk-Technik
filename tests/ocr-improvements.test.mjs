import test from 'node:test';import assert from 'node:assert/strict';
import {parsePages} from '../waerme/core.mjs';import {ocrPage} from '../waerme/ocr.mjs';import {ocrCacheKey,renameCachedPages} from '../waerme/ocr-cache.mjs';
const page=text=>({file:'Schema_Lupinenweg 6, Zürich.pdf',number:1,text,ocr:true,ocrDeviceText:text});
test('Confirmed Lupinenweg symbols restore missing references and resolve stated devices once',()=>{
 const r=parsePages([page('26F2\n26F3\n26F4'),page('27F2\n27F5\n27K3'),page('38F2\n38F7\n38K7\n38K7'),page('43F7\n43F8')]);
 for(const ref of ['26F2','26F3','26F4','26F6','26F7']){const d=r.devices.find(x=>x.ref===ref);assert.deepEqual([d.kind,d.amp,d.ma,d.poles],['FILS',13,30,'LN']);}
 for(const [ref,kind] of [['27K3','TIMER'],['27K7','TIMER'],['27K5','CLOCK'],['27S7','CONTROL'],['38K4','CONTACTOR'],['38K7','CONTACTOR'],['43F7','LS'],['43F8','LS']])assert.equal(r.devices.find(x=>x.ref===ref).kind,kind);
 assert.equal(r.devices.filter(x=>x.ref==='38K7').length,1);
});
test('Confirmed symbol mapping cannot leak to another project or a single coincidental reference',()=>{const p=page('26F2\n26F3\n26F4');p.file='Other.pdf';assert.equal(parsePages([p]).devices.length,3);assert.equal(parsePages([page('26F2')]).devices.length,1);});
test('LSC and LSB labels identify LS independently of OCR and inline C40 supplies amperage',()=>{const r=parsePages([{file:'other.pdf',number:1,text:'43F7\nLSC\n6A\n38F2\nLSC C40\n38F7\nLSB 16A'}]);assert.deepEqual(r.devices.map(d=>[d.kind,d.amp]),[['LS',6],['LS',40],['LS',16]]);});
test('Labels above K references distinguish timer and clock in unrelated drawings',()=>{
 const word=(text,x,y)=>({text,confidence:95,bbox:{x0:x,y0:y,x1:x+30,y1:y+10}});
 const p=ocrPage({text:'',words:[word('Minuterie',100,100),word('81K1',100,200),word('AstroUhr',400,100),word('81K2',400,200)]},3);
 const r=parsePages([{...p,file:'unrelated.pdf',number:1}]);assert.deepEqual(r.devices.map(d=>d.kind),['TIMER','CLOCK']);
});
test('OCR cache uses content, not filename; rebinding a cached PDF does not alter stored sources',async()=>{const a=new Uint8Array([1,2,3]),b=new Uint8Array([1,2,4]);assert.equal(await ocrCacheKey(a),await ocrCacheKey(a.slice()));assert.notEqual(await ocrCacheKey(a),await ocrCacheKey(b));const p=[{file:'old.pdf',number:1,text:'test'}];assert.equal(renameCachedPages(p,'new.pdf')[0].file,'new.pdf');assert.equal(p[0].file,'old.pdf');});
