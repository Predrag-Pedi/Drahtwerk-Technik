// Keep original interface strings available when switching between languages.
import {languages, validLanguage, uiText, useCatalogue} from './locale-text.mjs';

const preference = 'schaltbase.ui.language';
const attributes = ['aria-label', 'aria-description', 'aria-valuetext', 'title', 'alt', 'placeholder', 'data-label'];
const publicDemo = Boolean(document.querySelector('.hero-clip, .product-page'));
const ignore = [
  'script', 'style', 'noscript', 'svg', 'canvas', 'datalist', 'pre', 'code',
  '[translate="no"]', '[contenteditable]:not([contenteditable="false"])', '[role="option"]',
  '#projectTitle', '#projectList [data-open] strong', '#pageCaption', '#pageList [data-page] strong',
  '#inspector input', '#macroSidebar input', '[data-account-name]', '.customer-name', '.stock-item-name',
  '.customer-identity strong', '.customer-people span', '.customer-people div small',
  '#paper', '#offerPreview', '#documentPreview', '#reportPrint', '[data-offer-text]', '.account-person', '.account-avatar',
  '.document-open', '.entity-open strong', '.article-link strong', '.article-number', '.article-link small',
  '.signed-confirmation p', '.offer-identity', '.sb-support-person strong', '.report-identity', '.report-customer',
  '#offers option', '[data-ws-existing] option:not([value=""])', '[data-ws-folder] option',
].join(',');
const controls = [
  'button', 'label', 'legend', 'summary', 'nav', 'th', 'caption', 'h1', 'h2', 'h3', 'h4',
  '[role="tab"]', '[role="alert"]', '[role="status"]', '[aria-live]', '[data-storage-info]',
  '.hint', '.help', '.message', '.error', '.empty', '[class$="-empty"]', '[class$="-error"]',
  '[class$="-badge"]', '.stock-status', '.document-status', '.report-badge', 'td[colspan]', '.suite-section-heading',
  '.suite-breadcrumb', '.suite-kicker', '.account-readonly', '.developer-card', '.home', '.tile',
  '.inventory-notes', '.report-section-title p', '.confirmation-hint', '.sb-support-explanation',
  '.sb-support-meta', '.report-effort', '#reportTotals', '#documentNotes', '#statAmountLabel',
  '#stockCatalogResults', '#orderHint', '#drawingHint', '#status', '#message', '#uniwayNote',
  '[id$="Status"]', '[id$="Error"]', '[id$="Feedback"]', '[role="dialog"] > p',
  '.page-head > div > .muted', '.portal-table-empty', '.report-help',
  '#inspector label', '.portal-sidebar', '.account-menu a', '.account-menu button', '[data-ui-text]',
].join(',');
const originals = new WeakMap();
const staticText = new WeakSet();
const catalogues = new Map();
const pickers = [];
let language = 'de', wanted = 'de', revision = 0;

function preferenceValue() {
  try { return validLanguage(localStorage.getItem(preference)); } catch { return 'de'; }
}

function renderValue(node, field, value, write) {
  let bindings = originals.get(node);
  const last = bindings?.get(field);
  const source = last && value === last.rendered ? last.source : value;
  const rendered = uiText(source);
  if (source !== rendered || last) {
    if (!bindings) originals.set(node, bindings = new Map());
    bindings.set(field, {source, rendered});
    if (value !== rendered) write(rendered);
  }
}

function textNode(node, initial) {
  const el = node.parentElement;
  if (!el || el.tagName === 'TEXTAREA' || !node.data.trim() || el.closest(ignore)) return;
  if (initial) staticText.add(node);
  if (!initial && !publicDemo && !staticText.has(node) && !el.closest(controls)) return;
  renderValue(node, 'text', node.data, value => {
    // Keep the source value for existing callers that store the implicit option value.
    if (el.tagName === 'OPTION' && !el.hasAttribute('value')) el.value = el.textContent;
    node.data = value;
  });
}

