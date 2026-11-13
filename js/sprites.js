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
  // BOSS 4 : Pinguino Frigorifero — manchot-réfrigérateur
  boss4: (e, s) => `
    ${[-1, 1].map((k) => `<ellipse cx="${k * 24}" cy="${60 - ((k < 0) === !s ? 6 : 0)}" rx="18" ry="9" ${st('#FF9F1A', 4.5)}/>`).join('')}
    ${[-1, 1].map((k) => `<path d="M${k * 50} -8 Q${k * (84 + (s ? 6 : 0))} ${6 + (k < 0 === !s ? -14 : 6)} ${k * 70} 40 Q${k * 56} 30 ${k * 50} 16 Z" ${st('#2B2F45')}/>`).join('')}
    <rect x="-52" y="-30" width="104" height="88" rx="14" ${st('#EAF4FF', 6)}/>
    <path d="M-52 6 H52" ${line(4, 'rgba(61,44,78,.55)')}/>
    <rect x="30" y="-20" width="9" height="20" rx="4" ${st('#98A6B6', 3.5)}/><rect x="30" y="14" width="9" height="30" rx="4" ${st('#98A6B6', 3.5)}/>
    <path d="M-40 16 l8 8 l8 -8 l8 8 l8 -8" ${line(3, '#8FD8FF')}/><circle cx="-32" cy="-14" r="5" fill="#4CD137" stroke="${INK}" stroke-width="2.5"/><circle cx="-18" cy="-14" r="5" fill="#5fd8ff" stroke="${INK}" stroke-width="2.5"/>
    ${[-36, -12, 12, 36].map((x) => `<path d="M${x} 56 l4 12 l4 -12 z" ${st('#BDF3FF', 3)}/>`).join('')}
    ${shine(-38, 34, 4, 14, 4, 0.7)}
    <ellipse cx="0" cy="-52" rx="40" ry="34" ${st('#2B2F45', 6)}/>
    <path d="M-28 -44 C-28 -68 -4 -66 0 -52 C4 -66 28 -68 28 -44 C28 -26 12 -22 0 -22 C-12 -22 -28 -26 -28 -44 Z" fill="#fff" stroke="${INK}" stroke-width="4"/>
    ${brows(0, -46, 0.95, 12)}${face(0, -46, 0.95, e, 'none', 12)}
    <path d="M-10 -36 L0 -24 L10 -36 Q0 -42 -10 -36 Z" ${st('#FF9F1A', 4)}/>
    <path d="M-8 -84 l8 -10 l8 10 z" ${st('#5fd8ff', 3.5)}/>`,
  // BOSS 5 : Leone Lasagna — lion à crinière de lasagnes
  boss5: (e, s) => `
    ${limb(`M52 30 q34 6 30 -22`, 9, '#E8A23B')}<circle cx="82" cy="4" r="10" ${st('#C2402B', 4.5)}/>
    ${[-1, 1].map((k) => { const dy = (k < 0) === !s ? -7 : 0; return `<rect x="${k * 30 - 14}" y="${38 + dy}" width="28" height="24" rx="10" ${st('#E8A23B', 4.5)}/><path d="M${k * 30 - 7} ${62 + dy} v-6 M${k * 30 + 5} ${62 + dy} v-6" ${line(2.6, INK)}/>`; }).join('')}
    <ellipse cx="0" cy="28" rx="48" ry="30" ${st('#F0B44C', 6)}/><ellipse cx="0" cy="36" rx="26" ry="16" fill="#FFE2A6" opacity=".8"/>
    ${[0, 1, 2].map((i) => { const r = 62 - i * 9, col = ['#F7D774', '#D9482B', '#FFE9A8'][i]; let d = ''; for (let k = 0; k <= 16; k++) { const a = (k / 16) * TAU - Math.PI / 2, q = r + (k % 2 ? 6 : -2) + (s && k % 2 ? 2 : 0); d += `${k ? 'L' : 'M'}${(Math.cos(a) * q).toFixed(1)} ${(-34 + Math.sin(a) * q * 0.92).toFixed(1)} `; } return `<path d="${d}Z" ${st(col, i ? 4 : 6)}/>`; }).join('')}
    ${[[-44, -62], [40, -70], [52, -20], [-54, -14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#3FA82A"/>`).join('')}
    <circle cx="-30" cy="-66" r="11" ${st('#F0B44C', 4.5)}/><circle cx="30" cy="-66" r="11" ${st('#F0B44C', 4.5)}/><circle cx="-30" cy="-66" r="5" fill="#ff9fbf"/><circle cx="30" cy="-66" r="5" fill="#ff9fbf"/>
    <ellipse cx="0" cy="-34" rx="38" ry="34" ${st('#F0B44C', 5)}/>
    ${shine(-20, -52, 6, 12, 28, 0.4)}
    ${brows(0, -42, 1.05, 14)}${face(0, -42, 1.05, e, 'none', 14)}
    <ellipse cx="-11" cy="-20" rx="13" ry="10" ${st('#FFE9BD', 4)}/><ellipse cx="11" cy="-20" rx="13" ry="10" ${st('#FFE9BD', 4)}/>
    <path d="M-7 -30 L7 -30 L0 -22 Z" ${st('#7A3B2A', 3.5)}/>
    ${e === 2 ? `<ellipse cx="0" cy="-10" rx="8" ry="7" fill="#c2405b" stroke="${INK}" stroke-width="3"/>` : `<path d="M-10 -12 q10 10 20 0" ${line(3.2, INK)}/><path d="M-7 -11 l3 7 l3 -7 M1 -11 l3 7 l3 -7" fill="#fff" stroke="${INK}" stroke-width="2"/>`}
    <path d="M-24 -72 L-18 -96 L-8 -80 L0 -100 L8 -80 L18 -96 L24 -72 Z" ${st('#FFD23F', 4.5)}/><circle cx="0" cy="-84" r="4" fill="#E0393E" stroke="${INK}" stroke-width="2.4"/>`,
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

// ------------------------------------------------------------------ tourelles
// Vue de dessus : un socle fixe + une tête qui pivote (dessinée vers +x, pivot en (0,0), 2 unités = 1 px de jeu).
// L = niveau (1-5), b = branche (0/1/null), R = couleur de rareté, M = couleur du type.
const STEEL = '#8E9AAB', DARK = '#4A4F63', WOOD = '#C98A4B', GOLD = '#F5B83D', HOT = '#F04A3A';
export const TOWER_COLOR = { assault: '#3D8BFF', smg: '#3FCF5E', shotgun: '#FF8A2A', sniper: '#9B5CFF', rocket: '#F0443A', minigun: '#8E9AAB', cryo: '#4FD6F5', mine: '#5B6178' };
const star = (x, y, r, fill = '#FFD23F') => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * q).toFixed(1)} ${(y + Math.sin(a) * q).toFixed(1)}`; } return `<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`; };
const rect = (x, y, w, h, r, fill, sw = SW) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${st(fill, sw)}/>`;
const circ = (x, y, r, fill, sw = SW) => `<circle cx="${x}" cy="${y}" r="${r}" ${st(fill, sw)}/>`;
const lens = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="3"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.32}" fill="#fff" opacity=".85"/>`;
const bolts = (n, r, rad = 2.6) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + 0.4; return `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="${rad}" fill="${INK}" opacity=".55"/>`; }).join('');
const vents = (x, y, n, len = 12, gap = 6) => `<path d="${Array.from({ length: n }, (_, i) => `M${x} ${y + i * gap} h${len}`).join(' ')}" ${line(2.8, 'rgba(0,0,0,.35)')}/>`;
const poly = (pts, fill, sw = SW) => `<path d="M${pts.map((p) => p.join(' ')).join(' L')} Z" ${st(fill, sw)}/>`;
// couleurs d'armure / de canon : dorées au niveau 5
const arm = (L) => (L >= 5 ? GOLD : DARK), bar = (L) => (L >= 5 ? '#E3A21C' : STEEL);

