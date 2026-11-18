import {cabinetField,ralColors} from './cabinet-options.mjs?v=20261118-7';
import {plateOpenings} from './frame-layout.mjs?v=20261118-7';

// Front view with the door open: the enclosure surrounds a separate interior.
// Dimensions here are the same millimetres used by the assembly and 3D model.
export function cabinetShell(e,f){
 const w=e.width*f,h=e.height*f,base=(e.plinthHeight||0)*f,body=h-base,jamb=20*f;
 const options=e.cabinetOptions,field=cabinetField(options),color=ralColors[options?.ral||'7035'][1];
 let out=`<g class="cabinet-shell" data-enclosure="${e.frameStyle==='almatec-an'?'standing':'wall'}" stroke-width=".6"><rect width="${w}" height="${body}" fill="${color}"/><rect x="${jamb}" y="${jamb}" width="${w-2*jamb}" height="${body-2*jamb}" fill="white"/>`;
 // The hinge-side flange belongs to the enclosure, including without a plinth.
 if(field.door)for(const side of field.wings==='2-flüglig'?['Links','Rechts']:[field.hinge])for(const y of [body*.12,body*.5,body*.85])out+=`<rect x="${side==='Links'?3*f:w-15*f}" y="${y}" width="${12*f}" height="${Math.min(70*f,body*.05)}" fill="#9ca6ae"/>`;
 if(base)out+=`<rect y="${body}" width="${w}" height="${base}" fill="#111111"/><path d="M${12*f} ${body}V${h}M${w-12*f} ${body}V${h}"/>`;
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
