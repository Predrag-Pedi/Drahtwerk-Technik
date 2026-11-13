import {continuationCut,meterView} from './meter-view.mjs?v=20261113-15';
import {standardFrame} from './standard-render.mjs?v=20261113-15';
import {frameMarkup} from './frame-render.mjs?v=20261113-15';
import {connectionCandidates,connectionPoint,referenceText,linked,otherEnd} from './continuations.mjs?v=20261113-15';
import {templateLines,linePoints} from './line-edit.mjs?v=20261113-15';
import {functionKeys,functionData,functionPoint,functionBmk,findFunction,contactsFor,referenceLocation} from './references.mjs?v=20261113-15';
import {BUS,DRAW,pathAt} from './geometry.mjs?v=20261113-15';
import {templateMarkup,templateLabels} from './template.mjs?v=20261113-15';
import {W,H,symbols,size,ports,wirePoints} from './model.mjs?v=20261113-15';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(s)}</text>`;
const path=d=>`<path d="${d}"/>`;
const line=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
export function glyph(kind){switch(kind){
 case 'ls':return path('M20 0V22 M20 42V60 M20 42L9 20 M7 25L17 20 M6 30L16 25');
 case 'fils':return path('M20 0V22 M40 0V22 M20 42V60 M40 42V60 M20 42L9 20 M40 42L29 20 M7 25L17 20 M6 30L16 25 M14 30H34')+'<circle cx="18" cy="15" r="6"/>';
 case 'fuse':return path('M20 0V60')+'<rect x="13" y="15" width="14" height="30" fill="white"/>';
 case 'switch':return [20,40,60].map(x=>path(`M${x} 0V20 M${x} 40V60 M${x} 40L${x-12} 17`)).join('')+'<path d="M12 30H55" stroke-dasharray="3 3"/>';
 case 'contact':return path('M20 0V20 M20 40V60 M20 40L8 17');
 case 'coil':return path('M30 0V20 M30 40V60')+'<rect x="5" y="20" width="50" height="20" fill="white"/>';
 case 'timer':return path('M30 0V10 M30 50V60')+'<rect x="5" y="10" width="50" height="40" fill="white"/><circle cx="30" cy="30" r="14"/>'+path('M30 19V30L39 35');
 case 'meter':return [20,40,60,80].map(x=>path(`M${x} 0V15 M${x} 85V100`)).join('')+'<rect x="5" y="15" width="90" height="70" fill="white"/>'+text(50,45,'kWh','text-anchor="middle" font-size="18"')+text(50,68,'3L+N','text-anchor="middle"');
 case 'terminal':return path('M20 0V15 M20 25V40')+'<rect x="15" y="15" width="10" height="10" fill="white"/>';
 case 'junction':return '<circle cx="10" cy="10" r="3" fill="currentColor"/>';
 case 'reference':return path('M0 10H30')+'<path d="M30 5L40 10L30 15Z" fill="currentColor"/>';
 default:return '';
}}
export function elementMarkup(e,p,d,editor=false,groupSelect=false){if(p.type==='dispo')groupSelect=true;e=meterView(e,p);const cut=continuationCut(e);const [w,h]=size(e,p),s=symbols[e.kind];let body='';
 if(frameMarkup(e,w,h)!==null){body=frameMarkup(e,w,h);}
 else if(e.kind==='template'&&e.template){const labels=templateLabels(e,p);for(const key of functionKeys(e))labels[key]=functionBmk(d,p,e,key);const hits=editor&&!groupSelect?templateLines(e.template).map((l,i)=>`<path class="template-line-hit" data-template-line="${esc(e.id)}:${i}" d="M ${l.a.x} ${l.a.y} L ${l.b.x} ${l.b.y}" fill="none" stroke="transparent" stroke-width="7" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`).join(''):'';body=templateMarkup(e.template,w,h,labels,e.textEdits||{},editor&&!groupSelect,hits,e.textOffsets||{});}
 else if(s.ports.length)body=`<g transform="scale(${w/s.w} ${h/s.h})">${e.kind==='contact'&&functionData(e).contactType==='NC'?path('M20 0V20 M20 40V60 M20 40L8 17 M12 21H26'):e.kind==='contact'&&functionData(e).contactType==='CO'?path('M20 0V20 M20 40V60 M20 40L8 17 M35 0V20H28'):glyph(e.kind)}</g>`;
 else if(e.kind==='text')body=e.text.split('\n').map((l,i)=>text(0,16+i*17,l)).join('');
 else if(e.kind==='dimension')body=path(`M0 10V30 M${w} 10V30 M0 20H${w} M-4 24L4 16 M${w-4} 24L${w+4} 16`)+text(w/2,12,e.text||`${Math.round(w*p.scale*420/W)} mm`,'text-anchor="middle"');
 else{body=`<rect width="${w}" height="${h}" fill="${e.kind==='duct'?'#f2f4f6':'white'}"/>`;if(e.kind==='cabinet')body+=`<rect x="5" y="5" width="${Math.max(1,w-10)}" height="${Math.max(1,h-10)}"/>`+text(w/2,-12,`${e.width} × ${e.height} mm`,'text-anchor="middle"');if(e.kind==='rail')body+=line(0,h/3,w,h/3)+line(0,2*h/3,w,2*h/3);if(e.kind==='module')body+=line(0,h*.3,w,h*.3);if(e.kind==='duct'){if(h>w){for(let y=6;y<h;y+=9)body+=line(0,y,w*.3,y)+line(w*.7,y,w,y);}else for(let x=6;x<w;x+=9)body+=line(x,0,x,h*.3)+line(x,h*.7,x,h);}if(e.text)body+=text(w/2,h/2,e.text,'text-anchor="middle" font-size="10"');}
 if(cut!==null){const id='meter-cut-'+e.id.replace(/[^a-zA-Z0-9_-]/g,'');body=`<defs><clipPath id="${id}"><rect x="-20" y="-20" width="${w+40}" height="${cut*h/e.template.viewHeight+20}"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`;}
 if(e.kind==='template'&&e.text)body+=text(w/2,h+18,e.text,'text-anchor="middle"');
 const tag=e.template?(e.dispoSource?'':e.tag):functionBmk(d,p,e);if(tag)body+=e.kind==='module'?text(w/2,-3,tag,`text-anchor="start" font-size="7" transform="rotate(-90 ${w/2} -3)"`):text(-8,18,tag,'text-anchor="end" font-weight="bold"');if(e.value)body+=text(-8,33,e.value,'text-anchor="end"');if(s.ports.length&&e.kind!=='reference'&&e.text)body+=text(w/2,h+18,e.text,'text-anchor="middle"');
 if(e.kind==='reference'){const target=d.pages.find(p=>p.id===e.targetPage);body+=text(42,14,target?`${target.number}.${e.targetPath}`:'?','fill="#1d5bb5"');}
 let connections='';
 if(e.autoConnect&&p.type==='schema'&&p.bus&&e.rotation===0){for(const [i,pt] of ports(e,p).entries()){const phase=e.autoPhases?.[i]||e.template?.ports?.[i]?.phase,y=BUS[phase];if(y===undefined||pt.x<DRAW.left||pt.x>DRAW.right||pt.y<y-.1)continue;connections+=`<g fill="none" stroke="#182c42" stroke-width="1.1"><path d="M${pt.x} ${y}V${pt.y}" ${phase==='N'?'stroke-dasharray="8 5"':''}/><circle cx="${pt.x}" cy="${y}" r="2.4" fill="#182c42"/>${editor?`<circle data-auto-port="${esc(e.id)}:${i}" cx="${pt.x}" cy="${y}" r="7" fill="transparent" stroke="none" pointer-events="all" style="cursor:ns-resize"/>`:""}</g>`;}}
 if(p.type==='schema'&&e.template&&!e.template.ports?.length)for(const pt of ports(e,p))connections+=`<circle cx="${pt.x}" cy="${pt.y}" r="2.4" fill="#182c42" stroke="none"/>`;
 for(const key of functionKeys(e)){const data=functionData(e,key),label=e.template?.labels?.find(l=>l.key===key),caption=data.description||(label?.letter==='P'?data.circuitName||e.circuitName:'');if(caption){const terminals=(e.template?.labels||[]).filter(l=>l.letter==='X').sort((a,b)=>b.matrix[5]-a.matrix[5]);const terminal=terminals.find(l=>!label||Math.abs(l.anchor.x-label.anchor.x)<e.template.viewWidth*.3)||terminals[0];const x=terminal?terminal.matrix[4]*w/e.template.viewWidth:label?label.matrix[4]*w/e.template.viewWidth:w/2,y=cut!==null?cut*h/e.template.viewHeight+20:terminal?Math.min(h-32,terminal.matrix[5]*h/e.template.viewHeight+52):h+18;body+=text(x,y,caption,'font-size="10" fill="#000" stroke="none"');}}
 return connections+`<g data-element="${esc(e.id)}" ${editor&&e.template&&!groupSelect?'pointer-events="none"':''} transform="translate(${e.x} ${e.y}) rotate(${e.rotation} ${w/2} ${h/2})" ${e.dashed?'stroke-dasharray="5 4"':''}>${!e.template||editor&&groupSelect?`<rect x="-4" y="-4" width="${w+8}" height="${(cut!==null?cut*h/e.template.viewHeight+24:h)+8}" fill="transparent" stroke="none"/>`:''}${body}</g>`;
}
export function svgPage(d,p,{editor=false,selected=null,grid=true,lineMode=true}={}){
 let body='';if(editor&&grid&&p.grid)body+='<defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r=".65" fill="#b6c5d5"/></pattern></defs><rect x="40" y="40" width="1120" height="750" fill="url(#grid)" stroke="none"/>';
 body+=standardFrame(d,p);
 if(p.type==='schema'&&p.bus)for(let n=0;n<4;n++){const by=Object.values(BUS)[n];body+=`<g ${n===3?'stroke-dasharray="8 5"':''}>${line(60,by,1140,by)}</g>`+text(45,by-4,['L1','L2','L3','N'][n],'font-size="10"');}
 const wireMarkup=w=>{const pts=wirePoints(p,w);return `<g data-wire="${esc(w.id)}"><polyline points="${pts.map(pt=>pt.x+','+pt.y).join(' ')}" stroke="transparent" stroke-width="12" fill="none"/><polyline points="${pts.map(pt=>pt.x+','+pt.y).join(' ')}" fill="none" stroke="${selected===w.id?'#2463eb':w.stroke||'#182c42'}" stroke-width="${w.strokeWidth||1.4}" ${w.dashed?'stroke-dasharray="7 5"':''}/>${w.label?text(pts[0].x+5,pts[0].y-7,w.label):''}</g>`;};
 body+=p.wires.filter(w=>!w.direct).map(wireMarkup).join('');
 body+=p.elements.map(e=>elementMarkup(e,p,d,editor,!lineMode)).join('');
 body+=p.wires.filter(w=>w.direct).map(wireMarkup).join('');
 body+=p.elements.map(e=>referenceMarkup(d,p,e)).join('');
 if(editor)for(const w of p.wires){const pts=wirePoints(p,w);body+=`<polyline data-wire="${esc(w.id)}" points="${pts.map(pt=>pt.x+','+pt.y).join(' ')}" fill="none" stroke="transparent" stroke-width="10" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;}
 const connections=connectionCandidates(d,p);
 for(const a of connections){const pt=connectionPoint(d,a),ref=referenceText(d,a),left=a.kind==='bus'&&a.side==='left',x=pt.x+(left?3:5),y=pt.y-3;
 if(a.kind==='point')body+=line(pt.x,pt.y,pt.x+25,pt.y)+text(pt.x+28,pt.y+3,a.phase,'font-size="9"');
 if(ref)body+=text(x,y,ref,`font-size="8" fill="#1767aa" ${editor?`data-connection="${esc(JSON.stringify(a))}" cursor="pointer"`:''}`);
 if(editor)body+=`<circle data-connection="${esc(JSON.stringify(a))}" cx="${pt.x}" cy="${pt.y}" r="${a.kind==='bus'?3:4}" fill="${ref?'#e4f3ff':'#fff4d7'}" stroke="${ref?'#1877b9':'#c58a13'}" stroke-width="1" cursor="pointer"><title>${esc(ref?'Verweis '+ref:'Offener Anschluss '+a.phase+' – Ziel wählen')}</title></circle>`;
 }
 if(editor){

 const chosen=p.wires.find(w=>w.id===selected);if(chosen){const pts=wirePoints(p,chosen);for(const [index,pt] of [[0,pts[0]],[1,pts.at(-1)]])body+=`<circle data-wire-handle="${esc(chosen.id)}:${index}" cx="${pt.x}" cy="${pt.y}" r="5" fill="white" stroke="#2463eb" stroke-width="2"/>`;}
 for(const e of p.elements){for(const pt of ports(e,p))body+=`<circle class="port" data-port="${esc(e.id)}:${pt.index}" cx="${pt.x}" cy="${pt.y}" r="4" fill="#fff" stroke="#4090da"/>`;if(e.id===selected){const [w,h]=size(e,p);body+=`<rect x="${e.x-7}" y="${e.y-7}" width="${w+14}" height="${h+14}" transform="rotate(${e.rotation} ${e.x+w/2} ${e.y+h/2})" fill="none" stroke="#2463eb" stroke-width="2" stroke-dasharray="5 4" pointer-events="none"/>`;}}}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)}" style="background:white;color:#182c42;font-family:Arial,sans-serif;font-size:12px"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><style>text{stroke:none} text:not([fill]){fill:#182c42} .template-line-hit:hover{stroke:#2463eb;stroke-opacity:.6}[data-template-text]{cursor:text}[data-template-text]:hover{fill:#2487d333;stroke:#2487d3;stroke-width:1}.port{opacity:.4}.port:hover{opacity:1;stroke-width:3}</style>${body}</g></svg>`;
}

