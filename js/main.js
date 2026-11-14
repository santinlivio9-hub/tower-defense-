// Point d'entrée : sauvegarde, audio, interface.
import { Save } from './save.js';
import { AudioSys } from './audio.js';
import { UI } from './ui.js';

// Mode installé (écran d'accueil) : #app prend la hauteur physique de l'écran pour que la barre d'onglets
// descende jusqu'au bord. Dans Safari on ne change rien (la zone sous la page est celle du navigateur).
const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.__standalone === true;
if (standalone) {
  document.documentElement.classList.add('standalone');
  const fitApp = () => {
    const portrait = innerHeight >= innerWidth, sh = screen && screen.height ? (portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width)) : 0;
    document.documentElement.style.setProperty('--app-h', Math.max(innerHeight, sh) + 'px');
  };
  fitApp();
  for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, () => { fitApp(); setTimeout(fitApp, 300); });
}

const save = new Save();
const audio = new AudioSys(save.data.settings);
const ui = new UI(save, audio);

window.__bastionLoaded = true;
window.__ui = ui; // accès console pour le débogage

// PWA : service worker (jeu jouable hors ligne). Ignoré en file:// et sur les navigateurs sans support.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
