// Point d'entrée : sauvegarde, audio, interface.
import { Save } from './save.js';
import { AudioSys } from './audio.js';
import { UI } from './ui.js';
import { initViewport } from './viewport.js';

// Mise en page racine (taille de #app, mode debug) : voir viewport.js
initViewport(() => { if (window.__ui) window.__ui.resize(); });

const save = new Save();
const audio = new AudioSys(save.data.settings);
const ui = new UI(save, audio);

window.__bastionLoaded = true;
window.__ui = ui; // accès console pour le débogage

// Filet global : toute erreur non rattrapée affiche « Oups, un bug ! » (progression sauvegardée, retour au menu possible)
window.addEventListener('error', (e) => { if (e.error || e.message) ui.crash(e.error || e.message, 'erreur'); });
window.addEventListener('unhandledrejection', (e) => ui.crash(e.reason, 'promesse'));

// PWA : service worker (jeu jouable hors ligne, fichiers toujours de la même version : voir sw.js).
// Quand une nouvelle version a pris la main, la page se recharge dès qu'on n'est plus en partie (voir ui.tick).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const sw = navigator.serviceWorker, had = !!sw.controller;
  sw.addEventListener('message', (e) => { if (e.data && e.data.version) window.__version = e.data.version; });
  sw.addEventListener('controllerchange', () => { if (had) window.__updateReady = true; if (sw.controller) sw.controller.postMessage('version'); });
  window.addEventListener('load', () => {
    sw.register('sw.js').then((reg) => {
      if (sw.controller) sw.controller.postMessage('version');
      // recherche d'une mise à jour à chaque retour sur l'appli
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}
