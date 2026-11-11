import test from 'node:test';import assert from 'node:assert/strict';
import {offer,plant,part,offerText,totals,validateOffer} from '../offerten/core.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
function fixture(){const d=offer();d.rate=100;d.discount=5;d.plants[0].parts[0].items=[{article:'A',name:'Schrank <blau>',qty:2,unit:'Stk.',price:130,minutes:6}];d.plants[0].parts.push(part('Einbauten'));d.plants[0].parts[1].items=[{article:'B',name:'LS',qty:3,unit:'Stk.',price:13.37,minutes:0}];d.plants.push(plant('UV'));d.plants[1].parts[0].items=[{article:'C',name:'Klemme',qty:10,unit:'Stk.',price:1,minutes:0}];return d;}
test('Plant prices retain every item and quantity but hide item and part amounts',()=>{const d=fixture();for(const render of [offerHTML,offerText]){const s=render(d,'plant');assert.match(s,/Schrank/);assert.match(s,/LS/);assert.match(s,/Klemme/);assert.match(s,/320.11/);assert.doesNotMatch(s,/13.37|40.11|280.00|140.00|Total Feld 1|Einzelpreis/);assert.match(s,/313.60/);}});
test('Detailed mode shows selling unit price including labour, quantities and amounts',()=>{const d=fixture();for(const render of [offerHTML,offerText]){const s=render(d,'detail');assert.match(s,/Einzelpreis/);assert.match(s,/140.00/);assert.match(s,/280.00/);assert.match(s,/13.37/);assert.match(s,/40.11/);assert.match(s,/313.60/);}});
test('Rendering modes do not change totals or offer positions',()=>{const d=fixture(),snapshot=JSON.stringify(d),before=totals(d);for(const mode of ['plant','detail','summary']){offerHTML(d,mode);offerText(d,mode);}assert.equal(JSON.stringify(d),snapshot);assert.deepEqual(totals(d),before);});
test('Customer input is escaped in rich text; table spans match selected columns',()=>{const d=fixture();d.customer='<img src=x onerror=alert(1)>';const h=offerHTML(d,'detail');assert.ok(!h.includes('<img src=x'));assert.match(h,/alt="Drahtwerk"/);assert.match(h,/&lt;img/);assert.match(h,/colspan="4"/);assert.match(h,/colspan="5"/);assert.doesNotMatch(h,/colspan="6"/);});
test('Saved price mode survives backup; old offers use plant mode',()=>{const d=fixture();d.outputMode='detail';assert.equal(validateOffer(JSON.parse(JSON.stringify(d))).outputMode,'detail');delete d.outputMode;assert.equal(validateOffer(d).outputMode,'plant');});
test('Invalid or empty quotes cannot produce a misleading formatted offer',()=>{assert.throws(()=>offerHTML(offer()),/Positionen/);const d=fixture();d.plants[0].parts[0].items[0].price=null;assert.throws(()=>offerHTML(d),/Grundpreis/);});
test('Totals-only mode shows individual plant totals and retains fields and cabinets without other devices or position controls',()=>{
 const d=fixture();d.plants[0].offerDescription='Ausführung mit PVC hellgrau';
 const before=totals(d),snapshot=JSON.stringify(d);
 for(const render of [offerHTML,offerText]){
 const s=render(d,'totals');
 assert.match(s,/Hauptverteilung/);assert.match(s,/UV/);assert.match(s,/320.11/);assert.match(s,/10.00/);assert.match(s,/313.60/);
 assert.match(s,/Ausführung mit PVC hellgrau/);
 assert.match(s,/Schrank/);assert.match(s,/Feld 1/);assert.match(s,/Einbauten/);assert.doesNotMatch(s,/Klemme|Einzelpreis|Artikelbezeichnung/);
 }
 assert.doesNotMatch(offerHTML(d,'totals',false,true),/data-replace-position/);
 assert.equal(JSON.stringify(d),snapshot);assert.deepEqual(totals(d),before);
 d.outputMode='totals';assert.equal(validateOffer(JSON.parse(JSON.stringify(d))).outputMode,'totals');
});

import {visibleInTotals} from '../offerten/core.mjs';
test('Totals-only retains dynamic SBR and imported cabinet descriptions, not ordinary equipment',()=>{
 const d=fixture();
 d.plants[0].parts[0].items.push({article:'SBR',name:'Rahmen',type:'SBR – Dynamisch',qty:1,unit:'Stk.',price:100,minutes:0,sbr:{template:{name:'SBR Rahmen'},width:1000,height:2000,depth:400,top:'Moosgummi',bottom:'Geschlossen',pvc:'Hellgrau'}});
 for(const render of [offerHTML,offerText]){const output=render(d,'totals');assert.match(output,/SBR Rahmen/);assert.match(output,/Moosgummi/);assert.match(output,/Hellgrau/);assert.doesNotMatch(output,/Klemme/);}
 assert.equal(visibleInTotals({name:'Standardschrank AN 1000x2000, ohne Seitenwand',type:'Artikel'}),true);
 assert.equal(visibleInTotals({name:'SBR Profil',type:'Artikel'}),false);
 assert.equal(visibleInTotals({name:'Schrank Zubehör',type:'Artikel'}),false);
 assert.equal(visibleInTotals({name:'Individuelle Ausführung',type:'Schrank'}),true);
});