function referenceMarkup(d,p,e){let out='';for(const key of functionKeys(e)){const f=functionData(e,key);if(f.role==='none')continue;const anchor=functionPoint(e,p,key),x=e.template?anchor.x+15:e.x+e.width+12,y=e.template?anchor.y:e.y+e.height+12;
 if(f.role==='contact'){const owner=findFunction(d,f.owner),ref=f.referenceOverride||(owner?.data.role==='coil'?referenceLocation(owner.element,owner.page,owner.key):f.owner?'Zuordnung fehlt':'nicht zugeordnet');out+=text(x,y,`→ ${ref}`,'font-size="10" fill="#1d5bb5"');}
 if(f.role==='coil'){const contacts=contactsFor(d,p,e,key);if(!contacts.length)continue;const mx=x+(f.mirrorX||0),my=y+(f.mirrorY||0);out+=`<g data-contact-mirror="${esc(e.id)}" fill="none" stroke="#52677e" stroke-width=".7"><rect x="${mx-4}" y="${my-12}" width="160" height="${20+contacts.length*18}" fill="white"/>${text(mx,my,'Kontaktspiegel · '+functionBmk(d,p,e,key),'font-size="9"')}`;contacts.forEach((c,i)=>{const yy=my+18*(i+1),type=c.data.contactType||'NO';out+=path(`M${mx+3} ${yy-5}h6 M${mx+18} ${yy-5}h7 M${mx+9} ${yy-5}l8 -5`);if(type==='NC')out+=path(`M${mx+14} ${yy-10}v10`);if(type==='CO')out+=path(`M${mx+18} ${yy-12}h7`);out+=text(mx+31,yy,`${type} ${c.data.terminals||''}`,'font-size="9"')+text(mx+107,yy,c.data.mirrorReferenceOverride||referenceLocation(c.element,c.page,c.key),'font-size="9" fill="#1d5bb5"');});out+='</g>';}
 }return out;}
