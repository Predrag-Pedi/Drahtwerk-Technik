export function imagePdf(pages){
 const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 const push=x=>{const b=typeof x==='string'?enc.encode(x):x;chunks.push(b);length+=b.length;};
 const obj=(n,body)=>{offsets[n]=length;push(n+' 0 obj\n');body();push('\nendobj\n');};
 const width=1190.55,height=841.89;let next=3+pages.length*3;
 const annotations=pages.map(p=>(p.links||[]).filter(l=>Number.isInteger(l.target)&&l.target>=0&&l.target<pages.length&&['x','y','width','height'].every(k=>Number.isFinite(l[k]))&&l.width>0&&l.height>0&&l.x>=0&&l.y>=0&&l.x+l.width<=1.000001&&l.y+l.height<=1.000001).map(l=>({...l,id:next++})));
 push('%PDF-1.4\n');
 obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));
 obj(2,()=>push('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
 pages.forEach((page,i)=>{
  const n=3+i*3,links=annotations[i];
  obj(n,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im ${n+1} 0 R >> >> /Contents ${n+2} 0 R${links.length?' /Annots ['+links.map(l=>l.id+' 0 R').join(' ')+']':''} >>`));
  obj(n+1,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);push(page.bytes);push('\nendstream');});
  obj(n+2,()=>{const stream=`q ${width} 0 0 ${height} 0 0 cm /Im Do Q`;push('<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'\nendstream');});
 });
 for(const l of annotations.flat())obj(l.id,()=>{
  const rect=[l.x*width,(1-l.y-l.height)*height,(l.x+l.width)*width,(1-l.y)*height].map(n=>n.toFixed(3)).join(' ');
  push(`<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /Dest [${3+l.target*3} 0 R /Fit] >>`);
 });
 const xref=length;push('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
 for(const offset of offsets.slice(1))push(String(offset).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');return new Blob(chunks,{type:'application/pdf'});
}
