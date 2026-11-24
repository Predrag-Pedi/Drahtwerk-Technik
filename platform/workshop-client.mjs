import {api, account, serverMode} from './client.mjs';
import {railProfiles, parseWireColors, standardDocuments, templateTools} from './workshop-model.mjs';

export function templateNotice(tool, result, error = '') {
  let notice = document.getElementById('workshopTemplateNotice');
  if (!notice) {
    notice = document.createElement('div'); notice.id = 'workshopTemplateNotice';
    notice.style.cssText = 'margin:12px 0;padding:12px 16px;border:1px solid #c9dcec;border-radius:10px;background:#f1f7fc;color:#173c62;font-size:14px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    (document.querySelector('main') || document.body).prepend(notice);
  }
  notice.replaceChildren();
  notice.removeAttribute('role');
  const text = document.createElement('span');
  text.textContent = error || (result.source === 'company' ? 'Firmenvorlage · ' + account.company.name : 'Gemeinsamer Standard') + ' · ' + templateTools[tool];
  if (error) notice.setAttribute('role', 'alert');
  notice.append(text);
  if (error) {
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Erneut laden';
    retry.onclick = () => location.reload(); notice.append(retry);
  }
  if (serverMode && account?.company && account.permissions[tool] === 'write') {
    const link = document.createElement('a'); link.href = '/portal.html?section=workshop&tool=' + tool;
    link.textContent = account.permissions[tool] === 'write' ? 'Firmenvorlage bearbeiten' : 'Firmenvorlage ansehen'; notice.append(link);
  }
}
export async function loadWorkshop(tool) {
  try {
    let result;
    if (serverMode) result = await api('/company/workshop/' + tool, {timeoutMs: 15000});
    else if (tool === 'rails') result = {value: railProfiles(), source: 'standard', revision: 0};
    else {
      const path = {wireColors: 'drahtfarben.txt', ew: 'ew-dateien.json', spacing: 'aufbau-dateien.json'}[tool];
      const response = await fetch(path, {cache: 'no-store'});
      if (!response.ok) throw Error('Werkstattvorlage konnte nicht geladen werden.');
      const value = tool === 'wireColors' ? parseWireColors(await response.text()) : standardDocuments(tool, await response.json());
      result = {value, source: 'standard', revision: 0};
    }
    if (!result?.value || typeof result.value !== 'object') throw Error('Die Werkstattvorlage konnte nicht vollständig geladen werden. Bitte erneut laden.');
    templateNotice(tool, result); return result;
  } catch (error) {templateNotice(tool, null, error.message); throw error;}
}
