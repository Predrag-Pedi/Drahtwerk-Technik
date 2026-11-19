import test from 'node:test';
import assert from 'node:assert/strict';
import {cableEntryBoxes} from '../cad/cable-entry-3d.mjs';
import {choices,cabinetOptions} from '../cad/cabinet-options.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
import {boxMesh} from '../cad/dispo-mesh.mjs';
import {prepareGeometry} from '../cad/dispo-gpu.mjs';
import {doorMotionBounds,boxWorldPoint} from '../cad/box-transform.mjs';
const entry=(selection,material,position='roof',width=800,depth=400)=>cableEntryBoxes({width,depth,position,selection,material,color:'#c5c7c4'});
test('all configured roof and floor entries have bounded, distinct geometry',()=>{
 for(const [w,d]of [[400,220],[2000,1000]])for(const position of ['roof','floor'])for(const selection of choices[position])for(const material of position==='roof'?[undefined]:choices.floorMaterial){
  const boxes=entry(selection,material,position,w,d);
  assert.equal(boxes.length===0,selection==='Kein');
  for(const b of boxes){assert.ok([b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite));assert.ok(b.w>0&&b.h>0&&b.d>0);assert.ok(b.x>=0&&b.z>=0&&b.x+b.w<=w+.001&&b.z+b.d<=d+.001);}
 }
 const roofs=choices.roof.map(s=>JSON.stringify(entry(s)));assert.equal(new Set(roofs).size,roofs.length);
 for(const n of [1,2,3])assert.equal(entry(n+'-teilig','PVC','floor').filter(b=>b.entry.role==='infill').length,n);
});
test('perforation is an actual through-opening in both rendered surfaces, not a dark decal',()=>{
 const b=entry('Standard mit Lochblech').find(b=>b.shape==='entryPerforated'),mesh=boxMesh(b),nx=Math.min(40,Math.ceil(b.w/32)),nz=Math.min(16,Math.ceil(b.d/32)),p=[b.w/nx/2,b.d/nz/2];
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const inside=(a,b,c)=>{const signs=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return signs.every(n=>n>=-1e-6)||signs.every(n=>n<=1e-6);};
 for(const y of [0,b.h])for(const face of mesh.surfaces.filter(f=>f.every(i=>mesh.vertices[i][1]===y))){const points=face.map(i=>[mesh.vertices[i][0],mesh.vertices[i][2]]);for(let i=1;i<points.length-1;i++)assert.equal(inside(points[0],points[i],points[i+1]),false);}
 assert.ok(prepareGeometry([{...b,id:'entry'}],[0,0,0]).triangles.every(Number.isFinite));
});
const cabinet=(id,x,field={})=>({id,x,y:10,width:800,height:2100,depth:400,plinthHeight:100,kind:'cabinet',frameStyle:'almatec-an',cabinetOptions:cabinetOptions({plinth:'Aluminium',fields:[field]},100)});
test('entry selection is per field; the open floor and hollow plinth stay open from below',()=>{
 const p={scale:10,elements:[cabinet('a',0,{roof:'Standard mit Bürsten'}),cabinet('b',300,{roof:'Standard mit Lochblech',floor:'3-teilig',floorMaterial:'Moosgummischieber'})]},boxes=sceneBoxes(p);
 assert.ok(boxes.some(b=>b.id==='a'&&b.entry?.role==='brush'));assert.equal(boxes.some(b=>b.id==='a'&&b.entry?.position==='floor'),false);
 assert.ok(boxes.some(b=>b.id==='b'&&b.entry?.role==='perforated'));assert.equal(boxes.filter(b=>b.id==='b'&&b.entry?.position==='floor'&&b.entry.role==='foam').length,6);
 const base=boxes.filter(b=>b.id==='a'&&b.color==='#111111');assert.equal(base.length,4);
 assert.equal(base.some(b=>b.x<400&&b.x+b.w>400&&b.z<-200&&b.z+b.d>-200),false);
});
test('door camera envelope contains the full sweep without changing the cabinet transform',()=>{
 for(const hinge of ['Links','Rechts'])for(const wings of ['1-flüglig','2-flüglig']){
  const p={scale:10,elements:[cabinet('a',0,{angle:180,hinge,wings,pocket:'Aluminium A4 Quer'})]},boxes=sceneBoxes(p),bounds=doorMotionBounds(boxes);
  for(let angle=0;angle<=180;angle+=3)for(const b of sceneBoxes(p,{a:angle}).filter(b=>b.hingeX!==undefined))for(const v of boxMesh(b).vertices)for(const coordinate of boxWorldPoint(b,v,bounds.center))assert.ok(Math.abs(coordinate)<=bounds.extent/2+.001);
 }
});

test('perforated entries use circular holes without interior cell walls',()=>{
 const b={w:192,h:3,d:64,shape:'entryPerforated'},mesh=boxMesh(b),firstHole=mesh.vertices.slice(16,32),radius=8;
 for(const [x,y,z]of firstHole){assert.equal(y,0);assert.ok(Math.abs(Math.hypot(x-16,z-16)-radius)<1e-8);}
 const wall=mesh.surfaces.filter(f=>new Set(f.map(i=>mesh.vertices[i][1])).size>1);
 assert.ok(wall.length>100);assert.ok(!wall.some(f=>f.every(i=>Math.abs(mesh.vertices[i][0]-32)<1e-8)));
 assert.ok(mesh.vertices.every(v=>v.every(Number.isFinite)));
});

test('non-square perforation cells cover every sheet corner without diagonal gaps',()=>{
 const {vertices}=boxMesh({shape:'entryPerforated',w:192,h:3,d:42});
 for(let x=0;x<=6;x++)for(let z=0;z<=2;z++)for(const y of [0,3])assert.ok(vertices.some(v=>Math.abs(v[0]-x*32)<1e-7&&v[1]===y&&Math.abs(v[2]-z*21)<1e-7),`${x},${y},${z}`);
});
