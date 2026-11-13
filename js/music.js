// Musique de fond légère, générée avec la Web Audio API (aucun fichier).
// Boucle de 4 accords ; intensité 0 = menus (doux), 1 = vague en cours, 2 = boss (batterie, basse plus présente).
import { MUSIC } from './config.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Music {
  constructor(audio, settings) {
    this.audio = audio; this.settings = settings;
    this.on = false; this.level = 0; this.step = 0; this.next = 0; this.timer = null; this.gain = null;
  }
  ensure() {
    const a = this.audio; if (!a.ctx) return false;
    if (!this.gain) { this.gain = a.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(a.master); }
    return true;
  }
  volume() { return this.settings.music === false || this.settings.muted ? 0 : MUSIC.volume * [0.55, 0.8, 1][this.level]; }
  apply() { if (!this.gain) return; const t = this.audio.ctx.currentTime; this.gain.gain.cancelScheduledValues(t); this.gain.gain.setTargetAtTime(this.volume(), t, 0.4); }
  setLevel(l) { if (l === this.level) return; this.level = l; this.apply(); }
  start() {
    if (!this.ensure()) return;
    if (!this.on) { this.on = true; this.next = this.audio.ctx.currentTime + 0.1; this.timer = setInterval(() => this.tick(), 60); }
    this.apply();
  }
  stop() { this.on = false; clearInterval(this.timer); this.timer = null; if (this.gain) this.gain.gain.setTargetAtTime(0, this.audio.ctx.currentTime, 0.2); }
  // planifie les notes avec un peu d'avance (pas de saccade même si la page est chargée)
  tick() {
    const ctx = this.audio.ctx; if (!ctx || ctx.state !== 'running' || this.volume() === 0) { if (ctx) this.next = Math.max(this.next, ctx.currentTime); return; }
    const spb = 60 / (MUSIC.bpm + (this.level === 2 ? MUSIC.bossBpmAdd : 0)) / 2;   // croches
    while (this.next < ctx.currentTime + 0.25) { this.note(this.step, this.next, spb); this.step = (this.step + 1) % 64; this.next += spb; }
  }
  voice(type, f, t, dur, g, attack = 0.01) {
    const ctx = this.audio.ctx, o = ctx.createOscillator(), v = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + attack); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v); v.connect(this.gain); o.start(t); o.stop(t + dur + 0.05);
  }
  hit(t, f0, f1, dur, g, noise = false) {
    const ctx = this.audio.ctx, v = ctx.createGain();
    v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (noise) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(); s.buffer = this.audio.noiseBuf; f.type = 'highpass'; f.frequency.value = f0; s.connect(f); f.connect(v); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); }
    else { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(v); o.start(t); o.stop(t + dur + 0.02); }
    v.connect(this.gain);
  }
  note(step, t, spb) {
    const L = this.level, bar = Math.floor(step / 16) % 4, beat = step % 16;
    const chord = MUSIC.chords[bar], root = chord[0];
    // nappe douce : accord tenu sur la mesure
    if (beat === 0) for (const n of chord) this.voice('triangle', midi(n + 12), t, spb * 15, 0.025, 0.25);
    // basse
    if (beat % 4 === 0 || (L === 2 && beat % 2 === 0)) this.voice(L === 2 ? 'sawtooth' : 'triangle', midi(root - 12), t, spb * 1.6, L === 2 ? 0.05 : 0.07);
    // arpège joyeux (pendant les vagues)
    if (L >= 1 && beat % 2 === 0) { const n = chord[(beat / 2) % chord.length] + 24; this.voice('square', midi(n), t, spb * 0.8, 0.012); }
    if (L >= 1 && beat % 8 === 6) this.voice('sine', midi(chord[2] + 36), t, spb * 0.5, 0.015);
    // batterie
    if (L >= 1 && beat % 8 === 0) this.hit(t, 120, 45, 0.18, L === 2 ? 0.5 : 0.28);
    if (L === 2 && beat % 8 === 4) this.hit(t, 1800, 0, 0.12, 0.18, true);
    if (L >= 1 && beat % 2 === 1) this.hit(t, 7000, 0, 0.04, L === 2 ? 0.07 : 0.035, true);
  }
}
