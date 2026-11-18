import test from 'node:test';import assert from 'node:assert/strict';
import {cabinetProjectFixture,fetcher} from './fixtures/smissline-project.mjs';
import {buildAutomaticDispo} from '../cad/dispo-auto.mjs';
import {validateDispoConfig} from '../cad/dispo.mjs';
import {cabinetOptions,defaultCabinetField,fieldExtra} from '../cad/cabinet-options.mjs';
import {checkCabinet} from '../cad/cabinet-layout.mjs';
import {validateProject} from '../cad/model.mjs';
import {sceneBoxes} from '../cad/dispo-3d.mjs';
import {boxWorldPoint,sceneBounds} from '../cad/box-transform.mjs';
import {boxMesh} from '../cad/dispo-mesh.mjs';
import {prepareGeometry} from '../cad/dispo-gpu.mjs';
import {svgPage} from '../cad/render.mjs';
import {dispositionDescription} from '../cad/dispo-description.mjs';
const setup=extra=>{const {d,p}=cabinetProjectFixture();Object.assign(p.dispoConfig,{distributionType:'standing',buildSystem:'standard',maxHeight:2300,passageHeight:2300,systemScope:'all',...extra});return {d,p};};
for(const system of ['standard','smissline'])test(`individual ${system} fits below standard height without losing sources or reserve`,async()=>{
 const {d,p}=setup({cabinetMode:'custom',buildSystem:system,maxHeight:1800,passageHeight:1773}),before=JSON.stringify(d),g=await buildAutomaticDispo(d,p,fetcher);
 assert.ok(g.config.height<=1773);assert.ok(g.config.width<=1200);assert.equal(g.config.plinthHeight,100);assert.equal(g.config.reserve,20);assert.equal(g.config.cabinetTopHeight,800);if(system==='standard')assert.ok(g.config.cabinetAutoTopHeight<800);assert.equal(g.scale,10);assert.equal(JSON.stringify(d),before);
 assert.equal(g.elements.filter(e=>e.dispoKind==='ls').length,16);assert.equal(g.elements.filter(e=>e.dispoKind==='fils').length,18);
 assert.throws(()=>checkCabinet({...g.config,cabinetMode:'standard'}),/AN-Stand/);assert.match(g.elements.find(e=>e.dispoDescription).text,/Individualschrank/);
});
test('fixed individual dimensions are retained and installation limits still apply',async()=>{
 const {d,p}=setup({cabinetMode:'custom',cabinetSizing:'fixed',width:1125,fieldWidths:[1125],fields:1,height:1850,depth:400});
 const g=await buildAutomaticDispo(d,p,fetcher);assert.equal(g.config.width,1125);assert.equal(g.config.height,1850);assert.equal(g.config.depth,400);
 await assert.rejects(buildAutomaticDispo(d,{...p,dispoConfig:{...p.dispoConfig,maxHeight:1800}},fetcher),/Einbauhöhe/);
});
test('AN widths include actual side wall additions and supported small aluminium bases',async()=>{
 for(const [left,right,extra]of [['Standard','Standard',50],['Flach','Standard',30],['Keine','Standard',25]])assert.equal(fieldExtra({sideLeft:left,sideRight:right},0,1),extra);
 const {d,p}=setup({plinthHeight:80,cabinetOptions:{plinth:'Aluminium',sideLeft:'Flach',sideRight:'Standard'}}),g=await buildAutomaticDispo(d,p,fetcher);assert.equal(g.config.height,2080);assert.equal(g.config.width,830);
 assert.throws(()=>validateDispoConfig({...g.config,cabinetOptions:{...g.config.cabinetOptions,plinth:'Stahl'}}),/Stahlsockel/);
});
test('configured doors, black base and factual description survive save/reload and export',async()=>{
 const {d,p}=setup({cabinetOptions:{ral:'7016',plinth:'Aluminium',back:'Schrankfarbe',fields:[{...defaultCabinetField(),hinge:'Links',angle:180,wings:'2-flüglig',pocket:'Aluminium A4 Quer',floor:'2-teilig',floorMaterial:'Aluminium'}]}}),g=await buildAutomaticDispo(d,p,fetcher);
 Object.assign(p,{elements:g.elements,dispoConfig:g.config});const q=validateProject(structuredClone(d)).pages.find(q=>q.id===p.id),cab=q.elements.find(e=>e.kind==='cabinet'),text=q.elements.find(e=>e.dispoDescription);
 assert.equal(cab.cabinetOptions.fields[0].angle,180);assert.equal(cab.cabinetOptions.ral,'7016');assert.match(text.text,/Doppeltüren/);assert.match(text.text,/100 mm Sockel Aluminium, schwarz/);assert.match(text.text,/2-teilig, Aluminium/);assert.doesNotMatch(text.text,/geprüft|Inkl. Lieferung|EN 61439/);
 const svg=svgPage(d,q);assert.match(svg,/fill="#111111"/);assert.match(svg,/Individualschrank|AN-Standardschrank/);assert.ok(sceneBoxes(q).some(b=>b.id===cab.id&&b.h===100&&b.color==='#111111'));
 const a=sceneBoxes(q,{[cab.id]:0}).filter(b=>b.door),b=sceneBoxes(q,{[cab.id]:90}).filter(b=>b.door);assert.equal(a.length,2);assert.equal(b.length,2);
 for(let i=0;i<2;i++){const corner=[b[i].hingeX?0:b[i].w,0,0];assert.ok(boxWorldPoint(b[i],corner)[2]>200);assert.equal(boxWorldPoint(a[i],corner)[2],0);assert.deepEqual(boxWorldPoint(a[i],[a[i].hingeX,0,0]),boxWorldPoint(b[i],[b[i].hingeX,0,0]));}
 const geometry=prepareGeometry(b,[0,0,0]);assert.ok([...geometry.triangles].every(Number.isFinite));assert.notDeepEqual(prepareGeometry(a,[0,0,0]).triangles,geometry.triangles);
 assert.ok(text.x>cab.x+cab.width*1200/420/q.scale);assert.ok(text.x+text.width<=1160);assert.ok(text.y+text.height<=785);
});
test('left/right hinge motion, no-door setting and per-field state are independent',()=>{
 const make=(id,x,hinge)=>({kind:'cabinet',id,x,y:20,width:800,height:2100,depth:400,plinthHeight:100,frameStyle:'almatec-an',cabinetOptions:cabinetOptions({plinth:'Aluminium',fields:[{...defaultCabinetField(),hinge}]},100)}),p={scale:10,elements:[make('left',0,'Links'),make('right',300,'Rechts')]};
 const bs=sceneBoxes(p,{left:90,right:0}).filter(b=>b.door);assert.equal(bs[0].doorAngle,90);assert.equal(bs[1].doorAngle,0);assert.equal(bs[1].hingeX,bs[1].w);
 p.elements[1].cabinetOptions.fields[0].door=false;assert.equal(sceneBoxes(p).filter(b=>b.door).length,1);
 for(const b of bs)assert.equal(boxMesh(b).vertices.length,8);
});
test('SBR description has its own construction facts without cabinet fittings',()=>{
 const {p}=setup({distributionType:'sbr',rearPanel:true});const t=dispositionDescription(p.dispoConfig);assert.match(t,/Selbstbaurahmen \(SBR\)/);assert.match(t,/Rückwand PVC/);assert.doesNotMatch(t,/Bandung|Sockel|AN-Standard/);
 assert.throws(()=>cabinetOptions({fields:[{angle:123}]}),/Schrankauswahl/);assert.throws(()=>cabinetOptions({fields:[{shelves:[NaN]}]}),/Tablar/);
});

test('the 3D fit envelope includes a fully opened wide door',()=>{
 const p={scale:10,elements:[{kind:'cabinet',id:'wide',x:0,y:0,width:2000,height:2100,depth:400,plinthHeight:100,frameStyle:'almatec-an',cabinetOptions:cabinetOptions({plinth:'Aluminium',fields:[{...defaultCabinetField(),hinge:'Links',angle:180}]},100)}]};
 const shut=sceneBounds(sceneBoxes(p,{wide:0})),open=sceneBounds(sceneBoxes(p,{wide:180}));assert.ok(open.extent>shut.extent*1.5);assert.ok(open.center[0]<shut.center[0]);
});
test('a tablar cannot overlap an apparatus in a fixed cabinet',async()=>{
 const {d,p}=setup({cabinetSizing:'fixed',width:800,fieldWidths:[800],fields:1,height:2100,depth:400,cabinetOptions:{plinth:'Aluminium',fields:[{...defaultCabinetField(),shelves:[1000]}]}});
 await assert.rejects(buildAutomaticDispo(d,p,fetcher),/Tablar/);
});
