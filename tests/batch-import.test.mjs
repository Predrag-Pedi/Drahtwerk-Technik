import test from 'node:test';import assert from 'node:assert/strict';
import {buildPortfolio,identity,disposition,objectAddress} from '../waerme/portfolio.mjs';
import {parsePages,maxPv,validateFields} from '../waerme/core.mjs';
const doc=(file,texts)=>({file,pages:texts.map((text,i)=>({file,number:i+1,text,height:600,items:[]}))});
test('Hager without disposition joins only matching order and takes dimensions and supply from its cabinet position',()=>{
 const schema=doc('drawing.pdf',['ELEKTROSCHEMA\nUnterverteilung\nAU-98765\nObjekt:\nWinkel\n8180\nIn der Beispielwiese 20','11F1\n13A\nC\n30mA']);
 const order=doc('order.pdf',['Auftragsbestätigung\nAU-98765\nUmbau vor Ort 1x NH00 125A\nAP-Feldverteiler Hager univers 5-reihig','550×800×160mm\nZuleitung 5x25mm2 80A']);
 for(const docs of [[schema,order],[order,schema]]){const r=buildPortfolio(docs);assert.equal(r.pending.length,0);assert.equal(r.plants.length,1);const p=r.plants[0];assert.deepEqual(p.fields.map(f=>[f.type,f.b,f.h,f.t]),[['Hager',550,800,160]]);assert.equal(p.project.amp,80);assert.equal(p.devices.length,1);assert.ok(validateFields(p.fields));assert.equal(p.project.object,'In der Beispielwiese 20, 8180 Winkel');}
 const other=doc('other.pdf',['Auftragsbestätigung\nAU-00000\nFeldverteiler Hager\n550×800×160mm']);assert.equal(buildPortfolio([schema,other]).plants.length,0);
 const get=()=>1;assert.equal(maxPv('Hager',550,800,160,get),maxPv('ARS',550,800,160,get));
});
test('UV serving several houses must not acquire single-house identity; text mentioning disposition is no drawing',()=>{
 assert.equal(identity('Unterverteilung Neubau Haus A-D'),'Unterverteilung Neubau Haus A-D');assert.equal(identity('Haus A\nHauptverteilung Neubau'),'HV Haus A');
 assert.equal(disposition({text:'Die Positionen werden mittels\nDisposition des\nSchaltschrankbauers definiert',items:[],height:600}),null);
});
test('Mixed order construction must not turn an explicitly labelled ARS cabinet into SBR',()=>{
 const r=buildPortfolio([doc('layout.pdf',['Dispo\nAU-98765\nAlu-Reihenschrank\nB850x H2100x T300mm']),doc('order.pdf',['Auftragsbestätigung\nAU-98765\nAlu-Selbstbaurahmen\nB1258x H1700x T165mm\nAlu-Reihenschrank\nB850x H2100x T300mm'])]);assert.equal(r.plants[0].fields[0].type,'ARS');
});
test('EPLAN leading descriptions and decimal RCD ratings do not borrow the next current',()=>{
 const r=parsePages(doc('sample.pdf',['Hauptschalter\n100A\n-43Q2\n1\n2\n3\n4\n5\n6\nFehlerstromschutzschalter\nFS451 M-C 13/0.03\n13A/0,03A\nI\nT\n-43F4\n1\n2\nN\nN','Leitungsschutzschalter\nS401 M-C 13\n13A\n-58F1\n1\n2\nN\nN','FI / LS Kombi\nFS403M-C32/0.03\n32 / 0.03A\nI\nT\n-47F2\n1\n2\n3\n4\n5\n6\nN\nN']).pages);
 assert.deepEqual(r.devices.map(d=>[d.ref,d.kind,d.amp,d.ma]),[['-43Q2','MAIN',100,null],['-43F4','FILS',13,30],['-58F1','LS',13,null],['-47F2','FILS',32,30]]);
});
test('Overview and material pages do not mask actual components; external equipment is excluded',()=>{
 const r=parsePages(doc('sample.pdf',['Prinzipschema\n-58F1\n-170Y1\n+Ext','Materialliste\n-58F1','Leitungsschutzschalter\n13A\n-58F1\n1\n2\nN\nN','-80A3\n+Ext\nGateway']).pages);assert.deepEqual(r.devices.map(d=>d.ref),['-58F1']);assert.equal(r.devices[0].kind,'LS');
});
test('A main switch on the same sheet as SPD is not itself counted as SPD',()=>{
 const r=parsePages(doc('sample.pdf',['1\n2\n3\n4\n5\n6\n7\n8\n10Q0\n80A\nZuleitung ab UV Allgemein\nÜberspannungsschutz\n10F4']).pages);assert.deepEqual(r.devices.map(d=>d.kind),['MAIN','SPD']);
});
test('Reverse project address survives blank PDF text runs and alphabetic house ranges',()=>assert.equal(objectAddress([{text:'Objekt:\n\nWetzikon\n \n8623\nBahnhofstrasse 234A-D'}]),'Bahnhofstrasse 234A-D, 8623 Wetzikon'));
test('Cabinet description with plinth annotation wins over inner-width and closed-door view dimensions',()=>{
 const layout=doc('layout.pdf',['ELEKTROSCHEMA\nAU-98765', 'Dispo\nAU-98765\nB1650x H2100 (inkl. Sockel)x T400mm best. aus:\nBandung: Doppelflüglig\n100mm Sockel schwarz\nZuleitung 5x35mm2 100A']);
 layout.pages[1].items=[{str:'1650',x:150,y:80},{str:'1600',x:150,y:100},{str:'2000',x:30,y:300,rotated:true},{str:'2100',x:350,y:300,rotated:true}];
 const order=doc('order.pdf',['Auftragsbestätigung\nAU-98765\nAlu-Reihenschrank\nB1650x H2100x T400mm']);
 const p=buildPortfolio([layout,order]).plants[0];assert.deepEqual(p.fields.map(f=>[f.type,f.b,f.h,f.t]),[['ARS',1650,2100,400]]);assert.equal(p.project.amp,100);
 assert.equal(disposition({text:'Dispo\nB1000/800x H2100 (inkl. Sockel)x T400mm',height:600,items:[]}).fields.length,2);
});

