// PDF.js 4 vector paths in the same (rotation-aware) viewport coordinates as text.
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
export function drawingItems(content,viewport){return content.items.filter(x=>'str'in x).map(x=>{const t=multiply(viewport.transform,x.transform);return {str:x.str,x:t[4],y:t[5],width:x.width,height:Math.hypot(t[2],t[3]),rotated:Math.abs(t[1])>Math.abs(t[0])};});}
export function drawingLines(list,OPS,viewport){
 const imageOps=new Set(Object.entries(OPS).filter(([name])=>/paint.*Image|shadingFill/.test(name)).map(([,value])=>value));
 let matrix=[1,0,0,1,0,0],stack=[],path=[],segments=[],complete=true,start=null,last=null;
 const add=(x,y)=>{const p=point(multiply(viewport.transform,matrix),x,y);if(last)path.push({a:last,b:p});last=p;};
 for(let i=0;i<list.fnArray.length;i++){
  const op=list.fnArray[i],args=list.argsArray[i]||[];
  if(op===OPS.save)stack.push([...matrix]);
  else if(op===OPS.restore){matrix=stack.pop()||matrix;}
  else if(op===OPS.transform)matrix=multiply(matrix,args);
  else if(op===OPS.paintFormXObjectBegin){stack.push([...matrix]);if(args[0])matrix=multiply(matrix,args[0]);}
  else if(op===OPS.paintFormXObjectEnd)matrix=stack.pop()||matrix;
  else if(op===OPS.constructPath){
   const [commands,coords]=args;let j=0;
   for(const cmd of commands){
    if(cmd===OPS.moveTo){last=null;add(coords[j++],coords[j++]);start=last;}
    else if(cmd===OPS.lineTo)add(coords[j++],coords[j++]);
    else if(cmd===OPS.rectangle){const [x,y,w,h]=coords.slice(j,j+4);j+=4;last=null;add(x,y);start=last;add(x+w,y);add(x+w,y+h);add(x,y+h);add(x,y);}
    else if(cmd===OPS.closePath){if(last&&start)path.push({a:last,b:start});last=start;}
    else if([OPS.curveTo,OPS.curveTo2,OPS.curveTo3].includes(cmd)){
     // A curve could be part of a connection. Retain its control polygon conservatively.
     const n=cmd===OPS.curveTo?6:4;for(let k=0;k<n;k+=2)add(coords[j+k],coords[j+k+1]);j+=n;
    }else complete=false;
   }
  }else if([OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(op)){
   if([OPS.closeStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(op)&&last&&start)path.push({a:last,b:start});
   segments.push(...path);path=[];last=start=null;
  }else if([OPS.fill,OPS.eoFill].includes(op)){segments.push(...path);path=[];last=start=null;}
  else if(op===OPS.endPath){path=[];last=start=null;}
  else if(imageOps.has(op))complete=false;
 }
 return {segments,complete};
}
const reference=/^[-+]?\d*[FSPKYQ]\d+(?:\.\d+)*[A-Za-z]?$/;
// Only exclude a locally labelled reserve when its drawn symbol is isolated.
// Missing geometry, images, ambiguous labels or nearby wiring keep the device for review.
export function reserveStatus(page,ref){
 const g=page.drawing;if(!g?.complete||!g.segments?.length)return '';
 const items=page.items||[],refs=items.filter(x=>reference.test(x.str.trim())&&!x.rotated),anchors=refs.filter(x=>x.str.trim()===ref);
 for(const anchor of anchors){
  const end=anchor.x+(anchor.width||0),h=anchor.height||7;
  const label=items.find(x=>/^(?:Reserve|Res\.)$/i.test(x.str.trim())&&!x.rotated&&Math.abs(x.y-anchor.y)<h*4&&Math.abs(x.x+(x.width||0)-end)<h*3&&refs.toSorted((a,b)=>Math.hypot(a.x-x.x,a.y-x.y)-Math.hypot(b.x-x.x,b.y-x.y))[0]===anchor);
  if(!label)continue;
  const box={x0:end-1,x1:end+h*10,y0:anchor.y-h*2,y1:anchor.y+h*5};
  const inside=p=>p.x>=box.x0&&p.x<=box.x1&&p.y>=box.y0&&p.y<=box.y1;
  const intersects=s=>Math.max(s.a.x,s.b.x)>=box.x0&&Math.min(s.a.x,s.b.x)<=box.x1&&Math.max(s.a.y,s.b.y)>=box.y0&&Math.min(s.a.y,s.b.y)<=box.y1;
  const near=g.segments.filter(intersects),local=near.filter(s=>inside(s.a)&&inside(s.b));
  if(near.some(s=>!inside(s.a)||!inside(s.b)))return 'wired';
  // Require a real symbol, not empty whitespace or just one short line.
  const meaningful=local.filter(s=>Math.hypot(s.a.x-s.b.x,s.a.y-s.b.y)>h*.4);
  if(meaningful.length>=4&&meaningful.some(s=>Math.abs(s.a.y-s.b.y)>h))return 'unwired';
 }
 return '';
}
