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
import {svgPage} from '../cad/render.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),details=read('cad/template-details.json'),fetcher=async p=>({ok:true,json:()=>read(p.split('?')[0])});
const insert=(d,id,x)=>{const p=d.pages[1],e=placement(p,'template',{x,y:100},true,0,validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]}));p.elements.push(e);return e;};
test('Phoenix compound masks become white but glyph contours and holes remain black',()=>{
 for(let n=727;n<=737;n++){const t=read(`cad/templates/tl-0${n}.json`),paths=t.paths.flatMap(p=>repairPaths(p,t));assert.ok(paths.some(p=>p.fill==='#ffffff'),t.id);assert.ok(paths.some(p=>p.fill==='#000000'),t.id);assert.match(templateMarkup(t,t.width,t.height),/fill="#ffffff"/);}
 const p={d:'M 0 0 L 100 0 L 100 100 L 0 100 Z M 10 10 L 15 10 L 15 20 L 10 20 Z',fill:'#000000',stroke:'none',sw:0},r=repairPaths(p,{viewWidth:100,viewHeight:100});assert.deepEqual(r.map(p=>p.fill),['#ffffff','#000000']);assert.match(r[1].d,/15 20/);
});
test('SPD and Phoenix input occupy an isolated 250 mm bay with SPD below and labelled rails behind devices',async()=>{
 const d=project();insert(d,'tl-0000',180);insert(d,'tl-0187',650);insert(d,'tl-0025',900);const ds=schemaDevices(d).devices;assert.equal(ds.filter(d=>d.kind==='spd').length,1);
 const q=d.pages[2];q.dispoConfig={...defaultConfig(),height:1520};const g=await buildAutomaticDispo(d,q,fetcher);Object.assign(q,{elements:g.elements,scale:g.scale});const p=validateProject(d).pages[2],input=p.elements.find(e=>e.incoming),spd=p.elements.find(e=>e.dispoKind==='spd'),ls=p.elements.find(e=>e.dispoKind==='ls'),c=p.elements.find(e=>e.kind==='cabinet'),f=1200/420/p.scale;
 assert.equal(input.template.id,'tl-0746');assert.equal(spd.template.id,'tl-0735');assert.equal(spd.width,72);assert.ok(spd.y>input.y+input.height*f);assert.ok(ls.x>input.x+input.width*f);assert.ok(c.dispoStructure.some(s=>s.plateType==='cover'&&s.width===250&&s.height===400));
 const markup=svgPage(d,p);assert.match(markup,/DIN 35/);assert.match(markup,/Einspeiseklemmen/);
 const rail=c.dispoStructure.find(s=>s.frameStyle?.startsWith('incoming:'));const leftLength=rail.width;assert.ok(rail.x<c.width/2);assert.equal(Math.round(rail.x+rail.width),c.width-40);
 moveDispoElements(p,new Set([input.id]),(c.width-250)*f,0);assert.equal(rail.x,40);assert.ok(rail.width>0);assert.ok(Math.abs(rail.x+rail.width-((input.x-c.x)/f+input.width/2))<1e-8);assert.ok(leftLength>0);
 const restored=validateProject({...d,pages:d.pages.map(x=>x.id===p.id?p:x)}).pages.find(x=>x.id===p.id);assert.ok(restored.elements.find(e=>e.kind==='cabinet').dispoStructure.some(s=>s.frameStyle?.startsWith('incoming:')&&s.x===40));
});
