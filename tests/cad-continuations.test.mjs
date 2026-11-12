import test from 'node:test';
import assert from 'node:assert/strict';
import {project,page,createElement,validateProject,endpoint} from '../cad/model.mjs';
import {inheritBus,connect,referenceText,connectionCandidates,linked} from '../cad/continuations.mjs';
import {svgPage} from '../cad/render.mjs';
import {pathHash} from '../cad/template-text.mjs';
import {validateTemplate,templateMarkup} from '../cad/template.mjs';

test('bus continuation has reciprocal references and follows renumbering',()=>{
 const d=project(),a=d.pages[1],b=page('schema',11);d.pages.push(b);inheritBus(d,a,b);
 assert.equal(d.links.length,4);const from={page:a.id,kind:'bus',side:'right',phase:'L1'},to={page:b.id,kind:'bus',side:'left',phase:'L1'};
 assert.equal(referenceText(d,from),'11.0');assert.equal(referenceText(d,to),'10.9');b.number=25;assert.equal(referenceText(d,from),'25.0');
 const copy=validateProject(JSON.parse(JSON.stringify(d)));assert.equal(copy.links.length,4);assert.match(svgPage(copy,copy.pages[1]),/25\.0/);assert.doesNotMatch(svgPage(copy,copy.pages[1]),/data-connection/);
 d.pages=d.pages.filter(p=>p!==b);assert.equal(referenceText(d,from),'Ziel fehlt');
});
test('wire ends can link to a new point; mismatch is rejected and reconnect is reciprocal',()=>{
 const d=project(),a=d.pages[1],b=page('schema',11);d.pages.push(b);a.wires=[{id:'w',points:[{x:100,y:150},{x:300,y:150}],label:'L1'}];b.connectionPoints=[{id:'entry',x:80,y:160,phase:'L1'}];
 const from={page:a.id,kind:'wire',wire:'w',index:1,phase:'L1'},to={page:b.id,kind:'point',id:'entry',phase:'L1'};
 assert.equal(connectionCandidates(d,a).filter(e=>e.kind==='wire').length,2);connect(d,from,to);assert.equal(referenceText(d,to),'10.2');
 assert.deepEqual(endpoint(b,{connection:'entry'},null),b.connectionPoints[0]);assert.throws(()=>connect(d,from,{...to,phase:'N'}));
 const c=page('schema',12);d.pages.push(c);c.connectionPoints=[{id:'next',x:80,y:180,phase:'L1'}];connect(d,from,{page:c.id,kind:'point',id:'next',phase:'L1'});assert.equal(d.links.length,1);assert.equal(linked(d,to),undefined);
});
test('text replacement removes only original glyph paths, escapes text, survives backup',()=>{
 const d=project(),p=d.pages[1],e=createElement(p,'template',200,200);const glyph='M 1 1 L 2 2';e.template=validateTemplate({id:'x',name:'Sicherung',group:'Test',source:'test',category:'Schema',width:10,height:10,viewWidth:100,viewHeight:100,paths:[{d:glyph,fill:'#000000',stroke:'none',sw:0},{d:'M 0 0 L 100 0',fill:'none',stroke:'#000000',sw:1}],details:{texts:[{key:'t0',text:'C13',hashes:[pathHash(glyph)],runs:[{text:'C13',matrix:[1,0,0,1,10,20],fontSize:10}]}],ends:[]}});e.textEdits={t0:'C16 <test>'};p.elements.push(e);
 const result=svgPage(d,p);assert.doesNotMatch(result,/d="M 1 1 L 2 2"/);assert.match(result,/C16 &lt;test&gt;/);assert.match(result,/M 0 0 L 100 0/);assert.doesNotMatch(result,/data-template-text=/);
 const copy=validateProject(JSON.parse(JSON.stringify(d)));assert.equal(copy.pages[1].elements[0].textEdits.t0,'C16 <test>');assert.match(svgPage(d,p,{editor:true}),/data-template-text=/);
 assert.match(templateMarkup(e.template,100,100),/d="M 1 1 L 2 2"/);
});

test('original current-transformer macro exposes four phase ends and original fuse text is replaceable',async()=>{
 const {readFile}=await import('node:fs/promises');const details=JSON.parse(await readFile(new URL('../cad/template-details.json',import.meta.url),'utf8'));
 assert.deepEqual(details['tl-0016'].ends.map(a=>a.phase).sort(),['L1','L2','L3','N']);
 const raw=JSON.parse(await readFile(new URL('../cad/templates/tl-0021.json',import.meta.url),'utf8'));raw.details=details[raw.id];const t=validateTemplate(raw),label=t.details.texts.find(t=>t.text==='13A');assert.ok(label);assert.ok(t.paths.some(p=>label.hashes.includes(pathHash(p.d))));
 const svg=templateMarkup(t,100,700,{}, {[label.key]:'16A'});assert.match(svg,/>16A<\/text>/);for(const p of t.paths.filter(p=>label.hashes.includes(pathHash(p.d))))assert.ok(!svg.includes(`d="${p.d}"`));
});
