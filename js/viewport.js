// Mise en page racine et mode debug.
// #app est en position fixed, inset 0 (voir style.css) : c'est le navigateur qui lui donne sa taille, sans vh
// ni hauteur calculée. Seule correction appliquée ici : si la zone réellement visible (visualViewport) est plus
// petite que la boîte de #app, on réduit #app pour que rien ne sorte de l'écran. On n'agrandit jamais.
// Mode debug (?debug=1 ou 5 tapes sur le logo) : affiche toutes les mesures et permet d'essayer d'autres réglages.
const KEY = 'brainrot-layout';
const MODES = [
  ['auto', 'Auto', 'boîte CSS, réduite à la zone visible'],
  ['css', 'CSS seul', 'position fixed, inset 0, aucun calcul'],
  ['inner', 'innerHeight', 'hauteur = window.innerHeight'],
  ['vv', 'visualViewport', 'hauteur = visualViewport.height'],
  ['dvh', '100dvh', 'hauteur = 100dvh'],
  ['screen', 'screen.height', 'hauteur = écran physique (ancien réglage du mode installé)'],
];
const app = () => document.getElementById('app');
const read = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } };
let mode = read(), probe = null, panel = null, onFit = null;

export const isStandalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.__standalone === true;

// valeurs réelles des safe-areas, lues sur un élément témoin
function safe() {
  if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.append(probe); }
  const s = getComputedStyle(probe);
  return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
}

export function fit() {
  const a = app(); if (!a) return;
  const vv = window.visualViewport, st = a.style;
  st.height = ''; st.top = ''; st.bottom = '';
  const set = (h, top = 0) => { st.top = top + 'px'; st.bottom = 'auto'; st.height = Math.round(h) + 'px'; };
  if (mode === 'inner') set(innerHeight);
  else if (mode === 'vv' && vv) set(vv.height, vv.offsetTop);
  else if (mode === 'dvh') { st.bottom = 'auto'; st.height = '100dvh'; }
  else if (mode === 'screen') set(Math.max(innerHeight, innerHeight >= innerWidth ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width)));
  else if (mode === 'auto' && vv) {
    const box = a.getBoundingClientRect();
    // la boîte dépasse de la zone visible (barres du navigateur, clavier, bug de hauteur) : on la ramène dedans
    if (box.bottom > vv.offsetTop + vv.height + 1 || box.top < vv.offsetTop - 1) set(vv.height, vv.offsetTop);
  }
  if (panel) renderDebug();
  if (onFit) onFit();
}

export function initViewport(cb) {
  onFit = cb || null;
  document.documentElement.classList.toggle('standalone', isStandalone());
  const later = () => { fit(); setTimeout(fit, 120); setTimeout(fit, 500); };
  for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, later);
  if (window.visualViewport) { visualViewport.addEventListener('resize', later); visualViewport.addEventListener('scroll', fit); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) later(); });
  later();
  if (/[?&]debug=1/.test(location.search)) openDebug();
  // 5 tapes rapides sur le logo
  let n = 0, t = 0;
  document.addEventListener('pointerdown', (e) => {
    // le logo ne capte pas les touchers (pointer-events: none) : on compare la position à son rectangle
    const lg = document.querySelector('#screen-menu.active .logo'); if (!lg) return;
    const q = lg.getBoundingClientRect(); if (e.clientX < q.left || e.clientX > q.right || e.clientY < q.top || e.clientY > q.bottom) return;
    const now = Date.now(); n = now - t < 600 ? n + 1 : 1; t = now;
    if (n >= 5) { n = 0; panel ? closeDebug() : openDebug(); }
  });
}

// ------------------------------------------------------------------ mode debug
export function measures() {
  const a = app(), vv = window.visualViewport, s = safe(), r = a.getBoundingClientRect(), de = document.documentElement;
  const rect = (id) => { const e = document.getElementById(id); if (!e || !e.offsetParent && id !== 'app') return null; const q = e.getBoundingClientRect(); return q.height ? `${Math.round(q.top)} → ${Math.round(q.bottom)} (h ${Math.round(q.height)})` : null; };
  const cv = document.getElementById('game');
  return {
    'mode d\'affichage': isStandalone() ? 'installé (standalone)' : 'navigateur',
    'réglage': mode,
    'innerWidth × innerHeight': `${innerWidth} × ${innerHeight}`,
    'documentElement.clientHeight': de.clientHeight,
    'visualViewport': vv ? `${Math.round(vv.width)} × ${Math.round(vv.height)} (offsetTop ${Math.round(vv.offsetTop)}, échelle ${vv.scale.toFixed(2)})` : 'absent',
    'screen': `${screen.width} × ${screen.height} (dpr ${window.devicePixelRatio})`,
    'safe-areas haut / bas / gauche / droite': `${s.t} / ${s.b} / ${s.l} / ${s.r}`,
    '#app (haut → bas)': `${Math.round(r.top)} → ${Math.round(r.bottom)} (h ${Math.round(r.height)})`,
    'bas de #app − zone visible': Math.round(r.bottom - (vv ? vv.offsetTop + vv.height : innerHeight)),
    'barre d\'onglets': rect('tabbar') || '—',
    'barre du bas (jeu)': rect('dock') || '—',
    'canvas du jeu': cv && cv.offsetParent ? `${cv.clientWidth} × ${cv.clientHeight} css, ${cv.width} × ${cv.height} px` : '—',
    'version': window.__version || '?',
    'navigateur': navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90),
  };
}
function renderDebug() {
  const m = measures(), body = panel.querySelector('.dbg-body');
  body.innerHTML = Object.entries(m).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  panel.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
}
export function openDebug() {
  if (panel) return;
  panel = document.createElement('div'); panel.id = 'debug';
  panel.innerHTML = `<div class="dbg-head"><b>Debug affichage</b><button data-act="copy">Copier</button><button data-act="close">Fermer</button></div>
    <div class="dbg-body"></div>
    <div class="dbg-modes">${MODES.map(([id, name]) => `<button data-mode="${id}">${name}</button>`).join('')}</div>
    <p class="dbg-note">Les 4 coins rouges marquent les limites de #app : ils doivent tous être visibles. Essaie un réglage : il est gardé en mémoire.</p>`;
  document.body.append(panel);
  for (const c of ['tl', 'tr', 'bl', 'br']) { const m = document.createElement('i'); m.className = 'dbg-corner ' + c; app().append(m); }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) { mode = b.dataset.mode; try { localStorage.setItem(KEY, mode); } catch (er) { /* ignore */ } fit(); }
    else if (b.dataset.act === 'close') closeDebug();
    else if (b.dataset.act === 'copy') { const txt = Object.entries(measures()).map(([k, v]) => `${k} : ${v}`).join('\n'); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { b.textContent = 'Copié !'; }, () => { b.textContent = 'Copie impossible'; }); }
  });
  panel._iv = setInterval(renderDebug, 500);
  renderDebug();
}
export function closeDebug() {
  if (!panel) return;
  clearInterval(panel._iv); panel.remove(); panel = null;
  document.querySelectorAll('.dbg-corner').forEach((e) => e.remove());
}
