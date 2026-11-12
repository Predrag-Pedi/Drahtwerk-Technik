export const uid=()=>crypto.randomUUID();
export const clone=v=>structuredClone(v);
export const W=1200,H=848,GRID=10;
export const symbols={
 ls:{name:'LS-Schalter',group:'Schutz',letter:'F',w:40,h:60,ports:[[20,0],[20,60]]},
 fils:{name:'FI/LS-Schalter',group:'Schutz',letter:'F',w:60,h:60,ports:[[20,0],[40,0],[20,60],[40,60]]},
 fuse:{name:'Schmelzsicherung',group:'Schutz',letter:'F',w:40,h:60,ports:[[20,0],[20,60]]},
 switch:{name:'Hauptschalter 3-polig',group:'Schalten',letter:'Q',w:80,h:60,ports:[[20,0],[40,0],[60,0],[20,60],[40,60],[60,60]]},
 coil:{name:'Schützspule',group:'Schalten',letter:'K',w:60,h:60,ports:[[30,0],[30,60]]},
 contact:{name:'Schliesser',group:'Schalten',letter:'K',w:40,h:60,ports:[[20,0],[20,60]]},
 timer:{name:'Schaltuhr',group:'Steuerung',letter:'K',w:60,h:60,ports:[[30,0],[30,60]]},
 meter:{name:'Zähler 3L+N',group:'Messung',letter:'P',w:100,h:100,ports:[[20,0],[40,0],[60,0],[80,0],[20,100],[40,100],[60,100],[80,100]]},
 terminal:{name:'Klemme',group:'Anschluss',letter:'X',w:40,h:40,ports:[[20,0],[20,40]]},
 junction:{name:'Verbindungspunkt',group:'Anschluss',letter:'',w:20,h:20,ports:[[10,10]]},
 reference:{name:'Seitenverweis',group:'Anschluss',letter:'',w:60,h:20,ports:[[0,10]]},
 cabinet:{name:'Schrank / SBR',group:'Dispo',letter:'',w:220,h:360,ports:[]},
 rail:{name:'DIN-Schiene',group:'Dispo',letter:'',w:180,h:14,ports:[]},
 duct:{name:'Kabelkanal',group:'Dispo',letter:'',w:180,h:30,ports:[]},
 module:{name:'Einbaugerät',group:'Dispo',letter:'',w:40,h:80,ports:[]},
 text:{name:'Beschriftung',group:'Zeichnen',letter:'',w:160,h:30,ports:[]},
 rect:{name:'Rechteck',group:'Zeichnen',letter:'',w:160,h:100,ports:[]},
 dimension:{name:'Bemassung horizontal',group:'Zeichnen',letter:'',w:180,h:30,ports:[]}
};
export function page(type='schema',number=1){return {id:uid(),number,title:({schema:'Elektroschema',dispo:'Disposition',cover:'Deckblatt',index:'Inhaltsverzeichnis'})[type],type,scale:10,grid:true,bus:type==='schema',elements:[],wires:[]};}
export function project(name='Neues Projekt'){return {version:1,id:uid(),name,order:'',schema:'',customer:'',address:'',author:'',date:new Date().toLocaleDateString('sv-SE'),updated:Date.now(),pages:[page('cover',1),page('schema',10),page('dispo',9)]};}
export const snap=(n,enabled=true)=>enabled?Math.round(n/GRID)*GRID:n;
export function size(e,p){if(['cabinet','rail','duct','module'].includes(e.kind))return [e.width*W/420/p.scale,e.height*W/420/p.scale];return [e.width,e.height];}
export function createElement(p,kind,x,y){const s=symbols[kind];if(!s)throw Error('Unbekanntes Symbol');const used=new Set(p.elements.map(e=>e.tag));let n=1;while(used.has(`${p.number}${s.letter}${n}`))n++;
 const physical={cabinet:[800,2000],rail:[700,35],duct:[700,60],module:[54,90]}[kind];
 return {id:uid(),kind,x:snap(x),y:snap(y),width:physical?.[0]??s.w,height:physical?.[1]??s.h,rotation:0,tag:s.letter?`${p.number}${s.letter}${n}`:'',value:'',text:kind==='text'?'Beschriftung':'',targetPage:'',targetPath:0,dashed:false};}
