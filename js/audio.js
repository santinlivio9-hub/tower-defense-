// Sons synthétisés avec la Web Audio API (aucun fichier audio).
export class AudioSys {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null; this.last = {};
  }
  // À appeler sur un geste utilisateur (les navigateurs bloquent l'audio sinon)
  unlock() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp); comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, len);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.applyVolume();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  applyVolume() { if (this.master) this.master.gain.value = this.settings.muted ? 0 : this.settings.volume * 0.6; }
  setMuted(m) { this.settings.muted = m; this.applyVolume(); }
  setVolume(v) { this.settings.volume = v; this.applyVolume(); }

  tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.1, gain = 0.2, delay = 0 }) {
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise({ dur = 0.1, gain = 0.3, f0 = 2000, f1 = f0, q = 1, type = 'lowpass', delay = 0 }) {
    const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  // Impulsion sub-basse (fait vibrer le châssis du téléphone)
  thump(strength = 1) {
    if (!this.ctx || this.settings.muted || this.ctx.state !== 'running') return;
    this.tone({ type: 'sine', f0: 42, f1: 30, dur: 0.09, gain: 0.5 * strength });
  }
  play(name) {
    if (!this.ctx || this.settings.muted || this.ctx.state !== 'running') return;
    const def = SOUNDS[name]; if (!def) return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < (def.gap || 40)) return;
    this.last[name] = now;
    def.fn(this);
  }
}

