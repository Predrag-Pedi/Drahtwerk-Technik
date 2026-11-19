import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project,createElement,validateProject} from '../cad/model.mjs';
import {functionBmk,functionKeys,assignContact,allFunctions} from '../cad/references.mjs';
import {drawingText,applyDrawingText} from '../cad/text-edit.mjs';
import {elementMarkup} from '../cad/render.mjs';
import {placement} from '../cad/placement.mjs';
import {validateTemplate,enrichedDetails} from '../cad/template.mjs';
const fixture=()=>{const d=project(),p=d.pages[1],t=validateTemplate(JSON.parse(fs.readFileSync(new URL('../cad/templates/tl-0021.json',import.meta.url))));t.details=enrichedDetails(t.id,JSON.parse(fs.readFileSync(new URL('../cad/template-details.json',import.meta.url)))[t.id]);const e=placement(p,'template',{x:200,y:100},true,0,t);p.elements.push(e);return {d,p,e};};
test('direct BMK editing roundtrips, renders in export and resets without moving the macro',()=>{
 const {d,p,e}=fixture(),key='bmk:'+functionKeys(e)[0],before=[e.x,e.y,e.width,e.height],automatic=drawingText(d,p,e,key).value;
 applyDrawingText(d,p,e,key,'TEST-F1');assert.equal(drawingText(d,p,e,key).value,'TEST-F1');
 assert.match(elementMarkup(e,p,d),/>TEST-F1<\/text>/);
 const saved=validateProject(JSON.parse(JSON.stringify(d))),ep=saved.pages[1].elements[0];assert.equal(drawingText(saved,saved.pages[1],ep,key).value,'TEST-F1');
 applyDrawingText(d,p,e,key,'ignored',{reset:true});assert.equal(drawingText(d,p,e,key).value,automatic);assert.deepEqual([e.x,e.y,e.width,e.height],before);
});
test('direct template text edits and original reset retain other fields and geometry',()=>{
 const {d,p,e}=fixture(),key=e.template.details.texts[0].key,original=drawingText(d,p,e,key).value,before=structuredClone(e.template);
 applyDrawingText(d,p,e,key,'16A');assert.equal(drawingText(d,p,e,key).value,'16A');assert.match(elementMarkup(e,p,d),/>16A<\/text>/);assert.deepEqual(e.template,before);
 applyDrawingText(d,p,e,key,'',{reset:true});assert.equal(drawingText(d,p,e,key).value,original);
 assert.throws(()=>applyDrawingText(d,p,e,'unknown','x'));assert.throws(()=>applyDrawingText(d,p,e,key,'x'.repeat(2001)));
});
test('native BMK edits update assigned contacts and native text fields remain separately editable',()=>{
 const d=project(),p=d.pages[1],coil=createElement(p,'coil',200,200),contact=createElement(p,'contact',350,200);p.elements.push(coil,contact);
 assignContact(d,allFunctions(d).find(f=>f.element.id===contact.id),allFunctions(d).find(f=>f.element.id===coil.id));
 applyDrawingText(d,p,coil,'bmk:$','K_CUSTOM');assert.equal(functionBmk(d,p,contact),'K_CUSTOM');
 assert.match(drawingText(d,p,contact,'bmk:$').hint,/aller seiner Kontakte/);applyDrawingText(d,p,contact,'bmk:$','K_UPDATED');assert.equal(functionBmk(d,p,coil),'K_UPDATED');assert.equal(functionBmk(d,p,contact),'K_UPDATED');
 assert.throws(()=>applyDrawingText(d,p,coil,'bmk:$','x'.repeat(201)));validateProject(d);
 applyDrawingText(d,p,coil,'field:value','24 V');applyDrawingText(d,p,coil,'field:text','Pumpe');
 const svg=elementMarkup(coil,p,d,true);assert.match(svg,/data-element-text="bmk:\$"/);assert.match(svg,/data-element-text="field:value"/);assert.match(svg,/data-element-text="field:text"/);
 assert.match(elementMarkup(coil,p,d),/>Pumpe<\/text>/);assert.doesNotMatch(elementMarkup(coil,p,d),/data-element-text=/);
});
