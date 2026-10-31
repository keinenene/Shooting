// 自機ショット。形や威力は機体の定義（ships.js の shot）で決まる。数が少ないのでオブジェクトのプールで持つ
import { SHOT } from './config.js';
import { SHIPS, DEFAULT_SHIP } from './ships.js';

export class Shots {
  constructor() {
    this.pool = [];
    for (let i = 0; i < SHOT.poolSize; i++) this.pool.push({ alive: false, x: 0, y: 0 });
    this.timer = 0;
    this.def = SHIPS[DEFAULT_SHIP].shot;
  }

  clear() {
    for (const s of this.pool) s.alive = false;
    this.timer = 0;
  }

  spawn(x, y) {
    for (const s of this.pool) {
      if (!s.alive) {
        s.alive = true;
        s.x = x;
        s.y = y;
        return;
      }
    }
  }

  // targets: { x, y, r, dead, hit(damage) } の配列
  // power: 攻撃力の倍率
  update(player, firing, targets, power = 1) {
    const d = (this.def = player.ship.shot);
    if (firing && this.timer <= 0) {
      // kind ごとの撃ち方。機体を増やすときはここに足す
      switch (d.kind) {
        case 'straight': {
          const gap = player.slow ? d.slowSpacing : d.spacing;
          for (let i = 0; i < d.lanes; i++) {
            this.spawn(player.x + (i - (d.lanes - 1) / 2) * gap, player.y - 10);
          }
          break;
        }
      }
      this.timer = d.interval;
    }
    this.timer--;

    const half = d.width / 2;
    for (const s of this.pool) {
      if (!s.alive) continue;
      s.y -= d.speed;
      if (s.y < -d.length) {
        s.alive = false;
        continue;
      }
      for (const t of targets) {
        if (t.dead) continue;
        // 縦長の弾と円の判定（弾の中心線と円の距離で見る）
        const dx = Math.abs(s.x - t.x) - half;
        const dy = Math.abs(s.y - t.y) - d.length / 2;
        if ((dx < 0 ? 0 : dx) ** 2 + (dy < 0 ? 0 : dy) ** 2 < t.r * t.r) {
          t.hit(d.damage * power);
          s.alive = false;
          break;
        }
      }
    }
  }

  draw(ctx) {
    const len = this.def.length;
    ctx.fillStyle = 'rgba(120, 255, 255, 0.35)';
    for (const s of this.pool) {
      if (s.alive) ctx.fillRect(s.x - 2.5, s.y - len / 2, 5, len);
    }
    ctx.fillStyle = '#eff';
    for (const s of this.pool) {
      if (s.alive) ctx.fillRect(s.x - 1, s.y - len / 2, 2, len);
    }
  }
}
