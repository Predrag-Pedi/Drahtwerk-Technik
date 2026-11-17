"""Keep extension text metadata with each lazily loaded template.

Run after details.py. The legacy metadata file remains available for old projects;
new templates carry their own validated text metadata and do not enlarge startup data.
"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[2] / 'cad'
path = root / 'template-details.json'
details = json.loads(path.read_text())
count = 0
for meta in json.loads((root / 'templates/catalog.json').read_text())['items']:
    key = meta['id']
    if not key.startswith('tlx-') or key not in details:
        continue
    target = root / 'templates' / (key + '.json')
    obj = json.loads(target.read_text())
    obj['details'] = details.pop(key)
    target.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')))
    count += 1
path.write_text(json.dumps(details, ensure_ascii=False, separators=(',', ':')))
print('Embedded metadata in', count, 'additional templates; legacy records:', len(details))
