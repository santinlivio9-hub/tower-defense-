// Mesures d'équilibrage avec le VRAI moteur du jeu (Chromium sans affichage, via Playwright) ou la vraie config (Node).
// Serveur local requis pour les mesures en partie : python3 -m http.server 8123
//   NODE_PATH=$(npm root -g) node tools/balance.cjs dps                 banc d'essai des tourelles
//   node tools/balance.cjs waves                                         courbe de difficulté (sans navigateur)
//   NODE_PATH=$(npm root -g) node tools/balance.cjs win <niveaux> <essais> [boost]   taux de victoire (joueur moyen simulé)
//   NODE_PATH=$(npm root -g) node tools/balance.cjs mono <niveaux>       stratégie « une seule tourelle partout »
// Niveaux : liste « 1,5,12 », plage « 1-80 », ou « all ». Sortie : tableaux Markdown (et JSON avec --json fichier).
const path = require('path'), fs = require('fs');
const [cmd = 'dps', ...args] = process.argv.slice(2);
const jsonOut = (() => { const i = args.indexOf('--json'); if (i < 0) return null; const f = args[i + 1]; args.splice(i, 2); return f; })();
const URL = process.env.URL || 'http://localhost:8123/';
const parseLevels = (s) => { if (!s || s === 'all') return Array.from({ length: 80 }, (_, i) => i + 1); return s.split(',').flatMap((p) => { const m = p.match(/^(\d+)-(\d+)$/); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : [+p]; }); };
const fmt = (n, d = 0) => (n == null || Number.isNaN(n) ? '-' : Number(n).toFixed(d).replace('.', ','));
const save = (o) => { if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(o, null, 1)); };

async function page() {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', (e) => console.error('ERREUR PAGE', e.message));
  await p.goto(URL); await p.waitForTimeout(600);
  return { b, p };
}

// ============================================================================ banc d'essai des tourelles
// Cibles immobiles, PV infinis, devant un socle : 1 cible (mono), 6 cibles espacées de 24 px sur le chemin (groupe),
// 1 cible blindée (blindage 5, comme le Granchio), 1 boss (Tricheco, capacités coupées). Mesure : dégâts sur 240 s
// après 4 s de mise en route (montée du minigun, chauffe du laser). Aucun talent, aucune Renaissance.
async function dps() {
  const { b, p } = await page();
  const rows = await p.evaluate(async () => {
    const C = await import('./js/config.js'), { branchDef } = await import('./js/towers.js');
    const ui = __ui, sv = ui.save; sv.reset(); ui.simulating = true;
    ui.audio.play = ui.audio.pop = () => {}; ui.haptics.pulse = () => {};   // simulation muette (des milliers de sons par seconde de jeu)
    const d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.towers = [...C.TOWER_ORDER]; d.adminOpen = true;
    d.rebirth.owned = C.REBIRTH.shop.map((x) => x.id);   // branches Mk II visibles (3e branche de Renaissance)
    ui.startGame(2, false, false, []); ui.closeOverlay();
    const g = __game; g.queue.length = 0; g.money = 1e9;
    const P = g.paths[0];
    const near = (sl) => { let best = 0, bd = 1e9; for (let dd = 0; dd < P.total; dd += 3) { const q = P.pointAt(dd); const k = Math.hypot(q.x - sl.x, q.y - sl.y); if (k < bd) { bd = k; best = dd; } } return { dd: best, dist: bd }; };
    // socle de test : celui qui voit le plus de chemin dans un rayon de 110 px
    const cover = (sl) => { let n = 0; for (let dd = 0; dd < P.total; dd += 6) { const q = P.pointAt(dd); if (Math.hypot(q.x - sl.x, q.y - sl.y) < 110) n++; } return n; };
    const tSlot = g.slots.filter((s) => s.kind === 'tower').sort((a, c) => cover(c) - cover(a))[0];
    const mSlot = g.slots.find((s) => s.kind === 'mine');
    const pinned = [];
    const clear = () => { for (const e of g.enemies) e.dead = true; g.enemies.length = 0; g.projectiles.length = 0; g.delayed.length = 0; pinned.length = 0; };
    const add = (type, dd, armor) => { const e = g.spawnEnemy(type, 0, dd, 1, 1); e.maxHp = e.hp = 1e12; e.speed = 0; e.armor = armor; e.d0 = dd; e.off = 0; e.place(); e.abilityT = 1e9; e.healT = 1e9; pinned.push(e); return e; };   // cibles centrées sur le chemin
    const step = (n) => { for (let i = 0; i < n; i++) { g.update(1 / 30); for (const e of pinned) { e.d = e.d0; e.place(); e.hp = e.maxHp; e.dead = false; e.stunT = 0; } } };
    const configs = (type) => {
      const out = [{ id: '1', path: [] }, { id: '2', path: [0] }, { id: '3', path: [0, 0] }];
      const nb = C.TOWERS[type].branches.length + (C.REBIRTH.mk2[type] ? 1 : 0);
      for (let k = 0; k < nb; k++) { const L = 'ABC'[k]; out.push({ id: '4' + L, path: [0, 0, k] }, { id: '5' + L, path: [0, 0, k, 0] }); }
      return out;
    };
    const res = [];
    for (const type of C.TOWER_ORDER) for (const cf of configs(type)) {
      const out = { type, id: cf.id, name: '', cost: 0 };
      for (const sc of ['mono', 'groupe', 'blinde', 'boss']) {
        clear(); { let sd = 987654321; Math.random = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); }   // hasard reproductible
        const sl = type === 'mine' ? mSlot : tSlot, nr = near(sl);
        const t = g.placeTower(type, sl); t.legendLocked = false;
        for (const k of cf.path) { const o = t.upgradeOptions()[k]; g.upgradeTower(t, o); }
        out.name = t.label; out.cost = t.invested;
        if (sc === 'groupe') for (let k = -2; k <= 3; k++) add('basic', nr.dd + k * 24, 0);
        else if (sc === 'boss') add('boss1', nr.dd, 0);
        else add('basic', nr.dd, sc === 'blinde' ? 5 : 0);
        step(120); const d0 = t.dmg; step(7200);
        out[sc] = (t.dmg - d0) / 240;
        g.sellTower(t);
      }
      res.push(out);
    }
    clear(); ui.simulating = false;
    return res;
  });
  await b.close();
  // ---- tableau
  const by = {}; for (const r of rows) (by[r.type] = by[r.type] || []).push(r);
  const C = await import(path.resolve(__dirname, '../js/config.js'));
  console.log('| Tourelle | Niv. | Nom | Coût cumulé | DPS mono | DPS / 100 pièces | DPS groupe (6) | Blindé (5) | % vs blindé | Boss |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const type of C.TOWER_ORDER) for (const r of by[type]) console.log(`| ${C.TOWERS[type].name} | ${r.id} | ${r.name} | ${r.cost} | ${fmt(r.mono)} | ${fmt((r.mono / r.cost) * 100, 1)} | ${fmt(r.groupe)} | ${fmt(r.blinde)} | ${fmt((r.blinde / r.mono) * 100)} % | ${fmt(r.boss)} |`);
  save(rows);
  return rows;
}

