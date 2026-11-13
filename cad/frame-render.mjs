import {plateStrips} from './frame-layout.mjs?v=20261113-11';
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function frameMarkup(e,w,h){
 const sx=w/e.width,sy=h/e.height,rect=(x,y,a,b,fill='white')=>`<rect x="${x*sx}" y="${y*sy}" width="${a*sx}" height="${b*sy}" fill="${fill}"/>`,line=(x,y,a,b)=>`<path d="M${x*sx} ${y*sy}L${a*sx} ${b*sy}"/>`;
 if(e.kind==='plate')return plateStrips(e.width,e.height,e.plateType).map(r=>rect(...r)).join('')+[[15,15],[e.width-15,15],[15,e.height-15],[e.width-15,e.height-15]].map(([x,y])=>`<circle cx="${x*sx}" cy="${y*sy}" r="${2*sx}" fill="#777"/>`).join('');
 if(e.profile==='EV165')return rect(0,0,e.width,8,'#bfc6cd')+rect(0,0,8,e.height,'#bfc6cd')+`<circle cx="${w*.65}" cy="${h*.12}" r="${2*sx}" fill="#666"/>`;
 if(e.profile){let out=rect(0,0,e.width,e.height,'#f1f3f5');if(e.height>e.width)return out+line(e.width*.3,0,e.width*.3,e.height)+line(e.width*.7,0,e.width*.7,e.height);out+=line(0,e.height*.2,e.width,e.height*.2)+line(0,e.height*.8,e.width,e.height*.8);if(['AS35','AS50','BS25'].includes(e.profile))for(let x=15;x<e.width-15;x+=35)out+=rect(x,e.height*.4,10,e.height*.2,'#9aa3aa');return out;}
 if(e.kind==='module'&&e.frameStyle==='recessed'){let out=rect(0,20,e.width,46,'#f1f2ef');for(let x=0;x<e.width-8;x+=18)out+=rect(x+3,25,Math.min(12,e.width-x-3),3,'#3b806c')+rect(x+4,43,Math.min(10,e.width-x-4),14,'#343a3d');return out;}
 if(e.kind==='module'&&e.dispoKind==='fuse'&&e.fuseType==='NH00')return rect(0,0,e.width,e.height,'#e7e7e3')+rect(10,8,e.width-20,e.height-16,'#aab1b6');
 if(e.kind==='module'&&e.dispoKind==='fuse'){let out='';for(let i=0;i<3;i++){const cy=(30+i*80)*sy,r=(e.fuseType==='DIII'?23:19)*sx;out+=rect(3,i*80,e.width-6,60)+`<circle cx="${w/2}" cy="${cy}" r="${r}" fill="#e5e8eb"/><circle cx="${w/2}" cy="${cy}" r="${r*.62}" fill="white"/>`; }return out+`<text x="${w/2}" y="${h+9}" text-anchor="middle" font-size="7">${esc(e.fuseType||'?')} ${e.current||'?'} A</text>`;}
 if(e.kind==='module'&&e.dispoKind==='meter')return rect(0,0,e.width,e.height)+rect(15,35,e.width-30,60,'#e2ebee')+rect(12,e.height-45,e.width-24,45,'#f1f3f5')+`<text x="${w/2}" y="${h*.55}" text-anchor="middle" font-size="9">kWh</text><text x="${w/2}" y="${h+12}" text-anchor="middle" font-size="8">${esc(e.circuitName)}</text>`;
 return null;
}
export function frameBoxes(e,x,y,add){
 const w=e.width,h=e.height,z=e.mountZ??0,d=e.depth||3,al='#bfc6cd';
 if(e.kind==='plate'){for(const [a,b,c,f] of plateStrips(w,h,e.plateType))add(e,x+a,y+b,z,c,f,d,'#e3e5e7');for(const a of [15,w-15])for(const b of [15,h-15])add(e,x+a-2,y+b-2,z+d,4,4,2,'#6e7780');return true;}
 if(e.profile==='comb'){add(e,x,y,z,w,h,6,'#ece7d8');for(let xx=4;xx<w-3;xx+=18)add(e,x+xx,y-10,z,3,10,3,'#b67848');return true;}
 if(e.profile==='copper'){add(e,x,y,z,w,h,d,'#b67848');return true;}
 if(e.kind==='duct'){add(e,x,y,z,w,h,3,'#bfc1bb');add(e,x,y,z,w,3,d,'#d8d9d3');add(e,x,y+h-3,z,w,3,d,'#d8d9d3');for(let xx=0;xx<w;xx+=14){add(e,x+xx,y,z+3,7,6,d-3,'#d8d9d3');add(e,x+xx,y+h-6,z+3,7,6,d-3,'#d8d9d3');}return true;}
 if(e.kind==='module'&&e.dispoKind==='terminal'){const pitch=8;for(let xx=0;xx<w;xx+=pitch){const color=xx>w-17?'#3186b8':'#b4b8ae';add(e,x+xx,y,z,Math.min(pitch-1,w-xx),h,d,color);add({...e,tag:''},x+xx+2,y+12,z+d,3,5,1,'#333c44');add({...e,tag:''},x+xx+2,y+h-17,z+d,3,5,1,'#333c44');}return true;}
 if(e.kind==='module'&&e.dispoKind==='meter'&&e.meterState==='prepared'){
  // The plug terminals and mounting bridge are attached to the removable meter plate.
  const cx=x+w/2,part={...e,tag:''};add(part,cx-9,y+5,4,18,h-25,5,al);
  for(let yy=15;yy<h-30;yy+=30)add({...e,tag:''},cx-3,y+yy,9,6,8,1,'#596269');
  add(part,x-10,y+h-30,5,w+20,15,8,al);
  add(part,x+5,y+h+2,-12,w-10,32,38,'#e5e4da');
  for(let xx=15;xx<w-10;xx+=18){add({...e,tag:''},x+xx,y+h+8,26,7,7,1,'#5b625e');add({...e,tag:''},x+xx,y+h+22,26,7,7,1,'#5b625e');}
  add(e,x+w-70,y-23,5,65,15,4,'#f6f6ef');return true;
 }
 if(e.profile==='EV165'){add(e,x,y,z,w,5,d,al);add(e,x,y,z,5,h,d,al);for(const zz of [20,120])add(e,x+15,y-2,z+zz,7,7,7,'#727c86');return true;}
 if(['SP45','SP09048'].includes(e.profile)){add(e,x,y,z,w,2,d,al);add(e,x,y,z,w,h,2,al);add(e,x,y,z+d-2,w,h,2,al);if(e.profile==='SP09048')add(e,x,y-8,z+d-7,w,8,3,al);return true;}
 if(e.kind==='module'&&e.frameStyle==='recessed'){add(e,x,y,z,w,h,Math.max(1,d-8),'#dce0e3');add(e,x,y+20,0,w,46,8,'#f1f2ef');for(let xx=0;xx<w-8;xx+=18){add({...e,tag:''},x+xx+3,y+25,8,Math.min(12,w-xx-3),3,1,'#3b806c');add({...e,tag:''},x+xx+4,y+43,8,Math.min(10,w-xx-4),14,6,'#343a3d');}return true;}
 if(e.profile){if(e.profile==='SP165'){add(e,x,y,z,w,h,165,al);for(const zz of [0,45,95,150])add(e,e.frameStyle==='right'?x+w-25:x,y,z+zz,25,h,2,'#aab4be');}else{add(e,x,y,z,w,h,2,al);add(e,x,y,z,w,2,d,al);add(e,x,y+h-2,z,w,2,d,al);if(e.profile==='AS50')for(let xx=10;xx<w-10;xx+=30){add(e,x+xx,y-5,z,6,5,2,al);add(e,x+xx,y+h,z,6,5,2,al);}}return true;}
 if(e.kind==='module'&&e.dispoKind==='fuse'&&e.fuseType==='NH00'){add(e,x,y,z,w,h,20,'#e1e1df');add(e,x+10,y+8,z+20,w-20,h-16,30,'#a8b0b8');return true;}
 if(e.kind==='module'&&e.dispoKind==='fuse'){for(let i=0;i<3;i++){const cy=y+30+i*80,r=e.fuseType==='DIII'?23:19;add(e,x+3,y+i*80,z,w-6,60,20,'#e1e1df');add({...e,shape:'cylinder',tag:''},x+w/2-r,cy-r,z+20,2*r,2*r,25,'#dfded4');add({...e,shape:'cylinder',tag:''},x+w/2-r*.6,cy-r*.6,z+45,r*1.2,r*1.2,2,'#a0a49f');add({...e,shape:'cylinder',tag:''},x+w/2-5,cy-5,z+47,10,10,2,'#72766f');}return true;}
 return false;
}
