import test from 'node:test';
import assert from 'node:assert/strict';
import {uniwayRows,selectUniway} from '../platform/uniway-model.mjs';
import {permissionsFor,pageTool,licenseModule,technicalTabs} from '../platform/model.mjs';

test('Uniway preserves the source lengths, assembly counts and exceptional rows',()=>{
 assert.equal(uniwayRows.length,56);
 const values=units=>{const r=uniwayRows.find(r=>r.units===units);return [r.systemLength,r.copperLength,r.bases10,r.bases6];};
 assert.deepEqual(values(6),[147,108,0,1]);assert.deepEqual(values(10),[219,180,1,0]);
 assert.deepEqual(values(18),[364,325,0,3]);assert.deepEqual(values(24),[473,434,0,4]);
 assert.deepEqual(values(44),[824,794,2,4]);assert.deepEqual(values(72),[1339,1300,6,2]);
 assert.deepEqual(values(74),[1357,1336,5,4]);assert.deepEqual(values(120),[2207,2168,12,0]);
 assert.deepEqual(uniwayRows.filter(r=>r.note).map(r=>r.units),[44,74]);
 for(const [i,r] of uniwayRows.entries()){
  assert.equal(r.bases10*10+r.bases6*6,r.units,'Stecksockel müssen den tabellierten Platz ergeben');
  assert.ok(r.systemLength>r.copperLength);
  if(!r.note)assert.equal(r.systemLength-r.copperLength,39);
  if(i){assert.ok(r.units>uniwayRows[i-1].units);assert.ok(r.systemLength>uniwayRows[i-1].systemLength);assert.ok(r.copperLength>uniwayRows[i-1].copperLength);}
 }
});

test('Uniway selects the next available combination without inventing intermediate rows',()=>{
 for(const [requested,expected] of [[0.5,6],[6,6],[6.5,10],[8,10],[10.5,12],[14,16],[23.5,24],[43,44],[73.5,74],[119.5,120],[120,120]]){
  const pick=selectUniway(String(requested));assert.equal(pick.status,'match');assert.equal(pick.row.units,expected);assert.equal(pick.reserve,expected-requested);
 }
 for(const value of ['',null,undefined,'   '])assert.equal(selectUniway(value).status,'empty');
 for(const value of [0,-1,2.3,NaN,Infinity,'invalid'])assert.equal(selectUniway(value).status,'invalid');
 for(const value of [120.5,121,1000])assert.equal(selectUniway(value).status,'unavailable');
});

test('Uniway access is independent from ABB and belongs to the workshop licence',()=>{
 const c={enabled:true,startsOn:'2000-01-01',endsOn:'2099-12-31'},p={modules:['workshop']};
 const rights=permissions=>permissionsFor({role:'member',permissions},c,p);
 assert.equal(rights({uniway:'read'}).uniway,'read');assert.equal(rights({uniway:'read'}).smissline,'none');
 assert.equal(rights({smissline:'write'}).uniway,'none');assert.equal(rights({workshop:'write'}).uniway,'write');
 assert.equal(rights({workshop:'write',uniway:'none'}).uniway,'none');
 assert.equal(permissionsFor({role:'member',permissions:{uniway:'write'}},c,{modules:['cad']}).uniway,'none');
 assert.equal(permissionsFor({role:'member',permissions:{uniway:'write'}},{...c,enabled:false},p).uniway,'none');
 assert.equal(licenseModule('uniway'),'workshop');assert.equal(technicalTabs.uniway,'uniway');
 assert.equal(pageTool('technik.html','#uniway'),'uniway');assert.equal(pageTool('technik.html','#abb'),'smissline');
 assert.equal(pageTool('technik.html','#toString'),'technical');
});
