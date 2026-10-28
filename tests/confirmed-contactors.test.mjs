import test from 'node:test';import assert from 'node:assert/strict';
import {parsePages,suggestArticle} from '../waerme/core.mjs';
const page=(text,number=1,file='Schema_Lupinenweg 6, Zürich.pdf')=>({file,number,text,ocr:true,ocrDeviceText:text});
const article={kind:'CONTACTOR',code:'ESC425S',pv:8.8};
test('38K4 resolves even when neighbouring fuse references are unreadable',()=>{const r=parsePages([page('38K4')]);assert.equal(r.devices.length,1);assert.equal(r.devices[0].kind,'CONTACTOR');assert.equal(suggestArticle(r.devices[0],[article]),article);});
test('Five actual contactors in sheet 53 are counted, never an invented continuous range',()=>{for(const text of ['53K1\n53K3\n53K5\n53K7\n53K8','53K1\n53K3\n53K7']){const r=parsePages([page(text)]);assert.deepEqual(r.devices.map(d=>d.ref).sort(),['53K1','53K3','53K5','53K7','53K8']);assert.ok(r.devices.every(d=>d.qty===1&&suggestArticle(d,[article])===article));}});
test('Repeated depictions cannot replace a confirmed contactor with surrounding clock text',()=>{const a=page('38K4\nSchaltuhr'),b=page('38K4',2);for(const pages of [[a,b],[b,a]]){const r=parsePages(pages);assert.equal(r.devices.length,1);assert.equal(r.devices[0].kind,'CONTACTOR');}});
test('Renamed drawing uses project address plus project number; unrelated projects do not inherit defaults',()=>{const p=page('38K4',2,'schema.pdf');assert.equal(parsePages([page('Lupinenweg\n6\n2582',1,'schema.pdf'),p]).devices[0].kind,'CONTACTOR');assert.equal(parsePages([p]).devices[0].kind,'OTHER');assert.equal(parsePages([page('Lupinenweg 60\n2582',1,'schema.pdf'),p]).devices[0].kind,'OTHER');});
test('Cached raw OCR text can recover references filtered from low-confidence device text',()=>{const p=page('53K1\n53K3\n53K5\n53K7\n53K8');p.ocrDeviceText='53K1';assert.equal(parsePages([p]).devices.length,5);});

test('Sheet title and WZU recover badly read row labels without creating missing sequence numbers',()=>{const r=parsePages([page('53K7\n53/56\n13-WZU\nWohnung 1')]);assert.deepEqual(r.devices.map(d=>d.ref).sort(),['53K1','53K3','53K5','53K7','53K8']);});
