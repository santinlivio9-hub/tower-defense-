// Projectiles "physiques" : roquettes (les balles sont en hitscan + traînée visuelle).
export class Rocket {
  constructor(tower, x, y, ang, target, stats) {
    this.tower = tower; this.x = x; this.y = y; this.ang = ang;
    this.target = target; this.tx = target.x; this.ty = target.y;
    this.s = stats; this.speed = stats.projSpeed * 0.5; this.dead = false; this.life = 4; this.smokeT = 0;
  }
  update(dt, game) {
    const s = this.s;
    this.life -= dt;
    if (this.target && this.target.dead) {
      this.target = s.homing ? game.nearestEnemy(this.tx, this.ty, 220) : null;
    }
    if (this.target) { this.tx = this.target.x; this.ty = this.target.y; }
    this.speed = Math.min(s.projSpeed, this.speed + s.projSpeed * 2.5 * dt);
    const want = Math.atan2(this.ty - this.y, this.tx - this.x);
    let d = want - this.ang; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const turn = (s.homing ? 9 : 6) * dt;
    this.ang += Math.max(-turn, Math.min(turn, d));
    this.x += Math.cos(this.ang) * this.speed * dt; this.y += Math.sin(this.ang) * this.speed * dt;
    this.smokeT -= dt;
    if (this.smokeT <= 0) { this.smokeT = 0.025; game.fx.smoke(this.x - Math.cos(this.ang) * 10, this.y - Math.sin(this.ang) * 10, 5, 'rgba(230,230,235,', 0.4); }
    const dist = Math.hypot(this.tx - this.x, this.ty - this.y);
    if (dist < this.speed * dt + 10 || this.life <= 0) {
      this.dead = true;
      game.explode(this.x, this.y, s.splash, s.damage, this.tower, { cluster: s.cluster || 0 });
    }
  }
  draw(c) {
    c.save(); c.translate(this.x, this.y); c.rotate(this.ang);
    c.lineWidth = 2.5; c.strokeStyle = '#1d1a2b'; c.lineJoin = 'round';
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-10, 0); c.lineTo(-18 - Math.random() * 6, -3); c.lineTo(-18 - Math.random() * 6, 3); c.closePath(); c.fill();
    c.fillStyle = '#dfe6ee'; c.beginPath(); c.roundRect(-10, -4, 16, 8, 2); c.fill(); c.stroke();
    c.fillStyle = '#e84a3c'; c.beginPath(); c.moveTo(6, -4); c.lineTo(13, 0); c.lineTo(6, 4); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
}

// Boule de plasma : avance tout droit, traverse et touche une fois chaque ennemi sur sa route, explose en fin de course
export class Plasma {
  constructor(tower, x, y, ang, stats) {
    this.tower = tower; this.x = x; this.y = y; this.ang = ang; this.s = stats; this.r = stats.size;
    this.dist = 0; this.max = stats.range + 80; this.hit = new Set(); this.dead = false; this.t = 0;
  }
  update(dt, game) {
    const s = this.s, v = s.projSpeed * dt;
    this.x += Math.cos(this.ang) * v; this.y += Math.sin(this.ang) * v; this.dist += v; this.t += dt;
    for (const e of game.enemies) {
      if (e.dead || this.hit.has(e) || e.hidden) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) > this.r + e.r * 0.7) continue;
      this.hit.add(e);
      const { dmg, crit } = this.tower.roll(e);
      game.damage(e, dmg, this.tower, { crit, ignoreArmor: true });
      game.fx.burst(e.x, e.y, '#8fffd0', 6, 140, 4);
    }
    if (Math.random() < dt * 40) game.fx.add({ k: 'dot', x: this.x - Math.cos(this.ang) * this.r, y: this.y - Math.sin(this.ang) * this.r, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, max: 0.35, size: this.r * 0.45, color: '#8fffd0', drag: 2 });
    if (this.dist >= this.max) {
      this.dead = true;
      if (s.splash > 0) game.explode(this.x, this.y, s.splash, s.damage * 0.8, this.tower, {});
      else game.fx.ring(this.x, this.y, this.r * 0.5, this.r * 2.2, '#8fffd0', 0.3, 4);
    }
  }
  draw(c) {
    const r = this.r * (1 + Math.sin(this.t * 30) * 0.06);
    const g = c.createRadialGradient(this.x, this.y, 1, this.x, this.y, r * 1.8);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(143,255,208,.9)'); g.addColorStop(1, 'rgba(47,208,138,0)');
    c.fillStyle = g; c.beginPath(); c.arc(this.x, this.y, r * 1.8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8fff4'; c.strokeStyle = '#1f8a5c'; c.lineWidth = 2.5; c.beginPath(); c.arc(this.x, this.y, r * 0.75, 0, Math.PI * 2); c.fill(); c.stroke();
  }
}
