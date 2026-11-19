import test from 'node:test';
import assert from 'node:assert/strict';
import {moveDispoElements,swapDispoDrop,dispoGroup,updateSupplyBlocks} from '../cad/dispo-move.mjs';
const f=1200/420/10;
function fixture(){
 const dev=(id,kind,x,y,w=36,h=90,extra={})=>({id,kind:'module',dispoKind:kind,dispoSource:{page:'schema',element:id,key:'$'},x:x*f,y:y*f,width:w,height:h,...extra});
 const c={id:'cab',kind:'cabinet',x:0,y:0,width:1258,height:2000,dispoStructure:[{kind:'plate',plateType:'cover',x:4,y:300,width:250,height:400},{kind:'plate',plateType:'slots',x:254,y:300,width:1000,height:400},...[367.5,492.5,617.5].map(y=>({kind:'rail',profile:'AS35',x:254,y,width:964,height:35})),{kind:'rail',profile:'comb',x:771,y:460,width:72,height:10},{kind:'rail',profile:'AS35',frameStyle:'incoming:input',x:129,y:435,width:1089,height:35}]};
 const input=dev('input','terminal',89,370,80,117,{incoming:true,frameStyle:'incoming-terminal'}),spd=dev('spd','spd',93,530,72,135,{inputOwner:'input'}),block=dev('incoming-supply','terminal',21,1610,53,320,{incoming:true});
 return {type:'dispo',scale:10,elements:[c,input,spd,block,dev('a','ls',271,360),dev('b','ls',521,360),dev('c','fils',771,360,72),dev('bottom','fuse',110,1645,49,265)]};
}
test('input moves with SPD; target and intervening 250 mm modules shift left without moving bottom fuses',()=>{
 const p=fixture(),before=structuredClone(p),input=p.elements.find(e=>e.id==='input'),spd=p.elements.find(e=>e.id==='spd');
 assert.deepEqual(dispoGroup(p,input.id).map(e=>e.id),['input','spd']);
 moveDispoElements(p,new Set([input.id]),750*f,0);
 assert.equal(spd.x,843*f);assert.equal(p.elements.find(e=>e.id==='bottom').x,110*f);
 assert.equal(swapDispoDrop(p,before,[{kind:'element',id:input.id}]),true);
 for(const [id,x]of [['input',839],['spd',843],['a',21],['b',271],['c',521],['bottom',110],['incoming-supply',1184]])assert.ok(Math.abs(p.elements.find(e=>e.id===id).x-x*f)<1e-8,id);
 assert.ok(p.elements[0].dispoStructure.some(s=>s.plateType==='cover'&&s.x===754));assert.ok(p.elements[0].dispoStructure.some(s=>s.profile==='comb'&&s.x===521));
 const after=structuredClone(p);moveDispoElements(p,new Set([input.id]),-750*f,0);assert.ok(swapDispoDrop(p,after,[{kind:'element',id:input.id}]));
 for(const id of ['a','b','c','input','spd','bottom'])assert.ok(Math.abs(p.elements.find(e=>e.id===id).x-before.elements.find(e=>e.id===id).x)<1e-8,id);
});
test('decoupled SPD stays in place when the input changes module',()=>{
 const p=fixture(),input=p.elements.find(e=>e.id==='input');input.spdCoupled=false;const before=structuredClone(p);moveDispoElements(p,new Set(['input']),750*f,0);assert.ok(swapDispoDrop(p,before,[{kind:'element',id:'input'}]));assert.equal(p.elements.find(e=>e.id==='spd').x,93*f);
});
test('unlinked legacy input movement does not realign any bottom fuse',()=>{
 const p=fixture();delete p.elements.find(e=>e.id==='spd').inputOwner;const bottom=structuredClone(p.elements.find(e=>e.id==='bottom'));moveDispoElements(p,new Set(['input']),10*f,0);assert.deepEqual(p.elements.find(e=>e.id==='bottom'),bottom);assert.equal(p.elements.find(e=>e.id==='spd').x,103*f);
});
test('supply-block edge shifts a feeder sideways inside the existing field',()=>{
 const p=fixture();p.elements.find(e=>e.id==='input').x=839*f;const fuse=p.elements.find(e=>e.id==='bottom');fuse.x=1190*f;updateSupplyBlocks(p);const block=p.elements.find(e=>e.id==='incoming-supply');assert.ok(fuse.x+fuse.width*f<=block.x+.001);assert.equal(block.x,1184*f);assert.equal(p.elements[0].width,1258);
});

