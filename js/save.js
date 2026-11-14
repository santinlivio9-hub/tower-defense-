// Sauvegarde automatique (localStorage) et progression persistante :
// campagne, château, niveau de joueur, talents, inventaire de boosts, coffres.
import { SHOP, ACHIEVEMENTS, LEVELS, WORLDS, UNLOCKS, STAR_CHESTS, CAMPAIGN, CASTLE, XP, TALENTS, BOOSTS, BOOST_ORDER, BOOST_SLOTS, STARTER_BOOSTS, CHESTS, COINS, DAILY, PASS, passReward } from './config.js';
import { mulberry32, hashStr } from './maps.js';

// date locale « AAAA-MM-JJ » (le jour change à minuit, heure du téléphone)
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = (d = new Date()) => { const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return today(m); };

const KEY = 'brainrot-bastion-save-v1';   // même clé qu'avant : les anciennes sauvegardes sont converties (voir migrate)

const defaults = () => ({
  v: 2,
  gems: 0, coins: COINS.start,
  towers: [...SHOP.starterTowers],
  skins: ['default'], skin: 'default',
  levels: {},            // n -> { stars, best, heroic (0/1), heroicBest }
  endless: [],           // classement local : [{ score, wave, world, t }]
  castle: { walls: 0, repair: 0, treasury: 0, cannon: 0, air: 0, blizzard: 0, gold: 0 },
  xp: 0, level: 1, talentPts: 0, talents: {},
  boosts: { ...STARTER_BOOSTS }, chests: { wood: 1, gold: 0, legend: 0 }, loadout: [],
  seen: { enemies: [], towers: [...SHOP.starterTowers] },
  viewed: { enemies: 0, towers: 0 },   // fiches de collection déjà consultées (badge « nouveau »)
  avatar: 1,             // niveau où se trouve l'avatar sur la carte du monde
  starChests: {},
  daily: { day: '', streak: 0, cal: 0, calDay: '', quests: [], wheel: '', chDay: '', week: '', weekly: null, popped: '', offer: '' },
  pass: { pts: 0, claimed: [] },
  legacyStars: 0, notice: null,
  achievements: [],
  stats: { kills: 0, bossKills: 0, towersBuilt: 0, legendaries: 0, wins: 0, perfectWins: 0, heroicWins: 0, bestEndless: 0, earlyStarts: 0, games: 0, bestScore: 0, chests: 0 },
  settings: { muted: false, volume: 0.7, shake: true, tutorialDone: false, damageNumbers: true, haptics: true, hints: true, autoWave: true, speed: 1, music: true },
});

