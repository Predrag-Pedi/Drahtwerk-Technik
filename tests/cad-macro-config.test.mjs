import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {macroFields,macroBindings,outgoingFields,createMacroDraft,setMacroValue,applyMacroDraft,sectionForCurrent,parseCable,cableWithSection,terminalForCable,extraTerminalSections} from '../cad/macro-config.mjs';
import {macroAtPath} from '../cad/macro-workflow.mjs';
import {project,validateProject,duplicatePage} from '../cad/model.mjs';
import {svgPage} from '../cad/render.mjs';
const details=JSON.parse(fs.readFileSync(new URL('../cad/template-details.json',import.meta.url)));
const template=(id='tl-0028')=>({...JSON.parse(fs.readFileSync(new URL(`../cad/templates/${id}.json`,import.meta.url))),details:structuredClone(details[id])});
test('Drahtwerk table is transcribed exactly without guessing unspecified ratings',()=>{
 for(const [a,mm] of [[8,1],[10,1.5],[13,1.5],[16,2.5],[20,4],[25,6],[32,10],[40,10],[63,16],[80,25],[100,35],[125,50],[160,70],[200,95],[250,120],[280,150],[315,185]])assert.equal(sectionForCurrent(a+'A'),mm);
 for(const a of [0,6,50,300,400])assert.equal(sectionForCurrent(a),null);
 assert.equal(sectionForCurrent(6,{control:true}),.75);assert.equal(sectionForCurrent(8,{control:true}),1);
});
test('power cable parsing preserves type and core count; data-cable diameters are excluded',()=>{
 assert.equal(cableWithSection('FE0 5x1.5mm2',4),'FE0 5x4mm2');assert.equal(cableWithSection('GKN 4x1x120mm²',185),'GKN 4x1x185mm²');
 assert.equal(cableWithSection('TT 3G2,5 mm²',6),'TT 3G6 mm²');assert.equal(parseCable('G51 2x2x0.8mm'),null);
 assert.equal(terminalForCable('TT 3x1.5mm²'),2.5);assert.equal(terminalForCable('5x0.75mm²'),2.5);assert.equal(terminalForCable('5x5mm²'),6);
});
test('current buttons update only the associated cable and never reduce terminals below 2.5',()=>{
 const t=template(),draft=createMacroDraft(t);assert.equal(draft.values.t14,'2.5mm²');
 for(const [a,mm] of [[16,2.5],[20,4],[25,6],[32,10],[40,10],[63,16],[13,1.5]]){setMacroValue(t,draft,'t0',a+'A');assert.equal(draft.values.t13,`FE0 5x${mm}mm2`);assert.equal(draft.values.t14,Math.max(2.5,mm)+'mm²');}
});
test('manual cable overrides survive later current changes and switching drafts; Auto opts back in',()=>{
 const t=template(),draft=createMacroDraft(t);setMacroValue(t,draft,'t0','20A');setMacroValue(t,draft,'t13','TT 3G10mm²');setMacroValue(t,draft,'t0','63A');assert.equal(draft.values.t13,'TT 3G10mm²');assert.equal(draft.values.t14,'10mm²');
 const saved=createMacroDraft(t,draft);setMacroValue(t,saved,'t0','80A');assert.equal(saved.values.t13,'TT 3G10mm²');assert.equal(draft.values.t0,'63A');
 setMacroValue(t,saved,'t13',saved.values.t13,{automatic:true});assert.equal(saved.values.t13,'TT 3G25mm²');assert.equal(saved.values.t14,'25mm²');
});
test('multiple outgoing circuits and NA protection keep independent current/cable associations',()=>{
 const t=template('tl-0104'),draft=createMacroDraft(t);setMacroValue(t,draft,'t21','25A');assert.equal(draft.values.t3,'5x6mm²');assert.equal(draft.values.t29,'5x2.5mm²');
 const h=template('tl-0098'),hd=createMacroDraft(h);setMacroValue(h,hd,'t21','32A');assert.equal(hd.values.t56,'FE0 5x50mm²');setMacroValue(h,hd,'t14','160A');assert.equal(hd.values.t56,'FE0 5x70mm²');
 const w=template('tl-0050'),wd=createMacroDraft(w);setMacroValue(w,wd,'t53','20A');assert.equal(wd.values.t32,'TT 3x4mm2');assert.equal(wd.values.t33,'4mm²');assert.equal(wd.values.t42,'TT 3x1.5mm2');
});
test('WZU data cables and ambiguous CT outgoing cable are never rewritten by unrelated fuse changes',()=>{
 const w=template('tl-0046'),wd=createMacroDraft(w);setMacroValue(w,wd,'t31','20A');assert.equal(wd.values.t92,undefined);
 const t=template('tl-0016'),d=createMacroDraft(t);setMacroValue(t,d,'t19','32A');setMacroValue(t,d,'t20','200A');assert.equal(d.values.t33,undefined);assert.equal(macroBindings(t)[0].currentKey,null);
});
test('outgoing name, cable and terminal size survive insertion, copy, backup and export without changing geometry',()=>{
 const d=project(),p=d.pages[1],t=template(),original=JSON.stringify(t),draft=createMacroDraft(t);draft.names['3F1']='Küche – Steckdosen';setMacroValue(t,draft,'t0','20A');
 const e=macroAtPath(p,t,2,{draft}),plain=macroAtPath(p,t,2);p.elements.push(e);
 assert.deepEqual([e.x,e.y,e.width,e.height],[plain.x,plain.y,plain.width,plain.height]);assert.equal(JSON.stringify(t),original);assert.equal(e.functions['3F1'].description,'Küche – Steckdosen');assert.equal(e.functions['3X1'].terminalSection,4);
 assert.equal(e.circuitName,undefined); // an outlet name must not create a new supply group
 const svg=svgPage(d,p);assert.equal((svg.match(/Küche – Steckdosen/g)||[]).length,1);assert.match(svg,/>4mm²</);assert.match(svg,/FE0 5x4mm2/);
 const restored=validateProject(JSON.parse(JSON.stringify(d))),copy=duplicatePage(restored,restored.pages[1]);assert.equal(copy.elements[0].functions['3F1'].description,'Küche – Steckdosen');assert.equal(copy.elements[0].functions['3X1'].terminalSection,4);
});
test('terminal annotation is added where source has none, but not duplicated over existing size texts',()=>{
 const t=template('tl-0104'),draft=createMacroDraft(t),d=project(),p=d.pages[1];setMacroValue(t,draft,'t21','25A');const e=macroAtPath(p,t,4,{draft});p.elements.push(e);assert.deepEqual(extraTerminalSections(e).map(s=>s.section),[6,2.5]);assert.match(svgPage(d,p),/>6 mm²</);validateProject(d);
 const original=template(),e2=macroAtPath(project().pages[1],original,2,{draft:createMacroDraft(original)});assert.deepEqual(extraTerminalSections(e2),[]);
});
test('catalogue drafts and metadata remain valid for all original schema macros',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../cad/templates/catalog.json',import.meta.url)));let count=0;
 for(const item of catalog.items.filter(t=>t.category==='Schema'&&/^Makros\//.test(t.source))){const t=template(item.id),draft=createMacroDraft(t),d=project(),p=d.pages[1];const e={id:'audit',kind:'template',template:t,x:100,y:100,width:t.width,height:t.height,rotation:0,tag:'',value:'',text:'',targetPage:'',targetPath:0,dashed:false};applyMacroDraft(e,draft);p.elements.push(e);assert.doesNotThrow(()=>validateProject(d),item.name);count++;}
 assert.equal(count,106);
});
test('later double-click and inspector edits keep the outgoing name and function data in sync',async()=>{
 const {applyDrawingText}=await import('../cad/text-edit.mjs'),{updateFunction,functionData}=await import('../cad/references.mjs');
 const d=project(),p=d.pages[1],t=template(),draft=createMacroDraft(t);draft.names['3F1']='Küche';const e=macroAtPath(p,t,2,{draft});p.elements.push(e);
 applyDrawingText(d,p,e,'t12','Garage');assert.equal(e.functions['3F1'].description,'Garage');
 updateFunction(d,{page:p,element:e,key:'3F1',data:functionData(e,'3F1')},{description:'Keller'});assert.equal(e.textEdits.t12,'Keller');assert.equal((svgPage(d,p).match(/Keller/g)||[]).length,1);
 assert.throws(()=>applyDrawingText(d,p,e,'t12','x'.repeat(201)));validateProject(d);
});
