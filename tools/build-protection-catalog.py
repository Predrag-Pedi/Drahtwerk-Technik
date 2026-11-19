"""Build facts only from the Hager CH PDF and public Feller product responses.
Usage: python tools/build-protection-catalog.py HAGER.pdf FELLER_DETAILS_DIR [ABB.pdf]
No SKU/rating cross-products are generated. Source PDFs/responses stay outside git.
Requires PyMuPDF. See docs/protection-catalog.md for source URLs and scope.
"""
import sys,json,re,pathlib,fitz,collections
hager='https://assets.sc.hager.com/de-ch/-/media/project/hagerdeep/switzerland/hager/b2b-ch/pdf/kataloge_2605/hager_kat3_energieverteilung-i_d_2026-05.pdf?la=de-ch'
num=lambda s:float(s.replace(',','.'))
articles={}
for i,p in enumerate(fitz.open(sys.argv[1])):
 if not (1<=i<=150 or i==186):continue
 text=p.get_text()
 for m in re.finditer(r'(?m)^(FI-LS(?:-Schalter)?|FI-Schutzschalter|LS-Schalter|SLS-Schalter|Hochleistungs-Schalter) ([1234]P(?:\+N)? [^\n]+)\n((?:[^\n]+\n){0,4}?)([A-Z]{2,4}\d{3}[A-Z]?)\n(\d{3} \d{3} \d{3})',text):
  desc=m[2].strip();sku=m[4];kind='fils' if m[1].startswith('FI-LS') else 'fi' if m[1]=='FI-Schutzschalter' else 'ls'
  current=re.search(r'(?<![\d.,])([\d.,]+)A\b',desc);curve=re.search(r'\b([BCDE])-',desc);residual=re.search(r'(\d+)mA',desc);capacity=re.search(r'([\d.,]+)\s*kA',desc)
  if not current or kind!='fi' and not(curve and capacity) or kind!='ls' and not residual:continue
  a=dict(id='hager:'+sku,manufacturer='hager',series='SLS' if sku.startswith('HTN') else 'Hochleistung' if sku.startswith('HM') else {'fi':'FI','fils':'FI/LS','ls':'LS'}[kind],article=sku,kind=kind,poles=desc.split()[0],current=num(current[1]),source='hager-2026',sourcePage=i+1,eldas=m[5].replace(' ',''))
  if kind!='fi':a['curve']=curve[1]
  if kind!='ls':
   tail=desc[residual.end():].replace('Typ','').replace('QC','').strip();a['selective']=bool(re.search(r'\bS\b',tail));a['rcdType']=re.sub(r'\s+S\b','',tail).strip();a['residual']=int(residual[1])
  if kind=='fi':
   # Inc with upstream protection, NOT Icn. These chapters explicitly state it.
   a['inc']=6 if i+1==101 else 10
   # Some four-pole rows have an erroneous 2-module column; omit widths here.
  else:
   metric='switchingCapacity' if sku.startswith('HTN') else 'icu' if sku.startswith(('HM','NRN')) else 'icn';a[metric]=num(capacity[1])
   mod=re.search(r'([\d.,]+)M\b',desc)
   if mod:a['modules']=num(mod[1])
   elif kind=='fils' and len(m[3].split())>=2:a['modules']=num(m[3].split()[1])
  a['connection']='QuickConnect' if 'QC' in desc else 'Schrauben'
  articles[a['id']]=a
