// Génère icons/icon.svg puis les PNG (192, 512, maskable, apple-touch) à partir des sprites du jeu.
// Usage : node tools/make-icons.mjs   (nécessite Playwright pour la conversion SVG -> PNG)
import { writeFileSync, mkdirSync } from 'node:fs';
import { enemySvg, towerSvg } from '../js/sprites.js';

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
// Les identifiants de dégradés sont préfixés pour pouvoir combiner plusieurs sprites dans un seul SVG.
const embed = (svg, prefix) => inner(svg).replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);

// pad = marge de sécurité (icône « maskable » : le contenu reste dans la zone centrale)
function iconSvg(size, pad = 0) {
  const k = 1 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#8a5cf0"/><stop offset="0.55" stop-color="#4a2f9a"/><stop offset="1" stop-color="#2a1a5e"/></linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#ff7fb0" stop-opacity=".95"/><stop offset="1" stop-color="#ff7fb0" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#sun)"/>
  <g transform="translate(256 256) scale(${k}) translate(-256 -256)">
    <ellipse cx="256" cy="430" rx="210" ry="34" fill="#1a0f3d" opacity=".45"/>
    <g transform="translate(374 318)"><ellipse cx="0" cy="34" rx="86" ry="30" fill="#1a0f3d" opacity=".5"/><circle r="74" fill="#5b4a8a" stroke="#3d2c4e" stroke-width="9"/><circle r="56" fill="none" stroke="#ffd23f" stroke-width="11"/>
      <g transform="rotate(14) scale(-1.28 1.28) translate(-8 0)">${embed(towerSvg('assault', 5, 1, 'gold'), 't')}</g></g>
    <g transform="translate(140 300) scale(1.68)">${embed(enemySvg('basic', 0, 0), 'e')}</g>
  </g>
</svg>`;
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
const out = (name) => new URL('../icons/' + name, import.meta.url);
writeFileSync(out('icon.svg'), iconSvg(512));

import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');   // installé localement ou globalement (NODE_PATH)
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.1], ['apple-touch-icon.png', 180, 0]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${iconSvg(size, pad)}</body>`);
  writeFileSync(out(name), await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
  console.log('icons/' + name);
}
await browser.close();
