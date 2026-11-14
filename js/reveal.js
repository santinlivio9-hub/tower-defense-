// Cinématiques de progression : nouvelle arme débloquée, récompense de fin de monde, transition vers le monde suivant.
// Méthodes ajoutées à la classe UI.
import { TOWERS, WORLDS, SHOP, WORLD_REWARD, UNLOCKS } from './config.js';
import { THEMES } from './maps.js';
import { towerImg } from './sprites.js';
import { computeStats } from './towers.js';
import { icon, gem } from './icons.js';
import { chestSvg } from './loot.js';
import { boostArt } from './boosts.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const Reveal = {
  // NOUVELLE ARME : fond rayonnant, la tourelle tombe et se pose (poussière), stats en gros
  weaponReveal(ids, done) {
    const id = ids[0]; if (!id) { done && done(); return; }
    const cfg = TOWERS[id], st = computeStats(id, 1, null, this.save.mods()), rows = this.statRows(id, st);
    const root = el('div', 'reveal weapon', `<div class="rays"></div><small class="rv-kick">NOUVELLE ARME</small>
      <h2 class="rv-title">${cfg.name} !</h2><div class="rv-drop"><i class="rv-dust"></i></div>
      <div class="rv-stats">${rows.slice(0, 3).map(([k, v]) => `<span><small>${k}</small><b>${v}</b></span>`).join('')}</div>
      <p class="rv-desc">${cfg.desc}</p>`);
    const art = towerImg(id, 150, this.save.data.skin, 3); art.className = 'rv-tower'; $('.rv-drop', root).prepend(art);
    const ok = el('button', 'btn primary big cta', 'Super !'); ok.style.visibility = 'hidden'; root.append(ok);
    this.openOverlay(root, 'full');
    this.audio.play('sheet');
    setTimeout(() => { root.classList.add('landed'); this.audio.play('explosion'); this.audio.play('legendary'); this.haptics.pulse(2); }, 620);
    setTimeout(() => { ok.style.visibility = ''; }, 1300);
    // en partie suivante : bulle « NOUVEAU » sur ce choix du menu radial
    const d = this.save.data; d.hintTowers = [...new Set([...(d.hintTowers || []), id])]; this.save.persist();
    ok.onclick = () => { this.closeOverlay(); this.weaponReveal(ids.slice(1), done); };
  },

  // FIN DE MONDE : grosse récompense (coffre légendaire, skin, boosts, gemmes, améliorations du château offertes)
  async worldReward(wi) {
    const d = this.save.data, W = WORLD_REWARD;
    // skin exclusif de ce boss (débloqué en battant le dernier niveau du monde)
    const skinId = Object.keys(UNLOCKS.skins).find((k) => UNLOCKS.skins[k] === (wi + 1) * 6 + 1), skin = SHOP.skins.find((s) => s.id === skinId);
    const root = el('div', 'reveal world', `<div class="rays"></div><small class="rv-kick">MONDE ${wi + 1} TERMINÉ !</small>
      <h2 class="rv-title">${WORLDS[wi].name}</h2><div class="rv-chest">${chestSvg(W.chest)}</div><div class="rv-cards"></div>`);
    const cards = $('.rv-cards', root), ok = el('button', 'btn primary big cta', 'Continuer'); ok.style.visibility = 'hidden'; root.append(ok);
    this.openOverlay(root, 'full'); this.audio.play('chest'); this.haptics.pulse(2);
    const items = [
      [chestSvg(W.chest), 'Coffre légendaire'],
      ...(skin ? [[towerImg('assault', 64, skin.id, 3).outerHTML, `Skin ${skin.name}`]] : []),
      [Object.keys(W.boosts).map((b) => boostArt(b)).slice(0, 2).join(''), `${Object.values(W.boosts).reduce((a, b) => a + b, 0)} boosts`],
      [gem('big'), `+${W.gems} gemmes`],
      [icon('castle'), `${W.castleFree} améliorations du château offertes`],
    ];
    await wait(700);
    for (const [art, txt] of items) {
      if (!root.isConnected) return;
      cards.append(el('div', 'rv-card', `<span>${art}</span><b>${txt}</b>`)); this.audio.play('card'); this.haptics.pulse(1);
      await wait(420);
    }
    ok.style.visibility = '';
    ok.onclick = () => this.worldTransition(wi + 1);
  },
  // Transition « MONDE 2 : DÉSERT TIRAMISU DÉBLOQUÉ », puis panoramique sur le nouveau décor de la carte
  worldTransition(wi) {
    const d = this.save.data; d.pendingWorld = null; this.save.persist();
    if (wi >= WORLDS.length) { this.closeOverlay(); this.show('world'); return; }
    const th = THEMES[WORLDS[wi].theme];
    const root = el('div', 'reveal trans', `<div class="rv-sky" style="--c1:${th.g1};--c2:${th.g2};--c3:${th.g3}"></div><div class="rays"></div>
      <div class="rv-sign"><small>MONDE ${wi + 1}</small><b>${WORLDS[wi].name}</b><span>DÉBLOQUÉ !</span></div>`);
    const ok = el('button', 'btn primary big cta', icon('map') + 'Voir la carte'); root.append(ok);
    this.openOverlay(root, 'full'); this.audio.play('legendary'); this.haptics.pulse(2);
    ok.onclick = () => { this.closeOverlay(); this.panToWorld = wi; this.show('world'); };
  },
  // à l'ouverture de la carte ou de l'accueil : récompense de fin de monde pas encore montrée
  checkPendingWorld() {
    const d = this.save.data;
    if (d.pendingWorld != null && !$('#overlay.show')) { const wi = d.pendingWorld; setTimeout(() => this.worldReward(wi), 300); return true; }
    return false;
  },
};
