// Icônes SVG inline (aucun emoji dans l'interface) : pictogrammes d'interface au trait,
// et icônes illustrées pour tout ce qui représente un objet ou une fonction (voir ART).
const S = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';

const ICONS = {
  star: `<path d="M12 2.6l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 16.9l-5.6 3 1.1-6.3L2.9 9.2l6.3-.9z" fill="currentColor" stroke="#3d2c4e" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.6 9.6l1.6-.3" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  play: `<path d="M8 5.5v13l11-6.5z" ${F} stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  pause: `<rect x="6.5" y="5" width="3.8" height="14" rx="1.9" ${F}/><rect x="13.7" y="5" width="3.8" height="14" rx="1.9" ${F}/>`,
  back: `<path d="M14.5 5.5L8 12l6.5 6.5" ${S}/>`,
  close: `<path d="M6.5 6.5l11 11m0-11l-11 11" ${S}/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S}/>`,
  up: `<path d="M12 19V6m-6 6l6-6 6 6" ${S}/>`,
  share: `<path d="M12 15V4m0 0l-4 4m4-4l4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" ${S}/>`,
  restart: `<path d="M5 12a7 7 0 1 0 2.300-5.200M5 4.500v4h4" ${S}/>`,
  plus: `<path d="M12 5v14M5 12h14" ${S}/>`,
};


// ============================================================================
// Icônes ILLUSTRÉES (style vinyle de Chibi Arsenal) : objets en volume, contour encre
// épais, ombre portée, reflet blanc, couleurs fixes. Grille 48 x 48.
// Code couleur des récompenses : pièce or, gemme cyan, coffre bois brun, coffre doré or,
// coffre légendaire violet, boost orange, XP vert, ticket du passe rose.
// ============================================================================
const K = '#3d2c4e';
const O = `stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const SH = (rx = 15, cy = 43.5) => `<ellipse cx="24" cy="${cy}" rx="${rx}" ry="3" fill="#1a0f2e" opacity=".28"/>`;
const HL = (d, w = 2.8) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity=".8"/>`;
const SPARK = (x, y, r, c = '#fff') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="${c}"/>`;
// trait épais en couleur avec contour encre (pour les formes « en tube »)
const TUBE = (d, col, w = 5) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const star5 = (cx, cy, R, r = R * 0.48) => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; d += `${i ? 'L' : 'M'}${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)}`; }
  return d + 'z';
};
const wedges = (cx, cy, R, cols) => cols.map((c, i) => {
  const n = cols.length, a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
  return `<path d="M${cx} ${cy}L${(cx + R * Math.cos(a0)).toFixed(1)} ${(cy + R * Math.sin(a0)).toFixed(1)}A${R} ${R} 0 0 1 ${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)}z" fill="${c}"/>`;
}).join('');
const gearPath = (cx, cy, R, r, n) => {
  let d = '';
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2 - Math.PI / 2 + Math.PI / (n * 4), q = (i % 4 < 2) ? R : r;
    d += `${i ? 'L' : 'M'}${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'z';
};
const COIN = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffd23f" ${O}/><circle cx="${x}" cy="${y}" r="${r * 0.58}" fill="none" stroke="#e09600" stroke-width="2.2"/><path d="M${x - r * 0.55} ${y - r * 0.35}a${r * 0.7} ${r * 0.7} 0 0 1 ${r * 0.5} -${r * 0.4}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`;
const GEM = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-9 -7h18l6 7-15 14-15-14z" fill="#5fd8ff" ${O}/><path d="M-15 0h30M-4 -7l-3 7 7 14 7-14-3-7" fill="none" stroke="#2aa6d8" stroke-width="2.2" stroke-linejoin="round"/><path d="M-9 -7l-3.5 5h6z" fill="#fff" opacity=".85"/></g>`;

