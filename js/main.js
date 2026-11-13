// Point d'entrée : sauvegarde, audio, interface.
import { Save } from './save.js';
import { AudioSys } from './audio.js';
import { UI } from './ui.js';

const save = new Save();
const audio = new AudioSys(save.data.settings);
const ui = new UI(save, audio);

window.__bastionLoaded = true;
window.__ui = ui; // accès console pour le débogage