// ============================================================================ banc « menaces » : rôles des tourelles
// Des ennemis RÉELS défilent devant le socle, à leur espacement normal (intervalle de config.js). Deux mesures :
//   débit    : ennemis très résistants (aucun ne meurt) : dégâts utiles par seconde sur une vague réaliste (portée,
//              cibles multiples, blindage, détection, volants). « groupe » = foule serrée de fin de niveau.
//   capacité : menaces fragiles (rapides, diviseurs) : PV max par ennemi pour lesquels la tourelle SEULE en élimine 90 %,
//              ramenés en PV traités par seconde (les dégâts gaspillés sur un ennemi presque mort ne comptent pas).
// Résultat pour 100 pièces investies : plus c'est haut, mieux la tourelle répond à cette menace.
const THREATS = [   // [nom, ennemi, rythme (x intervalle de config.js), mesure]
  ['rapides', 'fast', 1, 'cap'], ['groupe', 'basic', 0.5, 'debit'], ['tanks', 'tank', 1, 'debit'], ['blindés', 'armored', 1, 'debit'],
  ['volants', 'flying', 1, 'debit'], ['diviseurs', 'splitter', 1, 'cap'], ['invisibles', 'stealth', 1, 'debit'], ['boss', 'boss1', 0, 'debit'],
  ['boucliers', 'robo', 1, 'cap'], ['sauteurs', 'monkey', 1, 'cap'], ['contrôle', 'basic', 1, 'slow'],
];
// Rôle attendu de chaque tourelle : la colonne où elle doit être la meilleure (par pièce au niveau 1, ou par emplacement)
const ROLES = { assault: ['polyvalence', '1'], smg: ['rapides', '1'], shotgun: ['tanks', '1'], sniper: ['boss', '1'], rocket: ['diviseurs', '1'],
  minigun: ['boss', '3 slot'], cryo: ['contrôle', '1'], laser: ['boucliers', '1'], tesla: ['volants', '1'], plasma: ['blindés', '1'], drone: ['sauteurs', '1'], mine: ['groupe', '1'] };
