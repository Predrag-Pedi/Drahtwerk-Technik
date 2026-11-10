import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSnapshot,projectSummary} from '../waerme/projects.mjs';
const plant=(name,qty)=>({project:{name,order:'AU-TEST',customer:'Testkunde'},fields:[{surchargePercent:12}],devices:[{ref:'29K3',qty,article:'manuell'}]});
test('saved project overview counts every plant but identifies the active plant',()=>{const s={version:1,documents:[],plants:[plant('HV',2),plant('UV',3)],active:1,pendingFiles:[],current:plant('UV',3)};assert.equal(assertSnapshot(s),s);assert.deepEqual(projectSummary(s),{title:'UV',order:'AU-TEST',customer:'Testkunde',plantCount:2,fieldCount:2,deviceCount:5});});
test('manual drafts without imported plants can be saved and listed',()=>{const s={version:1,documents:[],plants:[],active:-1,pendingFiles:[],current:plant('',1)};assert.equal(assertSnapshot(s),s);assert.equal(projectSummary(s).title,'Neue Wärmeberechnung');assert.equal(projectSummary(s).fieldCount,1);});
test('unsupported and incomplete saved data is rejected before replacing the editor',()=>{for(const s of [null,{version:2},{version:1,documents:[],plants:[],active:4,pendingFiles:[],current:plant('HV',1)}])assert.throws(()=>assertSnapshot(s));});
