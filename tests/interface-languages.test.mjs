import test from 'node:test';
import assert from 'node:assert/strict';
import {languages, validLanguage, makeTranslator, uiText, useCatalogue, promptMessage} from '../ui/locale-text.mjs';

test('German is the default irrespective of the browser locale', () => {
  assert.deepEqual(Object.keys(languages), ['de', 'fr', 'it', 'en']);
  for (const value of [null, '', 'es', '__proto__', 'constructor']) assert.equal(validLanguage(value), 'de');
  for (const code of Object.keys(languages)) {
    assert.equal(validLanguage(code), code);
    assert.equal(languages[code].tag, code + '-CH');
  }
});

test('messages can reorder values and names are never interpreted as translation keys', () => {
  const translate = makeTranslator({'Lager':'Stock', '⟦1⟧ Einträge in ⟦7⟧':'⟦7⟧ contains ⟦1⟧ entries'});
  assert.equal(translate('8 Einträge in Lager'), 'Lager contains 8 entries');
  assert.equal(translate('8 Einträge in Werkstatt  Nord'), 'Werkstatt  Nord contains 8 entries');
  assert.equal(translate('8 Einträge in '), '8 Einträge in ');
});

test('native dialogs translate their message and preserve the proposed input', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'prompt');
  const calls = [];
  globalThis.prompt = (...args) => { calls.push(args); return args[1]; };
  t.after(() => {
    useCatalogue();
    if (original) Object.defineProperty(globalThis, 'prompt', original);
    else delete globalThis.prompt;
  });
  useCatalogue({Projektname:'Nom du projet', Lager:'Stock'});
  assert.equal(promptMessage('Projektname', 'Lager'), 'Lager');
  assert.deepEqual(calls, [['Nom du projet', 'Lager']]);
  useCatalogue();
  assert.equal(uiText('Projektname'), 'Projektname');
});

import {readFileSync, readdirSync} from 'node:fs';
const load = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('all public and tool pages load the shared language picker from their own directory', () => {
  const pages = dir => readdirSync(new URL('../' + dir, import.meta.url)).filter(file => file.endsWith('.html'));
  for (const [dir,prefix] of [['',''],['produkte/','../']]) {
    for (const file of pages(dir)) {
      const html = load(dir + file);
      assert.ok(html.includes('src="' + prefix + 'ui/language.mjs"'), dir + file);
      assert.ok(html.includes('href="' + prefix + 'ui/language.css"'), dir + file);
    }
  }
});

test('each catalogue covers quotes, orders, inventory and account access without changing placeholders', () => {
  const expected = {
    en: ['Quotation','Order','Inventory','Sign in','Allow support access?'],
    fr: ['Offre','Commande','Stock','Se connecter','Autoriser l’accès au support ?'],
    it: ['Offerta','Ordine','Magazzino','Accedi','Consentire l’accesso all’assistenza?'],
  };
  for (const [code, values] of Object.entries(expected)) {
    const catalogue = JSON.parse(load('ui/locales/' + code + '.json'));
    const translate = makeTranslator(catalogue);
    assert.deepEqual(['Offerte','Auftrag','Lager','Anmelden','Supportzugriff erlauben?'].map(translate), values);
    for (const [source,target] of Object.entries(catalogue)) {
      assert.equal(typeof target, 'string');
      assert.deepEqual((source.match(/⟦\d+⟧/g)||[]).sort(), (target.match(/⟦\d+⟧/g)||[]).sort(), code + ': ' + source);
    }
    assert.ok(translate('Projekt «Werkstatt Nord» löschen?').includes('Werkstatt Nord'));
  }
});
