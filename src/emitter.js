// パターン定義（patterns/ のデータ）を解釈して弾を撃つ。
// 角度は定義では「度」、内部では「ラジアン」。0度が右、90度が真下。
import { DIFFICULTY } from './config.js';
import { BULLET_TYPES, getSprite } from './sprites.js';
import { eventLists, F_KEEP } from './bullets.js';

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;

// ---- 読み込み時の変換（難易度係数もここで1回だけ掛ける） ----

function compileBullet(b, mul) {
  const type = b.type || 'small';
  return {
    sprite: getSprite(type, b.color || '#fff'),
    radius: b.radius ?? BULLET_TYPES[type].r,
    speed: (b.speed ?? 2) * mul.speed,
    accel: (b.accel ?? 0) * mul.speed,
    curve: (b.curve ?? 0) * RAD,
    minSpeed: (b.minSpeed ?? 0) * mul.speed,
    maxSpeed: (b.maxSpeed ?? 20) * mul.speed,
    life: b.life ?? 0,
    flags: b.keep ? F_KEEP : 0,
    events: compileEvents(b, mul),
  };
}

function compileEvents(b, mul) {
  if (!b.events || b.events.length === 0) return -1;
  const list = b.events
    .map((ev) => {
      const c = { at: ev.at, do: ev.do || 'set' };
      if (ev.speed !== undefined) c.speed = ev.speed * mul.speed;
      if (ev.accel !== undefined) c.accel = ev.accel * mul.speed;
      if (ev.curve !== undefined) c.curve = ev.curve * RAD;
      if (ev.minSpeed !== undefined) c.minSpeed = ev.minSpeed * mul.speed;
      if (ev.maxSpeed !== undefined) c.maxSpeed = ev.maxSpeed * mul.speed;
      c.angle = (ev.angle ?? 0) * RAD;
      c.offset = (ev.offset ?? 0) * RAD;
      if (c.do === 'split') {
        c.count = Math.max(1, Math.round((ev.count ?? 8) * mul.count));
        c.spread = (ev.spread ?? 360) * RAD;
        c.aim = !!ev.aim;
        c.relative = !!ev.relative;
        c.keep = !!ev.keep;
        // 分裂後の弾。指定がなければ元の弾の見た目を引き継ぐ（イベントは引き継がない）
        const child = ev.bullet || { ...b, events: undefined };
        c.bullet = compileBullet(child, mul);
        if (c.speed === undefined) c.speed = c.bullet.speed;
      }
      return c;
    })
    .sort((a, b2) => a.at - b2.at);
  eventLists.push(list);
  return eventLists.length - 1;
}

function compileEmitter(src, diffKey) {
  const e = { ...src, ...(src.override?.[diffKey] || {}) };
  const mul = DIFFICULTY[diffKey];
  const ba = e.baseAngle || { type: 'fixed', start: 90 };
  return {
    delay: e.delay ?? 0,
    until: e.until ?? Infinity,
    interval: Math.max(1, Math.round((e.interval ?? 30) * mul.interval)),
    count: Math.max(1, Math.round((e.count ?? 1) * mul.count)),
    spread: (e.spread ?? 360) * RAD,
    angleType: ba.type || 'fixed',
    angleStart: (ba.start ?? 0) * RAD,
    angleSpeed: (ba.speed ?? 0) * RAD,       // rotate：1回撃つごとに回る角度
    angleAmp: (ba.amp ?? 0) * RAD,           // sine：振れ幅
    anglePeriod: ba.period ?? 60,            // sine：何回撃つと1往復か
    angleRange: (ba.range ?? 360) * RAD,     // random：start からの範囲
    aim: !!e.aim,
    shape: e.shape || 'fan',                 // 'fan'（1点から放射）か 'line'（横一列）
    width: e.width ?? 300,                   // line：列の幅
    shift: e.shift ?? 0,                     // line：1回ごとに交互にずらす量（隙間を作る）
    origin: e.origin || null,                // 画面上の絶対位置（なければ持ち主の位置）
    offsetX: e.offset?.x ?? 0,
    offsetY: e.offset?.y ?? 0,
    radius: e.radius ?? 0,                   // 発射位置を中心からずらす距離
    jitter: (e.jitter ?? 0) * RAD,           // 1発ごとの角度のばらつき（±）
    speedJitter: (e.speedJitter ?? 0) * mul.speed,
    layers: e.layers ?? 1,                   // 速さ違いで重ねる段数
    layerStep: (e.layerStep ?? 0.4) * mul.speed,
    bullet: compileBullet(e.bullet || {}, mul),
  };
}

