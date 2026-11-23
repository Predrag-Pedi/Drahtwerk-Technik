import {account, api} from './client.mjs';
import {templateTools} from './workshop-model.mjs';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newId = () => crypto.randomUUID();
const tools = () => Object.keys(templateTools).filter(k => ['read', 'write'].includes(account.permissions[k]));
const btn = (label, action, index = '', extra = '') => `<button type="button" data-ws-action="${action}" data-index="${index}" ${extra}>${label}</button>`;
const input = (path, label, value, type = 'text', required = false) => `<input aria-label="${label}" data-ws-path="${path}" value="${esc(value)}" type="${type}" ${required ? 'required' : ''} ${type === 'number' ? 'min="0" max="10000" step="any"' : 'maxlength="200"'}>`;
const table = (head, rows) => `<div class="table-wrap"><table><thead><tr>${head.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const fileURL = path => path.split('/').map(encodeURIComponent).join('/');

export function mountWorkshopEditor(root) {
  const available = tools();
  let tool = new URLSearchParams(location.search).get('tool');
  if (!available.includes(tool)) tool = available[0];
  let result, draft, files = [], usage, folderIndex = 0, dirty = false, busy = false, disposed = false, generation = 0;
  const editable = () => account.permissions[tool] === 'write';
  const docs = () => ['ew', 'spacing'].includes(tool);
  const key = () => tool === 'ew' ? 'files' : 'images';
  const endpoint = () => '/company/workshop/' + tool;
  const setDirty = () => {dirty = true; const state = root.querySelector('[data-ws-dirty]'); if (state) state.textContent = 'Ungespeicherte Änderungen';};
  const beforeUnload = e => {if (dirty || busy) {e.preventDefault(); e.returnValue = '';}};
  window.addEventListener('beforeunload', beforeUnload);
  function canLeave() {
    if (busy) {message('Bitte warten, bis die laufende Aktion abgeschlossen ist.'); return false;}
    return !dirty || confirm('Ungespeicherte Änderungen dieser Firmenvorlage verwerfen?');
  }
  function message(text, error = false) {
    if (disposed) return;
    const el = root.querySelector('[data-ws-message]'); if (!el) return;
    el.textContent = text; el.className = error ? 'ws-message ws-error' : 'ws-message'; el.setAttribute('role', error ? 'alert' : 'status');
  }
  function lock() {
    for (const el of root.querySelectorAll('button,input,select,textarea')) {
      el.disabled = busy || (!editable() && !el.hasAttribute('data-ws-view')) || el.hasAttribute('data-ws-disabled');
    }
  }
  async function load() {
    busy = true; result = null; draft = null;
    const serial = ++generation;
    root.innerHTML = '<p class="muted" role="status">Werkstattvorlage wird geladen …</p>';
    try {
      const [template, library] = await Promise.all([api(endpoint()), docs() ? api(endpoint() + '/files') : Promise.resolve(null)]);
      if (disposed || serial !== generation) return;
      result = template; draft = structuredClone(result.value); files = library?.files || []; usage = library; folderIndex = 0; dirty = false;
    } catch (e) {
      if (!disposed && serial === generation) {
        root.innerHTML = '<p role="alert"></p>' + btn('Erneut laden', 'reload'); root.querySelector('p').textContent = e.message;
      }
    } finally {
      if (!disposed && serial === generation) {busy = false; if (draft) render();}
    }
  }
  function railRows() {
    return '<p class="muted">Die Schnittlänge ergibt sich aus Breite, Höhe oder Tiefe minus Abzug. Stückzahlen werden weiterhin in der Berechnung eingegeben.</p>' + table(['Bezeichnung', 'Basis', 'Abzug (mm)', 'Reihenfolge'], draft.rows.map((r, i) => `<tr>
      <td>${input('rows.'+i+'.label','Bezeichnung',r.label,'text',true)}</td>
      <td><select aria-label="Basis" data-ws-path="rows.${i}.dimension">${[['w','Breite'],['h','Höhe'],['d','Tiefe']].map(([v,l]) => `<option value="${v}" ${v===r.dimension?'selected':''}>${l}</option>`).join('')}</select></td>
      <td>${input('rows.'+i+'.deduction','Abzug in mm',r.deduction,'number',true)}</td>
      <td class="ws-actions">${btn('↑','move-up','rows:'+i,'aria-label="Schiene nach oben"')}${btn('↓','move-down','rows:'+i,'aria-label="Schiene nach unten"')}${btn('Entfernen','rail-remove',i)}</td></tr>`)) + btn('Schiene hinzufügen','rail-add');
  }
  function colors() {
    return draft.groups.map((g, n) => `<section class="ws-group"><div class="ws-group-head"><label>Kategorie${input('groups.'+n+'.name','Kategorie',g.name,'text',true)}</label>${btn('Kategorie entfernen','group-remove',n)}</div>` + table(['Anwendung','Querschnitt / Kabel','Leiter','Drahtfarbe',''], g.rows.map((r,i) => `<tr>${['name','size','wire','color'].map((field,k) => `<td>${input('groups.'+n+'.rows.'+i+'.'+field,['Anwendung','Querschnitt / Kabel','Leiter','Drahtfarbe'][k],r[field],'text',field==='name')}</td>`).join('')}<td class="ws-actions">${btn('↑','move-up','groups.'+n+'.rows:'+i,'aria-label="Eintrag nach oben"')}${btn('↓','move-down','groups.'+n+'.rows:'+i,'aria-label="Eintrag nach unten"')}${btn('Entfernen','color-remove',n+':'+i)}</td></tr>`)) + btn('Eintrag hinzufügen','color-add',n) + '</section>').join('') + btn('Kategorie hinzufügen','group-add');
  }
  function documents() {
    const f = draft.folders[folderIndex];
    const choice = `<div class="ws-folder-picker"><label>${tool==='ew'?'Elektrizitätswerk':'Kategorie'}<select data-ws-folder data-ws-view aria-label="Ordner auswählen">${draft.folders.map((f,i) => `<option value="${i}" ${i===folderIndex?'selected':''}>${esc(f.name)} (${f[key()].length})</option>`).join('')}</select></label>${btn('Ordner hinzufügen','folder-add')}</div>`;
    let editor = '<p>Noch keine Ordner vorhanden.</p>';
    if (f) {
      const standardFiles = result.standard.folders.flatMap(x => x[key()]);
      editor = `<section class="ws-group"><div class="ws-group-head"><label>Name${input('folders.'+folderIndex+'.name','Ordnername',f.name,'text',true)}</label>${btn('Ordner aus Vorlage entfernen','folder-remove',folderIndex)}</div><label>Hinweise<textarea data-ws-path="folders.${folderIndex}.info" maxlength="10000" rows="4">${esc(f.info)}</textarea></label>`;
      editor += table(['Dokument / Zeichnung','Quelle',''], f[key()].map((d,i) => `<tr><td>${input('folders.'+folderIndex+'.'+key()+'.'+i+'.name','Anzeigename',d.name,'text',true)}<a href="${esc(fileURL(d.path))}" target="_blank" rel="noopener">Datei öffnen ↗</a></td><td>${d.fileId?'Eigene Datei':'Standard'}</td><td>${btn('Aus Ordner entfernen','doc-remove',i)}</td></tr>`));
      editor += `<div class="ws-upload"><label>${tool==='ew'?'PDF ergänzen':'Zeichnung ergänzen'} (max. 10 MB je Datei)<input data-ws-upload type="file" multiple accept="${tool==='ew'?'.pdf,application/pdf':'.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'}"></label><p class="muted small">Uploads werden im Betrieb gespeichert. Mit «Firmenvorlage speichern» werden die ausgewählten Dateien für Mitarbeitende in diesem Ordner angezeigt.</p></div>`;
      const existing = [...files.map(f => ({value:'u:'+f.id,label:'Eigene Datei · '+f.name})), ...standardFiles.map((d,i) => ({value:'s:'+i,label:'Standard · '+d.name}))];
      if (existing.length) editor += `<div class="ws-folder-picker"><label>Vorhandene Datei ergänzen<select data-ws-existing><option value="">Datei wählen …</option>${existing.map(x=>`<option value="${x.value}">${esc(x.label)}</option>`).join('')}</select></label>${btn('In Ordner übernehmen','doc-existing')}</div>`;
      editor += '</section>';
    }
    const referenced = new Set(draft.folders.flatMap(f => f[key()].map(d => d.fileId).filter(Boolean)));
    const library = `<details class="ws-library"><summary>Eigene Dateien verwalten (${files.length})</summary><p class="muted small">Aus einem Ordner entfernte Dateien bleiben hier verfügbar. Zum endgültigen Löschen zuerst alle Verweise aus dieser Vorlage entfernen und speichern.</p>` + table(['Datei','Grösse',''], files.map(f=>`<tr><td><a href="${esc(fileURL(f.path))}" target="_blank" rel="noopener">${esc(f.name)}</a></td><td>${(f.size/1024/1024).toLocaleString('de-CH',{maximumFractionDigits:2})} MB</td><td>${referenced.has(f.id)?'In Vorlage verwendet':btn('Datei löschen','file-delete',f.id)}</td></tr>`)) + '</details>';
    return choice + editor + library + (usage ? `<p class="muted small">Betriebsspeicher: ${(usage.usedBytes/1024/1024).toLocaleString('de-CH',{maximumFractionDigits:1})} / ${usage.limitBytes/1024/1024} MB. Projekte und Werkstattdateien teilen sich dieses Limit.</p>` : '');
  }
  function render() {
    if (disposed || !draft) return;
    root.innerHTML = `<div class="ws-tabs" role="navigation" aria-label="Werkstattvorlagen">${available.map(k => btn(templateTools[k],'tab',k,`data-ws-view ${k===tool?'aria-current="page"':''}`)).join('')}</div>
      <div class="ws-context"><strong>${esc(result.source==='company'?'Eigene Firmenvorlage':'Gemeinsamer Standard')}</strong><span data-ws-dirty>${dirty?'Ungespeicherte Änderungen':''}</span></div>
      <p class="muted">${esc(account.company.name)} · Anpassungen gelten für alle berechtigten Mitarbeitenden dieses Betriebs. Ohne eigene Vorlage wird der aktuelle Standard verwendet.</p>
      <p class="ws-message" data-ws-message role="status"></p><form data-ws-form>${tool==='rails'?railRows():tool==='wireColors'?colors():documents()}
      <div class="ws-footer">${editable()?'<button class="primary" type="submit">Firmenvorlage speichern</button>'+btn('Auf Standard zurücksetzen','reset'): '<span>Du hast für dieses Werkzeug nur Leserechte.</span>'}${btn('Gespeicherten Stand neu laden','reload','','data-ws-view')}</div></form>`;
    lock();
  }
  function at(path) {return path.split('.').reduce((o,k) => o[k], draft);}
  root.oninput = e => {
    const path = e.target.dataset.wsPath; if (!path || !editable() || busy) return;
    const parts = path.split('.'), field = parts.pop(), target = parts.reduce((o,k) => o[k],draft);
    target[field] = e.target.type==='number' ? (e.target.value===''?null:Number(e.target.value)) : e.target.value; setDirty();
  };
  root.onchange = async e => {
    if (e.target.hasAttribute('data-ws-folder')) {folderIndex=Number(e.target.value); render(); return;}
    if (!e.target.hasAttribute('data-ws-upload') || !editable() || busy) return;
    const selected = [...e.target.files]; if (!selected.length) return;
    busy = true; lock(); let count=0;
    try {
      for (const file of selected) {
        if (file.size > 10*1024*1024) throw Error(file.name+': maximal 10 MB je Datei.');
        const base64 = await new Promise((resolve,reject) => {const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Datei konnte nicht gelesen werden.'));reader.readAsDataURL(file);});
        const saved = await api(endpoint()+'/files',{method:'POST',body:{name:file.name,base64}});
        files.push(saved); if(usage)usage.usedBytes+=saved.size;
        draft.folders[folderIndex][key()].push({id:newId(),name:saved.name,fileId:saved.id,path:saved.path}); count++; setDirty();
      }
      render(); message(count+' Datei(en) hochgeladen. Firmenvorlage speichern, um die Zuordnung zu übernehmen.');
    } catch(error) {render(); message((count?count+' Datei(en) bereits hochgeladen. ':'')+error.message,true);}
    finally {busy=false;lock();}
  };
  root.onsubmit = async e => {
    e.preventDefault(); if(!editable()||busy||!draft)return;
    busy=true;lock();
    try {result=await api(endpoint(),{method:'PUT',body:{revision:result.revision,value:draft}});draft=structuredClone(result.value);dirty=false;render();message('Firmenvorlage gespeichert. Mitarbeitende sehen sie beim nächsten Öffnen oder Neuladen des Werkzeugs.');}
    catch(error){message(error.message,true);}
    finally{busy=false;lock();}
  };
  root.onclick = async e => {
    const action=e.target.closest('[data-ws-action]');if(!action||busy)return;
    const kind=action.dataset.wsAction,index=action.dataset.index;
    if(kind==='tab'||kind==='reload'){
      if(!canLeave())return;
      if(kind==='tab'){tool=index;const url=new URL(location.href);url.searchParams.set('tool',tool);history.replaceState(null,'',url);}
      await load();return;
    }
    if(!editable()||!draft)return;
    try{
      if(kind==='reset'){
        if(!confirm('Eigene Vorlage für «'+templateTools[tool]+'» verwerfen und künftig wieder den gemeinsamen Standard verwenden? Hochgeladene Dateien bleiben in der Dateiverwaltung.'))return;
        busy=true;lock();result=await api(endpoint(),{method:'DELETE',body:{revision:result.revision}});draft=structuredClone(result.value);dirty=false;folderIndex=0;render();message('Gemeinsamer Standard wiederhergestellt.');return;
      }
      if(kind==='file-delete'){
        const file=files.find(f=>f.id===index);if(!file||!confirm('«'+file.name+'» endgültig aus dem Betriebsspeicher löschen?'))return;
        busy=true;lock();await api(endpoint()+'/files/'+index,{method:'DELETE',body:{}});files=files.filter(f=>f.id!==index);if(usage)usage.usedBytes-=file.size;render();message('Datei gelöscht.');return;
      }
      if(kind==='rail-add')draft.rows.push({id:newId(),label:'Neue Schiene',dimension:'w',deduction:0});
      if(kind==='rail-remove'){if(draft.rows.length===1)throw Error('Mindestens eine Schienenregel behalten.');draft.rows.splice(Number(index),1);}
      if(kind==='group-add')draft.groups.push({id:newId(),name:'Neue Kategorie',rows:[]});
      if(kind==='group-remove'){if(draft.groups.length===1)throw Error('Mindestens eine Kategorie behalten.');if(!confirm('Kategorie mit allen Einträgen aus der Firmenvorlage entfernen?'))return;draft.groups.splice(Number(index),1);}
      if(kind==='color-add')draft.groups[Number(index)].rows.push({id:newId(),name:'Neue Anwendung',size:'',wire:'',color:''});
      if(kind==='color-remove'){const [n,i]=index.split(':').map(Number);draft.groups[n].rows.splice(i,1);}
      if(kind==='move-up'||kind==='move-down'){const [path,n]=index.split(':'),arr=at(path),i=Number(n),j=i+(kind==='move-up'?-1:1);if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];}
      if(kind==='folder-add'){draft.folders.push({id:newId(),name:'Neuer Ordner',info:'',[key()]:[]});folderIndex=draft.folders.length-1;}
      if(kind==='folder-remove'){if(!confirm('Ordner und seine Zuordnungen aus dieser Vorlage entfernen? Die Dateien bleiben gespeichert.'))return;draft.folders.splice(Number(index),1);folderIndex=Math.max(0,Math.min(folderIndex,draft.folders.length-1));}
      if(kind==='doc-remove')draft.folders[folderIndex][key()].splice(Number(index),1);
      if(kind==='doc-existing'){
        const selection=root.querySelector('[data-ws-existing]').value;if(!selection)return;
        const [source,id]=selection.split(':');let doc;
        if(source==='u'){const f=files.find(f=>f.id===id);doc={id:newId(),name:f.name,fileId:f.id,path:f.path};}
        else{const d=result.standard.folders.flatMap(f=>f[key()])[Number(id)];doc={...d,id:newId()};}
        draft.folders[folderIndex][key()].push(doc);
      }
      setDirty();render();
    }catch(error){message(error.message,true);}finally{busy=false;lock();}
  };
  if(!available.length)root.textContent='Für diesen Betrieb sind keine Werkstattvorlagen freigeschaltet.';else load();
  return {canLeave,dispose(){disposed=true;generation++;window.removeEventListener('beforeunload',beforeUnload);root.oninput=root.onchange=root.onsubmit=root.onclick=null;}};
}
