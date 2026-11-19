import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {protectionArticles,articleById,compatibleArticles,matchingArticles,articleForFunction,preferredArticle} from '../cad/protection-catalog.mjs';
import {protectionFields} from '../cad/protection-fields.mjs';
import {createMacroDraft,initializeMacroArticles,selectMacroArticle,validateMacroArticles,applyMacroDraft,setMacroValue} from '../cad/macro-config.mjs';
import {macroAtPath} from '../cad/macro-workflow.mjs';
import {project,validateProject,duplicatePage} from '../cad/model.mjs';
import {applyDrawingText} from '../cad/text-edit.mjs';
import {reportRows} from '../cad/schema-assembly.mjs';
import {schemaDevices} from '../cad/dispo.mjs';
import {protectionKind} from '../cad/circuit-data.mjs';
const details=JSON.parse(fs.readFileSync(new URL('../cad/template-details.json',import.meta.url)));
const template=id=>{const t=JSON.parse(fs.readFileSync(new URL(`../cad/templates/${id}.json`,import.meta.url)));return {...t,details:structuredClone(details[id]||t.details)};};
test('catalogue stores source-backed article tuples, including uncommon currents and distinct fault-current types',()=>{
 assert.equal(new Set(protectionArticles.map(a=>a.id)).size,protectionArticles.length);assert.ok(protectionArticles.length>=600);
 for(const a of protectionArticles){assert.ok(a.current>0&&a.article&&a.source&&(a.eldas||a.manufacturer==='abb'||['eaton','siemens'].includes(a.manufacturer)),a.id);assert.match(a.poles,/^[1-4]P(?:\+N)?$/);if(a.kind==='fi'){assert.equal(a.curve,undefined);assert.equal(a.icn,undefined);}else assert.match(a.curve,/^[BCDEKZ]$/);if(a.kind!=='ls')assert.ok(a.residual>0&&a.rcdType);}
 const h=articleById('hager:ACA913C');assert.deepEqual([h.current,h.curve,h.residual,h.rcdType,h.icn],[13,'C',10,'A',6]);
 assert.equal(articleById('hager:CPA640C').selective,true);assert.equal(articleById('schneider:A9R31480').current,80); // live feature, not erroneous 63 A list caption
 assert.equal(articleById('schneider:A9P54732').icu,10);assert.equal(articleById('schneider:A9P54732').icn,6);
 assert.equal(articleById('hager:HMC199').icu,15);assert.equal(articleById('hager:HMC199').icn,undefined);
});
test('FI, FI/LS and LS have independent legal combinations; 3P+N and protected 4P are not interchangeable',()=>{
 const fi=protectionFields(template('tl-0195'))[0],fils=protectionFields(template('tl-0032'))[0],ls=protectionFields(template('tl-0025'))[0];
 assert.deepEqual([fi.kind,fils.kind,ls.kind],['fi','fils','ls']);assert.ok(!compatibleArticles(fi).some(a=>a.current===13));
 assert.ok(!compatibleArticles(fils).some(a=>a.current===63||a.curve==='Z'));assert.ok(compatibleArticles(ls).some(a=>a.current===32&&a.curve==='D'));
 const three=protectionFields(template('tl-0028'))[0];assert.ok(!compatibleArticles(three).some(a=>a.id==='hager:ADM463C'));
 assert.ok(!matchingArticles(template('tl-0032'),fils,{t4:'32A',t5:'10mA',t6:'D',t7:'A'}).length);
});
test('switching article imports current, curve, residual and type together; cable override remains independent',()=>{
 const t=template('tl-0032'),d=initializeMacroArticles(t,createMacroDraft(t));assert.equal(d.articles['4F1'],'schneider:A9DC3613');
 selectMacroArticle(t,d,'4F1','hager:ACA963C');assert.deepEqual([d.values.t4,d.values.t5,d.values.t6,d.values.t7],['13A','10mA','B','A']);
 setMacroValue(t,d,'t9','TT 3x10mm²');selectMacroArticle(t,d,'4F1','schneider:A9DC3625');assert.equal(d.values.t4,'25A');assert.equal(d.values.t9,'TT 3x10mm²');assert.equal(d.values.t10,'10mm²');
 setMacroValue(t,d,'t4','125A');assert.throws(()=>validateMacroArticles(t,d),/Katalogartikel/);
 assert.throws(()=>selectMacroArticle(t,d,'4F1','schneider:A9R21425'),/Polzahl/);
});
test('mixed macros bind each protection function and its poles independently',()=>{
 const w=template('tl-0050'),profiles=protectionFields(w);assert.equal(profiles.length,2);assert.ok(profiles.every(p=>p.poles==='1P+N'));
 const t=template('tl-0104'),d=initializeMacroArticles(t,createMacroDraft(t));selectMacroArticle(t,d,'F1205','schneider:A9DC3725');assert.equal(d.values.t21,'25A');assert.equal(d.values.t47,'16A');assert.equal(d.values.t3,'5x6mm²');assert.equal(d.values.t29,'5x2.5mm²');
 for(const id of ['tl-0043','tl-0059','tl-0070','tl-0072']){const p=protectionFields(template(id))[0];assert.equal(p.poles,'1P+N',id);assert.equal(p.fields.voltage,undefined,'unrelated control voltage must not change');}
 const na=protectionFields(template('tl-0098'));assert.deepEqual(na.map(p=>[p.key,p.kind,p.poles]),[['120F5','ls','1P+N'],['120F9','ls','3P+N']]);
});
test('FI templates fill placeholders and are classified as FI rather than fuse or FI/LS',()=>{
 const t=template('tl-0196'),draft=initializeMacroArticles(t,createMacroDraft(t));selectMacroArticle(t,draft,'F','schneider:A9R25463');const e={template:t,functions:{},textEdits:{}};applyMacroDraft(e,draft);
 assert.equal(e.textEdits.t11,'63A');assert.equal(e.textEdits.t12,'300mA');assert.equal(e.textEdits.t14,'A9R25463');assert.equal(protectionKind(e,'F'),'fi');assert.equal(articleForFunction(e,'F').selective,true);
});
test('article identity and all specifications survive insertion, backup, copy, device list and disposition extraction',()=>{
 const d=project(),p=d.pages[1],t=template('tl-0028'),draft=initializeMacroArticles(t,createMacroDraft(t));draft.names['3F1']='Werkstatt';selectMacroArticle(t,draft,'3F1','schneider:A9DF3725');const e=macroAtPath(p,t,2,{draft});p.elements.push(e);
 const restored=validateProject(JSON.parse(JSON.stringify(d)));const copy=duplicatePage(restored,restored.pages[1]);assert.equal(articleForFunction(copy.elements[0],'3F1').id,'schneider:A9DF3725');
 const device=schemaDevices(d).devices.find(x=>x.source.key==='3F1');assert.equal(device.current,25);assert.equal(device.protectionArticle.rcdType,'A-SI');assert.equal(device.protectionArticle.modules,5);
 const report=reportRows(d,'devices');assert.ok(report.some(row=>row.includes('A9DF3725')&&row.includes('Werkstatt')));
 assert.throws(()=>applyDrawingText(d,p,e,'t0','100A'),/Katalogartikel/);applyDrawingText(d,p,e,'t12','Küche');assert.equal(e.functions['3F1'].description,'Küche');
 e.textEdits.t0='100A';assert.equal(articleForFunction(e,'3F1'),null); // tampered text must never remain verified
});
test('all original macros can be inspected without inventing a match for unsupported original values',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../cad/templates/catalog.json',import.meta.url)));let covered=0,unmatched=0;
 for(const item of catalog.items.filter(t=>t.category==='Schema'&&/^Makros\//.test(t.source))){const t=template(item.id),d=initializeMacroArticles(t,createMacroDraft(t));for(const p of protectionFields(t)){covered++;if(d.articles[p.key])assert.ok(matchingArticles(t,p,d.values).some(a=>a.id===d.articles[p.key]),item.name);else unmatched++;}}
 assert.ok(covered>40);assert.ok(unmatched<20);
});
test('new drafts are neutral and explicit manufacturer binding can be removed without losing electrical values',()=>{
 const t=template('tl-0032'),d=initializeMacroArticles(t,createMacroDraft(t)),e={template:t};assert.equal(d.manufacturerBound['4F1'],false);applyMacroDraft(e,d);
 assert.equal(articleForFunction(e,'4F1'),null);assert.equal(e.functions['4F1'].manufacturer,'auto');assert.ok(e.functions['4F1'].protectionSpecId);
 selectMacroArticle(t,d,'4F1','hager:ADA920C');applyMacroDraft(e,d);assert.equal(articleForFunction(e,'4F1').article,'ADA920C');
 selectMacroArticle(t,d,'4F1','hager:ADA920C',{bind:false});applyMacroDraft(e,d);assert.equal(e.functions['4F1'].protectionArticleId,undefined);assert.equal(e.functions['4F1'].manufacturer,'auto');assert.equal(e.textEdits.t4,'20A');
 const doc=project();doc.pages[1].elements.push(macroAtPath(doc.pages[1],t,1,{draft:d}));const restored=validateProject(JSON.parse(JSON.stringify(doc)));assert.equal(restored.pages[1].elements[0].functions['4F1'].protectionSpecId,'hager:ADA920C');
 const rows=reportRows(restored,'devices');assert.ok(!rows.some(row=>row.includes('ADA920C')));
});
test('neutral FI clears a previously selected SKU field and preserves manual cable text',()=>{
 const t=template('tl-0196'),d=initializeMacroArticles(t,createMacroDraft(t)),e={template:t};selectMacroArticle(t,d,'F','schneider:A9R25463');applyMacroDraft(e,d);assert.equal(e.textEdits.t14,'A9R25463');
 selectMacroArticle(t,d,'F','schneider:A9R25463',{bind:false});applyMacroDraft(e,d);assert.equal(e.textEdits.t14,'');assert.equal(e.textEdits.t11,'63A');assert.equal(e.functions.F.protectionArticleId,undefined);
});
test('additional video variants have exact manufacturer evidence and retain their polarity',()=>{
 for(const curve of ['K','Z'])assert.ok(compatibleArticles({kind:'ls',poles:'1P+N'}).some(a=>a.curve===curve));
 assert.equal(articleById('hager:HTN620E').curve,'E');assert.equal(articleById('hager:HTN620E').poles,'3P+N');
 assert.ok(compatibleArticles({kind:'fils',poles:'1P+N'}).some(a=>a.current===4));
 assert.ok(compatibleArticles({kind:'fils',poles:'1P+N'}).some(a=>a.rcdType==='F'));
 assert.equal(articleById('eaton:168276').curve,'D');assert.equal(articleById('hager:AEX466C').residual,100);
 assert.equal(articleById('schneider:A9Z61440').rcdType,'B-SI');assert.equal(articleById('schneider:A9Z51440').rcdType,'B-EV');
 assert.ok(compatibleArticles({kind:'fi',poles:'3P+N'}).some(a=>a.rcdType==='F'));
});
