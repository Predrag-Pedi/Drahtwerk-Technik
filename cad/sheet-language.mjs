import rows from './sheet-terms.mjs';
import {cadTerm} from './template-language.mjs';

const terms = new Map(rows.map(([source, en, fr, it]) => [source, {en, fr, it}]));
const entities = {amp: '&', quot: '"', lt: '<', gt: '>', apos: "'"};
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Standard sheets were imported from a vector PDF. Reassemble consecutive glyphs
// on the same baseline while keeping symbols, technical values and linework intact.
export function localizeSheet(svg, language) {
  if (!['en', 'fr', 'it'].includes(language)) return svg;
  return svg.replace(/(?:<use\b[^>]*\bdata-text="[^"]*"[^>]*\/>\s*)+/g, chunk => {
    let row = [], result = '', consumed = 0;
    function flush() {
      if (!row.length) return;
      const {x, y, size} = row[0], source = row.map(g => g.text).join('');
      const label = (terms.get(source + '@' + Math.round(y)) ?? terms.get(source))?.[language] ?? cadTerm(source, language);
      if (label === source) result += row.map(g => g.svg).join('');
      else {
        const width = Math.max(size, row.at(-1).x - x + size * 0.6);
        const fit = label.length * size * 0.55 > width ? ` textLength="${width.toFixed(2)}" lengthAdjust="spacingAndGlyphs"` : '';
        result += `<text x="${x}" y="${y}" fill="#000" stroke="none" font-family="Arial,sans-serif" font-size="${size}"${fit}>${escape(label)}</text>`;
      }
      row = [];
    }
    for (const [svg, encoded, transform] of chunk.matchAll(/<use\s+data-text="([^"]*)"[^>]*?transform="matrix\(([^)]+)\)"[^>]*\/>\s*/g)) {
      consumed += svg.length;
      const [a, b, c, d, x, y] = transform.split(',').map(Number), size = Math.abs(a), orientation = [a,b,c,d].join(',');
      const prev = row.at(-1);
      if (prev && (prev.orientation !== orientation || Math.abs(prev.y - y) > .15 || x < prev.x - .2 || x > prev.x + size * 1.5)) flush();
      const text = encoded.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&(amp|quot|lt|gt|apos);/g, (_, name) => entities[name]);
      row.push({svg, text, orientation, x, y, size});
    }
    flush();
    return consumed === chunk.length ? result : chunk;
  });
}
