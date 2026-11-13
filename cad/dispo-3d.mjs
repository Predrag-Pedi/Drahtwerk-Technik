import {boxMesh,meterConduits} from './dispo-mesh.mjs?v=20261113-13';
import {frameBoxes} from './frame-render.mjs?v=20261113-13';
// Orthographic 3D: real XYZ geometry, orbit camera, depth-sorted faces. No network dependency.
export function sceneBoxes(p){
 const factor=420*p.scale/1200,boxes=[];
 const add=(e,x,y,z,w,h,d,color)=>{const a=(e.rotation||0)*Math.PI/180,dx=x+w/2-(e.x*factor+e.width/2),dy=y+h/2-(e.y*factor+e.height/2);boxes.push({shape:e.shape,cutout:e.cutout,plate:e.kind==='plate'||!!e.plateMounted,id:e.id,label:e.kind==='module'?e.tag:'',x:e.x*factor+e.width/2+dx*Math.cos(a)-dy*Math.sin(a)-w/2,y:e.y*factor+e.height/2+dx*Math.sin(a)+dy*Math.cos(a)-h/2,z,w,h,d,color,rotation:e.rotation||0});};
 for(const tube of meterConduits(p))add({...tube.e,tag:'',shape:'meterTube',cutout:tube.cutout,plateMounted:false},tube.x,tube.y,-95,40,tube.length,40,'#d8d8d2');
 const sources=p.elements.flatMap(e=>[e,...(e.dispoStructure||[]).map(part=>{const a=(e.rotation||0)*Math.PI/180,dx=part.x+part.width/2-e.width/2,dy=part.y+part.height/2-e.height/2;return {...part,id:e.id,x:e.x+(e.width/2+dx*Math.cos(a)-dy*Math.sin(a)-part.width/2)/factor,y:e.y+(e.height/2+dx*Math.sin(a)+dy*Math.cos(a)-part.height/2)/factor,rotation:e.rotation||0};})]);
 for(const source of sources){const e=source.kind==='template'&&source.dispoGeometryKind?{...source,kind:source.dispoGeometryKind}:{...source};if(source.kind==='template'&&source.dispoKind==='meter'&&['tl-0740','tl-0741','tl-0743','tl-0744'].includes(source.template?.id)){e.x+=35/factor;e.y+=45/factor;e.width=180;e.height=260;}const x=e.x*factor,y=e.y*factor,w=e.width,h=e.height,d=e.depth||({cabinet:400,rail:15,duct:60,module:80,plate:3})[e.kind];if(!d)continue;
  if(e.kind==='module'&&e.dispoKind==='meter')e.plateMounted=true;
  if(frameBoxes(e,x,y,add))continue;if(e.kind==='cabinet'){if(e.frameStyle==='drahtwerk')continue;
   if(!e.dispoFrame)add(e,x,y,-d,w,h,8,'#b5c1ce');
   add(e,x,y,-d,12,h,d,'#6d8197');add(e,x+w-12,y,-d,12,h,d,'#6d8197');add(e,x,y,-d,w,12,d,'#8496a9');add(e,x,y+h-12,-d,w,12,d,'#8496a9');
  }else if(['module','rail','duct'].includes(e.kind)){
   const cabinet=p.elements.find(c=>c.kind==='cabinet'&&e.x>=c.x&&e.y>=c.y&&e.x<c.x+c.width/factor&&e.y<c.y+c.height/factor);const mount=-(cabinet?.depth||400)+30;const z=e.mountZ??(mount+(e.kind==='module'?15:0));add(e,x,y,z,w,h,d,e.kind==='module'?'#edf1f5':e.kind==='rail'?'#97a9b9':'#c0c8d0');
   if(e.kind==='module'){add({...e,tag:''},x+w*.2,y+h*.28,z+d,w*.6,Math.min(20,h*.25),8,e.dispoKind==='meter'?'#214d64':'#276db0');}
  }
 }
 return boxes;
}
export function projectPoint(point,camera){const [x,y,z]=point,{yaw,pitch}=camera;const a=x*Math.cos(yaw)+z*Math.sin(yaw),b=-x*Math.sin(yaw)+z*Math.cos(yaw);return [a,y*Math.cos(pitch)-b*Math.sin(pitch),y*Math.sin(pitch)+b*Math.cos(pitch)];}
export function openDispo3D(p,onSelect){
 const boxes=sceneBoxes(p);if(!boxes.length)throw Error('Zuerst einen Schrank, Rahmen oder Geräte in der Dispo platzieren.');
 const dialog=document.createElement('dialog');dialog.className='dispo-3d';dialog.innerHTML='<header><strong>Disposition · 3D</strong><span>Planungsmodell</span><button data-view="front">Vorne</button><button data-view="side">Seite</button><button data-view="rear">Hinten</button><button data-view="top">Oben</button><button data-view="iso">Einpassen</button><button data-view="plus" aria-label="Vergrössern">+</button><button data-view="minus" aria-label="Verkleinern">−</button><label><input type="checkbox" checked data-labels> BMK</label><label><input type="checkbox" checked data-plates> Platten</label><button data-close>Zurück zu 2D ✕</button></header><canvas tabindex="0" aria-label="3D-Anlage. Ziehen dreht, Mausrad zoomt, Mitteltaste verschiebt. Pfeiltasten drehen."></canvas><footer>Linke Maustaste: drehen · Mausrad: zoomen · Mitteltaste / Umschalt: verschieben · Doppelklick auf Gerät: Eigenschaften in 2D</footer>';
 const omitted=p.elements.filter(e=>e.kind==='template'&&!e.dispoGeometryKind).length;if(omitted)dialog.querySelector('footer').textContent+=` · ${omitted} Grafikvorlagen ohne 3D-Körper`;document.body.append(dialog);const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx){dialog.remove();throw Error('3D-Zeichenfläche konnte nicht gestartet werden.');}
 const min=[Math.min(...boxes.map(b=>b.x)),Math.min(...boxes.map(b=>b.y)),Math.min(...boxes.map(b=>b.z))],max=[Math.max(...boxes.map(b=>b.x+b.w)),Math.max(...boxes.map(b=>b.y+b.h)),Math.max(...boxes.map(b=>b.z+b.d))],center=min.map((v,i)=>(v+max[i])/2),extent=Math.max(...max.map((v,i)=>v-min[i]));
 let camera={yaw:-.45,pitch:.2},zoom=1,pan=[0,0],pointer=null,faces=[],labels=true,showPlates=true,hitMap=null,hitWidth=0;
 const indices=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]];
 function draw(){const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#edf2f7';ctx.fillRect(0,0,r.width,r.height);const scale=Math.min(r.width,r.height)*.72/extent*zoom;faces=[];
  for(const b of boxes){if(!showPlates&&b.plate)continue;const a=b.rotation*Math.PI/180;const {vertices,surfaces}=boxMesh(b);const points=vertices.map(([x,y,z])=>{const dx=x-b.w/2,dy=y-b.h/2;return projectPoint([b.x+b.w/2+dx*Math.cos(a)-dy*Math.sin(a)-center[0],b.y+b.h/2+dx*Math.sin(a)+dy*Math.cos(a)-center[1],b.z+z-center[2]],camera);}).map(([x,y,z])=>[r.width/2+pan[0]+x*scale,r.height/2+pan[1]+y*scale,z]);
   surfaces.forEach((ids,i)=>faces.push({points:ids.map(j=>points[j]),z:ids.reduce((v,j)=>v+points[j][2],0)/ids.length,b,front:i===1,shade:b.shape==='meterTube'?(ids.every(j=>j%48>=24)?.45:Math.min(1,.82+ids.reduce((v,j)=>v+(vertices[j][0]-b.w/2)*.35+(vertices[j][2]-b.d/2)*.65,0)/ids.length/b.w*.3)):undefined}));
  }
  // Per-pixel depth avoids a tall backplate hiding small devices at oblique angles.
  const width=Math.max(1,Math.round(r.width)),height=Math.max(1,Math.round(r.height)),pixels=ctx.createImageData(width,height),depth=new Float32Array(width*height).fill(-Infinity),hits=new Uint32Array(width*height);
  for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=237;pixels.data[i+1]=242;pixels.data[i+2]=247;pixels.data[i+3]=255;}
  for(const f of faces){const objectIndex=boxes.indexOf(f.b)+1;const rgb=f.b.color.match(/\w\w/g).map(c=>parseInt(c,16));for(const ids of Array.from({length:f.points.length-2},(_,i)=>[0,i+1,i+2])){
   const [a,b,c]=ids.map(i=>f.points[i]),den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.001)continue;
   const left=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),right=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),top=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),bottom=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,w=1-u-v;if(u<0||v<0||w<0)continue;const z=u*a[2]+v*b[2]+w*c[2],index=y*width+x;if(z<depth[index])continue;depth[index]=z;hits[index]=objectIndex;
    let edge=false;for(let j=0;f.b.shape!=='meterTube'&&j<f.points.length;j++){const q=f.points[j],t=f.points[(j+1)%f.points.length],length=Math.hypot(t[0]-q[0],t[1]-q[1]);if(length&&Math.abs((t[0]-q[0])*(q[1]-y)-(q[0]-x)*(t[1]-q[1]))/length<.65)edge=true;}
    const shade=f.shade??(edge?.65:f.front?1:.86);for(let k=0;k<3;k++)pixels.data[index*4+k]=rgb[k]*shade;
   }
  }}
  hitMap=hits;hitWidth=width;const buffer=document.createElement('canvas');buffer.width=width;buffer.height=height;buffer.getContext('2d').putImageData(pixels,0,0);ctx.drawImage(buffer,0,0,width,height);
  for(const f of faces){if(!labels||!f.front||!f.b.label)continue;const [a,b,c]=f.points,x=(a[0]+c[0])/2,y=(a[1]+c[1])/2,z=(a[2]+c[2])/2,index=Math.round(y)*width+Math.round(x);if(x<0||x>=width||y<0||y>=height||z<depth[index]-1||Math.hypot(b[0]-a[0],b[1]-a[1])<22)continue;ctx.fillStyle='#132d48';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText(f.b.label,x,y,Math.hypot(b[0]-a[0],b[1]-a[1]));}

 }
 const clamp=()=>zoom=Math.max(.15,Math.min(10,zoom));
 canvas.onwheel=e=>{e.preventDefault();zoom*=Math.exp(-e.deltaY*.001);clamp();draw();};
 canvas.onpointerdown=e=>{if(![0,1,2].includes(e.button))return;e.preventDefault();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button!==0||e.shiftKey};canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(pointer.pan){pan[0]+=dx;pan[1]+=dy;}else{camera.yaw+=dx*.008;camera.pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,camera.pitch+dy*.008));}pointer.x=e.clientX;pointer.y=e.clientY;draw();};
 canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;canvas.oncontextmenu=e=>e.preventDefault();
 canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')camera.yaw-=.1;if(e.key==='ArrowRight')camera.yaw+=.1;if(e.key==='ArrowUp')camera.pitch-=.1;if(e.key==='ArrowDown')camera.pitch+=.1;if(e.key==='+')zoom*=1.1;if(e.key==='-')zoom/=1.1;if(e.key==='Home'){zoom=1;pan=[0,0];}clamp();draw();}};
 canvas.ondblclick=e=>{const r=canvas.getBoundingClientRect(),x=Math.floor(e.clientX-r.left),y=Math.floor(e.clientY-r.top),b=boxes[(hitMap?.[y*hitWidth+x]||0)-1];if(b){dialog.close();onSelect?.(b.id);}};
 dialog.querySelector('[data-plates]').onchange=e=>{showPlates=e.target.checked;draw();};dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-labels]').onchange=e=>{labels=e.target.checked;draw();};
 dialog.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const v=b.dataset.view;if(v==='plus')zoom*=1.2;else if(v==='minus')zoom/=1.2;else{camera=v==='front'?{yaw:0,pitch:0}:v==='side'?{yaw:Math.PI/2,pitch:0}:v==='rear'?{yaw:Math.PI,pitch:0}:v==='top'?{yaw:0,pitch:-Math.PI/2}:{yaw:-.45,pitch:.2};zoom=1;pan=[0,0];}clamp();draw();});
 const observer=new ResizeObserver(draw);dialog.onclose=()=>{observer.disconnect();dialog.remove();};dialog.showModal();observer.observe(canvas);draw();canvas.focus();
}
