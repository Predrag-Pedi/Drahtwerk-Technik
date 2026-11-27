import {libraryCaption} from './template-language.mjs';
export const libraryName=s=>String(s).replace(/TinLine/gi,'').replace(/^(?:\d{2,3}[_ -]|[A-Z]\d{1,4}[_ ]|[A-Z]\d(?=[A-ZÄÖÜ])|\d{2}(?=[A-WYZa-wyzÄÖÜ]))/,'').replaceAll('_',' ').replaceAll('&amp;','&').replace(/Schuetzen/gi,'Schütze').trim();
// Curated current-only families. Source IDs and files remain valid in old projects.
export const macroFamilies=[
 ['tl-0021','tl-0022','tl-0023','tl-0024'],
 ['tl-0028','tl-0029','tl-0030','tl-0031'],
 ['tl-0032','tl-0035'],['tl-0033','tl-0036'],['tl-0034','tl-0037']
];
export const canonicalTemplateId=id=>macroFamilies.find(ids=>ids.includes(id))?.[0]||id;
export const templateName=t=>libraryName(macroFamilies.some(ids=>ids.includes(t.id))?t.name.replace(/[_ ]\d+(?:[.,]\d+)?A(?=$|[_ ])/g,''):t.name);
export function groupedTemplates(items){
 const byId=new Map(items.map(t=>[t.id,t])),seen=new Set(),result=[];
 for(const item of items){const ids=macroFamilies.find(ids=>ids.includes(item.id)),canonical=ids?.find(id=>byId.has(id))||item.id;if(seen.has(canonical))continue;seen.add(canonical);const t=byId.get(canonical);result.push(ids?{...t,aliases:ids.filter(id=>byId.has(id)).map(id=>byId.get(id)),name:templateName(t)}:t);}
 return result;
}
export function libraryFacets(t){
 const s=t.source||'',all=`${t.name} ${t.group} ${s}`,lower=all.toLowerCase();
 let domain=t.category==='Dispo'?'Disposition':'Elektroschema';
 if(/181-|183-Installation/.test(s))domain='Elektroinstallation';
 if(/183-Elektroschema/.test(s))domain='Schema einpolig';
 if(/Prinzipschema/.test(s))domain='Prinzipschema';
 if(/182-KNX/.test(s)&&!/free@home/i.test(s))domain='KNX';
 if(/free@home|Loxone|TwiLine|Spline|DigitalStrom|INNOXEL|WAGO Home|Wiser/.test(s))domain='Gebäudeautomation';
 if(/tinAutomation|Siemens-LOGO/.test(s))domain='SPS & Steuerung';
 if(/182-HLK/.test(s))domain='Heizung, Lüftung, Klima';
 if(/184-EDV/.test(s))domain='Netzwerk & EDV';
 const manufacturer=[['ABB',/\bABB\b|free@home/i],['Hager',/hager/i],['MDT',/\bMDT\b/i],['Siemens',/siemens/i],['Theben',/theben/i],['Feller',/feller/i],['Griesser',/griesser/i],['Loxone',/loxone/i],['WAGO',/wago/i],['Beckhoff',/beckhoff/i],['Phoenix Contact',/phoenix/i],['INNOXEL',/innoxel/i],['Digitalstrom',/digital.?strom/i],['Schneider',/schneider/i],['Elvatec',/elvatec/i]].find(([,r])=>r.test(all))?.[0]||'';
 let group=libraryName(t.group);
 const groups={'Messgeraete':'Messgeräte','MESSUNG':'Messung','EINSPEISUNG':'Einspeisung','SICHERUNGSELEMENTE':'Sicherungselemente','ÜBERSPANNUNGSABLEITER':'Überspannungsableiter','PV-ANLAGE':'PV-Anlagen','PV Anlagen':'PV-Anlagen','LICHTSTEUERUNG':'Lichtsteuerung','BusklemmenAnIn':'Busklemmen · Analoge Eingänge','BusklemmenAnOut':'Busklemmen · Analoge Ausgänge','BusklemmenDigIN':'Busklemmen · Digitale Eingänge','BusklemmenDigOut':'Busklemmen · Digitale Ausgänge','BusklemmenKom':'Busklemmen · Kommunikation','Busklemmenkontroller':'Busklemmen · Controller','BusklemmenPower':'Busklemmen · Versorgung','BusklemmenSonder':'Busklemmen · Sonderfunktionen','BusklemmenSys':'Busklemmen · System','Digital In':'Digitale Eingänge','Digital Out':'Digitale Ausgänge','Analog In':'Analoge Eingänge','Analog Out':'Analoge Ausgänge','Server und Zubhör':'Server und Zubehör','Primaer-Relais':'Primärrelais','Relais-Schützen':'Relais und Schütze','Schützen (Q)':'Schütze (Q)','Last.-Trennsicherungen':'Lasttrennsicherungen','Last.-Trennsicherungen-QV':'Lasttrennsicherungen · Querverweise','FI LS Abgänge LNPE':'FI/LS-Abgänge L/N/PE','LS Abgänge LNPE':'LS-Abgänge L/N/PE','Sicherungs Abgänge 3LNPE':'Sicherungsabgänge 3L/N/PE'};
 group=groups[group]||group;
 if(['KNX','Gebäudeautomation'].includes(domain))group=[['Jalousie- & Storenaktoren',/jalousie|storen|rollladen|beschattung/],['Dimmaktoren & Lichtregelung',/dimm|dali|lichtreg/],['Heizungsaktoren & Raumregelung',/heiz|raumreg|raumtemp/],['Binäreingänge',/binär|binary/],['Analoge Ein- & Ausgänge',/analog/],['Schaltaktoren',/schaltaktor|schalt.?ausgang/],['Spannungsversorgung',/spannungsversorg|netzteil/],['Schnittstellen & Koppler',/schnittstelle|koppler|interface|gateway|router/],['Sensoren & Melder',/sensor|melder|wetter/],['Taster & Bedienung',/taster|bedien|display|touch/]].find(([,r])=>r.test(lower))?.[0]||'Weitere Geräte';
 return {domain,manufacturer,group};
}
// Treat keyboard spellings and technical separators alike (FI/LS = FI_LS,
// Zaehler = Zähler). Name matches precede incidental folder-name matches.
export const searchText=value=>String(value||'').toLocaleLowerCase('de').replace(/ä|ae/g,'a').replace(/ö|oe/g,'o').replace(/ü|ue/g,'u').normalize('NFKD').replace(/\p{M}/gu,'').replaceAll('ß','ss').replaceAll('²','2').replace(/[^a-z0-9]+/g,' ').trim();
export function libraryCategory(t,category){return !category||category==='Makro'&&t.category==='Schema'&&/^Makros\//i.test(t.source||'')||t.category===category;}
// Some original symbols carry native French or Italian lettering drawn as paths.
export function artworkLanguage(t){
 const folder=/(?:^|\/)(FR|Fra|IT|Ita)\/[^/]+$/i.exec(t.source||'')?.[1];
 return folder ? (folder[0].toUpperCase()==='F'?'fr':'it') : '';
}
export function filterLibrary(items,{query='',language='de',drawingLanguage=language,category='',group='',domain='',manufacturer='',scope='all',favorites=[],recent=[]}={}){
 items=groupedTemplates(items);favorites=favorites.map(canonicalTemplateId);recent=[...new Set(recent.map(canonicalTemplateId))];
 const words=searchText(query).split(/\s+/).filter(Boolean),compact=value=>value.replaceAll(' ','');
 const matches=value=>{const text=searchText(value),joined=compact(text);return words.every(w=>text.includes(w)||joined.includes(w));};
 const caption=t=>libraryCaption(templateName(t),language,true);
 const result=items.filter(t=>{const f=libraryFacets(t);return libraryCategory(t,category)&&(!group||f.group===group||t.group===group)&&(!domain||f.domain===domain)&&(!manufacturer||f.manufacturer===manufacturer)&&(scope!=='favorites'||favorites.includes(t.id))&&(scope!=='recent'||recent.includes(t.id))&&(!words.length||matches(`${caption(t)} ${libraryCaption(f.group,language)} ${libraryCaption(f.domain,language)} ${t.name} ${(t.aliases||[]).map(a=>a.name+' '+a.source).join(' ')} ${t.group} ${t.source} ${f.domain} ${f.group} ${f.manufacturer}`));});
 if(scope==='recent')return result.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
 const preferArtwork=t=>['fr','it'].includes(drawingLanguage)&&artworkLanguage(t)===drawingLanguage?1:0;
 if(words.length){
  const rank=t=>(matches(t.name)||matches(caption(t))?2:0)+preferArtwork(t);
  const ranks=new Map(result.map(t=>[t,rank(t)]));
  return result.sort((a,b)=>ranks.get(b)-ranks.get(a));
 }
 return result;
}
export function rememberTemplate(recent,id){id=canonicalTemplateId(id);return [id,...recent.map(canonicalTemplateId).filter(x=>x!==id)].slice(0,24);}
export function readLibrarySettings(storage){try{const v=JSON.parse(storage.getItem('cad-library-settings')||'{}');return {favorites:Array.isArray(v.favorites)?[...new Set(v.favorites.filter(x=>typeof x==='string').map(canonicalTemplateId))].slice(0,2000):[],recent:Array.isArray(v.recent)?[...new Set(v.recent.filter(x=>typeof x==='string').map(canonicalTemplateId))].slice(0,24):[]};}catch{return {favorites:[],recent:[]};}}
