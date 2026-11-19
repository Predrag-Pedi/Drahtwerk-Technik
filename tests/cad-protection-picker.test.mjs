import test from 'node:test';
import assert from 'node:assert/strict';
import {choiceGroups,videoVariants} from '../cad/protection-picker.mjs';
import {protectionArticles} from '../cad/protection-catalog.mjs';

test('compact FI/LS choices show everyday currents, B/C and 30/300 mA',()=>{
 assert.deepEqual(choiceGroups('fils','current',[4,6,10,13,16,20,25,32,40],13),{primary:[10,13,16,20,25,32,40],secondary:[4,6]});
 assert.deepEqual(choiceGroups('ls','curve',['B','C','D','E','K','Z'],'C'),{primary:['B','C'],secondary:['D','E','K','Z']});
 assert.deepEqual(choiceGroups('fils','residual',[10,30,100,300],30),{primary:[30,300],secondary:[10,100]});
 assert.deepEqual(choiceGroups('fi','current',[16,25,40,63,80,100,125],40),{primary:[25,40,63],secondary:[16,80,100,125]});
});

test('selected uncommon settings remain visible when collapsed without duplicates',()=>{
 for(const [kind,key,values,selected] of [
  ['ls','current',[1,2,6,10,13,16,63,80,125],125],
  ['ls','curve',['B','C','D','E','K','Z'],'K'],
  ['fils','residual',[10,30,100,300],100],
  ['fi','rcdType',['A','A-SI','B','B+','F'],'B+']
 ]){
  const {primary,secondary}=choiceGroups(kind,key,values,selected);
  assert.ok(primary.includes(selected));assert.ok(!secondary.includes(selected));
  assert.equal(new Set([...primary,...secondary]).size,values.length);
 }
});

test('every catalogue/video value stays available and grouping never invents a value',()=>{
 for(const kind of ['fi','fils','ls'])for(const key of ['current','curve','residual','rcdType','manufacturer','icn','icu','selective']){
  const values=[...new Set([...protectionArticles.filter(a=>a.kind===kind).map(a=>a[key]),...(videoVariants[kind]?.[key]||[])].filter(v=>v!==undefined))];
  for(const selected of [undefined,...values]){
   const {primary,secondary}=choiceGroups(kind,key,values,selected);
   assert.deepEqual(new Set([...primary,...secondary]),new Set(values));
   assert.equal(primary.length+secondary.length,values.length);
   assert.deepEqual(primary,values.filter(v=>primary.includes(v)),'preserve value order');
  }
 }
 assert.deepEqual(choiceGroups('ls','current',[6],13),{primary:[],secondary:[6]});
});

test('manufacturer and additional technical properties are not hidden again',()=>{
 for(const [key,values] of [['manufacturer',['abb','hager','schneider']],['icn',[6,10]],['icu',[10,15]],['selective',[false,true]]]){
  assert.deepEqual(choiceGroups('fi',key,values,values[0]),{primary:values,secondary:[]});
 }
});
