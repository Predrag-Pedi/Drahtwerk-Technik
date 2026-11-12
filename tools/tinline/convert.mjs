import fs from 'node:fs';import {LibreDwg} from '@mlightcad/libredwg-web';
const [workdir,wasmdir]=process.argv.slice(2);if(!workdir||!wasmdir)throw Error('Usage: node convert.mjs WORKDIR WASMDIR');
const lib=await LibreDwg.create(wasmdir);const list=JSON.parse(fs.readFileSync(`${workdir}/manifest.json`));let n=0;fs.mkdirSync(`${workdir}/dxf`,{recursive:true});
for(const item of list){try{const buf=fs.readFileSync(`${workdir}/input/${item.id}.dwg`);const out=lib.dwg_write_dxf(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));if(out)fs.writeFileSync(`${workdir}/dxf/${item.id}.dxf`,out);else console.log('FAILED',item.id);}catch(e){console.log('FAILED',item.id,e.message)}if(++n%100===0)console.log('PROGRESS',n);}
