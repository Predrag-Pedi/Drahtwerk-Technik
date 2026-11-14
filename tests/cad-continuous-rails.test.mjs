import test from 'node:test';
import assert from 'node:assert/strict';
import {joinDinRails} from '../cad/frame-layout.mjs';
import {dispoDrawingRails} from '../cad/render.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
const panel=(x,width,type='slots')=>({kind:'plate',plateType:type,x,y:700,width,height:400,depth:3});
const rail=(x,width,y=767.5,profile='AS35')=>({kind:'rail',profile,x,y,width,height:35,depth:15,mountZ:-110});
test('adjacent apparatus panels have one continuous DIN rail per row in 2D and 3D',()=>{
 const parts=[panel(254,500),panel(754,500),...Array.from({length:3},(_,i)=>[rail(274,460,767.5+i*125),rail(774,460,767.5+i*125)]).flat()];
 const original=structuredClone(parts),c={id:'c',kind:'cabinet',frameStyle:'drahtwerk',x:0,y:0,width:1258,height:2000,dispoStructure:parts};
 const rails=dispoDrawingRails(c);assert.equal(rails.length,3);assert.ok(rails.every(r=>r.x===274&&r.width===960));
 const boxes=sceneBoxes({scale:10,elements:[c]});assert.equal(boxes.filter(b=>b.w===960&&b.h===35).length,3);assert.deepEqual(parts,original);
});
test('DIN supports do not bridge a meter or input bay and copper stays separate',()=>{
 for(const type of ['meter','cover']){const parts=[panel(4,250),panel(254,250,type),panel(504,250),rail(24,210),rail(524,210)];assert.equal(joinDinRails(parts).filter(r=>r.profile==='AS35').length,2);}
 const parts=[panel(4,500),rail(24,210,767.5,'copper'),rail(274,210,767.5,'copper')];assert.equal(joinDinRails(parts).filter(r=>r.profile==='copper').length,2);
});
test('split supports reconnect after a module move and tolerate saved floating point coordinates',()=>{
 const parts=[panel(4,250),panel(254,250),panel(504,250),rail(24,230,767.5000000001),rail(254,250),rail(504,230)];const result=joinDinRails(parts).filter(r=>r.profile==='AS35');assert.equal(result.length,1);assert.equal(result[0].width,710);
});
