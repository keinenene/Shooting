// 敵弾。弾1発をオブジェクトにせず、属性ごとの型付き配列で持つ。
// 生きている弾は先頭から n 個に詰めて並べ、消すときは末尾の弾と入れ替える。
import { W, H, BULLETS, PLAYER } from './config.js';
import { sprites } from './sprites.js';

const MAX = BULLETS.max;
const TAU = Math.PI * 2;

// 弾のフラグ
export const F_GRAZED = 1;   // グレイズ済み
export const F_KEEP = 2;     // 画面外に出ても寿命まで消さない

// イベント列の表。パターン読み込み時に登録し、弾は番号だけを持つ
export const eventLists = [];

export class Bullets {
  constructor() {
    this.n = 0;
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.spd = new Float32Array(MAX);
    this.ang = new Float32Array(MAX);
    this.vx = new Float32Array(MAX);
    this.vy = new Float32Array(MAX);
    this.acc = new Float32Array(MAX);
    this.crv = new Float32Array(MAX);
    this.minS = new Float32Array(MAX);
    this.maxS = new Float32Array(MAX);
    this.rad = new Float32Array(MAX);
    this.age = new Uint16Array(MAX);
    this.life = new Uint16Array(MAX);   // 0 なら寿命なし
    this.spr = new Uint16Array(MAX);
    this.flg = new Uint8Array(MAX);
    this.evl = new Int16Array(MAX);     // イベント列の番号（-1 でなし）
    this.evn = new Uint8Array(MAX);     // 次に起きるイベントの位置
  }

  clear() {
    this.n = 0;
  }

  // spec はパターン読み込み時に作った弾の設定（emitter.js の compileBullet）
  spawn(x, y, speed, angle, spec) {
    if (this.n >= MAX) return -1;
    const i = this.n++;
    this.x[i] = x;
    this.y[i] = y;
    this.spd[i] = speed;
    this.ang[i] = angle;
    this.vx[i] = Math.cos(angle) * speed;
    this.vy[i] = Math.sin(angle) * speed;
    this.acc[i] = spec.accel;
    this.crv[i] = spec.curve;
    this.minS[i] = spec.minSpeed;
    this.maxS[i] = spec.maxSpeed;
    this.rad[i] = spec.radius;
    this.age[i] = 0;
    this.life[i] = spec.life;
    this.spr[i] = spec.sprite;
    this.flg[i] = spec.flags;
    this.evl[i] = spec.events;
    this.evn[i] = 0;
    return i;
  }

  // 1点から扇形・円形にまとめて撃つ（分裂イベントでも使う）
  fan(x, y, count, spread, base, speed, spec) {
    if (count <= 1) {
      this.spawn(x, y, speed, base, spec);
      return;
    }
    const full = spread >= TAU - 1e-6;
    const step = full ? spread / count : spread / (count - 1);
    const start = full ? base : base - spread / 2;
    for (let k = 0; k < count; k++) this.spawn(x, y, speed, start + step * k, spec);
  }

