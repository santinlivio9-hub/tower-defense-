// Monétisation : une interface unique pour tout le jeu.
//   showRewardedAd(reason)  → true si la récompense doit être donnée (pub vue jusqu'au bout, ou bonus gratuit « Sans pubs »)
//   buy(productId)          → true si l'achat est validé (récompense déjà créditée)
//   restorePurchases()      → rétablit les achats non consommables (Sans pubs, Pack de démarrage)
//   hasRemoveAds()          → le joueur a acheté « Sans pubs + bonus »
// Version web (GitHub Pages) : SIMULATION. Pub factice de 3 s et achats fictifs, rien n'est facturé.
// Apps Android / iOS (Capacitor) : @capacitor-community/admob (pubs récompensées uniquement, identifiants de TEST
// Google par défaut, pubs non personnalisées tant que le joueur n'a pas consenti) et cordova-plugin-purchase.
// Les pubs sont toujours proposées par un bouton : jamais de pub imposée. Plafond : MONETIZATION.adsPerDay par jour.
import { MONETIZATION as M } from './config.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toDateString();
export const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
export const platform = () => (window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web');

export class Monetization {
  constructor(save) {
    this.save = save; this.ready = false; this.busy = false; this.npa = true; this.store = null; this.listeners = new Set();
  }
  get admob() { return isNative() && window.Capacitor.Plugins ? window.Capacitor.Plugins.AdMob : null; }
  product(id) { return M.products.find((p) => p.id === id); }
  // prix affiché : celui du store dans les apps (devise locale), sinon le prix indicatif de la config
  price(id) {
    try { const p = this.store && this.store.get(id); if (p && p.pricing && p.pricing.price) return p.pricing.price; } catch (e) { /* prix indicatif */ }
    return (this.product(id) || {}).price || '';
  }
  owns(id) { return this.save.data.iap.owned.includes(id); }
  hasRemoveAds() { return this.owns('remove_ads'); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  changed() { for (const f of this.listeners) { try { f(); } catch (e) { /* ignore */ } } }

  // ------------------------------------------------------------------ démarrage (apps uniquement)
  // 1er lancement : fenêtre de consentement RGPD (Google UMP), puis demande ATT sur iOS. Pubs non personnalisées
  // par défaut (npa) : elles ne deviennent personnalisées que si le joueur a donné son accord.
  async init() {
    if (!isNative()) { this.ready = true; return; }
    const A = this.admob;
    if (A) {
      try {
        await A.initialize({ initializeForTesting: M.admob.testing });
        let info = await A.requestConsentInfo({});
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') info = await A.showConsentForm();
        this.npa = !(info && info.status === 'OBTAINED');   // personnalisées seulement avec un accord explicite
        this.save.data.privacy.asked = true; this.save.persist();
        if (platform() === 'ios') {
          const st = await A.trackingAuthorizationStatus();
          if (st && st.status === 'notDetermined') await A.requestTrackingAuthorization();
          const st2 = await A.trackingAuthorizationStatus(); if (!(st2 && st2.status === 'authorized')) this.npa = true;
        }
      } catch (e) { /* pas de pub disponible : les boutons « pub » se désactivent */ }
    }
    await this.initStore();
    this.ready = true; this.changed();
  }
  // Paramètres → « Confidentialité des pubs » : rouvre le formulaire de consentement (obligatoire pour l'UMP)
  async privacyOptions() {
    const A = this.admob; if (!A) return false;
    try { await A.showPrivacyOptionsForm(); return true; } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ pubs récompensées
  adsLeft() { const a = this.save.data.ads; return Math.max(0, M.adsPerDay - (a.day === today() ? a.n : 0)); }
  canReward() { return !this.busy && this.adsLeft() > 0; }
  count() { const a = this.save.data.ads; if (a.day !== today()) { a.day = today(); a.n = 0; } a.n++; this.save.persist(); this.changed(); }
  async showRewardedAd(reason = '') {
    if (!this.canReward()) return false;
    this.busy = true;
    try {
      let ok;
      if (this.hasRemoveAds()) ok = true;                          // « Sans pubs » : le bonus est gratuit, sans pub
      else if (!isNative()) ok = await this.fakeAd(reason);         // version web : pub factice de 3 s
      else ok = await this.nativeAd();
      if (ok) this.count();
      return ok;
    } catch (e) { return false; } finally { this.busy = false; }
  }
  async nativeAd() {
    const A = this.admob; if (!A) return false;
    const adId = platform() === 'ios' ? M.admob.rewardedIos : M.admob.rewardedAndroid;
    await A.prepareRewardVideoAd({ adId, isTesting: M.admob.testing, npa: this.npa });
    // récompense seulement si la pub a été regardée jusqu'au bout (évènement « Rewarded »), rien si elle est fermée avant
    let got = false; const hs = [];
    const closed = new Promise((res) => {
      A.addListener('onRewardedVideoAdReward', () => { got = true; }).then((h) => hs.push(h));
      A.addListener('onRewardedVideoAdDismissed', () => res()).then((h) => hs.push(h));
      A.addListener('onRewardedVideoAdFailedToShow', () => res()).then((h) => hs.push(h));
    });
    try { const r = await A.showRewardVideoAd(); if (r && r.amount != null) got = true; await Promise.race([closed, wait(1500)]); }
    finally { for (const h of hs) try { h.remove(); } catch (e) { /* ignore */ } }
    return got;
  }
  // Pub factice (web) : 3 s, puis la récompense ; « Fermer » avant la fin = pas de récompense
  fakeAd(reason) {
    return new Promise((resolve) => {
      const s = M.webAdSeconds, ov = el('div', 'fakead', `<div class="fa-box"><small>PUB (simulation de la version web)</small><b>Brainrot TD</b><p></p><div class="fa-bar"><i></i></div><span class="fa-t">${s}</span><button class="btn sm ghost fa-close">Fermer</button></div>`);
      ov.querySelector('p').textContent = reason ? `Récompense : ${reason}` : 'Merci de soutenir le jeu !';
      document.body.append(ov);
      requestAnimationFrame(() => { ov.classList.add('on'); ov.querySelector('.fa-bar i').style.transitionDuration = s + 's'; ov.querySelector('.fa-bar i').style.width = '100%'; });
      let left = s, done = false;
      const end = (ok) => { if (done) return; done = true; clearInterval(t); ov.remove(); resolve(ok); };
      const t = setInterval(() => { left--; ov.querySelector('.fa-t').textContent = Math.max(0, left); if (left <= 0) end(true); }, 1000);
      ov.querySelector('.fa-close').onclick = () => end(false);
    });
  }

  // ------------------------------------------------------------------ achats intégrés
  async initStore() {
    for (let i = 0; i < 50 && !window.CdvPurchase; i++) await wait(100);   // le plugin Cordova se charge après la page
    const C = window.CdvPurchase; if (!C) return;
    const { store, ProductType, Platform } = C, pf = platform() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
    this.store = store;
    store.register(M.products.map((p) => ({ id: p.id, type: p.type === 'consumable' ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE, platform: pf })));
    store.when()
      .approved((tx) => { this.credit(tx); tx.finish(); })
      .productUpdated(() => { this.syncOwned(); this.changed(); });
    try { await store.initialize([pf]); } catch (e) { /* store indisponible : boutons d'achat désactivés */ }
    this.syncOwned();
  }
  // crédite une transaction une seule fois (identifiant gardé dans la sauvegarde)
  credit(tx) {
    const d = this.save.data, key = tx.transactionId || '';
    if (key && d.iap.orders.includes(key)) return;
    for (const p of tx.products || []) this.grant(p.id);
    if (key) { d.iap.orders.push(key); if (d.iap.orders.length > 200) d.iap.orders.splice(0, d.iap.orders.length - 200); }
    this.save.persist(); this.changed();
    if (this.onGrant) this.onGrant(tx.products && tx.products[0] && tx.products[0].id);
  }
  syncOwned() {
    if (!this.store) return;
    const d = this.save.data; let ch = false;
    for (const p of M.products) if (p.type !== 'consumable') { const sp = this.store.get(p.id); if (sp && sp.owned && !d.iap.owned.includes(p.id)) { d.iap.owned.push(p.id); ch = true; } }
    if (ch) this.save.persist();
  }
  // contenu d'un produit : gemmes, pièces, coffre, boosts ; non consommable → marqué possédé
  grant(id) {
    const p = this.product(id); if (!p) return;
    const d = this.save.data, first = p.type === 'consumable' || !d.iap.owned.includes(id);
    if (p.type !== 'consumable' && !d.iap.owned.includes(id)) d.iap.owned.push(id);
    if (p.pass) { this.save.unlockPremium(); return; }   // pass premium de la saison en cours
    if (first) this.save.grant({ gems: p.gems, coins: p.coins, chest: p.chest, boosts: p.boosts });
  }
  canBuy(id) { const p = this.product(id); return !!p && !this.busy && (p.type === 'consumable' || !this.owns(id)) && (!isNative() || !!this.store); }
  async buy(id) {
    if (!this.canBuy(id)) return false;
    this.busy = true;
    try {
      if (!isNative()) { const ok = await this.fakeBuy(this.product(id)); if (ok) { this.grant(id); this.save.persist(); this.changed(); } return ok; }
      const sp = this.store.get(id), offer = sp && sp.getOffer(); if (!offer) return false;
      const before = this.save.data.iap.orders.length, err = await offer.order();
      if (err) return false;
      for (let i = 0; i < 100 && this.save.data.iap.orders.length === before; i++) await wait(100);   // attend « approved »
      return this.save.data.iap.orders.length > before;
    } catch (e) { return false; } finally { this.busy = false; }
  }
  // Achat fictif (web) : confirmation explicite, rien n'est facturé
  fakeBuy(p) {
    return new Promise((resolve) => {
      const ov = el('div', 'fakead on', `<div class="fa-box"><small>ACHAT FICTIF (version web)</small><b></b><p>Aucun paiement : cet achat est une simulation pour tester le jeu.</p><div class="fa-btns"><button class="btn sm ghost fa-no">Annuler</button><button class="btn sm green fa-yes">Simuler l'achat · ${p.price}</button></div></div>`);
      ov.querySelector('b').textContent = p.name;
      document.body.append(ov);
      ov.querySelector('.fa-no').onclick = () => { ov.remove(); resolve(false); };
      ov.querySelector('.fa-yes').onclick = () => { ov.remove(); resolve(true); };
    });
  }
  async restorePurchases() {
    if (!isNative()) return this.save.data.iap.owned.length;   // web : rien à rétablir côté store
    if (!this.store) return 0;
    try { await this.store.restorePurchases(); } catch (e) { /* réessayer plus tard */ }
    this.syncOwned(); this.changed();
    return this.save.data.iap.owned.length;
  }
}
