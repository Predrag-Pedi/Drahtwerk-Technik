import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {page,project,validateProject} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {frame,sourcePoint,alignMacro,alignPage} from '../cad/alignment.mjs';
const template=id=>JSON.parse(fs.readFileSync(new URL(`../cad/templates/${id}.json`,import.meta.url)));
for(const id of ['tl-0008','tl-0009','tl-0010'])test(`${id}: phase-correct branch, terminals and cable rows match original coordinates`,()=>{
 const p=page('schema',10),meter=placement(p,'template',{x:300,y:100},true,0,template('tl-0007'));p.elements.push(meter);
 const branch=placement(p,'template',{x:310,y:410},false,0,template(id),false),f=frame(branch);
 const i=f.inputs[0],parentLine=frame(meter).lines.find(l=>l.phase===i.phase&&l.x1===l.x2);
 const target=sourcePoint(meter,parentLine.x1,i.y),local=sourcePoint({...branch,x:0,y:0},i.x,i.y);
 branch.x=target.x-local.x+5;branch.y=target.y-local.y+4;
 const placed=placement(p,'template',{x:branch.x,y:branch.y},false,0,template(id));
 assert.ok(Math.abs(sourcePoint(placed,i.x,i.y).x-target.x)<.001);
 for(const y of [90,60])assert.ok(Math.abs(sourcePoint(placed,0,y).y-sourcePoint(meter,0,y).y)<.001);
 p.elements.push(placed);placed.y+=7;assert.equal(alignPage(p),1);
 const d=project();d.pages=[p];const restored=validateProject(JSON.parse(JSON.stringify(d))).pages[0].elements;assert.deepEqual(restored.map(e=>[e.x,e.y,e.template]),p.elements.map(e=>[e.x,e.y,e.template]));
 placed.y+=100;assert.equal(alignMacro(placed,p),false);
 meter.rotation=90;assert.equal(alignMacro(placed,p,500),false);
});
test('manual placement stays free and a missing neutral never creates a partial connection',()=>{
 const p=page('schema'),meter=placement(p,'template',{x:300,y:100},true,0,template('tl-0007'));p.elements.push(meter);
 const e=placement(p,'template',{x:320,y:410},false,0,template('tl-0008'),false);assert.equal(e.x,320);assert.equal(e.y,410);
 const f=frame(meter),saved=f.lines;f.lines=f.lines.filter(l=>l.phase!=='N');try{assert.equal(alignMacro(e,p,1000),false);}finally{f.lines=saved;}
});
