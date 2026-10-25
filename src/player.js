// 自機
import { W, H, PLAYER, INPUT } from './config.js';
import { SHIPS, DEFAULT_SHIP } from './ships.js';

export class Player {
  constructor() {
    this.ship = SHIPS[DEFAULT_SHIP];
    this.bufX = 0;  // まだ反映していないドラッグ量
    this.bufY = 0;
    this.reset();
  }

  get hitRadius() {
    return this.ship.hitRadius;
  }

  reset() {
    this.x = PLAYER.startX;
    this.y = PLAYER.startY;
    this.bufX = this.bufY = 0;
    this.slow = false;
    this.invincible = 0;
    this.moveX = 0;     // 今フレームの横移動（機体の傾き表示用）
  }

  update(drag, slow) {
    this.slow = slow;
    // 低速時は指の移動量を速度比で縮めて、精密に動かせるようにする
    const ratio = slow ? this.ship.slowSpeed / this.ship.speed : 1;
    const k = INPUT.sensitivity * ratio;
    const lim = PLAYER.dragBuffer;
    this.bufX = Math.max(-lim, Math.min(lim, this.bufX + drag.x * k));
    this.bufY = Math.max(-lim, Math.min(lim, this.bufY + drag.y * k));

    // 1フレームで動ける距離に上限を付け、残りは次のフレームに持ち越す
    let sx = this.bufX, sy = this.bufY;
    const max = PLAYER.dragMaxStep * ratio;
    const len = Math.hypot(sx, sy);
    if (len > max) {
      sx *= max / len;
      sy *= max / len;
    }
    this.bufX -= sx;
    this.bufY -= sy;
    this.moveX = sx;

    const m = PLAYER.margin;
    this.x = Math.max(m, Math.min(W - m, this.x + sx));
    this.y = Math.max(m, Math.min(H - m, this.y + sy));

    if (this.invincible > 0) this.invincible--;
  }

  hit() {
    this.invincible = PLAYER.invincibleFrames;
  }

  draw(ctx, frame) {
    // 無敵中は控えめに点滅（光過敏に配慮して半透明にするだけ）
    const blink = this.invincible > 0 && (frame >> 2) % 2 === 0;
    const x = this.x, y = this.y;
    const tilt = Math.max(-1, Math.min(1, this.moveX / 4));

    ctx.save();
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.translate(x, y);

    // 噴射炎
    const flame = 6 + ((frame >> 1) % 3) * 2;
    ctx.fillStyle = 'rgba(255, 160, 60, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-3, 9);
    ctx.lineTo(0, 9 + flame);
    ctx.lineTo(3, 9);
    ctx.fill();

    // 機体（傾きに合わせて翼の幅を変える）
    const wl = 11 - tilt * 3, wr = 11 + tilt * 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#5ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(20, 60, 80, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(wr, 9);
    ctx.lineTo(3, 5);
    ctx.lineTo(0, 9);
    ctx.lineTo(-3, 5);
    ctx.lineTo(-wl, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // コックピット
    ctx.fillStyle = '#cff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.fill();
    ctx.restore();
  }

  // 判定点（低速中または常時表示の設定時）。弾より手前に描く
  drawHitbox(ctx, always) {
    const x = this.x, y = this.y;
    if (this.slow || always) {
      ctx.fillStyle = 'rgba(255, 60, 90, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, this.hitRadius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, this.hitRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
