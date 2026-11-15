import test from 'node:test';import assert from 'node:assert/strict';
import {project,page,createElement} from '../cad/model.mjs';
import {svgPage} from '../cad/render.mjs';import {connect} from '../cad/continuations.mjs';
import {groupColor,deviceColor} from '../cad/dispo-colors.mjs';
import {defaultConfig,validateDispoConfig} from '../cad/dispo.mjs';
import {imagePdf} from '../cad/image-pdf.mjs';import {svgPdfLinks} from '../cad/pdf-links.mjs';
test('meter and its feeder share a color through exact owner references; reserve and structures stay neutral',()=>{
 const d=project(),schema=page('schema',12),dispo=d.pages.find(p=>p.type==='dispo');d.pages.push(schema);
 const meter=createElement(schema,'meter',100,100);meter.functions={$:{role:'none',description:'Allgemein'}};schema.elements.push(meter);
 const ref={page:schema.id,element:meter.id,key:'$'},m={dispoSource:ref,dispoKind:'meter'},f={dispoSource:ref,meterSource:ref,circuitName:'Wrong macro name'};
 assert.equal(deviceColor(d,dispo,m),groupColor('Allgemein'));assert.equal(deviceColor(d,dispo,f),deviceColor(d,dispo,m));
 assert.equal(deviceColor(d,dispo,{...m,meterState:'reserve'}),null);assert.equal(deviceColor(d,dispo,{kind:'rail'}),null);
 dispo.dispoConfig={...defaultConfig(),groupColors:false};assert.equal(deviceColor(d,dispo,m),null);assert.equal(validateDispoConfig(dispo.dispoConfig).groupColors,false);
});
test('SVG carries targets for both continuation directions and disposition devices even after page reordering',()=>{
 const d=project(),a=page('schema',12),b=page('schema',25),p=d.pages.find(p=>p.type==='dispo');a.bus=b.bus=true;d.pages.push(a,b);
 connect(d,{page:a.id,kind:'bus',side:'right',phase:'L1'},{page:b.id,kind:'bus',side:'left',phase:'L1'});
 assert.ok(svgPage(d,a).includes(`data-pdf-page="${b.id}"`));assert.ok(svgPage(d,b).includes(`data-pdf-page="${a.id}"`));
 const source=createElement(a,'ls',100,100);a.elements.push(source);const m=createElement(p,'module',100,100);Object.assign(m,{tag:'12F2',dispoKind:'ls',circuitName:'Allgemein',dispoSource:{page:a.id,element:source.id,key:'$'}});p.elements.push(m);
 d.pages.reverse();const svg=svgPage(d,p);assert.ok(svg.includes(`data-pdf-page="${a.id}"`));assert.match(svg,/class="dispo-colored"/);assert.ok(svg.includes(groupColor('Allgemein')));
 a.elements=[];assert.ok(!svgPage(d,p).includes(`data-pdf-page="${a.id}"`));
});
test('PDF annotations use physical page indices and top-left SVG coordinates, with valid byte offsets',async()=>{
 const bytes=new Uint8Array([255,216,255,217]),pdf=await imagePdf([{width:1,height:1,bytes,links:[{target:1,x:.1,y:.2,width:.3,height:.1},{target:99,x:0,y:0,width:1,height:1}]},{width:1,height:1,bytes}]).arrayBuffer(),raw=new TextDecoder('latin1').decode(pdf);
 assert.match(raw,/\/Annots \[9 0 R\]/);assert.match(raw,/\/Dest \[6 0 R \/Fit\]/);assert.match(raw,/\/Rect \[119.055 589.323 476.220 673.512\]/);assert.equal((raw.match(/\/Subtype \/Link/g)||[]).length,1);
 const buffer=new Uint8Array(pdf),ascii=new TextDecoder().decode(buffer),xref=Number(ascii.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(buffer.slice(xref,xref+4)),'xref');
 const offsets=ascii.slice(ascii.indexOf('xref\n')).split('\n').slice(3,12);offsets.forEach((line,i)=>assert.ok(new TextDecoder().decode(buffer.slice(Number(line.slice(0,10)),Number(line.slice(0,10))+12)).startsWith(`${i+1} 0 obj`)));
});
test('link measurement handles rotated BMKs, missing destinations and always removes temporary SVG',()=>{
 let removed=false;const matrix={a:0,b:1,c:-1,d:0,e:200,f:100},node={getAttribute:()=> 'schema',getBBox:()=>({x:0,y:0,width:40,height:10}),getScreenCTM:()=>matrix};
 const svg={getScreenCTM:()=>({inverse:()=>({multiply:m=>m})}),viewBox:{baseVal:{width:1200,height:850}},querySelectorAll:()=>[node]},host={style:{},querySelector:()=>svg,remove:()=>{removed=true;}},doc={createElement:()=>host,body:{append:()=>{}}};
 const links=svgPdfLinks('<svg/>',[{id:'dispo'},{id:'schema'}],doc);assert.equal(links[0].target,1);assert.equal(links[0].x,187/1200);assert.equal(links[0].width,16/1200);assert.equal(links[0].height,46/850);assert.ok(removed);assert.deepEqual(svgPdfLinks('<svg/>',[],doc),[]);
});
test('standalone references and contact mirrors carry actual target IDs',()=>{
 const d=project(),a=page('schema',18),b=page('schema',30);d.pages.push(a,b);
 const coil=createElement(a,'coil',100,100),contact=createElement(b,'contact',200,200),ref=createElement(a,'reference',400,100);a.elements.push(coil,ref);b.elements.push(contact);
 contact.functions={$:{role:'contact',owner:{page:a.id,element:coil.id,key:'$'}}};ref.targetPage=b.id;ref.targetPath=2;
 assert.equal((svgPage(d,a).match(new RegExp(`data-pdf-page="${b.id}"`,'g'))||[]).length,2);
 assert.ok(svgPage(d,b).includes(`data-pdf-page="${a.id}"`));
});
