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
export function sbrSnapshot(template,width,height,counts){
 const c=configureSbr(template,width,height,counts);
 return {article:template.article,name:template.name+' · '+c.width+' × '+c.height+' mm\n'+c.rows.filter(p=>p.count).map(p=>p.count+' × '+p.name+' ('+(p.direction==='quer'?'quer':'längs')+', '+p.lengthMm+' mm)').join('\n'),unit:'Stk.',price:c.price,minutes:template.minutes??0,rate:template.rate??null,type:SBR,sbr:{template:{article:template.article,name:template.name,profiles:profiles(template.profiles),minutes:template.minutes??0,rate:template.rate??null,type:SBR},width:c.width,height:c.height,counts:c.rows.map(p=>p.count)}};
}
export function restoreSbr(s){if(!s||!s.template)return undefined;const c=sbrSnapshot(s.template,s.width,s.height,s.counts);return c.sbr;}
