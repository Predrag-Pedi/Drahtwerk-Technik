// CAD background masks were exported as black solids. Only large, axis-aligned
// solid masks are repaired; glyphs, junction dots and curved fills remain.
export function repairMask(p,t){
 const contours=p.d.match(/[Mm][^Mm]*[Zz]/g)||[];
 if(contours.length>1&&contours.join(' ').replace(/\s/g,'')===p.d.replace(/\s/g,'')){const parts=contours.map(d=>repairMask({...p,d},t));if(parts.every(q=>q.fill==='#ffffff'))return {...p,fill:'#ffffff'};}
 if(p.fill!=='#000000'||p.stroke!=='none')return p;
 if(/[cq]/i.test(p.d))return t.category==='Dispo'?roundedMask(p,t):p;
 const tokens=p.d.match(/[a-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/ig)||[];let i=0,cmd='',x=0,y=0;const pts=[];
 while(i<tokens.length){if(/^[a-z]$/i.test(tokens[i]))cmd=tokens[i++];const c=cmd.toUpperCase(),rel=cmd!==c;if(c==='Z')break;if(!['M','L','H','V'].includes(c))return p;const a=Number(tokens[i++]);if(!Number.isFinite(a))return p;if(c==='H')x=a+(rel?x:0);else if(c==='V')y=a+(rel?y:0);else{const b=Number(tokens[i++]);if(!Number.isFinite(b))return p;x=a+(rel?x:0);y=b+(rel?y:0);}pts.push([x,y]);if(c==='M')cmd=rel?'l':'L';}
 if(pts.length<4||pts.length>12||(p.d.match(/[mM]/g)||[]).length!==1)return p;const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);let area=0;for(let n=0;n<pts.length;n++){const a=pts[n],b=pts[(n+1)%pts.length];if(t.category!=='Dispo'&&Math.abs(a[0]-b[0])>t.viewWidth*.006&&Math.abs(a[1]-b[1])>t.viewHeight*.006)return p;area+=a[0]*b[1]-b[0]*a[1];}return Math.abs(area)/2>w*h*.8&&w*h>t.viewWidth*t.viewHeight*.03&&Math.min(w,h)>Math.min(t.viewWidth,t.viewHeight)*.12?{...p,fill:'#ffffff'}:p;
}

export function repairPaths(p,t){
 if(p.fill!=='#000000'||p.stroke!=='none')return [repairMask(p,t)];
 const contours=p.d.match(/[Mm][^Mm]*[Zz]/g)||[];
 if(contours.length<2||contours.join('').replace(/\s/g,'')!==p.d.replace(/\s/g,''))return [repairMask(p,t)];
 const masks=[],rest=[];for(const d of contours){const q=repairMask({...p,d},t);(q.fill==='#ffffff'?masks:rest).push(q);}
 if(!masks.length)return [p];
 return [...masks,...(rest.length?[{...p,d:rest.map(q=>q.d).join(' ')}]:[])];
}

// Rounded rectangular wipeouts are exported as cubic contours as well.
function roundedMask(p,t){
 const a=p.d.match(/[a-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/ig)||[];
 let i=0,x=0,y=0,cmd='',points=[]; const arity={M:2,L:2,H:1,V:1,C:6,Q:4};
 while(i<a.length){if(/^[a-z]$/i.test(a[i]))cmd=a[i++];const c=cmd.toUpperCase(),rel=cmd!==c;if(c==='Z')break;if(!arity[c])return p;const n=a.slice(i,i+arity[c]).map(Number);i+=arity[c];if(n.some(v=>!Number.isFinite(v)))return p;const ox=x,oy=y;if(c==='H')x=n[0]+(rel?x:0);else if(c==='V')y=n[0]+(rel?y:0);else {x=n.at(-2)+(rel?x:0);y=n.at(-1)+(rel?y:0);}if(c==='C'||c==='Q'){const controls=[];for(let k=0;k<n.length;k+=2)controls.push([n[k]+(rel?ox:0),n[k+1]+(rel?oy:0)]);for(let j=1;j<8;j++){const u=j/8,v=1-u;points.push(c==='C'?[v**3*ox+3*v*v*u*controls[0][0]+3*v*u*u*controls[1][0]+u**3*x,v**3*oy+3*v*v*u*controls[0][1]+3*v*u*u*controls[1][1]+u**3*y]:[v*v*ox+2*v*u*controls[0][0]+u*u*x,v*v*oy+2*v*u*controls[0][1]+u*u*y]);}}points.push([x,y]);if(c==='M')cmd=rel?'l':'L';}
 if((p.d.match(/[Mm]/g)||[]).length!==1||points.length<4)return p;
 const w=Math.max(...points.map(a=>a[0]))-Math.min(...points.map(a=>a[0])),h=Math.max(...points.map(a=>a[1]))-Math.min(...points.map(a=>a[1]));let area=0;points.forEach((a,i)=>{const b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];});
 return Math.abs(area)/2>w*h*.9&&w*h>t.viewWidth*t.viewHeight*.03&&Math.min(w,h)>Math.min(t.viewWidth,t.viewHeight)*.12?{...p,fill:'#ffffff'}:p;
}
