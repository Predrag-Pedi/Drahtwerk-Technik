import {alertMessage as alert, confirmMessage as confirm} from '../ui/locale-text.mjs';
import {account, serverMode, localScope} from './client.mjs';
import {loadWorkshop, templateNotice} from './workshop-client.mjs';
import {railLength, railProfiles, railProfileForDepth, csvCell} from './workshop-model.mjs';
const $ = id => document.getElementById(id);
try {
  const {value, source} = await loadWorkshop('rails'), template = railProfiles(value);
  const storageKey = (serverMode ? localScope() : '') + 'workshop-rails-v3';
  const empty = () => ({width: '', height: '', depth: template.profiles.some(p => p.depth === 165) ? '165' : String(template.profiles[0].depth), qtyByProfile: {}});
  let state = empty();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      state = {...state, width: saved.width ?? '', height: saved.height ?? '', depth: saved.depth || state.depth, qtyByProfile: saved.qtyByProfile || {}};
      // The old single list is now the 165 mm profile, even if another depth was typed before.
      const legacy = template.profiles.find(p => p.depth === 165);
      if (!saved.qtyByProfile && legacy) state.qtyByProfile[legacy.id] = saved.qty || {};
    } else if (!serverMode) {
      const legacy = JSON.parse(localStorage.getItem('dw_schienen_v2')), profile = template.profiles.find(p => p.depth === 165);
      if (legacy && profile) state = {...state, width: legacy.width || '', height: legacy.height || '', depth: legacy.depth || '165', qtyByProfile: {[profile.id]: Object.fromEntries(profile.rows.map((s, i) => [s.id, legacy.qty?.[i] || '']))}};
    }
  } catch {}
  let profile, specs = [];
  const dimensions = () => ({w: state.width, h: state.height, d: state.depth});
  const quantities = () => profile ? (state.qtyByProfile[profile.id] ||= {}) : {};
  const qty = row => Math.max(0, Math.floor(Number(quantities()[row.id]) || 0));
  const persist = () => {try {localStorage.setItem(storageKey, JSON.stringify(state));} catch {}};
  const basis = row => dimensions()[row.dimension];
  const valid = row => Number(basis(row)) > 0 && railLength(row, dimensions()) > 0;
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
    profile = railProfileForDepth(template, state.depth); specs = profile?.rows || [];
    $('rows').replaceChildren();
    $('railProfileStatus').textContent = profile ? `Vorlage für ${profile.depth} mm · ${specs.length} ${specs.length===1?'Schiene':'Schienen'}` : state.depth === '' ? 'Bitte eine Verteilungstiefe eingeben.' : `Für ${state.depth} mm ist keine Schienenliste eingerichtet.`;
    $('export').disabled = !profile; $('printRails').disabled = !profile;
    for (const button of $('depthChoices').children) button.setAttribute('aria-pressed', String(Number(button.dataset.depth) === profile?.depth));
    if (!profile) {
      const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 4; td.className = 'rails-empty';
      td.textContent = 'Wähle eine eingerichtete Tiefe. Mitarbeitende mit Schreibrecht können weitere Schienenlisten unter «Firmenvorlage bearbeiten» ergänzen.'; tr.append(td); $('rows').append(tr);
    }
    specs.forEach((row, i) => {
      const tr = document.createElement('tr'); tr.className = qty(row) ? 'active' : 'inactive';
      const name = document.createElement('td'); name.className = 'rail-name'; name.textContent = row.label;
      const length = document.createElement('td'); length.className = 'num';
      length.textContent = basis(row) === '' ? '–' : valid(row) ? railLength(row, dimensions()).toLocaleString('de-CH') : 'Ungültig';
      const quantity = document.createElement('td'); quantity.className = 'qty';
      const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = '1'; input.inputMode = 'numeric'; input.value = quantities()[row.id] || '';
      input.setAttribute('aria-label', 'Stückzahl ' + row.label);
      input.oninput = () => {quantities()[row.id] = input.value; tr.className = qty(row) ? 'active' : 'inactive'; persist(); updateTotals();}; quantity.append(input);
      const sum = document.createElement('td'); sum.className = 'num'; sum.id = 'sum' + i;
      tr.append(name, length, quantity, sum); $('rows').append(tr);
    }); updateTotals();
  }
  for (const p of [...template.profiles].sort((a, b) => a.depth - b.depth)) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.dataset.depth = p.depth; button.textContent = p.depth + ' mm';
    button.onclick = () => {state.depth = String(p.depth); $('depth').value = state.depth; persist(); render();}; $('depthChoices').append(button);
  }
  for (const key of ['width', 'height', 'depth']) {
    $(key).value = state[key]; $(key).oninput = () => {state[key] = $(key).value; persist(); render();};
  }
  $('reset').onclick = () => {
    if (!confirm('Masse und Stückzahlen aller Tiefen in dieser persönlichen Berechnung leeren? Die Firmenvorlagen bleiben erhalten.')) return;
    state = empty(); for (const key of ['width', 'height', 'depth']) $(key).value = state[key]; persist(); render();
  };
  $('export').onclick = () => {
    if (!profile) return;
    if (specs.some(row => qty(row) && !valid(row))) {alert('Für die gewählten Schienen fehlen gültige Masse. Bitte die Eingaben prüfen.'); return;}
    const lines = [['Schienenrechner', source === 'company' ? account.company.name : 'Standard'], ['Breite (mm)', state.width], ['Höhe (mm)', state.height], ['Tiefe / Vorlage (mm)', profile.depth], [], ['Schiene', 'Basis', 'Abzug (mm)', 'Länge (mm)', 'Stück', 'Gesamt (mm)']];
    specs.forEach(row => {const len = railLength(row, dimensions()); lines.push([row.label, {w:'Breite',h:'Höhe',d:'Tiefe'}[row.dimension], row.deduction, valid(row) ? len : '', quantities()[row.id] || '', valid(row) ? len * qty(row) : '']);});
    const csv = '\ufeff' + lines.map(r => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = `Schienenliste-${profile.depth}mm.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  render();
} catch (error) {
  templateNotice('rails', null, error.message);
  $('rows').replaceChildren();
  for (const key of ['width', 'height', 'depth', 'export', 'reset', 'printRails']) $(key).disabled = true;
  console.error(error);
}