const SOUNDS = {
  shot_assault: { gap: 55, fn: (a) => { a.noise({ dur: 0.09, gain: 0.32, f0: 3200, f1: 500 }); a.tone({ type: 'square', f0: 260, f1: 70, dur: 0.07, gain: 0.14 }); } },
  shot_smg:     { gap: 45, fn: (a) => { a.noise({ dur: 0.05, gain: 0.2, f0: 5000, f1: 1200, type: 'bandpass' }); a.tone({ type: 'square', f0: 420, f1: 160, dur: 0.04, gain: 0.07 }); } },
  shot_shotgun: { gap: 80, fn: (a) => { a.noise({ dur: 0.25, gain: 0.5, f0: 1800, f1: 150 }); a.tone({ type: 'sawtooth', f0: 150, f1: 40, dur: 0.16, gain: 0.22 }); a.noise({ dur: 0.05, gain: 0.15, f0: 2500, type: 'bandpass', delay: 0.28 }); } },
  shot_sniper:  { gap: 80, fn: (a) => { a.noise({ dur: 0.4, gain: 0.5, f0: 6000, f1: 200 }); a.tone({ type: 'sawtooth', f0: 900, f1: 60, dur: 0.22, gain: 0.2 }); } },
  shot_rocket:  { gap: 80, fn: (a) => { a.noise({ dur: 0.45, gain: 0.3, f0: 300, f1: 2400, type: 'bandpass', q: 0.8 }); a.tone({ type: 'sine', f0: 180, f1: 90, dur: 0.2, gain: 0.18 }); } },
  shot_minigun: { gap: 38, fn: (a) => { a.noise({ dur: 0.04, gain: 0.22, f0: 2600, f1: 700 }); a.tone({ type: 'square', f0: 190, f1: 90, dur: 0.04, gain: 0.08 }); } },
  cryo:         { gap: 120, fn: (a) => { a.noise({ dur: 0.3, gain: 0.14, f0: 5000, f1: 9000, type: 'highpass' }); a.tone({ type: 'sine', f0: 1400, f1: 500, dur: 0.25, gain: 0.07 }); } },
  explosion:    { gap: 70, fn: (a) => { a.noise({ dur: 0.5, gain: 0.6, f0: 1200, f1: 60 }); a.tone({ type: 'sine', f0: 120, f1: 30, dur: 0.4, gain: 0.4 }); } },
  zap:          { gap: 80, fn: (a) => { a.tone({ type: 'sawtooth', f0: 1800, f1: 200, dur: 0.18, gain: 0.14 }); a.noise({ dur: 0.15, gain: 0.15, f0: 6000, type: 'highpass' }); } },
  hit:          { gap: 50, fn: (a) => a.noise({ dur: 0.03, gain: 0.07, f0: 1800, type: 'bandpass', q: 2 }) },
  crit:         { gap: 70, fn: (a) => a.tone({ type: 'triangle', f0: 1300, f1: 1900, dur: 0.07, gain: 0.1 }) },
  death:        { gap: 45, fn: (a) => { a.tone({ type: 'triangle', f0: 520 + Math.random() * 200, f1: 140, dur: 0.14, gain: 0.16 }); a.noise({ dur: 0.08, gain: 0.1, f0: 3000, f1: 600 }); } },
  coin:         { gap: 60, fn: (a) => { a.tone({ type: 'square', f0: 1320, dur: 0.05, gain: 0.05 }); a.tone({ type: 'square', f0: 1760, dur: 0.08, gain: 0.05, delay: 0.05 }); } },
  heal:         { gap: 200, fn: (a) => a.tone({ type: 'sine', f0: 500, f1: 900, dur: 0.2, gain: 0.07 }) },
  place:        { fn: (a) => { a.tone({ type: 'square', f0: 220, f1: 440, dur: 0.08, gain: 0.14 }); a.noise({ dur: 0.08, gain: 0.2, f0: 900, f1: 200 }); } },
  upgrade:      { fn: (a) => [523, 659, 784, 1047].forEach((f, i) => a.tone({ type: 'triangle', f0: f, dur: 0.12, gain: 0.16, delay: i * 0.06 })) },
  legendary:    { fn: (a) => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => a.tone({ type: 'square', f0: f, dur: 0.16, gain: 0.1, delay: i * 0.07 })) },
  sell:         { fn: (a) => { a.tone({ type: 'triangle', f0: 800, f1: 300, dur: 0.15, gain: 0.14 }); a.tone({ type: 'square', f0: 1500, dur: 0.06, gain: 0.05, delay: 0.1 }); } },
  buy:          { fn: (a) => [660, 880, 1320].forEach((f, i) => a.tone({ type: 'square', f0: f, dur: 0.1, gain: 0.09, delay: i * 0.07 })) },
  click:        { gap: 30, fn: (a) => { a.tone({ type: 'sine', f0: 520, f1: 760, dur: 0.06, gain: 0.12 }); a.noise({ dur: 0.025, gain: 0.05, f0: 3000, type: 'highpass' }); } },
  error:        { gap: 150, fn: (a) => { a.tone({ type: 'sawtooth', f0: 160, f1: 110, dur: 0.16, gain: 0.14 }); } },
  wave_start:   { fn: (a) => { a.tone({ type: 'sawtooth', f0: 220, f1: 440, dur: 0.25, gain: 0.12 }); a.tone({ type: 'sawtooth', f0: 330, f1: 660, dur: 0.3, gain: 0.1, delay: 0.12 }); } },
  wave_clear:   { fn: (a) => [659, 784, 988, 1319].forEach((f, i) => a.tone({ type: 'triangle', f0: f, dur: 0.18, gain: 0.14, delay: i * 0.09 })) },
  boss:         { fn: (a) => { a.tone({ type: 'sawtooth', f0: 90, f1: 55, dur: 1.2, gain: 0.3 }); a.tone({ type: 'sawtooth', f0: 135, f1: 80, dur: 1.2, gain: 0.2, delay: 0.3 }); a.noise({ dur: 1.2, gain: 0.25, f0: 200, f1: 900 }); } },
  leak:         { gap: 120, fn: (a) => { a.tone({ type: 'sawtooth', f0: 300, f1: 80, dur: 0.3, gain: 0.22 }); a.noise({ dur: 0.2, gain: 0.25, f0: 500 }); } },
  victory:      { fn: (a) => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => a.tone({ type: 'square', f0: f, dur: 0.22, gain: 0.12, delay: i * 0.13 })) },
  defeat:       { fn: (a) => [392, 349, 311, 196].forEach((f, i) => a.tone({ type: 'sawtooth', f0: f, dur: 0.4, gain: 0.14, delay: i * 0.28 })) },
  combo:        { gap: 60, fn: (a) => [880, 1175, 1568].forEach((f, i) => a.tone({ type: 'triangle', f0: f, dur: 0.09, gain: 0.1, delay: i * 0.045 })) },
  sheet:        { gap: 80, fn: (a) => { a.noise({ dur: 0.12, gain: 0.08, f0: 800, f1: 3000, type: 'bandpass' }); a.tone({ type: 'sine', f0: 300, f1: 520, dur: 0.1, gain: 0.07 }); } },
  tick:         { gap: 35, fn: (a) => a.tone({ type: 'square', f0: 1500, dur: 0.02, gain: 0.03 }) },
  record:       { fn: (a) => [784, 988, 1175, 1568, 1976].forEach((f, i) => a.tone({ type: 'square', f0: f, dur: 0.18, gain: 0.1, delay: i * 0.08 })) },
  boost:        { fn: (a) => { [392, 523, 659, 784, 1047].forEach((f, i) => a.tone({ type: 'sawtooth', f0: f, f1: f * 1.5, dur: 0.14, gain: 0.1, delay: i * 0.05 })); a.noise({ dur: 0.35, gain: 0.2, f0: 600, f1: 6000, type: 'bandpass' }); } },
  chest:        { fn: (a) => { a.noise({ dur: 0.5, gain: 0.3, f0: 300, f1: 5000, type: 'bandpass' }); [523, 784, 1047, 1568].forEach((f, i) => a.tone({ type: 'triangle', f0: f, dur: 0.3, gain: 0.14, delay: 0.1 + i * 0.07 })); } },
  card:         { gap: 60, fn: (a) => { a.noise({ dur: 0.08, gain: 0.12, f0: 2500, type: 'highpass' }); a.tone({ type: 'triangle', f0: 880, f1: 1320, dur: 0.12, gain: 0.1 }); } },
  levelup:      { fn: (a) => [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => a.tone({ type: 'square', f0: f, dur: 0.2, gain: 0.1, delay: i * 0.08 })) },
  star:         { gap: 10, fn: (a) => a.tone({ type: 'triangle', f0: 1200, f1: 2000, dur: 0.2, gain: 0.14 }) },
};