// polyvalence : moyenne, sur les menaces de combat, de la valeur par pièce rapportée à la meilleure du même niveau
function addPoly(rows) {
  const core = THREATS.filter((t) => t[3] !== 'slow' && t[0] !== 'boss').map((t) => t[0]);
  for (const lvl of ['1', '2', '3', '4', '5']) {
    const sub = rows.filter((r) => r.id.startsWith(lvl)); if (!sub.length) continue;
    const best = Object.fromEntries(core.map((n) => [n, Math.max(1e-9, ...sub.map((r) => r[n] / r.cost))]));
    for (const r of sub) r.polyvalence = (core.reduce((a, n) => a + r[n] / r.cost / best[n], 0) / core.length) * r.cost;
  }
}
async function flux() {
  const { b, p } = await page();
  const lv = args[0] ? args[0].split(',') : ['1', '3', '5'];
  const plan = await p.evaluate(async ({ lv }) => {
    const C = await import('./js/config.js');
    const ui = __ui, sv = ui.save; sv.reset(); ui.simulating = true;
    ui.audio.play = ui.audio.pop = () => {}; ui.haptics.pulse = () => {};
    const d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true; d.towers = [...C.TOWER_ORDER]; d.adminOpen = true;
    d.rebirth.owned = C.REBIRTH.shop.map((x) => x.id);
    ui.startGame(2, false, false, []); ui.closeOverlay();
    const g = __game; g.queue.length = 0; g.money = 1e9; g.god = true; g.hpMult = 1; g.speedMult = 1;
    const P = g.paths[0];
    const near = (sl) => { let best = 0, bd = 1e9; for (let dd = 0; dd < P.total; dd += 3) { const q = P.pointAt(dd); const k = Math.hypot(q.x - sl.x, q.y - sl.y); if (k < bd) { bd = k; best = dd; } } return best; };
    const cover = (sl) => { let n = 0; for (let dd = 0; dd < P.total; dd += 6) { const q = P.pointAt(dd); if (Math.hypot(q.x - sl.x, q.y - sl.y) < 110) n++; } return n; };
    const ts = g.slots.filter((s) => s.kind === 'tower').sort((a, c) => cover(c) - cover(a)), ms = g.slots.filter((s) => s.kind === 'mine');
    window.__bench = { slots: { tower: [ts[0], ts[Math.floor(ts.length / 2)]], mine: [ms[0], ms[Math.floor(ms.length / 2)]] }, C };
    const out = [];
    for (const type of C.TOWER_ORDER) {
      const nb = C.TOWERS[type].branches.length + (C.REBIRTH.mk2[type] ? 1 : 0);
      for (const l of lv) { if (+l < 4) out.push({ type, id: l, path: l === '1' ? [] : l === '2' ? [0] : [0, 0] }); else for (let k = 0; k < nb; k++) out.push({ type, id: l + 'ABC'[k], path: l === '4' ? [0, 0, k] : [0, 0, k, 0] }); }
    }
    return out;
  }, { lv });
  const rows = [];
  for (const cf of plan) {
    const out = { type: cf.type, id: cf.id };
    for (const [name, et, pace, mode] of THREATS) {
      const r = await p.evaluate(({ cf, et, pace, mode }) => {
        const g = __game, B = window.__bench, C = B.C, P = g.paths[0];
        // ennemis sur TOUT le chemin (du portail au château) : la portée compte ; moyenne de 2 socles
        const start = 0, stop = P.total - 40, vals = [];
        { let sd = 123456789; Math.random = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); }   // hasard reproductible
        let cost = 0, name = '';
        for (const sl of B.slots[cf.type === 'mine' ? 'mine' : 'tower']) {
          const setup = () => {
            for (const e of g.enemies) e.dead = true; g.enemies.length = 0; g.projectiles.length = 0; g.delayed.length = 0; g.fx.clear();
            for (const t of [...g.towers]) g.sellTower(t);
            const t = g.placeTower(cf.type, sl); t.legendLocked = false;
            for (const k of cf.path) g.upgradeTower(t, t.upgradeOptions()[k]);
            cost = t.invested; name = t.label; return t;
          };
          if (et === 'boss1') {   // dégâts par seconde sur un boss qui fait le tour du chemin
            setup(); const boss = g.spawnEnemy('boss1', 0, 0, 1, 200); boss.abilityT = 1e9;
            const loop = () => { if (boss.d > stop) { boss.d = 0; boss.place(); } };
            for (let i = 0; i < 300; i++) { g.update(1 / 30); loop(); }
            const h0 = boss.hp; for (let i = 0; i < 3600; i++) { g.update(1 / 30); loop(); }
            vals.push((h0 - boss.hp) / 120); continue;
          }
          const cfg = C.ENEMIES[et], every = cfg.interval * pace, N = 30;
          if (mode === 'slow') {   // contrôle : temps passé par les ennemis près du socle, comparé à leur vitesse normale (en %)
            setup(); let clock = every, extra = 0, cnt = 0; const near0 = (() => { let best = 0, bd = 1e9; for (let dd = 0; dd < P.total; dd += 3) { const q = P.pointAt(dd); const k = Math.hypot(q.x - sl.x, q.y - sl.y); if (k < bd) { bd = k; best = dd; } } return best; })();
            const a0 = Math.max(0, near0 - 300), a1 = Math.min(P.total - 50, near0 + 300), t0 = new Map();
            for (let i = 0; i < 2400; i++) {
              clock += 1 / 30; while (clock >= every) { clock -= every; const e = g.spawnEnemy(et, 0, start, 1); e.maxHp = e.hp = 1e9; }
              g.update(1 / 30);
              for (const e of g.enemies) { if (!t0.has(e) && e.d >= a0) t0.set(e, i); if (t0.has(e) && e.d >= a1 && !e.done) { e.done = true; if (i > 600) { extra += ((i - t0.get(e)) / 30) / ((a1 - a0) / (cfg.speed * g.speedMult)) - 1; cnt++; } } if (e.d > stop) e.dead = true; }
            }
            vals.push(Math.max(0, (extra / Math.max(1, cnt)) * 100)); continue;
          }
          if (mode === 'debit') {   // ennemis increvables à l'espacement réel : dégâts utiles par seconde
            setup(); let clock = every, dmg = 0;
            const tick = (m) => {
              clock += 1 / 30; while (clock >= every) { clock -= every; const e = g.spawnEnemy(et, 0, start, 1); e.maxHp = e.hp = 1e9; }
              const list = m ? g.enemies.slice() : null, h0 = m ? list.map((e) => e.hp) : null;
              g.update(1 / 30);
              if (m) list.forEach((e, i) => { dmg += h0[i] - e.hp; });
              for (const e of g.enemies) if (e.d > stop) e.dead = true;
            };
            for (let i = 0; i < 1500; i++) tick(false);
            for (let i = 0; i < 1800; i++) tick(true);
            vals.push(dmg / 60); continue;
          }
          // capacité : part des ennemis éliminés pour des PV multipliés par h
          const trial = (h) => {
            setup(); let spawned = 0, clock = every, killed = 0, total = 0; const seen = new Set();
            for (let i = 0; i < 12000; i++) {
              clock += 1 / 30; while (clock >= every && spawned < N) { clock -= every; g.spawnEnemy(et, 0, start, h); spawned++; }
              g.update(1 / 30);
              for (const e of g.enemies) { if (!seen.has(e)) { seen.add(e); total++; } if (!e.dead && e.d > stop) { e.dead = true; e.leaked = true; } }
              if (spawned >= N && g.enemies.every((e) => e.dead)) break;
            }
            for (const e of seen) if (!e.leaked) killed++;
            return killed / Math.max(1, total);
          };
          let lo = 0.02, hi = 0.02;
          while (hi < 5000 && trial(hi) >= 0.9) { lo = hi; hi *= 3; }
          if (lo === hi) { vals.push(0); continue; }
          for (let k = 0; k < 6; k++) { const mid = Math.sqrt(lo * hi); if (trial(mid) >= 0.9) lo = mid; else hi = mid; }
          vals.push((lo * cfg.hp) / every);   // PV traités par seconde
        }
        for (const t of [...g.towers]) g.sellTower(t);
        return { cost, name, v: vals.reduce((a, b) => a + b, 0) / vals.length };
      }, { cf, et, pace, mode }).catch((e) => { console.error(`échec ${cf.type} ${cf.id} ${name} : ${e.message}`); return null; });
      if (!r) { await b.close(); process.exit(1); }
      out.cost = r.cost; out.name = r.name; out[name] = r.v;
    }
    rows.push(out); process.stderr.write('.');
  }
  await b.close();
  const C = await import(path.resolve(__dirname, '../js/config.js'));
  const names = [...THREATS.map((t) => t[0]), 'polyvalence'];
  addPoly(rows);
  for (const lvl of lv) {
    const sub = rows.filter((r) => r.id.startsWith(lvl));
    console.log(`\n### Niveau ${lvl} : dégâts utiles par seconde (rapides, diviseurs : PV traités par seconde) pour 100 pièces investies, meilleur de chaque colonne en gras\n`);
    console.log('| Tourelle | Config | Coût | ' + names.join(' | ') + ' |');
    console.log('|---|---|---|' + names.map(() => '---|').join(''));
    const best = Object.fromEntries(names.map((n) => [n, Math.max(...sub.map((r) => r[n] / r.cost))]));
    for (const r of sub) console.log(`| ${C.TOWERS[r.type].name} | ${r.id} ${r.name !== C.TOWERS[r.type].name ? r.name : ''} | ${r.cost} | ` + names.map((n) => { const v = (r[n] / r.cost) * 100, s = fmt(v, 1); return v >= best[n] * 100 - 1e-9 ? `**${s}**` : s; }).join(' | ') + ' |');
  }
  save(rows);
  return rows;
}

