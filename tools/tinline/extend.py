"""Append indexed symbol libraries without changing any existing template ID or geometry.

Usage: extend.py ARCHIVE WORKDIR [DRIVE_INVENTORY]
The optional inventory restricts input to observed files and verifies their byte sizes.
Support-only ZZ01/tinContact/tinData folders are not independent picker symbols.
"""
import argparse, hashlib, json, pathlib, re, zipfile, xml.etree.ElementTree as ET
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('workdir',type=pathlib.Path);p.add_argument('inventory',nargs='?');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2]
cat=json.loads((root/'cad/templates/catalog.json').read_text())
existing={t['source'] for t in cat['items']}
inventory={f['path']:f for f in json.loads(pathlib.Path(a.inventory).read_text())} if a.inventory else None
(a.workdir/'input').mkdir(parents=True,exist_ok=True)
manifest=[]
with zipfile.ZipFile(a.archive) as z:
 names=set(z.namelist())
 for source in sorted(names):
  parts=source.split('/')
  if len(parts)<3 or parts[0]!='Symbole TinLine' or parts[1] in ['ZZ01','tinData','tinContact'] or not source.lower().endswith('.dwg') or source in existing:continue
  if inventory is not None:
   current=inventory.get('/'.join(parts[1:]))
   if not current:continue
   if z.getinfo(source).file_size!=current['size']:raise ValueError('Source changed: '+source)
  stem=pathlib.PurePosixPath(source).stem;name=re.sub(r'^[A-Z]\d{4}[_ ]?', '', stem).replace('_',' ')
  xml=source[:-4]+'.xml'
  if xml in names:
   try:
    tree=ET.fromstring(z.read(xml));desc=tree.findtext('.//SymbolInfo/Bez') or tree.findtext('.//Language_de/Bez');typ=tree.findtext('.//SymbolInfo/Type')
    if desc and desc.strip():name=desc.strip()+(' · '+typ.strip() if typ and typ.strip() else '')
   except ET.ParseError:pass
  id='tlx-'+hashlib.sha256(source.encode()).hexdigest()[:16]
  meta=dict(id=id,name=name,source=source,category='Dispo' if (parts[1].startswith('184-') or '/50Schaltschrank/' in source) else 'Schema',group=parts[-2])
  manifest.append(meta);(a.workdir/'input'/(id+'.dwg')).write_bytes(z.read(source))
(a.workdir/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False))
print('Prepared',len(manifest),'additional drawings; existing IDs preserved')
