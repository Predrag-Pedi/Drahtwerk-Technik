import test from 'node:test';
import assert from 'node:assert/strict';
import {cloneTemplate, templateId, railProfiles, railProfileForDepth} from '../platform/workshop-model.mjs';
import {licenseModule} from '../platform/model.mjs';
import {requestJSON} from '../platform/request.mjs';
import {api, refreshAccount} from '../platform/client.mjs';

test('workshop templates load and edit without newer tablet APIs', t => {
  for (const [target, key] of [[globalThis, 'structuredClone'], [globalThis.crypto, 'randomUUID'], [Object, 'hasOwn']]) {
    const original = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, {value: undefined, configurable: true});
    t.after(() => {if (original) Object.defineProperty(target, key, original); else delete target[key];});
  }
  assert.equal(typeof globalThis.structuredClone, 'undefined');
  assert.equal(typeof globalThis.crypto.randomUUID, 'undefined');
  const standard = railProfiles();
  const draft = cloneTemplate(standard);
  draft.profiles[0].rows[0].deduction = 70;
  draft.profiles.push({id: templateId(), depth: 110, rows: [{id: templateId(), label: 'Firma 110', dimension: 'w', deduction: 22}]});
  assert.equal(standard.profiles[0].rows[0].deduction, 40);
  assert.equal(railProfileForDepth(draft, 165).rows[0].deduction, 70);
  assert.equal(railProfileForDepth(draft, 110).rows[0].label, 'Firma 110');
  assert.equal(railProfileForDepth(draft, 150), null);
  assert.match(draft.profiles[1].id, /^[a-zA-Z0-9_-]{1,100}$/);
  assert.notEqual(draft.profiles[1].id, draft.profiles[1].rows[0].id);
  assert.equal(licenseModule('rails'), 'workshop');
  assert.equal(licenseModule('offers'), 'offers');
});

test('incomplete saved rail templates fail explicitly instead of rendering an empty editor', () => {
  for (const value of [null, {}, {profiles: []}, {profiles: [null]}, {profiles: [{id:'a',depth:165,rows:[]}]}, {rows:[{}]}]) {
    assert.throws(() => railProfiles(value), /unvollständig/);
  }
  const rows = railProfiles().profiles[0].rows;
  assert.equal(railProfiles({rows}).profiles[0].depth, 165);
});

const aborted = signal => new Promise((resolve, reject) => {
  const fail = () => reject(new DOMException('Aborted', 'AbortError'));
  if (signal.aborted) fail(); else signal.addEventListener('abort', fail, {once:true});
});

test('workshop reads stop waiting for missing response headers', async t => {
  let signal;
  t.mock.method(globalThis, 'fetch', async (_, options) => {signal = options.signal; return aborted(signal);});
  await assert.rejects(requestJSON('/api/company/workshop/rails', {}, {timeoutMs: 20}), /dauert zu lange/);
  assert.equal(signal.aborted, true);
});

test('the read timeout includes stalled JSON bodies', async t => {
  let signal;
  t.mock.method(globalThis, 'fetch', async (_, options) => {signal = options.signal; return {json: () => aborted(signal)};});
  await assert.rejects(requestJSON('/api/company/workshop/rails', {}, {timeoutMs: 20}), /dauert zu lange/);
  assert.equal(signal.aborted, true);
});

test('leaving an editor cancels a pending request', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (_, options) => aborted(options.signal));
  const pending = requestJSON('/api/company/workshop/rails', {}, {timeoutMs: 1000, signal: controller.signal});
  controller.abort();
  await assert.rejects(pending, {name: 'AbortError'});
});

test('JSON errors and offline failures have actionable messages', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('<html>Maintenance</html>'));
  await assert.rejects(requestJSON('/api/company/workshop/rails'), /keine lesbare Antwort/);
  fetch.mock.mockImplementation(async () => {throw new TypeError('Failed to fetch');});
  await assert.rejects(requestJSON('/api/company/workshop/rails'), /nicht erreichbar/);
});

test('successful requests keep their options and release cancellation listeners', async t => {
  const controller = new AbortController();
  let received;
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    received = {url, options}; return Response.json({revision: 2, value: railProfiles()});
  });
  const {result} = await requestJSON('/api/company/workshop/rails', {
    method:'PUT', credentials:'same-origin', cache:'no-store', headers:{'X-Company-Id':'alpha','X-User-Id':'writer','X-CSRF-Token':'token'}, body:'{}',
  }, {timeoutMs: 1000, signal: controller.signal});
  controller.abort();
  assert.equal(result.revision, 2);
  assert.equal(received.options.signal.aborted, false);
  assert.equal(received.options.cache, 'no-store');
  assert.equal(received.options.credentials, 'same-origin');
  assert.equal(received.options.headers['X-Company-Id'], 'alpha');
  assert.equal(received.options.headers['X-CSRF-Token'], 'token');
  assert.equal(fetch.mock.callCount(), 1, 'writes are not automatically retried');
});

test('workshop API requests use the current server session and preserve permission errors', async t => {
  let company = 'alpha', user = 'employee', status = 200, options;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (url === '/api/session') return Response.json({user:{id:user}, company:{id:company}, csrf:'csrf-'+user});
    options = init;
    return Response.json(status === 200 ? {value:railProfiles(),revision:1,source:'company'} : {error:'Kein Schreibrecht.'}, {status});
  });
  await refreshAccount();
  await api('/company/workshop/rails', {timeoutMs:1000});
  assert.equal(options.headers['X-Company-Id'], 'alpha');
  assert.equal(options.headers['X-User-Id'], 'employee');
  company = 'beta'; user = 'second';
  await refreshAccount();
  await api('/company/workshop/rails', {timeoutMs:1000});
  assert.equal(options.headers['X-Company-Id'], 'beta');
  assert.equal(options.headers['X-User-Id'], 'second');
  assert.equal(options.headers['X-CSRF-Token'], 'csrf-second');
  status = 403;
  await assert.rejects(api('/company/workshop/rails', {method:'PUT',body:{},timeoutMs:1000}), {status:403,message:'Kein Schreibrecht.'});
});
