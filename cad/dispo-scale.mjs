import {DRAW} from './geometry.mjs?v=20261119-5';

// Scale the complete drawing about the page centre; real equipment sizes stay in mm.
export function setDispoScale(p,scale){
 if(p.type!=='dispo')throw Error('Massstab ist nur für Dispositionen verfügbar.');
 if(!Number.isFinite(scale)||scale<1||scale>100)throw Error('Massstab zwischen 1 und 100 wählen.');
 const ratio=Number(p.scale)/scale;if(!Number.isFinite(ratio)||ratio<=0)throw Error('Bisherigen Massstab prüfen.');
 const centre={x:(DRAW.left+DRAW.right)/2,y:(DRAW.top+DRAW.bottom)/2};
 const point=q=>{q.x=centre.x+(q.x-centre.x)*ratio;q.y=centre.y+(q.y-centre.y)*ratio;};
 for(const e of p.elements){point(e);if(e.measure){for(const q of [e.measure.a,e.measure.b]){q.x*=ratio;q.y*=ratio;}e.measure.offset*=ratio;e.width=Math.max(1,e.width*ratio);e.height=Math.max(1,e.height*ratio);}else if(!['cabinet','plate','rail','duct','module','template','text'].includes(e.kind)){e.width=Math.max(1,e.width*ratio);e.height=Math.max(1,e.height*ratio);}}
 for(const w of p.wires)for(const q of w.points)point(q);
 for(const q of p.connectionPoints||[])point(q);
 p.scale=scale;
}
