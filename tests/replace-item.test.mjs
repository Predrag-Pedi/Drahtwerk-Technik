import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceItem} from '../offerten/replace-item.mjs';
import {offer,totals} from '../offerten/core.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
const next={article:'NEW',name:'Ersatzgerät',unit:'Stk.',price:20,minutes:3,rate:null,type:'Gerät'};
function fixture(){const d=offer();d.rate=100;d.plants[0].parts[0].items=[{id:'keep',article:'OLD',name:'Altgerät',qty:7,unit:'Stk.',price:50,minutes:9,rate:200,offerDescription:'Alter Sondertext',sbr:{template:{name:'Alt'},width:100,height:100}}, {id:'other',name:'Andere Position',qty:1,price:10,minutes:0}];return d;}
test('Replacement preserves count, identity, order and location, replaces all article-specific data',()=>{
 const d=fixture(),items=d.plants[0].parts[0].items,other=items[1];const replaced=replaceItem(items,'keep',next,d);
 assert.equal(items.length,2);assert.equal(items[0],replaced);assert.equal(items[1],other);
 assert.equal(replaced.qty,7);assert.equal(replaced.id,'keep');assert.equal(replaced.article,'NEW');
 assert.equal(replaced.sbr,undefined);assert.equal(replaced.offerDescription,undefined);assert.equal(replaced.rate,null);
 assert.equal(totals(d).total,185);assert.equal(next.qty,undefined);
});
test('Invalid or missing replacements do not alter the original position',()=>{
 const d=fixture(),items=d.plants[0].parts[0].items,before=JSON.stringify(items);
 assert.throws(()=>replaceItem(items,'keep',{...next,price:null},d));assert.equal(JSON.stringify(items),before);
 assert.throws(()=>replaceItem(items,'missing',next,d));assert.equal(JSON.stringify(items),before);
});
test('Replacement action is available only in app preview, never in customer export',()=>{
 const d=fixture();replaceItem(d.plants[0].parts[0].items,'keep',next,d);
 assert.match(offerHTML(d,'detail',false,true),/data-replace-position="0-0-0"/);
 assert.doesNotMatch(offerHTML(d,'detail'),/Produkt ersetzen|data-replace-position/);
});
