import test from 'node:test';import assert from 'node:assert/strict';
import {neutralArtwork,safeLogo} from '../platform/branding.mjs';
import {emptyProfile,licenseActive,permissionsFor} from '../platform/model.mjs';
import {pack,unpack} from '../platform/client.mjs';
import artwork from '../cad/standard-pages.mjs';
import {standardFrame} from '../cad/standard-render.mjs';
import {project} from '../cad/model.mjs';
import {offer} from '../offerten/core.mjs';
import {offerHTML} from '../offerten/offer-document.mjs';
test('standard frame removes fixed company/supplier glyphs and embedded logo without removing drawing content',()=>{
 for(const [name,svg] of Object.entries(artwork)){const clean=neutralArtwork(svg,name==='cover');const glyphs=[...clean.matchAll(/data-text="([^"]*)"/g)].map(m=>m[1]).join('');assert.doesNotMatch(glyphs,/Drahtwerk|Lochackerstrasse|8424 Embrach|TinLine|drahtwerk\.ch/);assert.doesNotMatch(clean,/<image\b/);assert.match(clean,/<path\b/);}
 const d=project('Test'),p=d.pages[2],blank=standardFrame(d,p,emptyProfile());assert.doesNotMatch(blank,/<image\b/);
 const rendered=standardFrame(d,p,{...emptyProfile(),name:'Alpha & Beta AG',street:'Testweg 1',city:'Baden'});assert.match(rendered,/Alpha &amp; Beta AG/);assert.match(rendered,/Testweg 1/);
});
test('unconfigured company has blank offer letterhead; configured values are escaped and independent',()=>{
 const d=offer();d.plants[0].parts[0].items=[{article:'A',name:'LS',price:10,qty:1,minutes:0}];
 const blank=offerHTML(d);assert.doesNotMatch(blank,/Drahtwerk|Lochacker|CHE-242|<img/);
 const alpha=offerHTML(d,'plant',false,{...emptyProfile(),name:'Alpha <AG>',city:'Baden',vat:'CHE-123'});assert.match(alpha,/Alpha &lt;AG&gt;/);assert.match(alpha,/CHE-123/);assert.doesNotMatch(offerHTML(d,'plant',false,{...emptyProfile(),name:'Beta'}),/Alpha|CHE-123/);
 assert.equal(safeLogo('javascript:alert(1)'),'');assert.equal(safeLogo('data:image/svg+xml;base64,WA=='),'');
});
test('binary templates survive server JSON encoding without retaining data from another record',async()=>{
 const bytes=new Uint8Array([0,255,38,77]),value={buffer:bytes.buffer,data:bytes,list:[{name:'Excel'}]};const encoded=await pack(value),decoded=unpack(JSON.parse(JSON.stringify(encoded)));assert.deepEqual(new Uint8Array(decoded.buffer),bytes);assert.deepEqual(decoded.data,bytes);assert.deepEqual(decoded.list,value.list);
});
test('plan, date range and staff permissions intersect; developer is an explicit separate role',()=>{
 const company={enabled:true,startsOn:'2020-01-01',endsOn:'2099-12-31'},plan={modules:['cad']},user={role:'member',permissions:{cad:'read',offers:'write'}};assert.equal(permissionsFor(user,company,plan).cad,'read');assert.equal(permissionsFor(user,company,plan).offers,'none');assert.equal(licenseActive(company,'2020-01-01'),true);assert.equal(licenseActive(company,'2099-12-31'),true);assert.equal(licenseActive(company,'2100-01-01'),false);assert.equal(permissionsFor(user,{...company,enabled:false},plan).cad,'none');
});
