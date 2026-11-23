import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {openDatabase, saveObject} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {digest} from '../server/security.mjs';
import {companyStorageBytes, companyStorageLimit} from '../server/storage.mjs';
import {standardRails, railLength, csvCell} from '../platform/workshop-model.mjs';

test('company workshop templates and documents are persistent, isolated and permission checked', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'workshop-test-')), file = join(dir, 'test.sqlite'), db = openDatabase(file);
  const now = Date.now();
  for (const id of ['alpha', 'beta']) saveObject(db, 'companies', {id, name: id, enabled: true, startsOn: '2000-01-01', endsOn: '2099-12-31', planId: 'basis', seats: 5});
  function user(id, company, role, permissions = {workshop: 'write'}) {
    db.prepare('INSERT INTO users(id,company_id,email,name,role,permissions,password,enabled,must_change,created_at) VALUES (?,?,?,?,?,?,?,1,0,?)').run(id, company, id, id, role, JSON.stringify(permissions), 'test-only-not-a-password', new Date().toISOString());
    db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(digest('token-' + id), id, company, 'csrf-' + id, now + 3600000, now);
    return {cookie: 'test-session=token-' + id, company, id, csrf: 'csrf-' + id};
  }
  const admin = user('admin', 'alpha', 'admin'), member = user('member', 'alpha', 'member', {workshop: 'read'}), other = user('other', 'beta', 'admin');
  const blocked = user('blocked', 'alpha', 'member', {workshop: 'none'}), readAdmin = user('read-admin', 'alpha', 'admin', {workshop: 'read'}), writer = user('writer', 'alpha', 'member');
  const reserve = net.createServer(); await new Promise(r => reserve.listen(0, '127.0.0.1', r)); const port = reserve.address().port; await new Promise(r => reserve.close(r));
  const origin = 'http://127.0.0.1:' + port, server = createApp({db, root: resolve(import.meta.dirname, '..'), origin});
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  function headers(a) {return {Origin: origin, 'Content-Type': 'application/json', ...(a ? {Cookie: a.cookie, 'X-CSRF-Token': a.csrf, 'X-Company-Id': a.company, 'X-User-Id': a.id} : {})};}
  async function request(path, method = 'GET', value, a = admin, extra = {}) {
    const response = await fetch(origin + path, {method, headers: {...headers(a), ...extra}, redirect: 'manual', ...(value !== undefined ? {body: JSON.stringify(value)} : {})});
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {status: response.status, headers: response.headers, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(Buffer.from(bytes)) : bytes};
  }
  const endpoint = tool => '/api/company/workshop/' + tool;
  let rail, upload, ew, spacing;
  try {
    await t.test('new companies get the existing shared defaults', async () => {
      for (const tool of ['rails', 'wireColors', 'ew', 'spacing']) {
        const a = await request(endpoint(tool)), b = await request(endpoint(tool), 'GET', undefined, other);
        assert.equal(a.status, 200); assert.equal(a.data.source, 'standard'); assert.equal(a.data.revision, 0); assert.deepEqual(a.data.value, b.data.value);
        if (tool === 'rails') rail = a.data;
        if (tool === 'ew') ew = a.data;
        if (tool === 'spacing') spacing = a.data;
      }
      assert.equal(rail.value.rows.length, 15);
      assert.equal(railLength(standardRails[0], {h: 1000}), 960);
      assert.equal(railLength({dimension: 'd', deduction: 50}, {d: 300}), 250);
    });
    await t.test('only an admin with write rights may edit, with tenant headers and CSRF', async () => {
      const payload = {revision: 0, value: rail.value};
      for (const actor of [member, readAdmin, writer, blocked]) assert.equal((await request(endpoint('rails'), 'PUT', payload, actor)).status, 403);
      assert.equal((await request(endpoint('rails'), 'GET', undefined, null)).status, 401);
      assert.equal((await request(endpoint('rails'), 'GET', undefined, blocked)).status, 403);
      assert.equal((await request(endpoint('rails'), 'PUT', payload, admin, {'X-Company-Id': 'beta'})).status, 409);
      assert.equal((await request(endpoint('rails'), 'PUT', payload, admin, {'X-CSRF-Token': 'wrong'})).status, 403);
      assert.equal((await request('/api/records/workshop/rails', 'PUT', payload, writer)).status, 404);
    });
    await t.test('company overrides are shared with its staff, and stale writes cannot undo reset', async () => {
      rail.value.rows[0].deduction = 75;
      const saved = await request(endpoint('rails'), 'PUT', {revision: 0, value: rail.value});
      assert.equal(saved.status, 200); assert.equal(saved.data.source, 'company'); assert.equal(saved.data.revision, 1);
      assert.equal((await request(endpoint('rails'), 'GET', undefined, member)).data.value.rows[0].deduction, 75);
      assert.equal((await request(endpoint('rails'), 'GET', undefined, other)).data.value.rows[0].deduction, 40);
      assert.equal((await request(endpoint('rails'), 'PUT', {revision: 0, value: rail.value})).status, 409);
      const reset = await request(endpoint('rails'), 'DELETE', {revision: 1});
      assert.equal(reset.data.source, 'standard'); assert.equal(reset.data.revision, 2); assert.equal(reset.data.value.rows[0].deduction, 40);
      assert.equal((await request(endpoint('rails'), 'PUT', {revision: 0, value: rail.value})).status, 409);
      assert.equal((await request(endpoint('rails'), 'PUT', {revision: 2, value: rail.value})).status, 200);
      assert.equal((await request(endpoint('rails'), 'PUT', {revision: 3, value: {rows: [{...rail.value.rows[0], deduction: -1}]}})).status, 400);
    });
    await t.test('wire colors can be customised without changing another company', async () => {
      const value = {groups: [{id: 'custom', name: 'Steuerung', rows: [{id: 'row', name: '24 V', size: '1 mm²', wire: '+', color: 'dunkelblau'}]}]};
      assert.equal((await request(endpoint('wireColors'), 'PUT', {revision: 0, value})).status, 200);
      assert.deepEqual((await request(endpoint('wireColors'), 'GET', undefined, member)).data.value, value);
      assert.equal((await request(endpoint('wireColors'), 'GET', undefined, other)).data.source, 'standard');
    });
    await t.test('PDF and drawing uploads validate contents, tool and filename', async () => {
      const pdf = Buffer.from('%PDF-1.4\n% Company-private test fixture\n%%EOF\n').toString('base64');
      for (const bad of [{name: 'x.pdf', base64: 'PGh0bWw+'}, {name: '../x.pdf', base64: pdf}, {name: 'x.svg', base64: pdf}, {name: 'x.pdf', base64: '!bad'}]) assert.equal((await request(endpoint('ew') + '/files', 'POST', bad)).status, 400);
      assert.equal((await request(endpoint('ew') + '/files', 'POST', {name: 'Eigene Vorschriften.pdf', base64: pdf}, writer)).status, 403);
      const result = await request(endpoint('ew') + '/files', 'POST', {name: 'Eigene Vorschriften.pdf', base64: pdf});
      assert.equal(result.status, 201); upload = result.data;
      const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=';
      const drawing = await request(endpoint('spacing') + '/files', 'POST', {name: 'Abstände.png', base64: image});
      assert.equal(drawing.status, 201);
      spacing.value.folders.push({id: 'new', name: 'Eigene', info: 'Werkstattmasse', images: [{id: 'i', fileId: drawing.data.id, name: 'Zähleraufbau'}]});
      assert.equal((await request(endpoint('spacing'), 'PUT', {revision: 0, value: spacing.value})).status, 200);
      assert.equal((await request(endpoint('ew') + '/files', 'GET', undefined, other)).data.files.length, 0);
    });
    await t.test('document references reject cross-tenant, wrong-tool and arbitrary paths', async () => {
      const value = {folders: [{id: 'mine', name: 'Unser EW', info: 'Zählerplatte 250 mm', files: [{id: 'doc', name: 'Vorschrift', fileId: upload.id}]}]};
      assert.equal((await request(endpoint('ew'), 'PUT', {revision: 0, value}, other)).status, 400);
      assert.equal((await request(endpoint('spacing'), 'PUT', {revision: 1, value: {folders: [{id: 'x', name: 'X', images: value.folders[0].files}]}})).status, 400);
      assert.equal((await request(endpoint('ew'), 'PUT', {revision: 0, value: {folders: [{id: 'x', name: 'X', files: [{id: 'x', name: 'X', path: '/runtime/platform.sqlite'}]}]}})).status, 400);
      assert.equal((await request(endpoint('ew'), 'PUT', {revision: 0, value})).status, 200);
      const read = await request(endpoint('ew'), 'GET', undefined, member), path = read.data.value.folders[0].files[0].path;
      assert.equal((await request(path, 'GET', undefined, member)).status, 200);
      assert.equal((await request(path, 'GET', undefined, null)).status, 401);
      assert.equal((await request(path, 'GET', undefined, other)).status, 404);
      assert.equal((await request(path, 'GET', undefined, admin)).status, 404); // another signed-in user / stale tab
      assert.equal((await request(path.replace('/member/', '/blocked/'), 'GET', undefined, blocked)).status, 403);
      assert.equal((await request(endpoint('ew') + '/files/' + upload.id, 'DELETE', {})).status, 409);
      assert.equal((await request(endpoint('ew'), 'DELETE', {revision: 1})).status, 200);
      assert.equal((await request(endpoint('ew') + '/files/' + upload.id, 'DELETE', {})).status, 200);
      assert.equal((await request(path, 'GET', undefined, member)).status, 404);
    });
    await t.test('permissions are rechecked after a slow upload finishes', async () => {
      const path = endpoint('rails'), raw = JSON.stringify({revision: 3, value: rail.value});
      let started, handle;
      const incoming = new Promise(r => {started = r;});
      const onRequest = req => {if (req.url === path && req.method === 'PUT') {server.off('request', onRequest); req.once('data', started);}};
      server.on('request', onRequest);
      const response = new Promise((resolve, reject) => {
        handle = http.request(origin + path, {method: 'PUT', headers: {...headers(admin), 'Content-Length': Buffer.byteLength(raw)}}, res => {res.resume(); res.on('end', () => resolve(res.statusCode));}); handle.on('error', reject);
      });
      handle.write(raw.slice(0, 1)); await incoming;
      db.prepare("UPDATE users SET role='member' WHERE id='admin'").run();
      handle.end(raw.slice(1)); assert.equal(await response, 403);
      db.prepare("UPDATE users SET role='admin' WHERE id='admin'").run();
      assert.equal((await request(path)).data.revision, 3);
    });
    await t.test('file storage counts towards the existing company limit', async () => {
      const before = companyStorageBytes(db, 'alpha'); assert.ok(before > 0);
      // A zero-filled SQLite blob uses no large request body and exercises the shared quota.
      db.prepare('INSERT INTO workshop_files VALUES (?,?,?,?,?,zeroblob(?),?,?)').run('quota', 'alpha', 'ew', 'quota.pdf', 'application/pdf', companyStorageLimit - before, 'admin', new Date().toISOString());
      assert.equal(companyStorageBytes(db, 'alpha'), companyStorageLimit);
      assert.equal((await request(endpoint('ew') + '/files', 'POST', {name: 'limit.pdf', base64: Buffer.from('%PDF-1.4\n').toString('base64')})).status, 413);
      db.prepare("DELETE FROM workshop_files WHERE id='quota'").run();
    });
    await t.test('untrusted labels are neutralised in spreadsheet CSV exports', () => {
      assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
      assert.equal(csvCell(120), '"120"');
    });
  } finally {
    await new Promise(r => server.close(r)); db.close();
    const reopened = openDatabase(file);
    assert.equal(JSON.parse(reopened.prepare("SELECT data FROM workshop_templates WHERE company_id='alpha' AND tool='rails'").get().data).rows[0].deduction, 75);
    assert.ok(reopened.prepare("SELECT COUNT(*) n FROM workshop_files WHERE company_id='alpha'").get().n > 0);
    reopened.close(); rmSync(dir, {recursive: true, force: true});
  }
});
