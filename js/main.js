// Point d'entrée : sauvegarde, audio, interface.
import { Save } from './save.js';
import { AudioSys } from './audio.js';
import { UI } from './ui.js';

const save = new Save();
const audio = new AudioSys(save.data.settings);
const ui = new UI(save, audio);

window.__bastionLoaded = true;
window.__ui = ui; // accès console pour le débogage

// PWA : service worker (jeu jouable hors ligne). Ignoré en file:// et sur les navigateurs sans support.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
