import {cabinetOptions,cabinetField} from './cabinet-options.mjs?v=20261119-6';
import {createElement} from './model.mjs?v=20261119-6';
import {DRAW} from './geometry.mjs?v=20261119-6';
// Construction facts only. A generated plan never declares a completed test,
// delivery, electrical certification or contract scope from a reference project.
export function dispositionDescription(c,title=''){
 const lines=[title,c.distributionType==='standing'?`Alu-Reihenschrank · ${c.cabinetMode==='custom'?'Individualschrank':'AN-Standardschrank'}`:'Selbstbaurahmen (SBR)',`B ${c.width} × H ${c.height} × T ${c.depth} mm`];
 if(c.distributionType==='standing'){
  const o=cabinetOptions(c.cabinetOptions,c.plinthHeight);lines.push(`Korpus ${c.height-(c.plinthHeight||0)} mm`,c.plinthHeight?`${c.plinthHeight} mm Sockel ${o.plinth}, schwarz`:'Ohne Sockel',`RAL ${o.ral} strukturlackiert`,`Rückwand: ${o.back}`,`Seitenwände: links ${o.sideLeft}, rechts ${o.sideRight}`);
  const groups=new Map();for(let i=0;i<c.fields;i++){const f=cabinetField(o,i),key=JSON.stringify(f);if(!groups.has(key))groups.set(key,{f,ids:[]});groups.get(key).ids.push(i+1);}
  for(const {f,ids}of groups.values()){
   if(c.fields>1)lines.push(`Feld ${ids.join(' / ')}:`);
   lines.push(f.door?`${f.wings==='2-flüglig'?'Doppeltüren':`Bandung ${f.hinge.toLowerCase()}`} · ${f.angle}°-Scharnier`:'Ohne Türe');
   if(f.door)lines.push(`${f.lock}, ${f.insert}`,f.pocket==='Ohne'?'Ohne Schematasche':`Schemafach: ${f.pocket}`);
   lines.push(`Oben: ${f.roof}`,f.floor==='Kein'?'Unten offen':`Unten: ${f.floor}, ${f.floorMaterial}`,`Montageplatte: ${f.mount}`);
   if(f.shelves.length)lines.push(`Tablare ab unten: ${f.shelves.join(' / ')} mm`);
  }
  if(c.cabinetAutoTopHeight&&c.buildSystem==='standard')lines.push(`Anschlussraum ${c.cabinetAutoTopHeight} mm (automatisch)`);
  if(o.thirdLevel)lines.push('3. Gleiterebene');if(o.ip54)lines.push('Gehäuseausführung IP54 angefordert');if(o.accessory!=='Kein')lines.push(o.accessory);
 }else lines.push(c.rearPanel?'Rückwand PVC':'Ohne Rückwand');
 lines.push(c.buildSystem==='standard'?'Frontseite PVC hellgrau':'Innenausbau gemäss Disposition',`Aufbau: ${{standard:'konventionell',smissline:'Smissline',silas60:'Silas 60 mm',vertigroup185:'Vertigroup 185 mm'}[c.buildSystem]||c.buildSystem}${c.buildSystem==='standard'&&c.breakerManufacturer!=='auto'?' · '+({hager:'Hager',schneider:'Schneider'}[c.breakerManufacturer]||''):''}`,`${c.fields} Feld(er) · Geräte-Platzreserve ${c.reserve} %`);
 if(c.reserveMeters)lines.push(`${c.reserveMeters} Zählerplätze insgesamt vorgesehen`);
 lines.push('Einbauten und Verdrahtung gemäss Schema');return lines.filter(Boolean).join('\n');
}
export function addDispositionDescription(g,p,doc){
 const text=dispositionDescription(g.config,doc.name),lines=text.split('\n').flatMap(line=>{const rows=[];while(line.length>67){let i=line.lastIndexOf(' ',67);if(i<1)i=67;rows.push(line.slice(0,i));line=line.slice(i).trimStart();}return [...rows,line];}),width=340,height=lines.length*11+8,f=1200/420/g.scale,cabinets=g.elements.filter(e=>e.kind==='cabinet');
 if(!cabinets.length)return;
 const left=Math.min(...cabinets.map(e=>e.x)),right=Math.max(...cabinets.map(e=>e.x+e.width*f)),top=Math.min(...cabinets.map(e=>e.y));
 // Keep model scale. Shift the assembled drawing together to make room on the
 // right; the description is a normal movable, exportable text element.
 const required=right-left+width+65,available=DRAW.right-DRAW.left;
 let x=right+35,y=Math.max(DRAW.top+10,top);
 if(required<=available){const dx=(DRAW.left+DRAW.right-required)/2+30-left;g.elements.forEach(e=>e.x+=dx);x=right+dx+35;}
 else{y=Math.max(...cabinets.map(e=>e.y+e.height*f))+35;x=DRAW.left+20;}
 const e=createElement(p,'text',0,0);Object.assign(e,{x,y,width,height,text:lines.join('\n'),generatedDispo:true,dispoDescription:true});g.elements.push(e);
 return y+height>DRAW.bottom?'Beschreibung liegt ausserhalb des Zeichenbereichs. Textblock verschieben oder Blattmassstab anpassen.':null;
}
