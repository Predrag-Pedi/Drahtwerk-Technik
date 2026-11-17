import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterLibrary} from '../cad/library.mjs';
import {validateTemplate} from '../cad/template.mjs';
import {page,project,size,validateProject} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {elementBox} from '../cad/drawing-tools.mjs';
import {svgPage} from '../cad/render.mjs';
const root=new URL('../cad/templates/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));
const read=id=>validateTemplate(JSON.parse(fs.readFileSync(new URL(`${id}.json`,root))));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('Platten DW exposes 1, 2 and 3 rows in both widths, with full size cutouts',()=>{
 for(const [rows,height] of [[1,150],[2,275],[3,400]]){
  const matches=filterLibrary(catalog.items,{category:'Dispo',group:'Platten DW',query:`${rows}er`});
  assert.deepEqual(matches.map(t=>t.width),[250,500]);
  for(const meta of matches){
   const t=read(meta.id);assert.equal(t.height,height);assert.equal(t.viewHeight,height);assert.equal(t.viewWidth,t.width);
   assert.equal(t.paths.length,1+rows*t.width/250);
   const openings=t.paths.slice(1).map(p=>p.d.match(/^M ([\d.]+) ([\d.]+) h ([\d.]+) v ([\d.]+)/).slice(1).map(Number));
   assert.deepEqual([...new Set(openings.map(r=>r[1]))],Array.from({length:rows},(_,i)=>60+125*i));
   for(const [x,y,w,h] of openings){assert.equal(w,216);assert.equal(h,46);assert.ok(x>0&&x+w<t.width&&y>0&&y+h<t.height);}
  }
 }
 for(const id of ['tl-0060','tl-0061'])assert.equal(read(id).height,525);
});

test('small plates retain dimensions, snapping and exported geometry after save/reload',()=>{
 const d=project(),p=d.pages.find(p=>p.type==='dispo');p.scale=10;
 for(const width of [250,500])for(const height of [150,275,400]){
  const t=read(`dw-plate-${width}x${height}`),a=placement(p,'template',{x:100,y:100},false,0,t);
  p.elements=[a];
  const b=placement(p,'template',{x:elementBox(a,p).right+2,y:a.y+1},false,0,t,false,{clip:true,tolerance:8});
  near(elementBox(b,p).left,elementBox(a,p).right);near(b.y,a.y);p.elements.push(b);
  const [w,h]=size(a,p);near(w,width*1200/420/10);near(h,height*1200/420/10);
  p.scale=20;near(size(a,p)[0],w/2);near(size(a,p)[1],h/2);p.scale=10;
  const restored=validateProject(JSON.parse(JSON.stringify(d))),rp=restored.pages.find(q=>q.id===p.id);
  assert.deepEqual(rp.elements[0].template,t);
  const svg=svgPage(restored,rp);for(const path of t.paths)assert.ok(svg.includes(path.d));
 }
});
