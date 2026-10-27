import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePages,classify,candidates,maxPv,validateFields,SHEETS} from '../waerme/core.mjs';
test('Anschlussbedingungen werden ignoriert; Dispo-Masse und Strom bleiben erhalten',()=>{
 const r=parsePages([{file:'test',number:1,text:'ELEKTROSCHEMA\nUnterverteilung\nTeststadt\n8000'},{file:'test',number:2,text:'Anschluss- und Umgebungsbedingungen\n100A\n1F1\n16A\n30mA\nC'},{file:'test',number:3,text:'Dispo\nAlu-Selbstbaurahmen\nB1008x H1200x T165mm\nZuleitung 5x70mm2 160A'}]);
 assert.equal(r.devices.length,0);assert.equal(r.ignored.length,1);assert.equal(r.project.city,'Teststadt');assert.equal(r.project.type,'SBR');assert.deepEqual(r.dimensions.map(({b,h,t})=>[b,h,t]),[[1008,1200,165]]);assert.equal(r.currents[0].amp,160);
});
test('Geräte werden dedupliziert und die Polzahl auch vor dem Kennzeichen gelesen',()=>{
 const page={file:'test',number:3,text:'2\nN\n1\nN\n11F1\n16A\n30mA\nC\nA\nL1\nN\nPE'};
 const r=parsePages([page,page]);assert.equal(r.devices.length,1);assert.equal(r.devices[0].kind,'FILS');assert.equal(r.devices[0].poles,'LN');assert.equal(r.devices[0].amp,16);
});
test('Hager und Smissline werden strikt getrennt; Varianten bleiben auswählbar',()=>{
 const h={id:'h',...classify('FI - Leitungsschutzschalter 16A/C(B) 30mA LN','Hager FI-Leitungsschutzschalter')};
 const s={id:'s',...classify('FI - Leitungsschutzschalter 16A/C(B) 30mA LN','ABB SMISSLINE')};
 assert.deepEqual(candidates(h,[h,s]).map(c=>c.id),['h']);assert.deepEqual(candidates(s,[h,s]).map(c=>c.id),['s']);
});
test('SBR-Maximalwert entspricht der bereitgestellten Excel-Formel',()=>{
 const v={H8:50,H9:25,B14:12,B15:3.8,B16:3.6,G21:1,F18:.1};
 const n=maxPv('SBR',1008,1200,165,(s,c)=>{assert.equal(s,SHEETS.sbr);return v[c];});
 assert.ok(Math.abs(n-498.8685918131761)<1e-8);assert.equal(maxPv('SBR',0,1200,165,()=>0),null);
});
test('Fehlende Dimensionen und ungültige Einbaugrade verhindern die Ausgabe',()=>{
 const f={type:'SBR',b:1008,h:1200,t:165,percent:50};assert.equal(validateFields([f]),true);assert.equal(validateFields([{...f,t:null}]),false);assert.equal(validateFields([{...f,percent:101}]),false);assert.equal(validateFields([]),false);
});
