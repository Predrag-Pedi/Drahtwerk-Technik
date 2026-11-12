import {localPoint} from './geometry.mjs?v=20261112-11';
import {templateSize} from './template.mjs?v=20261112-11';
// Normalize SVG segments without turning text outlines or filled masks into conductors.
export function pathSegments(d){
 const tokens=d.match(/[a-df-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/ig)||[],out=[];
 const counts={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};let i=0,cmd='',x=0,y=0,sx=0,sy=0;
 while(i<tokens.length){if(/^[a-z]$/i.test(tokens[i]))cmd=tokens[i++];const upper=cmd.toUpperCase(),n=counts[upper];if(n===undefined)throw Error('Unbekannter SVG-Befehl');
  if(upper==='Z'){out.push({a:{x,y},b:{x:sx,y:sy},d:`L ${sx} ${sy}`,line:true});x=sx;y=sy;cmd='';continue;}
  if(i+n>tokens.length||!n)throw Error('Unvollständiger SVG-Pfad');const raw=tokens.slice(i,i+n).map(Number);if(raw.some(v=>!Number.isFinite(v)))throw Error('Ungültiger SVG-Pfad');i+=n;
  const relative=cmd===cmd.toLowerCase(),a={x,y},v=[...raw];
  if(upper==='H'){x=raw[0]+(relative?x:0);out.push({a,b:{x,y},d:`L ${x} ${y}`,line:true});continue;}
  if(upper==='V'){y=raw[0]+(relative?y:0);out.push({a,b:{x,y},d:`L ${x} ${y}`,line:true});continue;}
  if(upper==='A'){v[5]+=relative?x:0;v[6]+=relative?y:0;}else for(let k=0;k<n;k+=2){v[k]+=relative?x:0;v[k+1]+=relative?y:0;}
  x=v[n-2];y=v[n-1];if(upper==='M'){sx=x;sy=y;cmd=relative?'l':'L';continue;}
  out.push({a,b:{x,y},d:`${upper} ${v.join(' ')}`,line:upper==='L'});
 }
 return out;
}
const cache=new WeakMap();
export function templateLines(t){if(cache.has(t.paths))return cache.get(t.paths);const result=[];t.paths.forEach((path,pi)=>{if(path.stroke==='none')return;pathSegments(path.d).forEach((s,si)=>{if(s.line&&Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>.001)result.push({...s,path:pi,segment:si,stroke:path.stroke,sw:path.sw});});});cache.set(t.paths,result);return result;}
export function linePoints(e,p,l){const [w,h]=templateSize(e,p);return [l.a,l.b].map(q=>localPoint(e,w,h,q.x*w/e.template.viewWidth,q.y*h/e.template.viewHeight));}
export function detachLine(page,e,index,id){
 const l=templateLines(e.template)[index];if(!l)throw Error('Linie nicht mehr vorhanden');if(page.elements.length+page.wires.length>=5000)throw Error('Maximal 5000 Elemente pro Seite.');
 const paths=[...e.template.paths],original=paths[l.path],segments=pathSegments(original.d);
 const remainder=segments.filter((_,i)=>i!==l.segment).map(s=>`M ${s.a.x} ${s.a.y} ${s.d}`).join(' ');
 const replacements=[];if(original.fill!=='none')replacements.push({...original,stroke:'none'});if(remainder)replacements.push({...original,d:remainder,fill:'none'});
 paths.splice(l.path,1,...replacements);if(!paths.length)paths.push({d:'M 0 0',fill:'none',stroke:'none',sw:0});
 const [w,h]=templateSize(e,page),wire={id,points:linePoints(e,page,l),from:null,to:null,label:'',dashed:false,direct:true,stroke:l.stroke,strokeWidth:Math.max(.75,l.sw*Math.min(w/e.template.viewWidth,h/e.template.viewHeight))};
 const anchors=[l.a,l.b].map(q=>({x:q.x/e.template.viewWidth,y:q.y/e.template.viewHeight}));
 for(const other of page.wires)for(const key of ['from','to']){const ref=other[key];if(ref?.element!==e.id||!ref.local)continue;const index=anchors.findIndex(a=>Math.abs(a.x-ref.local.x)<1e-8&&Math.abs(a.y-ref.local.y)<1e-8);if(index>=0)other[key]={wire:id,index};}
 wire.from={element:e.id,local:anchors[0]};wire.to={element:e.id,local:anchors[1]};e.template={...e.template,paths};page.wires.push(wire);return wire;
}
