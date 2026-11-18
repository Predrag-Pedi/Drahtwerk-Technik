import test from 'node:test';import assert from 'node:assert/strict';
import {createDoorMotion} from '../cad/door-motion.mjs';
function clock(reduced=false){let time=0,id=0,state,active;const queue=new Map(),motion=createDoorMotion({angles:{left:90,right:30},limits:{left:180,right:112},now:()=>time,requestFrame:fn=>{queue.set(++id,fn);return id;},cancelFrame:id=>queue.delete(id),reducedMotion:()=>reduced,onChange:(next,busy)=>{state=next;active=busy;}});return {motion,get state(){return state;},get active(){return active;},get pending(){return queue.size;},step(ms){time=ms;const callbacks=[...queue.values()];queue.clear();for(const fn of callbacks)fn(time);}};}
test('opening and closing include eased intermediate frames and finish at the exact target',()=>{
 const c=clock();c.motion.animate(['left'],0);assert.equal(c.state.left,90);assert.equal(c.pending,1);
 c.step(165);assert.ok(c.state.left<90&&c.state.left>67.5);c.step(330);assert.equal(c.state.left,45);c.step(660);assert.equal(c.state.left,0);assert.equal(c.active,false);assert.equal(c.pending,0);
 c.motion.animate(['left','right'],180);c.step(1680);assert.deepEqual(c.state,{left:180,right:112});assert.equal(c.pending,0);
});
test('reversing during a sweep continues at the current position and retains other field motion',()=>{
 const c=clock();c.motion.animate(['left','right'],0);c.step(210);const before={...c.state};c.motion.animate(['left'],180);assert.deepEqual(c.state,before);assert.equal(c.pending,1);c.step(420);assert.equal(c.state.right,0);assert.ok(c.state.left>before.left);c.step(1500);assert.deepEqual(c.state,{left:180,right:0});
});
test('slider changes interrupt only selected fields; closing cancels pending frames',()=>{
 const c=clock();c.motion.animate(['left','right'],0);c.step(150);c.motion.set(['left'],50);assert.equal(c.state.left,50);assert.equal(c.active,true);c.step(450);assert.deepEqual(c.state,{left:50,right:0});
 c.motion.animate(['left'],180);const before={...c.state};c.motion.destroy();assert.equal(c.pending,0);c.step(2000);c.motion.animate(['left'],0);assert.deepEqual(c.state,before);
});
test('reduced-motion preference reaches the requested pose without a queued animation',()=>{const c=clock(true);c.motion.animate(['left','right'],180);assert.deepEqual(c.state,{left:180,right:112});assert.equal(c.pending,0);assert.equal(c.active,false);});
