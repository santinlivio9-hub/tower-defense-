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