export class Save {
  constructor() {
    this.data = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && raw.v === 2) this.merge(raw);
      else if (raw) { this.migrate(raw); this.persist(); }
    } catch (e) { /* sauvegarde illisible : on repart de zéro */ }
    // calendrier de déblocage : on ne retire rien de ce qui est déjà possédé, on ajoute ce que la progression donne
    try { this.grantUnlocks(); } catch (e) { /* ignore */ }
  }
  merge(raw) {
    const d = this.data, def = defaults();
    Object.assign(d, raw);
    for (const k of ['castle', 'boosts', 'chests', 'stats', 'settings', 'seen', 'viewed', 'daily', 'pass']) d[k] = { ...def[k], ...raw[k] };
    if (raw.coins == null) d.coins = COINS.migrateBase + COINS.migratePerStar * this.campaignStars();   // sauvegarde d'avant les pièces
  }
  // Ancienne sauvegarde (3 cartes, 3 difficultés, bonus permanents) -> nouveau système
  migrate(raw) {
    const d = this.data, def = defaults();
    d.gems = raw.gems || 0; d.coins = COINS.migrateBase;
    d.towers = [...new Set([...def.towers, ...(raw.towers || [])])]; d.seen.towers = [...d.towers];
    d.skins = raw.skins || def.skins; d.skin = raw.skin || 'default';
    d.achievements = raw.achievements || [];
    d.stats = { ...def.stats, ...raw.stats, heroicWins: (raw.stats && raw.stats.hardWins) || 0 };
    d.settings = { ...def.settings, ...raw.settings };
    // bonus permanents achetés : remboursés en gemmes (à réinvestir dans le château)
    const old = { damage: [15, 25, 40, 60, 90], money: [10, 20, 30, 45, 65], lives: [10, 20, 30, 45, 65] };
    let refund = 0;
    for (const k in old) for (let i = 0; i < ((raw.perks || {})[k] || 0); i++) refund += old[k][i] || 0;
    // étoiles : converties en gemmes et en XP ; un coffre par carte terminée
    let stars = 0, beaten = 0;
    for (const m of Object.values(raw.maps || {})) { const s = Math.max(0, ...Object.values(m.stars || {})); stars += s; if (s > 0) beaten++; }
    d.legacyStars = stars; d.chests.wood += beaten;
    const gems = refund + stars * 10, xp = stars * 120;
    d.gems += gems;
    const ups = this.addXp(xp);
    if (gems || xp || beaten) d.notice = { gems, xp, stars, chests: beaten, levels: ups.length };
    d.legacy = { maps: raw.maps, perks: raw.perks };
  }
  persist() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible */ } }
  reset() { this.data = defaults(); this.persist(); }

  // ------------------------------------------------------------- campagne
  levelData(n) { return (this.data.levels[n] ||= { stars: 0, best: 0, heroic: 0, heroicBest: 0 }); }
  levelDone(n) { return !!this.data.levels[n] && this.data.levels[n].stars > 0; }
  levelUnlocked(n) { return n <= 1 || this.levelDone(n - 1); }
  progress() { let p = 0; while (p < LEVELS.length && this.levelDone(p + 1)) p++; return p; }   // nombre de niveaux terminés à la suite
  totalStars() { return Object.values(this.data.levels).reduce((s, l) => s + (l.stars || 0), 0) + (this.data.legacyStars || 0); }
  campaignStars() { return Object.values(this.data.levels).reduce((s, l) => s + (l.stars || 0), 0); }
  bestScore() { return this.data.stats.bestScore || 0; }
  endlessUnlocked() { return this.progress() >= CAMPAIGN.endlessAfter; }
  addEndless(entry) { const e = this.data.endless; e.push(entry); e.sort((a, b) => b.score - a.score); e.length = Math.min(e.length, 10); return e.indexOf(entry); }
  towerUnlocked(t) { return this.data.towers.includes(t); }
  // Tourelles offertes par la progression ; renvoie celles qui viennent d'être débloquées
  // Déblocages de la campagne (UNLOCKS) : tourelles et skins exclusifs ; renvoie ce qui vient d'être obtenu
  grantUnlocks() {
    const p = this.progress(), d = this.data, got = { towers: [], skins: [], legend: [] };
    for (const [t, n] of Object.entries(UNLOCKS.towers)) if (p >= n - 1 && !d.towers.includes(t)) { d.towers.push(t); got.towers.push(t); }
    for (const [s, n] of Object.entries(UNLOCKS.skins)) if (p >= n - 1 && !d.skins.includes(s)) { d.skins.push(s); got.skins.push(s); }
    for (const [t, n] of Object.entries(UNLOCKS.legend)) if (p === n - 1) got.legend.push(t);
    return got;
  }
  grantTowers() { return this.grantUnlocks().towers; }
  // amélioration légendaire (5e niveau) disponible pour cette tourelle ?
  legendOk(t) { return this.progress() >= (UNLOCKS.legend[t] || 1) - 1; }
  // coffres d'étoiles d'un monde : étoiles, paliers prêts / déjà pris
  worldStars(wi) { return LEVELS.filter((l) => l.world === wi).reduce((s, l) => s + ((this.data.levels[l.n] || {}).stars || 0), 0); }
  starChests(wi) { const got = this.data.starChests[wi] || [], st = this.worldStars(wi); return STAR_CHESTS.map(([need, chest], k) => ({ k, need, chest, got: got.includes(k), ready: st >= need && !got.includes(k) })); }
  starChestsReady() { return WORLDS.reduce((s, w, wi) => s + this.starChests(wi).filter((c) => c.ready).length, 0); }
  claimStarChest(wi, k) { const c = this.starChests(wi)[k]; if (!c || !c.ready) return null; (this.data.starChests[wi] = this.data.starChests[wi] || []).push(k); const text = this.grant({ chest: c.chest }); this.persist(); return { text, chest: c.chest }; }
  // nombre de nouveautés pas encore vues dans la collection
  collectionNew() { const d = this.data; return Math.max(0, d.towers.length - (d.viewed.towers || 0)) + Math.max(0, d.seen.enemies.length - (d.viewed.enemies || 0)); }
  spend(n, cur = 'gems') { if (this.data[cur] < n) return false; this.data[cur] -= n; this.persist(); return true; }

  // ------------------------------------------------------------- château
  castleSum() { return Object.values(this.data.castle).reduce((a, b) => a + b, 0); }
  castleTier() { const s = this.castleSum(); let t = 0; CASTLE.tiers.forEach((v, i) => { if (s >= v) t = i; }); return t; }

  // ------------------------------------------------------------- talents
  talent(id) { return this.data.talents[id] || 0; }
  branchPoints(b) { return TALENTS[b].nodes.reduce((s, n) => s + this.talent(n.id), 0); }
  talentOpen(b, node) { const ns = TALENTS[b].nodes, i = ns.indexOf(node); return (i <= 0 || this.talent(ns[i - 1].id) > 0) && this.branchPoints(b) >= (node.need || 0); }
  canTalent(b, node) { return this.data.talentPts > 0 && this.talent(node.id) < node.max && this.talentOpen(b, node); }
  // Effets cumulés des talents
  mods() {
    const v = (b, id) => { const n = TALENTS[b].nodes.find((x) => x.id === id); return this.talent(id) * n.per; };
    return {
      damage: 1 + v('attack', 'dmg'), rate: 1 + v('attack', 'rate'), range: 1 + v('attack', 'range'), crit: v('attack', 'crit'),
      startMoney: v('economy', 'start'), coinMult: 1 + v('economy', 'kill'), waveBonus: 1 + v('economy', 'wave'), gemMult: 1 + v('economy', 'gems'),
      lives: v('castle', 'lives'), cdMult: 1 - v('castle', 'cd'), durMult: 1 + v('castle', 'dur'), slots: v('castle', 'slot'),
    };
  }
  boostSlots(level) { return (level.boss ? BOOST_SLOTS.boss : BOOST_SLOTS.normal) + this.mods().slots; }

  // ------------------------------------------------------------- XP et récompenses
  // Ajoute de l'XP ; renvoie la liste des niveaux gagnés [{ level, reward, text }] (récompenses déjà appliquées)
  addXp(n) {
    const d = this.data, ups = [];
    d.xp += Math.round(n);
    while (d.xp >= XP.need(d.level)) {
      d.xp -= XP.need(d.level); d.level++;
      const r = { ...XP.rewards[(d.level - 2) % XP.rewards.length] };
      if (d.level % 10 === 0) r.chest = 'gold';
      ups.push({ level: d.level, reward: r, text: this.grant(r) });
    }
    return ups;
  }
  // Applique une récompense { gems, talent, chest, boosts } ; renvoie sa description
  grant(r) {
    const d = this.data, out = [];
    if (r.coins) { d.coins = (d.coins || 0) + r.coins; out.push(`${r.coins} pièces`); }
    if (r.gems) { d.gems += r.gems; out.push(`${r.gems} gemmes`); }
    if (r.talent) { d.talentPts += r.talent; out.push(r.talent > 1 ? `${r.talent} points de talent` : '1 point de talent'); }
    if (r.chest) { d.chests[r.chest]++; out.push(CHESTS[r.chest].name); }
    if (typeof r.boosts === 'object') for (const [id, n] of Object.entries(r.boosts)) { d.boosts[id] = (d.boosts[id] || 0) + n; out.push(`${n} ${BOOSTS[id].name}`); }
    else if (r.boosts) { for (let i = 0; i < r.boosts; i++) { const id = BOOST_ORDER[Math.floor(Math.random() * 4)]; d.boosts[id]++; } out.push(r.boosts > 1 ? `${r.boosts} boosts` : '1 boost'); }
    return out.join(' + ');
  }
  chestCount() { return Object.values(this.data.chests).reduce((a, b) => a + (b || 0), 0); }
  // Ouvre un coffre ; renvoie les cartes [{ kind: 'gems'|'boost', id, n }] (déjà ajoutées à l'inventaire)
  openChest(kind) {
    const d = this.data, c = CHESTS[kind]; if (!c || d.chests[kind] <= 0) return null;
    d.chests[kind]--; d.stats.chests = (d.stats.chests || 0) + 1;
    const cards = [];
    const coins = Math.round(c.coins[0] + Math.random() * (c.coins[1] - c.coins[0])); d.coins = (d.coins || 0) + coins; cards.push({ kind: 'coins', n: coins });
    for (let i = 1; i < c.cards; i++) {
      if (i > 0 && Math.random() < c.boostChance) {
        const rare = Math.random() < c.rare, id = rare ? (Math.random() < 0.6 ? 'shield' : 'revive') : BOOST_ORDER[Math.floor(Math.random() * 4)];
        const n = rare ? 1 : 1 + (Math.random() < 0.35 ? 1 : 0);
        d.boosts[id] += n; cards.push({ kind: 'boost', id, n });
      } else {
        const n = Math.round(c.gems[0] + Math.random() * (c.gems[1] - c.gems[0]));
        d.gems += n; cards.push({ kind: 'gems', n });
      }
    }
    this.persist();
    return cards;
  }

  // ------------------------------------------------------------- quotidien
  // À appeler à chaque passage sur l'accueil : nouveau jour = série, nouvelles quêtes, roue, défi
  dailyTick() {
    const D = this.data.daily, now = today();
    if (D.day !== now) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      D.streak = D.day === today(y) ? D.streak + 1 : 1;
      D.day = now;
      const rnd = mulberry32(hashStr('q' + now)), pool = [...DAILY.quests];
      D.quests = [];
      while (D.quests.length < DAILY.perDay && pool.length) { const q = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; D.quests.push({ id: q.id, prog: 0, claimed: false }); }
    }
    const wk = mondayOf();
    if (D.week !== wk) { D.week = wk; const q = DAILY.weekly[Math.floor(mulberry32(hashStr('w' + wk))() * DAILY.weekly.length)]; D.weekly = { id: q.id, prog: 0, claimed: false }; }
    this.persist();
  }
  questDef(q, weekly = false) { return (weekly ? DAILY.weekly : DAILY.quests).find((x) => x.id === q.id); }
  calendarReady() { return this.data.daily.calDay !== today(); }
  claimCalendar() {
    const D = this.data.daily; if (!this.calendarReady()) return null;
    const i = D.cal % DAILY.calendar.length, r = DAILY.calendar[i];
    D.cal++; D.calDay = today(); const text = this.grant(r); this.persist();
    return { i, r, text };
  }
  // Progression des quêtes à la fin d'une partie : ev = { kills, wins, boosts, stars, built, upgrades, combo, bosses, drops, waves }
  trackDaily(ev) {
    const D = this.data.daily; this.dailyTick();
    for (const q of [...D.quests, D.weekly].filter(Boolean)) {
      if (q.claimed) continue;
      const v = ev[q.id] || 0;
      q.prog = q.id === 'combo' ? Math.max(q.prog, v) : q.prog + v;
    }
    this.persist();
  }
  questsReady() { const D = this.data.daily; return [...D.quests, D.weekly].filter((q) => q && !q.claimed && q.prog >= this.questDef(q, q === D.weekly).n).length; }
  claimQuest(q) {
    const D = this.data.daily, wk = q === D.weekly, def = this.questDef(q, wk);
    if (q.claimed || q.prog < def.n) return null;
    q.claimed = true; const text = this.grant(def.reward); this.addPass(def.pass); this.persist();
    return text;
  }
  wheelReady() { return this.data.daily.wheel !== today(); }
  spinWheel() {
    const W = DAILY.wheel, total = W.reduce((a, s) => a + s.w, 0); let x = Math.random() * total, i = 0;
    for (; i < W.length - 1; i++) { x -= W[i].w; if (x < 0) break; }
    const { w, ...r } = W[i]; const text = this.grant(r); this.data.daily.wheel = today(); this.persist();
    return { i, text, r };
  }
  // défi du jour : un niveau normal déjà terminé (sinon le 1er) + un modificateur, tirés selon la date
  challenge() {
    const rnd = mulberry32(hashStr('c' + today()));
    const done = LEVELS.filter((L) => !L.boss && this.levelDone(L.n));
    const L = done.length ? done[Math.floor(rnd() * done.length)] : LEVELS[0];
    const mod = DAILY.challenges[Math.floor(rnd() * DAILY.challenges.length)];
    return { n: L.n, mod, done: this.data.daily.chDay === today() };
  }
  challengeDay() { return today(); }
  // passe de progression
  addPass(n) { this.data.pass.pts += Math.max(0, Math.round(n)); }
  passTier() { return Math.min(PASS.tiers, Math.floor(this.data.pass.pts / PASS.perTier)); }
  passReady() { const t = this.passTier(), c = this.data.pass.claimed; let n = 0; for (let i = 1; i <= t; i++) if (!c.includes(i)) n++; return n; }
  claimPass(tier) {
    const P = this.data.pass; if (tier > this.passTier() || P.claimed.includes(tier)) return null;
    P.claimed.push(tier); const text = this.grant(passReward(tier)); this.persist(); return text;
  }
  dailyCount() { return (this.calendarReady() ? 1 : 0) + this.questsReady() + (this.wheelReady() ? 1 : 0) + this.passReady(); }

  // ------------------------------------------------------------- succès
  // Vérifie les succès ; renvoie la liste des succès nouvellement débloqués.
  checkAchievements() {
    const got = [];
    for (const a of ACHIEVEMENTS) {
      if (this.data.achievements.includes(a.id)) continue;
      if (this.achievementProgress(a) >= a.goal) { this.data.achievements.push(a.id); this.data.gems += a.gems; got.push(a); }
    }
    if (got.length) this.persist();
    return got;
  }
  achievementProgress(a) { return a.special === 'stars' ? this.totalStars() : a.special === 'progress' ? this.progress() : (this.data.stats[a.stat] || 0); }
}
