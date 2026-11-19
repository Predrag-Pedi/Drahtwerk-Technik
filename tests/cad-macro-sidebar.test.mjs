import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project,validateProject,duplicatePage,size} from '../cad/model.mjs';
import {validateTemplate,templateLabels} from '../cad/template.mjs';
import {macroAtPath,applyMacroValues,macroFields} from '../cad/macro-workflow.mjs';
import {deviceText} from '../cad/circuit-data.mjs';
import {svgPage} from '../cad/render.mjs';
import {DRAW,bounds,BUS} from '../cad/geometry.mjs';
const details=JSON.parse(fs.readFileSync(new URL('../cad/template-details.json',import.meta.url)));
function template(id='tl-0024'){const t=validateTemplate(JSON.parse(fs.readFileSync(new URL(`../cad/templates/${id}.json`,import.meta.url))));t.details=details[id];return t;}
function fixture(){const d=project(),p=d.pages[1];p.number=12;return {d,p,t:template()};}
test('path buttons insert complete LS and meter macros with matching automatic references',()=>{
 const {d,p,t}=fixture();for(const path of [2,4]){const e=macroAtPath(p,t,path);p.elements.push(e);assert.deepEqual(Object.values(templateLabels(e,p)),[`12F${path}`,`12X${path}`]);assert.equal(e.template.paths.length,t.paths.length);const [w,h]=size(e,p);for(const port of e.template.ports)assert.ok(Math.abs(e.y+port.y*h/e.template.viewHeight-BUS[port.phase])<.01);}
 const meter=macroAtPath(p,template('tl-0013'),7);p.elements.push(meter);assert.ok(Object.values(templateLabels(meter,p)).includes('12P7'));assert.equal(validateProject(d).pages[1].elements.length,3);
});
test('macro values are independent per insertion and survive export, restore and page copy',()=>{
 const {d,p,t}=fixture(),original=JSON.stringify(t),a=macroAtPath(p,t,2),b=macroAtPath(p,t,4,{values:{t8:'63A',t9:'D'}});p.elements.push(a,b);
 assert.match(deviceText(a,'1F7'),/25A/);assert.match(deviceText(b,'1F7'),/63A/);assert.match(svgPage(d,p),/>63A</);assert.equal(JSON.stringify(t),original);
 const restored=validateProject(JSON.parse(JSON.stringify(d)));assert.equal(restored.pages[1].elements[1].textEdits.t8,'63A');const copy=duplicatePage(restored,restored.pages[1]);assert.equal(copy.elements[1].textEdits.t8,'63A');assert.notEqual(Object.values(templateLabels(copy.elements[1],copy))[0],'12F4');
});
test('occupied paths are rejected without adding or moving existing drawings',()=>{
 const {p,t}=fixture();p.elements.push(macroAtPath(p,t,2));const before=JSON.stringify(p);assert.throws(()=>macroAtPath(p,t,2),/überschneidet/);assert.equal(JSON.stringify(p),before);assert.throws(()=>macroAtPath(p,template('tl-0013'),2),/überschneidet/);
});
test('edge paths and chosen scale keep complete macros on the sheet',()=>{
 for(const path of[0,9])for(const percent of[70,100]){const {p,t}=fixture(),e=macroAtPath(p,t,path,{percent}),b=bounds(e,...size(e,p));assert.ok(b.left>=DRAW.left-.001&&b.right<=DRAW.right+.001&&b.bottom<=DRAW.bottom+.001);assert.equal(templateLabels(e,p)['1F7'],`12F${path}`);assert.equal(e.width,t.width*percent/100);}
});
test('manual placement receives the same edits, empty text is valid, and keys are checked',()=>{
 const {p,t}=fixture(),e=macroAtPath(p,t,2);applyMacroValues(e,{t8:'',t9:'B'});assert.equal(e.textEdits.t8,'');assert.throws(()=>applyMacroValues(e,{'bmk:1F7':'unexpected'}),/Ungültig/);assert.throws(()=>applyMacroValues(e,{t8:'a'.repeat(2001)}),/Ungültig/);
});
test('macro controls expose actual attributes without terminal pin numbers',()=>{
 const fields=macroFields(template());assert.equal(fields.find(f=>f.key==='t8').label,'Bemessungsstrom');assert.equal(fields.find(f=>f.key==='t9').label,'Charakteristik');assert.ok(!fields.some(f=>f.key==='t0'));assert.ok(fields.some(f=>f.label==='Kabel'));
});
test('invalid paths, non-schema pages and oversized macros cannot silently place elsewhere',()=>{
 const {p,t}=fixture();for(const path of[-1,10,.5])assert.throws(()=>macroAtPath(p,t,path),/Strompfad/);assert.throws(()=>macroAtPath({...p,type:'dispo'},t,2),/Schema/);assert.throws(()=>macroAtPath(p,t,2,{percent:0}),/Symbolgrösse/);assert.throws(()=>macroAtPath(p,t,2,{percent:200}),/passt/);
});
