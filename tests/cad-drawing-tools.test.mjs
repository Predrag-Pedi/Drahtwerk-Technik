import test from 'node:test';
import assert from 'node:assert/strict';
import {MM} from '../cad/geometry.mjs';
import {page,project,createElement,size,validateProject,duplicatePage,wirePoints} from '../cad/model.mjs';
import {placement,placementMarkup} from '../cad/placement.mjs';
import {elementBox,snapMove,nearestDrawingPoint,makeDimension,dimensionGeometry,parallelRoutes} from '../cad/drawing-tools.mjs';
import {moveSelection} from '../cad/selection.mjs';
import {svgPage} from '../cad/render.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('dispo devices clip to exact adjacent edges at different scales without persisting guides',()=>{
 for(const scale of [5,10,20]){
  const p=page('dispo');p.scale=scale;
  const a=createElement(p,'module',200,180);a.width=250;a.height=400;p.elements.push(a);
  const b=placement(p,'module',{x:elementBox(a,p).right+3,y:a.y+2},false,0,null,false,{clip:true,tolerance:8,dimensions:{width:250,height:400}});
  near(elementBox(b,p).left,elementBox(a,p).right);near(b.y,a.y);
  assert.match(placementMarkup(b,p,project()),/#1688a0/);assert.ok(!JSON.stringify(b).includes('snapGuides'));
  const schema=page('schema');schema.elements=[a];const c=placement(schema,'module',{x:300,y:180},false,0,null,false,{clip:true});assert.equal(c.x,300);
 }
});
test('rotated bodies and groups move to neighbour edges without snapping to themselves',()=>{
 const p=page('dispo'),a=createElement(p,'module',150,200),b=createElement(p,'module',500,200);a.rotation=90;
 p.elements.push(a,b);const before=structuredClone(p),items=[{kind:'element',id:a.id}];
 const wanted=elementBox(b,p).left-elementBox(a,p).right+2,delta=snapMove(p,before,items,wanted,0,8);
 moveSelection(p,items,delta.dx,delta.dy);near(elementBox(a,p).right,elementBox(b,p).left);
 const own=page('dispo');own.elements=[structuredClone(a)];const free=snapMove(own,own,items,1,2,8);assert.equal(free.dx,1);assert.equal(free.dy,2);
});
test('three-point horizontal and vertical dimensions use real millimetres and survive backup/copy/export',()=>{
 const d=project(),p=d.pages.find(p=>p.type==='dispo');p.scale=10;
 const a={x:200,y:150},b={x:200+1008*MM/10,y:150},c={x:250,y:110};
 const h=makeDimension(p,a,b,c);assert.equal(h.measure.axis,'horizontal');near(Number(dimensionGeometry(h,p).text.replace(/[^0-9.]/g,'')),1008);p.elements.push(h);
 const v=makeDimension(p,a,{x:200,y:150+1920*MM/10},{x:170,y:300});assert.equal(v.measure.axis,'vertical');assert.equal(dimensionGeometry(v,p).vertical,true);p.elements.push(v);
 const restored=validateProject(JSON.parse(JSON.stringify(d))).pages.find(q=>q.id===p.id);
 assert.deepEqual(restored.elements.map(e=>e.measure),p.elements.map(e=>e.measure));
 const copied=duplicatePage(d,p);copied.elements[0].measure.a.x=9;assert.equal(h.measure.a.x,0);
 const svg=svgPage(d,p);assert.match(svg,/1&#39;008 mm|1'008 mm/);assert.match(svg,/1&#39;920 mm|1'920 mm/);assert.ok(!svg.includes('measurePreview'));
 assert.equal(makeDimension(p,a,a,c),null);
 const s=page('schema');s.scale=50;assert.equal(dimensionGeometry(makeDimension(s,{x:100,y:100},{x:100+10*MM,y:100},{x:100,y:80}),s).text,'10 mm');
});
test('measurement corners are captured from transformed geometry; corrupt measurements cannot enter a project',()=>{
 const d=project(),p=d.pages[2],e=createElement(p,'module',200,200);e.rotation=90;p.elements.push(e);
 const box=elementBox(e,p),point=nearestDrawingPoint(p,{x:box.left+1,y:box.top+1},8);near(point.x,box.left);near(point.y,box.top);
 const m=makeDimension(p,{x:100,y:100},{x:200,y:100},{x:100,y:80});p.elements.push(m);
 for(const bad of [NaN,Infinity,'10',30000]){m.measure.offset=bad;assert.throws(()=>validateProject(d));}
});
test('parallel conductors retain spacing through turns and keep separate wires on reload',()=>{
 const d=project(),p=d.pages[1],step=5*MM,routes=parallelRoutes([{x:200,y:200},{x:500,y:400}],4,step);
 assert.equal(routes.length,4);
 for(let i=0;i<4;i++){
  assert.deepEqual(routes[i],[{x:200,y:200+i*step},{x:500-i*step,y:200+i*step},{x:500-i*step,y:400}]);
  p.wires.push({id:`wire-${i}`,points:routes[i],from:null,to:null,label:'',dashed:false});
 }
 const restored=validateProject(d).pages[1];assert.equal(restored.wires.length,4);assert.deepEqual(wirePoints(restored,restored.wires[3]),routes[3]);
 const vertical=parallelRoutes([{x:200,y:200},{x:500,y:400}],2,step,true);assert.deepEqual(vertical[0],[{x:200,y:200},{x:200,y:400},{x:500,y:400}]);
 assert.throws(()=>parallelRoutes([{x:200,y:200},{x:210,y:200},{x:210,y:300}],5,step),/Mehr Platz/);
 assert.throws(()=>parallelRoutes([{x:200,y:200},{x:300,y:200},{x:200,y:200}],2,step),/zurückführen/);
});
test('physical frame input and explicit schema scaling preserve their requested sizes',()=>{
 const p=page('dispo'),f=placement(p,'cabinet',{x:100,y:100},false,0,null,false,{dimensions:{width:1008,height:1920}});
 assert.equal(f.width,1008);near(size(f,p)[0],1008*MM/p.scale);
 const t={id:'large',category:'Schema',width:800,height:400,viewWidth:800,viewHeight:400,paths:[]},s=page('schema');
 assert.equal(placement(s,'template',{x:100,y:100},false,0,t,false),null);
 const small=placement(s,'template',{x:100,y:100},false,0,t,false,{dimensions:{width:80,height:40}});near(size(small,s)[0],80*MM);
 for(const width of [0,NaN,Infinity,-1])assert.equal(placement(p,'cabinet',{x:100,y:100},false,0,null,false,{dimensions:{width,height:100}}),null);
});

test('two 500 mm plates meet exactly inside a 1008 mm frame rather than leaving a centre-snap gap',()=>{
 const p=page('dispo'),frame=createElement(p,'cabinet',140,170);frame.width=1008;frame.height=1920;p.elements.push(frame);
 const a=placement(p,'plate',{x:150,y:600},true,0,null,false,{clip:true,tolerance:13});p.elements.push(a);near(a.x,140);
 const b=placement(p,'plate',{x:290,y:600},true,0,null,false,{clip:true,tolerance:13});near(elementBox(b,p).left,elementBox(a,p).right);near(a.y,b.y);
});
