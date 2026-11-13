// Sprites vectoriels (SVG) : brainrots, boss et armes.
// Technique « jouet vinyle » : silhouette dodue, contour prune épais, volumes en dégradé,
// reflets, grands yeux expressifs. Les SVG sont rastérisés une fois dans des canvas.
import { ENEMIES, RARITY, SHOP, GAME } from './config.js';

export const INK = '#3d2c4e';
const SW = 5;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ couleurs
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
const mix = (a, b, t) => {
  const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round(((p >> sh) & 255) * (1 - t) + ((q >> sh) & 255) * t);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
};
const luma = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };

// ------------------------------------------------------------------ dégradés / finitions
let grads = null, finish = 'classic', OL = INK;
const paint = (hex) => { if (!grads || hex[0] !== '#') return hex; grads.add(hex); return `url(#g${hex.slice(1)})`; };
const linear = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0.25" y2="1">` + stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>';
const vinyl = (id, hex) => linear(id, [[0, shade(hex, 0.55)], [0.18, shade(hex, 0.22)], [0.55, hex], [0.86, shade(hex, -0.22)], [1, shade(hex, -0.38)]]);
const gradDefs = () => [...grads].map((hex) => {
  const id = 'g' + hex.slice(1);
  if (finish === 'neon') { const d = mix(hex, '#0a0d1c', 0.8); return linear(id, [[0, shade(d, 0.35)], [0.3, d], [1, shade(d, -0.4)]]); }
  if (finish === 'gold') { const g = shade('#f2b51d', (luma(hex) - 0.5) * 0.7); return linear(id, [[0, '#fffbe6'], [0.2, shade(g, 0.45)], [0.42, g], [0.55, shade(g, -0.3)], [0.7, shade(g, 0.25)], [1, shade(g, -0.45)]]); }
  if (finish === 'lava') { const l = luma(hex); return linear(id, [[0, '#ffe27a'], [0.22, mix('#ff8a1a', '#ffd23f', l * 0.6)], [0.6, mix('#b81d12', '#ff5a1f', l)], [1, '#3a0d0d']]); }
  if (finish === 'candy') { const pal = ['#ff8fc7', '#8fe3ff', '#c9a6ff', '#fff3a8', '#a8f0c0']; return vinyl(id, mix(pal[parseInt(hex.slice(1, 3), 16) % pal.length], '#ffffff', luma(hex) * 0.35)); }
  if (finish === 'camo') {
    const base = mix(hex, '#7d9a5c', 0.6), dark = shade(base, -0.42), pale = mix(base, '#e6edc8', 0.5);
    const blobs = [[dark, 'M.05 .15C.2 .05 .35 .2 .3 .35S.1 .45 .05 .3Z'], [pale, 'M.45 .05C.6 0 .75 .12 .68 .25S.45 .3 .45 .05Z'], [dark, 'M.6 .45C.8 .38 .95 .55 .88 .7S.62 .72 .6 .45Z'], [pale, 'M.15 .6C.3 .52 .45 .65 .38 .8S.12 .82 .15 .6Z'], ['#3b4a2a', 'M.4 .38C.5 .32 .58 .42 .52 .5S.38 .5 .4 .38Z'], [pale, 'M.62 .82C.75 .76 .88 .86 .8 .96S.6 .95 .62 .82Z']];
    return vinyl('b' + hex.slice(1), base) + `<pattern id="${id}" width="1" height="1" patternContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#b${hex.slice(1)})"/>` + blobs.map(([c, d]) => `<path d="${d}" fill="${c}" opacity=".62"/>`).join('') + '</pattern>';
  }
  return vinyl(id, hex);
}).join('');
const neonOf = (hex) => (hex[0] === '#' ? shade(mix(hex, '#00f0ff', 0.15), 0.35) : '#9ff6ff');
const st = (fill, w = SW) => `fill="${paint(fill)}" stroke="${finish === 'neon' ? neonOf(fill) : OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const line = (w = SW, color = OL) => `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const shine = (x, y, w, h, rot = -20, op = 0.55) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;
// Trait coloré avec contour (membres, tentacules)
const limb = (d, w, color) => `<path d="${d}" ${line(w + 7)}/><path d="${d}" ${line(w, color)}/>`;

// Assemble un SVG complet (vb = demi-taille de la vue, px = taille de rendu)
function build(body, vb, px) {
  const defs = gradDefs();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-vb} ${-vb} ${vb * 2} ${vb * 2}" width="${px}" height="${px}"><defs>${defs}</defs>${body}</svg>`;
}

// ------------------------------------------------------------------ visages
// v : 0 yeux ouverts, 1 clignement, 2 touché (> <)
function face(x, y, s, v, mouth = 'smile', gap = 12, blush = true) {
  const ex = gap * s;
  let eyes;
  if (v === 1) eyes = [-1, 1].map((k) => `<path d="M${x + k * ex - 6.5 * s} ${y} q${6.5 * s} ${5 * s} ${13 * s} 0" ${line(3.6 * s)}/>`).join('');
  else if (v === 2) {
    eyes = [-1, 1].map((k) => { const cx = x + k * ex, d = -k * 5.5 * s; return `<path d="M${cx - d} ${y - 6 * s} L${cx + d} ${y} L${cx - d} ${y + 6 * s}" ${line(3.8 * s)}/>`; }).join('');
    if (mouth !== 'none') mouth = 'wobble';
  } else eyes = [-1, 1].map((k) => { const cx = x + k * ex; return `<ellipse cx="${cx}" cy="${y}" rx="${6.6 * s}" ry="${8.2 * s}" fill="${INK}"/><circle cx="${cx - 2.2 * s}" cy="${y - 3.2 * s}" r="${2.7 * s}" fill="#fff"/><circle cx="${cx + 2.4 * s}" cy="${y + 3 * s}" r="${1.2 * s}" fill="#fff"/>`; }).join('');
  const bl = blush ? [-1, 1].map((k) => `<ellipse cx="${x + k * (ex + 11 * s)}" cy="${y + 8 * s}" rx="${6.2 * s}" ry="${3.6 * s}" fill="#ff8fab" opacity=".7"/>`).join('') : '';
  const my = y + 9 * s;
  let m = '';
  switch (mouth) {
    case 'none': break;
    case 'open': m = `<path d="M${x - 5 * s} ${my} q${5 * s} ${9 * s} ${10 * s} 0 z" fill="#c2405b" stroke="${INK}" stroke-width="${2.8 * s}" stroke-linejoin="round"/>`; break;
    case 'wobble': m = `<path d="M${x - 8 * s} ${my + 2 * s} l${4 * s} ${-3 * s} l${4 * s} ${3 * s} l${4 * s} ${-3 * s} l${4 * s} ${3 * s}" ${line(2.6 * s, INK)}/>`; break;
    case 'cat': m = `<path d="M${x - 7 * s} ${my} q${3.5 * s} ${4.5 * s} ${7 * s} 0 q${3.5 * s} ${4.5 * s} ${7 * s} 0" ${line(2.8 * s, INK)}/>`; break;
    case 'tongue': m = `<path d="M${x - 6 * s} ${my} q${6 * s} ${6 * s} ${12 * s} 0" ${line(2.8 * s, INK)}/><path d="M${x - 1 * s} ${my + 3 * s} q${3 * s} ${6 * s} ${6 * s} 0" fill="#ff7a93" stroke="${INK}" stroke-width="${2.2 * s}"/>`; break;
    case 'grin': m = `<path d="M${x - 9 * s} ${my - 1 * s} q${9 * s} ${12 * s} ${18 * s} 0 z" fill="#c2405b" stroke="${INK}" stroke-width="${2.8 * s}" stroke-linejoin="round"/><path d="M${x - 4 * s} ${my + 5 * s} q${4 * s} ${-3 * s} ${8 * s} 0" fill="#ff8aa0"/>`; break;
    default: m = `<path d="M${x - 5 * s} ${my} q${5 * s} ${5 * s} ${10 * s} 0" ${line(2.8 * s, INK)}/>`;
  }
  return `<g>${bl}${eyes}${m}</g>`;
}
const brows = (x, y, s, gap = 12) => [-1, 1].map((k) => `<path d="M${x + k * (gap + 9) * s} ${y - 15 * s} L${x + k * (gap - 6) * s} ${y - 9 * s}" ${line(4.4 * s, INK)}/>`).join('');
// Deux pieds qui alternent (step 0 / 1)
const feet = (x, y, step, col, rx = 12, ry = 8) => [-1, 1].map((k) => `<ellipse cx="${k * x}" cy="${y - ((k < 0) === !step ? 6 : 0)}" rx="${rx}" ry="${ry}" ${st(col, 4.5)}/>`).join('');

