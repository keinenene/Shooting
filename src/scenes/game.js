// ボス戦の画面（M3）。難易度選択 → ボス戦 → 結果。ポーズあり
import { W, H, PLAYER, START, MISS, BOSS, SCORE, DIFFICULTY_ORDER, COLORS } from '../config.js';
import { Bomb } from '../bomb.js';
import { Boss } from '../boss.js';
import { BOSS1 } from '../stages/stage1.js';
import { debugFlags } from '../debug.js';
import { controlButtons, drawButton, beginField, endField, hudTop, fmt, FONT } from '../ui.js';

const TAU = Math.PI * 2;
const DIFF_NAME = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
const KIND_LABEL = { kill: '撃破', timeout: '時間切れ', endure: '耐え切り' };

export class GameScene {
  constructor(app) {
    this.app = app;
    this.frame = 0;
    this.state = 'select';      // select | play | paused | over | clear
    this.diff = 'normal';
    this.hi = { easy: 0, normal: 0, hard: 0 };   // ハイスコア（保存はM4）
    this.drag = { x: 0, y: 0 };
    this.popups = [];
    this.banner = null;         // フェーズ終了時の表示
    this.boss = null;
    this.world = {
      player: app.player,
      canHit: false,
      canGraze: false,
      onHit: () => this.onHit(),
      onGraze: (x, y) => this.onGraze(x, y),
    };
    // 自機ショットから見たボス（ダメージを与えたらスコアを足す）
    const g = this;
    this.target = {
      get x() { return g.boss.x; },
      get y() { return g.boss.y; },
      get r() { return g.boss.r; },
      get dead() { return g.boss.dead; },
      hit(d) { if (g.boss.damage(d) > 0) g.score += SCORE.shotHit; },
    };
  }

  // ---- 画面とボタン ----

  layout(view) {
    this.view = view;
    this.setButtons();
  }

  setButtons() {
    const v = this.view;
    const list = [];
    const cx = W / 2;
    switch (this.state) {
      case 'select':
        DIFFICULTY_ORDER.forEach((d, i) => {
          list.push({ id: d, mode: 'tap', x: cx - 110, y: 300 + i * 76, w: 220, h: 60, label: DIFF_NAME[d] });
        });
        if (debugFlags.enabled) list.push({ id: 'test', mode: 'tap', x: cx - 70, y: 540, w: 140, h: 34, label: 'パターンテスト' });
        break;
      case 'play': {
        list.push(...controlButtons(v));
        const y0 = hudTop(v, 52);
        list.push({ id: 'pause', mode: 'tap', x: W - 36, y: y0, w: 32, h: 28, label: 'Ⅱ' });
        if (debugFlags.enabled) {
          list.push({ id: 'skip', mode: 'tap', x: W - 70, y: 260, w: 66, h: 28, label: '次フェーズ' });
          list.push({ id: 'inv', mode: 'tap', x: W - 70, y: 296, w: 66, h: 28, label: '無敵' });
        }
        break;
      }
      case 'paused':
        list.push({ id: 'resume', mode: 'tap', x: cx - 100, y: 260, w: 200, h: 52, label: '再開' });
        list.push({ id: 'retry', mode: 'tap', x: cx - 100, y: 330, w: 200, h: 52, label: 'やり直す' });
        list.push({ id: 'menu', mode: 'tap', x: cx - 100, y: 400, w: 200, h: 52, label: '難易度選択へ' });
        break;
      case 'over':
      case 'clear':
        list.push({ id: 'retry', mode: 'tap', x: cx - 100, y: 470, w: 200, h: 52, label: 'もう一度' });
        list.push({ id: 'menu', mode: 'tap', x: cx - 100, y: 536, w: 200, h: 52, label: '難易度選択へ' });
        break;
    }
    this.buttons = list;
    this.app.input.setButtons(list);
  }

  setState(s) {
    this.state = s;
    this.setButtons();
  }

  // 画面が裏に回ったら自動でポーズ
  onHide() {
    if (this.state === 'play') this.setState('paused');
  }

  // ---- 進行 ----

  start() {
    const { player, shots, bullets, particles, rng } = this.app;
    player.reset();
    shots.clear();
    bullets.clear();
    particles.clear();
    this.bomb = new Bomb();
    const st = START[this.diff];
    this.maxLives = st.lives;
    this.maxBombs = st.bombs;
    this.lives = st.lives;
    this.bombs = st.bombs;
    this.score = 0;
    this.graze = 0;
    this.pending = 0;          // 喰らいボムの猶予の残り
    this.dead = 0;             // 復帰までの残り
    this.out = false;          // 残機が尽きた
    this.overT = 0;
    this.phaseMiss = false;
    this.phaseBomb = false;
    this.phaseLog = [];
    this.popups.length = 0;
    this.banner = null;
    this.result = null;
    this.boss = new Boss(BOSS1, this.diff, rng, {
      onPhaseEnd: (r) => this.onPhaseEnd(r),
      onDefeated: () => this.finish('clear'),
    });
    this.setState('play');
  }

