// Icônes SVG inline au trait arrondi (aucun emoji dans l'interface).
const S = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';

const ICONS = {
  heart: `<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="#ff5d6c" stroke="#3d2c4e" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9.2c.6-1 1.6-1.4 2.6-1.1" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
  gem: `<path d="M6.5 4h11l4 5.5L12 21 2.5 9.5z" fill="#5fd8ff" stroke="#3d2c4e" stroke-width="1.8" stroke-linejoin="round"/><path d="M2.5 9.5h19M9 4 7.5 9.5 12 21l4.5-11.5L15 4" fill="none" stroke="#3d2c4e" stroke-width="1.3" stroke-linejoin="round" opacity=".55"/><path d="M6.5 4 4.2 7.2h4z" fill="#fff" opacity=".75"/>`,
  wave: `<path d="M5 21V4" ${S}/><path d="M5 5h11l-2.5 3.5L16 12H5z" ${F} stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  trophy: `<path d="M7 4h10v3a5 5 0 0 1-10 0zM5 5H3v1a4 4 0 0 0 4 4M19 5h2v1a4 4 0 0 1-4 4M12 12v4m-4 4h8l-1-4H9z" ${S}/>`,
  star: `<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8z" ${F} stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
  play: `<path d="M8 5.5v13l11-6.5z" ${F} stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  pause: `<rect x="6.5" y="5" width="3.8" height="14" rx="1.9" ${F}/><rect x="13.7" y="5" width="3.8" height="14" rx="1.9" ${F}/>`,
  sound: `<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" ${F} stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" ${S}/>`,
  mute: `<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" ${F} stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 9.5l5 5m0-5l-5 5" ${S}/>`,
  cart: `<path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L20 8H6.2" ${S}/><circle cx="9.5" cy="19.5" r="1.6" ${F}/><circle cx="16.5" cy="19.5" r="1.6" ${F}/>`,
  gear: `<circle cx="12" cy="12" r="3.2" ${S}/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" ${S}/>`,
  lock: `<rect x="5" y="10.5" width="14" height="10" rx="3" ${F}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${S}/>`,
  back: `<path d="M14.5 5.5L8 12l6.5 6.5" ${S}/>`,
  close: `<path d="M6.5 6.5l11 11m0-11l-11 11" ${S}/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S}/>`,
  up: `<path d="M12 19V6m-6 6l6-6 6 6" ${S}/>`,
  skull: `<path d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.4 3 5.4V19a1.5 1.5 0 0 0 1.5 1.5h6A1.5 1.5 0 0 0 16.5 19v-2.6c1.700-1 3-2.800 3-5.400A7.500 7.500 0 0 0 12 3.500z" ${S}/><circle cx="9" cy="11.5" r="1.7" ${F}/><circle cx="15" cy="11.5" r="1.7" ${F}/>`,
  sword: `<path d="M19.500 4.500l-9.500 9.500m9.500-9.500h-4m4 0v4M7 13l4 4m-5.500-1.500l-2 2m5.500 1.500l-2-2" ${S}/>`,
  share: `<path d="M12 15V4m0 0l-4 4m4-4l4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" ${S}/>`,
  restart: `<path d="M5 12a7 7 0 1 0 2.300-5.200M5 4.500v4h4" ${S}/>`,
  map: `<path d="M9 4.500L3.500 6.500v13L9 17.500l6 2 5.500-2v-13L15 6.500zM9 4.500v13m6-11v13" ${S}/>`,
  infinity: `<path d="M8 8.500c-2.200 0-4 1.600-4 3.500s1.800 3.500 4 3.500c4 0 4-7 8-7 2.200 0 4 1.600 4 3.500s-1.800 3.500-4 3.500c-4 0-4-7-8-7z" ${S}/>`,
  target: `<circle cx="12" cy="12" r="7.500" ${S}/><circle cx="12" cy="12" r="2.200" ${F}/><path d="M12 2.500v3m0 13v3M2.500 12h3m13 0h3" ${S}/>`,
  bolt: `<path d="M13 3L5 13.500h6L10 21l8-10.500h-6z" ${F} stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
  vibrate: `<rect x="8" y="4" width="8" height="16" rx="2.500" ${S}/><path d="M4.500 9v6M19.500 9v6M2 10.500v3M22 10.500v3" ${S}/>`,
  quake: `<path d="M3 12h3l2-5 3 10 3-8 2 5 2-2h3" ${S}/>`,
  numbers: `<path d="M5 8h4M7 6v4M14 7h5M5 16h4M15 14l3.500 3.500m0-3.500L15 17.500" ${S}/>`,
  book: `<path d="M5 5.500A2.500 2.500 0 0 1 7.500 3H19v15H7.500A2.500 2.500 0 0 0 5 20.500zM5 20.500A2.500 2.500 0 0 0 7.500 21H19" ${S}/>`,
  trash: `<path d="M5 7h14M9.500 7V4.500h5V7M7 7l1 13h8l1-13" ${S}/>`,
  medal: `<circle cx="12" cy="14.500" r="5.500" ${S}/><path d="M8.500 3l2 6M15.500 3l-2 6" ${S}/><path d="M12 12.200l.9 1.800 2 .3-1.450 1.400.35 2L12 16.700l-1.800 1 .35-2L9.100 14.300l2-.3z" ${F}/>`,
  crown: `<path d="M4 18h16l1.2-9.5-5 3.5L12 5.500 7.800 12l-5-3.500z" ${F} stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  wrench: `<path d="M14.500 6.500a4 4 0 0 0-5.300 5.300L4 17l3 3 5.200-5.200a4 4 0 0 0 5.300-5.300L15 12l-3-3z" ${S}/>`,
  coins: `<ellipse cx="9" cy="8" rx="5.500" ry="3" ${S}/><path d="M3.500 8v4c0 1.700 2.500 3 5.500 3M3.500 12v4c0 1.700 2.500 3 5.500 3" ${S}/><ellipse cx="15.500" cy="14" rx="5" ry="3" ${S}/><path d="M10.500 14v3.500c0 1.700 2.200 3 5 3s5-1.300 5-3V14" ${S}/>`,
  cannon: `<circle cx="8" cy="17" r="3.500" ${S}/><path d="M6 13.500L17 6l3 4.500-9 6" ${S}/><path d="M17 6l1.500-1" ${S}/>`,
  bomb: `<circle cx="10.500" cy="14" r="6.500" ${F}/><path d="M14.500 9l2.500-2.500M17 6.500c1-2 3-2 4-1" ${S}/><path d="M7.500 12a3.500 3.500 0 0 1 2.500-2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`,
  snow: `<path d="M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9M9.500 4.500L12 7l2.500-2.500M9.500 19.500L12 17l2.500 2.500" ${S}/>`,
  gift: `<rect x="4" y="10" width="16" height="10.500" rx="2" ${S}/><path d="M3 7h18v3H3zM12 7v13.500M12 7c-1.500-4-6-3.500-5-1 .5 1 2.500 1 5 1zm0 0c1.500-4 6-3.500 5-1-.5 1-2.500 1-5 1z" ${S}/>`,
  shield: `<path d="M12 3l7.500 2.500v5.500c0 5-3.500 8.500-7.500 10-4-1.500-7.500-5-7.500-10V5.500z" ${S}/><path d="M9 12l2.200 2.200L15.500 10" ${S}/>`,
  revive: `<path d="M12 20s-7-4.300-7-9.500A4 4 0 0 1 12 8a4 4 0 0 1 7 2.500c0 5.200-7 9.500-7 9.500z" ${S}/><path d="M12 10.500v5M9.500 13h5" ${S}/>`,
  castle: `<path d="M4 20V9h3V6h2v3h2V5h2v4h2V6h2v3h3v11zM10 20v-4a2 2 0 0 1 4 0v4" ${S}/>`,
  bag: `<path d="M6 8h12l1.500 11.500a1 1 0 0 1-1 1.100H5.500a1 1 0 0 1-1-1.100zM9 8V6.500a3 3 0 0 1 6 0V8" ${S}/>`,
  talent: `<circle cx="12" cy="5.500" r="2.500" ${S}/><circle cx="5.500" cy="18" r="2.500" ${S}/><circle cx="18.500" cy="18" r="2.500" ${S}/><path d="M12 8v4m0 0l-5 4m5-4l5 4" ${S}/>`,
  plus: `<path d="M12 5v14M5 12h14" ${S}/>`,
  chart: `<path d="M4 20h16" ${S}/><rect x="5.5" y="11" width="3.4" height="7" rx="1" ${F}/><rect x="10.3" y="6" width="3.4" height="12" rx="1" ${F}/><rect x="15.1" y="9" width="3.4" height="9" rx="1" ${F}/>`,
  bulb: `<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" ${S}/>`,
  home: `<path d="M4 11l8-7 8 7M6 10v9.500h12V10" ${S}/>`,
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
// Remplace les <i data-ico="nom"> du HTML statique par leur SVG
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-ico]').forEach((i) => { i.outerHTML = icon(i.dataset.ico, i.className); });
}
export const coin = (cls = '') => `<i class="coin-ico ${cls}" aria-hidden="true"></i>`;
export const gem = (cls = '') => icon('gem', 'gem-ico ' + cls);