test('SPD coupling and owner persist in saved metadata',async()=>{const {validateDispoMetadata}=await import('../cad/dispo.mjs');assert.deepEqual(validateDispoMetadata({inputOwner:'source-input',spdCoupled:false},()=>assert.fail('metadata rejected')),{inputOwner:'source-input',spdCoupled:false});});

test('an actually full bottom zone rejects atomically without widening the cabinet',()=>{const p=fixture();p.elements.find(e=>e.id==='input').x=839*f;const fuse=p.elements.find(e=>e.id==='bottom');fuse.width=1200;fuse.x=12*f;const before=structuredClone(p);assert.throws(()=>updateSupplyBlocks(p),/Kein Platz/);assert.deepEqual(p,before);});


test('a device spanning an internal 250 mm seam moves intact with its apparatus bank',()=>{
 const p=fixture(),cross=p.elements.find(e=>e.id==='b');cross.x=490*f;cross.width=72;
 const before=structuredClone(p);moveDispoElements(p,new Set(['input']),750*f,0);
 assert.ok(swapDispoDrop(p,before,[{kind:'element',id:'input'}]));assert.ok(Math.abs(p.elements.find(e=>e.id==='b').x-240*f)<1e-8);
});
function twoFields(){const p=fixture();p.wires=[];const second={...structuredClone(p.elements[0]),id:'field2',x:1300*f,dispoStructure:[{kind:'plate',plateType:'slots',x:4,y:300,width:1250,height:400},...[367.5,492.5,617.5].map(y=>({kind:'rail',profile:'AS35',x:40,y,width:1178,height:35,depth:15,mountZ:-110}))]};p.elements.push(second);p.elements[0].dispoStructure.push({kind:'rail',profile:'AS35',x:21,y:590,width:216,height:35,depth:15,mountZ:-110});return p;}
test('cross-field drop transfers the input bay and both supports; return restores a usable source bay',()=>{
 const p=twoFields(),before=structuredClone(p);moveDispoElements(p,new Set(['input']),1800*f,0);assert.ok(swapDispoDrop(p,before,[{kind:'element',id:'input'}]));
 const first=p.elements.find(e=>e.id==='cab'),second=p.elements.find(e=>e.id==='field2'),input=p.elements.find(e=>e.id==='input'),spd=p.elements.find(e=>e.id==='spd');
 assert.ok(!first.dispoStructure.some(r=>r.frameStyle?.startsWith('incoming')));assert.equal(second.dispoStructure.filter(r=>r.frameStyle?.startsWith('incoming')).length,2);
 assert.ok(second.dispoStructure.some(r=>r.plateType==='cover'&&r.x===504));assert.ok(first.dispoStructure.some(r=>r.plateType==='slots'&&r.x===4));assert.ok(Math.abs(spd.x-input.x-4*f)<1e-8);
 for(const r of second.dispoStructure.filter(r=>r.frameStyle?.startsWith('incoming')))assert.ok(r.x>=0&&r.x+r.width<=second.width);
 const back=structuredClone(p);moveDispoElements(p,new Set(['input']),-1800*f,0);assert.ok(swapDispoDrop(p,back,[{kind:'element',id:'input'}]));assert.ok(Math.abs(input.x-before.elements.find(e=>e.id==='input').x)<1e-8);assert.equal(first.dispoStructure.filter(r=>r.frameStyle?.startsWith('incoming')).length,2);
});
test('cross-field drop exchanges occupied target devices and their comb with the old input bay',()=>{
 const p=twoFields();p.elements.push({id:'target',kind:'module',dispoKind:'ls',x:1821*f,y:360*f,width:72,height:90,dispoSource:{page:'s',element:'target',key:'$'}});p.elements.find(e=>e.id==='field2').dispoStructure.push({kind:'rail',profile:'comb',x:521,y:460,width:72,height:10});const before=structuredClone(p);moveDispoElements(p,new Set(['input']),1800*f,0);assert.ok(swapDispoDrop(p,before,[{kind:'element',id:'input'}]));assert.ok(Math.abs(p.elements.find(e=>e.id==='target').x-21*f)<1e-8);assert.ok(p.elements[0].dispoStructure.some(r=>r.profile==='comb'&&r.x===21));
});
test('live movement and decoupled SPD keep their separate support ownership at scales 1:5 and 1:10',()=>{
 for(const scale of [5,10]){const p=twoFields(),ratio=10/scale;p.scale=scale;for(const e of p.elements){e.x*=ratio;e.y*=ratio;}const input=p.elements.find(e=>e.id==='input'),spd=p.elements.find(e=>e.id==='spd');input.spdCoupled=false;const old=structuredClone(spd);moveDispoElements(p,new Set(['input']),1800*f*ratio,0);assert.deepEqual(spd,old);assert.ok(p.elements[0].dispoStructure.some(r=>r.frameStyle==='incoming-spd:spd'));const rail=p.elements.find(e=>e.id==='field2').dispoStructure.find(r=>r.frameStyle==='incoming:input');assert.ok(rail);assert.ok(rail.x+rail.width<=1258);}
});
test('owned terminal and SPD rails remain visible and persist across project validation',async()=>{
 const {project,validateProject,createElement}=await import('../cad/model.mjs'),{dispoDrawingRails}=await import('../cad/render.mjs'),d=project(),p=d.pages.find(p=>p.type==='dispo');Object.assign(p,twoFields());p.elements=p.elements.map(e=>Object.assign(createElement(p,e.kind,0,0),e));moveDispoElements(p,new Set(['input']),10*f,20*f);const r=p.elements[0].dispoStructure.find(r=>r.frameStyle==='incoming:input');assert.ok(dispoDrawingRails(p.elements[0]).some(q=>q.frameStyle===r.frameStyle&&q.x===r.x&&q.y===r.y));const restored=validateProject(d).pages.find(q=>q.id===p.id);assert.ok(restored.elements[0].dispoStructure.some(r=>r.frameStyle==='incoming-spd:spd'));
});


