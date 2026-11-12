import test from 'node:test';
import assert from 'node:assert/strict';
import {filterLibrary,rememberTemplate,readLibrarySettings} from '../cad/library.mjs';
const items=[{id:'a',name:'FI LS 3LN',group:'Schutz',category:'Schema',source:''},{id:'b',name:'LS 1LN',group:'Schutz',category:'Schema',source:''},{id:'c',name:'LS 3LN',group:'Geräte',category:'Dispo',source:''}];
test('library combines words, category, group and favorites without hiding unrelated source data',()=>{assert.deepEqual(filterLibrary(items,{query:'3ln fi',category:'Schema',group:'Schutz',scope:'favorites',favorites:['a','c']}).map(x=>x.id),['a']);assert.equal(items.length,3);});
test('recent library is unique, ordered by usage and limited',()=>{assert.deepEqual(rememberTemplate(['a','b'],'b'),['b','a']);assert.deepEqual(filterLibrary(items,{scope:'recent',recent:['b','a']}).map(x=>x.id),['b','a']);assert.equal(rememberTemplate(Array.from({length:30},(_,i)=>String(i)),'new').length,24);});
test('library settings tolerate corrupt or unavailable storage',()=>{for(const storage of [{getItem:()=>'{broken'},{getItem:()=>{throw Error('blocked');}},{getItem:()=> 'null'}])assert.deepEqual(readLibrarySettings(storage),{favorites:[],recent:[]});assert.deepEqual(readLibrarySettings({getItem:()=>'{"favorites":["a",4],"recent":["b"]}'}),{favorites:['a'],recent:['b']});});
