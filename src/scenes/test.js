// M1・M2 用のテスト画面。自機の操作感と、弾パターンの確認を行う
import { W, H, INPUT, DIFFICULTY_ORDER, COLORS } from '../config.js';
import { Bomb } from '../bomb.js';
import { BASIC_PATTERNS, STRESS_PATTERN } from '../patterns/basic.js';
import { compilePattern, PatternRunner } from '../emitter.js';
import { debugFlags } from '../debug.js';

const DIFF_LABEL = { easy: 'E', normal: 'N', hard: 'H' };
const PATTERNS = [...BASIC_PATTERNS, STRESS_PATTERN];

export class TestScene {
  constructor(app) {
    this.app = app;
    this.frame = 0;
    this.patternIdx = 0;
    this.diff = 'normal';
    this.hits = 0;
    this.grazes = 0;
    this.drag = { x: 0, y: 0 };
    this.bomb = new Bomb();
    // 弾を撃つ的（ショットの当たりも確かめられる）
    this.target = {
      x: W / 2, y: 140, r: 18, dead: false, flash: 0, dmg: 0, dps: 0, dmgWindow: 0,
      hit: (d) => { this.target.flash = 3; this.target.dmg += d; },
    };
    this.world = {
      player: app.player,
      canHit: true,
      canGraze: true,
      onHit: (x, y) => this.onHit(x, y),
      onGraze: (x, y) => this.onGraze(x, y),
    };
    this.startPattern();
  }

  startPattern() {
    const def = PATTERNS[this.patternIdx];
    this.runner = new PatternRunner(compilePattern(def, this.diff), this.app.rng);
    this.app.bullets.clear();
  }

  // 画面サイズが変わったらボタンを配置し直す
  layout(view) {
    const S = INPUT.buttonSize;
    const G = INPUT.buttonGap;
    const bm = view.bottom - H - view.safeBottom;  // 下の余白（ホームバーを除く）
    // 低速とボムは左手の親指で押せるよう、左下に縦に並べる（ボムが上）。
    // 下の余白に2つ収まれば余白へ、1つなら低速だけ余白へ、足りなければゲーム領域に半透明で重ねる
    let by;
    if (bm >= S * 2 + G + 8) by = H + (bm - (S * 2 + G)) / 2 + S + G;
    else if (bm >= S + 4) by = H + (bm - S) / 2;
    else by = H - S - 10;
    const bx = INPUT.swapButtons ? W - 16 - S : 16;
    const bombY = by - S - G;
    const ty = 6, th = 28;
    this.buttons = [
      { id: 'slow', mode: 'hold', x: bx, y: by, w: S, h: S, label: '低速' },
      { id: 'bomb', mode: 'tap', x: bx, y: bombY, w: S, h: S, label: 'ボム' },
      { id: 'prev', mode: 'tap', x: 4, y: ty, w: 40, h: th, label: '◀' },
      { id: 'next', mode: 'tap', x: 48, y: ty, w: 40, h: th, label: '▶' },
      { id: 'diff', mode: 'tap', x: 96, y: ty, w: 48, h: th, label: '' },
      { id: 'hitbox', mode: 'tap', x: 152, y: ty, w: 64, h: th, label: '判定円' },
      { id: 'inv', mode: 'tap', x: 224, y: ty, w: 56, h: th, label: '無敵' },
      { id: 'reset', mode: 'tap', x: 288, y: ty, w: 68, h: th, label: 'リセット' },
    ];
    this.app.input.setButtons(this.buttons);
  }

  onHit(x, y) {
    const { player, bullets, particles, rng } = this.app;
    this.hits++;
    player.hit();
    particles.burst(rng, player.x, player.y, 24, 4, 30, '#f8a');
    // 自機の周りの弾を消して復帰しやすくする
    bullets.clearCircle(player.x, player.y, 56, (bx, by) => particles.spawn(bx, by, 0, -0.5, 16, '#fff'));
  }

  onGraze(x, y) {
    this.grazes++;
    const { particles, rng, player } = this.app;
    const a = Math.atan2(y - player.y, x - player.x);
    for (let k = 0; k < 3; k++) {
      const s = 1.5 + rng.next() * 1.5, d = a + rng.range(-0.6, 0.6);
      particles.spawn(player.x + Math.cos(a) * 6, player.y + Math.sin(a) * 6,
        Math.cos(d) * s, Math.sin(d) * s, 14, '#ffd');
    }
  }