test('a continuous 500 mm device bank repacks into two real openings when the input moves to the middle',async()=>{
 const {plateOpenings}=await import('../cad/frame-layout.mjs');
 const p=fixture(),c=p.elements[0];c.width=758;c.dispoStructure=c.dispoStructure.filter(r=>r.plateType==='cover'||r.frameStyle?.startsWith('incoming'));
 c.dispoStructure.push({kind:'plate',plateType:'slots',x:254,y:300,width:500,height:400,cutCenterBridge:true},{kind:'rail',profile:'comb',x:278,y:428,width:360,height:10},...[367.5,492.5,617.5].map(y=>({kind:'rail',profile:'AS35',x:254,y,width:464,height:35})));
 p.elements=p.elements.filter(e=>['cab','input','spd'].includes(e.id));
 for(let i=0;i<10;i++)p.elements.push({id:'bank'+i,kind:'module',dispoKind:'ls',x:(278+36*i)*f,y:340*f,width:36,height:90,circuitName:'Allgemein',dispoSource:{page:'s',element:'bank'+i,key:'$'}});
 const before=structuredClone(p);moveDispoElements(p,new Set(['input']),250*f,0);assert.ok(swapDispoDrop(p,before,[{kind:'element',id:'input'}]));
 const openings=c.dispoStructure.filter(r=>r.plateType==='slots').flatMap(r=>plateOpenings(r.width,r.cutCenterBridge).map(o=>({x:r.x+o.x,right:r.x+o.x+o.width})));
 const bank=p.elements.filter(e=>e.id.startsWith('bank'));assert.equal(bank.length,10);
 for(const e of bank)assert.ok(openings.some(o=>e.x/f>=o.x-.01&&e.x/f+e.width<=o.right+.01),e.id);
 const combs=c.dispoStructure.filter(r=>r.profile==='comb');assert.equal(combs.length,2);assert.equal(combs.reduce((sum,r)=>sum+r.width,0),360);
 for(const b of c.dispoStructure.filter(r=>r.plateType==='blank'))assert.ok(!bank.some(e=>e.x/f<b.x+b.width-.01&&e.x/f+e.width>b.x+.01&&e.y/f<b.y+b.height&&e.y/f+e.height>b.y));
});
test('duplicating a disposition remaps the owned SPD support to the copied device',async()=>{
 const {project,createElement,duplicatePage}=await import('../cad/model.mjs'),d=project(),p=d.pages.find(p=>p.type==='dispo');Object.assign(p,twoFields());p.elements=p.elements.map(e=>Object.assign(createElement(p,e.kind,0,0),e));moveDispoElements(p,new Set(['input']),10*f,0);
 const q=duplicatePage(d,p),spd=q.elements.find(e=>e.dispoKind==='spd');assert.ok(q.elements[0].dispoStructure.some(r=>r.frameStyle==='incoming-spd:'+spd.id));
 moveDispoElements(q,new Set([spd.id]),100*f,0);const rail=q.elements[0].dispoStructure.find(r=>r.frameStyle==='incoming-spd:'+spd.id),x=rail.x;moveDispoElements(q,new Set([spd.id]),20*f,0);assert.ok(Math.abs(rail.x-x-20)<1e-8);
});
