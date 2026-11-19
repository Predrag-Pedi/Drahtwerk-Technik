import {placement} from './placement.mjs?v=20261119-1';
import {DRAW,pathAt,bounds,localPoint} from './geometry.mjs?v=20261119-1';
import {size} from './model.mjs?v=20261119-1';

export const isSchemaMacro=t=>t?.category==='Schema'&&/^Makros\//i.test(t.source||'');
// Original text keys are retained: edits use the same rendering, export and
// device recognition as text edited after insertion.
export function macroFields(t){
 return (t.details?.texts||[]).filter(t=>!/^\s*(?:\d+|L[123]?|N|PE|PEN|[+-])\s*$/.test(t.text)).map(t=>{
  const value=t.text.trim();let label='Vorlagentext',primary=false;
  if(/^\d+(?:[.,]\d+)?\s*A$/i.test(value)){label='Bemessungsstrom';primary=true;}
  else if(/^[BCD]$/.test(value)){label='Charakteristik';primary=true;}
  else if(/^\d+(?:[.,]\d+)?\s*mA$/i.test(value)){label='Fehlerstrom';primary=true;}
  else if(/\d\s*[x×]\s*\d/i.test(value)){label='Kabel';primary=true;}
  else if(/^\d+(?:[.,]\d+)?\s*mm[²2]$/i.test(value)){label='Querschnitt';primary=true;}
  else if(/^\d+\s*V(?:AC|DC)?$/i.test(value)){label='Spannung';primary=true;}
  return {key:t.key,label,value:t.text,primary};
 });
}
export function applyMacroValues(e,values={}){
 const allowed=new Set((e.template?.details?.texts||[]).map(t=>t.key));
 const edits={};for(const [key,value]of Object.entries(values)){
  if(!allowed.has(key)||typeof value!=='string'||value.length>2000)throw Error('Ungültiger Makrowert.');
  if(value!==e.template.details.texts.find(t=>t.key===key).text)edits[key]=value;
 }
 e.textEdits={...e.textEdits,...edits};return e;
}
export function macroAtPath(page,template,path,{values={},percent=100,autoConnect=true}={}){
 if(page.type!=='schema'||!isSchemaMacro(template))throw Error('Pfadwahl ist für Schema-Makros verfügbar.');
 if(!Number.isInteger(path)||path<0||path>9)throw Error('Strompfad 0 bis 9 wählen.');
 if(!Number.isFinite(percent)||percent<1||percent>200)throw Error('Symbolgrösse prüfen.');
 const center=DRAW.left+(path+.5)*(DRAW.right-DRAW.left)/10;
 const e=placement(page,'template',{x:center,y:DRAW.top+10},false,0,template,autoConnect,{dimensions:{width:template.width*percent/100,height:template.height*percent/100}});
 if(!e)throw Error('Dieses Makro passt mit der gewählten Symbolgrösse nicht auf das Blatt.');
 const [w,h]=size(e,page),label=template.labels?.find(l=>l.letter!=='X')||template.labels?.[0];
 const anchor=()=>label?localPoint(e,w,h,label.anchor.x*w/template.viewWidth,label.anchor.y*h/template.viewHeight):{x:e.x+w/2,y:e.y+h/2};
 e.x+=center-anchor().x;
 let b=bounds(e,w,h);e.x+=Math.max(0,DRAW.left-b.left)-Math.max(0,b.right-DRAW.right);b=bounds(e,w,h);
 if(pathAt(anchor().x)!==path||b.left<DRAW.left-.001||b.right>DRAW.right+.001)throw Error('Makro reicht über den Blattrand. Einen anderen Pfad wählen.');
 const collision=page.elements.some(other=>{
  if(!other.template)return false;const o=bounds(other,...size(other,page));
  return Math.min(b.right,o.right)-Math.max(b.left,o.left)>2&&Math.min(b.bottom,o.bottom)-Math.max(b.top,o.top)>2;
 });
 if(collision)throw Error(`Auf Pfad ${path} überschneidet sich das Makro mit einer Vorlage. Einen freien Pfad wählen oder mit der Maus platzieren.`);
 if(page.elements.length+page.wires.length>=5000)throw Error('Maximal 5000 Elemente pro Seite.');
 return applyMacroValues(e,values);
}
