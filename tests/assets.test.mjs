import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('HTML and all local application imports use the same release version',()=>{
 const html=read('waermeberechnung.html'),version=html.match(/waerme\/app\.mjs\?v=([^"']+)/)?.[1];assert.ok(version);
 for(const file of readdirSync(new URL('../waerme',import.meta.url)).filter(f=>f.endsWith('.mjs'))){for(const m of read('waerme/'+file).matchAll(/from ['"](\.\/[^'"]+)['"]/g))assert.ok(m[1].endsWith('?v='+version),file+': '+m[1]);}
 assert.ok(read('sw.js').includes('./waerme/app.mjs?v='+version));
});
test('Application references only existing static controls; removed import selector stays removed',()=>{
 const html=read('waermeberechnung.html'),app=read('waerme/app.mjs');const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),'Missing control: '+m[1]);assert.ok(!app.includes('importRole'));
});
