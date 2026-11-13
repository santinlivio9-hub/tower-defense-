// Effets visuels : particules, traînées, anneaux, textes flottants, pièces volantes.
const TAU = Math.PI * 2;
const MAX_PARTICLES = 1400;
const rand = (a, b) => a + Math.random() * (b - a);
const CONFETTI = ['#ff5e7e', '#ffd23f', '#4cd137', '#3d9dfc', '#b05cff', '#ff9f1a', '#ffffff'];

export class Fx {
  constructor() {
    this.p = []; this.tracers = []; this.rings = []; this.texts = []; this.coins = [];
    this.coinTarget = { x: 120, y: -10 };
    this.onCoinArrive = null;
  }
  clear() { this.p.length = this.tracers.length = this.rings.length = this.texts.length = this.coins.length = 0; }

  add(o) { if (this.p.length < MAX_PARTICLES) this.p.push(o); }

  burst(x, y, color, n = 8, speed = 140, size = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(0.3, 1) * speed;
      this.add({ k: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.55), max: 0.55, size: rand(0.6, 1.2) * size, color, drag: 3 });
    }
  }
  sparks(x, y, ang, color = '#ffe9a0', n = 4) {
    for (let i = 0; i < n; i++) {
      const a = ang + Math.PI + rand(-0.9, 0.9), v = rand(80, 220);
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.1, 0.22), max: 0.22, size: 2, color, drag: 4 });
    }
  }
  confetti(x, y, n = 14, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(0.3, 1) * speed;
      this.add({ k: 'rect', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, g: 320, life: rand(0.6, 1.2), max: 1.2, size: rand(4, 7), color: CONFETTI[(Math.random() * CONFETTI.length) | 0], rot: rand(0, TAU), vr: rand(-12, 12), drag: 1.5 });
    }
  }
  shell(x, y, ang) {
    const a = ang + Math.PI / 2 + rand(-0.4, 0.4), v = rand(70, 130);
    this.add({ k: 'rect', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, life: 0.7, max: 0.7, size: 4, w: 2.2, color: '#e3b341', rot: rand(0, TAU), vr: rand(-20, 20), drag: 5 });
  }
  smoke(x, y, size = 8, color = 'rgba(120,120,130,', life = 0.6) {
    this.add({ k: 'smoke', x, y, vx: rand(-15, 15), vy: rand(-30, -8), life, max: life, size, color, drag: 1 });
  }
  explosion(x, y, radius, color = '#ff9f1a') {
    this.ring(x, y, radius * 0.2, radius, '#fff', 0.28, 6);
    this.ring(x, y, radius * 0.1, radius * 0.8, color, 0.4, 10);
    this.burst(x, y, color, 14, radius * 4, 6);
    this.burst(x, y, '#ffe45c', 8, radius * 3, 5);
    for (let i = 0; i < 6; i++) this.smoke(x + rand(-radius, radius) * 0.4, y + rand(-radius, radius) * 0.4, rand(10, 18), 'rgba(70,65,80,', rand(0.5, 0.9));
    this.add({ k: 'flash', x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, size: radius * 0.9, color: '#fff7d6' });
  }
  ring(x, y, r0, r1, color, life = 0.4, lw = 4) { this.rings.push({ x, y, r0, r1, color, life, max: life, lw }); }
  tracer(x1, y1, x2, y2, color = '#fff3b0', width = 2.5, life = 0.09) { this.tracers.push({ x1, y1, x2, y2, color, width, life, max: life }); }
  text(x, y, text, color = '#fff', size = 14, life = 0.7, o = {}) {
    if (this.texts.length > 120) this.texts.shift();
    this.texts.push({ x: Math.max(60, Math.min(540, x + rand(-6, 6))), y, y0: y, vy: o.bounce ? -260 - rand(0, 80) : -55, vx: o.bounce ? rand(-50, 50) : 0, bounce: !!o.bounce, shake: !!o.shake, text, color, size, life, max: life });
  }
  // éclaboussure de slime aux couleurs du brainrot
  slime(x, y, cols, n = 14, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(0.35, 1) * speed;
      this.add({ k: 'blob', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, g: 620, life: rand(0.45, 0.8), max: 0.8, size: rand(3, 7), color: cols[i % cols.length], drag: 2.2 });
    }
    this.ring(x, y, 4, 34, cols[0], 0.3, 6);
  }
  beam(x, y, color = '#fff6c8') { this.add({ k: 'beam', x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 46, color }); }
  coinBurst(x, y, n) {
    n = Math.min(n, 8);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(60, 170);
      this.coins.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, delay: 0.25 + i * 0.04 });
    }
  }

  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const o = this.p[i];
      o.life -= dt;
      if (o.life <= 0) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
      const d = Math.max(0, 1 - (o.drag || 0) * dt);
      o.vx *= d; o.vy *= d; if (o.g) o.vy += o.g * dt;
      o.x += o.vx * dt; o.y += o.vy * dt; if (o.vr) o.rot += o.vr * dt;
    }
    for (const arr of [this.tracers, this.rings, this.texts]) {
      for (let i = arr.length - 1; i >= 0; i--) { arr[i].life -= dt; if (arr[i].life <= 0) arr.splice(i, 1); }
    }
    for (const t of this.texts) {
      if (t.bounce) { t.vy += 900 * dt; t.y += t.vy * dt; t.x += t.vx * dt; t.vx *= 1 - 3 * dt; if (t.y > t.y0 && t.vy > 0) { t.y = t.y0; t.vy = Math.abs(t.vy) > 90 ? -t.vy * 0.42 : 0; } }
      else { t.y += t.vy * dt; t.vy *= 1 - 2.5 * dt; }
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i]; c.t += dt;
      if (c.t < c.delay) { c.vx *= 1 - 4 * dt; c.vy *= 1 - 4 * dt; c.vy += 200 * dt; }
      else {
        const dx = this.coinTarget.x - c.x, dy = this.coinTarget.y - c.y, d = Math.hypot(dx, dy) || 1;
        const sp = 500 + (c.t - c.delay) * 2400;
        c.vx = (dx / d) * sp; c.vy = (dy / d) * sp;
        if (d < sp * dt + 8) { this.coins.splice(i, 1); if (this.onCoinArrive) this.onCoinArrive(); continue; }
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
    }
  }

  drawTracers(c) {
    c.lineCap = 'round';
    for (const t of this.tracers) {
      const k = t.life / t.max;
      // la balle "voyage" : on dessine un segment qui avance vers la cible
      const head = 1 - k * 0.6, tail = Math.max(0, head - 0.55);
      c.globalAlpha = Math.min(1, k * 2);
      c.strokeStyle = t.color; c.lineWidth = t.width;
      c.beginPath();
      c.moveTo(t.x1 + (t.x2 - t.x1) * tail, t.y1 + (t.y2 - t.y1) * tail);
      c.lineTo(t.x1 + (t.x2 - t.x1) * head, t.y1 + (t.y2 - t.y1) * head);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  draw(c) {
    for (const o of this.p) {
      const k = o.life / o.max;
      if (o.k === 'dot') { c.globalAlpha = Math.min(1, k * 2); c.fillStyle = o.color; c.beginPath(); c.arc(o.x, o.y, o.size * (0.4 + k * 0.6), 0, TAU); c.fill(); }
      else if (o.k === 'spark') { c.globalAlpha = k; c.strokeStyle = o.color; c.lineWidth = o.size; c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x - o.vx * 0.04, o.y - o.vy * 0.04); c.stroke(); }
      else if (o.k === 'rect') { c.globalAlpha = Math.min(1, k * 3); c.save(); c.translate(o.x, o.y); c.rotate(o.rot); c.fillStyle = o.color; const w = o.w || o.size * 0.6; c.fillRect(-o.size / 2, -w / 2, o.size, w); c.restore(); }
      else if (o.k === 'smoke') { c.globalAlpha = 1; c.fillStyle = o.color + (k * 0.45).toFixed(2) + ')'; c.beginPath(); c.arc(o.x, o.y, o.size * (1.6 - k * 0.8), 0, TAU); c.fill(); }
      else if (o.k === 'coin') { c.globalAlpha = Math.min(1, k * 3); const w = Math.abs(Math.cos(o.rot)) * o.size + 1.5; c.fillStyle = '#ffcf40'; c.strokeStyle = '#8a5a00'; c.lineWidth = 2; c.beginPath(); c.ellipse(o.x, o.y, w, o.size, 0, 0, TAU); c.fill(); c.stroke(); }
      else if (o.k === 'heart') { c.globalAlpha = Math.min(1, k * 2); const s = o.size; c.fillStyle = o.color; c.beginPath(); c.moveTo(o.x, o.y + s * 0.8); c.bezierCurveTo(o.x - s * 1.4, o.y - s * 0.2, o.x - s * 0.6, o.y - s * 1.2, o.x, o.y - s * 0.4); c.bezierCurveTo(o.x + s * 0.6, o.y - s * 1.2, o.x + s * 1.4, o.y - s * 0.2, o.x, o.y + s * 0.8); c.fill(); }
      else if (o.k === 'blob') { c.globalAlpha = Math.min(1, k * 2.5); c.fillStyle = o.color; const sq = 1 + Math.min(0.6, Math.abs(o.vy) / 600); c.beginPath(); c.ellipse(o.x, o.y, o.size / sq, o.size * sq, Math.atan2(o.vy, o.vx) + Math.PI / 2, 0, TAU); c.fill(); }
      else if (o.k === 'beam') { const a = Math.sin(k * Math.PI); c.globalAlpha = a * 0.85; const g = c.createLinearGradient(o.x - o.size / 2, 0, o.x + o.size / 2, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, o.color); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(o.x - o.size / 2 * (0.6 + a * 0.4), o.y - 900, o.size * (0.6 + a * 0.4), 900 + 20); }
      else if (o.k === 'flash') { c.globalAlpha = k; c.fillStyle = o.color; c.beginPath(); c.arc(o.x, o.y, o.size * (1.2 - k * 0.4), 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    for (const r of this.rings) {
      const k = r.life / r.max, e = 1 - k * k;
      c.globalAlpha = k; c.strokeStyle = r.color; c.lineWidth = r.lw * k + 1;
      c.beginPath(); c.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;
    for (const o of this.coins) {
      c.fillStyle = '#ffcf40'; c.strokeStyle = '#8a5a00'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(o.x, o.y, 6 * Math.abs(Math.cos(o.t * 14)) + 1.5, 6, 0, 0, TAU); c.fill(); c.stroke();
    }
  }
  drawTexts(c) {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const t of this.texts) {
      const k = t.life / t.max, pop = 1 + Math.max(0, k - 0.8) * 2.5, jx = t.shake ? Math.sin(t.life * 90) * 2.5 : 0;
      c.globalAlpha = Math.min(1, k * 2.5);
      c.font = `700 ${Math.round(t.size * pop)}px Fredoka, ui-rounded, system-ui, sans-serif`;
      c.lineWidth = Math.max(4, t.size * 0.28); c.strokeStyle = '#3d2c4e'; c.strokeText(t.text, t.x + jx, t.y);
      c.fillStyle = t.color; c.fillText(t.text, t.x + jx, t.y);
    }
    c.globalAlpha = 1;
  }
}
