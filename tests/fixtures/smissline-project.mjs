// Reconstructed from the user's raster PDF: sheets 10–20, 18 FILS and
// 8 LS outlets, one 63 A incoming switch and CT1 SPD. No private project data.
import fs from 'node:fs';
import {project,page,createElement} from '../../cad/model.mjs';
import {placement} from '../../cad/placement.mjs';
import {validateTemplate} from '../../cad/template.mjs';
import {defaultConfig} from '../../cad/dispo.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url))),details=read('cad/template-details.json');
export const fetcher=async p=>({ok:true,json:async()=>read(p.split('?')[0])});
export function projectFitFixture(){const d=project('Smissline regression');d.ratedCurrent='63A';const main=d.pages[1];main.number=10;main.bus=false;
 const add=(p,id,x)=>{const t=validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]}),e=placement(p,'template',{x,y:100},true,0,t);if(!e)throw Error('Fixture template '+id);p.elements.push(e);return e;};
 add(main,'tl-0000',100);const sw=createElement(main,'switch',100,430);sw.tag='10S0';sw.value='63A';main.elements.push(sw);add(main,'tl-0004',500);
 for(let n=11;n<=20;n++){const p=page('schema',n);d.pages.push(p);const count=n<=18?3:1;for(let i=0;i<count;i++)add(p,'tl-'+String((n<=16?32:25)+i).padStart(4,'0'),220+i*330);}
 const p=d.pages[2];p.dispoConfig={...defaultConfig(),autoSize:true,buildSystem:'smissline',maxWidth:1008,maxHeight:2000,maxDepth:0,passageWidth:2000,passageHeight:2000,passageDepth:0,reserveMeters:0,smisslineDuctWidth:200,reserve:20};return {d,p};}

// Expanded 18 November inventory: 18 FILS + 16 LS, 100 A main and a 1200 x
// 2000 mm installation limit with a requested 100 mm plinth. Synthetic IDs.
export function cabinetProjectFixture(){
 const {d,p}=projectFitFixture();d.ratedCurrent='100A';d.pages[1].elements.find(e=>e.kind==='switch').value='100A';
 for(let i=0;i<8;i++){const q=page('schema',21+i),id='tl-00'+(25+i%3),t=validateTemplate({...read('cad/templates/'+id+'.json'),details:details[id]});q.elements.push(placement(q,'template',{x:200,y:100},true,0,t));d.pages.push(q);}
 p.dispoConfig={...p.dispoConfig,distributionType:'standing',plinthHeight:100,maxWidth:1200,breakerManufacturer:'schneider',plateWidth:750,bridgeMode:'remove'};return {d,p};
}
