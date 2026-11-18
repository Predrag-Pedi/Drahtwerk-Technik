// Door hinge motion is applied in cabinet coordinates before drawing rotation.
// Both WebGL and the software renderer share exactly the same world geometry.
export function boxWorldPoint(b,[x,y,z],center=[0,0,0]){
 if(b.hingeX!==undefined){const a=(b.doorAngle||0)*Math.PI/180,dx=x-b.hingeX,dz=z-(b.hingeZ||0);x=b.hingeX+dx*Math.cos(a)-dz*Math.sin(a);z=(b.hingeZ||0)+dx*Math.sin(a)+dz*Math.cos(a);}
 const a=(b.rotation||0)*Math.PI/180,dx=x-b.w/2,dy=y-b.h/2;
 return [b.x+b.w/2+dx*Math.cos(a)-dy*Math.sin(a)-center[0],b.y+b.h/2+dx*Math.sin(a)+dy*Math.cos(a)-center[1],b.z+z-center[2]];
}

export function sceneBounds(boxes){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const b of boxes)for(const x of [0,b.w])for(const y of [0,b.h])for(const z of [0,b.d]){const p=boxWorldPoint(b,[x,y,z]);for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}}
 return {center:min.map((v,i)=>(v+max[i])/2),extent:Math.max(...max.map((v,i)=>v-min[i]),1)};
}
