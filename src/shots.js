// 自機ショット。前方への直線のみ。数が少ないのでオブジェクトのプールで持つ
import { SHOT } from './config.js';

export class Shots {
  constructor() {
    this.pool = [];
    for (let i = 0; i < SHOT.poolSize; i++) this.pool.push({ alive: false, x: 0, y: 0 });
    this.timer = 0;
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

  // targets: { x, y, r, hit(damage) } の配列
  update(player, firing, targets) {
    if (firing && this.timer <= 0) {
      const gap = player.slow ? SHOT.slowSpacing : SHOT.spacing;
      const n = SHOT.lanes;
      for (let i = 0; i < n; i++) {
        this.spawn(player.x + (i - (n - 1) / 2) * gap, player.y - 10);
      }
      this.timer = SHOT.interval;
    }
    this.timer--;

    const half = SHOT.width / 2;
    for (const s of this.pool) {
      if (!s.alive) continue;
      s.y -= SHOT.speed;
      if (s.y < -SHOT.length) {
        s.alive = false;
        continue;
      }
      for (const t of targets) {
        if (t.dead) continue;
        // 縦長の弾と円の判定（弾の中心線と円の距離で見る）
        const dx = Math.abs(s.x - t.x) - half;
        const dy = Math.abs(s.y - t.y) - SHOT.length / 2;
        if ((dx < 0 ? 0 : dx) ** 2 + (dy < 0 ? 0 : dy) ** 2 < t.r * t.r) {
          t.hit(SHOT.damage);
          s.alive = false;
          break;
        }
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = 'rgba(120, 255, 255, 0.35)';
    for (const s of this.pool) {
      if (s.alive) ctx.fillRect(s.x - 2.5, s.y - SHOT.length / 2, 5, SHOT.length);
    }
    ctx.fillStyle = '#eff';
    for (const s of this.pool) {
      if (s.alive) ctx.fillRect(s.x - 1, s.y - SHOT.length / 2, 2, SHOT.length);
    }
  }
}
