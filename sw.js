/* Brainrot TD — service worker : jeu jouable hors ligne, et surtout fichiers TOUJOURS de la même version.
   À l'installation, tous les fichiers du jeu sont téléchargés d'un coup (sans passer par le cache HTTP) dans un
   cache propre à la version. Le jeu est ensuite servi depuis ce cache : jamais de mélange entre anciens et
   nouveaux fichiers après une mise à jour. Changer VERSION à chaque publication (tools/check.cjs le vérifie). */
const VERSION = 'v33';
const CACHE = 'brainrot-td-' + VERSION, FONTS = 'brainrot-td-fonts';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/main.js', 'js/viewport.js', 'js/config.js', 'js/game.js', 'js/maps.js', 'js/waves.js', 'js/enemies.js', 'js/towers.js',
  'js/projectiles.js', 'js/fx.js', 'js/sprites.js', 'js/icons.js', 'js/audio.js', 'js/haptics.js', 'js/save.js', 'js/ui.js', 'js/castle.js', 'js/meta.js', 'js/hub.js', 'js/loot.js', 'js/end.js', 'js/talents.js', 'js/collection.js', 'js/boosts.js', 'js/music.js', 'js/daily.js', 'js/reveal.js', 'js/economy.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => { if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION }); });

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // polices : cache d'abord, rafraîchi en arrière-plan
    if (!/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // fichiers du jeu : cache de la version d'abord ; le réseau ne sert que pour ce qui n'y est pas
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok) c.put(req, res.clone());
    return res;
  }))));
});
