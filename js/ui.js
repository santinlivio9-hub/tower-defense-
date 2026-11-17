// Interface : écrans (menu, cartes, boutique, paramètres), HUD, barre de tourelles,
// feuille d'amélioration, tutoriel, pause, fin de partie, partage, entrées tactile / souris / clavier.
import { QUALITY, HUD_FX, GAME, VIEW, TOWERS, ENEMIES, RARITY, SHOP, ACHIEVEMENTS, LEVELS, WORLDS, TABS, BOOSTS, UNLOCKS } from './config.js';
import { Meta, MECH_ICON } from './meta.js';
import { Reveal } from './reveal.js';
import { Hub } from './hub.js';
import { Loot } from './loot.js';
import { End } from './end.js';
import { Talents } from './talents.js';
import { Collection } from './collection.js';
import { BoostUI } from './boosts.js';
import { Music } from './music.js';
import { Daily } from './daily.js';
import { Radial } from './radial.js';
import { Rebirth } from './rebirth.js';
import { Game } from './game.js';
import { computeStats, dpsOf, TARGET_MODES } from './towers.js';
import { waveSummary, levelEnemies } from './waves.js';
import { enemyImg, towerImg, preloadSprites, enemyFrames, towerSprite, skinFinish } from './sprites.js';
import { icon, hydrateIcons, coin, gem } from './icons.js';
import { Haptics } from './haptics.js';
import { Monetization, isNative } from './monetization.js';
import { fit, ROT_QUERY } from './viewport.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1) + 'k' : fmt(n));
const num = (n) => (n >= 20 || Number.isInteger(+n.toFixed(1)) ? String(Math.round(n)) : String(Math.round(n * 10) / 10).replace('.', ','));
const stars = (n, cls = 'stars') => `<span class="${cls}">${[0, 1, 2].map((i) => icon('star', i < n ? 'on' : '')).join('')}</span>`;

const TUTORIAL = [
  { text: 'Touche un <b>socle</b>', target: (ui) => { const sl = tutSlot(ui.game); return ui.fieldPoint(sl.x, sl.y); }, done: (g) => !!g.menuSlot || g.towers.length > 0 },
  { text: 'Choisis une tourelle, puis <b>touche-la encore</b>', target: () => $('#radial .rb'), done: (g) => g.towers.length > 0, keep: true },
  { text: '<b>Lance la vague !</b>', target: () => $('#btn-wave'), done: (g) => g.wave >= 1 },
  { text: 'Touche ta tourelle pour l\'<b>améliorer</b>', target: (ui) => { const t = ui.game.towers[0]; return t ? ui.fieldPoint(t.x, t.y) : null; }, wait: (g) => g.cleared < 1 || !g.towers.some((t) => t.canUp), done: (g) => (!!g.menuSlot && !!g.menuSlot.tower) || g.wave >= 4 },
];

// socle montré par le tutoriel : le plus proche du chemin vers 40 % de son parcours (milieu de l'écran, loin du
// portail et du HUD, et la première tourelle voit passer tous les brainrots)
function tutSlot(g) {
  if (g._tutSlot) return g._tutSlot;
  const p = g.paths[0], q = p.pointAt(p.total * 0.4), list = g.slots.filter((s) => s.kind === 'tower');
  g._tutSlot = list.sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y))[0];
  return g._tutSlot;
}

