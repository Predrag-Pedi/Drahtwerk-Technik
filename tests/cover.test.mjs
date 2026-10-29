import test from 'node:test';
import assert from 'node:assert/strict';
import {objectAddress} from '../waerme/portfolio.mjs';
import {coverEntries,inspectionEntries} from '../waerme/workbook.mjs';
test('Objekt contains only street, house number, postal code and town',()=>{
 assert.equal(objectAddress([{text:'Elektro AG\nWerkstrasse 1\n8000 Zürich\nProjekt\nHauptverteilung\nLupinenweg 6\n8049 Zürich'}]),'Lupinenweg 6, 8049 Zürich');
 assert.equal(objectAddress([{text:'Projekt 262116 · NB EFH Schwalbenbodenstrasse 16, 8832 Wollerau'}]),'Schwalbenbodenstrasse 16, 8832 Wollerau');
 assert.equal(objectAddress([{text:'Objekt:\nWollerau\n8832\nSchwalbenbodenstrasse 16\nEFH'}]),'Schwalbenbodenstrasse 16, 8832 Wollerau');
 assert.equal(objectAddress([{text:'Objekt: Winterthurerstrasse 539/541, 8051 Zürich'}]),'Winterthurerstrasse 539/541, 8051 Zürich');
 assert.equal(objectAddress([{text:'Drahtwerk GmbH\nLochackerstrasse 4\n8424 Embrach'}]),'');
});
test('Cover changes only requested cells, encodes Excel date and clears template samples',()=>{
 assert.deepEqual(coverEntries({}),{C12:'',C16:null,C18:''});
 assert.deepEqual(coverEntries({object:'Testweg 1, 8000 Zürich',deliveryDate:'2026-10-29',timeBudget:'40 h'}),{C12:'Testweg 1, 8000 Zürich',C16:46324,C18:'40 h'});
 assert.throws(()=>coverEntries({deliveryDate:'2026-02-30'}));
});
test('Inspection threshold includes 250 A in C37 and clears opposite mark',()=>{
 for(const amp of [6,160,250,'250'])assert.deepEqual(inspectionEntries(amp),{C36:'',C37:'ü'});
 for(const amp of [250.1,400,630])assert.deepEqual(inspectionEntries(amp),{C36:'ü',C37:''});
 for(const amp of [null,0,-1,Infinity,''])assert.throws(()=>inspectionEntries(amp));
});
