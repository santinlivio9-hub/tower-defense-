// Mode admin (développeur) : console cachée pour tester tout le jeu, inspirée du « Command Deck » de Chibi Arsenal.
// Accès : 7 tapes rapides sur le logo de l'accueil, puis code PIN (config.js : ADMIN_PIN). Le PIN est vérifié dans le
// navigateur : il protège des curieux, pas de quelqu'un qui lit le code.
// SAUVEGARDE SÉPARÉE : en mode admin, le jeu travaille sur une copie (voir save.js : enterAdmin / exitAdmin). La vraie
// sauvegarde n'est jamais réécrite ; « Revenir à ma vraie partie » efface la copie et la recharge intacte.
// Aucun achat réel : en mode admin, la monétisation passe toujours par la simulation (monetization.js).
import { ADMIN_ENABLED, ADMIN_PIN, ADMIN, LEVELS, WORLDS, ENEMIES, TOWERS, TOWER_ORDER, CASTLE, TALENTS, BOOSTS, BOOST_ORDER, CHESTS, SHOP, PASS, PROFILE, REBIRTH, ACHIEVEMENTS, XP } from './config.js';
import { adminActive, enterAdmin, exitAdmin, adminClock, setAdminClock } from './save.js';
import { enemySvg } from './sprites.js';
import { icon, coin, gem } from './icons.js';
import { openDebug, closeDebug, debugOpen } from './viewport.js';
import { forceMech } from './mechanics.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const fr = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const svgUrl = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const TABS = [['prog', 'Progression', 'map'], ['best', 'Bestiaire', 'skull'], ['game', 'Partie', 'play'], ['tools', 'Outils', 'wrench']];
// capacités spéciales des brainrots (clés de config.js -> texte)
const SPECIAL = {
  armor: (v) => `Blindage ${v} (réduit chaque coup)`, flying: () => 'Volant (ignore le sol, cibles anti-air)', stealth: () => 'Invisible (révélé par les tourelles de détection)',
  split: (v) => `Se divise en ${v.count || 2} ${ENEMIES[v.type] ? ENEMIES[v.type].name : v.type} à sa mort`, heal: (v) => `Soigne ses voisins (${v.amount || ''} PV, rayon ${v.radius || ''})`,
  chill: (v) => `Aura glacée : ralentit les tourelles proches (rayon ${v.radius})`, regen: (v) => `Régénère ${v} PV/s`, shield: () => 'Bouclier', dash: () => 'Fonce par à-coups',
  camo: () => 'Camouflage', jump: () => 'Saute des portions du chemin', disable: () => 'Désactive les tourelles proches',
};
const ABILITY = { summon: (a) => `Invoque ${a.count} ${ENEMIES[a.type] ? ENEMIES[a.type].name : a.type} toutes les ${a.every} s`, heal: (a) => `Se soigne toutes les ${a.every} s`, shield: (a) => `Bouclier toutes les ${a.every} s`,
  dash: (a) => `Accélère toutes les ${a.every} s`, stun: (a) => `Étourdit les tourelles toutes les ${a.every} s`, disable: (a) => `Coupe des tourelles toutes les ${a.every} s` };

let deck = null;
export function adminDeck(ui) { if (!deck) deck = new AdminDeck(ui); return deck; }

class AdminDeck {
  constructor(ui) {
    this.ui = ui; this.save = ui.save; this.tab = 'prog'; this.isOpen = false;
    this.flags = { infMoney: false, god: false, holdSpawn: false, adminFree: false, speed: 1, draw: false, fps: false };
    this.pick = 'basic'; this.rank = this.save.rank ? this.save.rank() : 0; this.qty = 5; this.hpMul = 1;
    this.g = null; this.frames = []; this.fpsBox = null;
  }
  get d() { return this.ui.save.data; }
  get game() { const g = this.ui.game; return g && this.ui.screen === 'game' && !g.over ? g : null; }

