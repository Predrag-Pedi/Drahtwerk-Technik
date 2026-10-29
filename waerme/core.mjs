import {confirmedDrawingDevices} from './confirmed.mjs?v=20261029-6';
import {reserveStatus} from './drawing.mjs?v=20261029-6';
// Pure calculations and conservative text extraction. No network or document state.
export const SHEETS={fine:'Pv Feinab.,Steuer.,Mess.',supply:'PV Zul.,Speis.,BezSich.,Grobab.',sbr:'max. Pv  TAL, MT',ars:'max. Pv  ARS,AL,GZK',project:'Projektdaten'};
export function maxPv(type,b,h,t,get){
  if (![b,h,t].every(x=>Number.isFinite(x)&&x>0)) return null;
  const s=type==='SBR', sheet=s?SHEETS.sbr:SHEETS.ars;
  const n=(a)=>{const v=get(sheet,a);if(typeof v!=='number')throw Error('Vorlagenwert fehlt: '+sheet+'!'+a);return v;};
  const area=s?2*h*t/1e6+2*b*t/1e6:(2*b*h+2*t*h+b*t)/1e6;
  const panel=s?b*h/1e6:b*t/1e6,dt=s?n('H8')-n('H9'):n('H9')-n('H10');
  const conduction=s?(n('B14')*area+(n('B15')+n('B16'))*panel)*dt:(n('B15')*area+(n('B16')+n('B17'))*panel)*dt;
  const radiation=n(s?'G21':'G22')*5.67e-8*panel*dt**4*1000*(s?panel:area);
  const convection=s?(12*Math.sqrt(n('F18'))+2)*(b*t/1e6)*dt:n('B19');
  return conduction+radiation+convection;
}
export const DEVICE_KINDS=[['FILS','FI/LS'],['LS','LS'],['FI','FI'],['SPD','SPD 4-polig'],['MAIN','Hauptschalter'],['CONTROL','Steuerschalter H–0–A'],['FUSE','Schmelzsicherung'],['NH','NH-Element'],['METER','Privatzähler'],['CLOCK','Schaltuhr'],['TWILIGHT','Dämmerungsschalter'],['TIMER','Minuterie/Zeitrelais'],['CONTACTOR','Schütz/Relais'],['OTHER','Andere']];
export function classify(label,section=''){
  const text=String(label), all=text+' '+section;
  return {kind:/Steuer-Schalter/i.test(text)?'CONTROL':/DIII? Element/i.test(text)?'FUSE':/NH.*Element|NH - Element/i.test(text)?'NH':/LTS|Dilos|modularer Ausschalter/i.test(text)?'MAIN':/Dämmerungs/i.test(text)?'TWILIGHT':/Schaltuhr|Analoguhr/i.test(text)?'CLOCK':/Privatzähler/i.test(text)?'METER':/Minuterie|Treppenlicht|Monof.relais|Zweif.relais|Multif.relais/i.test(text)?'TIMER':/schütz|Hilfsrelais/i.test(text)?'CONTACTOR':/FI\s*-?\s*Leitung|FI.?LS/i.test(text)?'FILS':/Leitungsschutz|\bLS\b/i.test(text)?'LS':/^FI\s/i.test(text)?'FI':'OTHER',
    system:/smissline/i.test(section)?'smissline':'hager',poles:/3LN|3\s*\+\s*N|4.pol/i.test(text)?'3LN':/\bLN\b|1\s*\+\s*N/i.test(text)?'LN':'',
    amp:Number(text.match(/(\d+)\s*A(?:\b|\/)/)?.[1])||null,ma:Number(text.match(/(\d+)\s*mA/i)?.[1])||null,
    special:/\bHI\b|kurzz|kurzzeit|Typ B/i.test(all)};
}
export function candidates(d,catalog){
 if(d.kind==='SPD')return catalog.filter(c=>c.kind==='SPD'&&c.poles==='4P');
 if(['FILS','LS','FI'].includes(d.kind))return catalog.filter(c=>c.kind===d.kind&&c.system===d.system&&c.amp===d.amp&&(!d.poles||c.poles===d.poles)&&(!d.ma||c.ma===d.ma)&&!c.special);
 let cs=catalog.filter(c=>c.kind===d.kind);
 if(d.kind==='CONTACTOR')return cs.filter(c=>/^ESC[24](?:25|40|63)S$/.test(c.code.trim()));
 if(['FUSE','NH','MAIN'].includes(d.kind)){
  if(!d.amp)return [];
  if(d.kind==='FUSE'){cs=cs.filter(c=>d.amp<=25?/^DII Element/.test(c.label):/^DIII Element/.test(c.label));const fine=cs.filter(c=>c.sheet===SHEETS.fine);if(fine.length)cs=fine;}
  if(d.poles)cs=cs.filter(c=>c.poles===d.poles);
  cs=cs.filter(c=>c.amp>=d.amp);const next=Math.min(...cs.map(c=>c.amp));cs=cs.filter(c=>c.amp===next);
 }
 return cs;
}
export function suggestArticle(d,catalog){
 const cs=candidates(d,catalog);
 if(d.kind==='CONTACTOR'){const amp=d.amp>0?d.amp:25,rating=[25,40,63].find(a=>a>=amp);const contacts=(d.poles==='2S'||d.poles!=='4S'&&d.contacts==='2S')?'2':'4';return cs.find(c=>c.code.trim()===`ESC${contacts}${rating}S`);}
 if(d.kind==='CONTROL')return cs.find(c=>/Schrack/i.test(c.label)&&/H\s*-\s*0\s*-\s*A/i.test(c.label));
 if(d.kind==='OTHER')return undefined;
 return middleLossArticle(cs);
}
// Choose an existing article at the median of distinct loss values; never manufacture a Watt value.
export function middleLossArticle(cs){
 const usable=cs.filter(c=>Number.isFinite(c.pv)),values=[...new Set(usable.map(c=>c.pv))].sort((a,b)=>a-b);
 if(!values.length)return undefined;
 const mid=(values[Math.floor((values.length-1)/2)]+values[Math.ceil((values.length-1)/2)])/2;
 return usable.toSorted((a,b)=>Math.abs(a.pv-mid)-Math.abs(b.pv-mid)||b.pv-a.pv||String(a.id||a.code||'').localeCompare(String(b.id||b.code||'')))[0];
}

