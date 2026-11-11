import test from 'node:test';
import assert from 'node:assert/strict';
import {offer,validateOffer,offerStatus,OFFER_STATUSES,totals,offerText} from '../offerten/core.mjs';
test('New and legacy offers default to open; unknown status values cannot enter the UI',()=>{
 assert.equal(offer().status,'open');
 const d=offer();delete d.status;assert.equal(validateOffer(d).status,'open');
 for(const value of [undefined,null,'unknown','__proto__','<script>'])assert.equal(offerStatus(value),'open');
 assert.deepEqual(Object.values(OFFER_STATUSES),['Offen','Genehmigt','Storniert']);
});
test('Every status survives backup and may return to open without changing the quote calculation or text',()=>{
 const d=offer();d.plants[0].parts[0].items=[{id:'a',article:'A',name:'Gerät',unit:'Stk.',qty:7,price:10,minutes:0}];
 const before=totals(d).total,text=offerText(d);
 for(const status of ['approved','cancelled','open']){
 d.status=status;const restored=validateOffer(JSON.parse(JSON.stringify(d)));
 assert.equal(restored.status,status);assert.equal(totals(restored).total,before);assert.equal(offerText(restored),text);
 }
});
