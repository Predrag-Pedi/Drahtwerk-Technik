import test from 'node:test';
import assert from 'node:assert/strict';
import {filterLibrary,rememberTemplate,readLibrarySettings} from '../cad/library.mjs';
const items=[{id:'a',name:'FI LS 3LN',group:'Schutz',category:'Schema',source:''},{id:'b',name:'LS 1LN',group:'Schutz',category:'Schema',source:''},{id:'c',name:'LS 3LN',group:'Geräte',category:'Dispo',source:''}];
test('library combines words, category, group and favorites without hiding unrelated source data',()=>{assert.deepEqual(filterLibrary(items,{query:'3ln fi',category:'Schema',group:'Schutz',scope:'favorites',favorites:['a','c']}).map(x=>x.id),['a']);assert.equal(items.length,3);});
test('recent library is unique, ordered by usage and limited',()=>{assert.deepEqual(rememberTemplate(['a','b'],'b'),['b','a']);assert.deepEqual(filterLibrary(items,{scope:'recent',recent:['b','a']}).map(x=>x.id),['b','a']);assert.equal(rememberTemplate(Array.from({length:30},(_,i)=>String(i)),'new').length,24);});
test('library settings tolerate corrupt or unavailable storage',()=>{for(const storage of [{getItem:()=>'{broken'},{getItem:()=>{throw Error('blocked');}},{getItem:()=> 'null'}])assert.deepEqual(readLibrarySettings(storage),{favorites:[],recent:[]});assert.deepEqual(readLibrarySettings({getItem:()=>'{"favorites":["a",4],"recent":["b"]}'}),{favorites:['a'],recent:['b']});});

test('KNX filters use function and manufacturer while original source terms remain searchable',async()=>{
 const {libraryFacets,libraryName}=await import('../cad/library.mjs');
 const knx={id:'k',name:'Schaltaktor · AKS0416',group:'MDT',category:'Schema',source:'Symbole TinLine/182-KNX/MDT/AKS0416.dwg'};
 assert.deepEqual(libraryFacets(knx),{domain:'KNX',manufacturer:'MDT',group:'Schaltaktoren'});
 assert.equal(filterLibrary([knx],{domain:'KNX',manufacturer:'MDT',group:'Schaltaktoren',query:'AKS0416'}).length,1);
 assert.equal(filterLibrary([knx],{manufacturer:'Hager'}).length,0);
 assert.equal(libraryName('250x525'),'250x525');assert.equal(libraryName('100_Einspeisung_3LNPE'),'Einspeisung 3LNPE');
 assert.equal(libraryFacets({...knx,source:'Symbole TinLine/tinAutomation/WAGO/x.dwg',group:'BusklemmenDigIN',name:'Klemme'}).group,'Busklemmen · Digitale Eingänge');
});
test('technical separators, umlaut keyboard spellings and compact FI/LS searches find templates',()=>{
 const list=[{...items[0],name:'501_FI_LS_3LNPE_16A'},{...items[1],name:'Zähleranschluss 6mm2'}];
 for(const query of ['FI/LS 16A','fi-ls','fils'])assert.deepEqual(filterLibrary(list,{query}).map(t=>t.id),['a']);
 assert.equal(filterLibrary([{...items[0],name:'F_954',group:'Hager-Schränke'}],{query:'Schrank'}).length,1);
 for(const query of ['Zaehler','Zähler','6mm²'])assert.deepEqual(filterLibrary(list,{query}).map(t=>t.id),['b']);
});
test('macro category excludes individual symbols and name hits rank above folder-only hits',()=>{
 const list=[{...items[0],name:'Andere Vorlage',source:'Makros/LS/'},{...items[1],name:'LS 13A',source:'Makros/Abgang/'},{...items[2],name:'LS 13A',source:'Symbole/'}];
 assert.deepEqual(filterLibrary(list,{category:'Makro',query:'LS'}).map(t=>t.id),['b','a']);
 assert.deepEqual(filterLibrary(list,{category:'Dispo',query:'LS'}).map(t=>t.id),['c']);
});
