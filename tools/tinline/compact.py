"""Compact consecutive unfilled strokes after enrichment; preserve geometry and paint order.

Usage: compact.py OUTPUT_DIRECTORY
Only over-budget drawings are changed. Filled glyphs/masks remain separate.
Run before details.py, which records path hashes.
"""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1])
count = 0
for meta in json.loads((root / 'catalog.json').read_text())['items']:
    path = root / (meta['id'] + '.json')
    obj = json.loads(path.read_text())
    if len(obj['paths']) <= 15000:
        continue
    result = []
    for stroke in obj['paths']:
        previous = result[-1] if result else None
        if (previous and stroke['d'].startswith('M') and stroke['fill'] == previous['fill'] == 'none'
                and stroke['stroke'] == previous['stroke'] and stroke['sw'] == previous['sw']
                and len(previous['d']) + len(stroke['d']) < 450000):
            previous['d'] += ' ' + stroke['d']
        else:
            result.append(dict(stroke))
    if len(result) > 15000:
        raise ValueError('Drawing still exceeds path budget: ' + meta['id'])
    obj['paths'] = result
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')))
    count += 1
print('Compacted', count, 'drawings')
