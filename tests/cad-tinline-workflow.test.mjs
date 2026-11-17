import test from 'node:test';
import assert from 'node:assert/strict';
import {project,page,createElement,validateProject,duplicatePage,ports,wirePoints,size} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {MM,DRAW,bounds} from '../cad/geometry.mjs';
import {makeDimension,dimensionGeometry} from '../cad/drawing-tools.mjs';
import {setDispoScale} from '../cad/dispo-scale.mjs';
import {allFunctions,functionData,findFunction,configureContacts,assignContact,contactOccupancy,updateFunction} from '../cad/references.mjs';
import {terminalAssembly,reportRows,csv,updateTerminal} from '../cad/schema-assembly.mjs';
import {svgPage} from '../cad/render.mjs';
import {selectedPdfPages} from '../cad/export.mjs';
import {imagePdf} from '../cad/image-pdf.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);

test('bottom-left plate placement stays inside a 1008 frame, joins the next plate, at both scales',()=>{
 for(const scale of [5,10]){
  const p=page('dispo');p.scale=scale;const factor=MM/scale;
  const frame=createElement(p,'cabinet',100,100);frame.width=1008;frame.height=900;frame.frameStyle='drahtwerk';p.elements.push(frame);
  const bottom=frame.y+frame.height*factor;
  const opts={anchor:'bottom-left',clip:true,tolerance:8,dimensions:{width:500,height:400}};
  const a=placement(p,'plate',{x:frame.x+2,y:bottom-1},false,0,null,false,opts);assert.ok(a);p.elements.push(a);
  near(a.x,frame.x+4*factor);near(a.y+400*factor,bottom);
  const b=placement(p,'plate',{x:a.x+500*factor+2,y:bottom-1},false,0,null,false,opts);assert.ok(b);
  near(b.x,a.x+500*factor);near(b.y,a.y);near(b.x+500*factor,frame.x+1004*factor);
  assert.ok(!JSON.stringify(a).includes('insertionPoint'));
 }
});
test('all insertion anchors follow rotated bounds and the preview point',()=>{
 const p=page('dispo');
 for(const [anchor,uv]of Object.entries({'bottom-left':[0,1],'bottom-right':[1,1],'top-left':[0,0],'top-right':[1,0],center:[.5,.5]}))for(const rotation of [0,90,180,270]){
  const e=placement(p,'plate',{x:600,y:400},false,rotation,null,false,{anchor});const b=bounds(e,...size(e,p));near(b.left+(b.right-b.left)*uv[0],600);near(b.top+(b.bottom-b.top)*uv[1],400);near(e.insertionPoint.x,600);near(e.insertionPoint.y,400);
 }
});
test('changing to 1:10 preserves real device positions, dimensions, wires and measured lengths',()=>{
 const d=project(),p=d.pages[2];p.scale=5;
 const a=createElement(p,'cabinet',100,150);a.width=1008;a.height=900;p.elements.push(a);
 const b=createElement(p,'module',200,250);p.elements.push(b);
 const m=makeDimension(p,{x:a.x,y:a.y},{x:a.x+1008*MM/5,y:a.y},{x:a.x,y:a.y-20});p.elements.push(m);
 p.wires.push({id:'w',points:[{x:200,y:250},{x:300,y:250}],from:null,to:null,label:'',dashed:false});
 const oldDistance=(b.x-a.x)*5/MM,measurement=dimensionGeometry(m,p).text;
 setDispoScale(p,10);assert.equal(p.scale,10);near((b.x-a.x)*10/MM,oldDistance);assert.equal(dimensionGeometry(m,p).text,measurement);near(size(a,p)[0],1008*MM/10);near(p.wires[0].points[1].x-p.wires[0].points[0].x,50);
 assert.equal(validateProject(d).pages[2].scale,10);assert.throws(()=>setDispoScale(p,0));
});
function contactFixture(){const d=project(),p=d.pages[1],e=createElement(p,'coil',300,200);p.elements.push(e);const owner=allFunctions(d).find(f=>f.element===e);configureContacts(d,owner,[{id:'a',type:'NO',terminals:'13-14',description:'Licht EG'},{id:'b',type:'NC',terminals:'21-22',description:'Störung'},{id:'c',type:'CO',terminals:'31-32-34',description:'Kanal 3'}]);return {d,p,e,owner:allFunctions(d).find(f=>f.element===e)};}
function contact(p){const e=createElement(p,'contact',400,400);p.elements.push(e);return {page:p,element:e,key:'$',data:functionData(e)};}
test('contacts reserve configured terminals once, survive backup, expose CO ports and reject invalid edits atomically',()=>{
 const {d,p,owner}=contactFixture(),a=contact(p);assignContact(d,a,owner,'a');assert.equal(a.element.functions.$.description,'Licht EG');
 const second=contact(p),before=JSON.stringify(second.element);assert.throws(()=>assignContact(d,second,owner,'a'),/bereits/);assert.equal(JSON.stringify(second.element),before);
 assignContact(d,second,owner,'c');assert.equal(ports(second.element,p).length,3);assert.equal(contactOccupancy(d,owner).filter(s=>!s.contacts.length).length,1);
 const previous=JSON.stringify(a.element);assert.throws(()=>updateFunction(d,a,{terminals:'31–32–34',contactType:'CO'}),/bereits/);assert.equal(JSON.stringify(a.element),previous);
 assert.throws(()=>configureContacts(d,owner,[{id:'a',type:'NC',terminals:'13–14',description:''}]),/nicht konfiguriert/);
 const restored=validateProject(JSON.parse(JSON.stringify(d))),ref={page:p.id,element:owner.element.id,key:'$'};
 assert.equal(contactOccupancy(restored,findFunction(restored,ref))[0].contacts.length,1);
 assert.match(svgPage(d,p),/Licht EG/);
});
test('contact configuration rejects shared terminal pins and invalid imported slots',()=>{
 const {d,owner}=contactFixture();assert.throws(()=>configureContacts(d,owner,[{id:'1',type:'NO',terminals:'13-14'},{id:'2',type:'NC',terminals:'13-12'}]),/eindeutig/);
 owner.element.functions.$.contactSlots[0].terminals='';assert.throws(()=>validateProject(d));
});
test('copying contacts alone clears external reservations; copying their owner keeps an independent circuit',()=>{
 const {d,p,owner}=contactFixture(),a=contact(p);assignContact(d,a,owner,'a');const same=duplicatePage(d,p);assert.equal(same.elements[1].functions.$.owner.element,same.elements[0].id);
 const q=page('schema',20);d.pages.push(q);p.elements.splice(p.elements.indexOf(a.element),1);q.elements.push(a.element);const copy=duplicatePage(d,q);assert.equal(copy.elements[0].functions.$.owner,undefined);assert.ok(a.element.functions.$.owner);
});
test('terminal assistant creates numbered connected terminals, checks duplicates and retains wiring after moves',()=>{
 const d=project(),p=d.pages[1],e=createElement(p,'switch',200,180);p.elements.push(e);
 const settings={name:'X1',start:1,count:3,spacing:20,labels:['L1','L2','L3']};const g=terminalAssembly(d,p,settings,{x:400,y:400},e);
 assert.equal(g.elements.length,3);assert.equal(g.wires.length,3);p.elements.push(...g.elements);p.wires.push(...g.wires);
 for(let i=0;i<3;i++){assert.equal(g.elements[i].terminalStrip.number,i+1);near(wirePoints(p,g.wires[i])[0].x,ports(e,p)[3+i].x);near(wirePoints(p,g.wires[i])[0].y,ports(e,p)[3+i].y);}
 e.x+=50;assert.equal(wirePoints(p,g.wires[0])[0].x,ports(e,p)[3].x);assert.throws(()=>terminalAssembly(d,p,settings,{x:400,y:500}),/bereits/);
 const saved=validateProject(d);assert.equal(saved.pages[1].elements[1].terminalStrip.name,'X1');assert.match(svgPage(saved,saved.pages[1]),/L1/);
 assert.throws(()=>terminalAssembly(d,p,{...settings,name:'X2'},{x:DRAW.right-10,y:500}),/vollständig/);
});
test('evaluations use live assignments, CSV escapes Excel formulas, and measurement fields remain blank',()=>{
 const {d,p,owner}=contactFixture(),a=contact(p);assignContact(d,a,owner,'a');const ls=createElement(p,'ls',200,200);ls.value='C13 A';ls.text='Licht';p.elements.push(ls);
 const rows=reportRows(d,'contacts');assert.equal(rows.length,4);assert.equal(rows[1].at(-2),'Belegt');assert.equal(rows[2].at(-2),'Frei');
 const measurements=reportRows(d,'measurement');assert.equal(measurements.length,2);assert.deepEqual(measurements[1].slice(-6),['','','','','','']);assert.equal(measurements[1][4],'C13 A');
 const result=csv([['=HYPERLINK("x")','Müller; Test','Zeile\n2']]);assert.ok(result.startsWith('\uFEFF'));assert.ok(result.includes("'=HYPERLINK"));assert.ok(result.includes('"Müller; Test"'));
});
test('PDF selection follows project order and PDF bookmarks reference the selected pages safely',async()=>{
 const d=project(),selected=selectedPdfPages(d,[d.pages[2].id,d.pages[0].id]);assert.deepEqual(selected,[d.pages[0],d.pages[2]]);assert.throws(()=>selectedPdfPages(d,[]));assert.throws(()=>selectedPdfPages(d,['missing']));
 const blob=imagePdf(selected.map((p,i)=>({width:1,height:1,bytes:new Uint8Array([255,216,255,217]),title:`${p.number} · Ä() \\`,links:i?[]:[{x:.1,y:.1,width:.2,height:.1,target:1}]}))),pdf=await blob.text();
 assert.match(pdf,/\/Outlines \d+ 0 R/);assert.match(pdf,/\/PageMode \/UseOutlines/);assert.match(pdf,/\/Title <FEFF/);assert.equal((pdf.match(/\/Title /g)||[]).length,2);assert.match(pdf,/\/Dest \[6 0 R \/Fit\]/);
 const xref=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(xref,xref+4),'xref');
});

