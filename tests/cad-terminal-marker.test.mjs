import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {terminalBands,applyTerminalSide,terminalMarker} from '../cad/terminal-markers.mjs';
import bandData from '../cad/terminal-bands.mjs';
import {project,validateProject,duplicatePage,ports,size,page} from '../cad/model.mjs';
import {macroAtPath} from '../cad/macro-workflow.mjs';
import {templateMarkup,templateLabels,validateTemplate} from '../cad/template.mjs';
import {svgPage} from '../cad/render.mjs';
import {pathHash} from '../cad/template-text.mjs';
import {placement} from '../cad/placement.mjs';
import {templateFit} from '../cad/template-fit.mjs';
import {bounds,DRAW} from '../cad/geometry.mjs';
const read=id=>JSON.parse(fs.readFileSync(new URL(`../cad/templates/${id}.json`,import.meta.url)));

test('top/bottom switches only the marker, retaining geometry, ports and references',()=>{
 for(const id of ['tl-0024','tl-0013','tl-0082','tl-0072','tl-0046']){
  const t=read(id),d=project(),p=d.pages[1],fit=templateFit(t,p),e=Array.from({length:10},(_,i)=>{try{return macroAtPath(p,t,i,{percent:fit.fits?100:fit.suggestedPercent});}catch{return null;}}).find(Boolean);assert.ok(e,id);p.elements.push(e);
  const original=JSON.stringify(e),points=ports(e,p),labels=templateLabels(e,p),pos=[e.x,e.y,e.width,e.height];
  applyTerminalSide(e,'top');const top=svgPage(d,p);applyTerminalSide(e,'bottom');const bottom=svgPage(d,p);
  assert.match(top,/data-terminal-side="top"/);assert.match(bottom,/data-terminal-side="bottom"/);
  assert.equal(top.replaceAll('data-terminal-side="top"','data-terminal-side="bottom"').replace(/<rect data-terminal-side="bottom"[^>]+\/>/g,''),bottom.replace(/<rect data-terminal-side="bottom"[^>]+\/>/g,''));
  assert.deepEqual(ports(e,p),points);assert.deepEqual(templateLabels(e,p),labels);assert.deepEqual([e.x,e.y,e.width,e.height],pos);
  applyTerminalSide(e,'original');assert.equal(JSON.stringify(e),original);
 }
});
test('all audited markers are inside their table and replace only original solid bars',()=>{
 let count=0;for(const id of Object.keys(bandData)){
  const t=read(id),bands=terminalBands(t),known=new Set(t.paths.map(p=>pathHash(p.d)));
  for(const b of bands){count++;assert.ok(b.left>=0&&b.right<=t.viewWidth+1&&b.top>=0&&b.bottom<=t.viewHeight+1);assert.ok(b.barHeight>0&&b.barHeight<(b.bottom-b.top)/3);assert.ok(b.hashes.every(h=>known.has(h)));}
  for(const side of ['top','bottom']){
   const svg=templateMarkup(t,300,400,{}, {},false,'',{},side),marker=terminalMarker(t,side);
   assert.equal((svg.match(/data-terminal-side=/g)||[]).length,bands.length);
   for(const p of t.paths.filter(p=>marker.hidden.includes(pathHash(p.d))))assert.ok(!svg.includes(`d="${p.d}"`));
  }
  assert.equal(terminalMarker(t,'original').markup,'');assert.equal(terminalMarker(t,'original').hidden.length,0);
 }assert.equal(count,113);
 assert.deepEqual(terminalBands({...read('tl-0024'),viewHeight:9999}),[]);
});
test('marker selection survives saving, restoring and copying and rejects invalid data',()=>{
 const d=project(),p=d.pages[1];p.elements.push(macroAtPath(p,read('tl-0024'),2,{terminalSide:'bottom'}));
 const restored=validateProject(JSON.parse(JSON.stringify(d))),copy=duplicatePage(restored,restored.pages[1]);
 assert.equal(copy.elements[0].terminalSide,'bottom');assert.match(svgPage(restored,copy),/data-terminal-side="bottom"/);
 const original=structuredClone(d);delete original.pages[1].elements[0].terminalSide;assert.equal(validateProject(original).pages[1].elements[0].terminalSide,undefined);
 d.pages[1].elements[0].terminalSide='<script>';assert.throws(()=>validateProject(d));
});
test('every catalogue template has a valid sheet placement without changing physical dimensions',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../cad/templates/catalog.json',import.meta.url))).items;
 for(const meta of catalog){
  const t=validateTemplate(read(meta.id)),p=page(t.category==='Dispo'?'dispo':'schema'),before=JSON.stringify(t),f=templateFit(t,p);
  assert.equal(t.category,meta.category);
  const percent=t.category==='Schema'&&!f.fits?f.suggestedPercent:100;
  if(t.category==='Dispo'&&!f.fits)p.scale=f.suggestedScale;
  for(const point of [{x:40,y:35},{x:1160,y:785}]){
   const e=placement(p,'template',point,false,0,t,false,{dimensions:{width:t.width*percent/100,height:t.height*percent/100}});
   assert.ok(e,meta.id);const b=bounds(e,...size(e,p));assert.ok(b.left>=DRAW.left-1e-6&&b.right<=DRAW.right+1e-6&&b.top>=DRAW.top-1e-6&&b.bottom<=DRAW.bottom+1e-6,meta.id);
   if(t.category==='Dispo'){assert.equal(e.width,t.width);assert.equal(e.height,t.height);}
  }assert.equal(JSON.stringify(t),before);
 }
 assert.equal(catalog.length,4291);
});