  update() {
    const { input, player, shots, bullets, particles, stars } = this.app;
    this.frame++;

    // テスト用ボタン
    if (input.takeTap('prev')) {
      this.patternIdx = (this.patternIdx + PATTERNS.length - 1) % PATTERNS.length;
      this.startPattern();
    }
    if (input.takeTap('next')) {
      this.patternIdx = (this.patternIdx + 1) % PATTERNS.length;
      this.startPattern();
    }
    if (input.takeTap('diff')) {
      const i = DIFFICULTY_ORDER.indexOf(this.diff);
      this.diff = DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length];
      this.startPattern();
    }
    if (input.takeTap('hitbox')) debugFlags.hitboxes = !debugFlags.hitboxes;
    if (input.takeTap('inv')) debugFlags.invincible = !debugFlags.invincible;
    if (input.takeTap('reset')) {
      this.hits = this.grazes = 0;
      player.reset();
      this.startPattern();
    }
    // ボム（敵への効果と残数はM3で入れる）
    if (input.takeTap('bomb') && !this.bomb.active) this.bomb.start(player.x, player.y);
    this.bomb.update(bullets, (bx, by, a) => {
      // 消えた弾は、波に押し出されるように外へ散る光になる
      const s = 1.5 + this.app.rng.next() * 1.5;
      particles.spawn(bx, by, Math.cos(a) * s, Math.sin(a) * s, 22, '#bff');
    });

    player.update(input.takeDrag(this.drag), input.isHeld('slow'));

    const t = this.target;
    shots.update(player, true, [t]);
    if (t.flash > 0) t.flash--;
    // 的が受けたダメージを1秒ごとに集計して表示する
    if (++t.dmgWindow >= 60) {
      t.dps = t.dmg;
      t.dmg = 0;
      t.dmgWindow = 0;
    }

    this.runner.update(bullets, player, t.x, t.y);
    this.world.canHit = player.invincible === 0 && !this.bomb.protecting && !debugFlags.invincible;
    bullets.update(this.world);
    particles.update();
    stars.update();
  }

  draw(ctx) {
    const { view, player, shots, bullets, particles, stars, fps } = this.app;

    // 画面全体（余白）とゲーム領域
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.margin;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    view.apply(ctx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    stars.draw(ctx);

    // 的
    const t = this.target;
    ctx.strokeStyle = t.flash ? '#fff' : '#f6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    shots.draw(ctx);
    player.draw(ctx, this.frame);
    particles.draw(ctx);
    this.bomb.draw(ctx);
    bullets.draw(ctx, view);       // 弾は最前面に近い位置に描く
    if (debugFlags.hitboxes) bullets.drawHitboxes(ctx);
    player.drawHitbox(ctx, debugFlags.hitboxes);
    ctx.restore();

    // ゲーム領域の枠
    ctx.strokeStyle = 'rgba(80, 120, 200, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);

    this.drawHud(ctx, view, fps);
    this.drawButtons(ctx);
  }

  drawHud(ctx, view, fps) {
    const def = PATTERNS[this.patternIdx];
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    // 上の余白が狭い端末ではゲーム領域の中に表示する
    const y0 = view.top + view.safeTop + 8 < -36 ? view.top + view.safeTop + 8 : 40;
    ctx.fillStyle = COLORS.ui;
    ctx.fillText(`${this.patternIdx + 1}/${PATTERNS.length} ${def.name}`, 6, y0);
    ctx.fillText(`被弾 ${this.hits}   グレイズ ${this.grazes}   的DPS ${this.target.dps}`, 6, y0 + 16);
    ctx.textAlign = 'right';
    ctx.fillText(`FPS ${fps.fps}  更新 ${fps.ups}/s`, W - 6, y0);
    ctx.fillText(`弾 ${this.app.bullets.n}  最大処理 ${fps.worst.toFixed(1)}ms`, W - 6, y0 + 16);
  }

  drawButtons(ctx) {
    const { input } = this.app;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of this.buttons) {
      let label = b.label;
      let on = false;
      if (b.id === 'diff') label = '難 ' + DIFF_LABEL[this.diff];
      if (b.id === 'hitbox') on = debugFlags.hitboxes;
      if (b.id === 'inv') on = debugFlags.invincible;
      if (b.id === 'slow') on = input.isHeld('slow');
      const big = b.mode === 'hold' || b.id === 'bomb';
      ctx.fillStyle = on ? 'rgba(90, 220, 255, 0.35)' : 'rgba(40, 70, 120, 0.25)';
      ctx.strokeStyle = on ? 'rgba(150, 240, 255, 0.9)' : COLORS.uiDim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (big) ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
      else ctx.roundRect(b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORS.ui;
      ctx.font = big ? 'bold 14px system-ui, sans-serif' : '12px system-ui, sans-serif';
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
    }
  }
}
