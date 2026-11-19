import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {runtimeConfig} from '../server/runtime-config.mjs';

test('Codespaces uses its external HTTPS origin while the database remains outside tracked source',()=>{
 const c=runtimeConfig('/workspaces/tool',{CODESPACE_NAME:'test-space',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'});
 assert.equal(c.origin,'https://test-space-4173.app.github.dev');assert.equal(c.host,'127.0.0.1');assert.equal(c.database,'/workspaces/tool/runtime/platform.sqlite');
 const later=runtimeConfig('/srv/tool',{APP_ORIGIN:'https://portal.example.test/',DATABASE_PATH:'/srv/data/portal.sqlite',NODE_ENV:'production'});
 assert.equal(later.origin,'https://portal.example.test');assert.equal(later.database,'/srv/data/portal.sqlite');
});
test('invalid or insecure public origins and invalid ports are rejected before startup',()=>{
 for(const origin of ['https://example.test/subpath','https://user:secret@example.test','https://example.test?x=1','https://example.test/#x','file:///'])assert.throws(()=>runtimeConfig('/tmp',{APP_ORIGIN:origin}));
 for(const port of ['0','-1','1.5','65536','abc'])assert.throws(()=>runtimeConfig('/tmp',{PORT:port}));
 assert.throws(()=>runtimeConfig('/tmp',{NODE_ENV:'production',APP_ORIGIN:'http://example.test'}));
 assert.throws(()=>runtimeConfig('/tmp',{CODESPACE_NAME:'test-space',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev',APP_ORIGIN:'http://127.0.0.1:4173'}));
});
test('Codespaces hook does not create a server or account when run outside Codespaces',()=>{
 const result=spawnSync(process.execPath,[new URL('../server/codespaces-start.mjs',import.meta.url).pathname],{env:{PATH:process.env.PATH},encoding:'utf8'});
 assert.equal(result.status,0);assert.match(result.stdout,/Lokal: npm start/);
});