// Socle : grandit et se blinde avec le niveau, anneau à la couleur de la rareté
function basePlate(L, R, M) {
  const r = [42, 48, 52, 56, 58][L - 1], A = L >= 5 ? GOLD : L >= 3 ? '#565b73' : DARK;
  let s = `<circle cx="0" cy="6" r="${r + 2}" fill="${INK}" opacity=".3"/>`;
  if (L >= 3) s += poly(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU + 0.39; return [(Math.cos(a) * (r + 5)).toFixed(1), (Math.sin(a) * (r + 5)).toFixed(1)]; }), A);
  else s += circ(0, 0, r, A);
  if (L >= 4) s += [45, 135, 225, 315].map((a) => `<rect x="${r - 6}" y="-9" width="14" height="18" rx="4" transform="rotate(${a})" ${st(M, 4)}/>`).join('');
  s += `<circle r="${r - 9}" fill="${shade(A, -0.25)}" stroke="${R}" stroke-width="6"/>`;
  if (L >= 2) s += bolts(L >= 3 ? 8 : 4, r - 3.5);
  s += `<path d="M${-r + 8} -14 A${r - 4} ${r - 4} 0 0 1 -14 ${-r + 8}" ${line(3.5, 'rgba(255,255,255,.4)')}/>`;
  return s;
}
// Tête : chaque fonction renvoie le SVG de la partie qui pivote
const HEAD = {
  // Fusil d'assaut — compact, plaques de blindage, bleu
  assault: (L, b, R, M) => {
    const A = arm(L), B = bar(L); let s = '';
    if (b === 0) { // Rafale : trois canons et tambour de munitions
      s += [-11, 0, 11].map((y) => rect(20, y - 4.5, 62, 9, 4, B, 4.5)).join('') + rect(74, -19, 12, 38, 5, A);
      s += circ(-6, 34, 17, A) + circ(-6, 34, 7, GOLD, 3.5) + rect(-34, -26, 60, 52, 14, M) + rect(-30, -34, 44, 12, 5, A, 4.5);
    } else if (b === 1) { // Balles traçantes : long canon, capteur et viseur laser
      s += rect(20, -5.5, 84, 11, 5, B) + rect(92, -9, 16, 18, 5, A) + `<circle cx="110" cy="0" r="5" fill="#ff5d6c"/>`;
      s += rect(-34, -24, 58, 48, 14, M) + rect(-20, -40, 40, 16, 7, A, 4.5) + lens(20, -32, 8, '#ff5d6c') + rect(-30, 24, 40, 10, 4, A, 4.5);
    } else {
      s += rect(20, -5.5, L >= 3 ? 70 : 54, 11, 5, B);
      if (L >= 3) s += rect(82, -9, 14, 18, 5, A) + rect(20, 10, 40, 7, 3.5, B, 4);
      else s += rect(68, -8, 9, 16, 4, A, 4.5);
      s += rect(-32, -23, 56, 46, 13, M);
      if (L >= 2) s += rect(-28, -32, 42, 11, 5, A, 4.5) + rect(-28, 21, 42, 11, 5, A, 4.5);
    }
    s += rect(-22, -10, 26, 20, 7, shade(M, -0.3), 4) + lens(-9, 0, 6, R) + shine(-18, -16, 10, 3, 0, 0.45);
    if (L >= 3) s += vents(8, -8, 3, 9);
    return s + (L >= 5 ? star(8, 0, 9) : '');
  },
  // Mitraillette — petite, nerveuse, double chargeur, verte
  smg: (L, b, R, M) => {
    const A = arm(L), B = bar(L); let s = '';
    const mags = [-1, 1].map((k) => circ(-4, k * 27, 13, A) + `<circle cx="-4" cy="${k * 27}" r="5" fill="#FFD23F" stroke="${INK}" stroke-width="2.6"/>`).join('');
    if (b === 0) { // Perforantes : deux aiguilles effilées
      s += [-7, 7].map((y) => poly([[14, y - 5], [70, y - 3.5], [92, y], [70, y + 3.5], [14, y + 5]], '#3a3f55', 4.5) + `<path d="M74 ${y} L90 ${y}" ${line(2.4, '#c9a6ff')}/>`).join('');
      s += mags + circ(0, 0, 25, M) + rect(10, -15, 12, 30, 5, A, 4.5);
    } else if (b === 1) { // Double / triple canon
      const ys = L >= 5 ? [-17, 0, 17] : [-12, 12];
      s += ys.map((y) => rect(12, y - 7, 54, 14, 6, B) + rect(58, y - 9, 10, 18, 4, A, 4.5)).join('');
      s += mags + rect(-28, -27, 50, 54, 16, M);
    } else {
      s += (L >= 3 ? [-6.5, 6.5] : [0]).map((y) => rect(14, y - 4.5, L >= 3 ? 54 : 44, 9, 4, B, 4.5)).join('');
      s += mags + circ(0, 0, 24, M);
      if (L >= 2) s += `<path d="M14 -22 A26 26 0 0 1 14 22" ${line(13)}/><path d="M14 -22 A26 26 0 0 1 14 22" ${line(6, A === GOLD ? GOLD : '#6b7185')}/>`;
    }
    s += lens(-6, 0, 7, R) + shine(-12, -14, 7, 2.6, -20, 0.5);
    return s + (L >= 5 ? star(-22, 0, 7) : '');
  },
  // Pompe — trapue, canon large et court, orange
  shotgun: (L, b, R, M) => {
    const A = arm(L), B = bar(L); let s = '';
    if (b === 0) { // Souffle du dragon : tête de dragon
      s += [-1, 1].map((k) => poly([[-22, k * 20], [-52, k * 40], [-30, k * 12]], '#FFF0C4', 4.5)).join('');
      s += `<path d="M-34 -26 Q-40 0 -34 26 L18 22 Q62 16 70 6 L70 -6 Q62 -16 18 -22 Z" ${st(HOT)}/>`;
      s += poly([[62, -9], [84, -5], [84, 5], [62, 9]], '#3a2030', 4.5) + `<path d="M84 -4 q14 -6 20 4 q-8 -2 -10 4 q-4 -6 -10 -4 z" fill="#FFD23F" stroke="#FF8A2A" stroke-width="3" stroke-linejoin="round"/>`;
      s += [-1, 1].map((k) => `<ellipse cx="14" cy="${k * 13}" rx="8" ry="4.5" fill="#FFD23F" stroke="${INK}" stroke-width="3" transform="rotate(${k * 12} 14 ${k * 13})"/><ellipse cx="15" cy="${k * 13}" rx="2" ry="4" fill="${INK}"/><circle cx="52" cy="${k * 5}" r="2.4" fill="${INK}"/>`).join('');
      s += [-22, -6, 10].map((x) => poly([[x - 6, 0], [x + 2, -6], [x + 8, 0], [x + 2, 6]], L >= 5 ? GOLD : '#FFB347', 3.5)).join('');
      return s + shine(-10, -15, 16, 3, 6, 0.4) + (L >= 5 ? star(36, 0, 7) : '');
    }
    if (b === 1) { // Canon long : fusil de chasse à deux longs canons
      s += [-7, 7].map((y) => rect(10, y - 5.5, 96, 11, 5, B, 4.5)).join('') + rect(96, -15, 10, 30, 4, A, 4.5);
      s += rect(18, -15, 34, 30, 8, WOOD) + vents(26, -8, 4, 18, 5.5) + circ(92, 0, 3.5, '#FFD23F', 3);
      s += rect(-36, -27, 52, 54, 14, M) + rect(-52, -12, 22, 24, 7, WOOD);
    } else {
      const ys = L >= 3 ? [-15, 15] : [0], h = L >= 3 ? 12 : 16;
      s += ys.map((y) => poly([[12, y - h], [L >= 3 ? 62 : 54, y - h - 5], [L >= 3 ? 62 : 54, y + h + 5], [12, y + h]], B) + `<ellipse cx="${L >= 3 ? 61 : 53}" cy="${y}" rx="4" ry="${h + 1}" fill="${INK}" opacity=".75"/>`).join('');
      s += rect(-36, -30, 54, 60, 15, M);
      if (L >= 2) s += rect(-42, -20, 12, 40, 5, A, 4.5) + [-18, -6, 6].map((y) => `<rect x="-26" y="${y}" width="16" height="9" rx="3" fill="${HOT}" stroke="${INK}" stroke-width="2.6"/><rect x="-14" y="${y}" width="4" height="9" fill="#FFD23F"/>`).join('');
    }
    s += lens(4, 0, 7, R) + shine(-16, -21, 13, 3, 0, 0.45);
    return s + (L >= 5 ? star(-18, 18, 7) : '');
  },
  // Sniper — fin, très long canon, grande lunette, violet
  sniper: (L, b, R, M) => {
    const A = arm(L), B = bar(L); let s = '';
    if (b === 0) { // Calibre lourd : canon épais, gros frein de bouche
      s += rect(8, -8, 100, 16, 6, B) + rect(96, -15, 26, 30, 6, A) + `<path d="M104 -15 v30 M112 -15 v30" ${line(2.6, 'rgba(255,255,255,.3)')}/>`;
      s += [30, 44, 58].map((x) => rect(x, -11, 7, 22, 3, A, 4)).join('');
      s += rect(-44, -15, 60, 30, 10, M) + rect(-30, -31, 54, 15, 7.5, A, 4.5) + lens(26, -23.5, 7, R) + rect(-58, -9, 18, 18, 6, A, 4.5);
    } else if (b === 1) { // Lunette thermique : grosse optique orange, chargeur
      s += rect(8, -4.5, 108, 9, 4.5, B, 4.5) + rect(108, -8, 12, 16, 4, A, 4.5);
      s += rect(-42, -13, 56, 26, 9, M) + rect(-24, 12, 22, 26, 6, A, 4.5);
      s += rect(-36, -36, 70, 20, 10, A) + `<ellipse cx="36" cy="-26" rx="7" ry="12" fill="#FF7A3C" stroke="${INK}" stroke-width="4"/><ellipse cx="34" cy="-29" rx="2.4" ry="4.5" fill="#fff" opacity=".8"/>` + `<path d="M-30 -22 q-14 6 -8 18" ${line(3.5, '#ff7a3c')}/>`;
    } else {
      s += rect(8, -4.5, L >= 3 ? 104 : 92, 9, 4.5, B, 4.5);
      s += L >= 3 ? rect(104, -9, 16, 18, 5, A) : rect(94, -7, 9, 14, 4, A, 4.5);
      s += rect(-42, -12, 56, 24, 9, M);
      if (L >= 2) s += rect(-54, -8, 16, 16, 5, A, 4.5) + rect(-20, 10, 18, 9, 4, A, 4);
      s += rect(-28, -27 - (L >= 3 ? 3 : 0), L >= 3 ? 58 : 46, L >= 3 ? 16 : 13, 7, A, 4.5) + lens(L >= 3 ? 30 : 18, L >= 3 ? -22 : -20.5, L >= 3 ? 7 : 5.5, R);
    }
    s += shine(-26, -7, 12, 2.4, 0, 0.5) + rect(-18, -5, 16, 10, 4, shade(M, -0.3), 3.5);
    return s + (L >= 5 ? star(-28, 0, 7) : '');
  },
  // Lance-roquettes — lanceur à tubes multiples, rouge
  rocket: (L, b, R, M) => {
    const A = arm(L); let s = '';
    const tube = (y, h, x1 = 44) => rect(6, y - h / 2, x1 - 6, h, h / 2.6, DARK, 4.5) + poly([[x1 - 2, y - h / 2 + 2.5], [x1 + h * 0.75, y], [x1 - 2, y + h / 2 - 2.5]], '#fff', 4) + `<circle cx="${x1 + h * 0.3}" cy="${y}" r="${h * 0.16}" fill="${HOT}"/>`;
    if (b === 0) { // Fragmentation : gros panier à 6 petits tubes
      s += rect(-40, -40, 80, 80, 16, M) + rect(-46, -26, 12, 52, 5, A, 4.5);
      s += [[-24, 30], [0, 38], [24, 30]].map(([y, x]) => rect(-4, y - 8, x + 12, 16, 6, DARK, 4.5) + circ(x + 8, y, 6.5, '#FFD23F', 3.5)).join('');
      s += [[-12, 4], [12, 4]].map(([y, x]) => circ(x, y, 7.5, '#FFD23F', 3.5)).join('') + circ(-18, 0, 7.5, '#FFD23F', 3.5);
    } else if (b === 1) { // Missile guidé : deux gros missiles à ailettes et radar
      s += rect(-38, -30, 62, 60, 14, M);
      s += [-18, 18].map((y) => poly([[-30, y - 12], [-18, y - 6], [-18, y + 6], [-30, y + 12]], A, 4) + rect(-22, y - 7.5, 76, 15, 7, '#F3F6FA', 4.5) + poly([[52, y - 7.5], [74, y], [52, y + 7.5]], HOT, 4.5) + `<rect x="10" y="${y - 7.5}" width="8" height="15" fill="${R}"/>`).join('');
      s += `<path d="M-34 -14 A16 16 0 0 0 -34 14 Z" ${st(STEEL, 4.5)}/>` + circ(-28, 0, 4.5, '#4CD137', 3);
    } else {
      const ys = L >= 3 ? [-22.5, -7.5, 7.5, 22.5] : L >= 2 ? [-19, 0, 19] : [-13, 13], h = L >= 3 ? 12.5 : L >= 2 ? 15 : 20;
      s += rect(-40, -33, 62, 66, 14, M) + ys.map((y) => tube(y, h, L >= 3 ? 52 : 46)).join('') + rect(-30, -22, 22, 44, 8, shade(M, -0.3), 4) + lens(-19, 0, 6, R);
      if (L >= 2) s += rect(-46, -24, 12, 48, 5, A, 4.5);
      if (L >= 3) s += rect(-22, -37, 36, 9, 4, A, 4) + rect(-22, 28, 36, 9, 4, A, 4);
    }
    s += shine(-24, -26, 9, 2.6, 0, 0.45);
    return s + (L >= 5 ? star(-26, 0, 8) : '');
  },
  // Minigun — grosse tourelle blindée à 6 canons, grise et jaune
  minigun: (L, b, R, M) => {
    const A = arm(L), Y = '#FFC531', len = L >= 3 ? 66 : 54; let s = '';
    const B = b === 0 ? '#E0694A' : bar(L);
    s += rect(26, -15, len, 30, 6, B) + `<path d="M30 -5 h${len - 8} M30 5 h${len - 8}" ${line(3, 'rgba(0,0,0,.35)')}/>`;
    if (b === 0) s += `<rect x="${26 + len - 30}" y="-13" width="28" height="26" rx="5" fill="#FFB347" opacity=".8"/>` + vents(40, -22, 1, 30) + vents(40, 22, 1, 30);
    s += rect(22 + len, -19, 11, 38, 5, A) + (L >= 3 ? rect(54, -18, 9, 36, 4, A, 4.5) : '') + rect(14, -22, 16, 44, 6, A);
    s += rect(-30, 26, 44, 22, 6, Y) + [0, 1, 2].map((i) => `<circle cx="${-20 + i * 12}" cy="37" r="3.4" fill="${INK}" opacity=".6"/>`).join('');
    s += rect(-44, -34, 64, 68, 16, M);
    s += `<path d="M-36 -34 l12 0 l-14 16 z M-12 -34 l14 0 l-52 62 l0 -16 z M14 -34 l6 6 l0 10 l-42 52 l-14 0 z" fill="${Y}" opacity=".9"/>` + `<rect x="-44" y="-34" width="64" height="68" rx="16" fill="none" stroke="${INK}" stroke-width="${SW}"/>`;
    if (L >= 2) s += rect(-52, -24, 14, 48, 6, A, 4.5) + rect(4, -42, 22, 12, 5, A, 4.5);
    if (b === 1) s += rect(-58, -18, 22, 36, 9, HOT) + `<path d="M-50 4 q6 -12 2 -18 q10 6 9 17 q-1 8 -6 8 q-7 0 -5 -7 z" fill="#FFD23F" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` + rect(20 + len, -22, 14, 44, 6, HOT);
    s += circ(-12, 0, 13, shade(M, -0.3), 4.5) + lens(-12, 0, 7, R) + shine(-30, -26, 10, 3, 0, 0.45);
    return s + (L >= 5 ? star(6, 22, 7) : '');
  },
  // Cryo — cristal givrant et émetteurs, cyan (ne pivote pas)
  cryo: (L, b, R, M) => {
    const A = arm(L); let s = '';
    const hex = (r, fill, sw = SW, rot = 0) => poly(Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU + rot; return [(Math.cos(a) * r).toFixed(1), (Math.sin(a) * r).toFixed(1)]; }), fill, sw);
    if (L >= 2) s += [45, 135, 225, 315].map((a) => { const x = Math.cos((a * Math.PI) / 180) * 36, y = Math.sin((a * Math.PI) / 180) * 36; return circ(x, y, 9, A, 4.5) + `<circle cx="${x}" cy="${y}" r="4" fill="#8fe9ff"/>`; }).join('');
    s += hex(34, M) + hex(24, shade(M, -0.3), 4);
    if (b === 0) { // Zéro absolu : grand flocon blanc
      s += circ(0, 0, 30, '#2E6FD9');
      s += [0, 60, 120].map((a) => `<g transform="rotate(${a})"><path d="M-40 0 H40 M-30 -9 L-22 0 L-30 9 M30 -9 L22 0 L30 9" ${line(9)}/><path d="M-40 0 H40 M-30 -9 L-22 0 L-30 9 M30 -9 L22 0 L30 9" ${line(4.5, '#fff')}/></g>`).join('');
      s += circ(0, 0, 8, '#fff', 4);
    } else if (b === 1) { // Givre fragilisant : cristal brisé rose
      s += poly([[0, -44], [9, -16], [38, -22], [18, 0], [40, 22], [10, 15], [0, 46], [-10, 15], [-38, 24], [-17, 0], [-40, -20], [-9, -15]], '#FF9DD2');
      s += `<path d="M0 -44 L0 46 M-40 -20 L40 22 M38 -22 L-38 24" ${line(2.4, 'rgba(255,255,255,.75)')}/><path d="M-4 -10 l8 8 l-9 7 l7 8" ${line(3, INK)}/>`;
    } else {
      const r = L >= 3 ? 26 : 18;
      if (L >= 3) s += [0, 60, 120, 180, 240, 300].map((a) => `<path d="M0 ${-r - 14} l5 8 l-5 6 l-5 -6 z" transform="rotate(${a})" ${st('#BDF3FF', 3.5)}/>`).join('');
      s += poly([[0, -r], [r * 0.62, -r * 0.3], [r * 0.62, r * 0.3], [0, r], [-r * 0.62, r * 0.3], [-r * 0.62, -r * 0.3]], '#BDF3FF');
      s += `<path d="M0 ${-r} L0 ${r} M${-r * 0.62} ${-r * 0.3} L${r * 0.62} ${r * 0.3} M${r * 0.62} ${-r * 0.3} L${-r * 0.62} ${r * 0.3}" ${line(2.4, 'rgba(255,255,255,.85)')}/>`;
    }
    return s + shine(-14, -18, 7, 3, -30, 0.5) + (L >= 5 ? star(0, 0, 9) : '');
  },
  // Mine — disque piégé (le voyant clignotant est dessiné par le jeu)
  mine: (L, b, R, M) => {
    const r = b === 0 ? 40 : [30, 33, 35, 36, 36][L - 1], n = b === 0 ? 10 : L >= 3 ? 8 : 6, A = arm(L); let s = '';
    s += `<circle cx="0" cy="5" r="${r + 4}" fill="${INK}" opacity=".3"/>`;
    s += Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, w = 0.22, sp = r + (L >= 3 || b != null ? 13 : 8); return poly([[Math.cos(a - w) * (r - 4), Math.sin(a - w) * (r - 4)], [Math.cos(a) * sp, Math.sin(a) * sp], [Math.cos(a + w) * (r - 4), Math.sin(a + w) * (r - 4)]].map((p) => p.map((v) => v.toFixed(1))), b === 1 ? '#FFD23F' : A, 4.5); }).join('');
    s += circ(0, 0, r, M);
    if (b === 0) s += `<circle r="${r - 8}" fill="none" stroke="#FFD23F" stroke-width="7" stroke-dasharray="9 9"/>`;
    else if (L >= 2) s += `<circle r="${r - 8}" fill="none" stroke="${R}" stroke-width="5"/>`;
    if (b === 1) s += `<circle r="${r - 9}" fill="none" stroke="#8fe9ff" stroke-width="5"/>` + [0, 90, 180, 270].map((a) => `<path d="M${r - 20} -3 l7 -4 l-3 6 l8 -3" transform="rotate(${a + 45})" ${line(3, '#fff')}/>`).join('');
    s += bolts(L >= 3 ? 6 : 4, r - 5, 2.4) + circ(0, 0, 11, DARK, 4.5) + shine(-r * 0.5, -r * 0.55, 7, 3, -35, 0.45);
    return s + (L >= 5 ? star(0, -r + 12, 6) : '');
  },
};
// Pieds du trépied du sniper (sous le socle)
const tripod = (L) => [90, 210, 330].map((a) => `<g transform="rotate(${a})"><path d="M0 0 H${L >= 2 ? 62 : 56}" ${line(L >= 2 ? 16 : 13)}/><path d="M0 0 H${L >= 2 ? 62 : 56}" ${line(L >= 2 ? 8 : 6, L >= 5 ? GOLD : STEEL)}/>${circ(L >= 2 ? 62 : 56, 0, L >= 2 ? 10 : 8, L >= 5 ? GOLD : DARK, 4.5)}</g>`).join('');

