import {account, serverMode, localScope} from './client.mjs';
import {loadWorkshop} from './workshop-client.mjs';
import {railLength, csvCell} from './workshop-model.mjs';
const $ = id => document.getElementById(id);
try {
  const {value, source} = await loadWorkshop('rails'), specs = value.rows;
  const storageKey = (serverMode ? localScope() : '') + 'workshop-rails-v3';
  const empty = () => ({width: '', height: '', depth: '', qty: {}});
  let state = empty();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') state = {...state, ...saved, qty: saved.qty || {}};
    else if (!serverMode) {
      const legacy = JSON.parse(localStorage.getItem('dw_schienen_v2'));
      if (legacy) state = {...state, width: legacy.width || '', height: legacy.height || '', depth: legacy.depth || '', qty: Object.fromEntries(specs.map((s, i) => [s.id, legacy.qty?.[i] || '']))};
    }
  } catch {}
  const dimensions = () => ({w: state.width, h: state.height, d: state.depth});
  const qty = row => Math.max(0, Math.floor(Number(state.qty[row.id]) || 0));
  const persist = () => {try {localStorage.setItem(storageKey, JSON.stringify(state));} catch {}};
  const basis = row => dimensions()[row.dimension];
  const valid = row => basis(row) !== '' && railLength(row, dimensions()) > 0;
  function updateTotals() {
    let totalQ = 0, totalL = 0, active = 0;
    for (const [i, row] of specs.entries()) {
      const q = qty(row), len = railLength(row, dimensions());
      if (q) {totalQ += q; active++; if (valid(row)) totalL += len * q;}
      $('sum' + i).textContent = q && valid(row) ? (len * q).toLocaleString('de-CH') : '–';
    }
    $('totalQty').textContent = totalQ.toLocaleString('de-CH'); $('totalLen').textContent = totalL.toLocaleString('de-CH');
    $('meters').textContent = (totalL / 1000).toLocaleString('de-CH', {maximumFractionDigits: 3}) + ' m'; $('active').textContent = active;
  }
  function render() {
    $('rows').replaceChildren();
    specs.forEach((row, i) => {
      const tr = document.createElement('tr'); tr.className = qty(row) ? 'active' : 'inactive';
      const name = document.createElement('td'); name.textContent = row.label;
      const length = document.createElement('td'); length.className = 'num';
      length.textContent = basis(row) === '' ? '–' : valid(row) ? railLength(row, dimensions()).toLocaleString('de-CH') : 'Ungültig';
      const quantity = document.createElement('td'); quantity.className = 'qty';
      const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric'; input.value = state.qty[row.id] || '';
      input.setAttribute('aria-label', 'Stückzahl ' + row.label);
      input.oninput = () => {state.qty[row.id] = input.value; tr.className = qty(row) ? 'active' : 'inactive'; persist(); updateTotals();}; quantity.append(input);
      const sum = document.createElement('td'); sum.className = 'num'; sum.id = 'sum' + i;
      tr.append(name, length, quantity, sum); $('rows').append(tr);
    }); updateTotals();
  }
  for (const key of ['width', 'height', 'depth']) {
    $(key).value = state[key]; $(key).oninput = () => {state[key] = $(key).value; persist(); render();};
  }
  $('reset').onclick = () => {
    if (!confirm('Alle Eingaben dieser Berechnung leeren?')) return;
    state = empty(); for (const key of ['width', 'height', 'depth']) $(key).value = ''; persist(); render();
  };
  $('export').onclick = () => {
    if (specs.some(row => qty(row) && !valid(row))) {alert('Für die gewählten Schienen fehlen gültige Masse. Bitte die Eingaben prüfen.'); return;}
    const lines = [['Schienenrechner', source === 'company' ? account.company.name : 'Standard'], ['Breite (mm)', state.width], ['Höhe (mm)', state.height], ['Tiefe (mm)', state.depth], [], ['Schiene', 'Länge (mm)', 'Stück', 'Gesamt (mm)']];
    specs.forEach(row => {const len = railLength(row, dimensions()); lines.push([row.label, valid(row) ? len : '', state.qty[row.id] || '', valid(row) ? len * qty(row) : '']);});
    const csv = '\ufeff' + lines.map(r => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'Schienenliste.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  render();
} catch (error) {
  $('rows').replaceChildren();
  for (const key of ['width', 'height', 'depth', 'export', 'reset']) $(key).disabled = true;
  console.error(error);
}
