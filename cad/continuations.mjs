import {circuitNames} from './circuit-data.mjs?v=20261114-04';
import {BUS,localPoint,pathAt} from './geometry.mjs?v=20261114-04';
import {size,wirePoints,ports} from './model.mjs?v=20261114-04';
export const endpointKey=e=>JSON.stringify([e.page,e.kind,e.side,e.phase,e.element,e.key,e.wire,e.index,e.id]);
export function connectionPoint(doc,e){const p=doc.pages.find(p=>p.id===e.page);if(!p)return null;
 if(e.kind==='bus')return p.bus?{x:e.side==='left'?60:1140,y:BUS[e.phase]}:null;
 if(e.kind==='template'){const el=p.elements.find(x=>x.id===e.element),a=el?.template?.details?.ends?.find(x=>x.key===e.key);if(!a)return null;const [w,h]=size(el,p);return localPoint(el,w,h,a.x*w/el.template.viewWidth,a.y*h/el.template.viewHeight);}
 if(e.kind==='wire'){const w=p.wires.find(x=>x.id===e.wire);if(!w)return null;const points=wirePoints(p,w);return e.index?points.at(-1):points[0];}
 if(e.kind==='point')return p.connectionPoints?.find(x=>x.id===e.id)||null;return null;
}
export function connectionCandidates(doc,p){if(p.type!=='schema')return [];const out=[];
 if(p.bus)for(const side of ['left','right'])for(const phase of Object.keys(BUS))out.push({page:p.id,kind:'bus',side,phase});
 for(const e of p.elements)for(const a of e.template?.details?.ends||[])out.push({page:p.id,kind:'template',element:e.id,key:a.key,phase:a.phase});
 const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1;
 for(const w of p.wires){const pts=wirePoints(p,w);for(const index of [0,1]){if(w[index?'to':'from'])continue;const pt=index?pts.at(-1):pts[0];if(p.elements.some(e=>ports(e,p).some(a=>near(a,pt)))||p.wires.some(o=>o!==w&&wirePoints(p,o).some(a=>near(a,pt))))continue;out.push({page:p.id,kind:'wire',wire:w.id,index,phase:w.label||''});}}
 for(const a of p.connectionPoints||[])out.push({page:p.id,kind:'point',id:a.id,phase:a.phase});
 return out.filter(e=>{const a=connectionPoint(doc,e);if(!a||!Number.isFinite(a.y))return false;if(e.kind==='template'&&!linked(doc,e)&&p.wires.some(w=>wirePoints(p,w).some(b=>near(a,b))))return false;return true;});
}
export function linked(doc,e){const key=endpointKey(e);return (doc.links||[]).find(l=>endpointKey(l.a)===key||endpointKey(l.b)===key);}
export function otherEnd(link,e){return endpointKey(link.a)===endpointKey(e)?link.b:link.a;}
export function referenceText(doc,e){const l=linked(doc,e);if(!l)return '';if(l.text)return l.text;const other=otherEnd(l,e),p=doc.pages.find(p=>p.id===other.page),pt=connectionPoint(doc,other);const names=l.name?[l.name]:[...new Set([...circuitNames(doc,l.a),...circuitNames(doc,l.b)])],name=names.length===1?names[0]:'';return p&&pt?`${p.number}.${pathAt(pt.x)}${name?' · '+name+(e.phase?'_'+e.phase:''):''}`:'Ziel fehlt';}
export function connect(doc,a,b){if(a.page===b.page)throw Error('Bitte einen Anschluss auf einer anderen Seite wählen.');if(!connectionPoint(doc,a)||!connectionPoint(doc,b))throw Error('Anschluss nicht mehr vorhanden.');if(a.phase&&b.phase&&a.phase!==b.phase)throw Error('Die Leiterbezeichnungen stimmen nicht überein.');const groups=[...new Set([...circuitNames(doc,a),...circuitNames(doc,b)])];if(groups.length>1)throw Error('Unterschiedliche Einspeisegruppen dürfen nicht verbunden werden: '+groups.join(', '));const keys=[endpointKey(a),endpointKey(b)];doc.links=(doc.links||[]).filter(l=>!keys.includes(endpointKey(l.a))&&!keys.includes(endpointKey(l.b)));doc.links.push({a:{...a},b:{...b},text:''});}
export function inheritBus(doc,source,target){if(source?.type!=='schema'||target.type!=='schema'||source.id===target.id)throw Error('Zwei unterschiedliche Schemaseiten erforderlich.');const sources=Object.keys(BUS).map(phase=>source.bus?{page:source.id,kind:'bus',side:'right',phase}:connectionCandidates(doc,source).filter(a=>a.phase===phase).sort((a,b)=>connectionPoint(doc,b).x-connectionPoint(doc,a).x)[0]);if(sources.some(a=>!a))throw Error('Quellseite hat nicht für alle Leiter einen Anschluss. Verweise einzeln oder als Auswahl setzen.');target.bus=true;for(const a of sources)connect(doc,a,{page:target.id,kind:'bus',side:'left',phase:a.phase});}
export function validateConnections(raw,d,fail){const str=v=>typeof v==='string'&&v.length<=2000?v:fail();const ref=e=>{if(!e||!['bus','template','wire','point'].includes(e.kind))return fail();const r={page:str(e.page),kind:e.kind,phase:str(e.phase||'')};if(e.kind==='bus'){if(!['left','right'].includes(e.side)||!(e.phase in BUS))return fail();r.side=e.side;}if(e.kind==='template'){r.element=str(e.element);r.key=str(e.key);}if(e.kind==='wire'){r.wire=str(e.wire);if(![0,1].includes(e.index))return fail();r.index=e.index;}if(e.kind==='point')r.id=str(e.id);return r;};if(raw===undefined)return [];if(!Array.isArray(raw)||raw.length>10000)return fail();const seen=new Set();return raw.map(l=>{const a=ref(l.a),b=ref(l.b);if(a.page===b.page||a.phase&&b.phase&&a.phase!==b.phase)fail();for(const e of [a,b]){const key=endpointKey(e);if(seen.has(key))fail();seen.add(key);}return {a,b,text:str(l.text||''),...(l.name?{name:str(l.name)}:{})};});}
// Resolve a selected group by phase, never by array position. Commit atomically.
export function connectionGroup(doc,a){const p=doc.pages.find(p=>p.id===a.page);return connectionCandidates(doc,p).filter(b=>b.kind===a.kind&&(a.kind==='bus'?b.side===a.side:a.kind==='template'?b.element===a.element:a.kind==='point'?true:b.index===a.index));}
export function connectSelected(doc,sources,target){
 const unique=[...new Map(sources.map(a=>[endpointKey(a),a])).values()];
 if(unique.length===1){connect(doc,unique[0],target);return;}
 const group=connectionGroup(doc,target),keys=new Set(unique.map(endpointKey)),pairs=[],used=new Set();
 for(const a of unique){if(!a.phase)throw Error('Für die gemeinsame Zuordnung müssen die Leiter L1, L2, L3 oder N bezeichnet sein.');const candidates=group.filter(b=>b.phase===a.phase&&!used.has(endpointKey(b))&&(!linked(doc,b)||keys.has(endpointKey(otherEnd(linked(doc,b),b)))));if(candidates.length!==1)throw Error(`Ziel für ${a.phase} ist nicht eindeutig oder bereits belegt. Bitte einen anderen Zielbereich wählen.`);pairs.push([a,candidates[0]]);used.add(endpointKey(candidates[0]));}
 const draft={...doc,links:structuredClone(doc.links||[])};for(const [a,b]of pairs)connect(draft,a,b);doc.links=draft.links;
}
export function createContinuationInputs(doc,sources,target){
 const copy={...target,connectionPoints:[...(target.connectionPoints||[])]},draft={...doc,pages:doc.pages.map(p=>p.id===target.id?copy:p),links:structuredClone(doc.links||[])};
 for(const a of sources){const y=160+copy.connectionPoints.length*25;if(y>760)throw Error('Auf der Zielseite ist kein Platz für weitere Eingänge.');const id=crypto.randomUUID();copy.connectionPoints.push({id,x:80,y,phase:a.phase||''});connect(draft,a,{page:target.id,kind:'point',id,phase:a.phase||''});}
 target.connectionPoints=copy.connectionPoints;doc.links=draft.links;
}
