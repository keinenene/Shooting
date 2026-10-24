// 背景（パララックスする星）とパーティクル
import { W, H, PARTICLES } from './config.js';

const TAU = Math.PI * 2;

export class Starfield {
  constructor(rng) {
    // 3層の星。奥ほど遅く暗い
    this.layers = [
      { n: 60, speed: 0.3, size: 1, color: 'rgba(120,140,200,0.5)' },
      { n: 35, speed: 0.8, size: 1.5, color: 'rgba(170,200,255,0.7)' },
      { n: 14, speed: 1.8, size: 2, color: 'rgba(220,240,255,0.9)' },
    ].map((l) => ({
      ...l,
      x: Float32Array.from({ length: l.n }, () => rng.range(0, W)),
      y: Float32Array.from({ length: l.n }, () => rng.range(0, H)),
    }));
    this.rng = rng;
  }

  update() {
    for (const l of this.layers) {
      for (let i = 0; i < l.n; i++) {
        l.y[i] += l.speed;
        if (l.y[i] > H) {
          l.y[i] -= H;
          l.x[i] = this.rng.range(0, W);
        }
      }
    }
  }

  draw(ctx) {
    for (const l of this.layers) {
      ctx.fillStyle = l.color;
      const s = l.size;
      for (let i = 0; i < l.n; i++) ctx.fillRect(l.x[i] - s / 2, l.y[i] - s / 2, s, s);
    }
  }
}

// パーティクル（グレイズの火花、被弾、撃破など）。型付き配列のプール
export class Particles {
  constructor() {
    const M = PARTICLES.max;
    this.n = 0;
    this.x = new Float32Array(M);
    this.y = new Float32Array(M);
    this.vx = new Float32Array(M);
    this.vy = new Float32Array(M);
    this.life = new Uint8Array(M);
    this.max = new Uint8Array(M);
    this.color = new Array(M).fill('#fff');
  }

  clear() {
    this.n = 0;
  }

  spawn(x, y, vx, vy, life, color) {
    if (this.n >= PARTICLES.max) return;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y;
    this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = this.max[i] = life;
    this.color[i] = color;
  }

  burst(rng, x, y, count, speed, life, color) {
    for (let k = 0; k < count; k++) {
      const a = rng.next() * TAU;
      const s = speed * (0.4 + rng.next() * 0.6);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life, color);
    }
  }

  update() {
    let i = 0;
    while (i < this.n) {
      if (--this.life[i] === 0) {
        const j = --this.n;
        this.x[i] = this.x[j]; this.y[i] = this.y[j];
        this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
        this.life[i] = this.life[j]; this.max[i] = this.max[j];
        this.color[i] = this.color[j];
        continue;
      }
      this.x[i] += this.vx[i];
      this.y[i] += this.vy[i];
      this.vx[i] *= 0.94;
      this.vy[i] *= 0.94;
      i++;
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.n; i++) {
      ctx.globalAlpha = this.life[i] / this.max[i];
      ctx.fillStyle = this.color[i];
      ctx.fillRect(this.x[i] - 1.5, this.y[i] - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

// 背景の小惑星（手続き生成のシルエット。暗く描いて弾の見やすさを邪魔しない）
export class Asteroids {
  constructor(rng, n = 7) {
    this.rng = rng;
    this.list = [];
    for (let i = 0; i < n; i++) {
      const a = this.make();
      a.y = rng.range(-40, H);
      this.list.push(a);
    }
  }

  make() {
    const rng = this.rng;
    const r = rng.range(12, 42);
    const k = 7 + Math.floor(rng.next() * 4);
    const pts = [];
    for (let i = 0; i < k; i++) {
      const a = (i / k) * TAU;
      const d = r * rng.range(0.7, 1.1);
      pts.push(Math.cos(a) * d, Math.sin(a) * d);
    }
    return {
      x: rng.range(0, W), y: -r - 10, r, pts,
      vy: 0.4 + (42 - r) * 0.02, rot: rng.range(0, TAU), vr: rng.range(-0.01, 0.01),
    };
  }

  update() {
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      a.y += a.vy;
      a.rot += a.vr;
      if (a.y > H + a.r + 10) this.list[i] = this.make();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(30, 34, 58, 0.55)';
    ctx.strokeStyle = 'rgba(80, 95, 140, 0.35)';
    ctx.lineWidth = 1;
    for (const a of this.list) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      for (let i = 0; i < a.pts.length; i += 2) ctx.lineTo(a.pts[i], a.pts[i + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}
