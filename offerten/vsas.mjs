// Streaming CSV reader: bounded input buffers; quoted delimiters/newlines survive chunk boundaries.
export function csvStream(onRow,delimiter=';'){
 let row=[],cell='',quoted=false,afterQuote=false,skipLF=false,first=true,record=0;
 const field=()=>{row.push(cell.replace(/\0/g,'').trim());cell='';};
 const end=()=>{field();if(row.some(Boolean))onRow(row,++record);row=[];};
 return {push(text){for(const c of text){if(first){first=false;if(c==='\uFEFF')continue;}if(skipLF){skipLF=false;if(c==='\n')continue;}
 if(afterQuote){afterQuote=false;if(c==='"'){cell+='"';continue;}quoted=false;}
 if(quoted){if(c==='"')afterQuote=true;else cell+=c;}
 else if(c==='"'&&!cell){quoted=true;}
 else if(c===delimiter)field();else if(c==='\r'||c==='\n'){end();skipLF=c==='\r';}else cell+=c;
 if(cell.length>2000000)throw Error('CSV-Feld zu gross oder Anführungszeichen nicht geschlossen.');
 }},finish(){if(quoted&&!afterQuote)throw Error('CSV: Anführungszeichen nicht geschlossen.');if(cell||row.length)end();}};
}
const clean=v=>String(v??'').replace(/\0/g,'').trim();
const numeric=v=>{const s=clean(v).replace(/[’'\s]/g,'').replace(',','.');return /^\d+(?:\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;};
export const isVSAS=headers=>['VSASNR','TextD','StuekPreis','Zeit'].every(k=>headers.includes(k));
export function vsasImporter({timeUnit='hours',eurRate=null,blankCurrencyCHF=false}={}){
 if(!['hours','minutes'].includes(timeUnit))throw Error('Zeiteinheit auswählen.');
 if(eurRate!=null&&(!Number.isFinite(eurRate)||eurRate<=0))throw Error('EUR-Kurs muss grösser als 0 sein.');
 let headers,columns;const items=[],seen=new Set(),issues=[],counts={records:0,imported:0,inactive:0,malformed:0,currency:0,invalid:0,duplicate:0,missingTime:0,zeroPrice:0};
 const reject=(row,record,kind,reason)=>{counts[kind]++;issues.push({record,article:clean(row[0]),reason});};
 return {items,issues,counts,row(row,record){if(!headers){headers=row;if(!isVSAS(headers))throw Error('Keine VSAS-CSV erkannt.');for(const key of ['Aktiv','Waehrung','Listenpreis','PreisMenge'])if(!headers.includes(key))throw Error('VSAS-Spalte fehlt: '+key);columns=Object.fromEntries(headers.map((key,i)=>[key,i]));return;}counts.records++;
 if(row.length!==headers.length){reject(row,record,'malformed',`Spaltenzahl ${row.length} statt ${headers.length}`);return;}
 const get=k=>clean(row[columns[k]]),id=get('VSASNR');
 if(!['1','yes','true'].includes(get('Aktiv').toLowerCase())){reject(row,record,'inactive','Nicht als aktiv gekennzeichnet');return;}
 const currency=get('Waehrung').toUpperCase();let factor=1;
 if(currency==='EUR'&&eurRate)factor=eurRate;
 else if(currency!=='CHF'&&!(currency===''&&blankCurrencyCHF)){reject(row,record,'currency',currency==='EUR'?'EUR ohne Umrechnungskurs':currency?'Nicht unterstützte Währung: '+currency:'Währung fehlt');return;}
 const piece=get('StuekPreis'),list=numeric(get('Listenpreis')),base=numeric(get('PreisMenge'));
 const price=piece?numeric(piece):list!==null&&base>0?list/base:null;
 const rawTime=get('Zeit'),time=rawTime?numeric(rawTime):0,name=get('TextD')||get('LangTextD');
 if(!id||!name||price===null||time===null){reject(row,record,'invalid','Artikelnummer, Text, Preis oder Zeit ungültig');return;}
 if(seen.has(id)){reject(row,record,'duplicate','Doppelte VSAS-Nummer');return;}seen.add(id);
 if(!rawTime)counts.missingTime++;if(price===0)counts.zeroPrice++;
 items.push({id:'vsas:'+id,article:id,supplierArticle:get('Artikelnummer'),orderNumber:get('Bestellnummer'),name,description:get('LangTextD'),brand:get('Hersteller'),category:get('VSASArtikelgruppe')||get('Produktgruppe')||get('ETIMKlasse')||'Allgemein',etim:get('ETIMKlasse'),unit:['','1'].includes(get('Bestelleinheit'))?'Stk.':get('Bestelleinheit'),price:price*factor,minutes:Math.round(time*(timeUnit==='hours'?60:1)*1e6)/1e6,rate:null,type:get('StuecklistenFlagStueckliste')==='1'?'Baugruppe':'Artikel',source:'vsas',currency:currency||'CHF',originalPrice:price,exchangeRate:factor,missingTime:!rawTime,timeUnit});counts.imported++;
 },finish(){if(!headers||!counts.records)throw Error('CSV enthält keine Artikeldaten.');return {items,issues,counts};}};
}
export async function importVSAS(file,options={},progress=()=>{}){
 const importer=vsasImporter(options),parser=csvStream((row,n)=>importer.row(row,n)),decoder=new TextDecoder(options.encoding||'utf-8');
 const size=1024*1024;
 for(let start=0;start<file.size;start+=size){parser.push(decoder.decode(await file.slice(start,start+size).arrayBuffer(),{stream:true}));progress(Math.min(100,Math.round((start+size)/file.size*100)),importer.counts.records);}
 parser.push(decoder.decode());parser.finish();return importer.finish();
}
