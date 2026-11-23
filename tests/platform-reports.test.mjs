import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import net from 'node:net';
import {openDatabase, saveObject, object} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {digest} from '../server/security.mjs';
import {permissionsFor} from '../platform/model.mjs';
import {validateReport, reportTotals} from '../regie/model.mjs';

const draft = () => ({version:1,status:'draft',number:'R-2026-001',date:'2026-11-23',customer:'Muster AG',customerAddress:'Testweg 1',contact:'Alex Muster',location:'Baden',project:'Umbau UV',employee:'Monteur A',km:24,travelHours:.5,expenses:12,completed:true,notes:'Beschriftung erneuert.',work:[{date:'2026-11-23',employee:'Monteur A',activity:'Verteilung umgebaut und geprüft.',hours:2.5}],materials:[{article:'K-25',description:'Reihenklemme',quantity:12,unit:'Stk.'}]});
const signature = () => ({name:'Alex Muster',place:'Baden',paths:[[[.1,.7],[.3,.2],[.4,.8]],[[.2,.6],[.8,.5]]],signedAt:'1900-01-01',recordedBy:'forged'});

test('report validation rejects malformed rows, dates, amounts and signature data', () => {
  assert.deepEqual(reportTotals(validateReport(draft())),{hours:2.5,km:24,travelHours:.5,expenses:12});
  for(const change of [{work:[null]},{materials:[[]]},{work:Array(201).fill(draft().work[0])},{date:'2026-02-30'},{km:-1},{km:Infinity},{expenses:'10'},{completed:'yes'},{status:'invoiced'},{materials:[{...draft().materials[0],quantity:NaN}]}]) {
    assert.throws(()=>validateReport({...draft(),...change}),e=>e.status===400);
  }
  for(const change of [{customer:''},{work:[]},{work:[{...draft().work[0],hours:0}]},{signature:{...signature(),paths:[]}},{signature:{...signature(),paths:[[[0,0],[2,.5]]]}},{signature:{...signature(),name:''}},{signature:{...signature(),aspectRatio:0}},{materials:[{...draft().materials[0],quantity:0}]}]) {
    assert.throws(()=>validateReport({...draft(),status:'signed',signature:signature(),...change}),e=>e.status===400);
  }
});

