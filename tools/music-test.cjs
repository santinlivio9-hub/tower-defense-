// Rend chaque morceau hors ligne (OfflineAudioContext) et mesure son niveau : aucun silence, aucune saturation,
// thèmes à peu près aussi forts les uns que les autres. Écrit aussi des fichiers WAV pour les écouter.
//   python3 -m http.server 8123 &   puis   NODE_PATH=$(npm root -g) node tools/music-test.cjs [dossier pour les .wav]
const { chromium } = require('playwright'); const fs = require('fs');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); let bad = 0;
  p.on('pageerror', (e) => { bad++; console.log('ERREUR', e.message); });
  await p.goto('http://localhost:8123/'); await p.waitForTimeout(600);
  const res = await p.evaluate(async () => {
    const { MUSIC } = await import('./js/config.js'), { Music, compose } = await import('./js/music.js'); window.__compose = compose;
    const render = async (fn, secs) => {
      const ctx = new OfflineAudioContext(1, 22050 * secs, 22050);
      const noise = ctx.createBuffer(1, 22050, 22050), d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const outG = ctx.createGain(); outG.connect(ctx.destination);
      const audio = { ctx, out: outG, noiseBuf: noise };
      const m = new Music(audio, { musicVol: 1, muted: false }); m.ensure(); m.bus.gain.value = m.volume();
      fn(m, ctx); const buf = await ctx.startRendering(), x = buf.getChannelData(0);
      let s = 0, pk = 0; for (const v of x) { s += v * v; pk = Math.max(pk, Math.abs(v)); }
      const step = 2, wav = new Int16Array(Math.floor(x.length / step)); for (let i = 0; i < wav.length; i++) wav[i] = Math.max(-1, Math.min(1, x[i * step] * 1.5)) * 32767;
      return { rms: Math.sqrt(s / x.length), pk, wav: Array.from(wav) };
    };
    const out = {};
    for (const id of Object.keys(MUSIC.songs)) {
      for (const layer of [0, 1]) {
        const song = MUSIC.songs[id], spb = 60 / song.bpm / 4, steps = 64, secs = Math.ceil(steps * spb) + 1;
        out[id + (layer ? '+vague' : '')] = await render((m) => { m.set(id, layer); m.song = { id, ...song }; m.melodies[id] = (m.melodies[id] || null); m.drumGain.gain.value = layer; m.melGain.gain.value = layer ? 1 : 0.75; m.loopGain.gain.value = 1;
          const mod = m.constructor; m.melodies[id] = m.melodies[id] || (window.__compose ? window.__compose(m.song) : null); let t = 0.05; for (let i = 0; i < steps; i++) { m.play(i, t, spb); t += spb; } }, secs);
      }
    }
    for (const j of ['victory', 'defeat']) out['jingle ' + j] = await render((m) => { m.layer = 0; m.jingle(j === 'victory'); }, 3);
    return out;
  }).catch((e) => ({ error: e.message }));
  if (res.error) { console.log('ERREUR', res.error); process.exit(1); }
  for (const [k, r] of Object.entries(res)) {
    const ok = r.rms > 0.01 && r.pk < 0.95; if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'KO '} ${k.padEnd(18)} niveau ${(r.rms * 100).toFixed(1).padStart(5)}   crête ${r.pk.toFixed(2)}`);
    if (out) { const n = r.wav.length, h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + n * 2, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(11025, 24); h.writeUInt32LE(22050, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n * 2, 40); fs.writeFileSync(`${out}/${k.replace(/[ +]/g, '_')}.wav`, Buffer.concat([h, Buffer.from(Int16Array.from(r.wav).buffer)])); }
  }
  await b.close(); console.log(bad ? `${bad} problème(s)` : 'Musique : tous les morceaux sonnent'); process.exit(bad ? 1 : 0);
})();