  // ------------------------------------------------------------------ accès
  gesture() { if (!ADMIN_ENABLED) return; if (adminActive) this.open(); else this.openPin(); }
  boot() {
    this.ui.admin = this;
    const b = el('button', '', 'ADMIN'); b.id = 'adm-badge'; b.setAttribute('aria-label', 'Console admin'); b.onclick = () => this.open();
    document.body.append(b);
    let again = false; try { again = sessionStorage.getItem('brainrot-admin-open') === '1'; sessionStorage.removeItem('brainrot-admin-open'); } catch (e) { /* ignore */ }
    if (again) setTimeout(() => this.open(), 450);
  }
  openPin() {
    if ($('#adm-pin')) return;
    let pin = '';
    const ov = el('div', 'adm-pin-ov'); ov.id = 'adm-pin';
    const box = el('div', 'adm-pin', `<div class="adm-lock">${icon('lock')}</div><h3>Code d'accès</h3><p>Console développeur</p><div class="pin-dots">${'<i></i>'.repeat(6)}</div><div class="pin-pad"></div><button class="btn sm ghost pin-x">Annuler</button>`);
    const pad = $('.pin-pad', box), dots = [...box.querySelectorAll('.pin-dots i')];
    const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const key = (k) => {
      if (k === 'del') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k;
      this.ui.haptics.pulse(0); draw();
      if (pin.length < 6) return;
      if (pin === ADMIN_PIN) { setTimeout(() => { if (adminActive) { ov.remove(); this.open(); } else this.confirmEnter(box, ov); }, 150); return; }
      box.classList.remove('wrong'); void box.offsetWidth; box.classList.add('wrong'); this.ui.audio.play('error'); this.ui.haptics.pulse(1);
      setTimeout(() => { pin = ''; draw(); }, 400);
    };
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']) {
      const b = el('button', k ? 'pk' : 'pk blank', k === 'del' ? icon('back') : k); if (k) b.onclick = () => key(k); else b.disabled = true;
      if (k === 'del') b.setAttribute('aria-label', 'Effacer');
      pad.append(b);
    }
    $('.pin-x', box).onclick = () => ov.remove();
    ov.append(box); document.body.append(ov);
  }
  confirmEnter(box, ov) {
    box.className = 'adm-pin enter';
    box.innerHTML = `<div class="adm-lock ok">${icon('wrench')}</div><h3>Mode admin</h3><p class="adm-p">Le jeu va redémarrer sur une <b>copie</b> de ta sauvegarde. Tout ce que tu fais en admin reste dans cette copie.</p><p class="adm-p">Ta vraie partie n'est pas touchée : le bouton <b>« Revenir à ma vraie partie »</b> la recharge intacte.</p>`;
    const go = el('button', 'btn primary', icon('play') + 'Entrer en mode admin'), no = el('button', 'btn sm ghost', 'Annuler');
    go.onclick = () => {
      if (this.ui.game) this.ui.clearGame();   // la partie en cours est écrite dans la VRAIE sauvegarde avant de passer en admin
      this.save.persist();
      if (!enterAdmin()) { this.ui.toast('Mode admin indisponible', 'Stockage du navigateur inaccessible', icon('lock')); return; }
      try { sessionStorage.setItem('brainrot-admin-open', '1'); } catch (e) { /* ignore */ }
      this.save.persist = () => true;   // plus aucune écriture de cette page avant le redémarrage
      location.reload();
    };
    no.onclick = () => ov.remove();
    box.append(go, no);
  }

  // ------------------------------------------------------------------ fenêtre
  open() {
    if (!adminActive) return;
    const g = this.ui.game;
    this.wasPaused = g ? g.paused : null; if (g && !g.over) g.paused = true;
    this.tower = g ? g.selected || (g.menuSlot && g.menuSlot.tower) || null : null;
    if (g) this.ui.closeMenu();
    if (!this.root) this.build();
    this.root.hidden = false; this.root.classList.remove('out'); void this.root.offsetWidth; this.root.classList.add('in');
    this.isOpen = true; this.render();
  }
  close() {
    if (!this.root || !this.isOpen) return;
    this.isOpen = false; this.stopPreview();
    this.root.classList.remove('in'); this.root.classList.add('out');
    setTimeout(() => { if (!this.isOpen) this.root.hidden = true; }, 200);
    const g = this.ui.game; if (g && !g.over && this.wasPaused === false && !g.awaitRevive) g.paused = false;
    this.ui.refreshWallet(); if (this.ui.screen !== 'game') this.ui.show(this.ui.screen, true);
  }
  build() {
    const root = el('div', 'adm'); root.id = 'adm-deck'; root.hidden = true;
    root.innerHTML = `<div class="adm-head"><i class="adm-grip"></i><div class="adm-title"><b>Console admin</b><small>Copie de test · ta vraie partie est à l'abri</small></div><button class="icon-btn adm-x" aria-label="Fermer">${icon('close')}</button></div>
      <nav class="adm-tabs"></nav><div class="adm-status" aria-live="polite"></div><div class="adm-body"></div>`;
    const tabs = $('.adm-tabs', root);
    for (const [id, name, ic] of TABS) { const b = el('button', 'adm-tab', `${icon(ic)}<span>${name}</span>`); b.dataset.tab = id; b.onclick = () => { this.tab = id; this.ui.audio.play('tick'); this.render(); }; tabs.append(b); }
    $('.adm-x', root).onclick = () => this.close();
    // fermeture en glissant l'en-tête vers le bas
    const head = $('.adm-head', root); let y0 = null, dy = 0;
    head.addEventListener('pointerdown', (e) => { if (e.target.closest('.adm-x')) return; y0 = e.clientY; dy = 0; root.style.transition = 'none'; head.setPointerCapture(e.pointerId); });
    head.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); root.style.transform = `translateY(${dy}px)`; });
    const up = () => { if (y0 == null) return; y0 = null; root.style.transition = ''; root.style.transform = ''; if (dy > 90) this.close(); };
    head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
    document.body.append(root); this.root = root; this.body = $('.adm-body', root);
  }
  render() {
    const R = this.root; if (!R) return;
    for (const b of R.querySelectorAll('.adm-tab')) b.classList.toggle('on', b.dataset.tab === this.tab);
    const top = this.body.scrollTop, same = this._tab === this.tab; this._tab = this.tab;
    this.stopPreview(); this.body.innerHTML = '';
    this['tab_' + this.tab]();
    if (same) this.body.scrollTop = top;
  }
  // message bref en haut de la console ; la copie est écrite
  ok(msg) {
    this.save.persist(); this.ui.refreshWallet(); this.ui.audio.play('tick'); this.ui.haptics.pulse(0);
    const s = $('.adm-status', this.root); s.textContent = msg; s.classList.remove('show'); void s.offsetWidth; s.classList.add('show');
    clearTimeout(this._st); this._st = setTimeout(() => s.classList.remove('show'), 1900);
  }

  // ------------------------------------------------------------------ petits composants
  sec(title, sub = '') { const s = el('section', 'adm-sec', `<h4>${title}</h4>${sub ? `<p class="adm-sub">${sub}</p>` : ''}`); this.body.append(s); return s; }
  row(sec, label, ...nodes) { const r = el('div', 'adm-row'); if (label != null) { const l = el('span', 'adm-l'); l.innerHTML = label; r.append(l); } const c = el('div', 'adm-c'); c.append(...nodes.filter(Boolean)); r.append(c); sec.append(r); return r; }
  btn(label, fn, cls = 'ghost') {
    const b = el('button', 'btn sm ' + cls, label);
    b.onclick = () => { try { fn(b); } catch (e) { console.error(e); this.ok('Erreur : ' + e.message); } };
    return b;
  }
  btns(sec, list) { const w = el('div', 'adm-btns'); for (const [l, f, c] of list) w.append(this.btn(l, f, c)); sec.append(w); return w; }
  num(v, min = 0, max = 1e9, w = 92) { const i = el('input', 'adm-in'); i.type = 'number'; i.inputMode = 'numeric'; i.min = min; i.max = max; i.value = v; i.style.width = w + 'px'; return i; }
  val(i, min = 0, max = 1e9) { const n = Math.floor(+i.value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
  sel(opts, v, fn) { const s = el('select', 'adm-sel'); for (const [k, l] of opts) s.add(new Option(l, k)); s.value = String(v); if (fn) s.onchange = () => fn(s.value); return s; }
  tog(sec, label, on, fn, sub = '') {
    const sw = el('button', 'switch' + (on ? ' on' : '')); sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', on);
    sw.onclick = () => { const v = !sw.classList.contains('on'); sw.classList.toggle('on', v); sw.setAttribute('aria-checked', v); fn(v); };
    return this.row(sec, label + (sub ? `<small>${sub}</small>` : ''), sw);
  }
  stepper(sec, label, get, set, max) {
    const v = el('b', 'adm-v'), up = () => { v.textContent = get() + ' / ' + max; };
    const m = this.btn('−', () => { set(Math.max(0, get() - 1)); up(); this.ok(label.replace(/<[^>]+>/g, '') + ' : ' + get()); }), p = this.btn('+', () => { set(Math.min(max, get() + 1)); up(); this.ok(label.replace(/<[^>]+>/g, '') + ' : ' + get()); });
    m.classList.add('sq'); p.classList.add('sq'); up();
    return this.row(sec, label, m, v, p);
  }
  needGame(sec) {
    if (this.game) return false;
    sec.append(el('p', 'adm-note', `${icon('lock')}Disponible pendant une partie.`));
    const n = this.ui.nextLevel ? this.ui.nextLevel() : LEVELS[0];
    this.btns(sec, [[icon('play') + `Lancer le niveau ${n.id}`, () => { this.close(); this.ui.startGame(n.n, false, false, []); }, 'primary']]);
    return true;
  }

  // ================================================================== PROGRESSION
  tab_prog() {
    const d = this.d, sv = this.save;
    // ---- campagne
    let s = this.sec('Campagne', `${LEVELS.length} niveaux sur ${WORLDS.length} mondes, défis héroïques et mode infini.`);
    const st = this.sel([[0, '0 étoile'], [1, '1 étoile'], [2, '2 étoiles'], [3, '3 étoiles']], 3), hero = el('button', 'switch on');
    hero.onclick = () => hero.classList.toggle('on');
    this.row(s, 'Étoiles partout', st);
    this.row(s, 'Héroïques réussis', hero);
    this.btns(s, [[icon('check') + 'Débloquer tous les niveaux', () => { this.unlockAll(+st.value, hero.classList.contains('on')); this.ok(`Campagne débloquée · ${st.value} étoile(s) partout`); }, 'green']]);
    // ---- aller à un niveau
    s = this.sec('Jouer un niveau');
    const wsel = this.sel(WORLDS.map((w, i) => [i, `Monde ${i + 1} · ${w.name}`]), this._w || 0);
    const lsel = el('select', 'adm-sel');
    const fill = () => { this._w = +wsel.value; lsel.innerHTML = ''; for (const L of LEVELS.filter((x) => x.world === +wsel.value)) lsel.add(new Option(`${L.id}${L.boss ? ' · BOSS' : ''}`, L.n)); };
    wsel.onchange = fill; fill();
    this.row(s, 'Monde', wsel); this.row(s, 'Niveau', lsel);
    const go = (heroic, endless) => { const n = +lsel.value; d.adminOpen = true; this.save.persist(); this.close(); this.ui.startGame(n, heroic, endless, []); };
    this.btns(s, [[icon('play') + 'Normal', () => go(false, false), 'primary'], [icon('crown') + 'Héroïque', () => go(true, false)], [icon('infinity') + 'Infini', () => go(false, true)]]);
    // ---- joueur
    s = this.sec('Joueur', `Niveau ${d.level} · ${fmt(d.xp)} / ${fmt(XP.need(d.level))} XP · ${d.talentPts} point(s) de talent · rang ${ROMAN[sv.rank()] || sv.rank()}`);
    const lv = this.num(d.level, 1, 200, 76), xp = this.num(100, 0, 1e7), tp = this.num(d.talentPts, 0, 999, 76), rk = this.num(sv.rank(), 0, 10, 76);
    this.row(s, 'Niveau de joueur', lv, this.btn('Fixer', () => { d.level = this.val(lv, 1, 200); d.xp = 0; this.ok('Niveau de joueur ' + d.level); this.render(); }));
    this.row(s, 'Ajouter de l\'XP', xp, this.btn('Ajouter', () => { const ups = sv.addXp(this.val(xp, 0, 1e7)); this.ok(`+${fmt(this.val(xp))} XP${ups.length ? ` · ${ups.length} niveau(x) gagné(s)` : ''}`); this.render(); }));
    this.row(s, 'Points de talent', tp, this.btn('Fixer', () => { d.talentPts = this.val(tp, 0, 999); this.ok('Points de talent : ' + d.talentPts); this.render(); }));
    this.row(s, 'Rang de Renaissance', rk, this.btn('Fixer', () => { d.rebirth.rank = this.val(rk, 0, 10); this.rank = d.rebirth.rank; this.ok('Rang de Renaissance ' + (ROMAN[d.rebirth.rank] || d.rebirth.rank)); this.render(); }));
    // ---- talents
    s = this.sec('Talents');
    this.btns(s, [['Tout maxer', () => { for (const b of Object.values(TALENTS)) for (const n of b.nodes) d.talents[n.id] = n.max; this.ok('Talents au maximum'); this.render(); }, 'green'],
      ['Tout à zéro', () => { d.talents = {}; this.ok('Talents remis à zéro'); this.render(); }, 'red']]);
    for (const [bid, b] of Object.entries(TALENTS)) for (const n of b.nodes) this.stepper(s, `${n.name}<small>${b.name || bid}</small>`, () => d.talents[n.id] || 0, (v) => { d.talents[n.id] = v; }, n.max);
    // ---- château et capacités
    s = this.sec('Château et capacités', d.build ? `Construction en cours : ${sv.castleDef(d.build.id).name}` : 'Aucune construction en cours');
    const all = { ...CASTLE.upgrades, ...CASTLE.abilities };
    this.btns(s, [['Tout maxer', () => { for (const [id, c] of Object.entries(all)) d.castle[id] = c.costs.length; d.build = null; sv.syncTierCap(); this.ok('Château et capacités au maximum'); this.render(); }, 'green'],
      ['Tout à zéro', () => { for (const id of Object.keys(all)) d.castle[id] = 0; d.build = null; this.ok('Château remis à zéro'); this.render(); }, 'red'],
      ['Terminer la construction', () => { if (!d.build) { this.ok('Aucune construction en cours'); return; } d.build.end = Date.now(); const id = sv.checkBuild(); this.ok('Construction terminée' + (id ? ' : ' + sv.castleDef(id).name : '')); this.render(); }]]);
    for (const [id, c] of Object.entries(all)) this.stepper(s, `${c.name}<small>${CASTLE.abilities[id] ? 'Capacité' : 'Amélioration'}</small>`, () => d.castle[id] || 0, (v) => { d.castle[id] = v; }, c.costs.length);
    // ---- déblocages
    s = this.sec('Débloquer');
    this.btns(s, [
      ['Toutes les tourelles', () => { d.towers = [...TOWER_ORDER]; d.seen.towers = [...new Set([...d.seen.towers, ...TOWER_ORDER])]; this.ok(`${TOWER_ORDER.length} tourelles débloquées`); }],
      ['Branches légendaires', () => { d.adminOpen = true; for (const it of REBIRTH.shop) if (it.kind === 'mk2' && !d.rebirth.owned.includes(it.id)) d.rebirth.owned.push(it.id); this.ok('Branches et Mk II débloquées'); }],
      ['Tous les skins', () => { d.skins = SHOP.skins.map((k) => k.id); this.ok(`${d.skins.length} skins débloqués`); }],
      ['Cosmétiques de profil', () => { const P = d.profile; P.frames = Object.keys(PROFILE.frames); P.titles = Object.keys(PROFILE.titles); P.fxs = Object.keys(PROFILE.fx); this.ok('Cadres, titres et effets débloqués'); }],
      ['Boutique de Renaissance', () => { d.rebirth.owned = REBIRTH.shop.map((x) => x.id); this.ok('Boutique de Renaissance entièrement achetée'); }],
      ['Collection complète', () => { d.seen.enemies = Object.keys(ENEMIES); d.seen.towers = [...TOWER_ORDER]; this.ok('Collection complète'); }],
      ['Tous les succès', () => { const keys = ACHIEVEMENTS.flatMap((a) => a.tiers.map((t, i) => a.id + ':' + i)); d.ach.claimed = [...keys]; d.ach.seen = [...keys]; this.ok(`${keys.length} étapes de succès débloquées`); }],
      ['Pass : tous les paliers', () => { sv.seasonTick(); d.pass.pts = PASS.tiers * PASS.perTier; d.pass.premium = true; this.ok(`Pass : ${PASS.tiers} paliers atteints, gratuit et premium (à récupérer)`); }],
    ]);
    const cq = this.num(3, 0, 999, 70), ck = this.sel(Object.entries(CHESTS).map(([k, c]) => [k, c.name]), 'gold');
    this.row(s, 'Coffres', ck, cq, this.btn('Fixer', () => { d.chests[ck.value] = this.val(cq, 0, 999); this.ok(`${CHESTS[ck.value].name} : ${d.chests[ck.value]}`); }));
    const bq = this.num(10, 0, 999, 70), bk = this.sel([['all', 'Tous les boosts'], ...BOOST_ORDER.map((k) => [k, BOOSTS[k].name])], 'all');
    this.row(s, 'Boosts', bk, bq, this.btn('Fixer', () => { const n = this.val(bq, 0, 999); for (const k of bk.value === 'all' ? BOOST_ORDER : [bk.value]) d.boosts[k] = n; this.ok(`Boosts : ${n} ${bk.value === 'all' ? 'de chaque' : BOOSTS[bk.value].name}`); }));
    // ---- monnaies
    s = this.sec('Monnaies');
    const money = (label, get, set, steps, art) => {
      const i = this.num(get(), 0, 1e9, 104);
      this.row(s, art + label, i, this.btn('Fixer', () => { set(this.val(i)); i.value = get(); this.ok(`${label} = ${fmt(get())}`); }));
      this.btns(s, steps.map((n) => ['+' + fmt(n), () => { set(get() + n); i.value = get(); this.ok(`${label} = ${fmt(get())}`); }]));
    };
    money('Pièces', () => d.coins, (v) => { d.coins = v; }, [1000, 10000, 100000], coin());
    money('Gemmes', () => d.gems, (v) => { d.gems = v; }, [100, 1000, 10000], gem());
    money('Éclats', () => d.rebirth.shards, (v) => { d.rebirth.shards = v; }, [50, 500, 5000], icon('shard'));
    // ---- quotidien et horloge
    s = this.sec('Quotidien et horloge', `Horloge du jeu : ${new Date().toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${adminClock.off ? ` · avance de ${fr(adminClock.off / 3600000)} h` : ''}`);
    const D = d.daily;
    this.btns(s, [
      ['Cadeau du jour', () => { D.calDay = ''; D.popped = ''; this.ok('Cadeau du jour à nouveau disponible'); }],
      ['Roue', () => { D.wheelAt = 0; D.wheel = ''; this.ok('Tour de roue gratuit disponible'); }],
      ['Quêtes', () => { D.day = ''; D.week = ''; sv.dailyTick(); this.ok('Nouvelles quêtes du jour et de la semaine'); }],
      ['Défi du jour', () => { D.chDay = ''; this.ok('Défi du jour rejouable'); }],
      ['Tout le quotidien', () => { Object.assign(D, { calDay: '', popped: '', wheelAt: 0, wheel: '', day: '', week: '', chDay: '', offer: '' }); sv.dailyTick(); this.ok('Quotidien entièrement réinitialisé'); }, 'green'],
    ]);
    this.btns(s, [...ADMIN.clock.map(([ms, l]) => [l, () => { setAdminClock(adminClock.off + ms); this.afterClock(l); }]), ['Remettre à l\'heure', () => { setAdminClock(0); this.afterClock('Horloge remise à l\'heure'); }, 'red']]);
  }
  afterClock(l) { const sv = this.save; sv.checkBuild(); sv.dailyTick(); this.ok(l.startsWith('+') ? 'Horloge avancée de ' + l.slice(1) : l); this.render(); }
  unlockAll(stars, heroic) {
    const d = this.d, sv = this.save;
    for (const L of LEVELS) { const ld = sv.levelData(L.n); ld.stars = stars; ld.obj = [0, 1, 2].map((i) => i < stars); ld.best = Math.max(ld.best || 0, stars ? 1000 * stars : 0); if (heroic) { ld.heroic = 1; ld.heroicBest = Math.max(ld.heroicBest || 0, 1500); } }
    d.adminOpen = true; d.avatar = LEVELS.length; d.pendingWorld = null;
    sv.grantUnlocks(); sv.syncTierCap(); sv.persist();
  }

  // ================================================================== BESTIAIRE
  tab_best() {
    const s = this.sec('Bestiaire', `${Object.keys(ENEMIES).length} brainrots, mini-boss et boss. Version mutée selon le rang de Renaissance.`);
    this.row(s, 'Rang de mutation', this.sel(Array.from({ length: 11 }, (_, i) => [i, i ? `Rang ${ROMAN[i]}` : 'Normal']), this.rank, (v) => { this.rank = +v; this.render(); }));
    // ---- fiche
    const id = this.pick, c = ENEMIES[id], k = this.rank;
    const hpK = 1 + REBIRTH.hpPerRank * k, spK = 1 + REBIRTH.speedPerRank * k, regen = REBIRTH.regenPerRank * k;
    const card = el('section', 'adm-sec adm-enemy');
    card.innerHTML = `<div class="ae-top"><div class="ae-view"><img alt=""></div><div class="ae-id"><small>${c.tag || (c.boss ? 'BOSS' : '')}${k ? ' · muté ' + ROMAN[k] : ''}</small><b></b><span class="ae-hint"></span></div></div>
      <div class="ae-anim"></div><div class="ae-stats"></div><ul class="ae-sp"></ul>`;
    $('.ae-id b', card).textContent = c.name; $('.ae-hint', card).textContent = c.title || c.hint || '';
    const stat = (l, v) => $('.ae-stats', card).append(el('div', '', `<small>${l}</small><b>${v}</b>`));
    stat('PV', fmt(c.hp * hpK) + (k ? ` <em>(${fmt(c.hp)})</em>` : '')); stat('Vitesse', fmt(c.speed * spK) + (k ? ` <em>(${fmt(c.speed)})</em>` : ''));
    stat('Blindage', c.armor || 0); stat('Récompense', `${coin()}${c.reward}`); stat('Dégâts château', c.leak >= 99 ? 'Détruit' : c.leak + ' PV'); stat('Taille', c.r);
    const sp = $('.ae-sp', card), add = (t) => sp.append(el('li', '', t));
    for (const [key, f] of Object.entries(SPECIAL)) if (c[key]) add(f(c[key]));
    if (c.ability && ABILITY[c.ability.kind]) add(ABILITY[c.ability.kind](c.ability)); else if (c.ability) add('Capacité : ' + c.ability.kind);
    if (k) add(`Mutation : PV x${fr(hpK)}, vitesse x${fr(spK)}, régénère ${fr(regen * 100)} % des PV max par seconde`);
    add('Apparaît : ' + this.whereSeen(id));
    if (!sp.children.length) add('Aucune capacité spéciale');
    // aperçu animé : marche, coup reçu, mort
    const img = $('.ae-view img', card), view = $('.ae-view', card);
    const fr0 = [0, 1].map((st) => svgUrl(enemySvg(id, 0, st, 240))), hit = svgUrl(enemySvg(id, 1, 0, 240)), dead = svgUrl(enemySvg(id, 2, 0, 240));
    let step = 0; img.src = fr0[0];
    this.prev = setInterval(() => { if (view.dataset.a) return; step ^= 1; img.src = fr0[step]; }, 260);
    const anim = (a, src, ms) => { view.dataset.a = a; img.src = src; view.classList.remove('hit', 'die'); void view.offsetWidth; view.classList.add(a); clearTimeout(this._an); this._an = setTimeout(() => { view.classList.remove(a); delete view.dataset.a; img.src = fr0[0]; }, ms); };
    const ab = $('.ae-anim', card);
    ab.append(this.btn('Marche', () => { view.classList.remove('hit', 'die'); delete view.dataset.a; }), this.btn('Coup reçu', () => anim('hit', hit, 420)), this.btn('Mort', () => anim('die', dead, 1100)));
    this.body.append(card);
    // ---- apparition
    const s2 = this.sec('Faire apparaître', 'Lâchés depuis le portail de la partie en cours.');
    if (!this.needGame(s2)) {
      const q = this.num(this.qty, 1, ADMIN.spawnMax, 70), m = this.sel([[0.25, 'PV x0,25'], [0.5, 'PV x0,5'], [1, 'PV x1'], [2, 'PV x2'], [5, 'PV x5'], [10, 'PV x10']], this.hpMul);
      this.row(s2, 'Quantité', q); this.row(s2, 'Multiplicateur de PV', m);
      this.btns(s2, [[icon('skull') + `Lâcher : ${c.name}`, () => { this.qty = this.val(q, 1, ADMIN.spawnMax); this.hpMul = +m.value; const n = this.spawn(id, this.qty, this.hpMul); this.close(); this.ui.toast('Admin', `${n} ${c.name} en approche`, icon('skull')); }, 'red']]);
    }
    // ---- grille de tous les ennemis
    const grid = el('div', 'ae-grid');
    for (const [eid, e] of Object.entries(ENEMIES)) {
      const b = el('button', 'ae-cell' + (eid === id ? ' on' : '') + (e.boss ? ' boss' : ''), `<img alt="" src="${svgUrl(enemySvg(eid, 0, 0, 120))}"><span></span>`);
      $('span', b).textContent = e.name; b.onclick = () => { this.pick = eid; this.render(); this.body.scrollTop = 0; };
      grid.append(b);
    }
    this.sec('Tous les ennemis').append(grid);
  }
  whereSeen(id) {
    const c = ENEMIES[id];
    if (id === 'mini') return 'mini-boss de tous les mondes';
    if (c.boss) { const ws = WORLDS.map((w, i) => (w.boss === id ? `monde ${i + 1} (${w.name})` : null)).filter(Boolean); return ws.length ? 'boss du ' + ws.join(', ') : 'boss'; }
    const L = LEVELS[Math.max(0, (c.from || 1) - 1)] || LEVELS[0];
    return `à partir du niveau ${L.id} (monde ${L.world + 1} · ${WORLDS[L.world].name})`;
  }
  spawn(type, n, mul) {
    const g = this.game; if (!g) return 0;
    const boss = !!ENEMIES[type].boss;
    for (let i = 0; i < n; i++) g.delayed.push({ t: i * 0.4, fn: () => { if (!g.over) g.spawnEnemy(type, i % g.paths.length, 0, mul, boss ? mul : 1, { mini: type === 'mini' }); } });
    return n;
  }
  stopPreview() { clearInterval(this.prev); clearTimeout(this._an); this.prev = null; }

  // ================================================================== PARTIE
  tab_game() {
    const F = this.flags;
    let s = this.sec('Triche', 'Les réglages restent actifs pour les parties suivantes de la session admin.');
    this.tog(s, 'Argent infini', F.infMoney, (v) => { F.infMoney = v; this.apply(); this.ok(v ? 'Argent infini' : 'Argent normal'); });
    this.tog(s, 'Château invincible', F.god, (v) => { F.god = v; this.apply(); this.ok(v ? 'God Mode : PV du château infinis' : 'God Mode désactivé'); }, 'God Mode');
    this.tog(s, 'Apparitions en pause', F.holdSpawn, (v) => { F.holdSpawn = v; this.apply(); this.ok(v ? 'Apparition des ennemis en pause' : 'Apparitions reprises'); });
    this.tog(s, 'Toutes les tourelles gratuites', F.adminFree, (v) => { F.adminFree = v; this.apply(); this.ok(v ? 'Toutes les tourelles, gratuites' : 'Prix normaux'); }, 'même non débloquées');
    s = this.sec('Vitesse de jeu');
    const sp = el('div', 'adm-btns seg2');
    for (const v of ADMIN.speeds) sp.append(this.btn('x' + fr(v), () => { F.speed = v; this.apply(); this.ok('Vitesse x' + fr(v)); this.render(); }, F.speed === v ? 'primary' : 'ghost'));
    s.append(sp);
    s = this.sec('Partie en cours');
    if (!this.needGame(s)) {
      const g = this.game;
      s.querySelector('h4').insertAdjacentHTML('afterend', `<p class="adm-sub">${g.level.id ? 'Niveau ' + g.level.id : ''} · vague ${g.wave}${g.endless ? '' : '/' + g.totalWaves} · ${fmt(g.money)} pièces · ${g.lives}/${g.maxLives} PV</p>`);
      this.btns(s, [['+1 000 pièces', () => { g.addMoney(1000); this.ok('+1 000 pièces'); }], ['+10 000 pièces', () => { g.addMoney(10000); this.ok('+10 000 pièces'); }]]);
      const wn = this.num(Math.min(g.wave + 1, g.endless ? 999 : g.totalWaves), 1, g.endless ? 999 : g.totalWaves, 70);
      this.row(s, 'Aller à la vague', wn, this.btn('Aller', () => { this.gotoWave(this.val(wn, 1, g.endless ? 999 : g.totalWaves)); this.close(); }, 'primary'));
      this.btns(s, [['Terminer la vague', () => { g.queue.length = 0; for (const e of g.enemies) if (!e.dead) { e.dead = true; g.fx.burst(e.x, e.y, '#fff', 6, 160, 4); } this.close(); }],
        ['Gagner le niveau', () => { this.close(); g.end(true); }, 'green'], ['Perdre le niveau', () => { this.close(); g.lives = 0; g.end(false); }, 'red']]);
      this.btns(s, [['Recharger capacités et boosts', () => { for (const a of g.abilities) a.cd = 0; for (const b of g.boosts) if (b) b.used = false; this.ui.cache.dock = null; this.ok('Capacités et boosts rechargés'); }]]);
      this.btns(s, [['Tempête de sable', () => this.event('sandstorm')], ['Éruption', () => this.event('eruption')], ['Coupure de courant', () => this.event('blackout')]]);
      // tourelle choisie
      const t = this.tower && g.towers.includes(this.tower) ? this.tower : null, s2 = this.sec('Tourelle choisie', t ? `${t.label || TOWERS[t.type].name} · niveau ${t.level}` : 'Touche une tourelle en jeu, puis rouvre la console avec le badge ADMIN.');
      if (t) {
        const br = TOWERS[t.type].branches || [];
        this.btns(s2, [['Niveau 2', () => this.upTo(t, 2)], ['Niveau 3', () => this.upTo(t, 3)], ...br.map((b, i) => [`${b.name} (niv. 5)`, () => this.upTo(t, 5, i), 'primary'])]);
      }
    }
    s = this.sec('Affichage debug');
    this.tog(s, 'Hitbox, portées, chemin, emplacements', F.draw, (v) => { F.draw = v; this.apply(); this.ok(v ? 'Affichage debug actif' : 'Affichage debug coupé'); });
    this.tog(s, 'FPS et nombre d\'entités', F.fps, (v) => { F.fps = v; this.fpsShow(); this.ok(v ? 'Compteur affiché' : 'Compteur masqué'); });
    this.tog(s, 'Mesures d\'écran', debugOpen(), (v) => { if (v) openDebug(); else closeDebug(); this.ok(v ? 'Mesures d\'écran affichées (comme ?debug=1)' : 'Mesures masquées'); }, 'comme ?debug=1');
  }
  // réglages appliqués à la partie en cours (et à chaque nouvelle partie de la session)
  apply() {
    const g = this.ui.game, F = this.flags; if (!g) return;
    g.infMoney = F.infMoney; g.god = F.god; g.holdSpawn = F.holdSpawn; g.adminSpeed = F.speed === 1 ? 0 : F.speed;
    if (g.adminFree !== F.adminFree) { g.adminFree = F.adminFree; if (this.ui._bb) this.ui._bb.key = null; }
    g.debugDraw = F.draw ? (c) => this.draw(c, g) : null;
    const b = $('#btn-speed'); if (b && F.speed !== 1) b.querySelector('b').textContent = 'x' + fr(F.speed); else if (b) this.ui.syncSpeed();
  }
  gotoWave(n) {
    const g = this.game; if (!g) return;
    g.queue.length = 0; for (const e of g.enemies) e.dead = true; g.enemies.length = 0;
    g.wave = n - 1; g.cleared = n - 1; g._nextCache = null; g.countdown = null; g.spawnClock = 0;
    g.startNextWave(false); this.ui.cache = {};
  }
  upTo(t, lvl, branch = null) {
    const g = this.game; if (!g) return; t.legendLocked = false;
    for (let k = 0; k < 8 && t.level < lvl; k++) {
      const opts = t.upgradeOptions().filter((o) => !o.locked); if (!opts.length) break;
      const o = opts.find((x) => x.kind === 'level') || opts.find((x) => x.branch === branch) || opts[0];
      g.money += o.cost; g.upgradeTower(t, o);
    }
    this.ok(`${TOWERS[t.type].name} au niveau ${t.level}`); this.render();
  }
  event(kind) { const g = this.game; if (!g) return; this.close(); if (!forceMech(g, kind, WORLDS)) this.ui.toast('Admin', 'Événement indisponible', icon('lock')); }
  // hitbox (rouge), portées (jaune), chemin (bleu), emplacements (vert libre, orange occupé)
  draw(c, g) {
    c.save(); c.lineWidth = 2; c.setLineDash([10, 8]); c.strokeStyle = 'rgba(80,200,255,.9)';
    for (const p of g.paths) { c.beginPath(); for (let d = 0; d <= p.total; d += 18) { const q = p.pointAt(d); if (d) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } c.stroke(); }
    c.setLineDash([]);
    g.slots.forEach((sl, i) => { c.strokeStyle = sl.tower ? '#ffa84c' : '#5dff8f'; c.beginPath(); c.arc(sl.x, sl.y, 30, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 15px sans-serif'; c.fillText(i, sl.x - 5, sl.y + 5); });
    c.strokeStyle = 'rgba(255,220,60,.8)'; for (const t of g.towers) { const r = (t.type === 'mine' ? t.stats.splash : t.stats.range) * (g.rangeK || 1); c.beginPath(); c.arc(t.x, t.y, r, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = '#ff4d5e'; c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif';
    for (const e of g.enemies) if (!e.dead) { c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.stroke(); c.fillText(Math.ceil(e.hp), e.x - 10, e.y - e.r - 6); }
    c.restore();
  }
  fpsShow() {
    if (this.flags.fps && !this.fpsBox) { this.fpsBox = el('div', ''); this.fpsBox.id = 'adm-fps'; document.body.append(this.fpsBox); }
    if (!this.flags.fps && this.fpsBox) { this.fpsBox.remove(); this.fpsBox = null; }
  }
  // appelé à chaque image par l'interface
  tick(ts) {
    if (this.ui.game !== this.g) { this.g = this.ui.game; this.apply(); }
    if (!this.fpsBox) return;
    this.frames.push(ts); while (this.frames.length && ts - this.frames[0] > 1000) this.frames.shift();
    if (ts - (this._fpsT || 0) < 250) return; this._fpsT = ts;
    const g = this.ui.game, fx = g && g.fx, parts = fx ? ['p', 'tracers', 'rings', 'texts', 'coins'].reduce((a, k) => a + ((fx[k] && fx[k].length) || 0), 0) : 0;
    this.fpsBox.textContent = `${this.frames.length} FPS${g ? `\n${g.enemies.length} ennemis · ${g.towers.length} tour.\n${g.projectiles.length} tirs · ${parts} part.` : ''}`;
  }

  // ================================================================== OUTILS
  tab_tools() {
    const ui = this.ui, d = this.d, sv = this.save;
    let s = this.sec('Tester les écrans');
    const play = (fn) => { this.close(); setTimeout(fn, 220); };
    const runEnd = (win, prep) => play(() => { if (prep) prep(); const n = ui.nextLevel().n; ui.startGame(n, false, false, []); setTimeout(() => { const g = ui.game; if (g && !g.over) { if (!win) g.lives = 0; g.end(win); } }, 500); });
    this.btns(s, [['Victoire', () => runEnd(true), 'green'], ['Défaite', () => runEnd(false), 'red'], ['Montée de niveau', () => runEnd(true, () => { d.xp = XP.need(d.level) - 1; })]]);
    const tw = this.sel(TOWER_ORDER.map((k) => [k, TOWERS[k].name]), 'laser');
    this.row(s, 'Déblocage d\'arme', tw, this.btn('Voir', () => play(() => ui.weaponReveal([tw.value], () => ui.closeOverlay()))));
    const wd = this.sel(WORLDS.map((w, i) => [i, `Monde ${i + 1}`]), 0);
    this.row(s, 'Fin de monde', wd, this.btn('Voir', () => play(() => { if (ui.screen === 'game') ui.quitGame('world'); setTimeout(() => (ui.worldReward ? ui.worldReward(+wd.value) : ui.worldTransition(+wd.value + 1)), 300); })));
    this.btns(s, Object.entries(CHESTS).map(([k, c]) => ['Ouvrir : ' + c.name, () => play(() => { d.chests[k] = (d.chests[k] || 0) + 1; sv.persist(); if (ui.screen === 'game') ui.quitGame('shop'); ui.openChest(k); })]));
    this.btns(s, [
      ['Renaissance', () => play(() => { if (ui.screen === 'game') ui.quitGame('menu'); this.unlockAll(3, false); const before = { ...d.castle, __preview: true }, res = sv.doRebirth(); if (res) ui.rebirthCinematic(before, res); })],
      ['Pass premium (achat simulé)', () => play(() => ui.mon.buy('season_pass'))],
      ['Pub récompensée (simulée)', () => play(() => ui.mon.showRewardedAd('admin'))],
    ]);
    // ---- sauvegarde
    s = this.sec('Sauvegarde', 'Copie le texte pour me l\'envoyer si tu trouves un bug. L\'import remplace seulement la copie admin.');
    const ex = el('textarea', 'adm-ta'); ex.readOnly = true; ex.value = sv.exportText(); ex.rows = 3;
    s.append(ex);
    const ta = el('textarea', 'adm-ta'); ta.rows = 3; ta.placeholder = 'Colle ici une sauvegarde (BRAINROT1:...)';
    this.btns(s, [['Copier', async () => { ex.select(); let ok = false; try { await navigator.clipboard.writeText(ex.value); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) { /* ignore */ } } this.ok(ok ? 'Sauvegarde copiée' : 'Sélectionne le texte et copie-le'); }]]);
    s.append(ta);
    this.btns(s, [['Importer dans la copie admin', () => { if (!sv.importText(ta.value)) { this.ok('Texte de sauvegarde invalide'); return; } this.ok('Sauvegarde importée dans la copie admin'); this.render(); }, 'primary']]);
    // ---- réinitialisation
    s = this.sec('Réinitialisation', 'Remet la copie admin à zéro (double confirmation). Ta vraie partie n\'est pas concernée.');
    const rs = this.btn(icon('trash') + 'Réinitialiser la copie', (b) => {
      if (!b.dataset.n) { b.dataset.n = 1; b.innerHTML = icon('trash') + 'Sûr ? Touche encore'; return; }
      if (b.dataset.n === '1') { b.dataset.n = 2; b.innerHTML = icon('trash') + 'Dernière confirmation'; return; }
      sv.reset(); sv.persist(); this.ok('Copie admin réinitialisée'); this.render();
    }, 'red');
    s.append(rs);
    // ---- sortie
    s = this.sec('Quitter le mode admin', 'Efface la copie de test et recharge ta vraie progression, intacte.');
    this.btns(s, [[icon('back') + 'Revenir à ma vraie partie', () => this.leave(), 'primary']]);
  }
  leave() {
    const ui = this.ui;
    if (ui.game) { try { ui.clearGame(); } catch (e) { /* ignore */ } }   // écrit dans la copie (jamais dans la vraie sauvegarde)
    this.save.persist = () => true;
    exitAdmin();
    location.reload();
  }
}
