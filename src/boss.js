// ボス。体力は1本で、フェーズごとに削れる量の上限がある（フェーズ数で等分）。
// 状態：entry（登場）→ intro（フェーズ開始の猶予）→ active → transition → intro … → defeat → gone
import { W, H, BOSS } from './config.js';
import { compilePattern, PatternRunner } from './emitter.js';

const TAU = Math.PI * 2;

export class Boss {
  // hooks: { onPhaseEnd(result), onDefeated() }
  constructor(def, diffKey, rng, hooks) {
    this.def = def;
    this.diff = diffKey;
    this.rng = rng;
    this.hooks = hooks;
    this.allot = def.phaseHp;
    this.hpMax = def.phaseHp * def.phases.length;
    this.hp = this.hpMax;
    this.phaseIdx = 0;
    this.state = 'entry';
    this.stateT = 0;
    this.timer = 0;           // 残り時間（フレーム）
    this.timeTotal = 1;
    this.runners = [];
    this.x = W / 2;
    this.y = -60;
    this.flash = 0;           // 被弾時の白い光
    this.r = BOSS.shotRadius; // ショットが当たる半径（shots.js の的として使う）
    this.frame = 0;
    // 突進
    this.charge = { state: 'none', t: 0, cool: 0, vx: 0, vy: 0, homeX: 0, homeY: 0 };
  }

  get phase() {
    return this.def.phases[this.phaseIdx];
  }

  // ショットやボムが効く状態か
  get damageable() {
    return this.state === 'active' && !this.phase.endurance;
  }

  // shots.js から見た「的が無効」
  get dead() {
    return !this.damageable;
  }

  // 本体に当たり判定があるか（突進中のみ）
  get bodyActive() {
    return this.state === 'active' && this.charge.state === 'dash';
  }

  get bodyRadius() {
    return this.phase.charge?.bodyRadius ?? 20;
  }

  // このフェーズで削れる下限
  get floor() {
    return this.hpMax - this.allot * (this.phaseIdx + 1);
  }

  hit(d) {
    return this.damage(d);
  }

  // 与えたダメージ量を返す（上限で切り詰める）
  damage(d) {
    if (!this.damageable) return 0;
    const nd = Math.min(d, this.hp - this.floor);
    this.hp -= nd;
    this.flash = 2;
    if (this.hp <= this.floor) this.endPhase('kill');
    return nd;
  }

  bombHit() {
    return this.damage(this.allot * BOSS.bombRatio);
  }

  // デバッグ用：今のフェーズを削り切りで終える
  skipPhase() {
    if (this.state !== 'active') return;
    if (this.phase.endurance) this.endPhase('endure');
    else this.damage(this.hp - this.floor);
  }

  startPhase(i) {
    this.phaseIdx = i;
    this.state = 'intro';
    this.stateT = 0;
    this.runners = [];
    this.charge.state = 'none';
    this.charge.cool = this.phase.charge?.first ?? this.phase.charge?.every ?? 0;
  }

  activate() {
    const p = this.phase;
    this.state = 'active';
    this.stateT = 0;
    this.timeTotal = this.timer = Math.round(p.time * 60);
    this.runners = p.patterns.map((d) => new PatternRunner(compilePattern(d, this.diff), this.rng));
  }

  endPhase(kind) {
    const last = this.phaseIdx === this.def.phases.length - 1;
    const result = {
      kind,                                  // 'kill' | 'timeout' | 'endure'
      phaseIdx: this.phaseIdx,
      remainSec: this.timer / 60,
      endurance: !!this.phase.endurance,
      last,
    };
    this.hp = this.floor;
    this.runners = [];
    this.charge.state = 'none';
    this.state = last ? 'defeat' : 'transition';
    this.stateT = 0;
    this.hooks.onPhaseEnd(result);
  }

  update(bullets, player) {
    this.frame++;
    this.stateT++;
    if (this.flash > 0) this.flash--;

    switch (this.state) {
      case 'entry': {
        // 画面上から降りてくる
        const k = Math.min(1, this.stateT / BOSS.entryFrames);
        const [hx, hy] = this.home(0);
        this.x = hx;
        this.y = -60 + (hy + 60) * (1 - (1 - k) ** 3);
        if (k >= 1) this.startPhase(0);
        return;
      }
      case 'intro':
        this.move(player, true);
        if (this.stateT >= BOSS.introFrames) this.activate();
        return;
      case 'transition':
        this.move(player, true);
        if (this.stateT >= BOSS.transitionFrames) this.startPhase(this.phaseIdx + 1);
        return;
      case 'defeat':
        // 震えながら止まる
        this.x += this.rng.range(-1.5, 1.5);
        this.y += this.rng.range(-1.5, 1.5);
        if (this.stateT >= BOSS.defeatFrames) {
          this.state = 'gone';
          this.hooks.onDefeated();
        }
        return;
      case 'gone':
        return;
    }

    // active
    this.move(player, false);
    for (const r of this.runners) {
      if (r.done) r.reset();
      r.update(bullets, player, this.x, this.y);
    }
    if (--this.timer <= 0) {
      this.timer = 0;
      this.endPhase(this.phase.endurance ? 'endure' : 'timeout');
    }
  }