for path in sorted(pathlib.Path(sys.argv[2]).glob('*.json')):
 p=json.loads(path.read_text());sku=p['fellerNr'];f={x['name']:x['value'] for x in p['features']};desc=p['description'];kind='fils' if re.match(r'FI[/ -]LS|Fehlerstrom-/',desc) else 'fi' if desc.startswith('Fehlerstromschutz') else 'ls' if desc.startswith('Leitungsschutz') else None
 if not kind or not p['flags']['isAvailableToBuy'] or p.get('followUpArticle'):continue
 def n(key):
  try:return num(f[key])
  except (KeyError,ValueError):return None
 current=n('Bemessungsstrom');count=n('Polzahl (gesamt)') or n('Polzahl');protected=n('Anzahl der abgesicherten Pole');neutral=f.get('Mitschaltender Neutralleiter')=='true'
 if not current or not count:continue
 poles=f'{int(count)-1}P+N' if neutral and kind!='fi' else f'{int(count)}P'
 # FI has no protected overcurrent poles: 2P and 4P are kept as published.
 a=dict(id='schneider:'+sku,manufacturer='schneider',series='Clario iC40' if 'iC40' in desc else 'Acti9 iID' if 'iID' in desc else 'Clario iID40' if 'iD40' in desc else 'Acti9',article=sku,kind=kind,poles=poles,current=current,source='feller-live',eldas=p.get('eNumber',''))
 if kind!='fi':
  if not f.get('Auslösecharakteristik'):continue
  a['curve']=f['Auslösecharakteristik']
 if kind!='ls':
  if not n('Bemessungsfehlerstrom') or not f.get('Fehlerstrom-Typ'):continue
  a['residual']=round(n('Bemessungsfehlerstrom')*1000);a['rcdType']=(re.search(r'Typ (B-SI|B-EV)\b',desc)[1] if re.search(r'Typ (B-SI|B-EV)\b',desc) else None) or ('A-SI' if re.search(r'(?:Klasse|Typ) Si\b',desc) else f['Fehlerstrom-Typ']);a['selective']=f.get('Selektiver Typ',f.get('Selektiver-Typ'))=='true' or 'selektiv' in f.get('Abschaltcharakteristik','') or 'selectiv' in desc
 for key,label in [('voltage','Bemessungsspannung'),('modules','Breite in Teilungseinheiten'),('loss','Verlustleistung')]:
  v=n(label)
  if v is not None:a[key]=f'{v:g} V '+f.get('Spannungsart','AC') if key=='voltage' else v
 # Preserve ratings with their standard AND reference voltage as independent data.
 ratings=[]
 for label,v in f.items():
  if 'schaltvermögen' in label or 'Kurzschlussfestigkeit' in label:
   try:val=num(v)
   except ValueError:continue
   if val>0:ratings.append([label,val])
 a['ratings']=ratings
 if kind=='fils':
  a['icn']=n('Bemessungsschaltvermögen Icn nach EN 61009-1') or n('Bemessungsabschaltvermögen nach EN 61009')
 if kind=='ls':
  voltage=230 if count<=2 else 400
  a['icn']=n(f'Bemessungsschaltvermögen Icn nach EN 60898 bei {voltage} V')
  a['icu']=n(f'Bemessungsschaltvermögen Icu nach IEC 60947-2 bei {voltage} V')
 if n('Anzahl der abgesicherten Pole') is not None:a['protectedPoles']=n('Anzahl der abgesicherten Pole')
 a={k:v for k,v in a.items() if v is not None}
 articles[a['id']]=a
# Selected ABB order tables. Parse literal model + order-number pairs only.
abb='https://library.e.abb.com/public/ef62e714f6fb4ca5b862f90e7cc7913f/Katalog_Niederspannung_2024.pdf'
if len(sys.argv)>3:
 for i,page in enumerate(fitz.open(sys.argv[3])):
  page_no=i+1;text=page.get_text()
  common=dict(manufacturer='abb',source='abb-2024',sourcePage=page_no)
  if 28<=page_no<=33:
   for m in re.finditer(r'(S20([1234])-([KZ])([\d,]+)(NA)?)\n(2CDS\w+)',text):
    model,poles,curve,current,neutral,sku=m.groups()
    a=dict(common,id='abb:'+sku,article=sku,model=model,kind='ls',series='S200',poles=poles+'P'+('+N' if neutral else ''),current=num(current),curve=curve,protectedPoles=int(poles))
    # No switching-capacity value guessed from a different current/voltage row.
    articles[a['id']]=a
  if page_no in [128,129,135,136,139]:
   cap=re.search(r'Icn\s*=\s*(\d+)\s*kA',text)
   for m in re.finditer(r'(DS201(M?)([AF])-([BC])([\d,]+)/([\d,]+))\n(2CSR\w+)',text):
    model,high,typ,curve,current,residual,sku=m.groups()
    a=dict(common,id='abb:'+sku,article=sku,model=model,kind='fils',series='DS201'+(' M' if high else '')+' '+typ,poles='1P+N',current=num(current),curve=curve,residual=round(num(residual)*1000),rcdType=typ,selective=False,protectedPoles=1)
    a['icn']=10 if high else 6
    articles[a['id']]=a
  if page_no==124:
   for m in re.finditer(r'(F20([24])F-([\d,]+)/([\d,]+))\n(2CSF\w+)',text):
    model,poles,current,residual,sku=m.groups()
    a=dict(common,id='abb:'+sku,article=sku,model=model,kind='fi',series='F200 F',poles=poles+'P',current=num(current),residual=round(num(residual)*1000),rcdType='F',selective=False)
    articles[a['id']]=a
for a in json.loads((pathlib.Path(__file__).resolve().parent/'protection-supplements.json').read_text()):articles[a['id']]=a
out=pathlib.Path(__file__).resolve().parent.parent/'cad/protection-articles.mjs'
with out.open('w') as f:
 f.write('// Generated by tools/build-protection-catalog.py. Factual article tuples, never combinatorial ranges.\n')
 f.write('export const catalogDate="2026-11-19";\nexport const catalogSources='+json.dumps({'hager-2026':{'label':'Hager Schweiz · Katalog Mai 2026','url':hager},'abb-2024':{'label':'ABB · Niederspannung 2024, Stand 10/2023','url':abb},'feller-live':{'label':'Feller / Schneider · Online-Katalog','url':'https://online-katalog.feller.ch/de/products?levels=10220'}},ensure_ascii=False)+';\n')
 f.write('export const protectionArticles=[\n'+',\n'.join(json.dumps(x,ensure_ascii=False,separators=(',',':')) for x in articles.values())+'\n];\n')
print(len(articles),collections.Counter((a['manufacturer'],a['kind']) for a in articles.values()))
