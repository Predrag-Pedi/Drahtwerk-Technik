import test from 'node:test';
import assert from 'node:assert/strict';

const snapshot={user:{id:'employee',name:'Test Employee'},company:{id:'alpha'},permissions:{rails:'write'},csrf:'test-csrf'};
let sequence=0;
const freshClient=()=>import('../platform/client.mjs?session-test='+(sequence++));
function browser(t, bootstrap=null){
 const values={__companyMode:true,document:{getElementById:()=>bootstrap},location:{pathname:'/login.html'},__schaltbaseStartupError:()=>{}};
 for(const [key,value] of Object.entries(values)){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});}
}

test('protected pages start with the same identity and rights as their server-rendered HTML, without a session fetch',async t=>{
 let removed=false;browser(t,{textContent:JSON.stringify(snapshot),remove(){removed=true;}});
 t.mock.method(globalThis,'fetch',()=>{throw Error('Unexpected second session request');});
 const client=await freshClient();
 assert.deepEqual(client.account,snapshot);assert.equal(removed,true);assert.equal(client.can('rails',true),true);assert.equal(client.can('offers'),false);
 assert.equal(client.localScope(),'company:alpha:user:employee:');
});

test('account refresh still checks the server after switching company',async t=>{
 browser(t,{textContent:JSON.stringify(snapshot),remove(){}});
 const client=await freshClient();
 t.mock.method(globalThis,'fetch',async()=>Response.json({...snapshot,company:{id:'beta'},permissions:{rails:'read'}}));
 await client.refreshAccount();assert.equal(client.account.company.id,'beta');assert.equal(client.can('rails',true),false);
});

test('invalid embedded identity stops dependants and reports an actionable error',async t=>{
 browser(t,{textContent:'{}',remove(){}});let message;
 globalThis.__schaltbaseStartupError=(title,detail)=>{message={title,detail};};
 t.mock.method(globalThis,'fetch',()=>{throw Error('Must not fall back to another identity');});
 await assert.rejects(freshClient(),/nicht vollständig geladen/);assert.match(message.title,/Anmeldung/);
});

test('pages without embedded identity still load their session from the API',async t=>{
 browser(t);t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'/api/session');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');return Response.json(snapshot);});
 assert.deepEqual((await freshClient()).account,snapshot);
});

test('a stalled session request has a deadline and cannot leave every dependent module waiting',async t=>{
 browser(t);let reported=false,deadline;
 globalThis.__schaltbaseStartupError=()=>{reported=true;};
 const setTimer=globalThis.setTimeout;
 t.mock.method(globalThis,'setTimeout',(callback,ms)=>{deadline=ms;return setTimer(callback,10);});
 t.mock.method(globalThis,'fetch',async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})));
 await assert.rejects(freshClient(),/dauert zu lange/);assert.equal(deadline,15000);assert.equal(reported,true);
});

test('a failed session request stays failed, with no anonymous or local template fallback',async t=>{
 browser(t);let reported=false;globalThis.__schaltbaseStartupError=()=>{reported=true;};
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Interner Fehler.'},{status:500}));
 await assert.rejects(freshClient(),/Interner Fehler/);assert.equal(reported,true);
});

test('an anonymous public page can still show its login form',async t=>{
 browser(t);t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Bitte anmelden.'},{status:401}));
 const client=await freshClient();assert.equal(client.account,null);assert.equal(client.can('rails'),false);
});

test('developer requests keep management selection separate from tool data and bind writes to the support grant',async t=>{
 const identity={...snapshot,user:{id:'developer',role:'developer'},company:{id:'developer-developer',internalWorkspace:true},managementCompany:{id:'alpha'},support:null};
 browser(t,{textContent:JSON.stringify(identity),remove(){}});
 const client=await freshClient(),calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,headers:options.headers});return Response.json(url==='/api/session'?{...identity,company:{id:'alpha'},support:{id:'approved-grant'}}:{ok:true});});
 for(const path of ['/company','/company/users','/company/users/employee','/records/reports','/company/workshop/rails','/company/catalog'])await client.api(path);
 assert.deepEqual(calls.map(c=>c.headers['X-Company-Id']),['alpha','alpha','alpha','developer-developer','developer-developer','developer-developer']);
 assert.ok(calls.every(c=>c.headers['X-Support-Id']===''&&c.headers['X-User-Id']==='developer'));
 await client.refreshAccount();
 await client.api('/records/reports',{method:'POST',body:{id:'report'}});
 assert.equal(calls.at(-1).headers['X-Company-Id'],'alpha');
 assert.equal(calls.at(-1).headers['X-Support-Id'],'approved-grant');
 assert.equal(calls.at(-1).headers['X-CSRF-Token'],snapshot.csrf);
});
