import test from 'node:test';import assert from 'node:assert/strict';
import {reportValues,REPORT_SHEETS,imagePdf} from '../waerme/report-pdf.mjs';
import {exportFilename} from '../waerme/core.mjs';
const sheet=values=>({cells:new Map(Object.entries(values))});
test('Report formulas follow live references, strings, sums and square roots',()=>{
 const sheets=new Map([['Projektdaten',sheet({A1:{value:'Aktueller Kunde'},A2:{value:315},A3:{value:500},A4:{value:320}})],['Temperaturnachweis',sheet({A1:{formula:'Projektdaten!A1&" / "&"Anlage"',value:'ALT'},A2:{formula:'Projektdaten!A3-Projektdaten!A4',value:0},A3:{formula:'SQRT(Projektdaten!A3/Projektdaten!A4)'},A4:{formula:'ROUND(1.7*Projektdaten!A2,0)'},A5:{formula:'SUM(A2:A4)'},A6:{formula:'\'Projektdaten\'!A2'},A7:{formula:'HYPERLINK("https://example.com")'}})]]);const get=reportValues(sheets);
 assert.equal(get('Temperaturnachweis','A1'),'Aktueller Kunde / Anlage');assert.equal(get('Temperaturnachweis','A2'),180);assert.equal(get('Temperaturnachweis','A3'),1.25);assert.equal(get('Temperaturnachweis','A4'),536);assert.equal(get('Temperaturnachweis','A5'),717.25);assert.equal(get('Temperaturnachweis','A6'),315);assert.throws(()=>get('Temperaturnachweis','A7'),/Nicht unterstützte Funktion/);
});
test('Blank dates stay blank, circular formulas fail, missing sheets fail',()=>{
 const get=reportValues(new Map([['A',sheet({A1:{value:null},A2:{formula:'A1'},A3:{formula:'A4'},A4:{formula:'A3'},A5:{formula:'Fehlt!A1'}})]]));assert.equal(get('A','A2'),'');assert.throws(()=>get('A','A3'),/Zirkel/);assert.throws(()=>get('A','A5'),/fehlt/);
});
test('PDF sheets and filenames have the requested order',()=>{
 assert.deepEqual(REPORT_SHEETS,['Bauartnachweis','Stücknachweis','Temperaturnachweis','Konformität']);const used=new Set(),p={order:'AU-00744',name:'HV Zürich'};assert.equal(exportFilename(p,used,true),'AU-00744 - Konformität - HV Zürich.pdf');assert.equal(exportFilename(p,used,true),'AU-00744 - Konformität - HV Zürich (2).pdf');assert.equal(exportFilename(p,used),'AU-00744 - HV Zürich.xlsx');
});
test('PDF binary offsets and page tree are valid for all four pages',async()=>{
 const bytes=new Uint8Array([255,216,255,217]),blob=imagePdf(Array.from({length:4},()=>({width:1,height:1,bytes}))),buffer=new Uint8Array(await blob.arrayBuffer()),text=new TextDecoder().decode(buffer);assert.equal(blob.type,'application/pdf');assert.match(text,/\/Count 4/);const xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(buffer.slice(xref,xref+4)),'xref');const entries=text.slice(text.indexOf('0000000000 65535 f')).split('\n').slice(1,15);entries.forEach((line,i)=>{const off=Number(line.slice(0,10));assert.ok(new TextDecoder().decode(buffer.slice(off,off+15)).startsWith((i+1)+' 0 obj'));});
});
test('Parameter IF and cross-sheet SUM use current quantities',()=>{
 const sheets=new Map([['Parameter',sheet({H1:{formula:"SUM('Mengen'!A1:A3)"},F2:{formula:'IF(H1>0,A2,A3)'},A2:{value:'Leistungsverteiler'},A3:{value:'Installationsverteiler'}})],['Mengen',sheet({A1:{value:0},A2:{value:1},A3:{value:0}})]]);assert.equal(reportValues(sheets)('Parameter','F2'),'Leistungsverteiler');sheets.get('Mengen').cells.get('A2').value=0;assert.equal(reportValues(sheets)('Parameter','F2'),'Installationsverteiler');
});
