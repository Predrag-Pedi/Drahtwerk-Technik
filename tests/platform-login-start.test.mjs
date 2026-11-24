import test from 'node:test';
import assert from 'node:assert/strict';

let sequence=0;
function setup(t,{session=401,login=200,mustChange=false}={}){
 const button={disabled:true},message={textContent:'Anmeldung wird vorbereitet …'},requests=[],destinations=[];
 const form={querySelector:()=>button,reset(){this.wasReset=true;}},elements={'#loginForm':form,'#message':message,'#password':{},'#showPassword':{}};
 const globals={__companyMode:true,document:{querySelector:key=>elements[key]},location:{search:'',replace:path=>destinations.push(path)},FormData:class extends Map{constructor(){super([['identifier','test-worker'],['password','test-only-password']]);}}};
 for(const [key,value] of Object.entries(globals)){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});}
 let sessionSignal;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  requests.push({url,options});
  if(url==='/api/session'){
   sessionSignal=options.signal;
   if(session==='pending')return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
   return Response.json(session===200?{user:{id:'existing',mustChangePassword:mustChange}}:{error:'Session error'},{status:session});
  }
  return Response.json(login===200?{ok:true,mustChangePassword:mustChange}:{error:'Anmeldung nicht korrekt.'},{status:login});
 });
 return {button,message,form,requests,destinations,sessionSignal:()=>sessionSignal,load:()=>import('../platform/login.mjs?test='+(sequence++)),submit:()=>form.onsubmit({preventDefault(){form.prevented=true;}})};
}

test('login becomes usable immediately and succeeds even while the session check is stalled',async t=>{
 const ui=setup(t,{session:'pending'});await ui.load();
 assert.equal(ui.button.disabled,false);assert.equal(typeof ui.form.onsubmit,'function');
 await ui.submit();assert.equal(ui.form.prevented,true);assert.equal(ui.sessionSignal().aborted,true);
 const sent=ui.requests.find(r=>r.url==='/api/login');assert.ok(sent);assert.equal(sent.options.method,'POST');assert.equal(sent.options.credentials,'same-origin');assert.equal(sent.options.headers['Content-Type'],'application/json');
 assert.deepEqual(JSON.parse(sent.options.body),{identifier:'test-worker',password:'test-only-password'});
 assert.deepEqual(ui.destinations,['/index.html']);assert.equal(ui.form.wasReset,true);
});

test('a session check failure does not disable login or cause a native form navigation',async t=>{
 const ui=setup(t,{session:500});await ui.load();await ui.submit();assert.equal(ui.form.prevented,true);assert.deepEqual(ui.destinations,['/index.html']);
});

test('a rejected login displays the server error and permits another attempt without redirecting',async t=>{
 const ui=setup(t,{login:401});await ui.load();await ui.submit();assert.deepEqual(ui.destinations,[]);assert.equal(ui.message.textContent,'Anmeldung nicht korrekt.');assert.equal(ui.button.disabled,false);assert.equal(ui.form.wasReset,undefined);
});

test('first login still takes the user directly to the mandatory password change',async t=>{
 const ui=setup(t,{mustChange:true});await ui.load();await ui.submit();assert.deepEqual(ui.destinations,['/portal.html?section=personal']);
});
