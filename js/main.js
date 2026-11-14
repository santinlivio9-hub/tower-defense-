// Point d'entrée : sauvegarde, audio, interface.
import { Save } from './save.js';
import { AudioSys } from './audio.js';
import { UI } from './ui.js';

// Hauteur réelle de l'écran : en PWA (plein écran iOS), 100 % / 100vh peuvent s'arrêter au-dessus du bas de l'écran
// et laisser une bande vide ; on prend alors la hauteur physique de l'écran. En navigateur : la hauteur visible.
function fitApp() {
  const standalone = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.__standalone;
  const portrait = innerHeight >= innerWidth, vv = window.visualViewport ? visualViewport.height : innerHeight;
  let h = Math.max(innerHeight, document.documentElement.clientHeight, Math.round(vv));
  if (standalone && screen && screen.height) h = Math.max(h, portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width));
  document.documentElement.style.setProperty('--app-h', h + 'px');
}
fitApp();
for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, () => { fitApp(); setTimeout(fitApp, 300); });
if (window.visualViewport) visualViewport.addEventListener('resize', fitApp);

const save = new Save();
const audio = new AudioSys(save.data.settings);
const ui = new UI(save, audio);

window.__bastionLoaded = true;
window.__ui = ui; // accès console pour le débogage

// PWA : service worker (jeu jouable hors ligne). Ignoré en file:// et sur les navigateurs sans support.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
