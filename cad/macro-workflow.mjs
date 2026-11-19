import {applyTerminalSide} from './terminal-markers.mjs?v=20261119-5';
import {placement} from './placement.mjs?v=20261119-5';
import {DRAW,pathAt,bounds,localPoint} from './geometry.mjs?v=20261119-5';
import {size} from './model.mjs?v=20261119-5';

export const isSchemaMacro=t=>t?.category==='Schema'&&/^Makros\//i.test(t.source||'');
export {macroFields,applyMacroValues} from './macro-config.mjs?v=20261119-5';
import {applyMacroValues,applyMacroDraft} from './macro-config.mjs?v=20261119-5';
export function macroAtPath(page,template,path,{values={},percent=100,autoConnect=true,terminalSide='original',draft=null}={}){
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
 return applyTerminalSide(draft?applyMacroDraft(e,draft):applyMacroValues(e,values),terminalSide);
}
