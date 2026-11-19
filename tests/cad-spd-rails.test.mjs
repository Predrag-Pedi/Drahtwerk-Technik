import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project,validateProject} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {validateTemplate,templateMarkup} from '../cad/template.mjs';
import {repairPaths} from '../cad/template-masks.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';
import {defaultConfig,schemaDevices} from '../cad/dispo.mjs';
import {moveDispoElements} from '../cad/dispo-move.mjs';
import {svgPage,dispoDrawingRails} from '../cad/render.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),details=read('cad/template-details.json'),fetcher=async p=>({ok:true,json:()=>read(p.split('?')[0])});
const insert=(d,id,x)=>{const p=d.pages[1],e=placement(p,'template',{x,y:100},true,0,validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]}));p.elements.push(e);return e;};
test('Phoenix compound masks become white but glyph contours and holes remain black',()=>{
 for(let n=727;n<=737;n++){const t=read(`cad/templates/tl-0${n}.json`),paths=t.paths.flatMap(p=>repairPaths(p,t));assert.ok(paths.some(p=>p.fill==='#ffffff'),t.id);assert.ok(paths.some(p=>p.fill==='#000000'),t.id);assert.match(templateMarkup(t,t.width,t.height),/fill="#ffffff"/);}
 const p={d:'M 0 0 L 100 0 L 100 100 L 0 100 Z M 10 10 L 15 10 L 15 20 L 10 20 Z',fill:'#000000',stroke:'none',sw:0},r=repairPaths(p,{viewWidth:100,viewHeight:100});assert.deepEqual(r.map(p=>p.fill),['#ffffff','#000000']);assert.match(r[1].d,/15 20/);
});
test('SPD and Phoenix input occupy an isolated 250 mm bay with SPD below and labelled rails behind devices',async()=>{
 const d=project();d.ratedCurrent='100';insert(d,'tl-0000',180);insert(d,'tl-0187',650);insert(d,'tl-0025',900);const ds=schemaDevices(d).devices;assert.equal(ds.filter(d=>d.kind==='spd').length,1);
 const q=d.pages[2];q.dispoConfig={...defaultConfig(),height:1520};const g=await buildAutomaticDispo(d,q,fetcher);Object.assign(q,{elements:g.elements,scale:g.scale});const p=validateProject(d).pages[2],input=p.elements.find(e=>e.incoming),spd=p.elements.find(e=>e.dispoKind==='spd'),ls=p.elements.find(e=>e.dispoKind==='ls'),c=p.elements.find(e=>e.kind==='cabinet'),f=1200/420/p.scale;
 assert.equal(input.template.id,'tl-0746');assert.equal(spd.template.id,'tl-0735');assert.equal(spd.width,72);assert.ok(spd.y>input.y+input.height*f);assert.ok(ls.x>input.x+input.width*f);assert.ok(c.dispoStructure.some(s=>s.plateType==='cover'&&s.width===250&&s.height===400));
 const markup=svgPage(d,p);for(const label of ['Galip','Klemmen','Kanal'])assert.ok(markup.includes(label));assert.match(markup,/DIN 35/);assert.doesNotMatch(markup,/Einspeiseklemmen/);const visible=dispoDrawingRails(c);assert.ok(visible.some(r=>r.frameStyle?.startsWith('incoming:')));const bay=c.dispoStructure.find(s=>s.plateType==='cover'&&s.width===250&&s.height===400);assert.ok(!visible.some(r=>r.profile==='AS35'&&!r.frameStyle?.startsWith('incoming')&&r.x<bay.x+bay.width-.001&&r.x+r.width>bay.x+.001&&r.y>=bay.y&&r.y<bay.y+bay.height));const support=visible.find(r=>r.profile==='AS35'&&Math.abs(c.y+(r.y+r.height/2)*f-(ls.y+45*f))<.001);assert.ok(support);const legacy=structuredClone(c);for(const r of legacy.dispoStructure)if(r.profile==='AS35'&&!r.frameStyle&&r.y>=bay.y)r.y+=12.5;assert.deepEqual(dispoDrawingRails(legacy).filter(r=>r.profile==='AS35'),visible.filter(r=>r.profile==='AS35'));assert.doesNotMatch(markup,/DIN 35 ·/);
 const rail=c.dispoStructure.find(s=>s.frameStyle?.startsWith('incoming:'));const leftLength=rail.width;assert.ok(rail.x<c.width/2);assert.equal(Math.round(rail.x+rail.width),c.width-40);
 moveDispoElements(p,new Set([input.id]),(c.width-250)*f,0);assert.equal(rail.x,40);assert.ok(rail.width>0);assert.ok(Math.abs(rail.x+rail.width-((input.x-c.x)/f+input.width/2))<1e-8);assert.ok(leftLength>0);
 const restored=validateProject({...d,pages:d.pages.map(x=>x.id===p.id?p:x)}).pages.find(x=>x.id===p.id);assert.ok(restored.elements.find(e=>e.kind==='cabinet').dispoStructure.some(s=>s.frameStyle?.startsWith('incoming:')&&s.x===40));
});

test('original CT and arrester symbols remain SPD after renaming or editing their A placeholder',async()=>{
 const {protectionKind}=await import('../cad/circuit-data.mjs');
 for(const id of ['tl-0004','tl-0005','tl-0006','tl-0109','tl-0186','tl-0187','tl-0188','tl-0189','tl-0190','tl-0191']){
  const d=project(),e=insert(d,id,300);assert.ok(e,id);e.template.name='Eigene Bezeichnung';e.template.group='Eigene Bibliothek';e.textEdits=Object.fromEntries((e.template.details?.texts||[]).map(t=>[t.key,'125A']));
  const keys=[...new Set(e.template.labels.filter(l=>l.letter==='F').map(l=>l.key))];for(const key of keys)assert.equal(protectionKind(e,key),'spd',id+' '+key);
  const result=schemaDevices(d);assert.equal(result.devices.filter(d=>d.kind==='spd').length,keys.length,id);assert.equal(result.devices.filter(d=>d.kind==='fuse').length,0,id);
 }
});
test('SPD macro retains its separate NH00 upstream fuse; ordinary meter fuses are not SPD',async()=>{
 const {protectionKind}=await import('../cad/circuit-data.mjs'),d=project(),e=insert(d,'tl-0108',300);
 assert.equal(protectionKind(e,'120F1'),'spd');assert.equal(protectionKind(e,'120F1.1'),'fuse');
 const devices=schemaDevices(d).devices;assert.equal(devices.filter(d=>d.kind==='spd').length,1);assert.equal(devices.find(d=>d.kind==='fuse').fuseType,'NH00');
 const other=project(),meter=insert(other,'tl-0011',300);assert.equal(protectionKind(meter,'2F7'),'fuse');
});
test('the pictured four-to-earth CT1 macro generates the original SPD disposition symbol',async()=>{
 const d=project();insert(d,'tl-0004',400);const q=d.pages[2];q.dispoConfig={...defaultConfig(),height:1520};const g=await buildAutomaticDispo(d,q,fetcher),devices=g.elements.filter(e=>e.dispoSource);
 assert.equal(devices.filter(e=>e.dispoKind==='spd').length,1);assert.equal(devices.find(e=>e.dispoKind==='spd').template.id,'tl-0735');assert.equal(devices.filter(e=>e.dispoKind==='fuse').length,0);
});
