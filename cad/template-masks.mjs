// CAD background masks were exported as black solids. Only large, axis-aligned
// solid masks are repaired; glyphs, junction dots and curved fills remain.
export function repairMask(p,t){
 if(p.fill!=='#000000'||p.stroke!=='none'||/[cqast]/i.test(p.d))return p;
 const tokens=p.d.match(/[a-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/ig)||[];let i=0,cmd='',x=0,y=0;const pts=[];
 while(i<tokens.length){if(/^[a-z]$/i.test(tokens[i]))cmd=tokens[i++];const c=cmd.toUpperCase(),rel=cmd!==c;if(c==='Z')break;if(!['M','L','H','V'].includes(c))return p;const a=Number(tokens[i++]);if(!Number.isFinite(a))return p;if(c==='H')x=a+(rel?x:0);else if(c==='V')y=a+(rel?y:0);else{const b=Number(tokens[i++]);if(!Number.isFinite(b))return p;x=a+(rel?x:0);y=b+(rel?y:0);}pts.push([x,y]);if(c==='M')cmd=rel?'l':'L';}
 if(pts.length<4||pts.length>12||(p.d.match(/[mM]/g)||[]).length!==1)return p;const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);let area=0;for(let n=0;n<pts.length;n++){const a=pts[n],b=pts[(n+1)%pts.length];if(a[0]!==b[0]&&a[1]!==b[1])return p;area+=a[0]*b[1]-b[0]*a[1];}return Math.abs(area)/2>w*h*.8&&w*h>t.viewWidth*t.viewHeight*.03&&Math.min(w,h)>Math.min(t.viewWidth,t.viewHeight)*.12?{...p,fill:'#ffffff'}:p;
}
