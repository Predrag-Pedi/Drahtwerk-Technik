export const SBR='SBR – Dynamisch';
export const isSbr=a=>a?.type===SBR;
const numeric=v=>typeof v==='number'?v:Number(String(v??'').trim().replace(',','.'));
function positive(v,label,zero=false){const n=numeric(v);if(v===''||v==null||!Number.isFinite(n)||(zero?n<0:n<=0))throw Error(label+' ist ungültig.');return n;}
export function profiles(raw){if(!Array.isArray(raw)||!raw.length||raw.length>200)throw Error('Mindestens ein Profil hinzufügen (maximal 200).');return raw.map(p=>{if(!p.name||!['quer','laengs'].includes(p.direction))throw Error('Profil und Ausrichtung auswählen.');return {article:String(p.article||''),name:String(p.name),direction:p.direction,pricePerM:positive(p.pricePerM,'Meterpreis',true)};});}
export function configureSbr(template,width,height,counts){
 const parts=profiles(template.profiles),w=positive(width,'Breite'),h=positive(height,'Höhe');
 if(!Array.isArray(counts)||counts.length!==parts.length)throw Error('Anzahl für jedes Profil angeben.');
 const rows=parts.map((p,i)=>{const count=positive(counts[i],'Profilanzahl',true);if(!Number.isInteger(count))throw Error('Profilanzahl muss ganzzahlig sein.');const lengthMm=p.direction==='quer'?w:h;return {...p,count,lengthMm,totalMeters:lengthMm*count/1000,total:lengthMm*count/1000*p.pricePerM};});
 if(!rows.some(p=>p.count>0))throw Error('Mindestens ein Profil muss verwendet werden.');
 const price=Math.round((rows.reduce((sum,p)=>sum+p.total,0)+Number.EPSILON)*100)/100;
 if(!Number.isFinite(price)||price>1e12)throw Error('Rahmenpreis ist zu gross.');
 return {width:w,height:h,rows,price};
}
export const ENDS=['Geschlossen','Kabeleinführung mit PVC abgedeckt','Moosgummi'];
export const PVC=['Transparent','Hellgrau'];
function finish(options={}){
 const result={};
 if(options.depth!=null)result.depth=positive(options.depth,'Tiefe');
 for(const [key,values] of [['top',ENDS],['bottom',ENDS],['pvc',PVC]])if(options[key]!=null){if(!values.includes(options[key]))throw Error('Ungültige SBR-Ausführung.');result[key]=options[key];}
 return result;
}
export function sbrDescription(s){
 const dimensions=[s.width,s.height,...(s.depth!=null?[s.depth]:[])].join(' × ');
 return [s.template.name+' · '+dimensions+' mm'+(s.depth!=null?' (B × H × T)':' (B × H)'),s.top?'Oben: '+s.top:'',s.bottom?'Unten: '+s.bottom:'',s.pvc?'PVC-Platte: '+s.pvc:''].filter(Boolean).join('\n');
}
export const offerItemName=i=>typeof i.offerDescription==='string'?i.offerDescription:i.sbr?sbrDescription(i.sbr):i.name;
export function sbrSnapshot(template,width,height,counts,options={}){
 const c=configureSbr(template,width,height,counts);
 const minutes=positive(options.minutes??template.minutes??0,'Bauzeit',true);
 const sbr={template:{article:template.article,name:template.name,profiles:profiles(template.profiles),minutes,rate:template.rate??null,type:SBR},width:c.width,height:c.height,counts:c.rows.map(p=>p.count),...finish(options)};
 return {article:template.article,name:sbrDescription(sbr),unit:'Stk.',price:c.price,minutes,rate:template.rate??null,type:SBR,sbr};
}
export function restoreSbr(s){if(!s||!s.template)return undefined;return sbrSnapshot(s.template,s.width,s.height,s.counts,s).sbr;}