// ------------------------------------------------------------------ brainrots
// Dessinés dans un repère où le rayon de collision vaut ~50 ; e = expression, s = pas de marche (0/1).
const ENEMY_ART = {
  // Lumaca Pizzetta — escargot dont la coquille est une pizza
  basic: (e, s) => `
    <path d="M-58 44 C-62 24 -40 22 -22 26 L20 26 C26 4 30 -12 42 -14 C58 -14 64 4 60 24 C58 42 50 52 36 54 L-46 54 C-54 54 -57 50 -58 44 Z" ${st('#F6D7A3')}/>
    <path d="M-44 44 q8 ${s ? 6 : -4} 16 0 q8 ${s ? -4 : 6} 16 0 q8 ${s ? 6 : -4} 16 0" ${line(3, '#D9B272')}/>
    ${limb(`M36 -10 Q${34 + (s ? 2 : -2)} -30 30 -40`, 5, '#F6D7A3')}${limb(`M52 -10 Q${56 + (s ? -2 : 2)} -28 60 -36`, 5, '#F6D7A3')}
    <circle cx="-12" cy="-8" r="42" ${st('#E9A23B')}/>
    <circle cx="-12" cy="-8" r="32" fill="#FFD866" stroke="#F2B544" stroke-width="3"/>
    <path d="M-12 -40 L-12 24 M-40 -24 L16 8 M16 -24 L-40 8" stroke="#E9A23B" stroke-width="2.5" opacity=".7"/>
    ${[[-26, -22], [2, -24], [-30, 4], [-6, 8], [-12, -8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#D9482B" stroke="#A82F1B" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#ff8a70"/>`).join('')}
    <circle cx="8" cy="-4" r="3" fill="#4a7a2a"/><circle cx="-20" cy="-34" r="3" fill="#4a7a2a"/>
    ${shine(-34, -30, 5, 11, 30, 0.5)}
    ${eyeBall(30, -44, 10, e)}${eyeBall(60, -40, 10, e)}
    ${e === 2 ? `<ellipse cx="50" cy="16" rx="4" ry="5.5" fill="#c2405b" stroke="${INK}" stroke-width="2.6"/>` : `<path d="M42 12 q7 8 14 0" ${line(3, INK)}/>`}
    <ellipse cx="38" cy="22" rx="6" ry="3.5" fill="#ff8fab" opacity=".7"/>`,
  // Peperoncino Rollerino — piment en rollers
  fast: (e, s) => `
    ${[-1, 1].map((k) => { const dy = (k < 0) === !s ? -7 : 0; return `<rect x="${k * 20 - 15}" y="${34 + dy}" width="30" height="15" rx="7" ${st('#3D9DFC', 4.5)}/><circle cx="${k * 20 - 8}" cy="${54 + dy}" r="7" ${st('#FFD23F', 4)}/><circle cx="${k * 20 + 8}" cy="${54 + dy}" r="7" ${st('#FFD23F', 4)}/>`; }).join('')}
    <path d="M-4 -52 C28 -56 44 -22 38 10 C34 32 18 44 -2 42 C-26 40 -40 18 -34 -8 C-30 -30 -22 -46 -4 -52 Z" ${st('#F03A2E')}/>
    <path d="M-34 -8 C-44 6 -48 22 -40 30" ${line(4, 'rgba(0,0,0,0)')}/>
    ${shine(-18, -22, 6, 15, 18, 0.5)}
    <path d="M-26 -44 C-14 -62 16 -62 24 -44 C12 -36 -12 -36 -26 -44 Z" ${st('#4CC43A')}/>
    ${limb('M0 -56 q-4 -14 10 -20', 6, '#3FA82A')}
    ${brows(2, -4, 1)}${face(2, -4, 1, e, 'grin')}
    <path d="M-58 0 h-14 M-56 14 h-10 M-56 -14 h-8" ${line(3.5, 'rgba(255,255,255,.75)')}/>`,
  // Ippo Tostapane — hippopotame grille-pain
  tank: (e, s) => `
    ${[-1, 1].map((k) => `<rect x="${k * 30 - 13}" y="${36 - ((k < 0) === !s ? 5 : 0)}" width="26" height="20" rx="8" ${st('#9B87D6', 4.5)}/>`).join('')}
    ${[[-30, s ? -4 : 2], [4, s ? 2 : -4]].map(([x, dy]) => `<path d="M${x} ${-34 + dy} c-9 -8 -5 -28 13 -28 s22 20 13 28 v22 h-26 z" ${st('#F2C27A', 4.5)}/><path d="M${x + 5} ${-44 + dy} q8 -9 16 0" ${line(3, '#C98A3C')}/>`).join('')}
    <circle cx="-46" cy="-34" r="11" ${st('#B9A7E8', 4.5)}/><circle cx="46" cy="-34" r="11" ${st('#B9A7E8', 4.5)}/>
    <circle cx="-46" cy="-34" r="5" fill="#ff9fbf"/><circle cx="46" cy="-34" r="5" fill="#ff9fbf"/>
    <rect x="-58" y="-36" width="116" height="80" rx="24" ${st('#B9A7E8')}/>
    <rect x="-40" y="-33" width="80" height="9" rx="4.5" fill="${INK}" opacity=".8"/>
    ${shine(-42, -12, 6, 14, 10, 0.5)}
    ${limb('M58 -10 h10', 6, '#8d99a6')}<circle cx="72" cy="-10" r="7" ${st('#F04A3A', 4)}/>
    ${face(0, -6, 1.05, e, 'none', 17)}
    <ellipse cx="0" cy="22" rx="36" ry="21" ${st('#D9CCF7', 4.5)}/>
    <ellipse cx="-12" cy="13" rx="4.5" ry="6" fill="${INK}"/><ellipse cx="12" cy="13" rx="4.5" ry="6" fill="${INK}"/>
    ${e === 2 ? `<ellipse cx="0" cy="30" rx="9" ry="8" fill="#c2405b" stroke="${INK}" stroke-width="3"/>` : `<path d="M-18 28 q18 12 36 0" ${line(3.4, INK)}/><rect x="-13" y="29" width="10" height="11" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.6"/><rect x="3" y="29" width="10" height="11" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.6"/>`}`,
  // Formaggio Farfalla — fromage à ailes de papillon (volant)
  flying: (e, s) => `
    <g transform="scale(${s ? 0.72 : 1} 1)">
      ${[-1, 1].map((k) => `<ellipse cx="${k * 44}" cy="-22" rx="32" ry="26" transform="rotate(${k * -18} ${k * 44} -22)" ${st('#FF8FC7')}/><circle cx="${k * 50}" cy="-26" r="9" fill="#fff" opacity=".7"/><circle cx="${k * 36}" cy="-12" r="5" fill="#ffd23f"/><ellipse cx="${k * 36}" cy="22" rx="22" ry="17" transform="rotate(${k * 22} ${k * 36} 22)" ${st('#7FD8FF')}/><circle cx="${k * 40}" cy="24" r="6" fill="#fff" opacity=".7"/>`).join('')}
    </g>
    ${limb('M-8 -40 q-10 -18 -20 -18', 3.5, INK)}${limb('M8 -40 q10 -18 20 -18', 3.5, INK)}<circle cx="-28" cy="-58" r="5" fill="#ffd23f" stroke="${INK}" stroke-width="3"/><circle cx="28" cy="-58" r="5" fill="#ffd23f" stroke="${INK}" stroke-width="3"/>
    <path d="M0 -46 C10 -46 16 -40 20 -32 L38 24 C42 36 34 44 22 44 L-22 44 C-34 44 -42 36 -38 24 L-20 -32 C-16 -40 -10 -46 0 -46 Z" ${st('#FFD23F')}/>
    <ellipse cx="-6" cy="-24" rx="7" ry="6" fill="#E9A800"/><ellipse cx="22" cy="30" rx="6" ry="5" fill="#E9A800"/><ellipse cx="-24" cy="32" rx="5" ry="4" fill="#E9A800"/><ellipse cx="10" cy="-10" rx="4" ry="3.5" fill="#E9A800"/>
    ${shine(-14, -8, 4, 12, 18, 0.5)}
    ${face(0, 12, 0.95, e, 'cat')}`,
  // Granchio Pentolino — crabe coiffé d'une casserole (blindé)
  armored: (e, s) => `
    ${[-1, 1].map((k) => [0, 1, 2].map((i) => limb(`M${k * (30 + i * 6)} 36 l${k * 12} ${12 + ((i + (k < 0 ? 0 : 1) + s) % 2) * 6}`, 5, '#E8602A')).join('')).join('')}
    ${[-1, 1].map((k) => { const dy = (k < 0) === !s ? -8 : 0; return limb(`M${k * 40} 22 Q${k * 62} 20 ${k * 62} ${-2 + dy}`, 8, '#FF7A3C') + `<circle cx="${k * 62}" cy="${-14 + dy}" r="17" ${st('#FF7A3C')}/><path d="M${k * 62} ${-14 + dy} l${k * 16} -16 l${k * -2} 18 z" fill="${INK}"/>`; }).join('')}
    <ellipse cx="0" cy="26" rx="46" ry="27" ${st('#FF7A3C')}/>
    ${face(0, 26, 0.95, e, 'smile', 14)}
    <ellipse cx="-58" cy="-26" rx="10" ry="8" ${line(11)}/><ellipse cx="-58" cy="-26" rx="10" ry="8" ${line(5, '#6b7888')}/>
    <ellipse cx="58" cy="-26" rx="10" ry="8" ${line(11)}/><ellipse cx="58" cy="-26" rx="10" ry="8" ${line(5, '#6b7888')}/>
    <path d="M-50 6 L-46 -42 Q-46 -54 -34 -54 L34 -54 Q46 -54 46 -42 L50 6 Z" ${st('#C9D3DE')}/>
    <rect x="-56" y="-4" width="112" height="14" rx="7" ${st('#98A6B6', 4.5)}/>
    <path d="M-34 -44 L-36 -10" ${line(7, 'rgba(255,255,255,.7)')}/><path d="M-22 -46 L-23 -30" ${line(4, 'rgba(255,255,255,.6)')}/>
    <circle cx="24" cy="-34" r="3" fill="${INK}" opacity=".35"/><circle cx="32" cy="-18" r="3" fill="${INK}" opacity=".35"/>
    <path d="M6 -40 l8 6 l-6 6" ${line(2.6, 'rgba(61,44,78,.45)')}/>`,
  // Anguria Matrioska — poupée russe pastèque (se divise)
  splitter: (e, s) => `
    ${feet(20, 56, s, '#2E8F3D')}
    <path d="M0 -60 C22 -60 30 -44 28 -30 C26 -20 34 -12 42 4 C54 30 40 54 0 54 C-40 54 -54 30 -42 4 C-34 -12 -26 -20 -28 -30 C-30 -44 -22 -60 0 -60 Z" ${st('#3FB54A')}/>
    <path d="M-38 12 q-6 20 4 34 M-22 46 q-6 -14 -2 -30 M38 12 q6 20 -4 34 M22 46 q6 -14 2 -30" ${line(6, '#237A33')}/>
    <ellipse cx="0" cy="24" rx="23" ry="21" fill="#FF6B81" stroke="#EFFFE0" stroke-width="5"/><ellipse cx="0" cy="24" rx="25.5" ry="23.5" ${line(3)}/>
    ${[[-9, 16], [8, 18], [0, 30], [-11, 32], [11, 34]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="3.6" fill="${INK}"/>`).join('')}
    <path d="M-40 2 Q0 12 40 2" ${line(2.6, '#EFFFE0')} stroke-dasharray="5 6"/>
    <circle cx="0" cy="-32" r="22" fill="#FFE3EA" stroke="${INK}" stroke-width="4.5"/>
    <path d="M-22 -36 C-18 -58 18 -58 22 -36 C10 -46 -10 -46 -22 -36 Z" ${st('#FF5D6C', 4)}/><circle cx="-8" cy="-50" r="2.4" fill="#fff"/><circle cx="8" cy="-50" r="2.4" fill="#fff"/>
    ${face(0, -30, 0.68, e, 'smile', 12)}
    <path d="M-10 -8 l10 6 l10 -6 l-2 12 l-8 -4 l-8 4 z" ${st('#FFD23F', 3.5)}/>
    ${shine(-22, 0, 4, 10, 20, 0.45)}`,
  // Semino — petite tranche de pastèque
  mini: (e, s) => `
    ${feet(18, 52, s, '#2E8F3D', 13, 9)}
    <path d="M-50 -20 L50 -20 C50 22 26 48 0 48 C-26 48 -50 22 -50 -20 Z" ${st('#3FB54A', 6)}/>
    <path d="M-38 -18 L38 -18 C38 14 20 34 0 34 C-20 34 -38 14 -38 -18 Z" fill="#FF6B81" stroke="#EFFFE0" stroke-width="4"/>
    <ellipse cx="-22" cy="16" rx="3" ry="4.5" fill="${INK}"/><ellipse cx="22" cy="16" rx="3" ry="4.5" fill="${INK}"/><ellipse cx="0" cy="26" rx="3" ry="4.5" fill="${INK}"/>
    ${face(0, -2, 1.15, e, 'open', 13)}`,
  // Polpo Espressino — poulpe-tasse d'espresso (soigneur)
  healer: (e, s) => `
    ${[-30, -10, 10, 30].map((x, i) => limb(`M${x} 26 q${(i < 2 ? -1 : 1) * 4} 14 ${((i + s) % 2 ? 1 : -1) * 10} 26`, 9, '#A56BFF')).join('')}
    <ellipse cx="0" cy="32" rx="54" ry="10" ${st('#EDE7F6', 4.5)}/>
    <path d="M40 -22 q30 4 22 26 q-8 14 -28 10" ${line(13)}/><path d="M40 -22 q30 4 22 26 q-8 14 -28 10" ${line(6, '#F4F1FA')}/>
    <path d="M-42 -32 L42 -32 L34 22 Q32 32 20 32 L-20 32 Q-32 32 -34 22 Z" ${st('#F4F1FA')}/>
    <ellipse cx="0" cy="-32" rx="42" ry="12" ${st('#6B3E1E', 4.5)}/><path d="M-18 -33 q10 -6 20 0 t16 2" ${line(3, '#C99A66')}/>
    <path d="M-12 -52 q-8 -10 0 -18 M10 -50 q8 -10 0 -20" ${line(4, 'rgba(255,255,255,.85)')}/>
    <rect x="-5" y="12" width="10" height="16" rx="2" fill="#2ECC71" stroke="${INK}" stroke-width="2.5"/><rect x="-11" y="16" width="22" height="8" rx="2" fill="#2ECC71" stroke="${INK}" stroke-width="2.5"/><rect x="-4" y="13.5" width="8" height="13" fill="#2ECC71"/>
    ${shine(-28, -6, 4, 12, 8, 0.6)}
    ${face(0, -8, 0.95, e, 'tongue', 13)}`,
  // Medusa Paralume — méduse-abat-jour (invisible)
  stealth: (e, s) => `
    ${[-30, -10, 10, 30].map((x, i) => limb(`M${x} 14 q${((i + s) % 2 ? 8 : -8)} 14 0 24 t0 18`, 5, '#C9B6FF')).join('')}
    <circle cx="0" cy="22" r="22" fill="#FFF3A0" opacity=".45"/><circle cx="0" cy="22" r="13" ${st('#FFF3A0', 4)}/>
    <path d="M-26 -52 L26 -52 L52 14 Q0 28 -52 14 Z" ${st('#8E7BFF')}/>
    <path d="M-14 -50 L-26 16 M14 -50 L26 16 M0 -50 L0 20" ${line(3, 'rgba(255,255,255,.28)')}/>
    <rect x="-10" y="-62" width="20" height="12" rx="4" ${st('#6C5CE7', 4)}/>
    ${[-42, -21, 0, 21, 42].map((x) => `<circle cx="${x}" cy="${18 + (Math.abs(x) > 30 ? -3 : 3)}" r="6" ${st('#FFD23F', 3.5)}/>`).join('')}
    ${shine(-22, -26, 5, 14, 22, 0.45)}
    ${face(0, -16, 0.95, e, 'cat', 13)}`,
  // BOSS 1 : Tricheco Fisarmonica — morse-accordéon
  boss1: (e, s) => { const k = s ? 5 : 0; return `
    ${feet(28, 58, s, '#7D5435', 16, 9)}
    ${[-1, 1].map((d) => `<path d="M${d * 40} -18 ${[0, 1, 2, 3].map((i) => `L${d * (46 + i * 6 + (i % 2 ? k / 2 : 0))} ${i % 2 ? -26 : -18}`).join(' ')} L${d * (66 + k)} -20 L${d * (66 + k)} 42 ${[3, 2, 1, 0].map((i) => `L${d * (46 + i * 6 + (i % 2 ? k / 2 : 0))} ${i % 2 ? 48 : 40}`).join(' ')} Z" ${st('#FFF4DC', 4.5)}/>${[0, 1, 2].map((i) => `<path d="M${d * (49 + i * 6)} -20 V42" ${line(2.6, 'rgba(61,44,78,.5)')}/>`).join('')}`).join('')}
    <rect x="${-90 - k}" y="-26" width="24" height="74" rx="8" ${st('#E0393E')}/>${[0, 1, 2, 3].map((i) => `<circle cx="${-78 - k}" cy="${-12 + i * 16}" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/>`).join('')}
    <rect x="${66 + k}" y="-26" width="24" height="74" rx="8" ${st('#E0393E')}/>${[0, 1, 2, 3, 4].map((i) => `<rect x="${70 + k}" y="${-20 + i * 13}" width="16" height="10" rx="2" fill="${i % 2 ? INK : '#fff'}" stroke="${INK}" stroke-width="1.6"/>`).join('')}
    <ellipse cx="0" cy="4" rx="48" ry="52" ${st('#A6744F', 6)}/>
    <ellipse cx="0" cy="26" rx="30" ry="24" fill="#C59470" opacity=".7"/>
    ${shine(-26, -26, 7, 15, 24, 0.4)}
    ${brows(0, -22, 1.15, 13)}${face(0, -22, 1.15, e, 'none', 13, false)}
    <path d="M-17 26 q-5 36 3 44 q9 -9 8 -42 z" ${st('#FFFDF0', 4)}/><path d="M17 26 q5 36 -3 44 q-9 -9 -8 -42 z" ${st('#FFFDF0', 4)}/>
    <ellipse cx="-16" cy="16" rx="19" ry="15" ${st('#E6BB95', 4.5)}/><ellipse cx="16" cy="16" rx="19" ry="15" ${st('#E6BB95', 4.5)}/>
    ${[[-22, 12], [-12, 18], [-24, 22], [22, 12], [12, 18], [24, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${INK}"/>`).join('')}
    <ellipse cx="0" cy="4" rx="10" ry="7.5" fill="${INK}"/><ellipse cx="-3" cy="2" rx="3" ry="2" fill="#fff" opacity=".7"/>`; },
  // BOSS 2 : Gorilla Lavatrice — gorille machine à laver
  boss2: (e, s) => `
    ${[-1, 1].map((k) => { const dy = (k < 0) === !s ? -8 : 0; return limb(`M${k * 44} -22 Q${k * 82} -14 ${k * 72} ${40 + dy}`, 20, '#4A4A5E') + `<circle cx="${k * 72}" cy="${46 + dy}" r="16" ${st('#6A6A82')}/><path d="M${k * 72 - 8} ${46 + dy} v8 M${k * 72} ${46 + dy} v9 M${k * 72 + 8} ${46 + dy} v8" ${line(2.6, INK)}/>`; }).join('')}
    <rect x="-36" y="52" width="18" height="10" rx="4" ${st('#6b7888', 4)}/><rect x="18" y="52" width="18" height="10" rx="4" ${st('#6b7888', 4)}/>
    <circle cx="-34" cy="-54" r="10" ${st('#4A4A5E', 4.5)}/><circle cx="34" cy="-54" r="10" ${st('#4A4A5E', 4.5)}/>
    <ellipse cx="0" cy="-50" rx="36" ry="30" ${st('#4A4A5E', 6)}/>
    <ellipse cx="0" cy="-42" rx="25" ry="20" ${st('#9A9AB2', 4.5)}/>
    ${brows(0, -50, 0.9, 12)}${face(0, -50, 0.9, e, 'none', 12, false)}
    <ellipse cx="-5" cy="-37" rx="2.6" ry="3.4" fill="${INK}"/><ellipse cx="5" cy="-37" rx="2.6" ry="3.4" fill="${INK}"/>
    ${e === 2 ? `<ellipse cx="0" cy="-27" rx="7" ry="6" fill="#c2405b" stroke="${INK}" stroke-width="3"/>` : `<path d="M-13 -29 h26" ${line(3.4, INK)}/><path d="M-9 -29 l3 6 l3 -6 M3 -29 l3 6 l3 -6" fill="#fff" stroke="${INK}" stroke-width="2"/>`}
    <rect x="-46" y="-24" width="92" height="80" rx="13" ${st('#F3F6FA', 6)}/>
    <path d="M-46 -6 V-12 Q-46 -24 -34 -24 H34 Q46 -24 46 -12 V-6 Z" ${st('#CBD5E1', 4.5)}/>
    <circle cx="-32" cy="-15" r="4.5" fill="#F04A3A" stroke="${INK}" stroke-width="2.5"/><circle cx="-18" cy="-15" r="4.5" fill="#4CD137" stroke="${INK}" stroke-width="2.5"/><rect x="2" y="-20" width="34" height="10" rx="3" fill="${INK}"/><rect x="6" y="-17" width="14" height="4" rx="2" fill="#5fd8ff"/>
    <circle cx="0" cy="26" r="27" ${st('#98A6B6', 5)}/><circle cx="0" cy="26" r="20" ${st('#3D9DFC', 4)}/>
    <g transform="rotate(${s ? 70 : 0} 0 26)"><path d="M-12 22 q8 -12 20 -4 M12 32 q-8 12 -20 2" ${line(4, '#D6F0FF')}/></g>
    <circle cx="-8" cy="34" r="3" fill="#fff" opacity=".8"/><circle cx="9" cy="18" r="2.2" fill="#fff" opacity=".8"/>
    ${shine(-34, 6, 4, 14, 6, 0.6)}`,
  // BOSS 3 : Drago Cannolone — dragon-cannolo
  boss3: (e, s) => `
    ${[-1, 1].map((k) => `<path d="M${k * 30} -24 L${k * 84} ${-58 + (s ? 14 : 0)} L${k * 78} ${-30 + (s ? 8 : 0)} L${k * 92} ${-22 + (s ? 6 : 0)} L${k * 72} -8 L${k * 80} 4 L${k * 36} -2 Z" ${st('#E0393E')}/>`).join('')}
    ${limb('M56 30 q30 4 30 -20', 10, '#4CC43A')}<path d="M76 2 l10 -22 l10 22 z" ${st('#4CC43A', 4.5)}/>
    ${[-1, 1].map((k) => { const dy = (k < 0) === !s ? -6 : 0; return `<rect x="${k * 28 - 13}" y="${40 + dy}" width="26" height="22" rx="9" ${st('#4CC43A', 4.5)}/><path d="M${k * 28 - 8} ${62 + dy} l3 5 l3 -5 M${k * 28 + 2} ${62 + dy} l3 5 l3 -5" fill="#fff" stroke="${INK}" stroke-width="2"/>`; }).join('')}
    ${[-1, 1].map((k) => `<path d="M${k * 52} -8 c${k * 14} -6 ${k * 26} 4 ${k * 22} 14 c${k * 10} 8 ${k * 8} 22 ${k * -2} 24 c${k * 4} 12 ${k * -10} 20 ${k * -20} 14 Z" ${st('#FFFDF0', 4.5)}/><circle cx="${k * 66}" cy="8" r="3" fill="#F04A3A"/><circle cx="${k * 62}" cy="24" r="3" fill="#4CC43A"/><circle cx="${k * 70}" cy="18" r="2.6" fill="#6B3E1E"/>`).join('')}
    <rect x="-56" y="-12" width="112" height="60" rx="28" ${st('#D99A48', 6)}/>
    <path d="M-40 -6 L-22 42 M-18 -10 L2 46 M6 -10 L26 44 M30 -8 L44 30" ${line(3.4, '#A86A22')}/>
    <circle cx="-30" cy="26" r="4" fill="#F0BC72"/><circle cx="16" cy="6" r="4" fill="#F0BC72"/><circle cx="36" cy="34" r="3" fill="#F0BC72"/>
    ${shine(-34, 0, 5, 12, 60, 0.4)}
    <path d="M-28 -62 l-8 -24 l20 14 z" ${st('#FFF0C4', 4.5)}/><path d="M28 -62 l8 -24 l-20 14 z" ${st('#FFF0C4', 4.5)}/>
    <ellipse cx="0" cy="-38" rx="40" ry="32" ${st('#4CC43A', 6)}/>
    <path d="M-12 -68 l6 -10 l6 10 l6 -10 l6 10" ${st('#E0393E', 3.5)}/>
    ${brows(0, -46, 1.05, 14)}${face(0, -46, 1.05, e, 'none', 14, false)}
    <ellipse cx="0" cy="-22" rx="26" ry="15" ${st('#8BE36A', 4.5)}/>
    <ellipse cx="-9" cy="-26" rx="3" ry="4" fill="${INK}"/><ellipse cx="9" cy="-26" rx="3" ry="4" fill="${INK}"/>
    ${e === 2 ? `<ellipse cx="0" cy="-14" rx="8" ry="6" fill="#c2405b" stroke="${INK}" stroke-width="3"/>` : `<path d="M-16 -16 q16 8 32 0" ${line(3.2, INK)}/><path d="M-12 -14 l4 9 l4 -8 M4 -13 l4 8 l4 -9" fill="#fff" stroke="${INK}" stroke-width="2.2"/>`}
    <circle cx="-14" cy="-36" r="3" fill="#fff" opacity=".0"/>`,
};

// Œil sur tige (escargot)
function eyeBall(x, y, r, e) {
  if (e === 1) return `<circle cx="${x}" cy="${y}" r="${r}" ${st('#F6D7A3', 4)}/><path d="M${x - r * 0.6} ${y} q${r * 0.6} ${r * 0.5} ${r * 1.2} 0" ${line(3, INK)}/>`;
  if (e === 2) return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M${x - 4} ${y - 4} l8 8 M${x + 4} ${y - 4} l-8 8" ${line(3, INK)}/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${x + 2}" cy="${y + 1}" r="${r * 0.52}" fill="${INK}"/><circle cx="${x}" cy="${y - 2}" r="${r * 0.2}" fill="#fff"/>`;
}

