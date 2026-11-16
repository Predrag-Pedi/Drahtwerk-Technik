import test from 'node:test';
import assert from 'node:assert/strict';
import {systemLayout} from '../cad/system-layout.mjs';
import {defaultConfig} from '../cad/dispo.mjs';
const group=(count,name)=>Array.from({length:count},(_,i)=>({kind:'fils',tag:`${name}F${i}`,breakerSystem:'smissline',width:90,height:36,depth:80,feedCurrent:125,feedFrom:'10S0',supplyKey:name,dispoTemplateId:'tl-0534',poles:1}));
const config={...defaultConfig(),buildSystem:'smissline',width:1008,height:1212,reserve:20};
const input={kind:'terminal',incoming:true,tag:'10X0',width:80,height:100,depth:60};
const main={kind:'switch',current:125,tag:'10S0',width:90,height:110,depth:80};
const rails=l=>l.parts.filter(p=>p.profile==='smissline');
test('52 and 46 PE become two original 52 PE rails with actual spare capacity and centred carriers',()=>{
 const l=systemLayout([input,main,...group(19,'a'),...group(17,'b')],config);
 assert.equal(l.overflow.length,0);const rs=rails(l);assert.equal(rs.length,2);
 assert.deepEqual(rs.map(r=>r.smisslinePE),[52,52]);assert.deepEqual(rs.map(r=>r.occupiedPE),[42,38]);
 assert.deepEqual(rs.map(r=>r.requiredReservePE),[9,8]);assert.match(rs[1].drawingLabel,/frei 14/);
 assert.equal(rs[0].y,rs[1].y);assert.equal(rs[0].height,rs[1].height);assert.equal(rs[0].dispoTemplateId,'tl-0657');
 const carriers=l.parts.filter(p=>p.frameStyle==='smissline-carrier');
 for(let i=0;i<2;i++){const centre=carriers[i].x+17.5;assert.equal(rs[i].x+rs[i].width/2,centre);assert.ok(rs[i].y+rs[i].height+25<=config.height-45);
  for(const d of l.placed.filter(d=>d.supplyKey===(i?'b':'a')))assert.equal(d.x+d.width/2,centre);
 }
 const terminal=l.placed.find(d=>d.incoming);assert.equal(terminal.x+terminal.width/2,carriers[0].x+17.5);
 const basket=l.parts.find(p=>p.profile==='wire-basket');assert.equal(basket.x-(rs[0].x+rs[0].width),rs[1].x-(basket.x+basket.width));
});
test('independent stacked supplies retain clearance, all devices and their requested reserve',()=>{
 const ds=[...group(12,'a'),...group(10,'b'),...group(6,'c'),...group(4,'d')];
 const l=systemLayout(ds,{...config,width:758,height:1200});assert.equal(l.overflow.length,0);
 assert.equal(l.placed.filter(d=>d.kind==='fils').length,ds.length);
 for(const r of rails(l)){assert.ok(r.smisslinePE>=r.occupiedPE+r.requiredReservePE);assert.ok(r.y+r.height+25<=1200-45);
  for(const q of rails(l).filter(q=>q!==r&&Math.abs(q.x+q.width/2-r.x-r.width/2)<1))assert.ok(q.y>=r.y+r.height+50||r.y>=q.y+q.height+50);
 }
});
