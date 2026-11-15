// Read hit boxes from the same SVG that is rasterised, including nested
// template transforms, rotated BMKs and the actual rendered font metrics.
export function svgPdfLinks(svgText,pages,documentRef=document){
 const host=documentRef.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
 host.innerHTML=svgText;documentRef.body.append(host);
 try{const svg=host.querySelector('svg'),root=svg.getScreenCTM().inverse(),links=[];
  for(const node of svg.querySelectorAll('[data-pdf-page]')){
   const target=pages.findIndex(p=>p.id===node.getAttribute('data-pdf-page'));if(target<0)continue;
   const b=node.getBBox(),m=root.multiply(node.getScreenCTM());
   const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
   const x=Math.max(0,Math.min(...points.map(p=>p.x))-3),y=Math.max(0,Math.min(...points.map(p=>p.y))-3);
   const right=Math.min(svg.viewBox.baseVal.width,Math.max(...points.map(p=>p.x))+3),bottom=Math.min(svg.viewBox.baseVal.height,Math.max(...points.map(p=>p.y))+3);
   if(right>x&&bottom>y)links.push({target,x:x/svg.viewBox.baseVal.width,y:y/svg.viewBox.baseVal.height,width:(right-x)/svg.viewBox.baseVal.width,height:(bottom-y)/svg.viewBox.baseVal.height});
  }return links;
 }finally{host.remove();}
}
