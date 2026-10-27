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
export const DEVICE_KINDS=[['FILS','FI/LS'],['LS','LS'],['FI','FI'],['SPD','SPD 4-polig'],['MAIN','Hauptschalter'],['FUSE','Schmelzsicherung'],['NH','NH-Element'],['METER','Privatzähler'],['CLOCK','Schaltuhr'],['TWILIGHT','Dämmerungsschalter'],['TIMER','Minuterie/Zeitrelais'],['CONTACTOR','Schütz/Relais'],['OTHER','Andere']];
export function classify(label,section=''){
  const text=String(label), all=text+' '+section;
  return {kind:/DIII? Element/i.test(text)?'FUSE':/NH.*Element|NH - Element/i.test(text)?'NH':/LTS|Dilos|modularer Ausschalter/i.test(text)?'MAIN':/Dämmerungs/i.test(text)?'TWILIGHT':/Schaltuhr|Analoguhr/i.test(text)?'CLOCK':/Privatzähler/i.test(text)?'METER':/Minuterie|Treppenlicht|Monof.relais|Zweif.relais|Multif.relais/i.test(text)?'TIMER':/schütz|Hilfsrelais/i.test(text)?'CONTACTOR':/FI\s*-?\s*Leitung|FI.?LS/i.test(text)?'FILS':/Leitungsschutz|\bLS\b/i.test(text)?'LS':/^FI\s/i.test(text)?'FI':'OTHER',
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
 if(cs.length===1)return cs[0];
 if(d.kind==='SPD')return cs[0];
 // User-authorised representative time switch; other ambiguous variants stay open.
 if(d.kind==='CLOCK')return cs.find(c=>c.code==='EG103')||cs[0];
 if(d.referenceCode)return cs.find(c=>c.code.trim()===d.referenceCode);
 if(d.kind==='METER'&&cs.length&&cs.every(c=>c.pv===cs[0].pv))return cs[0];
 if(d.kind==='TWILIGHT')return cs.find(c=>/Hager Dämmerungsautomat/i.test(c.label));
 return undefined;
}
export function parsePages(pages){
  const result={devices:[],warnings:[],dimensions:[],currents:[],project:{},ignored:[]};
  const seen=new Set();
  // Confirmed by the user from the supplied symbol-only drawings; never apply to another project.
  const sourceText=pages.map(p=>p.text).join('\n');
  const confirmed=/abelia/i.test(pages.map(p=>p.file).join(' '))&&['10S2','13F2.1','60P3','61K7'].every(ref=>sourceText.split('\n').includes(ref))?{
   '11F6':{kind:'FUSE',amp:10,poles:'LN'},'12F4':{kind:'FUSE',amp:13,poles:'3LN'},
   '13F2.1':{kind:'NH',amp:160,poles:'3LN',referenceCode:'S00(0) u.ä'},'13F4.1':{kind:'FUSE',amp:13,poles:'3LN'},
   '15P2.2':{exclude:true},'15F2':{kind:'FUSE',amp:25,poles:'3LN'},'22Y3':{kind:'METER'},
   '60P3':{kind:'CLOCK'},'60P5':{kind:'CLOCK'},'60K6':{kind:'TWILIGHT'},
   '60K8':{kind:'TIMER',referenceCode:'TLA-1/230'},'61K5':{kind:'TIMER',referenceCode:'TLA-1/230'},
   '61K7':{kind:'CONTACTOR'}
  }:{};
  for(const page of pages){
    const lines=page.text.split('\n').map(s=>s.trim()).filter(Boolean),text=lines.join('\n'), source=page.file+' · PDF-Seite '+page.number;
    if(/Anschluss-?\s*und\s*Umgebungsbedingungen/i.test(text)){result.ignored.push(source);continue;}
    if(/Symbolverzeichnis|Allgemeine Hinweise/i.test(text))continue;
    const dims=[...text.matchAll(/B\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*H\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*T\s*(\d+(?:[.,]\d+)?)\s*mm/gi)];
    for(const d of dims)result.dimensions.push({b:+d[1].replace(',','.'),h:+d[2].replace(',','.'),t:+d[3].replace(',','.'),source});
    if(/Alu[ -]Selbstbaurahmen/i.test(text))result.project.type='SBR';
    const order=text.match(/\bAU-\d+\b/);if(order)result.project.order=order[0];
    const schema=text.match(/\bS-\d+\b/);if(schema)result.project.schema=schema[0];
    if(/\bUnterverteilung\b/.test(text))result.project.name='Unterverteilung';
    if(page.number===1){const body=text.slice(Math.max(text.indexOf('ELEKTROSCHEMA'),text.indexOf('Objekt:')));const city=body.match(/([A-ZÄÖÜ][a-zäöüéè]+)\s*\n\s*\d{4}\b/)||body.match(/\b\d{4}\s+([A-ZÄÖÜ][a-zäöüéè]+(?:[ -][A-ZÄÖÜ][a-zäöü]+)?)/);if(city)result.project.city=city[1];const reversed=[...body.matchAll(/([A-ZÄÖÜ][a-zäöüéè]+)\s*\n\s*\d{4}\b/g)];if(reversed.length)result.project.city=reversed.at(-1)[1];}
    for(const m of text.matchAll(/(?:Zuleitung[^\n]*|Hauptschalter)\s+(\d+)\s*A\b/gi))result.currents.push({amp:+m[1],source});
    if(/\bDispo\b|Disposition/i.test(text)){result.warnings.push(source+': Dispo liefert Masse und Aufbau. Gerätebilder bitte mit dem Schema abgleichen oder manuell ergänzen.');continue;}
    const refs=[];for(let i=0;i<lines.length;i++)if(/^[-+]?[A-Za-z]*\d+[FSPKY]\d+(?:\.\d+)*[A-Za-z]?$/.test(lines[i]))refs.push({i,ref:lines[i]});
    for(let k=0;k<refs.length;k++){
      const {i,ref}=refs[k];if(seen.has(ref))continue;
      const block=lines.slice(i,refs[k+1]?.i??lines.length),ampLine=block.slice(0,4).find(x=>/^\d+\s*A$/.test(x));
      const before=lines[i-1]?.match(/^(\d+)\s*A$/);const amp=ampLine?parseInt(ampLine):before?+before[1]:null,maLine=block.find(x=>/^\d+\s*mA$/.test(x));
      const ma=maLine?parseInt(maLine):null;
      const spd=/Überspannungs(?:ableiter|schutz)|\bSPD\b/i.test(block.join(' '));
      const other=/Trennmesser|DIN00|Überspannung|NH\b/.test(block.join(' '));
      const characteristic=block.some(x=>/^[BCD]$/.test(x));
      const local=block.join(' ');const letter=ref.match(/\d+([A-Z])\d/)[1];
      const kind=spd?'SPD':/Hauptschalter/i.test(local)?'MAIN':/Dämmerungs[ -]*schalter|Dämmerungsautomat/i.test(local)?'TWILIGHT':/Schaltuhr/i.test(local)?'CLOCK':/Privatzähler|Power Analyser/i.test(local)&&['P','Y'].includes(letter)?'METER':/Minuterie|Zeitrelais|Treppenlicht/i.test(local)&&letter==='K'?'TIMER':(/Schütz|Relais/i.test(local)||lines.slice(Math.max(0,i-3),i+4).includes('A1'))&&letter==='K'?'CONTACTOR':letter!=='F'?'OTHER':ma&&characteristic?'FILS':ma?'FI':amp&&characteristic?'LS':amp?(amp>63?'NH':'FUSE'):'OTHER';
      const pins=lines.slice(Math.max(0,i-6),refs[k+1]?.i??lines.length);const poles=spd?'4P':block.includes('5')&&block.includes('6')?'3LN':pins.includes('N')&&pins.includes('1')&&pins.includes('2')?'LN':'';
      const device={ref,amp,ma,kind,poles,system:/smissline/i.test(text)?'smissline':'hager',qty:1,field:1,source,article:'',note:other?block.slice(0,5).join(' '):''};
      if(confirmed[ref]){Object.assign(device,confirmed[ref]);device.note='Symbolzuordnung für dieses Schema bestätigt. '+device.note;}
      if(device.exclude||(['P','Y'].includes(letter)&&device.kind!=='METER'&&/kWh|Wirkleistungszähler|DVH4013/i.test(lines.slice(Math.max(0,i-5),refs[k+1]?.i??lines.length).join(' ')))){seen.add(ref);result.ignored.push(source+': '+ref+' – kein Privatzähler; nicht berücksichtigt.');continue;}
      if(device.kind==='CONTACTOR'){device.contacts=local.match(/\b([24]S)\b/)?.[1]||'';device.note+=(device.amp&&device.contacts?' Hager-Schütz nach Nennstrom und Kontakten.':' Hager-Schütz: fehlende Angaben mit 25 A / 4S ergänzt.');}
      if(device.kind==='MAIN')device.poles='3LN';
      if(!['FILS','FI','LS'].includes(device.kind))device.system='hager';
      result.devices.push(device);seen.add(ref);
      if(other&&amp&&/DIN00|Trennmesser/.test(block.join(' ')))result.currents.push({amp,source});
    }
    if(!refs.length && !/ELEKTROSCHEMA/i.test(text))result.warnings.push(source+': Keine eindeutigen Betriebsmittel erkannt; Seite prüfen.');
  }
  if(!result.devices.length)result.warnings.push('Keine Geräte sicher erkannt. Bei Dispo oder Scan Geräte manuell hinzufügen; es wird kein vollständiger Gerätebestand angenommen.');
  return result;
}
export function validateFields(fields){return fields.length>0&&fields.length<=5&&fields.every(f=>['SBR','ARS','GZK'].includes(f.type)&&[f.b,f.h,f.t].every(n=>Number.isFinite(n)&&n>0)&&Number.isFinite(f.percent)&&f.percent>=0&&f.percent<=100);}
