import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCatalog} from '../offerten/catalog-filters.mjs';
const items=[
 {name:'LS',brand:'Schneider',category:'Schutzschaltgeräte',source:'vsas'},
 {name:'Schütz',brand:'Schneider',category:'Schütze',source:'vsas'},
 {name:'FILS',brand:'Hager',category:'Schutzschaltgeräte',source:'vsas'},
 {name:'Schrank',brand:'Almatec',category:'Schränke',source:'vsas'},
 {name:'Eigener Schrank',brand:'Hager',category:'Schränke',source:'own',type:'Schrank'}
];
test('manufacturer restricts categories and category restricts manufacturers',()=>{
 assert.deepEqual(filterCatalog(items,{brand:'Schneider'}).facets.category,['Schütze','Schutzschaltgeräte']);
 assert.deepEqual(filterCatalog(items,{category:'Schutzschaltgeräte'}).facets.brand,['Hager','Schneider']);
});
test('each facet ignores itself, enabling changes and clearing without locking in',()=>{
 const r=filterCatalog(items,{brand:'Schneider',category:'Schutzschaltgeräte'});
 assert.equal(r.found.length,1);assert.equal(r.found[0].name,'LS');
 assert.deepEqual(r.facets.brand,['Hager','Schneider']);assert.equal(r.facets.category.length,2);
 assert.equal(filterCatalog(items,{}).found.length,5);
});
test('source, type and text constrain options across the full catalogue',()=>{
 assert.deepEqual(filterCatalog(items,{source:'own'}).facets.category,['Schränke']);
 assert.deepEqual(filterCatalog(items,{type:'Schrank'}).facets.brand,['Hager']);
 assert.deepEqual(filterCatalog(items,{},'FILS').facets.brand,['Hager']);
 assert.deepEqual(filterCatalog(items,{},'missing').facets,{category:[],brand:[],type:[]});
 assert.deepEqual(filterCatalog([],{}).found,[]);
});
test('no mutation, duplicate options or dependence on displayed page size',()=>{
 const before=JSON.stringify(items),r=filterCatalog([...items,...items],{});
 assert.equal(r.facets.brand.length,3);assert.equal(r.found.length,10);assert.equal(JSON.stringify(items),before);
});
