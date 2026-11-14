// Musique de fond procédurale (Web Audio, aucun fichier).
// Un morceau = gamme, grille d'accords, instruments, rythmes (voir MUSIC.songs dans config.js). La mélodie est
// composée une fois pour toutes à partir d'une graine : chaque monde a SON thème, toujours le même.
// Couches : nappe + basse + mélodie en continu ; percussions et arpège en plus pendant les vagues (fondu).
// Jingles de victoire et de défaite par-dessus (la boucle s'efface le temps du jingle).
import { MUSIC } from './config.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Compose la mélodie d'un morceau : 4 mesures de 16 pas, la 3e reprend le rythme de la 1re (motif)
export function compose(song) {
  const r = rng(song.seed || 7), S = song.scale, steps = [];
  const rhythm = () => Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? r() < 0.8 : i % 2 === 0 ? r() < song.density : r() < song.density * 0.35));
  const rh = [rhythm(), rhythm(), null, rhythm()]; rh[2] = rh[0];
  let deg = 4;
  for (let bar = 0; bar < 4; bar++) {
    const chord = song.prog[bar];
    for (let i = 0; i < 16; i++) {
      if (!rh[bar][i]) { steps.push(null); continue; }
      if (i % 4 === 0) deg = chord + [0, 2, 4][Math.floor(r() * 3)];          // temps forts : note de l'accord
      else deg += [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];                 // ailleurs : petits pas dans la gamme
      deg = Math.max(-2, Math.min(11, deg));
      const len = rh[bar].slice(i + 1, i + 4).indexOf(true);
      steps.push({ deg, len: len < 0 ? 3 : len + 1 });
    }
  }
  return steps;
}
// degré de la gamme -> note MIDI
const note = (song, deg, oct = 0) => { const S = song.scale, n = S.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n; return song.root + S[i] + 12 * (o + oct); };