const EVB = 96; // demi-vue des brainrots (le rayon de collision vaut 50)
export function enemySvg(type, expr = 0, step = 0, px = 192) {
  grads = new Set(); finish = 'classic'; OL = INK;
  const body = ENEMY_ART[type](expr, step);
  return build(body, EVB, px);
}

// ------------------------------------------------------------------ armes
const STEEL = '#8E9AAB', DARK = '#4A4F63', WOOD = '#C98A4B';
const MAIN = { assault: '#3FBFA8', smg: '#9B6BFF', shotgun: '#F0843A', sniper: '#6FBF3B', rocket: '#5C9DF2', minigun: '#F5B83D', cryo: '#58C8F5', mine: '#6B7488' };
const gunEyes = (x, y, s = 1) => [-1, 1].map((k) => `<ellipse cx="${x + k * 8 * s}" cy="${y}" rx="${4.4 * s}" ry="${5.6 * s}" fill="${INK}"/><circle cx="${x + k * 8 * s - 1.4 * s}" cy="${y - 2 * s}" r="${1.8 * s}" fill="#fff"/>`).join('');
const star = (x, y, r, fill = '#FFD23F') => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * q).toFixed(1)} ${(y + Math.sin(a) * q).toFixed(1)}`; } return `<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`; };

// Dessinées vers +x, pivot en (0,0), 2 unités = 1 px de jeu. L = niveau (1-5), b = branche (0/1/null), R = couleur de rareté.
const TOWER_ART = {
  assault: (L, b, R, M) => `
    <path d="M-80 -9 L-42 -11 L-42 11 L-64 17 Q-82 19 -82 5 Z" ${st(WOOD)}/>
    <rect x="-28" y="8" width="15" height="28" rx="6" transform="rotate(14 -20 10)" ${st(DARK)}/>
    ${b === 0 ? `<circle cx="12" cy="30" r="20" ${st(DARK)}/><circle cx="12" cy="30" r="9" ${st(STEEL, 3.5)}/>` : `<path d="M0 10 L22 10 L${28 + L} ${34 + L * 3} Q16 ${44 + L * 3} 6 ${36 + L * 3} Z" ${st(DARK)}/>`}
    <rect x="36" y="-6" width="${L >= 3 ? 40 : 50}" height="10" rx="4" ${st(STEEL)}/>
    ${L >= 3 ? `<rect x="72" y="-11" width="16" height="20" rx="5" ${st(DARK)}/>` : ''}
    <rect x="28" y="-13" width="34" height="22" rx="8" ${st(shade(M, -0.28))}/><path d="M36 -4 h18 M36 3 h18" ${line(2.6, 'rgba(0,0,0,.3)')}/>
    <rect x="-46" y="-17" width="82" height="32" rx="12" ${st(M)}/>
    <rect x="-36" y="5" width="48" height="6" rx="3" fill="${R}"/>
    ${b === 1 ? `<rect x="-26" y="-36" width="56" height="17" rx="8.5" ${st(DARK, 4.5)}/><circle cx="30" cy="-27.5" r="6" fill="${R}" stroke="${INK}" stroke-width="3"/><rect x="-14" y="-21" width="8" height="6" fill="${INK}"/><rect x="10" y="-21" width="8" height="6" fill="${INK}"/>` : L >= 2 ? `<rect x="-16" y="-32" width="28" height="16" rx="6" ${st(DARK, 4.5)}/><circle cx="-2" cy="-24" r="4.2" fill="${R}"/>` : `<rect x="-6" y="-26" width="12" height="10" rx="3" ${st(DARK, 4)}/>`}
    ${shine(-26, -9, 14, 3, 0, 0.45)}${gunEyes(-14, -3)}${L >= 5 ? star(20, -2, 8) : ''}`,
  smg: (L, b, R, M) => { const n = b === 1 ? (L >= 5 ? 3 : 2) : 1, h = 30 + (n - 1) * 12; return `
    <path d="M-72 ${-h / 2 + 4} H-42 M-72 ${-h / 2 + 4} V10" ${line(11)}/><path d="M-72 ${-h / 2 + 4} H-42 M-72 ${-h / 2 + 4} V10" ${line(5, STEEL)}/>
    <rect x="-36" y="8" width="15" height="26" rx="6" transform="rotate(12 -28 10)" ${st(DARK)}/>
    <rect x="-6" y="8" width="17" height="${32 + L * 3}" rx="6" ${st(DARK)}/><rect x="-3" y="${32 + L * 3}" width="11" height="5" rx="2" fill="${R}"/>
    ${Array.from({ length: n }, (_, i) => { const y = (i - (n - 1) / 2) * 13; return b === 0 ? `<rect x="24" y="${y - 9}" width="48" height="18" rx="8" ${st(DARK)}/><path d="M36 ${y - 9} v18 M48 ${y - 9} v18 M60 ${y - 9} v18" ${line(2.4, 'rgba(255,255,255,.25)')}/>` : `<rect x="24" y="${y - 5.5}" width="48" height="11" rx="5" ${st(STEEL)}/>`; }).join('')}
    <rect x="-46" y="${-h / 2}" width="76" height="${h}" rx="13" ${st(M)}/>
    <rect x="-36" y="${h / 2 - 11}" width="40" height="6" rx="3" fill="${R}"/>
    ${L >= 2 ? `<rect x="-10" y="${-h / 2 - 12}" width="22" height="13" rx="5" ${st(DARK, 4.5)}/><circle cx="1" cy="${-h / 2 - 5.5}" r="3.4" fill="${R}"/>` : ''}
    ${L >= 3 ? `<circle cx="20" cy="${h / 2 - 2}" r="6" ${st('#FFD23F', 3.5)}/>` : ''}
    ${shine(-28, -h / 2 + 8, 12, 3, 0, 0.45)}${gunEyes(-18, -2)}${L >= 5 ? star(12, -3, 7) : ''}`; },
  shotgun: (L, b, R, M) => `
    <path d="M-86 -6 Q-86 -15 -76 -15 L-38 -12 L-38 12 L-72 20 Q-86 20 -86 8 Z" ${st(WOOD)}/><path d="M-76 -6 L-48 -4" ${line(3, 'rgba(255,255,255,.3)')}/>
    <rect x="6" y="1" width="60" height="11" rx="5" ${st(DARK)}/>
    <rect x="6" y="-14" width="${b === 1 ? 82 : 76}" height="14" rx="6" ${st(STEEL)}/>
    ${b === 1 ? `<rect x="76" y="-17" width="12" height="20" rx="4" ${st(DARK)}/>` : b === 0 ? `<path d="M74 -17 h14 l-4 5 l4 5 l-4 5 l4 5 h-14 z" ${st('#F04A3A', 4)}/>` : `<rect x="78" y="-16" width="10" height="18" rx="4" ${st(DARK, 4.5)}/>`}
    <rect x="26" y="-3" width="30" height="18" rx="7" ${st(shade(WOOD, -0.15))}/><path d="M34 -1 v14 M41 -1 v14 M48 -1 v14" ${line(2.4, 'rgba(0,0,0,.3)')}/>
    <rect x="-42" y="-18" width="52" height="34" rx="12" ${st(M)}/>
    <rect x="-34" y="6" width="34" height="6" rx="3" fill="${R}"/>
    ${L >= 2 ? Array.from({ length: Math.min(4, L) }, (_, i) => `<rect x="${-36 + i * 10}" y="-29" width="8" height="12" rx="3" ${st('#F04A3A', 3.5)}/><rect x="${-36 + i * 10}" y="-21" width="8" height="4" fill="#FFD23F"/>`).join('') : ''}
    ${shine(-26, -10, 10, 3, 0, 0.45)}${gunEyes(-18, -2)}${L >= 5 ? star(0, -3, 7) : ''}`,
  sniper: (L, b, R, M) => `
    <path d="M-98 -8 L-54 -12 L-54 12 L-80 18 Q-98 18 -98 6 Z" ${st(shade(M, -0.25))}/><rect x="-90" y="-16" width="30" height="9" rx="4" ${st(DARK, 4)}/>
    ${L >= 2 ? `<path d="M62 2 L50 28 M62 2 L76 28" ${line(9)}/><path d="M62 2 L50 28 M62 2 L76 28" ${line(4, STEEL)}/>` : ''}
    <rect x="20" y="${b === 0 ? -8 : -5.5}" width="88" height="${b === 0 ? 15 : 10}" rx="5" ${st(STEEL)}/>
    <rect x="${b === 0 ? 98 : 102}" y="${b === 0 ? -13 : -10}" width="${b === 0 ? 22 : 18}" height="${b === 0 ? 25 : 19}" rx="5" ${st(DARK)}/>${b === 0 ? `<path d="M105 -13 v25 M113 -13 v25" ${line(2.4, 'rgba(255,255,255,.3)')}/>` : ''}
    <rect x="-20" y="10" width="20" height="${16 + L * 2}" rx="5" ${st(DARK)}/>
    <rect x="-58" y="-15" width="86" height="29" rx="11" ${st(M)}/>
    <rect x="-48" y="5" width="50" height="6" rx="3" fill="${R}"/>
    <rect x="-30" y="-22" width="8" height="9" fill="${INK}"/><rect x="6" y="-22" width="8" height="9" fill="${INK}"/>
    <rect x="-42" y="-38" width="${68 + L * 4}" height="17" rx="8.5" ${st(DARK)}/>
    <rect x="${22 + L * 4}" y="-43" width="15" height="27" rx="6" ${st(DARK)}/>
    <ellipse cx="${30 + L * 4}" cy="-29.5" rx="4" ry="8.5" fill="${b === 1 ? '#FF7A3C' : R}" stroke="${INK}" stroke-width="2.4"/>
    <rect x="-48" y="-41" width="10" height="23" rx="4" ${st(DARK, 4.5)}/>
    ${shine(-20, -34, 16, 2.5, 0, 0.4)}${gunEyes(-34, -2)}${L >= 5 ? star(8, -2, 7) : ''}`,
  rocket: (L, b, R, M) => `
    <path d="M-92 -24 L-66 -15 L-66 15 L-92 24 Z" ${st(DARK)}/>
    <rect x="-18" y="14" width="15" height="26" rx="6" ${st(DARK)}/>${L >= 2 ? `<rect x="22" y="14" width="14" height="20" rx="6" ${st(DARK)}/>` : ''}
    <path d="M68 -13 Q94 -9 100 0 Q94 9 68 13 Z" ${st('#F04A3A')}/><path d="M76 -10 Q80 0 76 10" ${line(3, '#fff')}/>
    <rect x="-68" y="-18" width="136" height="36" rx="13" ${st(M)}/>
    <rect x="-46" y="-18" width="9" height="36" fill="${R}"/><rect x="34" y="-18" width="9" height="36" fill="${R}"/>
    <rect x="56" y="-21" width="17" height="42" rx="7" ${st(DARK)}/>
    ${b === 0 ? [-30, -6, 18].map((x) => `<path d="M${x} -36 h14 l8 7 l-8 7 h-14 z" ${st('#F04A3A', 3.5)}/>`).join('') : b === 1 ? `<path d="M-18 -20 v-12" ${line(5)}/><path d="M-32 -44 q14 14 28 0 z" ${st(STEEL, 4)}/><rect x="2" y="-36" width="26" height="18" rx="5" ${st(DARK, 4)}/><circle cx="15" cy="-27" r="5" fill="#4CD137"/>` : `<rect x="-12" y="-36" width="24" height="18" rx="5" ${st(DARK, 4.5)}/><circle cx="0" cy="-27" r="4.4" fill="${R}"/>`}
    ${shine(-12, -10, 22, 3, 0, 0.45)}${gunEyes(10, -1, 1.1)}${L >= 5 ? star(-56, 0, 7) : ''}`,
  minigun: (L, b, R, M) => `
    <rect x="-74" y="6" width="42" height="${28 + L * 2}" rx="8" ${st(shade(M, -0.3))}/>${[0, 1, 2].map((i) => `<circle cx="${-64 + i * 11}" cy="18" r="3.4" fill="#FFD23F" stroke="${INK}" stroke-width="2"/>`).join('')}
    <path d="M-48 -20 Q-32 -48 -8 -20" ${line(11)}/><path d="M-48 -20 Q-32 -48 -8 -20" ${line(5, DARK)}/>
    <rect x="6" y="-19" width="90" height="38" rx="8" ${st(b === 0 ? '#C97A6A' : STEEL)}/>
    ${b === 0 ? '<rect x="60" y="-17" width="34" height="34" rx="6" fill="#FF7A3C" opacity=".75"/>' : ''}
    <rect x="42" y="-22" width="11" height="44" rx="5" ${st(DARK, 4.5)}/><rect x="86" y="-22" width="13" height="44" rx="5" ${st(DARK)}/>
    <rect x="-6" y="-23" width="14" height="46" rx="6" ${st(DARK)}/>
    <rect x="-64" y="-23" width="64" height="46" rx="15" ${st(M)}/>
    <rect x="-54" y="10" width="40" height="6" rx="3" fill="${R}"/>
    ${b === 1 ? `<path d="M-22 -8 q8 -14 2 -22 q14 8 12 22 q-2 10 -9 10 q-9 0 -5 -10 z" ${st('#FF7A3C', 3)}/>` : ''}
    ${L >= 3 ? `<rect x="-40" y="-36" width="24" height="14" rx="5" ${st(DARK, 4.5)}/><circle cx="-28" cy="-29" r="3.6" fill="${R}"/>` : ''}
    ${shine(-44, -14, 12, 3, 0, 0.45)}${gunEyes(-38, -3, 1.1)}${L >= 5 ? star(-14, 2, 7) : ''}`,
  cryo: (L, b, R, M) => `
    ${[-1, 1].map((k) => `<rect x="${k * 30 - 9}" y="34" width="18" height="16" rx="6" ${st(DARK, 4.5)}/>`).join('')}
    ${L >= 2 ? [-1, 1].map((k) => `<path d="M${k * 30} -22 l${k * 12} -22 l${k * 4} 26 z" ${st('#BDF3FF', 4)}/>`).join('') : ''}
    <path d="M0 -78 L${22 + L * 2} -44 L15 -8 L-15 -8 L${-22 - L * 2} -44 Z" ${st(b === 1 ? '#FFC2E2' : '#BDF3FF')}/>
    <path d="M0 -78 L0 -8 M${22 + L * 2} -44 L0 -30 L${-22 - L * 2} -44" ${line(2.6, 'rgba(255,255,255,.8)')}/>
    ${b === 1 ? `<path d="M-6 -60 l8 12 l-10 10 l8 12" ${line(3, INK)}/>` : ''}
    ${[-1, 1].map((k) => `<circle cx="${k * 44}" cy="10" r="13" ${st(DARK)}/><circle cx="${k * 44}" cy="10" r="6" fill="#8fe9ff"/>`).join('')}
    <rect x="-36" y="-12" width="72" height="52" rx="18" ${st(M)}/>
    <rect x="-36" y="26" width="72" height="7" fill="${R}"/>
    ${b === 0 ? [0, 60, 120].map((a) => `<path d="M-20 -44 h40" transform="rotate(${a} 0 -44)" ${line(4, '#fff')}/>`).join('') : ''}
    ${shine(-22, -2, 5, 10, 14, 0.5)}
    <g>${[-1, 1].map((k) => `<ellipse cx="${k * 11}" cy="8" rx="5.6" ry="7" fill="${INK}"/><circle cx="${k * 11 - 2}" cy="5.5" r="2.2" fill="#fff"/>`).join('')}<path d="M-5 17 q5 5 10 0" ${line(2.8, INK)}/><ellipse cx="-22" cy="16" rx="5" ry="3" fill="#ff8fab" opacity=".7"/><ellipse cx="22" cy="16" rx="5" ry="3" fill="#ff8fab" opacity=".7"/></g>
    ${L >= 5 ? star(0, -44, 8) : ''}`,
  mine: (L, b, R, M) => { const sp = b === 0 ? 52 : 44 + L; return `
    ${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU, c = Math.cos(a), s = Math.sin(a), w = 0.26; return `<path d="M${Math.cos(a - w) * 30} ${Math.sin(a - w) * 30} L${c * sp} ${s * sp} L${Math.cos(a + w) * 30} ${Math.sin(a + w) * 30} Z" ${st(b === 1 ? '#FFD23F' : DARK, 4.5)}/>`; }).join('')}
    <circle cx="0" cy="0" r="35" ${st(M)}/>
    <circle cx="0" cy="0" r="25" fill="none" stroke="${R}" stroke-width="6"/>
    ${b === 0 ? `<circle cx="0" cy="0" r="25" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="8 11.6"/>` : ''}
    ${[45, 135, 225, 315].map((a) => `<circle cx="${Math.cos((a * Math.PI) / 180) * 30}" cy="${Math.sin((a * Math.PI) / 180) * 30}" r="2.6" fill="${INK}" opacity=".5"/>`).join('')}
    <circle cx="0" cy="-6" r="12" ${st(DARK, 4.5)}/>
    ${b === 1 ? `<path d="M-22 6 l8 -8 l-2 8 l8 -4 M22 6 l-8 -8 l2 8 l-8 -4" ${line(2.8, '#FFD23F')}/>` : ''}
    ${shine(-18, -20, 8, 3.5, -30, 0.45)}${gunEyes(0, 17, 0.9)}`; },
};

const TVB = 130; // demi-vue des armes (260 unités = 130 px de jeu)
// icon = true : cadrage serré et arme inclinée, pour l'interface
export function towerSvg(type, level = 1, branch = null, fin = 'classic', px = 260, icon = false) {
  grads = new Set(); finish = fin; OL = fin === 'neon' ? '#0a0d1c' : INK;
  const R = RARITY[level - 1].color, k = 1 + (level - 1) * 0.035;
  const upright = type === 'cryo' || type === 'mine';
  const tf = icon ? (upright ? `translate(0 ${type === 'cryo' ? 14 : 0}) scale(${type === 'mine' ? 1.5 : 1.05})` : `rotate(-32) translate(${type === 'sniper' ? -12 : -4} 0) scale(${type === 'sniper' ? 0.84 : 1.02})`) : `scale(${k})`;
  const body = `<g transform="${tf}">${TOWER_ART[type](level, branch, R, MAIN[type])}</g>`;
  const glow = fin === 'neon' ? `<filter id="nf" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const svg = build(glow ? `<g filter="url(#nf)">${body}</g>` : body, icon ? 96 : upright ? 100 : TVB, px);
  return glow ? svg.replace('<defs>', '<defs>' + glow) : svg;
}
export const skinFinish = (skinId) => (SHOP.skins.find((s) => s.id === skinId) || {}).finish || 'classic';