export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio; this.game = null;
    this.haptics = new Haptics(save.data.settings, audio);
    this.music = new Music(audio, save.data.settings);
    this.shopTab = 'chests';
    this.mon = new Monetization(save); this.mon.init().catch(() => {});
    this.mon.onGrant = () => { this.refreshGems(); if (this.screen === 'shop') this.renderShop(); };
    this.canvas = $('#game'); this.cache = {}; this.last = 0; this.simulating = false;
    this.down = null; this.armed = null; this.tutStep = -1; this.flying = 0; this.shown = { money: 0, score: 0 };

    hydrateIcons();
    preloadSprites(save.data.skin, save.data.towers);
    document.addEventListener('pointerdown', (e) => {
      this.audio.unlock(); if (!this.music.on) this.music.start();
      if (e.target.closest('.btn, .icon-btn, .seg button, .switch, .rb')) { this.audio.play('click'); this.haptics.pulse(0); }
    }, { capture: true });
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => this.show(b.dataset.go)));
    $$('#shop-tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { this.shopTab = b.dataset.tab; this.renderShop(); }));
    window.addEventListener('resize', () => this.resize());
    // la zone jouable suit sa vraie taille (barre du bas qui change de hauteur, rotation, barres du navigateur)
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => this.resize()); ro.observe($('#field')); ro.observe($('#stage')); }
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    // téléphone à l'horizontale : pause automatique (son coupé), reprise au retour en portrait
    if (window.matchMedia) { const mq = matchMedia(ROT_QUERY), on = () => this.onRotate(mq.matches); if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); on(); }
    window.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    this.bindGameInput();
    // retour haptique léger sur tout bouton d'interface (les actions plus fortes vibrent avant, le léger est alors ignoré)
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) this.haptics.pulse(0); });
    $('#btn-endless').onclick = () => this.openEndless();

    this.buildTabbar();

    this.show('menu');
    if (save.recovered === 'backup') setTimeout(() => this.toast('Sauvegarde récupérée', 'Elle était abîmée : la copie de secours a été chargée', icon('check')), 900);
    else if (save.recovered === 'lost') setTimeout(() => this.toast('Sauvegarde illisible', 'Elle est mise de côté, rien n\'est effacé. Importe une copie dans les Paramètres.', icon('trash')), 900);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.resize());
    requestAnimationFrame((ts) => this.loop(ts));
  }

  // ------------------------------------------------------------------ écrans
  // keep = simple rafraîchissement de l'écran courant (pas de transition)
  show(name, keep = false) {
    const prev = this.screen, next = $('#screen-' + name);
    const tabOf = (n) => { const e = n && $('#screen-' + n); return e && e.classList.contains('tabbed') ? e.dataset.tab || n : null; };
    const pt = tabOf(prev), nt = tabOf(name);
    clearTimeout(this.slideT);
    $$('.screen').forEach((s) => { s.classList.remove('in-l', 'in-r', 'out-l', 'out-r'); s.classList.toggle('active', s === next); });
    // transition glissée entre les onglets (sens selon la position dans la barre)
    if (!keep && pt && nt && prev !== name) {
      const idx = (t) => TABS.findIndex((x) => x.id === t);
      let dir = idx(nt) - idx(pt); if (!dir) dir = name === 'menu' ? -1 : 1;
      const old = $('#screen-' + prev);
      old.classList.add(dir > 0 ? 'out-l' : 'out-r'); next.classList.add(dir > 0 ? 'in-r' : 'in-l');
      this.slideT = setTimeout(() => $$('.screen').forEach((s) => s.classList.remove('in-l', 'in-r', 'out-l', 'out-r')), 340);
    }
    this.screen = name;
    $('#resbar').hidden = $('#tabbar').hidden = !nt;
    $$('#tabbar .tab').forEach((b) => b.classList.toggle('on', b.dataset.go === nt));
    document.body.dataset.screen = name;
    this.refreshGems();
    if (nt) this.tabBadges();
    if (name === 'menu') this.showNotice();
    if (name === 'world') this.renderWorld();
    if (this.renderMeta) this.renderMeta(name);
    if (name === 'shop') this.renderShop();
    if (name === 'settings') this.renderSettings();
    if (name === 'game') this.resize();
    if (name !== 'game') { this.closeOverlay(); $('#tutorial').hidden = true; }
  }
  refreshGems() { this.refreshWallet(); }
  // Notifications. En partie : zone dédiée juste sous le HUD et les objectifs (jamais par-dessus), format compact.
  toast(title, sub = '', art = icon('medal')) {
    const box = $('#toasts'), inGame = this.screen === 'game', max = inGame ? HUD_FX.toastMax : 2;
    box.classList.toggle('ingame', inGame);
    for (const o of box.children) if (o.dataset.k === title) o.remove();   // même message : on remplace
    while (box.children.length >= max) box.firstChild.remove();
    const t = el('div', 'toast' + (inGame ? ' mini' : ''), `<div><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>`);
    t.dataset.k = title;
    if (typeof art === 'string') t.insertAdjacentHTML('afterbegin', art); else t.prepend(art);
    const ms = inGame ? HUD_FX.toastMs : 3900; t.style.animationDuration = ms + 'ms';
    box.append(t); setTimeout(() => t.remove(), ms + 100);
  }
  // Succès débloqué : notification discrète (la récompense se récupère dans Collection > Succès)
  announce(list) { for (const a of (list || []).slice(0, 2)) this.toast('Succès : ' + a.name + (a.tier ? ' · ' + a.tier.name : ''), a.desc, icon('medal')); if (list && list.length) this.tabBadges(); }
  openOverlay(node, cls = '') { const ov = $('#overlay'); ov.innerHTML = ''; ov.append(node); ov.className = 'overlay show ' + cls; }
  closeOverlay() { $('#overlay').classList.remove('show'); }

  renderShop() {
    const d = this.save.data, grid = $('#shop-content'); grid.innerHTML = '';
    $$('#shop-tabs [data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === this.shopTab));
    this.refreshGems();
    if (this.shopTab === 'chests') { if (this.shopDaily) this.shopDaily(grid); this.renderShopChests(grid); return; }
    if (this.shopTab === 'boosts') { this.renderShopBoosts(grid); return; }
    if (this.shopTab === 'gems') { this.renderShopGems(grid); return; }
    const owned = (txt) => el('span', 'owned', icon('check') + txt);
    const g = el('div', 'cgrid');
    for (const s of SHOP.skins) {
      const has = d.skins.includes(s.id), on = d.skin === s.id;
      const card = el('div', 'ccard skin' + (on ? ' on' : ''), `<span class="cc-art"><i class="pad"></i></span><b>${s.name}</b>`);
      $('.cc-art', card).append(towerImg('assault', 84, s.id, 4, 0));   // aperçu sur une vraie tourelle, posée sur son socle
      if (on) card.append(owned('Équipé'));
      else if (s.season && !has) { card.classList.add('excl'); card.append(el('span', 'btn sm locked', `${icon('crown')}Pass de saison`)); }
      else if (s.rebirth && !has) { card.classList.add('excl'); card.append(el('span', 'btn sm locked', `${icon('shard')}Renaissance`)); }
      else if (s.exclusive && !has) { const n = UNLOCKS.skins[s.id]; card.classList.add('excl'); card.append(el('span', 'btn sm locked', `${icon('lock')}Boss ${LEVELS[n - 2].id}`)); }
      else if (has) { const b = el('button', 'btn sm green', 'Équiper'); b.onclick = () => { d.skin = s.id; this.save.persist(); preloadSprites(s.id, d.towers); this.audio.play('upgrade'); this.renderShop(); }; card.append(b); }
      else card.append(this.buyButton(s.cost, 'gems', '', () => { d.skins.push(s.id); d.skin = s.id; preloadSprites(s.id, d.towers); }));
      g.append(card);
    }
    grid.append(g, el('p', 'hint', 'Une finition s\'applique à toutes tes armes.'));
  }

  // Bouton « pub récompensée » : toujours un choix du joueur. Bouton SECONDAIRE (petit, violet, icône vidéo, gain
  // affiché) pour ne jamais être confondu avec le bouton principal. Avec « Sans pubs », le bonus est gratuit.
  adButton(label, gain, reason, onReward, cls = '') {
    const m = this.mon, left = m.adsLeft(), free = m.hasRemoveAds();
    const b = el('button', 'btn sm adbtn ' + cls + (left ? '' : ' locked'), left ? `<i class="adv">${icon(free ? 'gift' : 'video')}</i><span class="adl">${label}</span><b class="adg">${gain}</b><em>${free ? 'GRATUIT' : 'PUB'}</em>` : `${icon('hourglass')}<span>Plus de pubs aujourd'hui</span>`);
    b.onclick = async (e) => {
      e.stopPropagation(); if (!m.adsLeft() || b.disabled) { this.audio.play('error'); return; }
      b.disabled = true; this.music.duck && this.music.duck(true);
      const ok = await m.showRewardedAd(reason);
      this.music.duck && this.music.duck(false); b.disabled = false;
      if (ok) { this.audio.play('buy'); this.haptics.pulse(1); onReward(); } else this.toast('Pas de récompense', 'La pub n\'a pas été regardée jusqu\'au bout', icon('play'));
    };
    return b;
  }
  // Défaite : réanimation contre une pub (une fois par partie)
  reviveOffer(g) {
    if (this.game !== g || !g.awaitRevive) return;
    this.closeMenu();
    const m = el('div', 'panel glass ask revive-ask', `<h2 class="lose">CHÂTEAU DÉTRUIT</h2><p class="sub">Réanime ton château : il repart à moitié de ses PV et les brainrots sont balayés. Une fois par partie.</p>`);
    const go = this.adButton('Réanimer', '50 % PV', 'réanimation du château', () => { this.closeOverlay(); g.reviveAnswer(true); });
    const no = el('button', 'btn ghost', 'Non merci'); no.onclick = () => { this.closeOverlay(); g.reviveAnswer(false); };
    m.append(go, no); this.openOverlay(m);
  }
  // Boutique → Gemmes : achats intégrés (aucun n'est nécessaire pour finir le jeu)
  renderShopGems(grid) {
    const m = this.mon, P = (id) => m.product(id), list = el('div', 'iap-list');
    const card = (id, cls = '') => {
      const p = P(id), owned = p.type !== 'consumable' && m.owns(id);
      const c = el('div', 'iap ' + cls + (owned ? ' owned' : ''), `<span class="iap-art">${p.gems && !p.desc ? gem('big') : icon(id === 'remove_ads' ? 'shield' : 'gift')}</span><span class="iap-txt"><b></b><small></small></span>${p.tag ? `<em class="xch-tag">${p.tag}</em>` : ''}`);
      $('b', c).textContent = p.name; $('small', c).textContent = p.desc || `${p.gems} gemmes`;
      if (owned) c.append(el('span', 'owned', icon('check') + 'Acheté'));
      else { const b = el('button', 'btn sm green', m.price(id) || '—'); b.disabled = !m.canBuy(id); b.onclick = async () => { b.disabled = true; const ok = await m.buy(id); b.disabled = false; if (ok) { this.audio.play('legendary'); this.haptics.pulse(2); this.toast('Merci !', p.name + ' : c\'est dans ton inventaire', gem()); this.refreshGems(); this.renderShop(); } }; c.append(b); }
      return c;
    };
    if (!m.owns('starter_pack')) list.append(card('starter_pack', 'starter'));
    list.append(card('gems_small'), card('gems_medium'), card('gems_large'), card('remove_ads', 'noads'));
    grid.append(list);
    const rs = el('button', 'btn ghost sm', icon('restart') + 'Restaurer mes achats'); rs.onclick = async () => { const n = await m.restorePurchases(); this.toast(n ? 'Achats restaurés' : 'Aucun achat à restaurer', '', icon('check')); this.renderShop(); };
    grid.append(rs, el('p', 'hint', isNative() ? 'Aucun achat n\'est nécessaire pour finir le jeu. Les pubs ne sont jamais imposées.' : 'Version web : les achats sont simulés, rien n\'est facturé. Aucun achat n\'est nécessaire pour finir le jeu.'));
  }

  switchRow(label, sub, ico, key, after) {
    const s = this.save.data.settings;
    const row = el('div', 'setting', `<span class="lab">${icon(ico)}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span></span>`);
    const sw = el('button', 'switch' + ((key === 'muted' ? !s[key] : s[key]) ? ' on' : '')); sw.setAttribute('role', 'switch');
    sw.onclick = () => { s[key] = !s[key]; this.save.persist(); if (after) after(); sw.classList.toggle('on', key === 'muted' ? !s[key] : s[key]); };
    row.append(sw); return row;
  }
  renderSettings() {
    const s = this.save.data.settings, box = $('#settings-content'); box.innerHTML = '';
    box.append(this.switchRow('Son', 'Coupe ou rétablit tout le son', 'sound', 'muted', () => { this.audio.applyVolume(); this.syncMute(); this.music.apply(); }));
    // deux curseurs : musique et effets, mémorisés
    const slider = (label, ico, key, onIn, onCh) => {
      const row = el('div', 'setting vol', `<span class="lab">${icon(ico)}<span>${label}</span></span><b class="pct"></b>`);
      const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = s[key]; r.setAttribute('aria-label', label);
      const pct = $('.pct', row), show = () => { pct.textContent = Math.round(r.value * 100) + ' %'; r.style.setProperty('--v', r.value * 100 + '%'); };
      r.oninput = () => { s[key] = +r.value; onIn(); show(); this.save.persist(); }; r.onchange = onCh; show();
      row.insertBefore(r, pct); return row;
    };
    box.append(slider('Musique', 'music', 'musicVol', () => this.music.apply(), () => {}));
    box.append(slider('Effets', 'sound', 'sfxVol', () => this.audio.applyVolume(), () => this.audio.play('coin')));
    box.append(this.switchRow('Vibrations', 'Retour haptique', 'vibrate', 'haptics', () => this.haptics.pulse(1)));
    box.append(this.switchRow('Tremblement d\'écran', 'Explosions et boss', 'quake', 'shake'));
    box.append(this.switchRow('Chiffres de dégâts', 'Nombres flottants', 'numbers', 'damageNumbers'));
    box.append(this.switchRow('Indicateurs', 'Flèche UP et socles achetables', 'arrowup', 'hints'));
    box.append(this.switchRow('Vague suivante automatique', `Elle part ${GAME.interWaveTime} s après la fin de la précédente`, 'wave', 'autoWave'));
    const tut = el('div', 'setting', `<span class="lab">${icon('bulb')}<span>Tutoriel<small>Le revoir à la prochaine partie</small></span></span>`);
    const tb = el('button', 'btn sm ghost', 'Revoir'); tb.onclick = () => { s.tutorialDone = false; this.save.persist(); this.toast('Tutoriel réactivé', '', icon('bulb')); }; tut.append(tb); box.append(tut);
    // sauvegarde : export / import (texte à garder ailleurs), réinitialisation avec annulation
    const sync = () => { this.audio.settings = this.haptics.settings = this.music.settings = this.save.data.settings; this.audio.applyVolume(); this.music.apply(); preloadSprites(this.save.data.skin); this.show('settings', true); };
    const ex = el('div', 'setting', `<span class="lab">${icon('share')}<span>Sauvegarde<small>Garde une copie, ou reprends-la sur un autre appareil</small></span></span>`);
    const eb = el('button', 'btn sm ghost', 'Exporter'); eb.onclick = () => this.exportSave();
    const ib = el('button', 'btn sm ghost', 'Importer'); ib.onclick = () => this.importSave(sync);
    const eg = el('span', 'set-btns'); eg.append(eb, ib); ex.append(eg); box.append(ex);
    const rs = el('div', 'setting', `<span class="lab">${icon('trash')}<span>Réinitialiser<small>Efface toute la progression</small></span></span>`);
    const rb = el('button', 'btn sm red', 'Effacer');
    rb.onclick = () => this.ask('Tout effacer ?', 'Gemmes, pièces, château, talents, étoiles et records repartent de zéro. Tu pourras annuler juste après.', 'Effacer', () => { this.save.reset(); sync(); this.toast('Progression effacée', 'Bouton « Annuler » dans les Paramètres', icon('trash')); }, 'red');
    rs.append(rb); box.append(rs);
    if (this.save.hasUndo()) {
      const un = el('div', 'setting', `<span class="lab">${icon('restart')}<span>Annuler<small>Revenir à la progression d'avant l'effacement ou l'import</small></span></span>`);
      const ub = el('button', 'btn sm green', 'Restaurer'); ub.onclick = () => { if (this.save.restoreUndo()) { sync(); this.toast('Progression restaurée', '', icon('check')); } };
      un.append(ub); box.append(un);
    }
    // achats, confidentialité
    const rp = el('div', 'setting', `<span class="lab">${icon('restart')}<span>Restaurer mes achats<small>Sans pubs, Pack de démarrage</small></span></span>`);
    const rpb = el('button', 'btn sm ghost', 'Restaurer'); rpb.onclick = async () => { rpb.disabled = true; const n = await this.mon.restorePurchases(); rpb.disabled = false; this.toast(n ? 'Achats restaurés' : 'Aucun achat à restaurer', n ? `${n} achat${n > 1 ? 's' : ''} rétabli${n > 1 ? 's' : ''}` : '', icon('check')); };
    rp.append(rpb); box.append(rp);
    const pv = el('div', 'setting', `<span class="lab">${icon('shield')}<span>Confidentialité<small>Politique de confidentialité${isNative() ? ' et choix pour les pubs' : ''}</small></span></span>`);
    const pg = el('span', 'set-btns'), pl = el('a', 'btn sm ghost', 'Lire'); pl.href = 'privacy.html'; pl.target = '_blank'; pl.rel = 'noopener'; pg.append(pl);
    if (isNative()) { const po = el('button', 'btn sm ghost', 'Pubs'); po.onclick = async () => { if (!(await this.mon.privacyOptions())) this.toast('Rien à modifier', 'Aucun choix de confidentialité requis ici', icon('shield')); }; pg.append(po); }
    pv.append(pg); box.append(pv);
    box.append(el('p', 'hint', 'Astuce : ajoute le jeu à ton écran d\'accueil (Partager → « Sur l\'écran d\'accueil ») pour y jouer en plein écran et hors ligne.<br>Clavier : 1-8 choix du menu · Espace vague · P pause · Échap fermer.'));
    box.append(el('p', 'hint version', `Version ${window.__version || 'locale'} · 5 tapes sur le logo de l'accueil : mode debug affichage`));
  }
  // Boîte de confirmation dans le style du jeu (remplace confirm() du navigateur)
  ask(title, text, okLabel, onOk, cls = 'primary') {
    const m = el('div', 'panel glass ask', `<h2 class="lose"></h2><p class="sub"></p>`);
    $('h2', m).textContent = title.replace(/ ([?!:])/g, '\u00a0$1'); $('.sub', m).textContent = text;
    const row = el('div', 'btn-row');
    const no = el('button', 'btn ghost', 'Annuler'); no.onclick = () => this.closeOverlay();
    const ok = el('button', 'btn ' + cls, okLabel); ok.onclick = () => { this.closeOverlay(); onOk(); };
    row.append(no, ok); m.append(row); this.openOverlay(m);
  }
  exportSave() {
    const txt = this.save.exportText();
    const m = el('div', 'panel glass ask', `<h2 class="win">Exporter</h2><p class="sub">Copie ce texte et garde-le (Notes, Fichiers, message à toi-même). Il contient toute ta progression.</p><textarea readonly class="save-txt"></textarea>`);
    $('textarea', m).value = txt;
    const row = el('div', 'btn-row');
    const cp = el('button', 'btn primary', 'Copier');
    cp.onclick = async () => { try { await navigator.clipboard.writeText(txt); cp.textContent = 'Copié !'; } catch (e) { const t = $('textarea', m); t.focus(); t.select(); try { document.execCommand('copy'); cp.textContent = 'Copié !'; } catch (e2) { cp.textContent = 'Sélectionne et copie'; } } };
    const ok = el('button', 'btn ghost', 'Fermer'); ok.onclick = () => this.closeOverlay();
    row.append(ok, cp); m.append(row); this.openOverlay(m);
  }
  importSave(after) {
    const m = el('div', 'panel glass ask', `<h2 class="win">Importer</h2><p class="sub">Colle ici le texte exporté. Il remplace la progression actuelle (annulable ensuite).</p><textarea class="save-txt" placeholder="BRAINROT1:..."></textarea><p class="ask-err" hidden>Ce texte n'est pas une sauvegarde valide.</p>`);
    const row = el('div', 'btn-row');
    const no = el('button', 'btn ghost', 'Annuler'); no.onclick = () => this.closeOverlay();
    const ok = el('button', 'btn primary', 'Importer');
    ok.onclick = () => { if (this.save.importText($('textarea', m).value)) { this.closeOverlay(); after(); this.toast('Sauvegarde importée', '', icon('check')); } else { $('.ask-err', m).hidden = false; this.audio.play('error'); } };
    row.append(no, ok); m.append(row); this.openOverlay(m);
  }
  // Compteur de kills enchaînés sur le côté (x5, x10, x25 « CARNAGE ! »)
  showCombo(n, tier) {
    const box = $('#combo'); clearTimeout(this.comboHide);
    if (n < 3 && !tier) return;
    box.hidden = false; $('b', box).textContent = 'x' + n;
    box.className = 'c' + Math.min(4, Math.floor(Math.log2(Math.max(1, n / 3)) + (n >= 25 ? 1 : 0)));
    const now = performance.now(); if (tier || now - (this._cb || 0) > 70) { this._cb = now; box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
    if (tier) {
      const em = $('em', box); em.textContent = `${tier.label} +${tier.bonus}`; em.classList.remove('go'); void em.offsetWidth; em.classList.add('go');
      this.audio.play('tier'); this.haptics.pulse(n >= 25 ? 2 : 1);
    }
    this.comboHide = setTimeout(() => { box.classList.add('out'); setTimeout(() => { box.hidden = true; box.classList.remove('out'); }, 300); }, 1400);
  }
  // Intensité de la musique : menus (0), partie (1), boss (2)
  // Musique : thème du menu, du monde en cours ou du boss ; percussions en plus pendant les vagues
  syncMusic() {
    const g = this.game, inGame = this.screen === 'game' && g && !g.over;
    if (!inGame) { this.music.set('menu', 0); return; }
    const boss = g.enemies.some((e) => e.boss && !e.mini) || (g.nextWave && g.nextWave.boss && !g.nextWave.mini && g.queue.length > 0);
    const busy = g.queue.length > 0 || g.enemies.length > 0;
    this.music.set(boss ? 'boss' : g.world.theme, busy || boss ? 1 : 0);
  }
  syncSpeed() { const g = this.game, b = $('#btn-speed'); b.querySelector('b').textContent = 'x' + (g ? g.speed : 1); b.dataset.s = g ? g.speed : 1; }
  syncMute() { $('#btn-mute').innerHTML = icon(this.save.data.settings.muted ? 'mute' : 'sound'); }

  // ------------------------------------------------------------------ partie
  startGame(n, heroic = false, endless = false, boosts = [], challenge = null) {
    this.clearGame();
    // tout premier niveau, tutoriel en cours : rien d'autre à l'écran que l'essentiel (boosts et objectifs dès le 1-2)
    if (n === 1 && !heroic && !endless && !challenge && !this.save.data.settings.tutorialDone) boosts = [];
    this.tutStep = this.save.data.settings.tutorialDone ? -1 : 0;
    // sprites de ce niveau seulement (tourelles possédées, brainrots qu'il peut envoyer, son boss)
    { const L = LEVELS[n - 1]; preloadSprites(this.save.data.skin, this.save.data.towers, [...levelEnemies(L), WORLDS[L.world].boss, 'mini']); }
    const g = (this.game = new Game({ canvas: this.canvas, level: LEVELS[n - 1], heroic, endless, save: this.save, audio: this.audio, boosts, challenge }));
    this.lastArgs = [n, heroic, endless, challenge];
    this.cache = {}; this.armed = null; this.shown = { money: g.money, score: 0 }; this.aiming = null;
    // un souci d'affichage (pièces qui volent, bulle d'info...) ne doit jamais interrompre la partie
    g.onReviveOffer = () => { if (this.simulating || g.endless || g.challenge || !this.mon.canReward()) return false; setTimeout(() => this.reviveOffer(g), 350); return true; };
    g.onEvent = (name, data) => { try { this.onGameEvent(name, data, g); } catch (e) { console.error(e); if (name === 'end') this.endFallback(data); } };
    Object.defineProperty(g, 'simulating', { get: () => this.simulating });
    this.closeOverlay(); this.closeMenu();
    this.syncMute(); if (this.buildDock) this.buildDock();
    g.speed = this.save.data.settings.speed || 1; this.syncSpeed(); $('#hud-money b').textContent = short(g.money); $('#hud-score b').textContent = '0';
    this.show('game');
    this.tutStep = this.save.data.settings.tutorialDone ? -1 : 0; this.cache.tut = null;
    if (g.mech) this.toast(g.mech.name, g.mech.desc, icon(MECH_ICON[g.mech.kind] || 'bolt'));
    if (g.mutant) this.toast(`Brainrots mutés (rang ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][g.mutant] || g.mutant})`, `Plus résistants, mais gains x${this.save.rewardMult()}`, icon('rebirth'));
    if (g.heroic) this.toast('Défi héroïque : ' + g.heroic.name, g.heroic.desc, icon('crown'));
    if (g.challenge) this.toast('Défi du jour : ' + g.challenge.name, g.challenge.desc, icon('target'));
    window.__game = g; // pratique pour le débogage / l'équilibrage en console
  }
  // Rejouer : on reprend les mêmes boosts s'il en reste
  replay() { const [n, h, e, ch] = this.lastArgs; this.startGame(n, h, e, this.loadoutFor ? this.loadoutFor(LEVELS[n - 1]) : [], ch); }
  levelLabel(g = this.game) { return g.challenge ? `Défi du jour · ${g.challenge.name}` : g.endless ? `Mode infini · ${g.world.name}` : `${g.heroic ? 'Héroïque' : 'Niveau'} ${g.level.id} · ${g.world.name}`; }
  // Remise à zéro complète entre deux parties : minuteries, éléments flottants, états de l'interface, instance de jeu.
  clearGame() {
    const g = this.game;
    clearTimeout(this.endT); clearTimeout(this.endWatch); clearTimeout(this.comboHide); this.endT = this.endWatch = null;
    if (g) { try { g.commit(); } catch (e) { console.error(e); this.save.persist(); } g.onEvent = () => {}; g.dispose(); }
    this.game = null; this.introOpen = false; this.aiming = null; this.armed = null; this.down = null; this.flying = 0; this.cache = {}; this.endSeq = null;
    $$('.tower-tip, .boost-pop, .boost-picker, .coin-fly, .drop-fly, .up-float, #toasts > *').forEach((e) => e.remove());
    for (const id of ['#combo', '#radial', '#aim-hint', '#tutorial', '#goals']) $(id).hidden = true;
    $('#radial').innerHTML = '';
    if (window.__game) window.__game = null;
  }
  // Quitter la partie (pause, écran de fin, écran d'erreur) : la progression est écrite, puis on change d'écran
  quitGame(to = 'world') {
    const had = !!this.game;
    this.clearGame(); this.closeOverlay();
    if (had) { try { this.announce(this.save.checkAchievements()); } catch (e) { console.error(e); } }
    this.show(to);
  }
  onGameEvent(name, data, g = this.game) {
    if (name === 'end') {
      if (!this.simulating) this.music.jingle(!!data.victory);
      const delay = data.victory ? 1700 : 1100;
      clearTimeout(this.endT); clearTimeout(this.endWatch);
      this.endT = setTimeout(() => { if (this.game === g) this.showEnd(data); }, delay);
      // filet : si rien ne s'affiche (séquence plantée), un écran de fin simple prend le relais
      this.endWatch = setTimeout(() => { if (this.game === g && !this.endVisible()) this.endFallback(data); }, delay + 3500);
    }
    else if (name === 'upgraded' || name === 'placed') {
      this.cache.radial = null; this.haptics.pulse(1);
      // gain principal en texte qui monte, au-dessus du menu radial resté ouvert
      if (name === 'upgraded' && data.lastGain && !this.simulating) {
        const q = this.toScreen(data.x, data.y), f = el('div', 'up-float', data.lastGain);
        f.style.left = q.x + 'px'; f.style.top = Math.max(110, q.y - 120) + 'px'; $('#screen-game').append(f); setTimeout(() => f.remove(), 1600);
      }
      // première tourelle de ce type posée : petite carte d'info (une seule fois)
      if (name === 'placed' && this.game && this.game.firstOfType && !this.simulating) { const d = this.save.data; d.placedTypes = [...(d.placedTypes || []), data.type]; this.save.persist(); this.towerTip(data.type, data); }
    }
    else if (name === 'coins') this.flyCoins(data);
    else if (name === 'haptic') { if (!this.simulating) this.haptics.pulse(data); }
    else if (name === 'kill') { if (!this.simulating) { this.audio.pop(data); this.showCombo(data); } }
    else if (name === 'chainTier') { if (!this.simulating) this.showCombo(data.n, data); }
    else if (name === 'combo') { this.audio.play('combo'); const s = $('#hud-score'); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
    else if (name === 'intro' && !this.simulating) this.showIntro(data.map((id) => ({ kind: 'enemy', id })));
    else if ((name === 'ability' || name === 'boost') && this.buildDock) { this.cache.dock = null; if (name === 'boost') this.boostPop(data); }
    else if (name === 'drop') { this.cache.dock = null; if (!this.simulating && !data.auto) this.flyDrop(data); }
  }

  // pièces qui s'envolent de l'ennemi vers le compteur : dessinées dans le jeu (passent sous le compteur, dont le
  // chiffre reste lisible), aimantées en moins d'une seconde, regroupées au-delà de HUD_FX.coinCap
  flyCoins({ x, y, n }) {
    const g = this.game; if (this.simulating || !g || this.screen !== 'game') return;
    if (!this._coinTgt) {
      const q = $('#hud-money .coin-ico').getBoundingClientRect(), r = this.canvas.getBoundingClientRect(), v = this.view;
      this._coinTgt = { x: (q.left + q.width / 2 - r.left - v.ox) / v.s, y: (q.top + q.height / 2 - r.top - v.oy) / v.s };
    }
    g.fx.coinTarget = this._coinTgt;
    if (!g.fx.onCoinArrive) g.fx.onCoinArrive = () => {
      const now = performance.now(); if (now - (this._coinSnd || 0) < HUD_FX.coinSound) return;
      this._coinSnd = now; this.audio.play('coin'); this.pop('#hud-money');
    };
    g.fx.coinBurst(x, y, n);
  }
  // bulle de boost ramassée : elle vole jusqu'à son emplacement de la rangée du bas (ou jusqu'à la pile)
  flyDrop(d) {
    const C = BOOSTS[d.id], from = this.toScreen(d.x, d.y);
    requestAnimationFrame(() => {
      if (!this.game || this.screen !== 'game') return;
      this.updateBoosts();
      let tg = $(`#boosts .bo[data-i="${d.i}"]`); if (!tg) return;
      if (tg.closest('.pile-fan')) tg = tg.closest('.pile-wrap').querySelector('.pile');
      const q = tg.getBoundingClientRect(), b = el('div', 'drop-fly', icon(C.icon));
      b.style.setProperty('--bc', C.color); b.style.left = from.x + 'px'; b.style.top = from.y + 'px';
      document.body.append(b); tg.classList.add('incoming');
      const dx = q.left + q.width / 2 - from.x, dy = q.top + q.height / 2 - from.y;
      const land = () => { b.remove(); tg.classList.remove('incoming'); tg.classList.remove('land'); void tg.offsetWidth; tg.classList.add('land'); this.audio.play('card'); this.haptics.pulse(1); };
      if (!b.animate) { land(); return; }
      b.animate([
        { transform: 'translate(-50%,-50%) scale(1)' },
        { transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.1 - 60}px)) scale(1.25)`, offset: 0.35 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.8)` },
      ], { duration: 620, easing: 'cubic-bezier(.45,0,.35,1)' }).onfinish = land;
    });
  }
  pop(sel) { const e = $(sel); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }

  // ------------------------------------------------------------------ menu radial d'un emplacement
  openMenu(slot) {
    const g = this.game; if (!g || g.over) return;
    if (slot !== g.menuSlot) { this.audio.play(slot && !slot.tower ? 'tick' : 'sheet'); if (slot) this.haptics.pulse(0); }
    g.menuSlot = slot; g.selected = slot ? slot.tower : null; g.preview = null; this.armed = null; this.cache.radial = null;
    if (!slot) this.renderRadial();
  }
  // Carte d'info affichée la première fois qu'on pose une tourelle de ce type
  towerTip(type, t) {
    if (this.tutStep >= 0) return;   // le tutoriel guide déjà : pas de carte en plus
    const cfg = TOWERS[type];
    $$('.tower-tip').forEach((e) => e.remove());
    const tip = el('div', 'tower-tip' + (this.toScreen(t.x, t.y).y < innerHeight * 0.45 ? ' low' : ''), `<span class="tt-art"></span><span class="tt-txt"><small>Nouvelle arme</small><b>${cfg.name}</b><span class="tt-d">${cfg.desc}</span></span>`);
    $('.tt-art', tip).append(towerImg(type, 44, this.save.data.skin, 1));
    const close = () => { tip.classList.add('out'); setTimeout(() => tip.remove(), 250); };
    tip.onclick = close; setTimeout(close, 3600);
    $('#screen-game').append(tip);
  }
  closeMenu() { const g = this.game; if (g) { g.menuSlot = null; g.selected = null; g.preview = null; g.fx.dim = null; } this.armed = null; this.cache.radial = null; $('#radial').hidden = true; }
  // Éléments du menu : { key, cls, art, label, price, info, preview, tap (immédiat) ou confirm (2e toucher) }
  toLogical(e) {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    return { x: (e.clientX - r.left - v.ox) / v.s, y: (e.clientY - r.top - v.oy) / v.s, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
  }
  // Rectangle écran d'un point du terrain (pour le tutoriel)
  fieldPoint(x, y) {
    const p = this.toScreen(x, y);
    return { getBoundingClientRect: () => ({ left: p.x, top: p.y, width: 0, height: 0 }) };
  }
  // Point du terrain -> coordonnées écran (px CSS)
  toScreen(x, y) {
    const r = this.canvas.getBoundingClientRect(), v = this.view;
    return { x: r.left + v.ox + x * v.s, y: r.top + v.oy + y * v.s };
  }
  bindGameInput() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => { const g = this.game; if (!g || g.over || e.button === 2) return; this.down = this.toLogical(e); });
    cv.addEventListener('pointerup', (e) => {
      const g = this.game; if (!g || !this.down) return; this.down = null; const p = this.toLogical(e);
      if (g.paused) return;
      const drop = g.dropAt(p.x, p.y); if (drop) { g.collectDrop(drop); return; }   // bulle de boost
      if (this.aiming) { const id = this.aiming; this.aiming = null; this.cache.dock = null; if (p.y > -40 && g.useAbility(id, p.x, p.y)) this.haptics.pulse(2); return; }   // cible d'une capacité
      const slot = g.slotAt(p.x, p.y);
      this.openMenu(slot && slot !== g.menuSlot ? slot : null);
    });
    cv.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openMenu(null); });
    window.addEventListener('pointercancel', () => { this.down = null; });

    $('#btn-wave').addEventListener('click', () => { const g = this.game; if (g && !g.paused && g.startNextWave(true)) this.haptics.pulse(1); });
    $('#btn-speed').addEventListener('click', () => { const g = this.game; if (!g) return; g.speed = (g.speed % 3) + 1; this.save.data.settings.speed = g.speed; this.save.persist(); this.syncSpeed(); this.audio.play('tick'); this.haptics.pulse(0); });
    $('#btn-pause').addEventListener('click', () => this.togglePause());
    $('#btn-mute').addEventListener('click', () => { const s = this.save.data.settings; this.audio.setMuted(!s.muted); this.save.persist(); this.syncMute(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.game && !this.game.over && !this.game.paused && this.screen === 'game') this.togglePause();
      // arrière-plan : musique et effets coupés ; au retour, ils reprennent (ou au prochain toucher sur iOS)
      if (document.hidden) this.audio.pause(); else this.audio.resume();
    });
    window.addEventListener('pagehide', () => this.audio.pause());
  }
  onRotate(rot) {
    if (rot === this.rotated) return;
    this.rotated = rot; this.audio.hold = rot;
    const g = this.game, live = g && !g.over && this.screen === 'game';
    if (rot) {
      if (live && !g.paused) { g.paused = true; this.rotPaused = true; this.closeMenu(); this.aiming = null; }
      this.audio.pause();
    } else {
      // la partie reprend seule si c'est la rotation qui l'avait mise en pause (et pas le menu Pause entre-temps)
      if (this.rotPaused && live && !$('#overlay.show')) g.paused = false;
      this.rotPaused = false;
      if (!document.hidden) this.audio.resume();
      fit(); this.resize();
    }
  }
  onKey(e) {
    const g = this.game; if (!g || this.screen !== 'game' || e.repeat) return;
    if (e.code === 'KeyP') { this.togglePause(); return; }
    if (g.over || g.paused) return;
    const n = parseInt(e.key, 10), btns = $$('#radial .rb');
    if (n >= 1 && n <= btns.length) btns[n - 1].click();
    else if (e.code === 'Space') { e.preventDefault(); g.startNextWave(true); }
    else if (e.code === 'Escape') { if (this.aiming) this.aiming = null; else if (g.menuSlot) this.openMenu(null); else this.togglePause(); }
  }
  // Pause : toujours accessible. Partie finie sans écran de fin (anomalie) : on affiche l'écran de fin de secours.
  togglePause() {
    const g = this.game; if (!g) return;
    if (g.awaitRevive) return;   // offre de réanimation affichée
    if (g.over) { if (!this.endVisible()) this.endFallback(g.result); return; }
    if (this.introOpen) { if ($('#overlay.show .intro')) return; this.introOpen = false; }   // carte de présentation fermée par autre chose
    g.paused = !g.paused;
    if (!g.paused) { this.closeOverlay(); return; }
    this.closeMenu(); this.aiming = null;
    const m = el('div', 'panel glass pause', `<h2 class="win">PAUSE</h2><p class="sub">${this.levelLabel()} · vague ${g.wave}${g.endless ? '' : '/' + g.totalWaves}</p>
      <div class="score-big"><span>Score</span><b>${fmt(g.score)}</b></div>${g.goals ? this.goalList(g.goals, this.save.levelObj(g.level.n), g.goalState()) : ''}`);
    const btns = el('div', 'btns');
    const b1 = el('button', 'btn primary big', icon('play') + 'Reprendre'); b1.onclick = () => this.togglePause();
    const row = el('div', 'btn-row three');
    const b2 = el('button', 'btn ghost', icon('restart') + 'Recommencer'); b2.onclick = () => this.replay();
    const b3 = el('button', 'btn ghost', icon('map') + 'Carte'); b3.onclick = () => this.quitGame('world');
    const b4 = el('button', 'btn ghost', icon('home') + 'Menu'); b4.onclick = () => this.quitGame('menu');
    row.append(b2, b3, b4); btns.append(b1, row);
    m.append(btns, this.switchRow('Son', '', 'sound', 'muted', () => { this.audio.applyVolume(); this.syncMute(); }), this.switchRow('Vibrations', '', 'vibrate', 'haptics', () => this.haptics.pulse(1)));
    this.openOverlay(m);
  }
  // ------------------------------------------------------------------ filets de sécurité
  endVisible() { return !!$('#overlay.show .endseq, #overlay.show .reveal, #overlay.show .es-fallback, #overlay.show .chest-stage'); }
  // Écran de fin minimal, sans animation ni dépendance : utilisé si la séquence normale échoue
  endFallback(r) {
    const g = this.game; if (!g) { this.closeOverlay(); this.show('world'); return; }
    r = r || g.result || {};
    clearTimeout(this.endT); clearTimeout(this.endWatch);
    const win = !!r.victory, nextN = g.level.n + 1, canNext = win && !g.endless && !g.heroic && !g.challenge && nextN <= LEVELS.length;
    const m = el('div', 'panel glass es-fallback', `<h2 class="${win ? 'win' : 'lose'}">${win ? 'VICTOIRE !' : 'DÉFAITE'}</h2><p class="sub"></p>
      <div class="score-big"><span>Score</span><b>${fmt(r.score || g.score || 0)}</b></div><p class="sub">Progression enregistrée.</p>`);
    try { $('.sub', m).textContent = this.levelLabel(g); if (win) m.insertBefore(el('div', '', stars(r.stars || 0, 'stars big')), $('.score-big', m)); } catch (e) { /* affichage minimal */ }
    const btns = el('div', 'btns'), add = (cls, html, fn) => { const b = el('button', 'btn ' + cls, html); b.onclick = fn; btns.append(b); };
    if (r.worldDone != null) add('primary big', icon('chest') + 'Récompense du monde !', () => { this.clearGame(); this.worldReward(r.worldDone); });
    else if (canNext) add('primary big', icon('play') + 'Niveau suivant', () => { this.clearGame(); this.playLevel(nextN); });
    add(canNext || r.worldDone != null ? 'ghost' : 'primary big', icon('restart') + (win ? 'Rejouer' : 'Réessayer'), () => this.replay());
    const row = el('div', 'btn-row');
    const b3 = el('button', 'btn ghost', icon('map') + 'Carte'); b3.onclick = () => this.quitGame('world');
    const b4 = el('button', 'btn ghost', icon('home') + 'Menu'); b4.onclick = () => this.quitGame('menu');
    row.append(b3, b4); btns.append(row); m.append(btns);
    this.openOverlay(m);
  }
  // « Oups, un bug ! » : la progression est sauvegardée, on propose de reprendre ou de revenir au menu
  crash(err, where = '') {
    try { console.error('[Brainrot TD]', where, err); } catch (e) { /* ignore */ }
    const msg = String((err && (err.message || err.reason)) || err || 'erreur inconnue');
    if (/ResizeObserver|AbortError|NotAllowedError|Script error|play\(\) request|The operation was aborted/i.test(msg + ' ' + ((err && err.name) || ''))) return;
    (window.__errors = window.__errors || []).push(`${where} : ${msg}`);
    try { this.save.persist(); } catch (e) { /* ignore */ }
    if (this.crashOpen) return;
    const now = Date.now(); if (now - (this.crashAt || 0) < 4000) { this.crashCount = (this.crashCount || 0) + 1; } else this.crashCount = 1;
    this.crashAt = now; this.crashOpen = true;
    const g = this.game, wasPaused = g ? g.paused : false; if (g && !g.over) g.paused = true;
    const box = el('div', '', `<div class="panel glass"><h2 class="lose">Oups, un bug !</h2><p class="sub">Ta progression est sauvegardée.</p><p class="crash-msg"></p><div class="btns"></div></div>`); box.id = 'crash';
    $('.crash-msg', box).textContent = msg.slice(0, 140);
    const close = () => { box.remove(); this.crashOpen = false; };
    const b1 = el('button', 'btn primary big', icon('play') + 'Reprendre');
    b1.onclick = () => { close(); const cur = this.game; if (cur && cur === g) { if (cur.over) { if (!this.endVisible()) this.endFallback(cur.result); } else cur.paused = wasPaused && !!$('#overlay.show .pause'); } };
    const b2 = el('button', 'btn ghost', icon('home') + 'Retour au menu'); b2.onclick = () => { close(); try { this.quitGame('menu'); } catch (e) { location.reload(); } };
    $('.btns', box).append(...(this.crashCount >= 3 ? [b2] : [b1, b2]));   // erreurs en rafale : seul le retour au menu reste proposé
    $('#app').append(box);
  }

  // ------------------------------------------------------------------ boucle
  resize() {
    if (this.rotated) return;   // en paysage, la mise en page de portrait reste telle quelle derrière l'écran de rotation
    // Le canvas couvre tout l'écran ; la zone jouable (600 x 940) est calée entre le HUD et la barre du bas,
    // à la largeur de l'écran dès que la hauteur le permet. Le décor remplit le reste.
    const st = $('#stage').getBoundingClientRect(), fd = $('#field').getBoundingClientRect();
    if (!st.width || !st.height) return;
    // zone jouable = #field (l'espace flex entre le HUD et la barre du bas), mesurée et non calculée
    const top = Math.max(0, fd.top - st.top), free = Math.max(40, fd.height), bot = Math.max(0, st.bottom - fd.bottom), dpr = Math.min(QUALITY.dpr[this.quality || 0], window.devicePixelRatio || 1);
    const s = Math.min(st.width / VIEW.W, free / VIEW.H);
    const w = Math.round(st.width * dpr), h = Math.round(st.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.view = { s, ox: (st.width - VIEW.W * s) / 2, oy: top + (free - VIEW.H * s) / 2 };   // en px CSS
    const key = [w, h, s, top, bot].join();
    if (this.game && this.game.viewKey !== key) { this.game.viewKey = key; this.game.setView(s * dpr, this.view.ox / s, this.view.oy / s, w, h); }
    this.cache.tut = null; this._coinTgt = null;
  }
  // La boucle se reprogramme AVANT de travailler : une erreur dans une image ne l'arrête jamais.
  loop(ts) {
    requestAnimationFrame((t) => this.loop(t));
    try { this.tick(ts); } catch (e) { this.crash(e, 'boucle'); }
  }
  tick(ts) {
    const raw = (ts - this.last) / 1000 || 0, dt = Math.min(0.1, raw); this.last = ts;
    const g = this.game;
    if (g && this.screen === 'game' && !this.simulating) {
      if (!this.crashOpen) { const t0 = performance.now(); g.frame(dt); this.updateHud(); this.watchQuality(g, raw, performance.now() - t0); }
      if (!g.over && (!this._achT || ts - this._achT > 2000)) { this._achT = ts; try { const s = g.stats; this.announce(this.save.checkAchievements({ kills: s.kills, bossKills: s.bossKills, legendaries: s.legendaries, bestCombo: g.chainBest, maxed: s.maxedTypes || [] })); } catch (e) { /* facultatif */ } }
    }
    else if (this.screen === 'castle') this.tickCastle(ts);
    else if (this.screen === 'menu') this.tickHome(ts);
    // construction du château terminée (temps réel), vérifiée chaque seconde ; jamais pendant une partie
    // (le château d'un niveau ne change pas en cours de route : le chantier se termine au retour au hub)
    if (this.save.data.build && this.screen !== 'game' && (!this._bdT || ts - this._bdT > 1000)) { this._bdT = ts; const id = this.save.checkBuild(); if (id) this.onBuildDone(id); }
    if (this.music.on && ((this._mt = (this._mt || 0) + 1) % 10 === 0)) this.syncMusic();
    if (this.save.saveFailed && !this._sfWarn) { this._sfWarn = true; this.toast('Sauvegarde impossible', 'Le stockage du téléphone est plein ou bloqué : exporte ta progression dans les Paramètres', icon('trash')); }
    if (window.__updateReady && this.screen !== 'game' && !$('#overlay.show')) { window.__updateReady = false; location.reload(); }
  }
  // Qualité automatique (voir QUALITY) : moyenne glissante du temps de calcul et de l'intervalle entre images
  watchQuality(g, dt, work) {
    const q = this.quality || 0;
    if (g.fx.max !== QUALITY.particles[q]) { g.fx.max = QUALITY.particles[q]; g.lowFx = q > 0; }
    if (g.paused || g.over || document.hidden || dt <= 0 || dt >= 0.5 || q >= QUALITY.dpr.length - 1) { this.slowT = 0; return; }
    this.workAvg = (this.workAvg || 0) * 0.95 + work * 0.05; this.gapAvg = (this.gapAvg || 16) * 0.95 + dt * 1000 * 0.05;
    const slow = this.workAvg > QUALITY.slowWork || (this.gapAvg > QUALITY.slowGap && this.workAvg > QUALITY.slowGapWork);
    this.slowT = slow ? (this.slowT || 0) + dt : 0;
    if (this.slowT >= QUALITY.hold) { this.quality = q + 1; this.slowT = 0; this.workAvg = 0; this.gapAvg = 16; this.resize(); }
  }
  set(key, value, fn) { if (this.cache[key] !== value) { this.cache[key] = value; fn(value); } }
  // compteur qui défile vers sa valeur
  roll(key, target, sel) {
    const cur = this.shown[key];
    if (cur === target) return;
    const d = target - cur, step = Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * 0.18));
    this.shown[key] = Math.abs(d) <= Math.abs(step) ? target : cur + step;
    $(sel + ' b').textContent = short(this.shown[key]);
    if (d > 0 && key === 'score' && this.shown[key] === target) this.pop(sel);
  }

  updateHud() {
    const g = this.game;
    this.set('lives', g.lives, (v) => { const e = $('#hud-lives'); $('b', e).textContent = v; if (v < g.maxLives) { e.classList.remove('hurt'); void e.offsetWidth; e.classList.add('hurt'); } });
    this.roll('money', Math.floor(g.money), '#hud-money');
    this.roll('score', g.score, '#hud-score');
    this.set('wave', g.wave, (v) => ($('#hud-wave b').textContent = g.endless ? String(v) : `${v}/${g.totalWaves}`));

    // bouton de vague + aperçu
    const nw = g.nextWave, btn = $('#btn-wave');
    let label;
    if (g.over) label = '';
    else if (!nw) label = '<span class="l">Dernière vague !</span>';
    else if (!g.canStartNext) label = `<span class="l">En cours</span><small>${g.queue.length + g.enemies.length} restants</small>`;
    else {
      const bonus = g.earlyBonus;
      label = `<span class="l">${icon('play')}${g.wave === 0 ? 'Lancer !' : 'Lancer'}</span>`
        + (g.countdown != null && this.save.data.settings.autoWave === false && g.cleared >= g.wave ? (bonus > 0 ? `<small>+${bonus}${coin()}</small>` : '') : g.countdown != null ? `<small>Auto ${Math.ceil(g.countdown)} s${bonus > 0 ? ` · +${bonus}${coin()}` : ''}</small>` : bonus > 0 ? `<small>Bonus +${bonus}${coin()}</small>` : '');
    }
    this.set('waveLabel', label, (v) => { btn.innerHTML = v; btn.style.visibility = v ? '' : 'hidden'; btn.disabled = !g.canStartNext; btn.classList.toggle('ready', g.canStartNext); btn.classList.toggle('busy', !g.canStartNext); });
    // aperçu de la vague suivante : « Vague N » + icônes des types (3 max, puis « +N »), badge BOSS ; pas de nombres
    this.set('preview', g.over || !nw ? 0 : nw.n, (n) => {
      const box = $('#wave-preview'); box.innerHTML = ''; if (!n) return;
      const sum = waveSummary(nw), seen = this.save.data.seen.enemies;
      const types = Object.keys(sum).filter((t) => !ENEMIES[t].boss), boss = Object.keys(sum).find((t) => ENEMIES[t].boss);
      // les nouveautés d'abord, puis les plus nombreux
      types.sort((a, b) => (seen.includes(a) - seen.includes(b)) || sum[b] - sum[a]);
      const icons = el('span', 'wp-icons');
      for (const t of types.slice(0, boss ? 2 : 3)) { const w = el('span', 'wp' + (seen.includes(t) ? '' : ' new')); w.append(enemyImg(t, 26)); icons.append(w); }
      const more = types.length - (boss ? 2 : 3); if (more > 0) icons.append(el('span', 'wp-more', '+' + more));
      if (boss) { const w = el('span', 'wp boss'); w.append(enemyImg(boss, 26), el('b', '', ENEMIES[boss].mini || nw.mini ? 'MINI' : 'BOSS')); icons.append(w); }
      box.append(el('span', 'lbl', `Vague ${n}`), icons);
    });
    this.updateGoals();
    this.updateRadial();
    if (this.updateDock) this.updateDock();
    this.updateTutorial();
  }

  // Objectifs d'étoiles en partie : 3 pastilles sous le HUD (tenu / raté), avec le compteur du 3e objectif
  updateGoals() {
    const g = this.game, box = $('#goals');
    if (!g.goals || (this.tutStep >= 0 && g.level.n === 1)) { if (!box.hidden) box.hidden = true; return; }
    const st = g.goalState(), g3 = g.goals[2];
    const left = g3.id === 'time' ? Math.max(0, Math.ceil(g3.n - g.time)) : 0;
    const txt = g3.id === 'towers' ? `${g.towers.filter((t) => t.type !== 'mine').length}/${g3.n}` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const key = st.join() + txt + g.over;
    this.set('goals', key, () => {
      box.hidden = g.over;
      // un toucher sur une pastille rappelle l'objectif en clair
      if (!box._tap) { box._tap = true; box.addEventListener('click', (e) => { const q = e.target.closest('.gl'), gg = this.game; if (!q || !gg || !gg.goals) return; const i = +q.dataset.i, ok = gg.goalState()[i]; this.toast(gg.goals[i].text, ok ? 'En bonne voie' : 'Étoile manquée pour cette partie', icon('star')); this.audio.play('tick'); }); }
      box.innerHTML = `<span class="gl ${st[1] ? 'on' : 'off'}" data-i="1">${icon('star')}${icon('heart')}</span><span class="gl ${st[2] ? 'on' : 'off'}${g3.id === 'time' && st[2] && left <= 20 ? ' hurry' : ''}" data-i="2">${icon('star')}${icon(g3.id === 'towers' ? 'cannon' : 'hourglass')}<b>${txt}</b></span>`;
    });
    // objectif perdu : petit message, une seule fois
    for (const i of [1, 2]) if (!st[i] && !g['_goalLost' + i] && !g.over) { g['_goalLost' + i] = true; this.toast('Étoile manquée', g.goals[i].text, icon('star')); }
  }
  // liste des objectifs (fiche de niveau, pause, fin) : done = déjà obtenus, now = état de la partie en cours
  goalList(goals, done = [], now = null) {
    return `<div class="goal-list">${goals.map((q, i) => `<div class="${done[i] ? 'got' : ''}${now && !now[i] ? ' lost' : ''}">${icon('star', done[i] ? 'on' : '')}<span>${q.text}</span>${done[i] ? icon('check') : ''}</div>`).join('')}</div>`;
  }

  // ------------------------------------------------------------------ tutoriel : bulles fléchées
  updateTutorial() {
    const box = $('#tutorial'), g = this.game;
    if (this.tutStep < 0) { if (!box.hidden) box.hidden = true; return; }
    let step = TUTORIAL[this.tutStep];
    while (step && step.done(g, this)) { this.tutStep++; step = TUTORIAL[this.tutStep]; this.cache.tut = null; }
    if (!step) { this.endTutorial(); return; }
    const hide = g.paused || g.over || (step.wait && step.wait(g)) || (!!g.menuSlot && !step.keep);
    const target = hide ? null : step.target(this);
    if (!target) { box.hidden = true; this.cache.tut = null; return; }
    const r = target.getBoundingClientRect(), key = `${this.tutStep}|${Math.round(r.left)}|${Math.round(r.top)}`;
    if (this.cache.tut === key) return; this.cache.tut = key;
    box.hidden = false; box.innerHTML = `<span>${step.text}</span>`;
    const skip = el('button', '', 'Passer'); skip.onclick = () => this.endTutorial(); box.append(skip);
    const ring = el('i', 'tut-ring'); box.append(ring);
    // bulle collée à sa cible (au-dessus, sinon au-dessous), jamais sur le HUD, les objectifs, un panneau ouvert
    // ou la carte d'une nouvelle arme ; une petite flèche la relie à la cible
    const sg = $('#screen-game').getBoundingClientRect(), hudB = $('#hud').getBoundingClientRect().bottom, inDock = !!target.closest && !!target.closest('#dock');
    box.style.left = '0px'; box.style.top = '0px'; box.className = 'placed';
    const bw = box.offsetWidth, bh = box.offsetHeight, cx = r.left + r.width / 2, rr = Math.max(r.width, r.height) / 2 + 14;
    const avoid = $$('#radial .upp, #radial .info, .tower-tip, #goals:not([hidden]), #radial .rb, #radial .rb .lab, #radial .rb .price').map((e) => e.getBoundingClientRect()).filter((q) => q.width);
    const x = Math.max(sg.left + 10, Math.min(sg.right - bw - 10, cx - bw / 2)), low = inDock ? sg.bottom : $('#dock').getBoundingClientRect().top;
    // cible dans le menu de pose : la bulle se place au-dessus ou au-dessous de TOUT le menu (à l'opposé du cercle)
    if (g.menuSlot) { const q = this.toScreen(g.menuSlot.x, g.menuSlot.y), m = 34; avoid.push({ left: q.x - m, right: q.x + m, top: q.y - m, bottom: q.y + m }); }   // l'emplacement touché reste visible
    const inMenu = !!target.closest && !!target.closest('#radial'), mb = inMenu ? $$('#radial .rb, #radial .rb .lab, #radial .rb .price').map((e) => e.getBoundingClientRect()).reduce((m, q) => ({ t: Math.min(m.t, q.top), b: Math.max(m.b, q.bottom) }), { t: 1e9, b: -1e9 }) : null;
    const cands = (inMenu ? [['up', mb.t - 14 - bh], ['down', mb.b + 14]] : [['up', r.top + r.height / 2 - rr - 12 - bh], ['down', r.top + r.height / 2 + rr + 12]]).map(([side, y]) => {
      let score = y < hudB + 4 || y + bh > low - 4 ? 1000 : 0;
      for (const q of avoid) if (x < q.right && x + bw > q.left && y < q.bottom && y + bh > q.top) score += 500;
      return { side, y, score: score + (side === 'up' ? 0 : 1) };
    }).sort((a, b) => a.score - b.score);
    const c = cands[0];
    box.classList.add(c.side === 'up' ? 'above' : 'below');
    box.style.left = x - sg.left + 'px'; box.style.top = c.y - sg.top + 'px';
    box.style.setProperty('--ax', Math.max(22, Math.min(bw - 22, cx - x)) + 'px');
    const host = box.getBoundingClientRect();
    ring.style.left = r.left + r.width / 2 - host.left + 'px'; ring.style.top = r.top + r.height / 2 - host.top + 'px';
    const round = Math.abs(r.width - r.height) < 12, rw = round ? Math.max(58, Math.min(110, Math.max(r.width, r.height) + 16)) : r.width + 14, rh = round ? rw : r.height + 14;
    Object.assign(ring.style, { width: rw + 'px', height: rh + 'px', margin: `${-rh / 2}px 0 0 ${-rw / 2}px`, borderRadius: round ? '50%' : Math.min(rh / 2, 22) + 'px' });
  }
  endTutorial() { this.tutStep = -1; $('#tutorial').hidden = true; this.save.data.settings.tutorialDone = true; this.save.persist(); }

  // ------------------------------------------------------------------ fin de partie
  countUp(node, to, dur = 1400) {
    const t0 = performance.now(); let lastTick = 0;
    const f = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt(to * e);
      if (now - lastTick > 55 && k < 1) { lastTick = now; this.audio.play('tick'); }
      if (k < 1 && node.isConnected) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  // Image de score générée à l'avance (navigator.share doit partir directement du toucher)
  prepareShare(r) {
    const g = this.game, c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const x = c.getContext('2d'), F = (px) => `700 ${px}px Fredoka, ui-rounded, system-ui, sans-serif`;
    const bg = x.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#4a348a'); bg.addColorStop(1, '#1c1530'); x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350);
    for (const [cx, cy, col] of [[120, 160, '#ff5d8f'], [980, 420, '#5c9df2'], [140, 1180, '#3fd873'], [960, 1120, '#ffb224']]) { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, 420); rg.addColorStop(0, col + '88'); rg.addColorStop(1, col + '00'); x.fillStyle = rg; x.fillRect(0, 0, 1080, 1350); }
    const text = (t, y, px, col, lw = 22) => { x.font = F(px); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = '#3d2c4e'; x.strokeText(t, 540, y); x.fillStyle = col; x.fillText(t, 540, y); };
    text('BRAINROT', 170, 150, '#ffd23f', 30); text('BASTION', 300, 150, '#ff5d8f', 30);
    text(this.levelLabel(g), 430, 46, '#fff', 14);
    text(r.victory ? 'VICTOIRE !' : `Vague ${r.wavesDone}`, 520, 70, r.victory ? '#8dffae' : '#ffb3c4', 16);
    text(fmt(r.score), 700, 210, '#fff', 34); text('POINTS', 840, 54, '#c5b5dc', 12);
    if (r.victory) for (let i = 0; i < 3; i++) { x.save(); x.translate(400 + i * 140, 950); x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? 26 : 58; x.lineTo(Math.cos(a) * q, Math.sin(a) * q); } x.closePath(); x.lineWidth = 12; x.strokeStyle = '#3d2c4e'; x.stroke(); x.fillStyle = i < r.stars ? '#ffd23f' : 'rgba(255,255,255,.2)'; x.fill(); x.restore(); }
    if (r.record) text('NOUVEAU RECORD !', 1040, 56, '#ffd23f', 14);
    const draw = (cv, cx, cy, size) => { if (cv) x.drawImage(cv, cx - size / 2, cy - size / 2, size, size); };
    ['basic', 'tank', 'armored', 'healer'].forEach((t, i) => draw(enemyFrames(t).frames[0][0].cv, 150 + i * 140, 1190, 180));
    const best = r.best || { type: 'assault', level: 1, branch: null };
    const bs = towerSprite(best.type, best.level, best.branch, skinFinish(this.save.data.skin));
    if (bs.base) draw(bs.base.cv, 900, 1180, 330); draw(bs.head.cv, 900, 1180, 330);
    text(location.host + location.pathname.replace(/index\.html$/, ''), 1300, 34, '#c5b5dc', 8);
    this.shareFile = null;
    // le canvas (6 Mo) est libéré dès que le fichier est prêt
    c.toBlob((b) => { if (b) this.shareFile = new File([b], 'brainrot-bastion-score.png', { type: 'image/png' }); c.width = c.height = 0; }, 'image/png');
  }
  async shareScore(r) {
    const g = this.game, url = location.origin + location.pathname;
    const text = `J'ai marqué ${fmt(r.score)} points sur Brainrot TD (${this.levelLabel(g)}) ! Tu fais mieux ?`;
    try {
      if (this.shareFile && navigator.canShare && navigator.canShare({ files: [this.shareFile] })) { await navigator.share({ files: [this.shareFile], title: 'Brainrot TD', text: text + ' ' + url }); return; }
      if (navigator.share) { await navigator.share({ title: 'Brainrot TD', text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (this.shareFile) { const a = document.createElement('a'); a.href = URL.createObjectURL(this.shareFile); a.download = this.shareFile.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    try { await navigator.clipboard.writeText(text + ' ' + url); this.toast('Image enregistrée', 'Texte et lien copiés dans le presse-papier', icon('share')); }
    catch (e) { this.toast('Image du score enregistrée', '', icon('share')); }
  }
}
Object.assign(UI.prototype, Meta, Hub, Loot, End, Talents, Collection, BoostUI, Daily, Reveal, Radial, Rebirth);