  // 末尾の弾を i に移して消す
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j];
    this.spd[i] = this.spd[j]; this.ang[i] = this.ang[j];
    this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
    this.acc[i] = this.acc[j]; this.crv[i] = this.crv[j];
    this.minS[i] = this.minS[j]; this.maxS[i] = this.maxS[j];
    this.rad[i] = this.rad[j]; this.age[i] = this.age[j];
    this.life[i] = this.life[j]; this.spr[i] = this.spr[j];
    this.flg[i] = this.flg[j]; this.evl[i] = this.evl[j];
    this.evn[i] = this.evn[j];
  }

  // イベントを1つ実行する。弾を消したら true
  runEvent(i, ev, px, py) {
    switch (ev.do) {
      case 'stop':
        this.spd[i] = 0;
        this.acc[i] = 0;
        break;
      case 'aim':
        this.ang[i] = Math.atan2(py - this.y[i], px - this.x[i]) + ev.offset;
        break;
      case 'turn':
        this.ang[i] += ev.angle;
        break;
      case 'split': {
        const base = ev.aim
          ? Math.atan2(py - this.y[i], px - this.x[i])
          : (ev.relative ? this.ang[i] : 0);
        this.fan(this.x[i], this.y[i], ev.count, ev.spread, base + ev.offset, ev.speed, ev.bullet);
        if (!ev.keep) return true;
        break;
      }
      case 'vanish':
        return true;
    }
    // どのイベントでも、速さ・加速度・角速度などを上書きできる
    if (ev.speed !== undefined && ev.do !== 'split') this.spd[i] = ev.speed;
    if (ev.accel !== undefined) this.acc[i] = ev.accel;
    if (ev.curve !== undefined) this.crv[i] = ev.curve;
    if (ev.minSpeed !== undefined) this.minS[i] = ev.minSpeed;
    if (ev.maxSpeed !== undefined) this.maxS[i] = ev.maxSpeed;
    return false;
  }

  // world: { player, canHit, canGraze, onHit(x, y), onGraze(x, y) }
  update(world) {
    const p = world.player;
    const px = p.x, py = p.y;
    const hitR = PLAYER.hitRadius, grazeR = PLAYER.grazeRadius;
    const m = BULLETS.offscreenMargin;
    const { x, y, spd, ang, vx, vy, acc, crv, minS, maxS, rad, age, life, flg, evl, evn } = this;

    let i = 0;
    while (i < this.n) {
      const a = ++age[i];
      let dirty = false;

      // イベント
      const el = evl[i];
      if (el >= 0) {
        const list = eventLists[el];
        let removed = false;
        while (evn[i] < list.length && list[evn[i]].at <= a) {
          const ev = list[evn[i]++];
          if (this.runEvent(i, ev, px, py)) { removed = true; break; }
          dirty = true;
        }
        if (removed) { this.kill(i); continue; }
      }

      // 加速度と角速度
      if (acc[i] !== 0) {
        let s = spd[i] + acc[i];
        if (s < minS[i]) s = minS[i];
        else if (s > maxS[i]) s = maxS[i];
        spd[i] = s;
        dirty = true;
      }
      if (crv[i] !== 0) {
        ang[i] += crv[i];
        dirty = true;
      }
      if (dirty) {
        vx[i] = Math.cos(ang[i]) * spd[i];
        vy[i] = Math.sin(ang[i]) * spd[i];
      }
      const bx = (x[i] += vx[i]);
      const by = (y[i] += vy[i]);

      // 寿命・画面外
      const lf = life[i];
      if (lf > 0 && a >= lf) { this.kill(i); continue; }
      if ((flg[i] & F_KEEP) === 0 &&
          (bx < -m || bx > W + m || by < -m || by > H + m)) { this.kill(i); continue; }

      // 被弾・グレイズ（距離の2乗で比べる）
      const dx = bx - px, dy = by - py;
      const d2 = dx * dx + dy * dy;
      const r = rad[i];
      if (world.canHit) {
        const hr = hitR + r;
        if (d2 < hr * hr) {
          world.onHit(bx, by);
          this.kill(i);
          continue;
        }
      }
      if (world.canGraze && (flg[i] & F_GRAZED) === 0) {
        const gr = grazeR + r;
        if (d2 < gr * gr) {
          flg[i] |= F_GRAZED;
          world.onGraze(bx, by);
        }
      }
      i++;
    }
  }

  // 半径 r の範囲内の弾を消す（被弾後の復帰用）
  clearCircle(cx, cy, r, fn) {
    const r2 = r * r;
    let i = 0;
    while (i < this.n) {
      const dx = this.x[i] - cx, dy = this.y[i] - cy;
      if (dx * dx + dy * dy < r2) {
        fn?.(this.x[i], this.y[i]);
        this.kill(i);
      } else i++;
    }
  }

  // dx, dy: 画面振動のずらし量（論理px）
  draw(ctx, view, dx = 0, dy = 0) {
    const k = view.k, ox = view.ox + dx * k, oy = view.oy + dy * k;
    const { x, y, ang, spr } = this;
    for (let i = 0; i < this.n; i++) {
      const s = sprites[spr[i]];
      const sx = ox + x[i] * k, sy = oy + y[i] * k;
      if (s.rotate) {
        const c = Math.cos(ang[i]) * k, sn = Math.sin(ang[i]) * k;
        ctx.setTransform(c, sn, -sn, c, sx, sy);
      } else {
        ctx.setTransform(k, 0, 0, k, sx, sy);
      }
      ctx.drawImage(s.img, -s.w / 2, -s.h / 2, s.w, s.h);
    }
    view.apply(ctx);
    if (dx || dy) ctx.translate(dx, dy);
  }

  // 当たり判定円の表示（デバッグ用）
  drawHitboxes(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.n; i++) {
      ctx.moveTo(this.x[i] + this.rad[i], this.y[i]);
      ctx.arc(this.x[i], this.y[i], this.rad[i], 0, TAU);
    }
    ctx.stroke();
  }
}
