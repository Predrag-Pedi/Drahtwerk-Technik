import {partNames,partDefaults,partFields,partSpec,partValues} from './dispo-parts.mjs?v=20261119-7';

const remembered={};
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export function openDispoParts({type='frame',element=null,onInsert}){
 const dialog=node('dialog',undefined,'dispo-parts-dialog'),heading=node('div',undefined,'workflow-heading');
 heading.append(node('h2',element?'Aufbau bearbeiten':'Aufbau einfügen'));const close=node('button','Schliessen');close.type='button';close.setAttribute('aria-label','Aufbauassistent schliessen');close.onclick=()=>dialog.close();heading.append(close);dialog.append(heading);
 const form=node('form'),layout=node('div',undefined,'parts-layout'),nav=node('nav'),main=node('div'),fields=node('div',undefined,'parts-fields'),preview=node('div',undefined,'parts-preview'),caption=node('p','Alle Masse in mm. Die Vorschau zeigt die eingegebenen Abmessungen.','hint'),error=node('p','','workflow-error');
 nav.setAttribute('aria-label','Aufbauteil wählen');error.setAttribute('role','alert');preview.setAttribute('role','img');
 main.append(preview,caption);layout.append(nav,main,fields);form.append(layout,error);
 const footer=node('div',undefined,'workflow-actions'),hint=node('p','','hint'),insert=node('button',element?'Änderungen übernehmen':'Einsetzen','primary');insert.type='submit';footer.append(hint,insert);form.append(footer);dialog.append(form);
 let values={};const drafts={};
 const byPoints=()=>!element&&['duct','rail'].includes(type);
 function paint(){
  try{
   const spec=partSpec(type,values),enclosure=['frame','cabinet'].includes(type),w=spec.dimensions.width,h=spec.dimensions.height,vertical=spec.rotation===90,displayW=vertical?h:w,displayH=vertical?w:h;
   const k=Math.min(280/displayW,310/displayH),x=(400-displayW*k)/2,y=(410-displayH*k)/2,a=displayW*k,b=displayH*k;
   const rect=(xx,yy,ww,hh,fill='white')=>`<rect x="${xx}" y="${yy}" width="${ww}" height="${hh}" fill="${fill}"/>`;
   const line=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}"/>`;
   const text=(xx,yy,value,extra='')=>`<text x="${xx}" y="${yy}" ${extra}>${value}</text>`;
   let shape=rect(x,y,a,b,enclosure?'#f1f5f9':'#eef2f6');
   if(enclosure){const m=spec.metadata.manualPart;shape+=rect(x+m.left*k,y+m.top*k,(w-m.left-m.right)*k,(h-m.plinth-m.top-m.bottom)*k);if(m.plinth)shape+=line(x,y+b-m.plinth*k,x+a,y+b-m.plinth*k);shape+=text(x+a/2,y+b/2,`${w-m.left-m.right} × ${h-m.plinth-m.top-m.bottom}`, 'text-anchor="middle" class="interior-size"');}
   else if(type==='rail')shape+=vertical?line(x+a*.2,y,x+a*.2,y+b)+line(x+a*.8,y,x+a*.8,y+b):line(x,y+b*.2,x+a,y+b*.2)+line(x,y+b*.8,x+a,y+b*.8);
   else {const count=Math.min(50,Math.floor(Math.max(a,b)/9));for(let i=1;i<count;i++){if(vertical){const yy=y+b*i/count;shape+=line(x,yy,x+a*.3,yy)+line(x+a*.7,yy,x+a,yy);}else {const xx=x+a*i/count;shape+=line(xx,y,xx,y+b*.3)+line(xx,y+b*.7,xx,y+b);}}}
   const dimensions=line(x,y-22,x+a,y-22)+line(x,y-28,x,y-10)+line(x+a,y-28,x+a,y-10)+line(x-22,y,x-22,y+b)+line(x-28,y,x-10,y)+line(x-28,y+b,x-10,y+b);
   const labels=text(x+a/2,y-30,byPoints()?'Punkt 1 → Punkt 2':displayW,'text-anchor="middle"')+text(x-31,y+b/2,displayH,`text-anchor="middle" transform="rotate(-90 ${x-31} ${y+b/2})"`);
   preview.innerHTML=`<svg viewBox="0 0 400 410" aria-hidden="true"><g fill="none" stroke="#334e68" stroke-width="1.4">${shape}${dimensions}</g><g fill="#233e57" font-size="13">${labels}</g></svg>`;
   preview.setAttribute('aria-label',byPoints()?`${partNames[type]} zwischen zwei Punkten, ${values.width} mm breit, ${values.depth} mm tief`:`${partNames[type]}: ${displayW} × ${displayH} mm, Tiefe ${values.depth} mm`);error.textContent='';
   const m=spec.metadata.manualPart;caption.textContent=enclosure?`Lichter Innenraum: ${w-m.left-m.right} × ${h-m.plinth-m.top-m.bottom} mm · Tiefe ${values.depth} mm`:`${byPoints()?'Länge durch zwei Klicks':values.length+' mm lang'} · ${values.width} mm breit · ${values.depth} mm ${type==='rail'?'Profilhöhe':'tief'}`;
  }catch(e){error.textContent=e.message;preview.setAttribute('aria-label','Ungültige Masse');}
 }
 function show(next){
  if(type)drafts[type]={...values};type=next;values={...partDefaults[type],...(remembered[type]||{}),...(drafts[type]||{}),...(element?partValues(element):{})};
  if(byPoints()){values.length=partDefaults[type].length;values.orientation='horizontal';}
  hint.textContent=element?'Masse und Ausrichtung ändern.':byPoints()?'Einsetzen wählen, dann Punkt 1 und Punkt 2 der Mittellinie anklicken. Waagrecht oder senkrecht folgt der Maus. Esc beendet.':'Einsetzen wählen, dann am Mauszeiger platzieren. R dreht, Tab wechselt den Einfügepunkt, Esc beendet.';
  fields.replaceChildren();fields.append(node('h3',partNames[type]));
  for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.type===type));
  for(const [key,label,min,max]of partFields(type).filter(([key])=>!byPoints()||key!=='length')){
   const l=node('label',undefined,'field'),span=node('span',label+' (mm)'),input=node('input');input.type='number';input.min=min;input.max=max;input.step='any';input.required=true;input.value=values[key];input.setAttribute('aria-label',label+' (mm)');input.oninput=()=>{values[key]=input.value.trim()===''?NaN:Number(input.value);paint();};l.append(span,input);fields.append(l);
  }
  if(element&&['duct','rail'].includes(type)){const l=node('label',undefined,'field'),select=node('select');select.setAttribute('aria-label','Ausrichtung');for(const [v,t]of [['horizontal','Waagrecht'],['vertical','Senkrecht']]){const o=node('option',t);o.value=v;o.selected=values.orientation===v;select.append(o);}select.onchange=()=>{values.orientation=select.value;paint();};l.append(node('span','Ausrichtung'),select);fields.append(l);}
  paint();
 }
 for(const [key,name]of Object.entries(partNames)){const b=node('button',name);b.type='button';b.dataset.type=key;b.disabled=!!element&&element.manualPart.type!==key;b.onclick=()=>show(key);nav.append(b);}
 form.onsubmit=e=>{e.preventDefault();try{const spec=partSpec(type,values);onInsert(spec,type);remembered[type]={...values};dialog.close();}catch(e){error.textContent=e.message;}};
 document.body.append(dialog);dialog.onclose=()=>dialog.remove();show(type);dialog.showModal();
}