// ------------------------------------------------------------------ rastérisation + cache
const url = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
function raster(svg, px, withWhite) {
  const o = { ready: false, cv: null, white: null };
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = px; cv.getContext('2d').drawImage(img, 0, 0, px, px); o.cv = cv;
    if (withWhite) { const w = document.createElement('canvas'); w.width = w.height = px; const c = w.getContext('2d'); c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, px, px); o.white = w; }
    o.ready = true;
  };
  img.src = url(svg);
  return o;
}

const enemyCache = new Map();
// frames[expression][pas] ; half = demi-taille d'affichage en px de jeu
export function enemyFrames(type) {
  let f = enemyCache.get(type);
  if (!f) {
    const r = ENEMIES[type].r, half = (r * EVB) / 50, px = Math.min(640, Math.ceil(half * 2 * 2.5));
    f = { half, frames: [0, 1, 2].map((e) => [0, 1].map((s) => raster(enemySvg(type, e, s, px), px, e === 2 || e === 0))) };
    enemyCache.set(type, f);
  }
  return f;
}
const towerCache = new Map();
export function towerSprite(type, level, branch, fin) {
  const key = `${type}|${level}|${branch}|${fin}`;
  let s = towerCache.get(key);
  if (!s) { s = raster(towerSvg(type, level, branch, fin, 390), 390, false); s.half = type === 'cryo' || type === 'mine' ? 50 : TVB / 2; towerCache.set(key, s); }
  return s;
}
export function preloadSprites(skin) {
  for (const t of Object.keys(ENEMIES)) enemyFrames(t);
  for (const t of Object.keys(TOWER_ART)) towerSprite(t, 1, null, skinFinish(skin));
}

