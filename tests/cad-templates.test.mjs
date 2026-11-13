import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateTemplate,templateMarkup} from '../cad/template.mjs';
import {project,page,size,validateProject,duplicatePage} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {svgPage} from '../cad/render.mjs';
const root=new URL('../cad/templates/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));
const read=id=>validateTemplate(JSON.parse(fs.readFileSync(new URL(`${id}.json`,root))));
const plate=read(catalog.items.find(t=>t.name==='250x525').id);
test('every indexed template exists, has safe vector geometry and matching dimensions',()=>{
 assert.equal(new Set(catalog.items.map(t=>t.id)).size,catalog.items.length);
 assert.equal(catalog.items.length,1136);
 for(const meta of catalog.items){const t=read(meta.id);for(const key of ['id','name','width','height','category'])assert.equal(t[key],meta[key],`${meta.id}: ${key}`);}
});
test('dispo preserves real plate dimensions and follows page scale',()=>{
 const p=page('dispo'),e=placement(p,'template',{x:100,y:100},true,0,plate);
 assert.equal(e.width,250);assert.equal(e.height,525);
 const [w,h]=size(e,p);assert.equal(w,250*1200/420/p.scale);assert.equal(h,525*1200/420/p.scale);
 p.scale*=2;assert.equal(size(e,p)[0],w/2);
});
test('schema placement uses page millimetres, same geometry and rotation as preview',()=>{
 const t=read(catalog.items.find(t=>t.name==='Schliesskontakt').id),p=page('schema');
 const e=placement(p,'template',{x:103,y:204},true,90,t);assert.equal(e.x,100);assert.equal(e.y,200);assert.equal(e.rotation,90);assert.equal(size(e,p)[0],t.width*1200/420);
 assert.equal(p.elements.length,0);assert.equal(placement(p,'template',{x:100,y:100}),null);
});
test('backup and copied pages embed independent template geometry',()=>{
 const d=project(),p=d.pages.find(p=>p.type==='dispo'),e=placement(p,'template',{x:200,y:200},true,0,plate);p.elements.push(structuredClone(e));
 const copy=validateProject(JSON.parse(JSON.stringify(d)));
 assert.deepEqual(copy.pages.find(q=>q.id===p.id).elements[0].template,plate);
 const duplicate=duplicatePage(d,p);duplicate.elements[0].template.paths[0].d='M0 0 L1 1';assert.notEqual(duplicate.elements[0].template.paths[0].d,p.elements[0].template.paths[0].d);
});
test('standalone export embeds paths and escapes added labels without external resources',()=>{
 const d=project(),p=d.pages[1],e=placement(p,'template',{x:100,y:100},true,0,plate);e.text='<script>alert(1)</script>';p.elements.push(e);
 const svg=svgPage(d,p);assert.ok(svg.includes(plate.paths[0].d));assert.ok(svg.includes('&lt;script&gt;'));assert.ok(!svg.includes('<script>'));assert.ok(!/(?:href|xlink:href)="(?:https?:|\/\/)/.test(svg));assert.ok(!svg.includes('placementPreview'));
});
test('unsafe SVG, invalid dimensions and nonfinite styles are rejected on import',()=>{
 for(const mutate of [t=>t.paths[0].d='M0 0" onload="alert(1)',t=>t.paths[0].fill='url(https://example.test)',t=>t.paths[0].sw=Infinity,t=>t.width=0,t=>t.viewHeight=NaN]){const t=structuredClone(plate);mutate(t);assert.throws(()=>validateTemplate(t));}
});
test('display line weight remains legible when a physical template is scaled down',()=>{
 const markup=templateMarkup(plate,25,52.5),width=Number(markup.match(/stroke-width="([\d.]+)"/)[1]);assert.ok(width*52.5/plate.viewHeight>=.749);
});
