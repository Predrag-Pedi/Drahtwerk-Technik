import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {project} from '../cad/model.mjs';import {placement} from '../cad/placement.mjs';import {validateTemplate} from '../cad/template.mjs';import {frame,sourcePoint,meterParentFor} from '../cad/alignment.mjs';import {schemaDevices} from '../cad/dispo.mjs';import {deviceColor,deviceGroup,groupColor} from '../cad/dispo-colors.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),details=read('cad/template-details.json');
const template=id=>validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]});
function fixture(){const d=project(),p=d.pages[1];p.number=12;const pairs=[];
 for(let n=0;n<3;n++){
  const meter=placement(p,'template',{x:200+n*250,y:100},false,0,template('tl-0007'),false);p.elements.push(meter);
  const key=meter.template.labels.find(l=>l.letter==='P').key;meter.functions={[key]:{role:'none',description:'Wohnung '+(n+1)}};
  const branch=placement(p,'template',{x:310,y:410},false,0,template(['tl-0008','tl-0009','tl-0010'][n]),false),i=frame(branch).inputs[0],line=frame(meter).lines.find(l=>l.phase===i.phase&&l.x1===l.x2),target=sourcePoint(meter,line.x1,i.y),local=sourcePoint({...branch,x:0,y:0},i.x,i.y);
  branch.x=target.x-local.x+.7;branch.y=target.y-local.y+.7;p.elements.push(branch);pairs.push({meter,branch,key});
 }return {d,p,pairs};}
test('offset apartment outlets inherit the right meter for new and existing dispositions',()=>{
 const {d,p,pairs}=fixture(),devices=schemaDevices(d).devices,dispo=d.pages[2];
 for(const {meter,branch,key} of pairs){
  assert.equal(meterParentFor(branch,p)?.id,meter.id);
  const outlet=devices.find(e=>e.source.element===branch.id&&e.kind==='fils');assert.equal(outlet.meterSource.element,meter.id);
  const m={dispoSource:{page:p.id,element:meter.id,key},dispoKind:'meter'},e={dispoSource:outlet.source,meterFed:true};
  dispo.elements.push(m,e);assert.equal(deviceGroup(d,e),deviceGroup(d,m));assert.equal(deviceColor(d,dispo,e),deviceColor(d,dispo,m));
 }
 assert.equal(new Set(dispo.elements.map(e=>deviceColor(d,dispo,e))).size,3);
});
test('ambiguous or distant meter geometry is never assigned by proximity alone',()=>{
 const {p,pairs}=fixture(),{meter,branch}=pairs[0];const clone=structuredClone(meter);clone.id='ambiguous';p.elements.push(clone);assert.equal(meterParentFor(branch,p),null);p.elements.pop();branch.x+=20;assert.equal(meterParentFor(branch,p),null);
});
test('all seven named example groups have distinct colors independent of element order',()=>{
 const names=['Allgemein','E-Mobility','Wohnung 1','Wohnung 2','Wohnung 3','Gewerbe','Gesamtmessung'];
 const colors=names.map(n=>groupColor(n,names));assert.equal(new Set(colors).size,names.length);
 assert.deepEqual(names.map(n=>groupColor(n,[...names].reverse())),colors);assert.equal(groupColor('Reserve',names),null);
});
