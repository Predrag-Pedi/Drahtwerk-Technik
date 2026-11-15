import {findFunction} from './references.mjs?v=20261115-16';
import {localCircuitName} from './circuit-data.mjs?v=20261115-16';
const palette=['#245b9e','#7543a2','#087b79','#9b541b','#a33863','#526d26','#48589a','#79533a'];
export function groupColor(name){
 const key=String(name||'').trim().toLocaleLowerCase('de');if(!key||/^(reserve|zählerabgänge)$/.test(key))return null;
 if(key==='allgemein')return palette[0];if(/^e[- .]?mob/.test(key))return palette[1];if(/^(wärmepumpe|wp)$/.test(key))return palette[2];
 let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;return palette[hash%palette.length];
}
export function deviceGroup(doc,e){
 if(e.reserve||e.meterState==='reserve')return '';
 const owner=findFunction(doc,e.meterSource),source=findFunction(doc,e.dispoSource);
 // Exact device references take precedence over the surrounding macro's text.
 const name=f=>f&&(f.data.circuitName||f.data.description||localCircuitName(f.element));
 return name(owner)||e.circuitName||name(source)||'';
}
export function deviceColor(doc,p,e){return p.type==='dispo'&&p.dispoConfig?.groupColors!==false&&e.dispoSource?groupColor(deviceGroup(doc,e)):null;}
