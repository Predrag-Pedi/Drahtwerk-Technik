// Raster evidence for unfilled rectangular relay coils and clock faces.
// The full-page scan does not depend on a successfully recognised reference.
function scanSymbols(image,scale,bounds){
 const {data,width,height}=image;
 const dark=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&data[(y*width+x)*4]<130&&data[(y*width+x)*4+1]<130&&data[(y*width+x)*4+2]<130;
 const {x0,x1,y0,y1}=bounds,found=[];
 const minW=Math.floor(10*scale),maxW=Math.ceil(32*scale),minH=Math.floor(4*scale),maxH=Math.ceil(14*scale);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  if(!dark(x,y)||dark(x-1,y))continue;
  let end=x;while(end+1<width&&dark(end+1,y)&&end-x<=maxW)end++;
  const w=end-x;if(w<minW||w>maxW)continue;
  for(let h=minH;h<=maxH&&y+h<height;h++){
   let bottom=0,sides=0,white=0,total=0;
   for(let j=x;j<=end;j++)bottom+=dark(j,y+h)?1:0;
   if(bottom/(w+1)<.94)continue;
   for(let j=y;j<=y+h;j++)sides+=(dark(x,j)||dark(x+1,j)?1:0)+(dark(end,j)||dark(end-1,j)?1:0);
   if(sides/(2*(h+1))<.9)continue;
   const inset=Math.max(2,Math.ceil(scale));
   for(let yy=y+inset;yy<y+h-inset;yy+=2)for(let xx=x+inset;xx<end-inset;xx+=2){total++;if(!dark(xx,yy))white++;}
   if(total&&white/total>.985){found.push({x,y,w,h,kind:'coil'});break;}
   // Clock face inside the relay rectangle: circular rim plus a hand from
   // its centre. An arbitrary filled coil/text rectangle is not a clock.
   if(w/h<1.2||w/h>2.5)continue;
   const near=(px,py)=>{for(let yy=Math.round(py)-1;yy<=Math.round(py)+1;yy++)for(let xx=Math.round(px)-1;xx<=Math.round(px)+1;xx++)if(dark(xx,yy))return true;return false;};
   for(const radius of [.38,.42,.46].map(f=>h*f))for(const cx of [x+h*.5,x+h*.58,x+h*.65]){
    const cy=y+h/2;let rim=0,hand=0;
    for(let a=0;a<32;a++){const angle=a*Math.PI/16;if(near(cx+radius*Math.cos(angle),cy+radius*Math.sin(angle)))rim++;}
    for(let step=1;step<=6;step++)if(near(cx,cy-radius*step/7))hand++;
    if(rim>=29&&hand>=5){found.push({x,y,w,h,kind:'clock'});break;}
   }
  }
 }
 return found.filter((r,i)=>!found.slice(0,i).some(p=>Math.abs(p.x-r.x)<3*scale&&Math.abs(p.y-r.y)<3*scale));
}
export function detectRelaySymbol(image,anchor,scale){
 const x0=Math.max(0,Math.floor((anchor.x+anchor.width)*scale)),x1=Math.min(image.width-1,Math.ceil((anchor.x+anchor.width+38)*scale));
 const y0=Math.max(0,Math.floor((anchor.y-16)*scale)),y1=Math.min(image.height-1,Math.ceil((anchor.y+10)*scale));
 return scanSymbols(image,scale,{x0,x1,y0,y1})[0]?.kind||null;
}
export function findRelaySymbols(image,scale){
 return scanSymbols(image,scale,{x0:Math.round(image.width*.025),x1:Math.round(image.width*.97),y0:Math.round(image.height*.08),y1:Math.round(image.height*.85)});
}

export function hasCoil(image,anchor,scale){return detectRelaySymbol(image,anchor,scale)==='coil';}

// Count the incoming conductors immediately above a protective-device label.
// Only a compact group of 2–4 wires is usable; separated adjacent circuits
// and isolated strokes do not establish a pole count.
export function protectivePoles(image,a,scale){
 const {data,width,height}=image,dark=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&data[(y*width+x)*4]<130&&data[(y*width+x)*4+1]<130&&data[(y*width+x)*4+2]<130;
 const left=Math.ceil((a.x+a.width+2)*scale),right=Math.min(width-1,Math.ceil((a.x+a.width+115)*scale));
 const top=Math.max(0,Math.floor((a.y-40)*scale)),bottom=Math.floor((a.y-10)*scale);if(bottom<=top)return '';
 const xs=[];let run=-1;
 for(let x=left;x<=right;x++){let n=0;for(let y=top;y<bottom;y++)if(dark(x,y))n++;if(n/(bottom-top)>.32){if(run<0)run=x;}else if(run>=0){xs.push((run+x-1)/2/scale);run=-1;}}
 const wires=xs.filter((x,i)=>!i||x-xs[i-1]>2);if(!wires.length||wires[0]-a.x-a.width>40)return '';
 const group=[wires[0]];for(const x of wires.slice(1)){const gap=x-group.at(-1);if(gap<5||gap>25)break;group.push(x);}
 return group.length===2?'LN':[3,4].includes(group.length)?'3LN':'';
}
