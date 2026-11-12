"""Extract only the indexed DWGs from the user-supplied archive. No ZIP paths are written directly."""
import argparse
import json
import pathlib
import zipfile
parser=argparse.ArgumentParser()
parser.add_argument('archive',type=pathlib.Path)
parser.add_argument('workdir',type=pathlib.Path)
args=parser.parse_args()
catalog=pathlib.Path(__file__).resolve().parents[2]/'cad/templates/catalog.json'
items=json.loads(catalog.read_text())['items']
manifest=[{k:t[k] for k in ('id','name','source','category','group')} for t in items]
(args.workdir/'input').mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.archive) as z:
 for t in manifest:
  if not t['id'].startswith('tl-') or not t['id'][3:].isdigit():raise ValueError('Invalid template ID')
  (args.workdir/'input'/(t['id']+'.dwg')).write_bytes(z.read(t['source']))
(args.workdir/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False))
print(f'{len(manifest)} source drawings prepared')
