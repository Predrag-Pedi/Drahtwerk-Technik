import test from 'node:test';
import assert from 'node:assert/strict';
import {offer} from '../offerten/core.mjs';
import {renderOfferPages} from '../offerten/offer-pdf.mjs';
import {imagePdf} from '../offerten/image-pdf.mjs';
function fixture(n=1){const d=offer();d.number='AN-123';d.rate=100;d.plants[0].parts[0].items=Array.from({length:n},(_,i)=>({name:'Gerät '+i,qty:2,unit:'Stk.',price:10,minutes:6}));return d;}
function environment(){return {loadImage:async()=>({}),createCanvas:()=>{const text=[];const ctx={scale(){},fillRect(){},drawImage(){},fillText(s,x,y){text.push({s,x,y});},measureText(s){return {width:s.length*5};},beginPath(){},moveTo(){},lineTo(){},stroke(){}};return {text,getContext:()=>ctx};}};}
test('PDF respects grouped/detail prices and retains original quote',async()=>{const d=fixture(),before=JSON.stringify(d);for(const mode of ['plant','detail','summary']){const pages=await renderOfferPages(d,mode,environment());const text=pages.flatMap(p=>p.text.map(t=>t.s));assert.ok(text.includes('Gerät 0'));assert.equal(text.includes('Einzelpreis'),mode==='detail');assert.equal(text.includes('20.00'),mode==='detail');assert.ok(text.includes('40.00'));}assert.equal(JSON.stringify(d),before);});
test('Long offers keep all positions, repeat headings and number pages',async()=>{const pages=await renderOfferPages(fixture(130),'detail',environment());assert.ok(pages.length>2);const text=pages.flatMap(p=>p.text.map(t=>t.s));for(let i=0;i<130;i++)assert.ok(text.includes('Gerät '+i));pages.forEach((p,i)=>assert.ok(p.text.some(t=>t.s==='Seite '+(i+1)+' / '+pages.length)));assert.ok(text.filter(t=>t==='Artikelbezeichnung').length>1);});
test('Invalid offers cannot be exported',async()=>{await assert.rejects(renderOfferPages(offer(),'plant',environment()),/Positionen/);});
test('PDF writer produces an A4 PDF blob',async()=>{const b=imagePdf([{width:100,height:100,bytes:new Uint8Array([255,216,255,217])}]);assert.equal(b.type,'application/pdf');const s=await b.text();assert.match(s,/^%PDF-1.4/);assert.match(s,/MediaBox \[0 0 595.28 841.89\]/);assert.match(s,/%%EOF/);});
