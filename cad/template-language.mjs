import rows from './template-terms.mjs';

// Drawing files use stable language codes independently of the interface catalogue.
export const languages = {de:{name:'Deutsch'},fr:{name:'Français'},it:{name:'Italiano'},en:{name:'English'}};
export const validLanguage = language => Object.hasOwn(languages, language) ? language : 'de';
const column = {en: 1, fr: 2, it: 3};
const key = value => value.normalize('NFC').toLowerCase();
const terms = new Map(rows.map(row => [key(row[0]), row]));
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alternatives = [...terms.keys()].sort((a, b) => b.length - a.length).map(escapePattern);
const termPattern = new RegExp('(?<![\\p{L}\\p{N}])(?:' + alternatives.join('|') + ')(?![\\p{L}\\p{N}])', 'giu');

export function cadTerm(source, language) {
  const row = terms.get(key(source)), translated = row?.[column[language]];
  return !translated || translated === row[0] ? source : translated;
}

// Library names combine technical terms, manufacturer names and order numbers.
export function libraryCaption(source, language, preserveArticle = false) {
  if (!column[language]) return source;
  if (terms.has(key(source))) return cadTerm(source, language);
  // Imported manufacturer captions append the original article number after a middle dot.
  const suffix = preserveArticle ? source.indexOf(' · ') : -1;
  const name = suffix < 0 ? source : source.slice(0, suffix);
  return name.replace(termPattern, word => cadTerm(word, language)) + (suffix < 0 ? '' : source.slice(suffix));
}

// Only known source labels with editable outlines can be replaced on a drawing.
export function templateDefault(field, language) {
  const source = field.text;
  if (!column[language] || !field.hashes?.length || !field.runs?.length) return source;
  if (terms.has(key(source))) return cadTerm(source, language);
  // Only dimensions, reference numbers and units may follow these stock labels.
  const match = /^(Aussen-Flansch|Aussparung|Aussen|Innen|Wohnung|Haus|Hobbyraum|Treppenhaus|Steckdose|Fundamenterder|Modell)([ :]+)([.\d][\d., x×/²a-zA-Z-]*|(?:CEE|T)\d+)$/u.exec(source);
  return match ? cadTerm(match[1], language) + match[2] + match[3] : source;
}

const sheetTitles = {cover:'Deckblatt',index:'Inhaltsverzeichnis',conditions:'Anschluss- und Umgebungsbedingungen',
  symbols:'Symbolverzeichnis',notes:'Allgemeine Hinweise',schema:'Elektroschema',dispo:'Disposition'};
export function drawingPageTitle(page, language) {
  if (page.title === 'Seite ' + page.number) return cadTerm('Seite', language) + ' ' + page.number;
  return page.title === sheetTitles[page.standardType || page.type] ? cadTerm(page.title, language) : page.title;
}