  update() {
    const { input, particles, stars } = this.app;
    this.frame++;
    stars.update();
    particles.update();
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter((p) => p.t < 50);
    if (this.banner && ++this.banner.t > 100) this.banner = null;

    switch (this.state) {
      case 'select':
        for (const d of DIFFICULTY_ORDER) {
          if (input.takeTap(d)) {
            this.diff = d;
            this.start();
            return;
          }
        }
        if (input.takeTap('test')) this.app.toTest?.();
        break;
      case 'paused':
        if (input.takeTap('resume')) this.setState('play');
        else if (input.takeTap('retry')) this.start();
        else if (input.takeTap('menu')) this.setState('select');
        input.takeDrag(this.drag);  // ポーズ中のドラッグは捨てる
        break;
      case 'over':
      case 'clear':
        if (input.takeTap('retry')) this.start();
        else if (input.takeTap('menu')) this.setState('select');
        break;
      case 'play':
        this.updatePlay();
        break;
    }
  }

  updatePlay() {
    const { input, player, shots, bullets, particles, rng } = this.app;
    const boss = this.boss;

    if (input.takeTap('pause')) {
      this.setState('paused');
      return;
    }
    if (input.takeTap('skip')) boss.skipPhase();
    if (input.takeTap('inv')) debugFlags.invincible = !debugFlags.invincible;
    if (input.takeTap('bomb')) this.tryBomb();

    // 自機
    const drag = input.takeDrag(this.drag);
    if (this.out) {
      // 残機切れ：少し待ってからゲームオーバー
      if (--this.overT <= 0) this.finish('over');
    } else if (this.dead > 0) {
      this.updateRespawn();
    } else if (this.pending > 0) {
      if (--this.pending === 0) this.die();
    } else {
      player.update(drag, input.isHeld('slow'));
    }
    const alive = !this.out && this.dead === 0 && this.pending === 0;

    shots.update(player, alive, [this.target]);
    boss.update(bullets, player);

    // ボム：波が届いた弾を消し、波がボスに届いたらダメージ
    this.bomb.update(bullets, (bx, by, a) => {
      const s = 1.5 + rng.next() * 1.5;
      particles.spawn(bx, by, Math.cos(a) * s, Math.sin(a) * s, 22, '#bff');
    });
    if (this.bomb.active && !this.bomb.bossHit &&
        Math.hypot(boss.x - this.bomb.x, boss.y - this.bomb.y) <= this.bomb.r) {
      this.bomb.bossHit = true;
      if (boss.bombHit() > 0) particles.burst(rng, boss.x, boss.y, 30, 5, 30, '#bff');
    }

    const canHit = () => alive && this.pending === 0 && player.invincible === 0 &&
      !this.bomb.protecting && !debugFlags.invincible;
    this.world.canHit = canHit();
    this.world.canGraze = alive;
    bullets.update(this.world);

    // 突進中のボス本体との接触
    if (boss.bodyActive && canHit()) {
      const r = PLAYER.hitRadius + boss.bodyRadius;
      if ((boss.x - player.x) ** 2 + (boss.y - player.y) ** 2 < r * r) this.onHit();
    }
  }

  onHit() {
    if (this.pending > 0) return;
    this.pending = PLAYER.deathbombFrames;
    const { particles, rng, player } = this.app;
    particles.burst(rng, player.x, player.y, 10, 2, 16, '#f8a');
  }

  onGraze(x, y) {
    this.graze++;
    this.score += SCORE.graze;
    const { particles, rng, player } = this.app;
    const a = Math.atan2(y - player.y, x - player.x);
    for (let k = 0; k < 3; k++) {
      const s = 1.5 + rng.next() * 1.5, d = a + rng.range(-0.6, 0.6);
      particles.spawn(player.x + Math.cos(a) * 6, player.y + Math.sin(a) * 6,
        Math.cos(d) * s, Math.sin(d) * s, 14, '#ffd');
    }
  }

