// Local raster evidence beside an OCR reference. This deliberately recognises
// only an unfilled rectangular relay coil, not arbitrary electrical symbols.
export function hasCoil(image,anchor,scale){
 const {data,width,height}=image;
 const dark=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&data[(y*width+x)*4]<130&&data[(y*width+x)*4+1]<130&&data[(y*width+x)*4+2]<130;
 const x0=Math.max(0,Math.floor((anchor.x+anchor.width)*scale)),x1=Math.min(width-1,Math.ceil((anchor.x+anchor.width+38)*scale));
 const y0=Math.max(0,Math.floor((anchor.y-16)*scale)),y1=Math.min(height-1,Math.ceil((anchor.y+10)*scale));
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
   if(total&&white/total>.94)return true;
  }
 }
 return false;
}