const TVB = 130; // demi-vue des tourelles (260 unités = 130 px de jeu)
// part : 'base' (socle fixe), 'head' (tête qui pivote) ou 'icon' (les deux, pour l'interface)
export function towerSvg(type, level = 1, branch = null, fin = 'classic', px = 260, part = 'icon') {
  grads = new Set(); finish = fin; OL = fin === 'neon' ? '#0a0d1c' : INK;
  const R = RARITY[level - 1].color, M = TOWER_COLOR[type];
  const base = type === 'mine' ? '' : (type === 'sniper' ? tripod(level) : '') + basePlate(type === 'sniper' ? Math.max(1, level - 1) : level, R, M);
  const head = HEAD[type](level, branch, R, M);
  let body, vb = TVB;
  if (part === 'base') body = base;
  else if (part === 'head') body = head;
  else { // icône : tête tournée vers le haut-droite, cadrage serré
    const still = type === 'cryo' || type === 'mine', long = type === 'sniper' ? 0.74 : type === 'minigun' || type === 'assault' || type === 'shotgun' ? 0.86 : 0.95;
    body = `<g transform="scale(${still ? (type === 'mine' ? 1.45 : 1.2) : long})">${base}<g transform="rotate(${still ? 0 : -50}) translate(${still ? 0 : type === 'sniper' ? -22 : -8} 0)">${head}</g></g>`;
    vb = 84;
  }
  const glow = fin === 'neon' ? `<filter id="nf" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const svg = build(glow ? `<g filter="url(#nf)">${body}</g>` : body, vb, px);
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
// { base, head } rastérisés ; half = demi-taille d'affichage en px de jeu
export function towerSprite(type, level, branch, fin) {
  const key = `${type}|${level}|${branch}|${fin}`;
  let s = towerCache.get(key);
  if (!s) {
    s = { base: type === 'mine' ? null : raster(towerSvg(type, level, branch, fin, 390, 'base'), 390, false), head: raster(towerSvg(type, level, branch, fin, 390, 'head'), 390, true), half: TVB / 2 };
    Object.defineProperty(s, 'ready', { get() { return s.head.ready && (!s.base || s.base.ready); } });
    towerCache.set(key, s);
  }
  return s;
}
export function preloadSprites(skin) {
  for (const t of Object.keys(ENEMIES)) enemyFrames(t);
  for (const t of Object.keys(HEAD)) towerSprite(t, 1, null, skinFinish(skin));
}

// Images pour l'interface (DOM)
export function enemyImg(type, size = 40) { const i = new Image(); i.src = url(enemySvg(type, 0, 0, size * 3)); i.width = i.height = size; i.alt = ''; i.draggable = false; return i; }
export function towerImg(type, size = 48, skin = 'default', level = 1, branch = null) { const i = new Image(); i.src = url(towerSvg(type, level, branch, skinFinish(skin), size * 3, 'icon')); i.width = i.height = size; i.alt = ''; i.draggable = false; return i; }
