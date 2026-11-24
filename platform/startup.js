/* Loaded as a classic script before modules, so failed imports are visible too. */
(() => {
 function showError(title, detail) {
  const show = () => {
   if (document.getElementById('schaltbase-startup-error')) return;
   const panel = document.createElement('section');
   panel.id = 'schaltbase-startup-error'; panel.setAttribute('role', 'alertdialog');
   panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'schaltbase-startup-title');
   panel.setAttribute('aria-describedby', 'schaltbase-startup-detail');
   panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;box-sizing:border-box;padding:12vh max(24px,calc((100vw - 640px)/2));background:#f3f6fa;color:#173c62;font:16px/1.6 system-ui,sans-serif';
   const brand = document.createElement('p'); brand.textContent = 'SchaltBase';
   const heading = document.createElement('h1'); heading.id = 'schaltbase-startup-title'; heading.textContent = title;
   const message = document.createElement('p'); message.id = 'schaltbase-startup-detail'; message.textContent = detail;
   const hint = document.createElement('p'); hint.textContent = 'Bitte lade die Seite erneut. Falls die Meldung wieder erscheint, sende den unten genannten Fehler weiter.';
   const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Seite erneut laden';
   retry.style.cssText = 'padding:12px 20px;border:0;border-radius:8px;background:#245de8;color:white;font:inherit;cursor:pointer';
   retry.onclick = () => location.reload();
   panel.append(brand, heading, hint, message, retry);
   // Preserve the document and unsaved inputs; only make the failed view inactive.
   for (const child of document.body.children) child.setAttribute('inert', '');
   document.body.append(panel); retry.focus();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, {once:true});
  else show();
 }
 globalThis.__schaltbaseStartupError = showError;
 window.addEventListener('error', event => {
  const script = event.target;
  if (script?.tagName !== 'SCRIPT' || script.type !== 'module') return;
  let path = '';
  try {path = new URL(script.src, location.href).pathname;} catch {}
  showError('SchaltBase konnte nicht vollständig geladen werden.', 'Programmdatei konnte nicht gestartet werden: ' + path);
 }, true);
})();
