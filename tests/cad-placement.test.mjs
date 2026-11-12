import test from 'node:test';
import assert from 'node:assert/strict';
import {project} from '../cad/model.mjs';
import {placement,placementMarkup} from '../cad/placement.mjs';
import {svgPage} from '../cad/render.mjs';
test('preview and placement use same snapped coordinates and rotation',()=>{const d=project(),p=d.pages[1];const e=placement(p,'fils',{x:123,y:247},true,90);assert.equal(e.x,120);assert.equal(e.y,250);assert.equal(e.rotation,90);assert.equal(p.elements.length,0);const placed=placement(p,'fils',{x:123,y:247},true,90);assert.deepEqual({...placed,id:e.id},e);});
test('disabled grid retains precise pointer position',()=>{const e=placement(project().pages[1],'coil',{x:123.5,y:247.8},false);assert.equal(e.x,123.5);assert.equal(e.y,247.8);});
test('preview only exists for insert tools inside the drawing area',()=>{const p=project().pages[1];for(const [tool,pt] of [['select',{x:100,y:100}],['wire',{x:100,y:100}],['ls',null],['ls',{x:10,y:100}],['ls',{x:100,y:800}]])assert.equal(placement(p,tool,pt),null);});
test('preview is non-interactive and never exported or saved',()=>{const d=project(),p=d.pages[1],e=placement(p,'ls',{x:200,y:200});const mark=placementMarkup(e,p,d);assert.match(mark,/pointer-events="none"/);assert.match(mark,/opacity=".6"/);assert.equal(p.elements.length,0);assert.ok(!svgPage(d,p).includes('placementPreview'));});