test('reports are shared within a company, permission checked and immutable after signing', async t => {
  const dir=mkdtempSync(join(tmpdir(),'reports-')),file=join(dir,'reports.sqlite'),db=openDatabase(file);
  const now=Date.now();
  for(const id of ['alpha','beta']) saveObject(db,'companies',{id,name:id,enabled:true,startsOn:'2000-01-01',endsOn:'2099-12-31',planId:'basis',seats:6,profile:{name:id+' Elektro',street:'Testweg 1'}});
  function actor(id,company='alpha',permission='write',role='member') {
    db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,must_change,created_at) VALUES (?,?,?,?,?,?,?,0,?)').run(id,company,id,id,role,JSON.stringify({reports:permission}),'test-only',new Date().toISOString());
    db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest('token-'+id),id,company,'csrf-'+id,now+3600000,now);
    return {id,company};
  }
  const writer=actor('writer'),reader=actor('reader','alpha','read'),blocked=actor('blocked','alpha','none','admin'),other=actor('other','beta');
  const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
  const origin='http://127.0.0.1:'+port,server=createApp({db,root:resolve(import.meta.dirname,'..'),origin});await new Promise(r=>server.listen(port,'127.0.0.1',r));
  async function request(path,method='GET',value,a=writer,extra={}) {
    const response=await fetch(origin+path,{method,redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json',Connection:'close',...(a?{Cookie:'test-session=token-'+a.id,'X-CSRF-Token':'csrf-'+a.id,'X-Company-Id':a.company,'X-User-Id':a.id}:{}),...extra},...(value!==undefined?{body:JSON.stringify(value)}:{})});
    const text=await response.text();return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text,headers:response.headers};
  }
  const path='/api/records/reports/one';let signed;
  try {
    await t.test('public product pages work without login; reports need explicit rights',async()=>{
      const publicPage=await request('/produkte/regierapport.html','GET',undefined,null);assert.equal(publicPage.status,200);assert.match(publicPage.data,/Regierapport/);
      assert.equal((await request('/regierapport.html','GET',undefined,null)).status,302);
      assert.equal((await request('/regierapport.html','GET',undefined,blocked)).status,403);
      assert.equal((await request('/regierapport.html','GET',undefined,reader)).status,200);
      assert.equal((await request(path,'GET',undefined,null)).status,401);
      for(const a of [reader,blocked])assert.equal((await request(path,'PUT',{revision:0,value:draft()},a)).status,403);
      assert.equal((await request(path,'PUT',{revision:0,value:draft()},writer,{'X-CSRF-Token':'bad'})).status,403);
      assert.equal((await request(path,'PUT',{revision:0,value:draft()},writer,{'X-Company-Id':'beta'})).status,409);
    });
    await t.test('draft CRUD, revision conflicts and cross-company isolation',async()=>{
      assert.equal((await request(path,'PUT',{revision:0,value:draft()})).status,200);
      const shared=await request(path,'GET',undefined,reader);assert.deepEqual(shared.data.value,draft());assert.equal(shared.data.revision,1);
      assert.equal((await request('/api/records/reports','GET',undefined,reader)).data.length,1);
      assert.equal((await request('/api/records/reports','GET',undefined,other)).data.length,0);
      assert.equal((await request(path,'GET',undefined,other)).data.value,null);
      assert.equal((await request(path,'PUT',{revision:0,value:{...draft(),km:99}})).status,409);
      assert.equal((await request(path,'PUT',{revision:1,value:{...draft(),work:[null]}})).status,400);
      assert.equal((await request(path,'DELETE',{revision:1},reader)).status,403);
      assert.equal((await request(path+'/temporary','PUT',{revision:0,value:draft()})).status,404);
      assert.equal((await request('/api/records/reports/delete-me','PUT',{revision:0,value:draft()})).status,200);
      assert.equal((await request('/api/records/reports/delete-me','DELETE',{revision:1})).status,200);
      assert.equal((await request('/api/records/reports/delete-me')).data.value,null);
    });
    await t.test('signing stores trusted metadata and the company snapshot',async()=>{
      assert.equal((await request(path,'PUT',{revision:1,value:{...draft(),status:'signed',signature:signature(),company:{name:'forged'}}})).status,200);
      signed=(await request(path)).data.value;
      assert.equal(signed.status,'signed');assert.equal(signed.signature.recordedBy,'writer');assert.ok(Date.parse(signed.signature.signedAt)>=now);
      assert.deepEqual(signed.signature.paths,signature().paths);assert.equal(signed.signature.aspectRatio,700/220);assert.equal(signed.company.name,'alpha Elektro');
      assert.deepEqual((await request(path,'GET',undefined,reader)).data.value,signed);
    });
    await t.test('signed content cannot be changed, deleted or silently unsigned',async()=>{
      for(const change of [{km:999},{status:'draft'},{company:{name:'changed'}},{signature:{...signed.signature,name:'Someone else'}},{work:[]}])assert.equal((await request(path,'PUT',{revision:2,value:{...signed,...change}})).status,409);
      assert.equal((await request(path,'DELETE',{revision:2})).status,409);
      assert.equal((await request(path,'PUT',{revision:2,value:{...signed,status:'invoiced'}},reader)).status,403);
      assert.equal((await request(path,'PUT',{revision:2,value:{...signed,status:'invoiced'}})).status,200);
      assert.deepEqual((await request(path)).data.value,{...signed,status:'invoiced'});
      assert.equal((await request(path,'PUT',{revision:3,value:signed})).status,200);
      assert.equal((await request('/api/records/reports/copy','PUT',{revision:0,value:{...signed,status:'draft'}})).status,200);
      const copy=(await request('/api/records/reports/copy')).data.value;assert.equal(copy.signature,undefined);assert.equal(copy.company,undefined);assert.equal(copy.status,'draft');
      assert.equal((await request('/api/company/users')).status,403);
    });
  } finally {
    await new Promise(r=>server.close(r));db.close();
    const reopened=openDatabase(file);const saved=JSON.parse(reopened.prepare("SELECT data FROM records WHERE company_id='alpha' AND id='one'").get().data);assert.deepEqual(saved,signed);reopened.close();rmSync(dir,{recursive:true,force:true});
  }
});

test('report plan migration runs once and preserves custom plans and member rights',()=>{
  const dir=mkdtempSync(join(tmpdir(),'report-migration-')),file=join(dir,'test.sqlite');let db=openDatabase(file);
  for(const id of ['basis','planung','komplett']) {const plan=object(db,'plans',id);plan.modules=plan.modules.filter(x=>x!=='reports');saveObject(db,'plans',plan);}
  saveObject(db,'plans',{id:'custom',name:'Custom',modules:['workshop'],seats:3});db.exec('PRAGMA user_version=3');db.close();
  db=openDatabase(file);assert.equal(db.prepare('PRAGMA user_version').get().user_version,4);
  for(const id of ['basis','planung','komplett'])assert.ok(object(db,'plans',id).modules.includes('reports'));
  assert.deepEqual(object(db,'plans','custom').modules,['workshop']);
  const company={enabled:true,startsOn:'2000-01-01',endsOn:'2099-12-31'};
  assert.equal(permissionsFor({role:'member',permissions:{workshop:'write'}},company,object(db,'plans','basis')).reports,'none');
  const basis=object(db,'plans','basis');basis.modules=['workshop'];saveObject(db,'plans',basis);db.close();
  db=openDatabase(file);assert.deepEqual(object(db,'plans','basis').modules,['workshop']);db.close();rmSync(dir,{recursive:true,force:true});
});