  // フェーズの移動パターンが目指す位置
  home(t) {
    const m = this.def.phases[this.phaseIdx].move || { type: 'hover' };
    const x0 = m.x ?? W / 2, y0 = m.y ?? 120;
    switch (m.type) {
      case 'sway':
        return [x0 + (m.amp ?? 80) * Math.sin((TAU * t) / (m.period ?? 240)), y0 + 6 * Math.sin((TAU * t) / 97)];
      case 'wander': {
        const pts = m.points;
        const i = Math.floor(t / (m.wait ?? 150)) % pts.length;
        return pts[i];
      }
      default:
        return [x0, y0 + 4 * Math.sin((TAU * t) / 120)];
    }
  }

  move(player, calm) {
    const c = this.charge;
    const cdef = this.phase.charge;
    const t = this.frame;
    const [tx, ty] = this.home(t);

    if (!calm && cdef && c.state === 'none' && --c.cool <= 0) {
      c.state = 'tele';
      c.t = 0;
    }
    switch (c.state) {
      case 'tele':
        // 予告：その場で止まって赤く光る
        if (++c.t >= cdef.telegraph) {
          c.state = 'dash';
          c.t = 0;
          const gx = player.x, gy = Math.min(player.y, H - 40);
          const a = Math.atan2(gy - this.y, gx - this.x);
          c.vx = Math.cos(a) * cdef.speed;
          c.vy = Math.sin(a) * cdef.speed;
          c.dist = Math.hypot(gx - this.x, gy - this.y) + 30;
        }
        return;
      case 'dash':
        this.x += c.vx;
        this.y += c.vy;
        c.dist -= cdef.speed;
        if (c.dist <= 0 || this.y > H - 30 || this.x < 20 || this.x > W - 20) {
          c.state = 'back';
          c.t = 0;
        }
        return;
      case 'back': {
        const dx = tx - this.x, dy = ty - this.y;
        const d = Math.hypot(dx, dy);
        const s = cdef.returnSpeed;
        if (d <= s) {
          c.state = 'none';
          c.cool = cdef.every;
        } else {
          this.x += (dx / d) * s;
          this.y += (dy / d) * s;
        }
        return;
      }
    }
    // 通常の移動：目標へなめらかに寄せる
    this.x += (tx - this.x) * 0.06;
    this.y += (ty - this.y) * 0.06;
  }

  draw(ctx) {
    if (this.state === 'gone') return;
    const color = this.phase.color || '#4df';
    const t = this.frame;
    const tele = this.charge.state === 'tele';
    const dash = this.charge.state === 'dash';
    const main = dash ? '#f45' : color;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 予告と突進中は、本体に判定があることを示す赤い輪
    if (tele || dash) {
      const pulse = tele ? 0.4 + 0.4 * Math.sin(this.charge.t * 0.5) : 0.9;
      ctx.strokeStyle = `rgba(255, 70, 90, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.bodyRadius + 8, 0, TAU);
      ctx.stroke();
    }

    ctx.shadowColor = main;
    ctx.shadowBlur = 12;
    ctx.lineJoin = 'round';

    // 外側で回る輪（6つの弧）
    ctx.strokeStyle = main;
    ctx.lineWidth = 2.5;
    const rot = t * 0.02;
    for (let i = 0; i < 6; i++) {
      const a = rot + (i * TAU) / 6;
      ctx.beginPath();
      ctx.arc(0, 0, 30, a, a + 0.6);
      ctx.stroke();
    }

    // 左右の翼
    ctx.fillStyle = 'rgba(20, 30, 60, 0.9)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 14, -6);
      ctx.lineTo(s * 44, -14);
      ctx.lineTo(s * 38, 6);
      ctx.lineTo(s * 14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 六角形の核
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -rot * 1.5 + (i * TAU) / 6;
      const px = Math.cos(a) * 17, py = Math.sin(a) * 17;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 中心の光（脈打つ）
    ctx.shadowBlur = 0;
    const core = 7 + Math.sin(t * 0.15) * 1.5;
    ctx.fillStyle = this.flash ? '#fff' : main;
    ctx.beginPath();
    ctx.arc(0, 0, core, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, core * 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
