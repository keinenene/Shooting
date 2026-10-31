// ボム。自機を中心に衝撃波が広がり、波に触れた弾から順に消える
import { W, H, BOMB } from './config.js';

const TAU = Math.PI * 2;

export class Bomb {
  constructor() {
    this.t = -1;        // 発動からのフレーム数（-1 で非発動）
    this.x = 0;
    this.y = 0;
    this.r = 0;         // 衝撃波の半径
  }

  get active() {
    return this.t >= 0;
  }

  // 無敵が続いているか
  get protecting() {
    return this.t >= 0 && this.t < BOMB.invincibleFrames;
  }

  start(x, y) {
    this.t = 0;
    this.x = x;
    this.y = y;
    this.r = 0;
    this.bossHit = false;  // ボスに波が届いたか
    // 画面の一番遠い角まで届く半径
    this.maxR = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 30;
  }

  // onErase(x, y, angle): 消した弾ごとに呼ぶ（演出用）
  update(bullets, onErase) {
    if (this.t < 0) return;
    this.t++;
    if (this.t <= BOMB.waveFrames) {
      // 最初は速く、だんだん遅く広がる
      const k = this.t / BOMB.waveFrames;
      this.r = this.maxR * (1 - (1 - k) ** 2.2);
      const cx = this.x, cy = this.y;
      bullets.clearCircle(cx, cy, this.r, (bx, by) => onErase(bx, by, Math.atan2(by - cy, bx - cx)));
    }
    if (this.t >= BOMB.invincibleFrames) this.t = -1;
  }

  draw(ctx) {
    if (this.t < 0 || this.t > BOMB.waveFrames + 20) return;
    const k = Math.min(1, this.t / BOMB.waveFrames);
    const fade = this.t <= BOMB.waveFrames ? 1 : 1 - (this.t - BOMB.waveFrames) / 20;
    const { x, y, r } = this;

    ctx.save();
    // 波の内側をうっすら染める（強い点滅は避ける）
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
    g.addColorStop(0, 'rgba(80, 220, 255, 0)');
    g.addColorStop(1, `rgba(80, 220, 255, ${0.18 * fade})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    // 衝撃波の輪（太い光の帯＋白い芯）
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(80, 220, 255, ${0.35 * fade})`;
    ctx.lineWidth = 18 * (1 - k * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(230, 255, 255, ${0.9 * fade})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 少し遅れて追いかける2本目の輪
    const r2 = r * 0.82;
    ctx.strokeStyle = `rgba(160, 120, 255, ${0.45 * fade})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