function labels(el) {
  for (const attr of attributes) {
    if (el.hasAttribute(attr)) renderValue(el, attr, el.getAttribute(attr), value => el.setAttribute(attr, value));
  }
  if (el.matches('a[href^="mailto:Info@schaltbase.ch?subject="]')) {
    const url = new URL(el.href);
    renderValue(el, 'subject', url.searchParams.get('subject'), value => {
      url.searchParams.set('subject', value);
      url.search = url.search.replace(/\+/g, '%20');
      el.href = url.href;
    });
  }
  if (el.matches('meta[name="description"],meta[property="og:description"],meta[property="og:title"]')) {
    renderValue(el, 'content', el.content, value => { el.content = value; });
  }
}

function walk(root, initial = false) {
  if (root.nodeType === Node.TEXT_NODE) { textNode(root, initial); return; }
  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(ignore)) return;
  labels(root);
  const tree = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeType === Node.ELEMENT_NODE && node.matches(ignore) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = tree.nextNode(); node; node = tree.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) textNode(node, initial);
    else labels(node);
  }
}

function syncPickers() {
  for (const {select, code} of pickers) {
    select.value = language;
    select.setAttribute('aria-label', languages[language].label);
    code.textContent = language.toUpperCase();
  }
}

async function switchLanguage(request, persist) {
  const next = validLanguage(request);
  wanted = next;
  const token = ++revision;
  try {
    if (next !== 'de' && !catalogues.has(next)) {
      const response = await fetch(new URL('./locales/' + next + '.json', import.meta.url));
      if (!response.ok) throw Error('Catalogue unavailable');
      catalogues.set(next, await response.json());
    }
    if (token !== revision) return;
    language = next;
    useCatalogue(catalogues.get(next));
    document.documentElement.lang = languages[next].tag;
    walk(document.documentElement);
    syncPickers();
    document.querySelector('.sb-language-error')?.remove();
    if (persist) {
      try { localStorage.setItem(preference, next); } catch { /* Page selection still works. */ }
    }
    document.dispatchEvent(new CustomEvent('schaltbase-languagechange', {detail: next}));
  } catch {
    if (token !== revision) return;
    wanted = language;
    syncPickers();
    let error = document.querySelector('.sb-language-error');
    if (!error) {
      error = document.createElement('div');
      error.className = 'sb-language-error';
      error.setAttribute('role', 'status');
      error.translate = false;
      document.body.append(error);
    }
    error.textContent = languages[next].error;
  }
}

function addPicker(header) {
  const label = document.createElement('label');
  label.className = 'sb-language';
  label.translate = false;
  const code = document.createElement('span');
  code.setAttribute('aria-hidden', 'true');
  const select = document.createElement('select');
  for (const [value, entry] of Object.entries(languages)) {
    const option = new Option(entry.name, value);
    option.lang = entry.tag;
    select.add(option);
  }
  select.onchange = () => { void switchLanguage(select.value, true); };
  label.append(code, select);
  const before = header.querySelector(':scope > .login-link,:scope > .signin-back,:scope > #logout');
  header.insertBefore(label, before);
  pickers.push({select, code});
}

// This module is first in the static page, before workspace renderers populate it.
walk(document.documentElement, true);
document.querySelectorAll('.home-header,.signin-header,.portal-header,.dw-header,#editor>.editor-heading').forEach(addPicker);
syncPickers();
const observer = new MutationObserver(records => {
  if (language === 'de') return;
  for (const record of records) {
    if (!record.target.isConnected) continue;
    if (record.type === 'childList') {
      for (const node of record.addedNodes) if (node.isConnected) walk(node);
    } else if (record.type === 'characterData') {
      textNode(record.target, false);
    } else if (!record.target.closest(ignore)) labels(record.target);
  }
});
observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:attributes});
window.addEventListener('storage', event => {
  if ((event.key === preference || event.key === null) && preferenceValue() !== wanted) void switchLanguage(preferenceValue(), false);
});
window.addEventListener('pageshow', event => {
  if (event.persisted && preferenceValue() !== wanted) void switchLanguage(preferenceValue(), false);
});
const saved = preferenceValue();
if (saved !== 'de') void switchLanguage(saved, false);