  tryBomb() {
    if (this.bombs <= 0 || this.bomb.active || this.dead > 0 || this.out) return;
    const { player } = this.app;
    this.bombs--;
    this.phaseBomb = true;
    if (this.pending > 0) {
      // 喰らいボム成功：被弾を取り消す
      this.pending = 0;
      this.popup('喰らいボム！', player.x, player.y - 24, '#9ff');
    }
    this.bomb.start(player.x, player.y);
  }

  die() {
    const { player, bullets, particles, rng } = this.app;
    this.lives--;
    this.phaseMiss = true;
    particles.burst(rng, player.x, player.y, 40, 5, 40, '#f8a');
    particles.burst(rng, player.x, player.y, 20, 2.5, 30, '#fff');
    bullets.clearCircle(player.x, player.y, MISS.clearRadius,
      (bx, by) => particles.spawn(bx, by, 0, -0.5, 16, '#fff'));
    // ボムは上限まで補充
    this.bombs = Math.max(this.bombs, this.maxBombs);
    if (this.lives <= 0) {
      this.out = true;
      this.overT = MISS.gameOverDelay;
    } else {
      this.dead = MISS.hiddenFrames + MISS.riseFrames;
    }
  }

  // 被弾後：しばらく消えてから、画面下から戻ってくる
  updateRespawn() {
    const { player } = this.app;
    this.dead--;
    const rise = MISS.riseFrames;
    if (this.dead === rise) {
      player.reset();
      player.y = H + 24;
    }
    if (this.dead < rise) {
      const k = 1 - this.dead / rise;
      player.y = H + 24 + (PLAYER.startY - H - 24) * (1 - (1 - k) ** 2);
    }
    if (this.dead === 0) player.invincible = PLAYER.invincibleFrames;
  }

  onPhaseEnd(r) {
    const { bullets, particles } = this.app;
    const kill = r.kind === 'kill';
    // 画面の弾を消す。削り切ったときだけスコアに変える
    let erased = 0;
    bullets.clearCircle(W / 2, H / 2, 2000, (x, y) => {
      erased++;
      particles.spawn(x, y, 0, -1.2, 24, kill ? '#ffd' : '#99c');
    });
    let gain = SCORE.phaseBase;
    const timeBonus = kill ? Math.round(r.remainSec * SCORE.timeBonusPerSec) : 0;
    const noMiss = !this.phaseMiss && !this.phaseBomb;
    const eraseBonus = kill ? erased * SCORE.eraseBullet : 0;
    gain += timeBonus + (noMiss ? SCORE.noMissBonus : 0) + eraseBonus;
    this.score += gain;
    this.phaseLog.push({ name: BOSS1.phases[r.phaseIdx].name, kind: r.kind, gain, noMiss });
    this.banner = {
      t: 0,
      title: kill ? 'PHASE CLEAR' : r.kind === 'timeout' ? 'TIME OUT' : 'SURVIVED',
      sub: '+' + fmt(gain),
      detail: [
        kill ? `残り ${r.remainSec.toFixed(1)}秒` : '',
        noMiss ? 'ノーミス・ノーボム' : '',
      ].filter(Boolean).join('　'),
    };
    this.phaseMiss = this.phaseBomb = false;
    if (r.last) {
      const { rng } = this.app;
      const b = this.boss;
      particles.burst(rng, b.x, b.y, 80, 7, 60, '#f8c');
      particles.burst(rng, b.x, b.y, 60, 4, 50, '#fff');
    }
  }

  finish(kind) {
    const res = { kind, lines: [] };
    if (kind === 'clear') {
      // ボス突破で残機+1（上限を超える分はスコアに）
      if (this.lives < this.maxLives) {
        this.lives++;
        res.lines.push(['残機 +1', '']);
      } else {
        this.score += SCORE.overflowLife;
        res.lines.push(['残機上限ボーナス', '+' + fmt(SCORE.overflowLife)]);
      }
      const lb = this.lives * SCORE.clearLife, bb = this.bombs * SCORE.clearBomb;
      this.score += lb + bb;
      res.lines.push([`残機ボーナス ×${this.lives}`, '+' + fmt(lb)]);
      res.lines.push([`ボムボーナス ×${this.bombs}`, '+' + fmt(bb)]);
    }
    res.newRecord = this.score > this.hi[this.diff];
    if (res.newRecord) this.hi[this.diff] = this.score;
    this.result = res;
    this.setState(kind);
  }

  popup(text, x, y, color) {
    this.popups.push({ text, x, y, color, t: 0 });
  }

  // ---- 描画 ----

