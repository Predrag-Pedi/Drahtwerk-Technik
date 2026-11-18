import {plateOpenings} from './frame-layout.mjs?v=20261118-4';

// Front view with the door open: the enclosure surrounds a separate interior.
// Dimensions here are the same millimetres used by the assembly and 3D model.
export function cabinetShell(e,f){
 const w=e.width*f,h=e.height*f,base=(e.plinthHeight||0)*f,body=h-base,jamb=20*f;
 let out=`<g class="cabinet-shell" data-enclosure="${e.frameStyle==='almatec-an'?'standing':'wall'}" stroke-width=".6"><rect width="${w}" height="${body}" fill="#e3e7eb"/><rect x="${jamb}" y="${jamb}" width="${w-2*jamb}" height="${body-2*jamb}" fill="white"/>`;
 // The hinge-side flange belongs to the enclosure, including without a plinth.
 for(const y of [160,920,1680])if((y+70)*f<body)out+=`<rect x="${3*f}" y="${y*f}" width="${12*f}" height="${70*f}" fill="#b9c1c8"/>`;
 if(base)out+=`<rect y="${body}" width="${w}" height="${base}" fill="#d4dae0"/><path d="M${12*f} ${body}V${h}M${w-12*f} ${body}V${h}"/>`;
 return out+'</g>';
}

export function cabinetPanels(e,f){
 const parts=e.dispoStructure||[],rect=(x,y,w,h,fill)=>`<rect x="${x*f}" y="${y*f}" width="${w*f}" height="${h*f}" fill="${fill}"/>`;
 let out='<g class="cabinet-panels" stroke="#677583" stroke-width=".4">';
 for(const p of parts.filter(p=>p.kind==='plate'&&p.plateType!=='blank'&&p.plateType!=='rear')){
  out+=rect(p.x,p.y,p.width,p.height,'white');
  if(p.plateType==='slots')for(const y of p.height===525?[60,185,310,435]:p.height>=400?[60,185,310]:[60])for(const a of plateOpenings(p.width,p.cutCenterBridge))out+=rect(p.x+a.x,p.y+y,a.width,46,'#dce1e5');
 }
 return out+'</g>';
}
