import test from 'node:test';
import assert from 'node:assert/strict';
import {csvStream,vsasImporter,importVSAS} from '../offerten/vsas.mjs';
import {articleSnapshot} from '../offerten/articles.mjs';
import {line,offer} from '../offerten/core.mjs';
const headers=['VSASNR','Artikelnummer','Bestellnummer','Hersteller','TextD','LangTextD','Listenpreis','PreisMenge','StuekPreis','Waehrung','Zeit','Aktiv','Bestelleinheit'];
const base=['AC.001','001','0001','AC','Schütz','Beschreibung','2000','100','20','CHF','0.2','1','stk'];
const run=(rows,options)=>{const i=vsasImporter(options);[headers,...rows].forEach((r,n)=>i.row(r,n+1));return i.finish();};
test('streaming CSV handles every split, UTF8 BOM, NUL, CRLF, quotes and multiline cells',()=>{
 const input='\uFEFFid;text;price\r\n001;"A;B\r\nC ""D""";2\r\n002;\0;3';const expected=[['id','text','price'],['001','A;B\r\nC "D"','2'],['002','','3']];
 for(let split=0;split<=input.length;split++){const rows=[],p=csvStream(r=>rows.push(r));p.push(input.slice(0,split));p.push(input.slice(split));p.finish();assert.deepEqual(rows,expected);}
 const p=csvStream(()=>{});p.push('id;"unclosed');assert.throws(()=>p.finish());
});
test('VSAS uses unique id and preserves leading zeros; piece price never divided twice; hours become minutes',()=>{const {items}=run([base]);const a=items[0];assert.equal(a.article,'AC.001');assert.equal(a.supplierArticle,'001');assert.equal(a.orderNumber,'0001');assert.equal(a.price,20);assert.equal(a.minutes,12);const d=offer();d.rate=120;const snap=articleSnapshot(a);assert.deepEqual(line({...snap,qty:2},d),{unit:44,total:88});a.price=30;assert.equal(snap.price,20);});
test('fallback list price uses price quantity, not packaging; minute mode stays unchanged',()=>{const row=[...base];row[8]='';assert.equal(run([row]).items[0].price,20);assert.equal(run([row],{timeUnit:'minutes'}).items[0].minutes,0.2);});
test('currency conversion is explicit and does not relabel EUR or missing currency as CHF',()=>{const eur=[...base];eur[9]='EUR ';const blank=[...base];blank[0]='AC.002';blank[9]='';assert.equal(run([eur,blank]).counts.currency,2);const r=run([eur,blank],{eurRate:0.95,blankCurrencyCHF:true});assert.equal(r.items[0].price,19);assert.equal(r.items[1].price,20);assert.throws(()=>run([],{eurRate:0}));});
test('bad rows, inactive, duplicate and invalid values reported without dropping valid catalogue',()=>{const off=[...base];off[11]='0';const badprice=[...base];badprice[8]='NaN';const badtime=[...base];badtime[10]='-1';const r=run([base,base,off,base.slice(0,5),badprice,badtime]);assert.equal(r.items.length,1);assert.equal(r.issues.length,5);assert.equal(r.counts.duplicate,1);assert.equal(r.counts.inactive,1);assert.equal(r.counts.malformed,1);assert.equal(r.counts.invalid,2);});
test('empty time and explicit zero prices remain visible in the report',()=>{const row=[...base];row[10]='';row[8]='0';const r=run([row]);assert.equal(r.counts.missingTime,1);assert.equal(r.counts.zeroPrice,1);assert.equal(r.items[0].missingTime,true);assert.equal(r.items[0].minutes,0);});
test('file importer streams and produces progress and normalized rows',async()=>{const csv=[headers,base].map(r=>r.join(';')).join('\r\n');let percent;const r=await importVSAS(new Blob([csv]),{},p=>percent=p);assert.equal(r.items.length,1);assert.equal(percent,100);});
