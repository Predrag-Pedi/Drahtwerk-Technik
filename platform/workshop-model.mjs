export const templateTools = {
  rails: 'Schienenregeln', wireColors: 'Drahtfarben', ew: 'EW-Unterlagen', spacing: 'Aufbauabstände',
};

// Existing workshop dimensions; quantities belong to the current calculation.
export const standardRails = [
  ['side', 'Seitenprof', 'h', 40], ['middle', 'N5 Mittelabstützung', 'h', 40],
  ['top-rail', 'Schiene Oben', 'w', 40], ['bottom-rail', 'Schiene Unten', 'w', 40],
  ['bottom-profile', 'Prof Unten', 'w', 40], ['din', 'Din', 'w', 15],
  ['n5', 'N5', 'w', 15], ['galip', 'Galip', 'w', 30], ['din-terminals', 'Din Klemmen', 'w', 30],
  ['n5-tube', 'N5 Rohr', 'w', 30], ['zps', 'ZPS', 'w', 35],
  ['din-short', 'Din nicht durchgezogen', 'w', 258], ['n5-short', 'N5 nicht durchgezogen', 'w', 258],
  ['terminals-short', 'Din klemmen nicht durchgezogen', 'w', 268], ['smissline', 'Smissline', 'h', 90],
].map(([id, label, dimension, deduction]) => ({id, label, dimension, deduction}));

// Pre-depth templates belong to 165 mm. Reading them never changes stored data.
export function railProfiles(value = {rows: standardRails}) {
  return structuredClone(Array.isArray(value.profiles) ? value : {
    version: 2, profiles: [{id: 'depth-165', depth: 165, rows: value.rows}],
  });
}
export function railProfileForDepth(value, depth) {
  const mm = Number(depth);
  return Number.isInteger(mm) && mm > 0 ? railProfiles(value).profiles.find(p => p.depth === mm) ?? null : null;
}

export function parseWireColors(source) {
  const groups = [];
  let current;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      current = {id: 'group-' + groups.length, name: line.slice(1, -1), rows: []};
      groups.push(current);
    } else if (current) {
      const fields = line.split('|').map(s => s.trim());
      if (fields.length < 4) continue;
      const [name, size, wire] = fields, color = fields.slice(3).join('|');
      current.rows.push({id: current.id + '-row-' + current.rows.length, name, size, wire, color});
    }
  }
  return {groups};
}

export function standardDocuments(tool, manifest) {
  return {folders: manifest.folders.map((folder, i) => ({
    id: 'folder-' + i, name: folder.name, info: folder.info || '',
    [tool === 'ew' ? 'files' : 'images']: (tool === 'ew' ? folder.files : folder.images).map((file, j) => {
      const path = typeof file === 'string' ? file : file.path;
      return {id: 'document-' + i + '-' + j, name: typeof file === 'string' ? path.split('/').pop() : file.name, path};
    }),
  }))};
}

export const railLength = (row, dimensions) => Math.max(0, (Number(dimensions[row.dimension]) || 0) - row.deduction);
export const csvCell = value => '"' + String(value).replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""') + '"';
