// Shared form rules. The server supplies the signing time, author and company snapshot.
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const str=(v,max=200)=>{if(typeof v!=='string'||v.length>max)error('Text fehlt oder ist zu lang.');return v.trim();};
const num=(v,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)error('Mengen, Kilometer und Zeiten müssen gültige positive Zahlen sein.');return v;};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)error('Bitte ein gültiges Datum eintragen.');return v;};
const list=v=>{if(!Array.isArray(v)||v.length>200)error('Maximal 200 Positionen pro Tabelle.');if(v.some(x=>!x||typeof x!=='object'||Array.isArray(x)))error('Eine Position ist ungültig.');return v;};
const canonical=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
export const reportIsSigned=r=>['signed','invoiced'].includes(r?.status);
export const reportTotals=r=>({hours:r.work.reduce((s,x)=>s+x.hours,0),km:r.km,travelHours:r.travelHours,expenses:r.expenses});
export function signaturePaths(value){
 if(!Array.isArray(value)||value.length>200)error('Unterschrift ist ungültig.');let points=0,distance=0;
 const paths=value.map(path=>{if(!Array.isArray(path)||path.length<1)error('Unterschrift ist ungültig.');points+=path.length;if(points>15000)error('Unterschrift ist zu gross. Bitte erneut zeichnen.');return path.map((p,i)=>{if(!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1))error('Unterschrift ist ungültig.');if(i)distance+=Math.hypot(p[0]-path[i-1][0],p[1]-path[i-1][1]);return [...p];});});
 if(points<3||distance<.04)error('Bitte auf der Unterschriftsfläche unterschreiben.');return paths;
}
export function validateReport(value,{previous=null,author='',company={},now=new Date().toISOString()}={}){
 if(!value||typeof value!=='object'||Array.isArray(value))error('Rapport fehlt.');
 if(reportIsSigned(previous)){
  if(!reportIsSigned(value)||canonical({...value,status:previous.status})!==canonical(previous))error('Dieser Rapport ist unterschrieben. Für Änderungen eine neue Kopie erstellen und erneut unterschreiben lassen.',409);
  return {...previous,status:value.status};
 }
 if(!['draft','signed'].includes(value.status))error('Ungültiger Rapportstatus.');
 if(typeof value.completed!=='boolean')error('Bitte den Stand der Arbeiten angeben.');
 const r={version:1,status:value.status,number:str(value.number,80),date:date(value.date),customer:str(value.customer),customerAddress:str(value.customerAddress,600),contact:str(value.contact),location:str(value.location,600),project:str(value.project),employee:str(value.employee),km:num(value.km,100000),travelHours:num(value.travelHours,1000),expenses:num(value.expenses,1000000),completed:value.completed===true,notes:str(value.notes,5000),work:list(value.work).map(x=>({date:date(x.date),employee:str(x.employee),activity:str(x.activity,4000),hours:num(x.hours,24)})),materials:list(value.materials).map(x=>({article:str(x.article,100),description:str(x.description,600),quantity:num(x.quantity,1000000),unit:str(x.unit,30)}))};
 if(r.status==='signed'){
  if(!r.number||!r.customer||!r.location)error('Rapportnummer, Kunde und Einsatzort sind für die Unterschrift erforderlich.');
  if(!r.work.length||r.work.some(x=>!x.activity||!x.employee||x.hours<=0))error('Bitte Tätigkeiten, Mitarbeitende und Arbeitsstunden vollständig eintragen.');
  if(r.materials.some(x=>!x.description||x.quantity<=0||!x.unit))error('Bitte Materialbezeichnung, Menge und Einheit vollständig eintragen.');
  const name=str(value.signature?.name),place=str(value.signature?.place);
  if(!name||!place)error('Name und Ort der Kundenbestätigung fehlen.');
  const aspectRatio=num(value.signature.aspectRatio??700/220,8);if(aspectRatio<.5)error('Ungültiges Format der Unterschrift.');
  r.signature={name,place,paths:signaturePaths(value.signature.paths),aspectRatio,signedAt:now,recordedBy:author};r.company={...company};
 }
 return r;
}