export function spdLoss(d){const value=d.manualLoss??5;if(!Number.isFinite(value)||value<0)throw Error('Ungültige SPD-Verlustleistung: '+d.ref);return value;}
// Associate short equipment labels spatially, without treating a whole page's title as a device label.
function equipmentLabels(page,ref){
 const items=page.items||[],refs=items.filter(x=>/^[-+]?\d*[FSPKYQ]\d+(?:\.\d+)*$/.test(x.str.trim()));
 const point=x=>({x:x.x+(x.width||0)/2,y:x.y});
 return items.filter(x=>/^(?:RS\s*485|RSE|NKE|ZFA|Res\.|Reserve)$/i.test(x.str.trim())).filter(x=>{
  const p=point(x),near=refs.map(r=>({r,d:Math.hypot(p.x-point(r).x,p.y-r.y)})).sort((a,b)=>a.d-b.d);
  return near[0]?.d<65&&near[0].r.str.trim()===ref;
 }).map(x=>x.str).join(' ');
}
export function parsePages(pages){
  const result={devices:[],warnings:[],dimensions:[],currents:[],project:{},ignored:[]};
  const seen=new Set();
  // Confirmed by the user from the supplied symbol-only drawings; never apply to another project.
  const sourceText=pages.map(p=>p.text).join('\n');
  const confirmed=/abelia/i.test(pages.map(p=>p.file).join(' '))&&['10S2','13F2.1','60P3','61K7'].every(ref=>sourceText.split('\n').includes(ref))?{
   '11F6':{kind:'FUSE',amp:10,poles:'LN'},'12F4':{kind:'FUSE',amp:13,poles:'3LN'},
   '13F2.1':{kind:'NH',amp:160,poles:'3LN',referenceCode:'S00(0) u.ä'},'13F4.1':{kind:'FUSE',amp:13,poles:'3LN'},
   '15F2':{kind:'FUSE',amp:25,poles:'3LN'},'22Y3':{kind:'METER'},
   '60P3':{kind:'CLOCK'},'60P5':{kind:'CLOCK'},'60K6':{kind:'TWILIGHT'},
   '60K8':{kind:'TIMER',referenceCode:'TLA-1/230'},'61K5':{kind:'TIMER',referenceCode:'TLA-1/230'},
   '61K7':{kind:'CONTACTOR'}
  }:{};
  for(const page of pages){
    let lines=page.text.split('\n').flatMap(s=>{const m=s.trim().match(/^([-+]?\d+[FSPKYQAG]\d+(?:\.\d+)*[A-Za-z]?)\s+(.+)$/);return m?[m[1],m[2]]:[s.trim()];}).filter(Boolean),text=lines.join('\n'), source=page.file+' · PDF-Seite '+page.number;
    if(/Anschluss-?\s*und\s*Umgebungsbedingungen/i.test(text)){result.ignored.push(source);continue;}
    if(/Symbolverzeichnis|Allgemeine Hinweise|Inhaltsverzeichnis|Deckblatt/i.test(text))continue;
    const dims=[...text.matchAll(/B\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*H\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*T\s*(\d+(?:[.,]\d+)?)\s*mm/gi)];
    for(const d of dims)result.dimensions.push({b:+d[1].replace(',','.'),h:+d[2].replace(',','.'),t:+d[3].replace(',','.'),source});
    if(/Alu[ -]Selbstbaurahmen/i.test(text))result.project.type='SBR';
    const order=text.match(/\bAU-\d+\b/);if(order)result.project.order=order[0];
    const schema=text.match(/\bS-\d+\b/);if(schema)result.project.schema=schema[0];
    if(/\bUnterverteilung\b/.test(text))result.project.name='Unterverteilung';
    if(page.number===1){const body=text.slice(Math.max(text.indexOf('ELEKTROSCHEMA'),text.indexOf('Objekt:')));const city=body.match(/([A-ZÄÖÜ][a-zäöüéè]+)\s*\n\s*\d{4}\b/)||body.match(/\b\d{4}\s+([A-ZÄÖÜ][a-zäöüéè]+(?:[ -][A-ZÄÖÜ][a-zäöü]+)?)/);if(city)result.project.city=city[1];const reversed=[...body.matchAll(/([A-ZÄÖÜ][a-zäöüéè]+)\s*\n\s*\d{4}\b/g)];if(reversed.length)result.project.city=reversed.at(-1)[1];}
    for(const m of text.matchAll(/(?:Zuleitung[^\n]*|Hauptschalter)\s+(\d+)\s*A\b/gi))result.currents.push({amp:+m[1],source});
    if(/\bDispo\b|Disposition/i.test(text)){result.warnings.push(source+': Dispo liefert Masse und Aufbau. Gerätebilder bitte mit dem Schema abgleichen oder manuell ergänzen.');continue;}
    if(page.ocr){result.warnings.push(source+': Mit Texterkennung gelesen. Kennzeichen, Nennstrom und Vollständigkeit prüfen.');lines=(page.ocrDeviceText||'').split('\n').filter(Boolean);}
    const pageConfirmed=confirmedDrawingDevices(page,sourceText);for(const ref of Object.keys(pageConfirmed))if(!lines.includes(ref))lines.push(ref);
    const hasNumberedRefs=lines.some(l=>/^[-+]\d+[FSPKYQAG]\d/.test(l));
    const refs=[];for(let i=0;i<lines.length;i++)if(/^(?:[-+]?\d*[FSPKYQ]|[-+]?\d+[AG])\d+(?:\.\d+)*[A-Za-z]?$/.test(lines[i])&&(!hasNumberedRefs||/^[-+]?\d+[FSPKYQAG]\d/.test(lines[i])))refs.push({i,ref:lines[i]});
    for(let k=0;k<refs.length;k++){
      const {i,ref}=refs[k];
      if(/[FSKQ]\d/.test(ref)&&reserveStatus(page,ref)==='unwired'){result.ignored.push(source+': '+ref+' – Reserve ohne angeschlossene Stromlinien; nicht eingebaut und ausgeschlossen.');continue;}
      if(seen.has(ref)&&!/\d*K\d/.test(ref))continue;
      const block=lines.slice(i,refs[k+1]?.i??lines.length),ampLine=block.slice(0,4).find(x=>/^\d+\s*A$/.test(x));
      const ratingText=block.slice(0,12).join(' ');const ocrAmp=ratingText.match(/(?:\b|[x×BCD])(\d+)\s*A\b/i)||ratingText.match(/\bLS[BCD]?\s+[BCD](\d+)\b/i);
      const before=lines[i-1]?.match(/^(\d+)\s*A$/);const amp=ampLine?parseInt(ampLine):ocrAmp?+ocrAmp[1]:before?+before[1]:null,maLine=block.find(x=>/^\d+\s*mA$/.test(x));
      const ma=maLine?parseInt(maLine):Number(block.join(' ').match(/(\d+)\s*mA\b/i)?.[1])||null;
      const preceding=lines.slice(Math.max(refs[k-1]?.i+1||0,i-10),i).join(' ');
      const spd=/^(?:ÜSS|SPD)\b/i.test(block[1]||'')||block.slice(1,4).some(s=>/^T[12]\s*\/\s*T[12]$/i.test(s.trim()))||/Überspannungs(?:ableiter|schutz)|\bSPD\b/i.test(block.join(' '))||/Überspannungs(?:ableiter|schutz)|\bSPD\b/i.test(lines.slice(Math.max(0,i-2),i).join(' '));
      const other=/Trennmesser|DIN00|Überspannung|NH\b/.test(block.join(' '));
      const characteristic=block.some(x=>/^[BCD](?:\s*\d+\s*mA)?$/i.test(x))||/\bLS[BCD]?\b/i.test(block.join(' '));
      const local=block.join(' ');const letter=ref.match(/([FSPKYQAG])\d/)[1];
      const kind=spd?'SPD':['Q','S'].includes(letter)&&(/Hauptschalter|Lasttrennschalter|Bypass-Umschalter/i.test(local)||letter==='Q'&&/Hauptschalter|Lasttrennschalter/i.test(preceding))?'MAIN':letter==='S'&&(/Steuerschalter|Steuer-Schalter/i.test(local)||['H','A'].every(v=>block.includes(v)))?'CONTROL':/Dämmerungs[ -]*schalter|Dämmerungsautomat/i.test(local)?'TWILIGHT':/Schaltuhr|Astro(?:uhr)?|Atrouhr/i.test(local)?'CLOCK':/Privatzähler|Power Analyser/i.test(local)&&['P','Y'].includes(letter)?'METER':/Minuterie|Zeitrelais|Treppenlicht/i.test(local)&&letter==='K'?'TIMER':(/Schütz|Relais/i.test(local)||lines.slice(Math.max(0,i-3),i+4).includes('A1'))&&letter==='K'?'CONTACTOR':letter!=='F'?'OTHER':/FI[\s/-]*LS/i.test(local)?'FILS':ma&&characteristic?'FILS':ma?'FI':/\bLS[BCD]?\b/i.test(local)?'LS':amp&&characteristic?'LS':amp?(amp>63?'NH':'FUSE'):'OTHER';
      const pins=lines.slice(Math.max(0,i-6),refs[k+1]?.i??lines.length);const poles=spd?'4P':pins.includes('5')&&pins.includes('6')?'3LN':pins.includes('N')&&pins.includes('1')&&pins.includes('2')?'LN':'';
      const device={ref,amp,ma,kind,poles,system:/smissline/i.test(text)?'smissline':'hager',qty:1,field:1,source,article:'',note:(page.ocr?'Texterkennung: Angaben prüfen. ':'')+(other?block.slice(0,5).join(' '):'')};
      // Explicit ratings belong to this device, including rotated labels and 3x13A notation.
      const label=block.slice(1,4).find(t=>/^(?:FI[\s/-]*LS|LS[BCD]?|FI)\b/i.test(t));
      if(label&&letter==='F'){
        device.kind=/^FI[\s/-]*LS/i.test(label)?'FILS':/^FI\b/i.test(label)?'FI':'LS';
        device.amp=Number(label.match(/(?:\b|[x×BCD])(\d+)\s*A\b/i)?.[1])||device.amp;
        device.ma=Number(label.match(/(\d+)\s*mA\b/i)?.[1])||device.ma;
        device.poles=/\b(?:3[x×]|[34]P\b)/i.test(label)?'3LN':/\b(?:[12]P|1[x×])\b/i.test(label)||/Phase\s+L[123]/i.test(block.slice(1,5).join(' '))?'LN':device.poles;
      }
      if(!device.poles&&['FILS','FI','LS'].includes(device.kind)&&page.poleHints?.[ref]){device.poles=page.poleHints[ref];device.note+=' Polzahl anhand gezeichneter Zuleitungen. ';}
      if(device.kind==='OTHER'&&letter==='K'&&page.symbols?.[ref]==='clock'){device.kind='CLOCK';device.note+=' Uhrsymbol erkannt. ';}
      if(device.kind==='OTHER'&&letter==='K'&&page.symbols?.[ref]==='coil'){device.kind='CONTACTOR';device.note+=' Rechteckige Relaisspule erkannt; Hager-Schütz als Referenz. ';}
      if(pageConfirmed[ref]){Object.assign(device,pageConfirmed[ref]);device.confirmed=true;device.note='Symbol-/Gerätezuordnung für dieses Schema visuell geprüft.';}
      if(confirmed[ref]){Object.assign(device,confirmed[ref]);device.note='Symbolzuordnung für dieses Schema bestätigt. '+device.note;}
      if(['A','G'].includes(letter)&&/Kom-Box|Glasfaserdose|\bLSG\b/i.test(block.slice(1,5).join(' '))){seen.add(ref);continue;}
      const ownLabels=equipmentLabels(page,ref),previousLabel=lines[i-1]||'';
      const utilityLabel=ownLabels+' '+block.slice(1,4).join(' ')+' '+(/^(?:RS\s*485|RSE|NKE|ZFA|Res\.|Reserve)$/i.test(previousLabel)?previousLabel:'');
      if(['P','Y'].includes(letter)&&(/\b(?:RSE|NKE|ZFA|RS\s*485)\b/i.test(utilityLabel)||/\bRes\.|\bReserve\b/i.test(utilityLabel))){seen.add(ref);result.ignored.push(source+': '+ref+' – Messkommunikation/Reserve gemäss Vorgabe ausgeschlossen.');continue;}
      if(device.kind==='SPD'){device.manualLoss=5;device.note+=' SPD: Vorgabewert 5 W je Gerät.';}
      if(device.exclude||(['P','Y'].includes(letter)&&device.kind==='OTHER'&&/kWh|(?:Strom|Storm|Energie|Wirkleistungs)?zähler|\bMID\b|DVH\d+/i.test(lines.slice(Math.max(0,i-5),refs[k+1]?.i??lines.length).join(' ')))){seen.add(ref);result.ignored.push(source+': '+ref+' – kein Privatzähler; nicht berücksichtigt.');continue;}
      const contactText=lines.slice(Math.max(refs[k-1]?.i+1||0,i-3),Math.min(refs[k+1]?.i??lines.length,i+7)).join(' '),terminals=contactText.split(/\s+/);
      const changeover=letter==='K'&&(/Wechsler|Wechselkontakt/i.test(contactText)||[['11','12','14'],['21','22','24']].some(set=>set.every(t=>terminals.includes(t))));
      if(changeover&&['OTHER','CONTACTOR'].includes(device.kind)){device.kind='CONTACTOR';device.changeover=true;device.poles='4S';device.note+=' Wechslerkontakt: gemäss Vorgabe als 4S gerechnet.';}
      if(device.kind==='CONTACTOR'){device.contacts=local.match(/\b([24]S)\b/)?.[1]||'';device.note+=(device.amp&&device.contacts?' Hager-Schütz nach Nennstrom und Kontakten.':' Hager-Schütz: fehlende Angaben mit 25 A / 4S ergänzt.');}
      if(device.kind==='MAIN'){device.poles='3LN';if(device.amp)result.currents.push({amp:device.amp,source});}
      if(!['FILS','FI','LS'].includes(device.kind))device.system='hager';
      const existing=result.devices.find(d=>d.ref===ref);
      if(existing){
        const rank=d=>d.confirmed?10:d.kind==='OTHER'?0:d.kind==='CONTACTOR'?1:2;
        if(rank(device)>rank(existing))Object.assign(existing,device);
        else if(existing.kind==='CONTACTOR'&&device.kind==='CONTACTOR'&&(!existing.confirmed||device.confirmed)){
          if(device.amp)existing.amp=device.amp;
          if(device.changeover){existing.changeover=true;existing.poles='4S';}
          if(!existing.source.includes(source))existing.source+='; '+source;
        }
      }else result.devices.push(device);seen.add(ref);
      if(other&&amp&&/DIN00|Trennmesser/.test(block.join(' ')))result.currents.push({amp,source});
    }
    if(/Zeitschaltuhr/i.test(text)&&!result.devices.some(d=>d.source===source&&d.kind==='CLOCK'))result.devices.push({ref:'Uhr · Seite '+page.number,kind:'CLOCK',amp:null,ma:null,poles:'',system:'hager',qty:1,field:1,source,article:'',note:'Zeitschaltuhr beschriftet, ohne eigenes Kennzeichen. Anzahl prüfen.'});
    if(!refs.length && !/ELEKTROSCHEMA/i.test(text))result.warnings.push(source+': Keine eindeutigen Betriebsmittel erkannt; Seite prüfen.');
  }
  if(!result.devices.length)result.warnings.push('Keine Geräte sicher erkannt. Bei Dispo oder Scan Geräte manuell hinzufügen; es wird kein vollständiger Gerätebestand angenommen.');
  return result;
}
export function validateFields(fields){return fields.length>0&&fields.length<=5&&fields.every(f=>['SBR','ARS','GZK'].includes(f.type)&&[f.b,f.h,f.t].every(n=>Number.isFinite(n)&&n>0)&&Number.isFinite(f.percent)&&f.percent>=0&&f.percent<=100&&validSurcharge(f.surchargePercent));}