  draw(ctx) {
    const { view, player, shots, bullets, particles, stars } = this.app;
    beginField(ctx, view);
    stars.draw(ctx);

    if (this.state !== 'select') {
      this.boss.draw(ctx);
      shots.draw(ctx);
      const visible = !this.out && this.dead <= MISS.riseFrames;
      if (visible) player.draw(ctx, this.frame);
      particles.draw(ctx);
      this.bomb.draw(ctx);
      bullets.draw(ctx, view);
      if (debugFlags.hitboxes) bullets.drawHitboxes(ctx);
      if (visible) player.drawHitbox(ctx, debugFlags.hitboxes || this.pending > 0);
      if (this.pending > 0) this.drawDeathbomb(ctx);
      this.drawPopups(ctx);
      this.drawCutin(ctx);
      this.drawBanner(ctx);
    } else {
      particles.draw(ctx);
    }
    endField(ctx);

    if (this.state === 'select') this.drawSelect(ctx);
    else this.drawHud(ctx);
    if (this.state === 'paused') this.drawOverlay(ctx, 'PAUSE');
    if (this.state === 'over' || this.state === 'clear') this.drawResult(ctx);

    const { input } = this.app;
    for (const b of this.buttons) {
      const opt = {};
      if (b.id === 'slow') opt.on = input.isHeld('slow');
      if (b.id === 'bomb') {
        opt.disabled = this.bombs <= 0;
        opt.label = `ボム ${this.bombs}`;
        opt.size = 12;
      }
      if (b.id === 'inv') opt.on = debugFlags.invincible;
      if (DIFFICULTY_ORDER.includes(b.id)) opt.size = 16;
      drawButton(ctx, b, opt);
    }
  }

