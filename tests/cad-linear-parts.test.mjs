import test from 'node:test';
import assert from 'node:assert/strict';
import {linearPartBetween,linearPartPoint} from '../cad/dispo-linear.mjs';
import {project,size,validateProject,createElement} from '../cad/model.mjs';
import {MM,DRAW,bounds} from '../cad/geometry.mjs';
import {partSpec} from '../cad/dispo-parts.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
import {elementMarkup} from '../cad/render.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('two clicks define the physical length and centreline in both directions at different scales',()=>{
 for(const scale of [5,10,20])for(const kind of ['rail','duct'])for(const vertical of [false,true])for(const sign of [-1,1]){
  const p=project().pages[2];p.scale=scale;
  const start={x:600,y:400},f=MM/scale,point={x:start.x+(vertical?4:sign*600*f),y:start.y+(vertical?sign*600*f:4)};
  const r=linearPartBetween(p,kind,{width:40,depth:20},start,point),b=bounds(r.element,...size(r.element,p));
  near(r.length,600);near(r.element.width,600);assert.equal(r.inside,true);assert.equal(r.element.rotation,vertical?90:0);
  near(vertical?(b.left+b.right)/2:(b.top+b.bottom)/2,vertical?start.x:start.y);
  near(vertical?b.bottom-b.top:b.right-b.left,600*f);near(vertical?b.right-b.left:b.bottom-b.top,40*f);
  near(vertical?(sign>0?b.top:b.bottom):(sign>0?b.left:b.right),vertical?start.y:start.x);
  assert.equal(p.scale,scale);assert.equal(p.elements.length,0);
 }
});

test('point snapping uses cabinet interior edges and can be disabled without moving the start',()=>{
 const p=project().pages[2],s=partSpec('cabinet',{width:1000,height:1600,left:70,right:90,top:60,bottom:80,plinth:100});
 const c=Object.assign(createElement(p,'cabinet',200,200),s.dimensions,s.metadata);p.elements.push(c);
 const f=MM/p.scale,x=c.x+70*f,y=c.y+60*f,raw={x:x+2,y:y+2};
 const start=linearPartPoint(p,raw,{grid:true,tolerance:5});near(start.x,x);near(start.y,y);
 assert.deepEqual(linearPartPoint(p,raw,{grid:false,objectSnap:false}),raw);
 const mid={x:x+1,y:c.y+350*f};
 const snapped=linearPartPoint(p,mid,{grid:false,tolerance:5});near(snapped.x,x);near(snapped.y,mid.y);
 const end=linearPartPoint(p,{x:c.x+(1000-90)*f-2,y:mid.y},{grid:false,tolerance:5});
 const r=linearPartBetween(p,'rail',{width:35,depth:7.5},snapped,end);
 near(r.length,840);near(r.start.x,snapped.x);near(r.end.x,end.x);
});

test('zero length and page overflow do not produce a placeable part',()=>{
 const p=project().pages[2],a={x:500,y:400},profile={width:60,depth:60};
 assert.equal(linearPartBetween(p,'duct',profile,a,a),null);
 assert.equal(linearPartBetween(p,'duct',profile,a,{x:501,y:400}),null);
 assert.equal(linearPartBetween(p,'duct',profile,{x:500,y:DRAW.top},{x:700,y:DRAW.top}).inside,false);
 assert.equal(linearPartBetween(p,'rail',profile,a,{x:DRAW.right+20,y:400}).inside,false);
 assert.throws(()=>linearPartBetween(p,'rail',profile,a,{x:NaN,y:400}));
 assert.throws(()=>linearPartBetween(p,'rail',{width:0,depth:7.5},a,{x:700,y:400}));
 assert.throws(()=>linearPartBetween({...p,type:'schema'},'rail',profile,a,{x:700,y:400}));
});

test('drawn channels and rails survive backup and retain their geometry in 2D and 3D',()=>{
 const d=project(),p=d.pages[2];
 for(const [kind,end]of [['rail',{x:800,y:400}],['duct',{x:500,y:650}]])p.elements.push(linearPartBetween(p,kind,{width:40,depth:20},{x:500,y:400},end).element);
 const restored=validateProject(JSON.parse(JSON.stringify(d))),q=restored.pages[2];
 for(let i=0;i<p.elements.length;i++){
  assert.deepEqual(bounds(q.elements[i],...size(q.elements[i],q)),bounds(p.elements[i],...size(p.elements[i],p)));
  assert.deepEqual(q.elements[i].manualPart,p.elements[i].manualPart);
 }
 for(const e of q.elements)assert.ok(!/NaN|Infinity/.test(elementMarkup(e,q,restored)));
 const solids=sceneBoxes(q);assert.ok(solids.length>0);for(const b of solids)for(const k of ['w','h','d'])assert.ok(Number.isFinite(b[k])&&b[k]>0);
});
