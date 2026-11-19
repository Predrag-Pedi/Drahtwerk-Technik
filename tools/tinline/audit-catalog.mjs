import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {validateTemplate,templateMarkup,enrichedDetails} from '../../cad/template.mjs';
import {templateFit} from '../../cad/template-fit.mjs';
import {placement} from '../../cad/placement.mjs';
import {macroAtPath,isSchemaMacro} from '../../cad/macro-workflow.mjs';
import {terminalBands} from '../../cad/terminal-markers.mjs';
import {page} from '../../cad/model.mjs';

const root=new URL('../../cad/',import.meta.url),catalog=JSON.parse(fs.readFileSync(new URL('templates/catalog.json',root))).items;
const details=JSON.parse(fs.readFileSync(new URL('template-details.json',root)));
const output=process.argv[2]||'/tmp/cad-template-audit';fs.mkdirSync(output,{recursive:true});
const sharp=process.argv.includes('--raster')?createRequire((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()+'/node_modules')+'/audit.js')('sharp'):null;
const rows=[],errors=[];
for(const meta of catalog){
 try{
  const t=validateTemplate(JSON.parse(fs.readFileSync(new URL(`templates/${meta.id}.json`,root))));
  if(t.category!==meta.category||t.width!==meta.width||t.height!==meta.height)throw Error('Katalog und Vorlagendatei weichen ab');
  t.details=enrichedDetails(t.id,details[t.id]);
  const p=page(t.category==='Dispo'?'dispo':'schema'),fit=templateFit(t,p);
  const percent=t.category==='Schema'&&!fit.fits?fit.suggestedPercent:100;
  if(t.category==='Dispo'&&!fit.fits)p.scale=fit.suggestedScale;
  const options=t.category==='Schema'?{dimensions:{width:t.width*percent/100,height:t.height*percent/100}}:{};
  for(const rotation of [0,90,180,270]){
   const rotated=rotation%180!==0;
   const f=templateFit(t,p,percent);
   // Portrait graphics need not fit in landscape when rotated; report zero-
   // degree placement as the supported baseline and verify fitting rotations.
   if(rotated&&(f.width>750||f.height>1120))continue;
   for(const point of [{x:40,y:35},{x:1160,y:785},{x:600,y:410}])if(!placement(p,'template',point,false,rotation,t,false,options))throw Error(`Platzierung fehlgeschlagen (${rotation}°, ${point.x}/${point.y})`);
  }
  const paths=[];
  if(isSchemaMacro(t))for(let i=0;i<10;i++)try{macroAtPath(p,t,i,{percent});paths.push(i);}catch{}
  if(isSchemaMacro(t)&&!paths.length)throw Error('Kein gültiger Strompfad nach Einpassen');
  const factor=Math.min(380/t.width,380/t.height),w=t.width*factor,h=t.height*factor;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><g transform="translate(10 10)">${templateMarkup(t,w,h)}</g></svg>`;
  if(/(?:NaN|Infinity|undefined)/.test(svg))throw Error('Ungültige SVG-Ausgabe');
  let rendered=false;
  if(sharp){const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});let ink=false;for(let i=0;i<data.length;i+=info.channels)if(data[i+3]>20&&data[i]<200){ink=true;break;}if(!ink)throw Error('Leere Darstellung');rendered=true;}
  rows.push({id:t.id,name:t.name,category:t.category,originalWidth:t.width,originalHeight:t.height,defaultFits:fit.fits,percent,pageScale:p.scale,paths:paths.join(' '),terminalTables:terminalBands(t).length,rendered});
 }catch(e){errors.push({id:meta.id,name:meta.name,error:e.message});}
 if((rows.length+errors.length)%500===0)console.log(`${rows.length+errors.length}/${catalog.length}`);
}
const summary={total:catalog.length,passed:rows.length,errors,schema:rows.filter(x=>x.category==='Schema').length,dispo:rows.filter(x=>x.category==='Dispo').length,fitActions:rows.filter(x=>!x.defaultFits).length,schemaFitActions:rows.filter(x=>x.percent<100).length,dispoFitActions:rows.filter(x=>x.pageScale!==10).length,macros:rows.filter(x=>x.paths).length,terminalTemplates:rows.filter(x=>x.terminalTables).length,terminalTables:rows.reduce((n,x)=>n+x.terminalTables,0),rasterRendered:rows.filter(x=>x.rendered).length};
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const keys=Object.keys(rows[0]),csv=v=>'"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(output,'templates.csv'),[keys.map(csv).join(','),...rows.map(r=>keys.map(k=>csv(r[k])).join(','))].join('\n')+'\n');
console.log(summary);if(errors.length)process.exitCode=1;