  // 被弾直後：喰らいボムの猶予を示す縮んでいく赤い輪
  drawDeathbomb(ctx) {
    const { player } = this.app;
    const k = this.pending / PLAYER.deathbombFrames;
    ctx.strokeStyle = `rgba(255, 80, 100, ${0.5 + 0.5 * k})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 8 + 28 * k, 0, TAU);
    ctx.stroke();
  }

  drawHud(ctx) {
    const v = this.view;
    const y0 = hudTop(v, 52);
    const b = this.boss;
    ctx.save();
    ctx.textBaseline = 'top';

    // 1行目：スコアとハイスコア
    ctx.fillStyle = COLORS.ui;
    ctx.textAlign = 'left';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(fmt(this.score), 8, y0 + 2);
    ctx.textAlign = 'right';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = COLORS.uiDim;
    ctx.fillText('HI ' + fmt(Math.max(this.hi[this.diff], this.score)), W - 44, y0 + 3);

    // 2行目：残機・ボム・グレイズ
    const y1 = y0 + 19;
    for (let i = 0; i < this.maxLives; i++) {
      ctx.fillStyle = i < this.lives ? '#5ff' : 'rgba(95,255,255,0.18)';
      const x = 12 + i * 13;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x + 5, y1 + 10);
      ctx.lineTo(x - 5, y1 + 10);
      ctx.fill();
    }
    const bx0 = 18 + this.maxLives * 13;
    for (let i = 0; i < this.maxBombs; i++) {
      ctx.fillStyle = i < this.bombs ? '#8cf' : 'rgba(140,200,255,0.18)';
      ctx.beginPath();
      ctx.arc(bx0 + i * 13, y1 + 5, 4.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.uiDim;
    ctx.textAlign = 'right';
    ctx.fillText('GRAZE ' + this.graze, W - 44, y1);

    // ボスの体力ゲージ（フェーズの区切り線つき）と残り時間
    if (b.state !== 'entry' && b.state !== 'gone') {
      const gy = y0 + 36, gx = 8, gw = W - 60;
      let hp = b.hp;
      // 耐え切りフェーズは時間とともにゲージが減る
      if (b.state === 'active' && b.phase.endurance) {
        hp = b.floor + b.allot * (b.timer / b.timeTotal);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(gx, gy, gw, 4);
      ctx.fillStyle = b.phase.color;
      ctx.fillRect(gx, gy, gw * (hp / b.hpMax), 4);
      ctx.fillStyle = COLORS.bg;
      const n = b.def.phases.length;
      for (let i = 1; i < n; i++) ctx.fillRect(gx + (gw * i) / n - 1, gy - 1, 2, 6);

      if (b.state === 'active') {
        const sec = b.timer / 60;
        const warn = sec <= BOSS.warnSeconds;
        ctx.textAlign = 'right';
        ctx.font = `bold ${warn ? 15 : 13}px ${FONT}`;
        ctx.fillStyle = warn ? '#f67' : COLORS.ui;
        ctx.fillText(sec.toFixed(1), W - 6, gy - 5);
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = COLORS.ui;
        ctx.textAlign = 'left';
        ctx.fillText(b.phase.name, gx, gy + 8);
      }
    }
    ctx.restore();
  }

  // フェーズ開始と登場のカットイン（文字と帯だけ）
  drawCutin(ctx) {
    const b = this.boss;
    let main, sub, t, len;
    if (b.state === 'entry') {
      main = b.def.name;
      sub = 'WARNING';
      t = b.stateT;
      len = BOSS.entryFrames;
    } else if (b.state === 'intro') {
      main = b.phase.name;
      sub = b.phase.endurance ? `FINAL PHASE ― 耐え切れ` : `PHASE ${b.phaseIdx + 1}`;
      t = b.stateT;
      len = BOSS.introFrames;
    } else return;

    const inK = Math.min(1, t / 12);
    const outK = Math.min(1, Math.max(0, (len - t) / 12));
    const alpha = Math.min(inK, outK);
    const slide = (1 - inK) * 120;
    const y = 250;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10, 20, 40, 0.75)';
    ctx.fillRect(0, y - 26, W, 56);
    ctx.fillStyle = b.phase.color;
    ctx.fillRect(0, y - 26, W, 2);
    ctx.fillRect(0, y + 28, W, 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = b.phase.endurance && b.state === 'intro' ? '#f89' : COLORS.uiDim;
    ctx.fillText(sub, W / 2 - slide, y - 12);
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = b.phase.color;
    ctx.shadowBlur = 10;
    ctx.fillText(main, W / 2 + slide, y + 9);
    ctx.restore();
  }

  drawBanner(ctx) {
    const bn = this.banner;
    if (!bn) return;
    const alpha = Math.min(1, bn.t / 8, (100 - bn.t) / 15);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#4df';
    ctx.shadowBlur = 10;
    ctx.fillText(bn.title, W / 2, 200);
    ctx.shadowBlur = 0;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = '#ffd';
    ctx.fillText(bn.sub, W / 2, 226);
    if (bn.detail) {
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = COLORS.ui;
      ctx.fillText(bn.detail, W / 2, 248);
    }
    ctx.restore();
  }

  drawPopups(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold 13px ${FONT}`;
    for (const p of this.popups) {
      ctx.globalAlpha = 1 - p.t / 50;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - p.t * 0.4);
    }
    ctx.restore();
  }

  drawOverlay(ctx, title) {
    ctx.fillStyle = 'rgba(2, 4, 12, 0.7)';
    ctx.fillRect(this.view.left, this.view.top, this.view.right - this.view.left, this.view.bottom - this.view.top);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(title, W / 2, 190);
  }

  drawSelect(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillStyle = '#dff';
    ctx.shadowColor = '#4df';
    ctx.shadowBlur = 18;
    ctx.fillText('STARFALL', W / 2, 160);
    ctx.shadowBlur = 0;
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = COLORS.ui;
    ctx.fillText('ボス戦テスト版（M3）', W / 2, 200);
    ctx.fillText('難易度を選んでください', W / 2, 262);
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = COLORS.uiDim;
    DIFFICULTY_ORDER.forEach((d, i) => {
      const st = START[d];
      ctx.fillText(`残機 ${st.lives}・ボム ${st.bombs}　HI ${fmt(this.hi[d])}`, W / 2, 300 + i * 76 + 68);
    });
    ctx.restore();
  }

  drawResult(ctx) {
    const r = this.result;
    this.drawOverlay(ctx, r.kind === 'clear' ? 'STAGE CLEAR' : 'GAME OVER');
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `12px ${FONT}`;
    let y = 240;
    const row = (l, rt, color = COLORS.ui) => {
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(l, 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(rt, W - 40, y);
      y += 20;
    };
    this.phaseLog.forEach((p, i) => {
      // 「」の中だけを短く表示する
      const short = p.name.match(/「(.+)」/)?.[1] ?? p.name;
      row(`${i + 1}. ${short}`, `${KIND_LABEL[p.kind]}${p.noMiss ? '★' : ''}  +${fmt(p.gain)}`);
    });
    for (const [l, rt] of r.lines) row(l, rt, '#ffd');
    y += 8;
    ctx.font = `bold 18px ${FONT}`;
    row(`SCORE`, fmt(this.score), '#fff');
    ctx.font = `12px ${FONT}`;
    row(`${DIFF_NAME[this.diff]}  グレイズ ${this.graze}`, r.newRecord ? 'NEW RECORD!' : `HI ${fmt(this.hi[this.diff])}`,
      r.newRecord ? '#ff8' : COLORS.uiDim);
    ctx.restore();
  }
}