export class Music {
  constructor(audio, settings) {
    this.audio = audio; this.settings = settings;
    this.on = false; this.song = null; this.want = 'menu'; this.layer = 0; this.step = 0; this.next = 0; this.timer = null;
    this.bus = null; this.loopGain = null; this.drumGain = null; this.duckT = 0;
    this.melodies = {};
  }
  ensure() {
    const a = this.audio; if (!a.ctx) return false;
    if (!this.bus) {
      const c = a.ctx;
      this.bus = c.createGain(); this.bus.gain.value = 0; this.bus.connect(a.out);
      this.loopGain = c.createGain(); this.loopGain.connect(this.bus);
      this.drumGain = c.createGain(); this.drumGain.gain.value = 0; this.drumGain.connect(this.loopGain);
      this.melGain = c.createGain(); this.melGain.connect(this.loopGain);
    }
    return true;
  }
  volume() { return this.settings.muted ? 0 : (this.settings.musicVol ?? 0.6) * MUSIC.volume; }
  apply() { if (!this.bus) return; const t = this.audio.ctx.currentTime; this.bus.gain.cancelScheduledValues(t); this.bus.gain.setTargetAtTime(this.volume(), t, 0.3); }
  // morceau voulu (menu, thème du monde, boss) et couche : 0 = calme, 1 = vague en cours (percussions + arpège)
  set(song, layer = 0) {
    if (!MUSIC.songs[song]) song = 'menu';
    this.want = song;
    if (layer !== this.layer && this.drumGain) { const t = this.audio.ctx.currentTime; this.drumGain.gain.setTargetAtTime(layer ? 1 : 0, t, layer ? 0.4 : 1.2); this.melGain.gain.setTargetAtTime(layer ? 1 : 0.75, t, 0.8); }
    this.layer = layer;
  }
  start() {
    if (!this.ensure()) return;
    if (!this.on) { this.on = true; this.next = this.audio.ctx.currentTime + 0.1; this.timer = setInterval(() => this.tick(), 60); }
    this.apply();
  }
  stop() { this.on = false; clearInterval(this.timer); this.timer = null; if (this.bus) this.bus.gain.setTargetAtTime(0, this.audio.ctx.currentTime, 0.2); }
  // planifie les notes avec un peu d'avance (pas de saccade même si la page est chargée)
  tick() {
    const ctx = this.audio.ctx; if (!ctx || ctx.state !== 'running' || this.volume() === 0) { if (ctx) this.next = Math.max(this.next, ctx.currentTime); return; }
    if (this.next < ctx.currentTime - 0.5) this.next = ctx.currentTime + 0.05;   // retour d'arrière-plan : on repart proprement
    while (this.next < ctx.currentTime + 0.25) {
      // changement de morceau : au début d'une mesure, avec un court fondu
      if (this.step % 16 === 0 && this.want !== (this.song && this.song.id)) {
        const s = MUSIC.songs[this.want]; this.song = { id: this.want, ...s }; this.step = 0;
        if (!this.melodies[this.want]) this.melodies[this.want] = compose(this.song);
        this.loopGain.gain.cancelScheduledValues(this.next); this.loopGain.gain.setValueAtTime(0.0001, this.next); this.loopGain.gain.exponentialRampToValueAtTime(1, this.next + 0.6);
      }
      const spb = 60 / this.song.bpm / 4;   // double-croches
      this.play(this.step, this.next, spb);
      this.step = (this.step + 1) % 128; this.next += spb * (this.song.swing && this.step % 2 ? 1 + this.song.swing : this.song.swing && this.step % 2 === 0 ? 1 - this.song.swing : 1);
    }
  }
  // ----------------------------------------------------------------- instruments
  voice(dest, type, f, t, dur, g, o = {}) {
    const ctx = this.audio.ctx, osc = ctx.createOscillator(), v = ctx.createGain();
    g *= MUSIC.mix.tonal; osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(osc.frequency); l.start(t + 0.08); l.stop(t + dur + 0.1); }
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(f * o.slide, t + dur);
    const a = o.attack || 0.01;
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, dur));
    let node = osc;
    if (o.cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.cut, t); fl.Q.value = o.q || 1; if (o.sweep) fl.frequency.exponentialRampToValueAtTime(o.cut * o.sweep, t + dur); osc.connect(fl); node = fl; }
    node.connect(v); v.connect(dest); osc.start(t); osc.stop(t + dur + 0.05);
  }
  drum(kind, t, g) {
    const ctx = this.audio.ctx, d = this.drumGain; g *= MUSIC.mix.drums;
    const noise = (f0, type, dur, gain, q = 1) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain(); s.buffer = this.audio.noiseBuf; f.type = type; f.frequency.value = f0; f.Q.value = q; v.gain.setValueAtTime(gain, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(v); v.connect(d); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); };
    const tone = (f0, f1, dur, gain, type = 'sine') => { const o = ctx.createOscillator(), v = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); v.gain.setValueAtTime(gain, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(v); v.connect(d); o.start(t); o.stop(t + dur + 0.02); };
    if (kind === 'k') tone(130, 42, 0.22, 0.55 * g);
    else if (kind === 's') { noise(1800, 'bandpass', 0.14, 0.32 * g, 0.8); tone(220, 160, 0.08, 0.16 * g, 'triangle'); }
    else if (kind === 'h') noise(8000, 'highpass', 0.04, 0.12 * g);
    else if (kind === 'o') noise(7000, 'highpass', 0.18, 0.1 * g);
    else if (kind === 'm') noise(5200, 'bandpass', 0.06, 0.14 * g, 2);                   // shaker
    else if (kind === 't') tone(160, 90, 0.25, 0.32 * g);                                 // tom
    else if (kind === 'c') tone(330, 280, 0.12, 0.26 * g, 'triangle');                    // conga / darbouka
    else if (kind === 'p') { noise(1300, 'bandpass', 0.1, 0.3 * g, 1.5); noise(1300, 'bandpass', 0.1, 0.2 * g, 1.5); }   // clap
    else if (kind === 'b') tone(1600, 1580, 0.3, 0.06 * g, 'sine');                      // clochette
    else if (kind === 'z') tone(880 + Math.random() * 600, 220, 0.12, 0.08 * g, 'square'); // bip électronique
  }
  play(step, t, spb) {
    const s = this.song, bar = Math.floor(step / 16) % 4, i = step % 16, chord = s.prog[bar], L = this.loopGain;
    const I = s.inst;
    // nappe : accord tenu sur la mesure
    if (i === 0) for (const k of [0, 2, 4]) this.voice(L, I.pad, midi(note(s, chord + k, 0)), t, spb * 16, I.padGain ?? 0.02, { attack: 0.35, cut: 2400, detune: k * 4 });
    // basse
    if (s.bass[i] === 'x') this.voice(L, I.bass, midi(note(s, chord, -2)), t, spb * (I.bassLen || 2.2), I.bassGain ?? 0.09, { cut: I.bassCut || 900, sweep: 0.5 });
    else if (s.bass[i] === 'o') this.voice(L, I.bass, midi(note(s, chord + 4, -2)), t, spb * 1.8, (I.bassGain ?? 0.09) * 0.8, { cut: I.bassCut || 900 });
    // mélodie (thème du monde) ; une fois sur deux, une octave plus haut pour varier
    const m = this.melodies[s.id][bar * 16 + i];
    if (m) this.voice(this.melGain, I.lead, midi(note(s, m.deg, (Math.floor(step / 64) % 2 && I.leadUp ? 1 : 0) + (I.leadOct ?? 1))), t, spb * m.len * (I.leadLen || 0.9), I.leadGain ?? 0.04, { attack: I.leadAttack || 0.012, vib: I.vib, cut: I.leadCut, detune: I.leadDetune });
    // couche « vague » : arpège + percussions (le gain de la couche fait le fondu)
    if (s.arp && s.arp[i] === 'x') { const k = [0, 2, 4, 7][(i >> 1) % 4]; this.voice(this.drumGain, I.arp || 'square', midi(note(s, chord + k, 1 + (I.arpOct ?? 0))), t, spb * 0.9, I.arpGain ?? 0.016, { cut: 3200 }); }
    for (const [kind, pat] of Object.entries(s.drums)) { const c = pat[i]; if (c !== '.' && c !== undefined) this.drum(kind, t, c === 'X' ? 1.3 : 1); }
  }
  // Jingle de victoire / défaite : la boucle s'efface, puis revient doucement
  jingle(win) {
    if (!this.ensure() || this.volume() === 0) return;
    const ctx = this.audio.ctx, t = ctx.currentTime + 0.05, J = win ? MUSIC.jingles.victory : MUSIC.jingles.defeat;
    this.loopGain.gain.cancelScheduledValues(t); this.loopGain.gain.setTargetAtTime(0.0001, t, 0.08); this.loopGain.gain.setTargetAtTime(1, t + J.dur, 0.8);
    const g = ctx.createGain(); g.gain.value = 1.6; g.connect(this.bus);
    for (const [n, at, len, type] of J.notes) this.voice(g, type || J.wave, midi(n), t + at, len, J.gain / MUSIC.mix.tonal * 1.6, { attack: 0.01, cut: 5000 });
    for (const [kind, at] of J.drums || []) this.drum(kind, t + at, 1.2);
    // les percussions du jingle passent par la couche « vague » : on l'ouvre le temps du jingle
    if (J.drums) { this.drumGain.gain.cancelScheduledValues(t); this.drumGain.gain.setValueAtTime(1, t); this.drumGain.gain.setTargetAtTime(this.layer ? 1 : 0, t + J.dur, 0.5); }
  }
}