test('Cover project description supplies plant name while address remains object',()=>{
 for(const cover of ['ELEKTROSCHEMA\nProjektbeschreibung:\nHauptverteilung\nObjekt:\nBeispielweg 8\n8000 Zürich', 'Objekt:\nProjektbeschreibung:\nELEKTROSCHEMA\nHauptverteilung\nZürich\n8000\nBeispielweg 8']){
  const r=buildPortfolio([doc('2026-10-29_Beispielweg 8.pdf',[cover,'Dispo\nB1000x H2000x T400mm\nAlu-Reihenschrank','10F2\nLS C13A'])]);
  assert.equal(r.plants.length,1);assert.equal(r.plants[0].name,'Hauptverteilung');assert.equal(r.plants[0].project.name,'Hauptverteilung');assert.equal(r.plants[0].project.object,'Beispielweg 8, 8000 Zürich');
 }
 assert.equal(identity('ELEKTROSCHEMA\nProjektbeschreibung:\nUnterverteilung Garage'),'Unterverteilung Garage');
 assert.equal(identity('ELEKTROSCHEMA\nProjektbeschreibung:\nHauptverteilung\nHaus B'),'HV Haus B');
});

test('Protection ratings before references belong to their own circuit including the final device',()=>{
 const p=doc('schema.pdf',['30mA\n13A\nC\nN\nN\n2\n1\n-65F2\n30mA\n16A\nC\nN\nN\n2\n1\n-65F4\n16A\nD\n1\n3\n5\nN\n2\n4\n6\nN\n-95F2\n30mA\n13A\nC\n1\n3\n5\nN\n2\n4\n6\nN\n-95F5']);
 const ds=parsePages(p.pages).devices;
 const values=ref=>{const d=ds.find(d=>d.ref===ref);return[d.kind,d.amp,d.ma,d.poles];};
 assert.deepEqual(values('-65F2'),['FILS',13,30,'LN']);assert.deepEqual(values('-65F4'),['FILS',16,30,'LN']);assert.deepEqual(values('-95F2'),['LS',16,null,'3LN']);assert.deepEqual(values('-95F5'),['FILS',13,30,'3LN']);
 const simple=parsePages(doc('simple.pdf',['10F2\n13A\n30mA\n11F2\nFI 40A 30mA']).pages).devices;
 assert.equal(simple.find(d=>d.ref==='10F2').kind,'FILS');assert.equal(simple.find(d=>d.ref==='11F2').kind,'FI');
});
