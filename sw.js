/* Brainrot Bastion — service worker : jeu jouable hors ligne une fois chargé. */
const CACHE = 'brainrot-td-v9';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/main.js', 'js/config.js', 'js/game.js', 'js/maps.js', 'js/waves.js', 'js/enemies.js', 'js/towers.js',
  'js/projectiles.js', 'js/fx.js', 'js/sprites.js', 'js/icons.js', 'js/audio.js', 'js/haptics.js', 'js/save.js', 'js/ui.js', 'js/castle.js', 'js/meta.js', 'js/hub.js', 'js/loot.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (mises à jour immédiates), cache en secours hors ligne.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