// ============================================================================ courbe de difficulté (Node)
async function waves(quiet = false) {
  const root = 'file://' + path.resolve(__dirname, '..') + '/js/';
  const C = await import(root + 'config.js'), { buildWave } = await import(root + 'waves.js'), { buildField } = await import(root + 'maps.js');
  const out = [];
  for (const L of C.LEVELS) {
    const f = buildField(L.layout, L.mirror, L.slots, C.CAMPAIGN.mines), len = f.paths.reduce((a, q) => a + q.total, 0) / f.paths.length;
    const ease = Math.max(C.CAMPAIGN.pathEase[0], Math.min(C.CAMPAIGN.pathEase[1], len / C.CAMPAIGN.pathRef));
    const hpMult = L.hp * ease, per = [];
    let total = 0, count = 0, bossHp = 0, peak = 0, money = L.money;
    for (let n = 1; n <= L.waves; n++) {
      const w = buildWave(n, L, f.paths.length);
      let hp = 0, k = 0, span = 0, reward = 0;
      for (const gr of w.groups) {
        const cfg = C.ENEMIES[gr.type];
        if (cfg.boss) { const h = cfg.hp * hpMult * w.bossMul; hp += h; if (!gr.mini) bossHp = h; k++; continue; }
        const h = cfg.hp * hpMult * w.hpScale * (gr.elite ? C.WAVES.eliteHp : 1) * (cfg.split ? 1 + (cfg.split.count * C.ENEMIES[cfg.split.type].hp) / cfg.hp : 1);
        hp += h * gr.count; k += gr.count; reward += cfg.reward * (gr.elite ? C.WAVES.eliteReward : 1) * gr.count;
        span = Math.max(span, gr.delay + gr.count * gr.interval);
      }
      money += reward + C.GAME.waveBonusBase + C.GAME.waveBonusPerWave * n;
      // DPS requis : PV de la vague / (durée des apparitions + traversée du chemin à la vitesse moyenne de la vague)
      const spd = w.groups.reduce((a, gr) => a + C.ENEMIES[gr.type].speed * L.speed * gr.count, 0) / Math.max(1, w.groups.reduce((a, gr) => a + gr.count, 0));
      const need = hp / (span + len / Math.max(10, spd));
      per.push({ n, hp, k, span, need, hps: hp / Math.max(6, span), boss: w.boss, mini: w.mini, calm: w.calm });
      total += hp; count += k; peak = Math.max(peak, hp / Math.max(6, span));
    }
    const needs = per.map((q) => q.need), peakNeed = Math.max(...needs);
    // vagues « respiration » : plus calmes que la précédente d'au moins 15 %
    const calm = per.filter((q) => q.calm).length;
    const lastIsMax = needs.indexOf(peakNeed) >= needs.length - 2;
    out.push({ n: L.n, id: L.id, boss: L.boss, waves: L.waves, len: Math.round(len), hpMult, total, count, bossHp, peak, peakNeed, calm, lastIsMax, money, per });
  }
  if (quiet === true) return out;
  console.log('| Niveau | Vagues | Chemin (px) | PV totaux | Ennemis | DPS requis au pic | Écart / niveau normal précédent | Vagues calmes | Pic en fin | PV boss | Pièces gagnables |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  let prevN = null;
  out.forEach((r) => { const ref = r.boss ? null : prevN; const dv = ref ? r.peakNeed / ref.peakNeed - 1 : null;
    console.log(`| ${r.id}${r.boss ? ' (boss)' : ''} | ${r.waves} | ${r.len} | ${fmt(r.total)} | ${r.count} | ${fmt(r.peakNeed)} | ${dv == null ? '-' : (dv >= 0 ? '+' : '') + fmt(dv * 100) + ' %'} | ${r.calm} | ${r.lastIsMax ? 'oui' : 'non'} | ${r.bossHp ? fmt(r.bossHp) : '-'} | ${fmt(r.money)} |`);
    if (!r.boss) prevN = r; });
  save(out);
  return out;
}

// ============================================================================ taux de victoire (joueur moyen simulé)
// Un « joueur moyen » dont le profil change à chaque essai (graine) : réagit toutes les 1 à 3 s, place ses tourelles
// sur de bons socles 40 à 90 % du temps, garde 0 à 100 pièces de côté, préfère poser ou améliorer selon l'essai,
// choisit ses tourelles parmi celles débloquées (attiré par les nouveautés), ses branches au hasard, et utilise ses
// capacités quand il y pense. Son château, ses talents et son niveau sont ceux du joueur régulier de
// tools/progression.cjs à sa 1re tentative de ce niveau (fichier SNAP). Vitesse x1, vagues automatiques.
// boost : il emporte et utilise ses boosts comme le robot « boost » de tools/simulate.cjs.
// mono=type : il ne pose QUE cette tourelle (bien placée, tout le reste comme un bon joueur).
async function playOne(p, job) {
  return p.evaluate(async (job) => {
    const C = window.__C || (window.__C = await import('./js/config.js'));
    const ui = __ui, sv = ui.save; sv.reset(); ui.simulating = true;
    ui.audio.play = ui.audio.pop = () => {}; ui.haptics.pulse = () => {};
    const d = sv.data; d.settings.tutorialDone = true; d.settings.muted = true;
    const n = job.n, snap = job.snap || {};
    for (let k = 1; k < n; k++) d.levels[k] = { stars: 2, best: 0, heroic: 0, heroicBest: 0 };
    if (job.hero) for (let k = 1; k <= 80; k++) d.levels[k] = { stars: 3, best: 0, heroic: 0, heroicBest: 0 };
    sv.grantUnlocks();
    Object.assign(d.castle, snap.castle || {}); d.talents = { ...(snap.talents || {}) }; d.level = snap.level || 1;
    if (job.rank) { d.rebirth.rank = job.rank; d.rebirth.owned = C.REBIRTH.shop.map((x) => x.id); }
    let seed = job.seed * 7919 + n * 104729; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5; i++) rnd();
    const mono = job.mono, good = !!mono || job.skill === 'good';
    // profils : good = bon joueur ; mid = joueur moyen ; low = débutant (lent, place au hasard, garde beaucoup de pièces)
    const prof = good ? { react: 1, pGood: 1, reserve: 0, up: 0.5, abil: 1 }
      : job.skill === 'low' ? { react: 2 + 3 * rnd(), pGood: 0.2 + 0.4 * rnd(), reserve: 40 + rnd() * 160, up: 0.2 + 0.3 * rnd(), abil: 0.1 + 0.4 * rnd() }
      : { react: 1 + 2 * rnd(), pGood: 0.4 + 0.5 * rnd(), reserve: rnd() * 100, up: 0.3 + 0.4 * rnd(), abil: 0.3 + 0.7 * rnd() };
    Object.assign(d.boosts, { coins2: 3, heal: 3, free: 3, over: 3, shield: 3, revive: 3 });
    const L0 = C.LEVELS[n - 1], slotsN = sv.boostSlots(L0);
    const carry = job.boost ? ['shield', 'over', 'revive', 'heal', 'coins2'].slice(0, slotsN) : [];
    ui.startGame(n, !!job.hero, false, carry); ui.closeOverlay(); ui.introOpen = false;
    const g = __game;
    const unlocked = C.TOWER_ORDER.filter((t) => t !== 'mine' && sv.towerUnlocked(t) && !(g.banned || []).includes(t));
    const recent = [...unlocked].sort((a, b) => C.UNLOCKS.towers[b] - C.UNLOCKS.towers[a]).slice(0, 2);
    const weight = (t) => (mono ? (t === mono ? 1 : 0) : (t === 'cryo' ? 0.5 : 1) + (recent.includes(t) ? 1 : 0));
    const pickType = () => { const ws = unlocked.map(weight), tot = ws.reduce((a, b) => a + b, 0); if (!tot) return null; let x = rnd() * tot; for (let i = 0; i < unlocked.length; i++) { x -= ws[i]; if (x <= 0) return unlocked[i]; } return unlocked[unlocked.length - 1]; };
    const slots = g.slots.filter((s) => s.kind === 'tower').sort((a, b) => a.rank - b.rank), mines = g.slots.filter((s) => s.kind === 'mine');
    const cap3 = g.goals && g.goals[2] && g.goals[2].id === 'towers' ? g.goals[2].n : 99;
    let steps = 0, nextAct = 0, built = 0;
    const act = () => {
      for (let guard = 0; guard < 4; guard++) {
        const free = slots.filter((s) => !s.tower), want = Math.min(slots.length, (good ? 2 : 1) + Math.floor(g.wave * (good ? 0.55 : 0.45)));
        let bt = null, bo = null;
        for (const t of g.towers) for (const o of t.upgradeOptions().filter((u) => !u.locked)) { const k = good ? o.cost : rnd(); if (!bo || k < (good ? bo.cost : bo._k)) { bo = { ...o, _k: k }; bt = t; } }
        if (bo && bo.kind === 'branch' && !good) { const opts = bt.upgradeOptions().filter((u) => !u.locked); bo = opts[Math.floor(rnd() * opts.length)]; }
        const type = mono || pickType(); if (!type) return;
        const cost = g.costOf(type), canBuild = free.length && g.towers.filter((t) => t.type !== 'mine').length < want;
        const doBuild = canBuild && (!bo || rnd() > prof.up);
        if (doBuild) {
          if (g.money < cost + prof.reserve) return;
          const s = rnd() < prof.pGood ? free[0] : free[Math.floor(rnd() * free.length)];
          if (g.placeTower(type, s)) { built++; continue; } return;
        }
        if (bo) { if (g.money < bo.cost + prof.reserve) return; if (g.upgradeTower(bt, bo)) continue; return; }
        if (free.length && g.money >= cost + prof.reserve && built < cap3 + 6) { if (g.placeTower(type, free[0])) { built++; continue; } }
        // mines : le joueur moyen en pose parfois sur les zones marquées
        if (!mono && sv.towerUnlocked('mine') && g.money >= C.TOWERS.mine.cost + prof.reserve + 60 && rnd() < 0.15) { const m = mines.find((s) => !s.tower); if (m) g.placeTower('mine', m); }
        return;
      }
    };
    const useB = (id) => { const i = g.boosts.findIndex((x) => x && x.id === id && !x.used); if (i >= 0) g.useBoost(i); };
    while (!g.over && steps++ < 220000) {
      if (steps >= nextAct) {
        nextAct = steps + Math.round(prof.react * 30);
        act();
        for (const a of g.abilities) if (a.cd <= 0 && rnd() < prof.abil) { if (a.id === 'gold') g.useAbility('gold'); else if (g.enemies.length >= 6) { const e = g.enemies.reduce((m, x) => (x.d / x.path.total > m.d / m.path.total ? x : m)); if (a.id === 'air' || a.id === 'meteor') g.useAbility(a.id, e.x, e.y); else g.useAbility(a.id); } }
        if (job.boost) {
          if (g.wave === 3) useB('coins2');
          if (g.lives <= g.maxLives - 6) useB('heal');
          const boss = g.enemies.find((e) => e.boss);
          if (boss && boss.d > boss.path.total * 0.45) { useB('over'); if (boss.d > boss.path.total * 0.7 || g.lives < 8) useB('shield'); }
          if (g.lives < 6 && g.enemies.length > 8) useB('shield');
        }
      }
      if (g.awaitRevive) g.reviveAnswer(false);
      if (g.wave === 0 && steps > 90) g.startNextWave(false);
      g.update(1 / 30);
    }
    ui.simulating = false;
    const R = g.result || {};
    return { n, hero: !!job.hero, boost: !!job.boost, mono: mono || null, rank: job.rank || 0, seed: job.seed, win: !!R.victory, stars: R.victory ? R.stars : 0,
      obj: R.obj ? R.obj.map(Boolean) : null, time: g.time, wave: g.wave, waves: g.totalWaves, lives: g.lives, maxLives: g.maxLives, money: Math.round(g.money), earned: Math.round(g.stats.earned),
      towers: g.towers.map((t) => t.type + t.level), timeout: !g.over };
  }, job);
}
async function winShard() {
  const jobs = JSON.parse(fs.readFileSync(args[0], 'utf8')), out = [];
  const { b, p } = await page();
  for (const job of jobs) { out.push(await playOne(p, job).catch((e) => ({ ...job, error: e.message }))); process.stderr.write('.'); }
  await b.close(); fs.writeFileSync(args[1], JSON.stringify(out));
}
// Répartit les essais sur 4 processus Chromium
async function runJobs(jobs) {
  const { spawn } = require('child_process'), os = require('os');
  const K = Math.min(+(process.env.PAR || 4), jobs.length), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bal-'));
  const parts = Array.from({ length: K }, () => []); jobs.forEach((j, i) => parts[i % K].push(j));
  await Promise.all(parts.map((part, i) => new Promise((res) => {
    const fi = path.join(dir, `in${i}.json`), fo = path.join(dir, `out${i}.json`); fs.writeFileSync(fi, JSON.stringify(part));
    const c = spawn(process.execPath, [__filename, 'win-shard', fi, fo], { stdio: ['ignore', 'ignore', 'inherit'], env: process.env });
    c.on('exit', res);
  })));
  const res = []; for (let i = 0; i < K; i++) { try { res.push(...JSON.parse(fs.readFileSync(path.join(dir, `out${i}.json`), 'utf8'))); } catch (e) { console.error('lot ' + i + ' perdu'); } }
  return res;
}
const snapsOf = () => { try { return JSON.parse(fs.readFileSync(process.env.SNAP || path.join(__dirname, '..', '.snaps.json'), 'utf8')); } catch (e) { return {}; } };
async function win() {
  const levels = parseLevels(args[0]), tries = +(args[1] || 8), mode = args[2] || '';
  const snaps = snapsOf(), jobs = [];
  for (const n of levels) for (let s = 1; s <= tries; s++) {
    const hero = mode === 'hero';
    let snap = process.env.SNAPKEY ? snaps[process.env.SNAPKEY] : snaps[n + (hero ? 'h' : '')] || snaps[n];
    // Renaissance : château reconstruit comme au 1er passage, mais tous les talents (points rendus puis replacés)
    if (process.env.TALENTKEY && snaps[process.env.TALENTKEY]) snap = { ...snap, talents: snaps[process.env.TALENTKEY].talents };
    jobs.push({ n, seed: s, snap, hero, boost: mode === 'boost', rank: mode.startsWith('rank') ? +mode.slice(4) : 0, skill: process.env.SKILL || 'mid' });
  }
  const res = await runJobs(jobs);
  const C = await import(path.resolve(__dirname, '../js/config.js'));
  console.log(`\n| Niveau | Victoires | 3 étoiles | Étoiles moy. | Durée moy. (min) | PV perdus moy. | Pièces restantes moy. |`);
  console.log('|---|---|---|---|---|---|---|');
  for (const n of levels) {
    const r = res.filter((x) => x.n === n && !x.error), w = r.filter((x) => x.win), L = C.LEVELS[n - 1];
    const avg = (a, f) => (a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : NaN);
    console.log(`| ${L.id}${L.boss ? ' (boss)' : ''} | ${fmt((w.length / r.length) * 100)} % | ${fmt((r.filter((x) => x.stars >= 3).length / r.length) * 100)} % | ${fmt(avg(r, (x) => x.stars), 1)} | ${fmt(avg(r, (x) => x.time / 60), 1)} | ${fmt(avg(r, (x) => x.maxLives - x.lives), 1)} | ${fmt(avg(w, (x) => x.money))} |`);
  }
  const errs = res.filter((x) => x.error); if (errs.length) console.log(`\n${errs.length} essai(s) en erreur : ${errs[0].error}`);
  save(res);
  return res;
}
async function mono() {
  const levels = parseLevels(args[0]), types = (args[1] || '').split(',').filter(Boolean);
  const C = await import(path.resolve(__dirname, '../js/config.js')), snaps = snapsOf(), jobs = [];
  for (const n of levels) for (const t of types.length ? types : C.TOWER_ORDER.filter((x) => x !== 'mine')) if (C.UNLOCKS.towers[t] <= n) jobs.push({ n, seed: 1, snap: snaps[n], mono: t });
  const res = await runJobs(jobs);
  console.log('\n| Niveau | ' + C.TOWER_ORDER.filter((x) => x !== 'mine').map((t) => C.TOWER_SHORT[t]).join(' | ') + ' |');
  console.log('|---|' + C.TOWER_ORDER.filter((x) => x !== 'mine').map(() => '---|').join(''));
  for (const n of levels) console.log(`| ${C.LEVELS[n - 1].id} | ` + C.TOWER_ORDER.filter((x) => x !== 'mine').map((t) => { const r = res.find((x) => x.n === n && x.mono === t); return !r ? '' : r.error ? 'err' : r.win ? `${r.stars}*` : 'perdu'; }).join(' | ') + ' |');
  save(res);
  return res;
}