const compiledCache = new WeakMap();

export function compilePattern(def, diffKey) {
  let byDiff = compiledCache.get(def);
  if (!byDiff) compiledCache.set(def, (byDiff = {}));
  if (!byDiff[diffKey]) {
    byDiff[diffKey] = {
      id: def.id,
      name: def.name || def.id,
      duration: def.duration ?? Infinity,
      emitters: def.emitters.map((e) => compileEmitter(e, diffKey)),
    };
  }
  return byDiff[diffKey];
}

// ---- 実行 ----

export class PatternRunner {
  constructor(compiled, rng) {
    this.p = compiled;
    this.rng = rng;
    this.t = 0;
    this.shots = compiled.emitters.map(() => 0);  // 各エミッターが撃った回数
  }

  get done() {
    return this.t >= this.p.duration;
  }

  // ox, oy: 持ち主（ボスなど）の位置
  update(bullets, player, ox, oy) {
    const t = this.t++;
    const list = this.p.emitters;
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (t < e.delay || t >= e.until) continue;
      if ((t - e.delay) % e.interval !== 0) continue;
      this.fire(e, this.shots[k]++, bullets, player, ox, oy);
    }
  }

  fire(e, shot, bullets, player, ox, oy) {
    const rng = this.rng;
    let cx = e.origin ? e.origin.x : ox + e.offsetX;
    let cy = e.origin ? e.origin.y : oy + e.offsetY;

    // 基準の角度
    let base;
    switch (e.angleType) {
      case 'rotate': base = e.angleStart + e.angleSpeed * shot; break;
      case 'sine':   base = e.angleStart + e.angleAmp * Math.sin((TAU * shot) / e.anglePeriod); break;
      case 'random': base = e.angleStart + rng.next() * e.angleRange; break;
      case 'aim':    base = Math.atan2(player.y - cy, player.x - cx) + e.angleStart; break;
      default:       base = e.angleStart;
    }
    // aim: true のときは、上で求めた角度を自機狙いからのずれとして扱う
    if (e.aim && e.angleType !== 'aim') base += Math.atan2(player.y - cy, player.x - cx);

    const spec = e.bullet;
    const n = e.count;
    for (let layer = 0; layer < e.layers; layer++) {
      const speed0 = spec.speed + layer * e.layerStep;
      if (e.shape === 'line') {
        // 横一列。同じ向きに撃つ
        const step = n > 1 ? e.width / (n - 1) : 0;
        const sh = shot % 2 ? e.shift : 0;
        for (let i = 0; i < n; i++) {
          const a = base + (e.jitter ? rng.range(-e.jitter, e.jitter) : 0);
          const s = speed0 + (e.speedJitter ? rng.range(-e.speedJitter, e.speedJitter) : 0);
          bullets.spawn(cx - e.width / 2 + step * i + sh, cy, s, a, spec);
        }
        continue;
      }
      // 1点から放射（扇形・円形）
      const full = e.spread >= TAU - 1e-6;
      const step = n > 1 ? (full ? e.spread / n : e.spread / (n - 1)) : 0;
      const start = n > 1 && !full ? base - e.spread / 2 : base;
      for (let i = 0; i < n; i++) {
        const a = start + step * i + (e.jitter ? rng.range(-e.jitter, e.jitter) : 0);
        const s = speed0 + (e.speedJitter ? rng.range(-e.speedJitter, e.speedJitter) : 0);
        const x = cx + Math.cos(a) * e.radius;
        const y = cy + Math.sin(a) * e.radius;
        bullets.spawn(x, y, s, a, spec);
      }
    }
  }
}
