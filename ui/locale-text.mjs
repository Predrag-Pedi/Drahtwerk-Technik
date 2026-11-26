export const languages = {
  de: {name: 'Deutsch', tag: 'de-CH', label: 'Sprache', error: 'Die Sprache konnte nicht geladen werden.'},
  fr: {name: 'Français', tag: 'fr-CH', label: 'Langue', error: 'Impossible de charger la langue.'},
  it: {name: 'Italiano', tag: 'it-CH', label: 'Lingua', error: 'Impossibile caricare la lingua.'},
  en: {name: 'English', tag: 'en-CH', label: 'Language', error: 'Could not load the language.'},
};
export const validLanguage = lang => Object.hasOwn(languages, lang) ? lang : 'de';

const slots = /(⟦\d+⟧)/g;
const isSlot = s => /^⟦\d+⟧$/.test(s);
// Match literal separators from left to right. The work remains bounded even
// when a long project name repeats a separator from the message template.
function substitutions(text, literals) {
  if (!text.startsWith(literals[0]) || !text.endsWith(literals.at(-1))) return;
  let start = literals[0].length;
  const values = [];
  for (let i = 1; i < literals.length; i++) {
    const separator = literals[i];
    const end = i === literals.length - 1 ? text.length - separator.length : text.indexOf(separator, start + 1);
    if (end <= start) return;
    values.push(text.slice(start, end));
    start = end + separator.length;
  }
  return values;
}

// The catalogue only describes application copy. Substitutions (names, numbers,
// article references, etc.) are copied from the source, never translated.
export function makeTranslator(catalogue = {}) {
  const patterns = [];
  for (const [key, target] of Object.entries(catalogue)) {
    if (!key.includes('⟦')) continue;
    const parts = key.split(slots);
    const literals = parts.filter(p => !isSlot(p));
    const anchor = literals.reduce((a, b) => a.length >= b.length ? a : b, '').trim();
    if (!/[\p{L}]{3}/u.test(anchor)) continue;
    const order = parts.filter(isSlot);
    // Adjacent free-text slots cannot be separated reliably.
    if (literals.length !== order.length + 1 || literals.slice(1, -1).includes('') ||
        (anchor.length < 5 && !/^⟦\d+⟧ (?:von|bis) ⟦\d+⟧$/u.test(key))) continue;
    patterns.push({anchor, literals, order, target, specificity: literals.join('').length});
  }
  patterns.sort((a, b) => b.specificity - a.specificity);
  return function translate(source) {
    if (typeof source !== 'string' || !/[\p{L}]/u.test(source)) return source;
    const key = source.trim().replace(/\s+/gu, ' ');
    let target = Object.hasOwn(catalogue, key) ? catalogue[key] : undefined;
    if (target === undefined && key.length <= 1000) {
      for (const pattern of patterns) {
        if (!key.includes(pattern.anchor)) continue;
        const match = substitutions(source.trim(), pattern.literals);
        if (!match) continue;
        target = pattern.target.replace(slots, slot => match[pattern.order.indexOf(slot)]);
        break;
      }
    }
    if (!target || target === key) return source;
    return source.slice(0, source.length - source.trimStart().length) + target + source.slice(source.trimEnd().length);
  };
}

let active = value => value;
export function useCatalogue(catalogue) { active = catalogue ? makeTranslator(catalogue) : value => value; }
export function uiText(source) { return active(source); }
export const confirmMessage = message => globalThis.confirm(uiText(message));
export const alertMessage = message => globalThis.alert(uiText(message));
export const promptMessage = (message, initial = '') => globalThis.prompt(uiText(message), initial);
