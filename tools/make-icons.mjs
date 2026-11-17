// Génère les icônes de l'appli à partir de tools/icon-art.js (escargot-pizza + tourelle dorée, sprites du jeu).
// Usage : NODE_PATH=$(npm root -g) node tools/make-icons.mjs   (nécessite Playwright)
// Les fichiers portent le préfixe « app-a- » : changer de nom force iOS et Android à recharger l'icône.
// Pour une future icône, changer PREFIX, puis index.html, manifest.webmanifest et la liste de sw.js.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';

const PREFIX = 'app-a-';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = (name) => join(root, 'icons', PREFIX + name);
mkdirSync(join(root, 'icons'), { recursive: true });

// petit serveur local : les modules ES ne se chargent pas depuis file://
const types = { '.js': 'text/javascript', '.html': 'text/html' };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split('?')[0]));
  let body = null; try { body = readFileSync(p); } catch (e) { /* introuvable */ }
  if (!body) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' }); res.end(body);
}).listen(0);
const port = server.address().port;

const { chromium } = createRequire(import.meta.url)('playwright');   // installé localement ou globalement (NODE_PATH)
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'domcontentloaded' });
const urls = await page.evaluate(async () => {
  const m = await import('/tools/icon-art.js');
  return { 180: await m.renderIcon(180), 192: await m.renderIcon(192), 512: await m.renderIcon(512), mask: await m.renderIcon(512, 0.1) };
});
const png = (u) => Buffer.from(u.split(',')[1], 'base64');
// --store : icône 1024 (fiche des stores, icône iOS) et version « maskable » (icône adaptative Android), dans store/
if (process.argv.includes('--store')) {
  const big = await page.evaluate(async () => { const m = await import('/tools/icon-art.js'); return { full: await m.renderIcon(1024), mask: await m.renderIcon(1024, 0.1) }; });
  mkdirSync(join(root, 'store'), { recursive: true });
  writeFileSync(join(root, 'store', 'icon-1024.png'), png(big.full)); writeFileSync(join(root, 'store', 'icon-maskable-1024.png'), png(big.mask));
  console.log('store/icon-1024.png, store/icon-maskable-1024.png');
}
writeFileSync(out('180.png'), png(urls[180]));          // apple-touch-icon
writeFileSync(out('192.png'), png(urls[192]));
writeFileSync(out('512.png'), png(urls[512]));
writeFileSync(out('maskable-512.png'), png(urls.mask));
for (const n of ['180.png', '192.png', '512.png', 'maskable-512.png']) console.log('icons/' + PREFIX + n);
await browser.close(); server.close();
