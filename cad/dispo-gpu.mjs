import {boxMesh} from './dispo-mesh.mjs?v=20261113-21';
// Static geometry is uploaded once; orbit/zoom only update camera uniforms.
export function prepareGeometry(boxes,center){
 const triangles=[],edges=[],labels=[];
 boxes.forEach((b,index)=>{
  const {vertices,surfaces}=boxMesh(b),angle=(b.rotation||0)*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle);
  const world=([x,y,z])=>[b.x+b.w/2+(x-b.w/2)*cs-(y-b.h/2)*sn-center[0],b.y+b.h/2+(x-b.w/2)*sn+(y-b.h/2)*cs-center[1],b.z+z-center[2]];
  const points=vertices.map(world),rgb=b.color.match(/\w\w/g).map(c=>parseInt(c,16)/255),id=index+1,pick=[(id&255)/255,((id>>8)&255)/255,((id>>16)&255)/255],seen=new Set();
  for(const face of surfaces){const [a,bp,c]=face.map(i=>points[i]),u=bp.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1,normal=n.map(v=>v/length);
   const record=i=>[...points[i],...normal,...rgb,...pick,b.plate?1:0];
   for(let i=1;i<face.length-1;i++)for(const j of [face[0],face[i],face[i+1]])triangles.push(...record(j));
   // Curved surfaces are shaded smoothly by their facets, without polygon seams.
   if(!b.shape)for(let i=0;i<face.length;i++){const a=face[i],z=face[(i+1)%face.length],key=[a,z].sort((a,b)=>a-b).join(':');if(seen.has(key))continue;seen.add(key);edges.push(...record(a),...record(z));}
  }
  if(b.label)labels.push({index,point:world([b.w/2,b.h/2,b.d]),text:b.label,width:b.w,plate:b.plate});
 });
 return {triangles:new Float32Array(triangles),edges:new Float32Array(edges),labels};
}
export function createGpuRenderer(boxes,center,extent){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!gl)return null;
 const resources=[];let destroyed=false,lost=false,pickReady=false,view;
 const vertex=`attribute vec3 position,normal,color,identity;attribute float plate;uniform vec2 angles,viewport,pan;uniform float scale,extent;varying vec3 rgb,pick,n;varying float hidden;
 void main(){float cy=cos(angles.x),sy=sin(angles.x),cp=cos(angles.y),sp=sin(angles.y);vec3 p=vec3(position.x*cy+position.z*sy,position.y,-position.x*sy+position.z*cy);p=vec3(p.x,p.y*cp-p.z*sp,p.y*sp+p.z*cp);gl_Position=vec4((p.x*scale+pan.x)*2.0/viewport.x,-(p.y*scale+pan.y)*2.0/viewport.y,-p.z/extent,1.0);rgb=color;pick=identity;n=normal;hidden=plate;}`;
 const fragment=`precision mediump float;varying vec3 rgb,pick,n;varying float hidden;uniform bool plates,picking,outline;
 void main(){if(!plates&&hidden>0.5)discard;if(picking){gl_FragColor=vec4(pick,1.0);return;}float light=0.68+0.32*abs(dot(normalize(n),normalize(vec3(-0.45,-0.65,1.0))));vec3 c=outline?mix(rgb,vec3(0.22,0.29,0.35),0.35):rgb*light;gl_FragColor=vec4(c,1.0);}`;
 function shader(type,src){const s=gl.createShader(type);resources.push(()=>gl.deleteShader(s));gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 try{
 const program=gl.createProgram();resources.push(()=>gl.deleteProgram(program));gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const data=prepareGeometry(boxes,center),buffers=[data.triangles,data.edges].map(values=>{const b=gl.createBuffer();resources.push(()=>gl.deleteBuffer(b));gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);return {buffer:b,count:values.length/13};}),uniforms=Object.fromEntries(['angles','viewport','pan','scale','extent','plates','picking','outline'].map(k=>[k,gl.getUniformLocation(program,k)])),attrs=['position','normal','color','identity','plate'].map(k=>gl.getAttribLocation(program,k));
 const fb=gl.createFramebuffer(),texture=gl.createTexture(),depth=gl.createRenderbuffer();resources.push(()=>gl.deleteFramebuffer(fb),()=>gl.deleteTexture(texture),()=>gl.deleteRenderbuffer(depth));let fw=0,fh=0;
 function bind(b){gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===4?1:3,gl.FLOAT,false,52,i*12);});}
 function camera(){gl.useProgram(program);gl.uniform2f(uniforms.angles,view.camera.yaw,view.camera.pitch);gl.uniform2f(uniforms.viewport,view.width,view.height);gl.uniform2f(uniforms.pan,...view.pan);gl.uniform1f(uniforms.scale,view.scale);gl.uniform1f(uniforms.extent,extent*3);gl.uniform1i(uniforms.plates,view.plates);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.viewport(0,0,canvas.width,canvas.height);}
 function paint(picking){camera();gl.uniform1i(uniforms.picking,picking);gl.uniform1i(uniforms.outline,false);gl.clearColor(picking?0:.949,picking?0:.961,picking?0:.973,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!picking){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);}bind(buffers[0]);gl.drawArrays(gl.TRIANGLES,0,buffers[0].count);gl.disable(gl.POLYGON_OFFSET_FILL);if(!picking){gl.uniform1i(uniforms.outline,true);bind(buffers[1]);gl.drawArrays(gl.LINES,0,buffers[1].count);}}
 function preparePick(){if(pickReady)return;gl.bindFramebuffer(gl.FRAMEBUFFER,fb);if(fw!==canvas.width||fh!==canvas.height){fw=canvas.width;fh=canvas.height;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,fw,fh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,fw,fh);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);}gl.disable(gl.DITHER);paint(true);gl.enable(gl.DITHER);pickReady=true;}
 const pixel=new Uint8Array(4);
 function hit(x,y){if(!view||destroyed||lost||x<0||y<0||x>=view.width||y>=view.height)return -1;preparePick();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.readPixels(Math.floor(x*canvas.width/view.width),canvas.height-1-Math.floor(y*canvas.height/view.height),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return pixel[0]+pixel[1]*256+pixel[2]*65536-1;}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});
 return {canvas,labels:data.labels,get lost(){return lost;},draw(next){if(destroyed||lost)return false;view=next;const dpr=Math.min(2,next.dpr||1),w=Math.max(1,Math.round(next.width*dpr)),h=Math.max(1,Math.round(next.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.bindFramebuffer(gl.FRAMEBUFFER,null);paint(false);pickReady=false;return true;},hit,destroy(){if(destroyed)return;destroyed=true;resources.reverse().forEach(f=>f());gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }catch{resources.reverse().forEach(f=>f());return null;}
}
