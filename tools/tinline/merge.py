"""Append a rendered extension to the repository, refusing to overwrite existing IDs."""
import json, pathlib, re, shutil, sys
from datetime import date

source = pathlib.Path(sys.argv[1])
target = pathlib.Path(__file__).resolve().parents[2] / 'cad/templates'
catalog = json.loads((target / 'catalog.json').read_text())
extension = json.loads((source / 'catalog.json').read_text())
ids = {x['id'] for x in catalog['items']}
paths = {x['source'] for x in catalog['items']}
for item in extension['items']:
    if not re.fullmatch(r'tlx-[a-f0-9]{16}', item['id']):
        raise ValueError('Not an extension ID: ' + item['id'])
    if item['id'] in ids or item['source'] in paths:
        raise ValueError('Existing template would be overwritten: ' + item['id'])
    if not (source / (item['id'] + '.json')).is_file():
        raise ValueError('Missing vector file: ' + item['id'])
for item in extension['items']:
    shutil.copyfile(source / (item['id'] + '.json'), target / (item['id'] + '.json'))
catalog['items'] += extension['items']
excluded = {x['source']: x for x in catalog.get('excluded', []) + extension.get('excluded', [])}
catalog['excluded'] = [x for path, x in excluded.items() if path not in {t['source'] for t in catalog['items']}]
catalog['version'] = 3
catalog['importSummary'] = dict(previous=sum(t['id'].startswith('tl-') for t in catalog['items']),
    added=sum(t['id'].startswith('tlx-') for t in catalog['items']), excluded=len(catalog['excluded']), date=str(date.today()))
(target / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')))
print('Catalog now contains', len(catalog['items']), 'templates;', len(catalog['excluded']), 'excluded')
