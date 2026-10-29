import test from 'node:test';import assert from 'node:assert/strict';
import {unassignedLoss,applySurcharge} from '../waerme/core.mjs';
test('Unknown devices receive 8 W per unit, including stale article IDs',()=>{const catalog=[{id:'known'}];assert.equal(unassignedLoss([{qty:2,article:''},{qty:3,article:'missing'},{qty:4,article:'known'}],catalog),40);assert.equal(unassignedLoss([],catalog),0);});
test('Assigning or removing a device removes its fallback, without double counting',()=>{assert.equal(unassignedLoss([{qty:2,article:'known'}],[{id:'known'}]),0);assert.equal(unassignedLoss([{qty:0,article:''}],[]),0);assert.equal(applySurcharge(unassignedLoss([{qty:3}],[]),10).selected,26.4);assert.throws(()=>unassignedLoss([{qty:-1}],[]));});
