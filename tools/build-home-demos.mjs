// Reproducible public examples: no customer records or private documents.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {project} from '../cad/model.mjs';
import {validateTemplate,templateMarkup} from '../cad/template.mjs';
import {macroAtPath} from '../cad/macro-workflow.mjs';
import {drahtwerkDemo} from '../cad/dispo.mjs';
import {svgPage} from '../cad/render.mjs';
const root = new URL('../',import.meta.url), output = new URL('platform/demos/',root);
mkdirSync(output,{recursive:true});
const details = JSON.parse(readFileSync(new URL('cad/template-details.json',root)));
const template = id => {const t=validateTemplate(JSON.parse(readFileSync(new URL(`cad/templates/${id}.json`,root))));t.details=details[id];return t;};
const crop = (svg,box) => svg.replace(/(<svg\b)[^>]*>/,`$1 xmlns="http://www.w3.org/2000/svg" viewBox="${box}">`);
const save = (name,svg) => writeFileSync(new URL(name+'.svg',output),svg.replace(/data-[\w-]+="[^"]*"/g,''));
const t=template('tl-0024');
save('macro',templateMarkup(t,180,560).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
const d=project('Schema · Beispielanlage'),p=d.pages.find(p=>p.type==='schema');p.number=12;
for(const [index,path] of [2,4,7].entries()) {
 p.elements.push(macroAtPath(p,path===7?template('tl-0013'):t,path,{values:path===4?{t8:'16A',t9:'C'}:{}}));
 save('schema-'+(index+1),crop(svgPage(d,p,{frame:false,grid:false}),'60 65 1080 690'));
}
const example=drahtwerkDemo(project('Beispielanlage')),dispo=example.pages.find(p=>p.type==='dispo');
save('schema-source',crop(svgPage(example,example.pages.find(p=>p.type==='schema'),{frame:false,grid:false}),'90 65 920 560'));
const all=dispo.elements;
for(const [name,kinds] of [['frame',['cabinet','rail','duct']],['plates',['cabinet','rail','duct','plate']],['complete',['cabinet','rail','duct','plate','module']]]){
 dispo.elements=all.filter(e=>kinds.includes(e.kind));
 save('dispo-'+name,crop(svgPage(example,dispo,{frame:false,grid:false}),'365 135 470 535'));
}
console.log('Public CAD demo drawings rebuilt.');