export function ports(e,p){const [w,h]=size(e,p),s=symbols[e.kind],a=e.rotation*Math.PI/180;return s.ports.map(([x,y],index)=>{x=x*w/s.w-w/2;y=y*h/s.h-h/2;return {element:e.id,index,x:e.x+w/2+x*Math.cos(a)-y*Math.sin(a),y:e.y+h/2+x*Math.sin(a)+y*Math.cos(a)};});}
export function endpoint(p,ref,fallback){const e=p.elements.find(e=>e.id===ref?.element);return e?ports(e,p)[ref.index]||fallback:fallback;}
export function wirePoints(p,wire){const pts=clone(wire.points);if(wire.from)pts[0]=endpoint(p,wire.from,pts[0]);if(wire.to)pts[pts.length-1]=endpoint(p,wire.to,pts.at(-1));const out=[pts[0]];for(const point of pts.slice(1)){const a=out.at(-1);if(a.x!==point.x&&a.y!==point.y)out.push({x:point.x,y:a.y});out.push(point);}return out;}
export function removeElement(p,id){p.wires.forEach(w=>{const pts=wirePoints(p,w);w.points=pts.map(({x,y})=>({x,y}));if(w.from?.element===id)w.from=null;if(w.to?.element===id)w.to=null;});p.elements=p.elements.filter(e=>e.id!==id);}
export function duplicatePage(d,p){const q=clone(p),ids=new Map();q.id=uid();q.number=Math.max(...d.pages.map(p=>p.number))+1;q.title+=' – Kopie';q.elements.forEach(e=>{const old=e.id;e.id=uid();ids.set(old,e.id);if(e.tag.startsWith(String(p.number)))e.tag=String(q.number)+e.tag.slice(String(p.number).length);if(e.targetPage===p.id)e.targetPage=q.id;});q.wires.forEach(w=>{w.id=uid();for(const key of ['from','to'])if(w[key])w[key].element=ids.get(w[key].element);});return q;}
export function validateProject(raw){
 const fail=()=>{throw Error('Ungültige CAD-Projektdatei.');};const str=(v,max=10000)=>typeof v==='string'&&v.length<=max?v:fail();const num=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max?v:fail();
 if(!raw||raw.version!==1||!Array.isArray(raw.pages)||!raw.pages.length||raw.pages.length>200)fail();
 const d={version:1,id:str(raw.id,100),updated:Date.now()};for(const k of ['name','order','schema','customer','address','author','date'])d[k]=str(raw[k]);const seen=new Set(),numbers=new Set();
 d.pages=raw.pages.map(p=>{if(!['schema','dispo','cover','index'].includes(p.type)||!Array.isArray(p.elements)||!Array.isArray(p.wires)||p.elements.length+p.wires.length>5000)fail();const q={id:str(p.id,100),number:num(p.number,1,9999),title:str(p.title),type:p.type,scale:num(p.scale,1,100),grid:p.grid===true,bus:p.bus===true};if(seen.has(q.id)||numbers.has(q.number)||!Number.isInteger(q.number))fail();seen.add(q.id);numbers.add(q.number);const ids=new Set();q.elements=p.elements.map(e=>{if(!symbols[e.kind]||ids.has(e.id))fail();ids.add(e.id);return {id:str(e.id,100),kind:e.kind,x:num(e.x,-10000,10000),y:num(e.y,-10000,10000),width:num(e.width,1,10000),height:num(e.height,1,10000),rotation:num(e.rotation,0,359),tag:str(e.tag),value:str(e.value),text:str(e.text),targetPage:str(e.targetPage),targetPath:num(e.targetPath,0,9),dashed:e.dashed===true};});q.wires=p.wires.map(w=>{if(!Array.isArray(w.points)||w.points.length<2||w.points.length>200||ids.has(w.id))fail();ids.add(w.id);const ref=r=>{if(r==null)return null;const e=q.elements.find(e=>e.id===r.element);if(!e||!Number.isInteger(r.index)||r.index<0||r.index>=symbols[e.kind].ports.length)fail();return {element:e.id,index:r.index};};return {id:str(w.id,100),points:w.points.map(pt=>({x:num(pt.x,-10000,10000),y:num(pt.y,-10000,10000)})),from:ref(w.from),to:ref(w.to),dashed:w.dashed===true,label:str(w.label||'')};});return q;});return d;
}
export function demo(){const d=project('Beispiel · Hauptverteilung');d.order='DEMO';d.author='Drahtwerk';d.address='Musterstrasse 1, 8000 Zürich';const p=d.pages[1];p.title='Allgemeine Abgänge';for(let n=0;n<4;n++){const e=createElement(p,n===3?'timer':'fils',210+n*210,220);e.value=n===3?'230 V':'C13 A / 30 mA';p.elements.push(e);const k=createElement(p,'terminal',210+n*210,590);k.text=['Licht Treppenhaus','Steckdosen Keller','Licht Garage','Steuerung'][n];p.elements.push(k);const a=ports(e,p),b=ports(k,p);p.wires.push({id:uid(),points:[{x:a[0].x,y:80},a[0]],from:null,to:{element:e.id,index:0},label:'',dashed:false},{id:uid(),points:[a.at(-1),b[0]],from:{element:e.id,index:a.length-1},to:{element:k.id,index:0},label:'',dashed:false});}
 const q=d.pages[2],cab=createElement(q,'cabinet',240,120);cab.width=800;cab.height=1800;cab.text='SBR · Hauptverteilung';q.elements.push(cab);for(let y=170;y<550;y+=100){const rail=createElement(q,'rail',250,y);q.elements.push(rail);for(let n=0;n<6;n++){const m=createElement(q,'module',260+n*28,y-25);m.text='';q.elements.push(m);}}return d;}
