import test from 'node:test';
import assert from 'node:assert/strict';
import {offerCollection} from '../offerten/collection.mjs';
import {offer} from '../offerten/core.mjs';

function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function approved(){const d=offer();Object.assign(d,{number:'AN-00042',customer:'Kunde AG',project:'Hauptverteilung',status:'approved'});d.plants[0].parts[0].items=[{id:'line',name:'Schrank',qty:1,unit:'Stk.',price:400,minutes:0}];return d;}

test('a slow initial read cannot be overwritten by creating, deleting or saving before it completes',async()=>{
 const response=deferred(),existing=approved(),writes=[];let reads=0;
 const collection=offerCollection({read:()=>{reads++;return response.promise;},write:async value=>writes.push(value)});
 const loading=collection.load(),alsoLoading=collection.load();
 assert.equal(collection.ready,false);
 assert.throws(()=>collection.add(offer()),/noch nicht geladen/);
 assert.throws(()=>collection.remove(existing.id),/noch nicht geladen/);
 assert.throws(()=>collection.save(),/noch nicht geladen/);
 assert.equal(reads,1);assert.deepEqual(writes,[]);
 response.resolve([existing]);await Promise.all([loading,alsoLoading]);
 assert.equal(collection.ready,true);assert.deepEqual(collection.documents,[existing]);
});

test('failed and malformed reads keep writes locked and a successful retry restores the original offers',async()=>{
 const existing=approved();let response=Error('Verbindung unterbrochen'),writes=0;
 const collection=offerCollection({read:async()=>{if(response instanceof Error)throw response;return response;},write:async()=>writes++});
 for(const value of [response,{},null,[{id:'broken',plants:[]}]]){
  response=value;await assert.rejects(collection.load());assert.equal(collection.ready,false);assert.throws(()=>collection.add(offer()));assert.throws(()=>collection.save());
 }
 assert.equal(writes,0);response=[existing];await collection.load();assert.equal(collection.documents[0].id,existing.id);
});

test('approved offers survive reloads and new offers start blank without replacing existing data',async()=>{
 const original=approved();let stored=[structuredClone(original)];
 const options={read:async()=>structuredClone(stored),write:async value=>{stored=structuredClone(value);}};
 const collection=offerCollection(options);await collection.load();
 const fresh=offer();collection.add(fresh);fresh.project='Zweites Projekt';await collection.save();
 // A repeated/delayed startup call must not replace the selected object or its edits.
 assert.equal((await collection.load())[1],fresh);
 assert.equal(fresh.customer,'');assert.equal(fresh.status,'open');assert.deepEqual(fresh.plants[0].parts[0].items,[]);
 assert.notEqual(fresh.id,original.id);assert.deepEqual(collection.documents[0],original);
 for(let i=0;i<3;i++){
  const reopened=offerCollection(options);await reopened.load();
  assert.deepEqual(reopened.documents[0],original);assert.equal(reopened.documents[1].project,'Zweites Projekt');assert.equal(reopened.documents.length,2);
 }
});

test('queued saves keep full snapshots in order; a failed write leaves the working copy intact for retry',async()=>{
 const first=deferred(),existing=approved(),writes=[];let stored;
 const collection=offerCollection({read:async()=>[existing],write:async value=>{writes.push(value);if(writes.length===1)await first.promise;stored=structuredClone(value);}});
 await collection.load();const a=collection.save();existing.project='Geändert';const b=collection.save();
 assert.equal(collection.pending,2);await Promise.resolve();await Promise.resolve();
 first.reject(Error('Server nicht erreichbar'));await assert.rejects(a,/Server nicht erreichbar/);await b;
 assert.equal(writes[0][0].project,'Hauptverteilung');assert.equal(stored[0].project,'Geändert');assert.equal(collection.pending,0);assert.equal(collection.documents[0],existing);
});

test('an empty successful read permits creation, while duplicate ids cannot replace an existing offer',async()=>{
 let stored;const collection=offerCollection({read:async()=>undefined,write:async value=>{stored=value;}});
 await collection.load();const d=offer();collection.add(d);assert.throws(()=>collection.add({...d,customer:'Other'}),/bereits vorhanden/);
 await collection.save();assert.equal(stored.length,1);assert.equal(stored[0].customer,'');
});
