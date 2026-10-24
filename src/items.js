// アイテム（攻撃力アップ小・大、ボム、スコア点）。オブジェクトのプールで持つ
import { W, H, ITEMS } from './config.js';

export const IT_POW_S = 0;   // 攻撃力 +1段階
export const IT_POW_L = 1;   // 攻撃力 +5段階
export const IT_BOMB = 2;    // ボム +1
export const IT_POINT = 3;   // スコア点（消した弾が変わったもの）

export class Items {
  constructor() {
    this.pool = [];
    for (let i = 0; i < ITEMS.max; i++) {
      this.pool.push({ alive: false, type: 0, x: 0, y: 0, vx: 0, vy: 0, homing: false });
    }
    this.count = 0;
  }

  clear() {
    for (const it of this.pool) it.alive = false;
    this.count = 0;
  }

  // 空きがなければ false（呼び出し側でスコアに直接足す）
  spawn(type, x, y, rng, homing = false) {
    for (const it of this.pool) {
      if (it.alive) continue;
      it.alive = true;
      it.type = type;
      it.x = Math.max(8, Math.min(W - 8, x));
      it.y = y;
      it.vx = rng ? rng.range(-1, 1) : 0;
      it.vy = homing ? 0 : ITEMS.launch;
      it.homing = homing;
      this.count++;
      return true;
    }
    return false;
  }

  // collectAll: 自機が回収ラインより上にいる。onCollect(type) を取得ごとに呼ぶ
  update(player, canCollect, collectAll, slow, onCollect) {
    const px = player.x, py = player.y;
    const cr2 = ITEMS.collectRadius ** 2;
    const mr2 = ITEMS.slowMagnet ** 2;
    for (const it of this.pool) {
      if (!it.alive) continue;
      const dx = px - it.x, dy = py - it.y;
      const d2 = dx * dx + dy * dy;
      if (canCollect && (collectAll || (slow && d2 < mr2))) it.homing = true;
      if (it.homing && canCollect) {
        const d = Math.sqrt(d2) || 1;
        const s = Math.min(ITEMS.homingSpeed, d);
        it.x += (dx / d) * s;
        it.y += (dy / d) * s;
      } else {
        it.vy = Math.min(it.vy + ITEMS.gravity, ITEMS.fallMax);
        it.vx *= 0.95;
        it.x += it.vx;
        it.y += it.vy;
      }
      if (canCollect && d2 < cr2) {
        it.alive = false;
        this.count--;
        onCollect(it.type, it.x, it.y);
      } else if (it.y > H + 16) {
        it.alive = false;
        this.count--;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    // スコア点はまとめて描く
    ctx.fillStyle = '#8bf';
    ctx.beginPath();
    for (const it of this.pool) {
      if (!it.alive || it.type !== IT_POINT) continue;
      ctx.moveTo(it.x, it.y - 4);
      ctx.lineTo(it.x + 3, it.y);
      ctx.lineTo(it.x, it.y + 4);
      ctx.lineTo(it.x - 3, it.y);
    }
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const it of this.pool) {
      if (!it.alive || it.type === IT_POINT) continue;
      const big = it.type === IT_POW_L;
      const s = big ? 8 : 6;
      if (it.type === IT_BOMB) {
        ctx.fillStyle = 'rgba(40, 200, 120, 0.9)';
        ctx.strokeStyle = '#bfc';
        ctx.beginPath();
        ctx.arc(it.x, it.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('B', it.x, it.y + 1);
      } else {
        ctx.fillStyle = 'rgba(230, 60, 80, 0.9)';
        ctx.strokeStyle = '#fbc';
        ctx.lineWidth = 1;
        ctx.fillRect(it.x - s, it.y - s, s * 2, s * 2);
        ctx.strokeRect(it.x - s, it.y - s, s * 2, s * 2);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${big ? 11 : 9}px sans-serif`;
        ctx.fillText('P', it.x, it.y + 1);
      }
    }
    ctx.restore();
  }
}
