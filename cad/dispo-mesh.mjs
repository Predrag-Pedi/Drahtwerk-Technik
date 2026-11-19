// Open conduit with a front cable-entry cutout. Dimensions are visual planning
// default diameter is 40 mm; paired length is the specified 740 mm.
export function boxMesh(b){
 if(b.shape==='entryPerforated'){
  const vertices=[],surfaces=[],nx=Math.min(40,Math.max(2,Math.ceil(b.w/32))),nz=Math.min(16,Math.max(2,Math.ceil(b.d/32))),cw=b.w/nx,cd=b.d/nz,n=16,radius=Math.min(cw,cd)*.25;
  // Circular holes with equal diameter in both axes. The flat sheet has no
  // internal side walls or cell seams; only hole walls and the outer perimeter.
  for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
   const start=vertices.length,cx=(x+.5)*cw,cz=(z+.5)*cd;
   for(const y of [0,b.h])for(const inner of [false,true])for(let i=0;i<n;i++){const a=i*2*Math.PI/n,co=Math.cos(a),si=Math.sin(a),square=1/Math.max(Math.abs(co),Math.abs(si));vertices.push([cx+co*(inner?radius:cw/2*square),y,cz+si*(inner?radius:cd/2*square)]);}
   for(let i=0;i<n;i++){const j=(i+1)%n;for(const face of [[i,j,j+n,i+n],[i+2*n,i+3*n,j+3*n,j+2*n],[i+n,j+n,j+3*n,i+3*n]])surfaces.push(face.map(k=>start+k));
    const a=vertices[start+i],b0=vertices[start+j];if([0,b.w].some(v=>Math.abs(a[0]-v)<1e-7&&Math.abs(b0[0]-v)<1e-7)||[0,b.d].some(v=>Math.abs(a[2]-v)<1e-7&&Math.abs(b0[2]-v)<1e-7))surfaces.push([i,i+2*n,j+2*n,j].map(k=>start+k));
   }
  }return {vertices,surfaces};
 }
 if(b.shape==='entryPanel'){
  const bevel=Math.min(.8,b.h/3,b.w/8,b.d/8),vertices=[];
  for(const [y,inset]of [[0,bevel],[bevel,0],[b.h,0]])for(const [x,z]of [[inset,inset],[b.w-inset,inset],[b.w-inset,b.d-inset],[inset,b.d-inset]])vertices.push([x,y,z]);
  return {vertices,surfaces:[[0,3,2,1],[8,9,10,11],...Array.from({length:8},(_,i)=>{const row=Math.floor(i/4)*4,k=i%4,j=(k+1)%4;return [row+k,row+j,row+j+4,row+k+4];})]};
 }
 if(b.shape==='meterTube'){
  const vertices=[],surfaces=[],n=24,r=b.w/2,t=2,ys=[0,b.h*(b.cutout==='lower'?.7:.2),b.h*(b.cutout==='lower'?.8:.3),b.h];
  const index=(ring,inner,i)=>ring*n*2+inner*n+(i+n)%n;
  for(const yy of ys)for(const inner of [0,1])for(let i=0;i<n;i++){const a=i*2*Math.PI/n,rad=r-inner*t;vertices.push([r+Math.cos(a)*rad,yy,r+Math.sin(a)*rad]);}
  const cut=i=>Math.sin((i+.5)*2*Math.PI/n)>.72;
  for(let j=0;j<3;j++)for(let i=0;i<n;i++){
   if(j===1&&cut(i))continue;
   for(const inner of [0,1])surfaces.push([index(j,inner,i),index(j,inner,i+1),index(j+1,inner,i+1),index(j+1,inner,i)]);
   for(const ring of [j,j+1])if(ring===0||ring===3||(j===0||j===2)&&cut(i))surfaces.push([index(ring,0,i),index(ring,0,i+1),index(ring,1,i+1),index(ring,1,i)]);
   if(j===1)for(const side of [i,i+1])if(cut(side-1)!==cut(side))surfaces.push([index(j,0,side),index(j,1,side),index(j+1,1,side),index(j+1,0,side)]);
  }return {vertices,surfaces};
 }
 if(b.shape==='cylinder')return {vertices:Array.from({length:40},(_,i)=>{const a=i%20*Math.PI/10;return [b.w/2+Math.cos(a)*b.w/2,b.h/2+Math.sin(a)*b.h/2,i<20?0:b.d];}),surfaces:[Array.from({length:20},(_,i)=>i),Array.from({length:20},(_,i)=>i+20),...Array.from({length:20},(_,i)=>[i,(i+1)%20,(i+1)%20+20,i+20])]};
 return {vertices:[[0,0,0],[b.w,0,0],[b.w,b.h,0],[0,b.h,0],[0,0,b.d],[b.w,0,b.d],[b.w,b.h,b.d],[0,b.h,b.d]],surfaces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]};
}

// Two vertically adjacent 400 mm meter bays share a pair of 740 mm conduits.
// A solitary bay uses a short conduit so it cannot protrude into the next zone.
export function meterConduits(p){
 const mm=420*p.scale/1200,meters=p.elements.filter(e=>e.dispoKind==='meter').map(e=>({e,cx:e.x*mm+e.width/2,top:e.y*mm-(e.width===250&&e.height===400?0:45)})).sort((a,b)=>a.cx-b.cx||a.top-b.top),used=new Set(),out=[];
 for(const a of meters){if(used.has(a.e.id))continue;used.add(a.e.id);const b=meters.find(b=>!used.has(b.e.id)&&Math.abs(b.cx-a.cx)<1&&Math.abs(b.top-a.top-400)<1&&!a.e.rotation&&!b.e.rotation);
  if(b){used.add(b.e.id);for(const [i,owner]of[a,b].entries())out.push({e:owner.e,x:a.cx-42+i*44,y:a.top+30,length:740,cutout:i===0?'upper':'lower'});}
  else out.push({e:a.e,x:a.cx-20,y:a.top+30,length:340,cutout:'upper'});
 }return out;
}
