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
export function classify(label,section=''){
  const text=String(label), all=text+' '+section;
  return {kind:/FI\s*-?\s*Leitung|FI.?LS/i.test(text)?'FILS':/Leitungsschutz|\bLS\b/i.test(text)?'LS':/^FI\s/i.test(text)?'FI':'OTHER',
    system:/smissline/i.test(section)?'smissline':'hager',poles:/3LN|3\s*\+\s*N|4.pol/i.test(text)?'3LN':/\bLN\b|1\s*\+\s*N/i.test(text)?'LN':'',
    amp:Number(text.match(/(\d+)\s*A(?:\b|\/)/)?.[1])||null,ma:Number(text.match(/(\d+)\s*mA/i)?.[1])||null,
    special:/\bHI\b|kurzz|kurzzeit|Typ B/i.test(all)};
}
export function candidates(device,catalog){return catalog.filter(c=>c.kind===device.kind&&c.system===device.system&&c.amp===device.amp&&(!device.poles||c.poles===device.poles)&&(!device.ma||c.ma===device.ma)&&!c.special);}
export function parsePages(pages){
  const result={devices:[],warnings:[],dimensions:[],currents:[],project:{},ignored:[]};
  const seen=new Set();
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
    if(page.number===1){const body=text.slice(Math.max(text.indexOf('ELEKTROSCHEMA'),text.indexOf('Objekt:')));const city=body.match(/([A-ZÄÖÜ][a-zäöüéè]+)\s*\n\s*\d{4}\b/)||body.match(/\b\d{4}\s+([A-ZÄÖÜ][a-zäöüéè]+(?:[ -][A-ZÄÖÜ][a-zäöü]+)?)/);if(city)result.project.city=city[1];}
    for(const m of text.matchAll(/(?:Zuleitung[^\n]*|Hauptschalter)\s+(\d+)\s*A\b/gi))result.currents.push({amp:+m[1],source});
    if(/\bDispo\b|Disposition/i.test(text)){result.warnings.push(source+': Dispo liefert Masse und Aufbau. Gerätebilder bitte mit dem Schema abgleichen oder manuell ergänzen.');continue;}
    const refs=[];for(let i=0;i<lines.length;i++)if(/^[-+]?[A-Za-z]*\d+F\d+[A-Za-z]?$/.test(lines[i]))refs.push({i,ref:lines[i]});
    for(let k=0;k<refs.length;k++){
      const {i,ref}=refs[k];if(seen.has(ref))continue;
      const block=lines.slice(i,refs[k+1]?.i??lines.length),ampLine=block.find(x=>/^\d+\s*A$/.test(x));
      const amp=ampLine?parseInt(ampLine):null,maLine=block.find(x=>/^\d+\s*mA$/.test(x));
      const ma=maLine?parseInt(maLine):null;
      const other=/Trennmesser|DIN00|Überspannung|NH\b/.test(block.join(' '));
      const characteristic=block.some(x=>/^[BCD]$/.test(x));
      const kind=other?'OTHER':ma&&characteristic?'FILS':ma?'FI':amp&&characteristic?'LS':'OTHER';
      const pins=lines.slice(Math.max(0,i-6),refs[k+1]?.i??lines.length);const poles=block.includes('5')&&block.includes('6')?'3LN':pins.includes('N')&&pins.includes('1')&&pins.includes('2')?'LN':'';
      const device={ref,amp,ma,kind,poles,system:/smissline/i.test(text)?'smissline':'hager',qty:1,field:1,source,article:'',note:other?block.slice(0,5).join(' '):''};
      result.devices.push(device);seen.add(ref);
      if(other&&amp&&/DIN00|Trennmesser/.test(block.join(' ')))result.currents.push({amp,source});
    }
    if(!refs.length && !/ELEKTROSCHEMA/i.test(text))result.warnings.push(source+': Keine eindeutigen Betriebsmittel erkannt; Seite prüfen.');
  }
  if(!result.devices.length)result.warnings.push('Keine Geräte sicher erkannt. Bei Dispo oder Scan Geräte manuell hinzufügen; es wird kein vollständiger Gerätebestand angenommen.');
  return result;
}
export function validateFields(fields){return fields.length>0&&fields.every(f=>['SBR','ARS','GZK'].includes(f.type)&&[f.b,f.h,f.t].every(n=>Number.isFinite(n)&&n>0)&&Number.isFinite(f.percent)&&f.percent>=0&&f.percent<=100);}