// Images pour l'interface (DOM)
export function enemyImg(type, size = 40) { const i = new Image(); i.src = url(enemySvg(type, 0, 0, size * 3)); i.width = i.height = size; i.alt = ''; i.draggable = false; return i; }
export function towerImg(type, size = 48, skin = 'default', level = 1, branch = null) { const i = new Image(); i.src = url(towerSvg(type, level, branch, skinFinish(skin), size * 3, true)); i.width = i.height = size; i.alt = ''; i.draggable = false; return i; }

// ------------------------------------------------------------------ socle (canvas) : couleur et éclat selon la rareté
export function drawPad(c, level, time = 0) {
  const col = RARITY[level - 1].color, R = GAME.towerRadius;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 7, R + 2, R * 0.8, 0, 0, TAU); c.fill();
  if (level >= 5) { // halo légendaire
    const g = c.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.9); g.addColorStop(0, 'rgba(255,210,63,.55)'); g.addColorStop(1, 'rgba(255,210,63,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 1.9, 0, TAU); c.fill();
  }
  c.lineWidth = 4; c.strokeStyle = INK;
  c.fillStyle = '#39324f'; c.beginPath(); c.arc(0, 3, R, 0, TAU); c.fill(); c.stroke();
  const g = c.createLinearGradient(0, -R, 0, R); g.addColorStop(0, '#7a7396'); g.addColorStop(1, '#4b4466');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.stroke();
  c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, R - 6, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, R - 6, -2.4, -1.2); c.stroke();
  if (level >= 4) { c.strokeStyle = col; c.lineWidth = 2.5; c.setLineDash([5, 7]); c.lineDashOffset = -time * 14; c.beginPath(); c.arc(0, 0, R + 5, 0, TAU); c.stroke(); c.setLineDash([]); }
}