test('copied terminal pages receive free numbers and terminal edits reject duplicates atomically',()=>{
 const d=project(),p=d.pages[1],g=terminalAssembly(d,p,{name:'X1',start:1,count:3,spacing:20,labels:[]},{x:200,y:400});p.elements.push(...g.elements);
 const q=duplicatePage(d,p);assert.deepEqual(q.elements.map(e=>e.terminalStrip.number),[4,5,6]);
 const e=p.elements[0],previous=JSON.stringify(e);assert.throws(()=>updateTerminal(d,e,{number:2}),/bereits/);assert.equal(JSON.stringify(e),previous);
 updateTerminal(d,e,{number:9,label:'PE'});assert.equal(e.terminalStrip.number,9);assert.equal(validateProject(d).pages[1].elements[0].terminalStrip.label,'PE');
});
test('contact occupancy recognises typed hyphens and guards owner role changes',()=>{
 const {d,p,owner}=contactFixture(),a=contact(p);assignContact(d,a,owner,'a');updateFunction(d,a,{terminals:'13-14'});
 assert.equal(functionData(a.element).terminals,'13–14');assert.equal(reportRows(d,'contacts')[1].at(-2),'Belegt');
 assert.throws(()=>updateFunction(d,owner,{role:'none'}),/Kontakte lösen/);
});

test('contact caption changes propagate and wired CO terminals cannot silently disappear',()=>{
 const {d,p,owner}=contactFixture(),a=contact(p);assignContact(d,a,owner,'c');const slots=structuredClone(owner.data.contactSlots);slots[2].description='Kanal Küche';configureContacts(d,owner,slots);assert.equal(functionData(a.element).description,'Kanal Küche');
 p.wires.push({id:'wired-co',points:[{x:1,y:1},{x:2,y:2}],from:{element:a.element.id,index:2},to:null,label:'',dashed:false});
 assert.throws(()=>updateFunction(d,a,{contactType:'NO'}),/Wechsleranschluss/);assert.equal(functionData(a.element).contactType,'CO');
});