export function defaultIcp(devices=[],smisslineInstalled=false){return smisslineInstalled||devices.some(d=>d.system==='smissline'&&d.qty>0)?10:6;}
export function peakCurrent(icp){const n=Number(icp);return Number.isFinite(n)&&n>0?Math.round(n*1.7):null;}

export function validSurcharge(percent=0){return Number.isFinite(percent)&&percent>=0;}
export function applySurcharge(base,percent=0){
 if(!Number.isFinite(base)||base<0||!validSurcharge(percent))return {base,surchargeW:null,selected:null};
 const surchargeW=base*percent/100,selected=base+surchargeW;
 return Number.isFinite(selected)?{base,surchargeW,selected}:{base,surchargeW:null,selected:null};
}

// User-defined allowance for devices without a matching Excel article.
export const UNASSIGNED_LOSS_W=8;
export function unassignedUnitLoss(d){return /^[-+]?\d*A\d+(?:\.\d+)*[A-Za-z]?$/i.test(String(d.ref??'').trim())?5:UNASSIGNED_LOSS_W;}
export function unassignedLoss(devices,catalog){
 const ids=new Set(catalog.map(c=>c.id));
 return devices.reduce((total,d)=>{
  if(!Number.isInteger(d.qty)||d.qty<0)throw Error("Ungültige Geräteanzahl: "+d.ref);
  return total+(ids.has(d.article)?0:d.qty*unassignedUnitLoss(d));
 },0);
}
