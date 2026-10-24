// 道中の敵。種類（見た目・体力・スコア・ドロップ）と、移動の軌道をデータで指定する
import { W, H, ENEMY } from './config.js';
import { compilePattern, PatternRunner } from './emitter.js';

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

// 敵の種類。drop: 倒したときに落とすもの（chance は確率）
export const ENEMY_TYPES = {
  drone:   { hp: 20,   r: 10, score: 1000,  color: '#f6a', shape: 'dart', drop: { powS: 0.2 } },
  fighter: { hp: 120,  r: 13, score: 3000,  color: '#fa4', shape: 'wing', drop: { powS: 1 } },
  carrier: { hp: 1000, r: 22, score: 20000, color: '#6f8', shape: 'hex',  drop: { powL: 2 }, big: true },
};

class Enemy {
  constructor(owner) {
    this.owner = owner;
    this.alive = false;
  }

  // 画面に入るまでは撃たれない
  get dead() {
    return !this.alive || !this.entered;
  }

  hit(d) {
    if (this.dead) return;
    this.hp -= d;
    this.flash = 2;
    this.owner.hooks.onHit?.(this);
    if (this.hp <= 0) {
      this.alive = false;
      this.owner.hooks.onKill(this);
    }
  }
}

export class Enemies {
  // hooks: { onKill(enemy), onHit(enemy) }
  constructor(hooks) {
    this.hooks = hooks;
    this.list = [];
    for (let i = 0; i < ENEMY.max; i++) this.list.push(new Enemy(this));
  }

  clear() {
    for (const e of this.list) e.alive = false;
  }

  get active() {
    return this.list.some((e) => e.alive);
  }

  // w: タイムラインの1項目。patterns: 名前 → パターン定義
  spawn(w, x, diff, rng, patterns) {
    const e = this.list.find((e) => !e.alive);
    if (!e) return;
    const type = ENEMY_TYPES[w.type];
    e.alive = true;
    e.type = type;
    e.x = e.x0 = x;
    e.y = w.y ?? -20;
    e.t = 0;
    e.hp = (w.hp ?? type.hp);
    e.r = type.r;
    e.flash = 0;
    e.entered = false;
    e.path = w.path || { type: 'linear', vx: 0, vy: 2 };
    e.vx = 0;
    e.vy = 0;
    e.phase = 0;               // stop 軌道の段階（0:降下 1:停止 2:退場）
    e.drop = w.drop;           // 追加で落とすもの（'bomb' など）
    e.runner = w.pattern
      ? new PatternRunner(compilePattern(patterns[w.pattern], diff), rng)
      : null;
    // 軌道の初期化
    const p = e.path;
    if (p.type === 'arc') {
      e.ang = (p.angle ?? 90) * RAD;
      e.spd = p.speed ?? 2;
    }
  }

  update(bullets, player) {
    for (const e of this.list) {
      if (!e.alive) continue;
      e.t++;
      if (e.flash > 0) e.flash--;
      this.move(e);
      const inside = e.x > -e.r && e.x < W + e.r && e.y > -e.r && e.y < H + e.r;
      if (inside) e.entered = true;
      else if (e.entered || e.t > 600) {
        // 画面から出たら消える（倒さずに逃した）
        e.alive = false;
        continue;
      }
      if (e.runner && e.entered && e.y > 0 && e.y < ENEMY.noFireBelow) {
        e.runner.update(bullets, player, e.x, e.y);
      }
    }
  }

  move(e) {
    const p = e.path;
    switch (p.type) {
      case 'linear':
        e.x += p.vx ?? 0;
        e.y += p.vy ?? 2;
        break;
      case 'sine':
        e.y += p.vy ?? 1.5;
        e.x = e.x0 + (p.amp ?? 60) * Math.sin((TAU * e.t) / (p.period ?? 120));
        break;
      case 'arc':
        // 一定時間だけ向きを変えながら進む
        if (e.t < (p.turnFrames ?? 60)) e.ang += (p.turn ?? 0) * RAD;
        e.x += Math.cos(e.ang) * e.spd;
        e.y += Math.sin(e.ang) * e.spd;
        break;
      case 'stop': {
        // 降りてきて止まり、しばらく撃ってから去る
        const toY = p.toY ?? 120;
        const wait = p.wait ?? 120;
        if (e.phase === 0) {
          e.y += Math.max(0.4, (toY - e.y) * 0.06);
          if (e.y >= toY - 1) { e.phase = 1; e.stopT = e.t; }
        } else if (e.phase === 1) {
          if (e.t - e.stopT >= wait) e.phase = 2;
        } else {
          e.vx += (p.exitVx ?? 0) * 0.05;
          e.vy += (p.exitVy ?? -2) * 0.05;
          e.x += e.vx;
          e.y += e.vy;
        }
        break;
      }
    }
  }

  draw(ctx) {
    for (const e of this.list) {
      if (!e.alive) continue;
      const c = e.flash ? '#fff' : e.type.color;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = c;
      ctx.fillStyle = 'rgba(30, 20, 40, 0.9)';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.shadowColor = e.type.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const r = e.r;
      switch (e.type.shape) {
        case 'dart':   // 下向きの三角
          ctx.moveTo(0, r);
          ctx.lineTo(r, -r * 0.7);
          ctx.lineTo(0, -r * 0.3);
          ctx.lineTo(-r, -r * 0.7);
          break;
        case 'wing':   // 翼のあるひし形
          ctx.moveTo(0, r);
          ctx.lineTo(r * 0.5, 0);
          ctx.lineTo(r * 1.3, -r * 0.5);
          ctx.lineTo(r * 0.4, -r * 0.7);
          ctx.lineTo(0, -r);
          ctx.lineTo(-r * 0.4, -r * 0.7);
          ctx.lineTo(-r * 1.3, -r * 0.5);
          ctx.lineTo(-r * 0.5, 0);
          break;
        case 'hex': {  // 回る六角形
          const a0 = e.t * 0.01;
          for (let i = 0; i < 6; i++) {
            const a = a0 + (i * TAU) / 6;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          break;
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(0, 0, e.type.big ? 6 : 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}