const ART = {
  // ----------------------------------------------------------------- fonctions
  gift: `${SH(16)}<rect x="9" y="22" width="30" height="19" rx="3" fill="#ff5d8f" ${O}/><path d="M11.5 34h25v4.5h-25z" fill="#c93868"/>
    <rect x="7" y="15" width="34" height="9" rx="3" fill="#ff8fb2" ${O}/><rect x="20.5" y="15" width="7" height="26" fill="#ffd23f" ${O}/>
    <path d="M24 15c-3-7-12-8-11-2.5.5 2.6 5.5 3 11 2.5zM24 15c3-7 12-8 11-2.5-.5 2.6-5.5 3-11 2.5z" fill="#ffd23f" ${O}/>${HL('M11 18.5h6')}${HL('M12 26v5', 2.4)}`,
  scroll: `${SH(14)}<rect x="12" y="9" width="24" height="29" fill="#fff1cf" ${O}/><path d="M31 11h3v25h-3z" fill="#f0d6a0"/>
    <path d="M17 17h14M17 22h14M17 27h8" stroke="#c9a36a" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="8" y="5" width="32" height="7" rx="3.5" fill="#f3c97a" ${O}/><rect x="8" y="35" width="32" height="7" rx="3.5" fill="#f3c97a" ${O}/>
    <circle cx="32" cy="32" r="6.5" fill="#f0485a" ${O}/><path d="${star5(32, 32, 3.6)}" fill="#a8182a"/>${HL('M12 7.5h8')}`,
  chest: `<path d="M24 22L9 0h7zM24 22L21 0h6zM24 22L32 0h7zM24 22L1 8l2-5zM24 22L47 8l-2-5z" fill="#ffe27a" opacity=".6"/>${SH(17)}
    <path d="M9 21L12 8Q24 3 36 8L39 21z" fill="#a8693a" ${O}/><path d="M13 9.5Q24 5.5 35 9.5" fill="none" stroke="#ffd23f" stroke-width="3.2"/>
    <rect x="7" y="24" width="34" height="17" rx="3" fill="#c98a4b" ${O}/><path d="M9.5 34h29v4.5h-29z" fill="#8a5530"/>
    <path d="M8.5 23.5Q24 15 39.5 23.5Q24 28.5 8.5 23.5z" fill="#fff6a8" ${O}/>
    <path d="M14 26v14.5M34 26v14.5" stroke="#ffd23f" stroke-width="3.5"/><rect x="19.5" y="26" width="9" height="10" rx="2.5" fill="#ffd23f" ${O}/><circle cx="24" cy="30.5" r="1.6" fill="${K}"/>
    ${SPARK(41, 16, 4)}${SPARK(7, 14, 3)}${SPARK(30, 19, 2.4)}${HL('M15 10q4-1.5 8-2', 2.2)}`,
  wheel: `${SH(12, 44.5)}<path d="M18 40h12l3 4H15z" fill="#8a5530" ${O}/><path d="M22 36h4v5h-4z" fill="#c98a4b" ${O}/>
    <circle cx="24" cy="21" r="17" fill="#fff"/>${wedges(24, 21, 17, ['#ff5d8f', '#ffd23f', '#3d9dfc', '#3fd873', '#b05cff', '#ff9f1a', '#5fd8ff', '#f0485a'])}
    <circle cx="24" cy="21" r="17" fill="none" ${O}/><circle cx="24" cy="21" r="17" fill="none" stroke="#ffd23f" stroke-width="2" stroke-dasharray="1 5.6" stroke-linecap="round" opacity=".9"/>
    <circle cx="24" cy="21" r="4.5" fill="#ffd23f" ${O}/><path d="M19 1.5h10l-5 8z" fill="#f0485a" ${O}/>${HL('M12 13a14 14 0 0 1 6-6', 2.4)}`,
  pass: `${SH(12)}<path d="M13 3h9l5 14h-9z" fill="#3d9dfc" ${O}/><path d="M35 3h-9l-5 14h9z" fill="#f0485a" ${O}/>
    <circle cx="24" cy="29" r="13" fill="#ffd23f" ${O}/><circle cx="24" cy="29" r="9" fill="#ffb224"/><path d="${star5(24, 29, 7.5)}" fill="#fff6c8" stroke="#c9780a" stroke-width="1.8" stroke-linejoin="round"/>
    ${HL('M15 24a10 10 0 0 1 5-5', 2.6)}`,
  challenge: `${SH(15)}<path d="M38 4l5 1 1 5-21 21-6-6z" fill="#e6ecf5" ${O}/><path d="M40.5 6.5L22 25" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M13 23l12 12" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/><path d="M13 23l12 12" fill="none" ${O} stroke-width="3" opacity="0"/>
    <path d="M11.5 21.5l15 15" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round"/><path d="M11.5 21.5l15 15" fill="none" stroke="#ffd23f" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M20 30l-9 9" fill="none" stroke="${K}" stroke-width="8" stroke-linecap="round"/><path d="M20 30l-9 9" fill="none" stroke="#a0642e" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M7 14l10-4 10 4v9c0 8-5 13-10 15-5-2-10-7-10-15z" fill="#3d9dfc" ${O}/><path d="M11 16.5l6-2.4 6 2.4v6.5c0 5.5-3 9-6 10.5-3-1.5-6-5-6-10.5z" fill="#8fd2ff"/>
    <path d="${star5(17, 23, 4.5)}" fill="#ffd23f" stroke="${K}" stroke-width="1.8" stroke-linejoin="round"/>${HL('M10 17v4', 2.4)}`,
  shop: `${SH(17)}<rect x="9" y="22" width="30" height="19" rx="2" fill="#c98a4b" ${O}/><path d="M11.5 36h25v3h-25z" fill="#8a5530"/>
    <rect x="13" y="25" width="22" height="9" rx="2" fill="#5b3a2a"/>${COIN(19, 29.5, 3.6)}${GEM(29, 29, 0.36)}
    <path d="M10 8h28" stroke="${K}" stroke-width="3"/><path d="M11 22V8M37 22V8" stroke="${K}" stroke-width="3"/>
    <path d="M5 10h38l-2 9H7z" fill="#fff" ${O}/><path d="M10.5 10h6.5l-.6 9h-6.8zM23.5 10h6.5l.6 9H23.3zM36.5 10h4.5" fill="#f0485a"/><path d="M5 10h38l-2 9H7z" fill="none" ${O}/>
    <path d="M7 19q3 4 6.5 0q3.2 4 6.5 0q3.2 4 6.5 0q3.2 4 6.5 0q3.2 4 6.5 0" fill="#fff" ${O}/>`,
  castle: `${SH(15)}<path d="M24 1v8" stroke="${K}" stroke-width="2.6"/><path d="M24 1.5h9l-2.5 3 2.5 3h-9z" fill="#f0485a" stroke="${K}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M14 18L24 7l10 11z" fill="#ff6b5a" ${O}/><rect x="13" y="18" width="22" height="23" rx="2" fill="#e6e3ee" ${O}/><path d="M29 20h4v19h-4z" fill="#b3adc6"/>
    <path d="M18.5 41v-8a5.5 5.5 0 0 1 11 0v8z" fill="#a0642e" ${O}/><rect x="21.5" y="22" width="5" height="6" rx="2.5" fill="${K}"/>
    <path d="M8 28h6v13H8zM34 28h6v13h-6z" fill="#d6d2e2" ${O}/><path d="M7 25h8v3.5H7zM33 25h8v3.5h-8z" fill="#e6e3ee" ${O}/>${HL('M16 22v6', 2.4)}`,
  talent: `<circle cx="24" cy="18" r="17" fill="#ffe27a" opacity=".35"/>${SH(10)}<path d="M21 42l1-14h4l1 14z" fill="#a0642e" ${O}/>
    <circle cx="16" cy="20" r="9" fill="#2fbf63" ${O}/><circle cx="32" cy="20" r="9" fill="#2fbf63" ${O}/><circle cx="24" cy="13" r="10.5" fill="#3fd873" ${O}/>
    <path d="M10 23a8 8 0 0 0 4 5M38 23a8 8 0 0 1-4 5" stroke="#1f9a4c" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="20" cy="11" r="2.6" fill="#ffd23f" stroke="${K}" stroke-width="1.6"/><circle cx="29" cy="15" r="2.6" fill="#ffd23f" stroke="${K}" stroke-width="1.6"/><circle cx="14" cy="21" r="2.4" fill="#ffd23f" stroke="${K}" stroke-width="1.6"/><circle cx="34" cy="22" r="2.4" fill="#ffd23f" stroke="${K}" stroke-width="1.6"/>
    ${SPARK(41, 7, 3.4)}${SPARK(7, 9, 2.8)}${HL('M18 6a9 9 0 0 1 6-2', 2.4)}`,
  book: `${SH(16)}<rect x="21" y="3" width="16" height="22" rx="2.5" fill="#3d9dfc" ${O} transform="rotate(14 29 14)"/><rect x="11" y="4" width="16" height="22" rx="2.5" fill="#ff5d8f" ${O} transform="rotate(-12 19 15)"/>
    <rect x="7" y="15" width="34" height="26" rx="4" fill="#9a5ce0" ${O}/><path d="M9.5 35h29v3.5h-29z" fill="#6c34b0"/><path d="M7 19h34" stroke="${K}" stroke-width="2.4"/>
    <rect x="16" y="22" width="16" height="12" rx="3" fill="#ffd23f" ${O}/><path d="${star5(24, 28, 4.2)}" fill="#fff6c8" stroke="#c9780a" stroke-width="1.5" stroke-linejoin="round"/>${HL('M10 23v7', 2.4)}`,
  gear: `${SH(14)}<path d="${gearPath(24, 22, 18, 13.5, 8)}" fill="#b8c2d6" ${O}/><circle cx="24" cy="22" r="10" fill="#8e9aab"/><circle cx="24" cy="22" r="5.5" fill="#4a4f63" ${O}/>
    <path d="M14 15a12 12 0 0 1 6-4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`,
  playgold: `${SH(13)}<path d="M14 8.5q0-5 4.5-2.5l20 13.5q4 2.5 0 5L18.5 38q-4.5 2.5-4.5-2.5z" fill="#ffd23f" ${O}/><path d="M18 30l14-8" stroke="#e09600" stroke-width="3.5" stroke-linecap="round"/>${HL('M18 11v10', 2.8)}`,
  home: `${SH(15)}<rect x="31" y="6" width="5" height="9" fill="#a0642e" ${O}/><rect x="11" y="21" width="26" height="20" fill="#fff1cf" ${O}/><path d="M33 23h2v16h-2z" fill="#f0d6a0"/>
    <path d="M6 23L24 7l18 16" fill="#f0485a" ${O}/><path d="M6 23L24 7l18 16" fill="none" stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="20" y="29" width="8" height="12" rx="2" fill="#3d9dfc" ${O}/><circle cx="26" cy="35" r="1.1" fill="#ffd23f"/><rect x="13.5" y="25" width="5" height="5" rx="1" fill="#8fd2ff" stroke="${K}" stroke-width="2"/>${HL('M12 22l8-7', 2.4)}`,
  calendar: `${SH(15)}<rect x="7" y="9" width="34" height="32" rx="4" fill="#fff" ${O}/><path d="M9.5 36h29v3h-29z" fill="#e6dcf5"/><path d="M7 13a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v6H7z" fill="#f0485a" ${O}/>
    <rect x="13" y="4" width="4" height="9" rx="2" fill="#b8c2d6" ${O}/><rect x="31" y="4" width="4" height="9" rx="2" fill="#b8c2d6" ${O}/>
    <path d="${star5(24, 29, 7)}" fill="#ffd23f" stroke="${K}" stroke-width="2.2" stroke-linejoin="round"/>`,
  map: `${SH(16)}<path d="M5 10l12-4 14 4 12-4v30l-12 4-14-4-12 4z" fill="#fff1cf" ${O}/><path d="M17 6v30M31 10v30" stroke="#e8cf9a" stroke-width="2.5"/><path d="M5 10l12-4 14 4 12-4v30l-12 4-14-4-12 4z" fill="none" ${O}/>
    <path d="M10 30q5-8 10-3t9-6" fill="none" stroke="#f0485a" stroke-width="2.6" stroke-dasharray="3 3" stroke-linecap="round"/><path d="M33 15l5 5m0-5l-5 5" stroke="#f0485a" stroke-width="3.2" stroke-linecap="round"/>`,
  // ----------------------------------------------------------------- récompenses
  coins: `${SH(15)}<ellipse cx="18" cy="35" rx="11" ry="5" fill="#e09600" ${O}/><ellipse cx="18" cy="30" rx="11" ry="5" fill="#ffd23f" ${O}/><ellipse cx="18" cy="25" rx="11" ry="5" fill="#ffd23f" ${O}/>
    ${COIN(31, 25, 10)}`,
  gem: `${SH(12)}${GEM(24, 22, 1.25)}`,
  boost: `${SH(12)}<path d="M19 5h10v9l9 15c3 6-1 12-7 12H17c-6 0-10-6-7-12l9-15z" fill="#ffb24a" ${O}/><path d="M12.5 29h23l1.5 3c1.5 4-1 7-5 7H16c-4 0-6.5-3-5-7z" fill="#ff7a1a"/>
    <path d="M19 5h10v9l9 15c3 6-1 12-7 12H17c-6 0-10-6-7-12l9-15z" fill="none" ${O}/><rect x="17" y="3" width="14" height="5" rx="2" fill="#a0642e" ${O}/>
    <path d="M26 16l-7 11h5l-2 8 8-11h-5z" fill="#fff6c8" stroke="${K}" stroke-width="2" stroke-linejoin="round"/>${HL('M14 31l3-5', 2.4)}`,
  xp: `${SH(13)}<path d="${star5(24, 23, 19, 11)}" fill="#3fd873" ${O}/><path d="${star5(24, 23, 13, 7.5)}" fill="#7bf09a"/>
    <text x="24" y="28.5" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="700" font-size="13" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke">XP</text>`,
  ticket: `${SH(16)}<path d="M5 14a3 3 0 0 1 3-3h32a3 3 0 0 1 3 3v4a5 5 0 0 0 0 10v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4a5 5 0 0 0 0-10z" fill="#ff5d8f" ${O}/>
    <path d="M32 13v20" stroke="#c93868" stroke-width="2.4" stroke-dasharray="2.5 3"/><path d="${star5(19, 23, 7.5)}" fill="#ffd23f" stroke="${K}" stroke-width="2.2" stroke-linejoin="round"/>${HL('M9 15h8', 2.4)}`,
  // ----------------------------------------------------------------- jeu
  heart: `${SH(13)}<path d="M24 41S7 31 7 18.5A9.5 9.5 0 0 1 24 12.5a9.5 9.5 0 0 1 17 6C41 31 24 41 24 41z" fill="#ff5d6c" ${O}/><path d="M24 37c4-3 13-9.5 14.5-17" fill="none" stroke="#d42f45" stroke-width="3.5" stroke-linecap="round"/>${HL('M12 17a5 5 0 0 1 5-3.5', 3)}`,
  revive: `${SH(13)}<path d="M22 39S6 30 6 18a9 9 0 0 1 16-5.5A9 9 0 0 1 38 18c0 12-16 21-16 21z" fill="#ff8fb2" ${O}/>${HL('M11 17a5 5 0 0 1 5-3.5', 3)}
    <circle cx="34" cy="32" r="9" fill="#3fd873" ${O}/><path d="M34 27.5v9M29.5 32h9" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>`,
  bolt: `${SH(10)}<path d="M28 3L9 26h12l-4 17 22-25H27z" fill="#ffd23f" ${O}/><path d="M27 18h9L22 34" fill="none" stroke="#ffb224" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${HL('M24 9l-8 10', 2.6)}`,
  shield: `${SH(13)}<path d="M24 4l16 5v12c0 11-7 18-16 21-9-3-16-10-16-21V9z" fill="#ffd23f" ${O}/><path d="M24 9l11 3.5V21c0 8-5 13-11 15.5C18 34 13 29 13 21v-8.5z" fill="#3d9dfc"/>
    <path d="M24 9l11 3.5V21c0 8-5 13-11 15.5" fill="none" stroke="#1b64b3" stroke-width="3"/><path d="M18 22l4.5 4.5L31 18" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>${HL('M15 15v5', 2.4)}`,
  snow: `${SH(11)}${TUBE('M24 4v36M8.4 13l31.2 18M39.6 13L8.4 31', '#8fe6ff', 4.5)}${TUBE('M19 7l5 5 5-5M19 37l5-5 5 5', '#8fe6ff', 3)}<circle cx="24" cy="22" r="5.5" fill="#fff" ${O}/>`,
  bomb: `${SH(14)}<circle cx="21" cy="27" r="14" fill="#4a4f63" ${O}/><path d="M28 38a14 14 0 0 0 6-9" fill="none" stroke="#2f3345" stroke-width="4" stroke-linecap="round"/>
    <rect x="25" y="9" width="9" height="7" rx="2" fill="#8e9aab" ${O} transform="rotate(40 29.5 12.5)"/><path d="M33 9q3-5 7-3" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>
    ${SPARK(41, 5, 5, '#ffd23f')}${SPARK(41, 5, 2.4)}${HL('M12 23a10 10 0 0 1 5-6', 3)}`,
  coin: `${SH(12)}${COIN(24, 23, 16)}`,
  // réparation : marteau
  wrench: `${SH(13)}${TUBE('M12 39L28 21', '#c98a4b', 5)}<path d="M18 17l10-10 4 4 2-2 6 6-2 2 4 4-10 10z" fill="#b8c2d6" ${O}/><path d="M33 29l-4-4 9-9 4 4z" fill="#8e9aab"/>
    <path d="M18 17l10-10 4 4 2-2 6 6-2 2 4 4-10 10z" fill="none" ${O}/>${HL('M21 16l6-6', 2.4)}`,
  cannon: `${SH(15)}<path d="M8 30L30 12l7 8-19 19z" fill="#4a4f63" ${O}/><rect x="31" y="8" width="9" height="15" rx="3" fill="#2f3345" ${O} transform="rotate(-42 35.5 15.5)"/>${HL('M13 27l14-11', 2.6)}
    <circle cx="16" cy="35" r="7.5" fill="#a0642e" ${O}/><circle cx="16" cy="35" r="2.5" fill="#ffd23f" stroke="${K}" stroke-width="2"/>`,
  skull: `${SH(12)}<path d="M24 4C14 4 7 11 7 20c0 6 3 10 7 12v6a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-6c4-2 7-6 7-12 0-9-7-16-17-16z" fill="#f5f0ff" ${O}/>
    <path d="M34 33v5a3 3 0 0 1-3 3" fill="none" stroke="#c9bde0" stroke-width="3"/><ellipse cx="17" cy="21" rx="4.5" ry="5" fill="#b05cff" ${O}/><ellipse cx="31" cy="21" rx="4.5" ry="5" fill="#b05cff" ${O}/>
    <path d="M22 30l2-3 2 3z" fill="${K}"/><path d="M20 35v4M24 35v4M28 35v4" stroke="${K}" stroke-width="2.2"/>${HL('M12 14a10 10 0 0 1 6-5', 2.6)}`,
  sword: `${SH(14)}<path d="M37 4l6 1 1 6-22 22-7-7z" fill="#e6ecf5" ${O}/><path d="M40 7L20 27" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    ${TUBE('M11 23l14 14', '#ffd23f', 4.5)}${TUBE('M18 30l-9 9', '#a0642e', 3.6)}`,
  flame: `${SH(11)}<path d="M24 43c-9 0-15-6-15-14 0-9 8-12 7-22 6 3 9 8 9 13 2-3 2-6 1-9 7 4 13 10 13 18 0 8-6 14-15 14z" fill="#ff7a1a" ${O}/>
    <path d="M24 42c-5 0-8-3-8-7 0-5 5-7 5-12 3 2 5 5 5 8 1-1 2-3 2-4 3 3 4 5 4 8 0 4-3 7-8 7z" fill="#ffd23f"/>`,
  target: `${SH(14)}<circle cx="24" cy="22" r="18" fill="#fff" ${O}/><circle cx="24" cy="22" r="13" fill="#f0485a"/><circle cx="24" cy="22" r="8.5" fill="#fff"/><circle cx="24" cy="22" r="4.5" fill="#f0485a" stroke="${K}" stroke-width="2"/>
    <circle cx="24" cy="22" r="18" fill="none" ${O}/>${HL('M11 15a14 14 0 0 1 6-6', 2.6)}`,
  trophy: `${SH(12)}<path d="M13 9H6v4a8 8 0 0 0 9 8M35 9h7v4a8 8 0 0 1-9 8" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/><path d="M13 9H6v4a8 8 0 0 0 9 8M35 9h7v4a8 8 0 0 1-9 8" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
    <path d="M12 5h24v10a12 12 0 0 1-24 0z" fill="#ffd23f" ${O}/><path d="M31 8v7a7 7 0 0 1-4 6.5" fill="none" stroke="#e09600" stroke-width="3" stroke-linecap="round"/>
    <path d="M21 26h6v7h-6z" fill="#e09600" ${O}/><rect x="14" y="33" width="20" height="8" rx="2" fill="#a0642e" ${O}/>${HL('M16 9v6', 2.6)}`,
  crown: `${SH(14)}<path d="M6 15l9 7 9-13 9 13 9-7-3 22H9z" fill="#ffd23f" ${O}/><path d="M9.5 31h29l-.6 4.5H10.2z" fill="#e09600"/><path d="M6 15l9 7 9-13 9 13 9-7-3 22H9z" fill="none" ${O}/>
    <circle cx="24" cy="26" r="3.2" fill="#f0485a" stroke="${K}" stroke-width="2"/><circle cx="15" cy="28" r="2.4" fill="#5fd8ff" stroke="${K}" stroke-width="2"/><circle cx="33" cy="28" r="2.4" fill="#5fd8ff" stroke="${K}" stroke-width="2"/>`,
  wave: `${SH(10, 44)}<path d="M11 43V5" stroke="${K}" stroke-width="6" stroke-linecap="round"/><path d="M11 43V5" stroke="#a0642e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M13 7q8-3 13 1t13 0l-4 9 4 8q-7 4-13 0t-13 1z" fill="#f0485a" ${O}/><path d="M14 21q7-2 12 1" fill="none" stroke="#c92a3a" stroke-width="3" stroke-linecap="round"/>`,
  lock: `<path d="M16 21v-6a8 8 0 0 1 16 0v6" fill="none" stroke="${K}" stroke-width="9"/><path d="M16 21v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#b8c2d6" stroke-width="4"/>
    <rect x="9" y="20" width="30" height="22" rx="5" fill="#ffd23f" ${O}/><path d="M11.5 36h25v3.5h-25z" fill="#e09600"/><circle cx="24" cy="29" r="3.5" fill="${K}"/><path d="M24 30v6" stroke="${K}" stroke-width="3.4" stroke-linecap="round"/>`,
  infinity: `${SH(16)}${TUBE('M14 15c-5 0-9 3.5-9 8s4 8 9 8c9 0 11-16 20-16 5 0 9 3.5 9 8s-4 8-9 8c-9 0-11-16-20-16z', '#b05cff', 5)}`,
  bulb: `${SH(9)}<circle cx="24" cy="18" r="16" fill="#ffe27a" opacity=".3"/><path d="M24 4a13 13 0 0 0-8 23c2 1.5 3 3.5 3 6h10c0-2.5 1-4.5 3-6a13 13 0 0 0-8-23z" fill="#ffd23f" ${O}/>
    <rect x="18" y="33" width="12" height="8" rx="2" fill="#b8c2d6" ${O}/><path d="M18 37h12" stroke="${K}" stroke-width="2"/>${HL('M17 11a8 8 0 0 1 5-3', 2.8)}`,
  chart: `<path d="M5 41h38" stroke="${K}" stroke-width="3.5" stroke-linecap="round"/><rect x="8" y="24" width="9" height="17" rx="2" fill="#3fd873" ${O}/><rect x="20" y="10" width="9" height="31" rx="2" fill="#ffd23f" ${O}/><rect x="32" y="18" width="9" height="23" rx="2" fill="#3d9dfc" ${O}/>`,
  // ----------------------------------------------------------------- réglages
  sound: `${SH(14)}<path d="M7 17h7l10-9v32l-10-9H7z" fill="#b05cff" ${O}/><path d="M9.5 27h4.5l8 7v3l-9-8H9.5z" fill="#7a2fd0"/>${TUBE('M30 16a10 10 0 0 1 0 16M35 11a17 17 0 0 1 0 26', '#5fd8ff', 3)}${HL('M10 20h3', 2.4)}`,
  mute: `${SH(14)}<path d="M7 17h7l10-9v32l-10-9H7z" fill="#b05cff" ${O}/><path d="M9.5 27h4.5l8 7v3l-9-8H9.5z" fill="#7a2fd0"/>${TUBE('M30 18l10 12M40 18L30 30', '#f0485a', 3.5)}`,
  music: `${SH(12)}<path d="M18 33V9l20-5v24" fill="none" stroke="${K}" stroke-width="8" stroke-linejoin="round"/><path d="M18 33V9l20-5v24" fill="none" stroke="#ff5d8f" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="13" cy="34" rx="7" ry="5.5" fill="#ff5d8f" ${O}/><ellipse cx="33" cy="29" rx="7" ry="5.5" fill="#ff5d8f" ${O}/>${HL('M10 32a3 3 0 0 1 3-2', 2.2)}`,
  vibrate: `${SH(10)}<rect x="15" y="5" width="18" height="34" rx="4" fill="#3d9dfc" ${O}/><rect x="18.5" y="10" width="11" height="20" rx="1.5" fill="#bfe6ff"/><circle cx="24" cy="34" r="1.8" fill="${K}"/>
    ${TUBE('M9 15v14M39 15v14', '#ffd23f', 3)}${TUBE('M4 18v8M44 18v8', '#ffd23f', 2.6)}`,
  quake: `${SH(17)}<path d="M5 30l8-4 7 3 8-5 8 3 7-3v12H5z" fill="#c98a4b" ${O}/><path d="M18 30l3 3-2 4 3 3" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 9l-4 7 5 1-3 7" fill="none" stroke="#ff7a1a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${TUBE('M30 9l2 4-3 3 2 4', '#ffd23f', 2.4)}`,
  numbers: `${SH(15)}<path d="M8 10h32a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H22l-7 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="#f0485a" ${O}/>
    <text x="24" y="27.5" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="700" font-size="15" fill="#fff6c8" stroke="${K}" stroke-width="3" paint-order="stroke">-25</text>`,
  arrowup: `${SH(12)}<path d="M24 4L41 21H31v19H17V21H7z" fill="#3fd873" ${O}/><path d="M28 23v14" stroke="#1f9a4c" stroke-width="3.5" stroke-linecap="round"/>${HL('M14 19l8-8', 2.6)}`,
  trash: `${SH(12)}<path d="M11 14h26l-3 27H14z" fill="#f0485a" ${O}/><path d="M19 19l1 17M24 19v17M29 19l-1 17" stroke="#a8182a" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="8" y="9" width="32" height="6" rx="3" fill="#ff8a9a" ${O}/><path d="M19 9V6h10v3" fill="none" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>${HL('M14 18l1.5 12', 2.2)}`,
  piggy: `${SH(15)}<path d="M9 24c0-8 7-13 15-13 6 0 10 2 13 5l5-1-1 6c1 2 2 4 2 6v4l-4 1c-1 3-3 5-6 6v4h-6v-3h-8v3h-6v-5c-3-2-4-5-4-8l-3-1v-6z" fill="#ff9dbb" ${O}/>
    <path d="M19 9h10" stroke="${K}" stroke-width="3" stroke-linecap="round"/><rect x="19" y="13.5" width="10" height="3" rx="1.5" fill="${K}"/><circle cx="34" cy="22" r="2" fill="${K}"/>
    <path d="M12 33c3 2 7 3 11 3" stroke="#e86a96" stroke-width="3" fill="none" stroke-linecap="round"/>${COIN(24, 6, 5)}${HL('M14 21a9 9 0 0 1 6-5', 2.6)}`,
  hourglass: `${SH(11)}<rect x="10" y="4" width="28" height="6" rx="3" fill="#a0642e" ${O}/><rect x="10" y="38" width="28" height="6" rx="3" fill="#a0642e" ${O}/>
    <path d="M14 10h20c0 8-6 11-7 14 1 3 7 6 7 14H14c0-8 6-11 7-14-1-3-7-6-7-14z" fill="#d9f7ff" ${O}/><path d="M18 14h12c-1 4-4 6-6 8-2-2-5-4-6-8zM16 36c1-4 5-6 8-7 3 1 7 3 8 7z" fill="#ffd23f"/>
    <path d="M24 22v8" stroke="#ffd23f" stroke-width="2" stroke-dasharray="2 2"/>${HL('M17 13c1 3 2 5 4 6', 2.2)}`,
  crit: `${SH(12)}<path d="M24 3l5 11 12-4-6 11 10 7-12 2 1 13-10-8-10 8 1-13-12-2 10-7-6-11 12 4z" fill="#ff7a1a" ${O}/><path d="${star5(24, 25, 9, 4.5)}" fill="#ffd23f" stroke="${K}" stroke-width="2" stroke-linejoin="round"/>`,
  medal: '', // = pass (défini plus bas)
  bag: '',   // = boost
  cart: '',  // = shop
};
ART.medal = ART.pass; ART.bag = ART.boost; ART.cart = ART.shop;

// Icône illustrée si elle existe, sinon pictogramme d'interface (fermer, retour, coche...)
export function icon(name, cls = '') {
  if (ART[name]) return `<svg class="ico art ${cls}" viewBox="0 0 48 48" aria-hidden="true">${ART[name]}</svg>`;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
export const ART_NAMES = Object.keys(ART);
// Remplace les <i data-ico="nom"> du HTML statique par leur SVG
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-ico]').forEach((i) => { i.outerHTML = icon(i.dataset.ico, i.className); });
}
export const coin = (cls = '') => `<i class="coin-ico ${cls}" aria-hidden="true"></i>`;
export const gem = (cls = '') => icon('gem', 'gem-ico ' + cls);