// ============================================================================ vérification des règles des tourelles
// À partir des résultats de « dps » (et de « flux » pour les rôles) : gains par niveau, rentabilité des améliorations,
// écart entre les 2 branches, pic du niveau 5, DPS par pièce selon le prix. Lit --json des commandes précédentes :
//   node tools/balance.cjs check dps.json [flux.json]
// Mesure principale : DPS mono-cible pour les armes à une cible, DPS sur un groupe pour les armes de zone.
const ZONE = ['rocket', 'tesla', 'plasma', 'mine'];
async function check() {
  const C = await import(path.resolve(__dirname, '../js/config.js'));
  const rows = JSON.parse(fs.readFileSync(args[0], 'utf8')), by = {};
  for (const r of rows) (by[r.type] = by[r.type] || {})[r.id] = r;
  const P = (r) => Math.cbrt(Math.max(1, r.mono) * Math.max(1, r.groupe) * Math.max(1, r.blinde));
  const M = (t, r) => (ZONE.includes(t) ? r.groupe : (r.mono + r.boss) / 2);
  let bad = 0; const flag = (c) => { if (!c) bad++; return c ? '' : ' ✗'; };
  console.log('| Tourelle | Gain niv. 2 / 3 (≥ 30 %) | Amélioration / tourelle neuve (80-120 %) | Gain niv. 4 A / B (≥ 30 %) | Pic niv. 5 A / B (≥ 50 %) | Écart des branches niv. 4 / 5 (≤ 10 %) |');
  console.log('|---|---|---|---|---|---|');
  for (const t of C.TOWER_ORDER) {
    const b = by[t]; if (!b) continue;
    const g = (a, c, f = P) => (f(c) / f(a) - 1) * 100;
    const m = (r) => M(t, r), base = m(b['1']) / b['1'].cost;
    const u2 = ((m(b['2']) - m(b['1'])) / (b['2'].cost - b['1'].cost) / base) * 100, u3 = ((m(b['3']) - m(b['2'])) / (b['3'].cost - b['2'].cost) / base) * 100;
    const gap = (x, y) => (Math.max(P(x), P(y)) / Math.min(P(x), P(y)) - 1) * 100;
    const sup = t === 'cryo';   // soutien : effet visible (ralenti, gel, fragilité) plutôt que DPS
    const c1 = `${fmt(g(b['1'], b['2'], m))} / ${fmt(g(b['2'], b['3'], m))} %` + (sup ? '' : flag(g(b['1'], b['2'], m) >= 30 && g(b['2'], b['3'], m) >= 30));
    const c2 = sup ? 'soutien' : `${fmt(u2)} / ${fmt(u3)} %` + flag(u2 >= 80 && u2 <= 120 && u3 >= 80 && u3 <= 120);
    const c3 = sup ? 'effets' : `${fmt(g(b['3'], b['4A']))} / ${fmt(g(b['3'], b['4B']))} %` + flag(g(b['3'], b['4A']) >= 30 && g(b['3'], b['4B']) >= 30);
    const c4 = sup ? 'effets' : `${fmt(g(b['4A'], b['5A']))} / ${fmt(g(b['4B'], b['5B']))} %` + flag(g(b['4A'], b['5A']) >= 50 && g(b['4B'], b['5B']) >= 50);
    const c5 = sup ? `${fmt(gap(b['4A'], b['4B']))} / ${fmt(gap(b['5A'], b['5B']))} % (soutien)` : `${fmt(gap(b['4A'], b['4B']))} / ${fmt(gap(b['5A'], b['5B']))} %` + flag(gap(b['4A'], b['4B']) <= 10 && gap(b['5A'], b['5B']) <= 10);
    console.log(`| ${C.TOWERS[t].name} | ${c1} | ${c2} | ${c3} | ${c4} | ${c5} |`);
  }
  // prix : une tourelle plus chère ne doit pas être plus de 15 % plus rentable (même famille, niveau 1)
  console.log('\nDPS par pièce au niveau 1, par prix croissant (mono pour les armes à une cible, groupe pour la zone ; mine et cryo à part) :');
  for (const fam of [['assault', 'smg', 'shotgun', 'sniper', 'minigun', 'laser', 'drone'], ['rocket', 'tesla', 'plasma']]) {
    const list = fam.map((t) => ({ t, c: by[t]['1'].cost, v: (M(t, by[t]['1']) / by[t]['1'].cost) * 100 })).sort((a, c) => a.c - c.c);
    let line = '';
    list.forEach((x, i) => { const cheaper = list.slice(0, i).filter((y) => y.c < x.c), lim = cheaper.length ? Math.min(...cheaper.map((y) => y.v)) * 1.15 : Infinity; line += `${C.TOWER_SHORT[x.t]} ${x.c} : ${fmt(x.v, 1)}${flag(x.v <= lim + 1e-9)}  ·  `; });
    console.log('  ' + line);
  }
  if (args[1]) {   // rôles : chaque tourelle doit être LA meilleure réponse dans au moins une situation
    const fl = JSON.parse(fs.readFileSync(args[1], 'utf8')); addPoly(fl);
    const cols = [...THREATS.map((x) => x[0]), 'polyvalence'], wins = {};
    const win = (t, label) => (wins[t] = wins[t] || []).push(label);
    for (const [lv, perSlot] of [['1', false], ['3', false], ['5', true]]) {
      const sub = fl.filter((r) => r.id.startsWith(lv));
      // branches Mk II (Renaissance) exclues ; la mine (emplacements à part) n'enlève de rôle à personne, mais peut en avoir
      for (const n of cols) {
        if (perSlot && n === 'polyvalence') continue;
        const val = (r) => (perSlot ? r[n] : r[n] / r.cost), pool = sub.filter((r) => !r.id.endsWith('C'));
        const best = pool.filter((r) => r.type !== 'mine').reduce((a, r) => (val(r) > val(a) ? r : a)), bestAll = pool.reduce((a, r) => (val(r) > val(a) ? r : a));
        const label = `${n} (niv. ${lv}, ${perSlot ? 'par emplacement' : 'par pièce'})`;
        if (val(best) > 0) win(best.type, label); if (bestAll.type === 'mine' && val(bestAll) > 0) win('mine', label);
      }
    }
    // banc fixe : DPS le plus élevé par emplacement (cible unique, groupe, blindé, boss) aux niveaux 3 et 5 (hors mine et Mk II)
    for (const lv of ['3', '5']) for (const n of ['mono', 'groupe', 'blinde', 'boss']) { const sub = rows.filter((r) => r.id.startsWith(lv) && r.type !== 'mine' && !r.id.endsWith('C')); const best = sub.reduce((a, r) => (r[n] > a[n] ? r : a)); win(best.type, `${n === 'blinde' ? 'blindé' : n} immobile (niv. ${lv}, par emplacement)`); }
    console.log('\nMeilleure réponse (rôle) :');
    for (const t of C.TOWER_ORDER) console.log(`  ${C.TOWERS[t].name} : ${(wins[t] || ['aucune']).join(', ')}${flag(!!wins[t])}`);
  }
  console.log(bad ? `\n${bad} règle(s) non respectée(s)` : '\nToutes les règles des tourelles sont respectées');
}

