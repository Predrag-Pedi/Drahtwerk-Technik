import test from 'node:test';import assert from 'node:assert/strict';
import {drawingItems,drawingLines,reserveStatus} from '../waerme/drawing.mjs';
import {parsePages} from '../waerme/core.mjs';
const segment=(x,y,u,v)=>({a:{x,y},b:{x:u,y:v}});
const fixture=()=>({file:'reserve.pdf',number:2,text:'F126\nReserve\nDIN000',items:[{str:'F126',x:50,y:100,width:20,height:7},{str:'Reserve',x:40,y:110,width:30,height:7}],drawing:{complete:true,segments:[segment(78,100,78,120),segment(82,100,82,120),segment(78,100,82,100),segment(78,120,82,120),segment(0,20,300,20)]}});
test('Detached reserve symbol is excluded; unrelated bus above it does not count as wiring',()=>{const p=fixture();assert.equal(reserveStatus(p,'F126'),'unwired');const r=parsePages([p]);assert.equal(r.devices.length,0);assert.ok(r.ignored[0].includes('Reserve ohne angeschlossene Stromlinien'));});
test('Reserve with incoming or outgoing wiring stays, even without an amp value',()=>{for(const wire of [segment(80,20,80,100),segment(80,120,80,230),segment(82,110,220,110)]){const p=fixture();p.drawing.segments.push(wire);assert.equal(reserveStatus(p,'F126'),'wired');assert.equal(parsePages([p]).devices.length,1);}});
test('Missing paths, incomplete paths, an empty symbol or missing local reserve label never exclude',()=>{for(const change of [p=>delete p.drawing,p=>p.drawing.complete=false,p=>p.drawing.segments=[],p=>p.items=p.items.slice(0,1),p=>p.items[1].y=400]){const p=fixture();change(p);assert.equal(reserveStatus(p,'F126'),'');assert.equal(parsePages([p]).devices.length,1);}});
test('Text and stroked paths share rotated viewport coordinates; clipping paths are not wires',()=>{
 const OPS={save:1,restore:2,transform:3,constructPath:4,moveTo:5,lineTo:6,rectangle:7,closePath:8,stroke:9,endPath:10};const vp={transform:[0,1,1,0,0,0]};
 const list={fnArray:[1,3,4,9,2,4,10],argsArray:[[],[2,0,0,2,10,20],[[5,6],[1,2,3,4]],[],[],[[5,6],[0,0,100,100]],[]]};
 const r=drawingLines(list,OPS,vp);assert.equal(r.complete,true);assert.deepEqual(r.segments,[segment(24,12,28,16)]);
 const items=drawingItems({items:[{str:'F126',transform:[0,-7,7,0,12,24],width:20}]},vp);assert.equal(items[0].x,24);assert.equal(items[0].y,12);assert.equal(items[0].rotated,false);
});
test('A detached depiction does not suppress another wired occurrence of the same device',()=>{const a=fixture(),b=fixture();b.number=3;b.drawing.segments.push(segment(80,20,80,100));for(const pages of [[a,b],[b,a]])assert.equal(parsePages(pages).devices.length,1);});
