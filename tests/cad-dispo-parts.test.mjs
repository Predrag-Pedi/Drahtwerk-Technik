import test from 'node:test';
import assert from 'node:assert/strict';
import {partSpec,partDefaults,partValues,manualInterior} from '../cad/dispo-parts.mjs';
import {project,createElement,size,validateProject} from '../cad/model.mjs';
import {placement} from '../cad/placement.mjs';
import {MM,bounds} from '../cad/geometry.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
import {svgPage} from '../cad/render.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function insert(p,type,values={},point={x:400,y:650}){const s=partSpec(type,values),e=placement(p,s.kind,point,false,s.rotation,null,false,{dimensions:s.dimensions,anchor:'bottom-left',clip:true,tolerance:8});assert.ok(e);Object.assign(e,s.metadata);p.elements.push(e);return e;}

test('visual cabinet parameters preserve the interior, plinth, depth and frame identity through backup',()=>{
 const d=project(),p=d.pages[2],cab=insert(p,'cabinet');
 assert.deepEqual(manualInterior(cab),{left:50,top:60,right:1150,bottom:1940});
 const frame=insert(p,'frame',{}, {x:40,y:650});assert.equal(frame.dispoFrame,true);assert.equal(cab.dispoFrame,false);
 const saved=validateProject(JSON.parse(JSON.stringify(d))).pages[2];
 assert.deepEqual(saved.elements[0].manualPart,cab.manualPart);assert.equal(saved.elements[0].depth,400);
 assert.match(svgPage(d,p),/1200/);assert.equal(saved.scale,10);
 for(const [type,values]of [['cabinet',{left:700,right:600}],['cabinet',{plinth:1000,top:600,bottom:600}],['duct',{depth:2}],['rail',{orientation:'diagonal'}],['frame',{width:NaN}]])assert.throws(()=>partSpec(type,values));
 cab.manualPart.left=2000;assert.throws(()=>validateProject(d));
});

test('vertical channels and horizontal rails keep real dimensions and fit inside custom cabinet margins',()=>{
 const d=project(),p=d.pages[2],c=insert(p,'cabinet',{left:80,right:40,bottom:70,plinth:150});
 const f=MM/p.scale,m=manualInterior(c),bottom=c.y+m.bottom*f;
 const duct=insert(p,'duct',{length:500,width:60,depth:80,orientation:'vertical'},{x:c.x+2,y:c.y+c.height*f-2});
 const b=bounds(duct,...size(duct,p));near(b.left,c.x+80*f);near(b.bottom,bottom);near(b.right-b.left,60*f);near(b.bottom-b.top,500*f);
 const rail=insert(p,'rail',{length:600,width:35,depth:7.5},{x:c.x+100*f,y:c.y+700*f});
 near(size(rail,p)[0],600*f);assert.equal(rail.rotation,0);assert.equal(partValues(duct).orientation,'vertical');
 assert.equal(validateProject(d).pages[2].elements[1].depth,80);assert.equal(p.scale,10);
});

test('manual parts have finite positive 3D solids at the cabinet mounting depth',()=>{
 const d=project(),p=d.pages[2],c=insert(p,'cabinet',{depth:500}),r=insert(p,'rail',{depth:7.5},{x:450,y:450}),duct=insert(p,'duct',{orientation:'vertical'},{x:450,y:600});
 const scene=sceneBoxes(p);assert.ok(scene.filter(b=>b.id===c.id).length>=5);
 for(const id of [c.id,r.id,duct.id])assert.ok(scene.some(b=>b.id===id));
 for(const b of scene)for(const k of ['w','h','d'])assert.ok(Number.isFinite(b[k])&&b[k]>0);
 assert.ok(scene.filter(b=>b.id===r.id).every(b=>b.z>=-470&&b.z+b.d<=-462.5));
 const framePage=project().pages[2],frame=insert(framePage,'frame');assert.equal(sceneBoxes(framePage).filter(b=>b.id===frame.id).length,4);
});
