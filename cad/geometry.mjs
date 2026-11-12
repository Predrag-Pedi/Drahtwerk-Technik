// Drawing coordinates are retained for compatibility with saved projects.
export const PAPER_WIDTH_MM=420,PAPER_HEIGHT_MM=297,W=1200,H=W*PAPER_HEIGHT_MM/PAPER_WIDTH_MM;
export const MM=W/PAPER_WIDTH_MM;
export const DRAW={left:40,right:1160,top:35,bottom:785};
export const BUS={L1:45,L2:45+5*MM,L3:45+10*MM,N:45+15*MM};
export const pathAt=x=>Math.max(0,Math.min(9,Math.floor((x-DRAW.left)/112)));
export function localPoint(e,w,h,x,y){const a=e.rotation*Math.PI/180,dx=x-w/2,dy=y-h/2;return {x:e.x+w/2+dx*Math.cos(a)-dy*Math.sin(a),y:e.y+h/2+dx*Math.sin(a)+dy*Math.cos(a)};}
export function bounds(e,w,h){const pts=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>localPoint(e,w,h,x,y));return {left:Math.min(...pts.map(p=>p.x)),right:Math.max(...pts.map(p=>p.x)),top:Math.min(...pts.map(p=>p.y)),bottom:Math.max(...pts.map(p=>p.y))};}
