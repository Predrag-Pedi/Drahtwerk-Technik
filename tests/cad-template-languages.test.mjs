import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {project, validateProject, addStandardPages} from '../cad/model.mjs';
import {svgPage} from '../cad/render.mjs';
import {templateMarkup} from '../cad/template.mjs';
import {drawingText, applyDrawingText} from '../cad/text-edit.mjs';
import {libraryCaption, drawingPageTitle, templateDefault} from '../cad/template-language.mjs';
import {filterLibrary, artworkLanguage} from '../cad/library.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const details = read('../cad/template-details.json');

test('drawing language survives a project round trip and older drawings open in German', () => {
  for (const language of ['de','en','fr','it']) {
    const original = project('UV École', language);
    assert.equal(validateProject(JSON.parse(JSON.stringify(original))).drawingLanguage, language);
  }
  const old = project();
  delete old.drawingLanguage;
  assert.equal(validateProject(old).drawingLanguage, 'de');
  assert.equal(validateProject({...old, drawingLanguage: 'xx'}).drawingLanguage, 'de');
  assert.equal(drawingPageTitle({title:'Legende', type:'schema'},'fr'), 'Legende');
  assert.equal(drawingPageTitle({title:'Seite 10',number:10,type:'schema'},'it'), 'Pagina 10');
});

test('all five original standard sheets localize at export time, including PDF glyphs and sheet references', () => {
  const d = addStandardPages(project('Werkstatt <Nord>'));
  const sheets = ['cover','index','conditions','symbols','notes'].map(kind => d.pages.find(p => p.standardType === kind));
  const expected = {
    en:['Order number:', 'Table of contents', 'Rated current:', 'Kilowatt-hour', '1. Material specifications'],
    fr:['N° de commande :', 'Table des matières', 'Courant assigné :', 'Compteur de', '1. Spécifications du matériel'],
    it:['N. ordine:', 'Indice', 'Corrente nominale:', 'Contatore di', '1. Specifiche dei materiali'],
  };
  for (const [language, labels] of Object.entries(expected)) {
    d.drawingLanguage = language;
    sheets.forEach((page, i) => {
      const svg = svgPage(d,page);
      assert.ok(svg.includes('>'+labels[i]+'</text>'), language+' '+page.standardType);
      assert.ok(svg.includes('Werkstatt &lt;Nord&gt;'));
      assert.doesNotMatch(svg,/NaN|undefined/);
    });
  }
  d.drawingLanguage = 'de';
  assert.match(svgPage(d,sheets[0]), /data-text="S"/);
  assert.doesNotMatch(svgPage(d,sheets[0]), />Order number:</);
});

test('macro drawing and text editor use the same defaults and preserve even empty manual overrides', () => {
  const t = {...read('../cad/templates/tl-0015.json'), details: details['tl-0015']};
  const d = project('Test','it'), p = d.pages[1], e = {template:t};
  const field = t.details.texts.find(f=>f.text==='Wärmepumpe');
  const markup = () => templateMarkup(t,100,100,{},e.textEdits,false,'',{},'original',d.drawingLanguage);
  assert.equal(drawingText(d,p,e,field.key).value, 'Pompa di calore');
  assert.ok(markup().includes('>Pompa di calore</text>'));
  applyDrawingText(d,p,e,field.key,'WP Nord <1>');
  d.drawingLanguage='fr';
  assert.ok(markup().includes('>WP Nord &lt;1&gt;</text>'));
  assert.equal(drawingText(d,p,e,field.key).value,'WP Nord <1>');
  applyDrawingText(d,p,e,field.key,'');
  assert.ok(!markup().includes('Pompe à chaleur'));
  applyDrawingText(d,p,e,field.key,'',{reset:true});
  assert.equal(drawingText(d,p,e,field.key).value, 'Pompe à chaleur');
  assert.equal(t.details.texts.find(f=>f.key===field.key).text,'Wärmepumpe');
  for(const value of ['L1','PE','10F2.1','3x16A','FE0 5x6mm2','RsE']) {
    assert.equal(templateDefault({...field,text:value},'fr'), value);
  }
  assert.equal(templateDefault({...field,text:'Aussparung: 650x750x240'},'fr'),'Évidement: 650x750x240');
  assert.equal(templateDefault({...field,hashes:[]},'fr'),field.text);
});

test('search accepts translated and original terms, identifies native artwork and retains article numbers', () => {
  const items=read('../cad/templates/catalog.json').items;
  for(const [language,query] of [['fr','disjoncteur differentiel'],['en','RCBO'],['it','differenziale'],['fr','FI/LS']]) {
    const result=filterLibrary(items,{language,query,category:'Makro'});
    assert.ok(result.some(t=>t.id==='tl-0028'), language+' '+query);
  }
  for(const language of ['fr','it']){
    const first=filterLibrary(items,{language,query:'Bedienstelle'})[0];
    assert.equal(artworkLanguage(first),language);
  }
  assert.equal(libraryCaption('Zähler · LS-100','fr',true),'Compteur · LS-100');
});
