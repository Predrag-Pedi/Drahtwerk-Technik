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
test('blocked supply-block edge reports a conflict without moving any fuses',()=>{
 const p=fixture();p.elements.find(e=>e.id==='input').x=839*f;const fuse=p.elements.find(e=>e.id==='bottom');fuse.x=1190*f;assert.throws(()=>updateSupplyBlocks(p),/kein Platz/);assert.equal(fuse.x,1190*f);
});

test('SPD coupling and owner persist in saved metadata',async()=>{const {validateDispoMetadata}=await import('../cad/dispo.mjs');assert.deepEqual(validateDispoMetadata({inputOwner:'source-input',spdCoupled:false},()=>assert.fail('metadata rejected')),{inputOwner:'source-input',spdCoupled:false});});
