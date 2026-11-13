// Sauvegarde automatique (localStorage) et progression persistante.
import { SHOP, ACHIEVEMENTS } from './config.js';
import { MAPS } from './maps.js';

const KEY = 'brainrot-bastion-save-v1';

const defaults = () => ({
  gems: 0,
  towers: [...SHOP.starterTowers],
  perks: { damage: 0, money: 0, lives: 0 },
  skins: ['default'], skin: 'default',
  maps: {},            // id -> { stars: {easy,normal,hard}, bestEndless }
  achievements: [],
  stats: { kills: 0, bossKills: 0, towersBuilt: 0, legendaries: 0, wins: 0, perfectWins: 0, hardWins: 0, bestEndless: 0, earlyStarts: 0, games: 0, bestScore: 0 },
  settings: { muted: false, volume: 0.7, shake: true, tutorialDone: false, damageNumbers: true, haptics: true, hints: true },
});

export class Save {
  constructor() {
    this.data = defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw) {
        const d = this.data;
        Object.assign(d, raw);
        d.perks = { ...defaults().perks, ...raw.perks };
        d.stats = { ...defaults().stats, ...raw.stats };
        d.settings = { ...defaults().settings, ...raw.settings };
      }
    } catch (e) { /* sauvegarde illisible : on repart de zéro */ }
  }
  persist() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible */ } }
  reset() { this.data = defaults(); this.persist(); }

  mapData(id) { const m = (this.data.maps[id] ||= { stars: {}, bestEndless: 0 }); m.best ||= {}; return m; }   // best = meilleur score par difficulté (+ 'endless')
  bestScore() { return this.data.stats.bestScore || 0; }
  bestStars(id) { return Math.max(0, ...Object.values(this.mapData(id).stars)); }
  mapBeaten(id) { return this.bestStars(id) > 0; }
  mapUnlocked(map) { return !map.unlock || this.mapBeaten(map.unlock); }
  totalStars() { return MAPS.reduce((s, m) => s + this.bestStars(m.id), 0); }
  towerUnlocked(t) { return this.data.towers.includes(t); }

  spend(n) { if (this.data.gems < n) return false; this.data.gems -= n; this.persist(); return true; }

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
  achievementProgress(a) { return a.special === 'stars' ? this.totalStars() : (this.data.stats[a.stat] || 0); }
}
