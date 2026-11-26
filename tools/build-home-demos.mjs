// Reproducible public examples: no customer records or private documents.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {project, ports} from '../cad/model.mjs';
import {validateTemplate,templateMarkup} from '../cad/template.mjs';
import {macroAtPath} from '../cad/macro-workflow.mjs';
import {drahtwerkDemo} from '../cad/dispo.mjs';
import {cachedDispoBuild, calculateDispoVariant, dispoVariants} from '../cad/dispo-variants.mjs';
import {moveDispoElements, swapDispoDrop} from '../cad/dispo-move.mjs';
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
 const sheet = crop(svgPage(d,p,{frame:false,grid:false}),'60 65 1080 690');
 save('schema-'+(index+1), index === 2 ? sheet : sheet.replace(/<\/svg>$/, '<view id="abgaenge" viewBox="198 22 430 433"/></svg>'));
}
const example=drahtwerkDemo(project('Beispielanlage')),dispo=example.pages.find(p=>p.type==='dispo');
const schema = example.pages.find(page => page.type === 'schema');
// In the explanatory sheet the outgoing circuits are wired to their meter.
// Stagger neighbouring symbols so their full equipment labels remain legible.
for (const counter of schema.elements.filter(element => element.kind === 'meter')) {
 const outgoing = schema.elements.filter(element => element.kind === 'ls' && element.circuitName === counter.circuitName);
 outgoing.forEach((breaker, i) => {
  breaker.y = i % 2 === 0 ? 492 : 565;
  const phase = i % 3;
  const from = ports(counter, schema)[4 + phase];
  const to = ports(breaker, schema)[0];
  const level = 420 + 12 * phase;
  schema.wires.push({id:`demo-${breaker.tag}`, from:{element:counter.id, index:from.index}, to:{element:breaker.id, index:to.index},
   points:[{x:from.x,y:from.y},{x:from.x,y:level},{x:to.x,y:level},{x:to.x,y:to.y}], label:'', dashed:false});
 });
}
const sheet = crop(svgPage(example, schema, {frame:false, grid:false}), '80 65 950 590');
const sourceMeter = schema.elements.find(item => item.tag === '10P1');
const focusMeter = `<view id="allgemein" viewBox="106 105 285 542"/><style>.meter-focus{display:none}#allgemein:target ~ .meter-focus{display:block}</style><rect class="meter-focus" x="${sourceMeter.x-4}" y="${sourceMeter.y-4}" width="${sourceMeter.width+8}" height="${sourceMeter.height+8}" rx="3" fill="#287bff" fill-opacity=".1" stroke="#2463db" stroke-width="2"/>`;
save('schema-source', sheet.replace(/<\/svg>$/, () => focusMeter+'</svg>'));
const all=dispo.elements;
for(const [name,kinds] of [['frame',['cabinet','rail','duct']],['plates',['cabinet','rail','duct','plate']],['complete',['cabinet','rail','duct','plate','module']]]){
 dispo.elements=all.filter(e=>kinds.includes(e.kind));
 save('dispo-'+name,crop(svgPage(example,dispo,{frame:false,grid:false}),'365 135 470 535'));
}

// The public walkthrough follows the same variant calculation and drag/drop as the editor.
const readTemplate = async url => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(new URL(url.split('?')[0], root), 'utf8')),
});
const variant = dispoVariants(dispo).find(item => item.id === 'sbr-standard-hager-0');
const calculated = await calculateDispoVariant(example, dispo, variant, cachedDispoBuild(readTemplate));
if (!calculated.result) throw new Error(calculated.error);
const {elements, scale, config} = calculated.result;
const assembly = {...dispo, elements, scale, dispoConfig: config};
const meter = elements.find(item => item.tag === '10P1');
const neighbour = elements.find(item => item.tag === '10P4');
const cabinet = elements.find(item => item.kind === 'cabinet');
const factor = 1200 / 420 / scale;
const box = (item, margin) => [item.x-margin, item.y-margin, item.width*factor+margin*2, item.height*factor+margin*2];
const front = box(cabinet, 35);
const meterRow = [meter.x-8, meter.y-8, 3*250*factor+16, 400*factor+16];
function saveAssembly(name) {
  const [x,y,w,h] = box(meter, 0);
  const detail = `<view id="zaehlerreihe" viewBox="${meterRow.join(' ')}"/>`;
  const selection = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#287bff" fill-opacity=".10" stroke="#2463db" stroke-width="1.6"/>`;
  const sheet = crop(svgPage(example, assembly, {frame:false, grid:false}), front.join(' '));
  save(name, sheet.replace(/<\/svg>$/, () => detail + selection + '</svg>'));
}
saveAssembly('sbr-variante');
const before = structuredClone(assembly);
moveDispoElements(assembly, new Set([meter.id]), neighbour.x-meter.x, neighbour.y-meter.y);
if (!swapDispoDrop(assembly, before, [{kind:'element',id:meter.id}])) throw new Error('Zählerplatztausch im Beispiel fehlgeschlagen.');
saveAssembly('sbr-getauscht');
console.log('Public CAD demo drawings rebuilt.');
