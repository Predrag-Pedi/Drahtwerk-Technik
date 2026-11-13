// Open conduit with a front cable-entry cutout. Dimensions are visual planning
// defaults (40 mm diameter), not an inferred manufacturing specification.
export function boxMesh(b){
 if(b.shape==='meterTube'){
  const vertices=[],surfaces=[],n=24,r=b.w/2,t=2,ys=[0,b.h*.3,b.h*.5,b.h];
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
