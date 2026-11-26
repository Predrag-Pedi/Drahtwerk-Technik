// Public, silent illustrative walkthroughs. No customer APIs or project writes.
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clips = [...document.querySelectorAll('[data-clip]')].map(el => ({
  el, stepMs: Number(el.dataset.stepMs) || 4000, frames: [...el.querySelectorAll('[data-frame]')], elapsed: 0, index: -1, visible: false, paused: false,
}));
const tabs = [...document.querySelectorAll('[data-demo]')];
let selected = 'orders', globalPaused = reducedMotion.matches, frameId = 0, lastTime = 0;
const active = () => clips.find(c => c.el.id === 'clip-' + selected);
const mainClip = c => c.el.classList.contains('main-clip');
const eligible = c => !mainClip(c) || c === active();
const running = c => c.visible && eligible(c) && !c.paused && !globalPaused && !document.hidden;
const seconds = ms => '0:' + String(Math.floor(ms / 1000)).padStart(2, '0');
function draw(c) {
  const index = Math.min(c.frames.length - 1, Math.floor(c.elapsed / c.stepMs));
  if (c.index !== index) {
    c.index = index;
    c.frames.forEach((f, i) => {f.hidden = i !== index;});
    const caption = c.el.querySelector('[data-clip-caption]');
    if (caption) caption.textContent = c.frames[index].dataset.caption;
    if (c === active()) for (const step of document.querySelectorAll('[data-step]')) {
      if (Number(step.dataset.step) === index) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    }
  }
  if (c === active()) {
    const duration = c.frames.length * c.stepMs;
    $('demo-progress').max = duration; $('demo-progress').value = c.elapsed;
    $('demo-progress').setAttribute('aria-valuetext', `${Math.floor(c.elapsed / 1000)} von ${duration / 1000} Sekunden`);
    $('demo-time').textContent = `${seconds(c.elapsed)} / ${seconds(duration)}`;
  }
}
function sync() {
  for (const c of clips) {
    const playing = running(c), button = c.el.querySelector('[data-clip-toggle]');
    c.el.classList.toggle('is-playing', playing); c.el.classList.toggle('is-still', !!c.still);
    if (button) {button.textContent = c.paused || globalPaused ? 'Abspielen' : 'Pause'; button.setAttribute('aria-label', (c.paused || globalPaused ? 'Vorführung abspielen: ' : 'Vorführung pausieren: ') + c.frames[0].dataset.caption);}
  }
  const paused = active().paused || globalPaused;
  $('demo-play').textContent = paused ? 'Abspielen' : 'Pause';
  $('demo-play').setAttribute('aria-label', paused ? 'Demo abspielen' : 'Demo pausieren');
  $('motion-toggle').textContent = globalPaused ? 'Animationen abspielen' : 'Animationen pausieren';
  if (clips.some(running) && !frameId) {lastTime = performance.now(); frameId = requestAnimationFrame(tick);}
  else if (!clips.some(running) && frameId) {cancelAnimationFrame(frameId); frameId = 0;}
}
function tick(now) {
  frameId = 0;
  const delta = Math.max(0, Math.min(250, now - lastTime)); lastTime = now;
  let nextTour = false;
  for (const c of clips) if (running(c)) {
    const duration = c.frames.length * c.stepMs;
    c.elapsed += delta;
    if (c.elapsed >= duration) {
      c.elapsed %= duration;
      if (c === active() && $('demo-cycle').checked) nextTour = true;
    }
    draw(c);
  }
  if (nextTour) select(tabs[(tabs.findIndex(t => t.dataset.demo === selected) + 1) % tabs.length].dataset.demo);
  if (!frameId && clips.some(running)) frameId = requestAnimationFrame(tick);
}
function select(name, manual = false) {
  selected = name;
  if (manual) $('demo-cycle').checked = false;
  for (const tab of tabs) {
    const chosen = tab.dataset.demo === name;
    tab.setAttribute('aria-selected', String(chosen)); tab.tabIndex = chosen ? 0 : -1;
    $('panel-' + tab.dataset.demo).hidden = !chosen;
  }
  const panel = $('panel-' + name), c = active(); c.elapsed = 0; c.index = -1;
  $('demo-window-title').textContent = 'SchaltBase / ' + tabs.find(t => t.dataset.demo === name).textContent;
  $('demo-kicker').textContent = tabs.find(t => t.dataset.demo === name).textContent;
  $('demo-title').textContent = panel.dataset.title;
  $('demo-description').textContent = panel.dataset.description;
  const detail=$('demo-detail'),slug={orders:'auftraege',inventory:'lager',offers:'offerten',together:'dispo',schema:'schema',dispo:'dispo'}[name];
  detail.href='/produkte/'+slug+'.html'; detail.textContent=(name==='inventory'?'Lager':tabs.find(t=>t.dataset.demo===name).textContent)+' im Detail kennenlernen';
  $('demo-steps').replaceChildren(...c.frames.map((f, i) => {
    const li = document.createElement('li'), button = document.createElement('button'), number = document.createElement('span'), content = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('small');
    button.type = 'button'; button.dataset.step = i; number.textContent = String(i + 1).padStart(2, '0'); title.textContent = f.dataset.caption; detail.textContent = f.dataset.detail;
    content.append(title, detail); button.append(number, content); li.append(button);
    button.onclick = () => {c.paused = true; c.still = true; $('demo-cycle').checked = false; c.elapsed = i * c.stepMs; draw(c); sync(); if(matchMedia('(max-width:760px)').matches) $('demo-player').scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});};
    return li;
  }));
  draw(c); sync();
}
for(const link of document.querySelectorAll('[data-show-demo]'))link.addEventListener('click',()=>select(link.dataset.showDemo,true));
for (const tab of tabs) {
  tab.onclick = () => select(tab.dataset.demo, true);
  tab.onkeydown = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = tabs.indexOf(tab), next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    select(tabs[next].dataset.demo, true); tabs[next].focus();
  };
}
function toggle(c) {
  if (globalPaused || c.paused) {globalPaused = false; c.paused = false; c.still = false;} else c.paused = true;
  sync();
}
for (const c of clips) {draw(c); c.el.querySelector('[data-clip-toggle]')?.addEventListener('click', () => toggle(c));}
$('demo-play').onclick = () => toggle(active());
$('demo-restart').onclick = () => {const c = active(); c.elapsed = 0; c.index = -1; draw(c); sync();};
$('demo-progress').oninput = e => {const c = active(); c.paused = true; c.still = true; $('demo-cycle').checked = false; c.elapsed = Number(e.target.value); draw(c); sync();};
$('motion-toggle').onclick = () => {globalPaused = !globalPaused; sync();};
document.addEventListener('visibilitychange', sync);
reducedMotion.addEventListener('change', e => {globalPaused = e.matches; sync();});
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {const c = clips.find(c => c.el === entry.target); c.visible = entry.isIntersecting;}
  sync();
}, {threshold: 0});
for (const c of clips) observer.observe(c.el);
$('motion-toggle').hidden = false;
document.querySelector('[data-demo-controls]').hidden = false;
select('orders');
