import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
import fs from 'node:fs';
import {validateTemplate,templateMarkup} from '../../cad/template.mjs';
const root=new URL('../../cad/templates/',import.meta.url),out=new URL('previews/',root);
fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));
for(const item of catalog.items){const t=validateTemplate(JSON.parse(fs.readFileSync(new URL(`${item.id}.json`,root))));const scale=Math.min(180/t.width,180/t.height),w=t.width*scale,h=t.height*scale;const png=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/><g transform="translate(${(200-w)/2} ${(200-h)/2})">${templateMarkup(t,w,h)}</g></svg>`)).resize(300,300).png().toBuffer();fs.writeFileSync(new URL(`${item.id}.svg`,out),`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><image width="300" height="300" href="data:image/png;base64,${png.toString('base64')}"/></svg>`);}
console.log(`Built ${catalog.items.length} visual previews`);
