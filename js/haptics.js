// Retour haptique : navigator.vibrate (Android) ; sur iPhone, bascule d'un <input switch>
// (clic du Taptic Engine, iOS 18+) + impulsion sub-basse — astuce reprise de Chibi Arsenal.
export class Haptics {
  constructor(settings, audio) { this.settings = settings; this.audio = audio; this.canVibrate = typeof navigator.vibrate === 'function'; this.last = 0; }
  tick() {
    try {
      const label = document.createElement('label'); label.ariaHidden = 'true'; label.style.display = 'none';
      const input = document.createElement('input'); input.type = 'checkbox'; input.setAttribute('switch', '');
      label.appendChild(input); document.head.appendChild(label); label.click(); label.remove();
    } catch (e) { /* ignore */ }
  }
  // strength : 0 = léger (bouton), 1 = moyen, 2 = fort
  pulse(strength = 0) {
    if (!this.settings.haptics) return;
    const now = performance.now(); if (now - this.last < 60) return; this.last = now;
    if (this.canVibrate) { try { navigator.vibrate(strength >= 2 ? [30, 40, 40] : strength === 1 ? 22 : 10); } catch (e) { /* ignore */ } return; }
    this.tick();
    if (strength > 0) this.audio.thump(strength * 0.6);
  }
}