// ============================================================================ lissage de la courbe (Node)
// Calcule CAMPAIGN.tune : pour chaque niveau normal, le coefficient de PV qui place son « DPS requis au pic » sur une
// courbe lisse : +STEP par niveau dans un monde, autour de la moyenne actuelle du monde (le niveau général de chaque
// monde se règle ensuite avec CAMPAIGN.hpWorld, d'après les simulations). Niveaux de boss : 1.
//   node tools/balance.cjs tune [--write]
async function tune() {
  const STEP = 1.07, write = args.includes('--write');
  const root = 'file://' + path.resolve(__dirname, '..') + '/js/';
  const C = await import(root + 'config.js');
  const cur = C.CAMPAIGN.tune.slice();
  const res = await waves.call(null, true);
  const need = res.map((r, i) => r.peakNeed / (cur[i] || 1));   // sans le lissage actuel
  const tuneOut = cur.map(() => 1);
  for (let w = 0; w < C.WORLDS.length; w++) {
    const idx = Array.from({ length: C.PER_WORLD - 1 }, (_, i) => w * C.PER_WORLD + i);
    const base = Math.exp(idx.reduce((a, n, i) => a + Math.log(need[n]) - i * Math.log(STEP), 0) / idx.length);
    idx.forEach((n, i) => { tuneOut[n] = Math.max(0.5, Math.min(2, (base * STEP ** i) / need[n])); });
  }
  const line = '  tune: [' + tuneOut.map((v) => +v.toFixed(3)).join(', ') + '],';
  console.log(line);
  if (write) {
    const f = path.resolve(__dirname, '../js/config.js'); let src = fs.readFileSync(f, 'utf8');
    src = src.replace(/  tune: (Array\(80\)\.fill\(1\)|\[[^\]]*\]),/, line); fs.writeFileSync(f, src); console.log('config.js mis à jour');
  }
}

const run = { dps, waves, flux, win, mono, check, tune, 'win-shard': winShard };
if (!run[cmd]) { console.error('commande inconnue : ' + cmd); process.exit(1); }
run[cmd]().catch((e) => { console.error(e); process.exit(1); });
