import fs from 'node:fs';
import {plateOpenings} from '../cad/frame-layout.mjs';
import {validateTemplate,templateMarkup} from '../cad/template.mjs';

// Drahtwerk standard: 125 mm row pitch, 46 mm cutouts, first cutout at 60 mm.
// These are generated variants, not additional imported TinLine originals.
const root=new URL('../cad/templates/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));
const generated=[];
const outline=(x,y,w,h)=>({d:`M ${x} ${y} h ${w} v ${h} h ${-w} Z`,fill:'none',stroke:'#000000',sw:.25});
for(const width of [250,500])for(const rows of [1,2,3]){
 const height=25+125*rows,id=`dw-plate-${width}x${height}`;
 const meta={id,name:`${rows}er-Platte ${width}x${height} (${rows===1?'1 Reihe':rows+' Reihen'})`,source:`Drahtwerk/Platten DW/${rows} Reihen/${width}x${height} – eigene Konstruktion`,category:'Dispo',group:'Platten DW',width,height};
 const paths=[outline(0,0,width,height)];
 for(let row=0;row<rows;row++)for(const opening of plateOpenings(width))paths.push(outline(opening.x,60+row*125,opening.width,46));
 const template={...meta,viewWidth:width,viewHeight:height,paths};
 validateTemplate(template);
 fs.writeFileSync(new URL(`${id}.json`,root),JSON.stringify(template)+'\n');
 const scale=180/Math.max(width,height),w=width*scale,h=height*scale;
 fs.mkdirSync(new URL('previews/',root),{recursive:true});
 fs.writeFileSync(new URL(`previews/${id}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><g transform="translate(${(200-w)/2} ${(200-h)/2})">${templateMarkup(template,w,h)}</g></svg>\n`);
 generated.push(meta);
}
const ids=new Set(generated.map(t=>t.id));
catalog.items=catalog.items.filter(t=>!ids.has(t.id));
const position=catalog.items.findIndex(t=>t.group==='Platten DW');
catalog.items.splice(position<0?0:position,0,...generated);
catalog.generatedSummary={...catalog.generatedSummary,drahtwerkPlates:generated.length};
fs.writeFileSync(new URL('catalog.json',root),JSON.stringify(catalog));
console.log(`Generated ${generated.length} Drahtwerk plates; ${catalog.items.length} templates total.`);
