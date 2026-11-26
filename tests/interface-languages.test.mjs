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
