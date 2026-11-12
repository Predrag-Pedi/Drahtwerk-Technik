import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {page,project,ports,size,validateProject} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {validateTemplate,templateLabels} from '../cad/template.mjs';
import {BUS,DRAW,bounds} from '../cad/geometry.mjs';
import {svgPage} from '../cad/render.mjs';
const meter=validateTemplate(JSON.parse(fs.readFileSync(new URL('../cad/templates/tl-0007.json',import.meta.url))));
test('meter macro aligns named conductors to matching bus and fits above title block',()=>{
 const p=page('schema',10),e=placement(p,'template',{x:500,y:300},true,0,meter);
 assert.equal(e.autoConnect,true);const anchors=ports(e,p);
 meter.ports.forEach((pt,i)=>assert.ok(Math.abs(anchors[i].y-BUS[pt.phase])<.1));
 const b=bounds(e,...size(e,p));assert.ok(b.bottom<=DRAW.bottom);assert.ok(b.top>=DRAW.top);
 assert.deepEqual(templateLabels(e,p),{'1P5':'10P4','1F5':'10F4','1X5':'10X4'});
});
test('live labels follow moved elements, renamed pages and disambiguate duplicate circuits',()=>{
 const p=page('schema',11),a=placement(p,'template',{x:180,y:200},true,0,meter);p.elements.push(a);
 assert.equal(templateLabels(a,p)['1F5'],'11F1');a.x+=112;assert.equal(templateLabels(a,p)['1F5'],'11F2');p.number=14;assert.equal(templateLabels(a,p)['1F5'],'14F2');
 const b=structuredClone(a);b.id='other';p.elements.push(b);assert.equal(templateLabels(b,p)['1F5'],'14F2.2');
 assert.equal(templateLabels(a,p)['1F5'],'14F2');
});
test('automatic supply and semantic metadata survive a project backup and export',()=>{
 const d=project(),p=d.pages[1],e=placement(p,'template',{x:500,y:200},true,0,meter);p.elements.push(e);
 const restored=validateProject(JSON.parse(JSON.stringify(d))).pages[1].elements[0];assert.equal(restored.autoConnect,true);assert.deepEqual(restored.template,meter);
 const output=svgPage(d,p);assert.ok(output.includes('10F4</text>'));assert.ok(!output.includes('1F5</text>'));assert.ok(output.includes('fill="#ffffff"'));assert.ok(output.includes('height="297mm"'));
});
test('supply association is disabled for rotated or Dispo placement',()=>{
 const p=page('schema'),e=placement(p,'template',{x:500,y:200},true,0,meter,false);assert.equal(e.autoConnect,false);
 const q=page('dispo'),f=placement(q,'template',{x:500,y:200},true,0,meter);assert.equal(f.autoConnect,false);
});
test('malicious semantic metadata is rejected',()=>{
 for(const mutate of [t=>t.labels[0].matrix[0]=NaN,t=>t.labels[0].letter='P" onload="x',t=>t.ports[0].phase='bad']){const t=structuredClone(meter);mutate(t);assert.throws(()=>validateTemplate(t));}
});
test('standalone symbol defaults become device letters, never the literal attribute name BMK',()=>{
 const symbol=validateTemplate(JSON.parse(fs.readFileSync(new URL('../cad/templates/tl-0234.json',import.meta.url))));
 assert.ok(symbol.labels.length);assert.ok(symbol.labels.every(l=>l.letter==='P'));
 const p=page('schema',11),e=placement(p,'template',{x:200,y:200},true,0,symbol);
 assert.ok(Object.values(templateLabels(e,p)).every(value=>/^11P\d/.test(value)));
});
test('phase names remain fixed and do not become device labels',()=>{
 const supply=validateTemplate(JSON.parse(fs.readFileSync(new URL('../cad/templates/tl-0000.json',import.meta.url))));
 assert.ok(supply.labels.every(l=>!['L1','L2','L3','N','PE'].includes(l.text)));
});
