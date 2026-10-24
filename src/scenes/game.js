// ゲーム本編。タイトル → 難易度選択 → ステージ（道中・中ボス・ボス）→ 結果。ポーズあり
import {
  W, H, PLAYER, START, MISS, BOSS, SCORE, POWER, ITEMS, DIFFICULTY_ORDER, COLORS,
} from '../config.js';
import { Bomb } from '../bomb.js';
import { Boss } from '../boss.js';
import { Enemies } from '../enemies.js';
import { Items, IT_POW_S, IT_POW_L, IT_BOMB, IT_POINT } from '../items.js';
import { Asteroids } from '../render.js';
import { Rng } from '../rng.js';
import { STAGE1 } from '../stages/stage1.js';
import { sound } from '../audio.js';
import { save, submitScore, record } from '../storage.js';
import { debugFlags } from '../debug.js';
import { controlButtons, drawButton, beginField, endField, hudTop, fmt, FONT } from '../ui.js';

const TAU = Math.PI * 2;
const DIFF_NAME = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
const KIND_LABEL = { kill: '撃破', timeout: '時間切れ', endure: '耐え切り' };
const ITEM_OF = { powS: IT_POW_S, powL: IT_POW_L, bomb: IT_BOMB };
const STAGE_INTRO = 150;   // ステージ名を表示するフレーム数
const RESUME_COUNT = 3;    // ポーズから再開するまでのカウント（秒）

export class GameScene {
  constructor(app) {
    this.app = app;
    this.frame = 0;
    this.state = 'title';       // title | select | play | paused | resume（再開前のカウント）| over | clear
    this.diff = 'normal';
    this.stage = STAGE1;
    this.drag = { x: 0, y: 0 };
    this.popups = [];
    this.banner = null;
    this.boss = null;
    this.bomb = new Bomb();
    this.items = new Items();
    this.asteroids = new Asteroids(new Rng(777));
    this.targets = [];
    this.enemies = new Enemies({
      onKill: (e) => this.onEnemyKill(e),
      onHit: () => sound.play('hit'),
    });
    this.world = {
      player: app.player,
      canHit: false,
      canGraze: false,
      onHit: () => this.onHit(),
      onGraze: (x, y) => this.onGraze(x, y),
    };
    // 自機ショットから見たボス（ダメージを与えたらスコアを足す）
    const g = this;
    this.bossTarget = {
      get x() { return g.boss.x; },
      get y() { return g.boss.y; },
      get r() { return g.boss.r; },
      get dead() { return g.boss.dead; },
      hit(d) {
        if (g.boss.damage(d) > 0) {
          g.score += SCORE.shotHit;
          sound.play('hit');
        }
      },
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
      case 'title':
        if (debugFlags.enabled) list.push({ id: 'test', mode: 'tap', x: cx - 70, y: 560, w: 140, h: 34, label: 'パターンテスト' });
        // 画面のどこをタップしても始まる
        list.push({ id: 'start', mode: 'tap', x: v.left, y: v.top, w: v.right - v.left, h: v.bottom - v.top, hidden: false, invisible: true });
        break;
      case 'select':
        DIFFICULTY_ORDER.forEach((d, i) => {
          list.push({ id: d, mode: 'tap', x: cx - 110, y: 220 + i * 86, w: 220, h: 60, label: DIFF_NAME[d] });
        });
        list.push({ id: 'back', mode: 'tap', x: cx - 60, y: 500, w: 120, h: 40, label: '戻る' });
        break;
      case 'play': {
        list.push(...controlButtons(v));
        const y0 = hudTop(v, 52);
        list.push({ id: 'pause', mode: 'tap', x: W - 36, y: y0, w: 32, h: 28, label: 'Ⅱ' });
        if (debugFlags.enabled) {
          list.push({ id: 'skip', mode: 'tap', x: W - 70, y: 260, w: 66, h: 28, label: '次へ' });
          list.push({ id: 'inv', mode: 'tap', x: W - 70, y: 296, w: 66, h: 28, label: '無敵' });
        }
        break;
      }
      case 'resume':
        // カウント中も低速・ボムのボタンは表示し、指を置いておけるようにする
        list.push(...controlButtons(v));
        break;
      case 'paused':
        list.push({ id: 'resume', mode: 'tap', x: cx - 100, y: 260, w: 200, h: 52, label: '再開' });
        list.push({ id: 'retry', mode: 'tap', x: cx - 100, y: 330, w: 200, h: 52, label: 'やり直す' });
        list.push({ id: 'title', mode: 'tap', x: cx - 100, y: 400, w: 200, h: 52, label: 'タイトルへ' });
        break;
      case 'over':
      case 'clear':
        list.push({ id: 'retry', mode: 'tap', x: cx - 100, y: 490, w: 200, h: 48, label: 'もう一度' });
        list.push({ id: 'title', mode: 'tap', x: cx - 100, y: 550, w: 200, h: 48, label: 'タイトルへ' });
        break;
    }
    this.buttons = list;
    this.app.input.setButtons(list);
  }

  setState(s) {
    this.state = s;
    this.setButtons();
    if (s === 'title' || s === 'select') sound.stopMusic();
  }

  // 画面が裏に回ったら自動でポーズ
  onHide() {
    if (this.state === 'play' || this.state === 'resume') this.setState('paused');
  }

  // ---- 進行 ----

  start() {
    const { player, shots, bullets, particles } = this.app;
    player.reset();
    shots.clear();
    bullets.clear();
    particles.clear();
    this.enemies.clear();
    this.items.clear();
    this.bomb = new Bomb();
    const st = START[this.diff];
    this.maxLives = st.lives;
    this.maxBombs = st.bombs;
    this.lives = st.lives;
    this.bombs = st.bombs;
    this.power = 0;            // 攻撃力の段階（0〜POWER.maxLevel）
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
    this.boss = null;
    this.playT = 0;
    this.segIdx = -1;
    this.setState('play');
    this.nextSegment();
  }

  // 次の区間（道中・中ボス・ボス）へ
  nextSegment() {
    this.segIdx++;
    const seg = this.stage.segments[this.segIdx];
    this.seg = seg;
    this.segT = 0;
    record(this.diff, seg.id, false);
    sound.playMusic(seg.bgm);
    if (seg.type === 'waves') {
      // count/gap/dx を展開して、出現順に並べる
      const q = [];
      for (const w of seg.waves) {
        const n = w.count ?? 1;
        for (let k = 0; k < n; k++) {
          q.push({ at: w.at + k * (w.gap ?? 0), x: w.x + k * (w.dx ?? 0), w });
        }
      }
      q.sort((a, b) => a.at - b.at);
      this.queue = q;
      this.queueIdx = 0;
    } else {
      this.boss = new Boss(seg.boss, this.diff, this.app.rng, {
        onPhaseEnd: (r) => this.onPhaseEnd(r),
        onDefeated: (retreated) => this.onBossGone(retreated),
        onTelegraph: () => sound.play('charge'),
      });
      this.lastBossState = '';
    }
  }

  update() {
    const { input, particles, stars } = this.app;
    this.frame++;
    stars.update();
    this.asteroids.update();
    particles.update();
    sound.update();
    for (const p of this.popups) p.t++;
    if (this.popups.length && this.popups[0].t >= 50) this.popups = this.popups.filter((p) => p.t < 50);
    if (this.banner && ++this.banner.t > 100) this.banner = null;

    switch (this.state) {
      case 'title':
        if (input.takeTap('test')) {
          this.app.toTest?.();
          return;
        }
        if (input.takeTap('start')) {
          sound.play('select');
          this.setState('select');
        }
        break;
      case 'select':
        for (const d of DIFFICULTY_ORDER) {
          if (input.takeTap(d)) {
            sound.play('select');
            this.diff = d;
            this.start();
            return;
          }
        }
        if (input.takeTap('back')) this.setState('title');
        break;
      case 'paused':
        if (input.takeTap('resume')) {
          // すぐには再開せず、カウントダウンしてから
          this.resumeT = RESUME_COUNT * 60;
          sound.play('warn');
          this.setState('resume');
        }
        else if (input.takeTap('retry')) this.start();
        else if (input.takeTap('title')) this.setState('title');
        input.takeDrag(this.drag);  // ポーズ中のドラッグは捨てる
        break;
      case 'resume':
        input.takeDrag(this.drag);  // カウント中に指を置き直しても自機は動かさない
        input.takeTap('bomb');      // カウント中のボムは発動しない
        if (--this.resumeT <= 0) this.setState('play');
        else if (this.resumeT % 60 === 0) sound.play('warn');
        break;
      case 'over':
      case 'clear':
        if (input.takeTap('retry')) this.start();
        else if (input.takeTap('title')) this.setState('title');
        break;
      case 'play':
        this.updatePlay();
        break;
    }
  }

  updatePlay() {
    const { input, player, shots, bullets, particles, rng } = this.app;
    this.playT++;
    this.segT++;

    if (input.takeTap('pause')) {
      this.setState('paused');
      return;
    }
    if (input.takeTap('skip')) this.debugSkip();
    if (input.takeTap('inv')) debugFlags.invincible = !debugFlags.invincible;
    if (input.takeTap('bomb')) this.tryBomb();

    // 自機
    const drag = input.takeDrag(this.drag);
    if (this.out) {
      // 残機切れ：少し待ってからゲームオーバー
      if (--this.overT <= 0) {
        this.finish('over');
        return;
      }
    } else if (this.dead > 0) {
      this.updateRespawn();
    } else if (this.pending > 0) {
      if (--this.pending === 0) this.die();
    } else {
      player.update(drag, input.isHeld('slow'));
    }
    const alive = !this.out && this.dead === 0 && this.pending === 0;

    // 区間の進行
    if (this.seg.type === 'waves') {
      const q = this.queue;
      while (this.queueIdx < q.length && q[this.queueIdx].at <= this.segT) {
        const s = q[this.queueIdx++];
        this.enemies.spawn(s.w, s.x, this.diff, rng, this.stage.patterns);
      }
      const len = this.seg.length;
      // 全員出し切って画面から敵がいなくなったら（最大5秒待って）次へ
      if ((this.segT >= len && !this.enemies.active) || this.segT >= len + 300) {
        record(this.diff, this.seg.id, true);
        this.nextSegment();
      }
    }

    // ショット：道中の敵とボスに当てる
    const tg = this.targets;
    tg.length = 0;
    for (const e of this.enemies.list) if (e.alive) tg.push(e);
    if (this.boss) tg.push(this.bossTarget);
    shots.update(player, alive, tg, 1 + this.power * POWER.step);

    this.enemies.update(bullets, player);
    if (this.boss) this.updateBoss();

    // ボム：波が届いた弾を消し、波に触れた敵を倒し、ボスに届いたらダメージ
    const bomb = this.bomb;
    bomb.update(bullets, (bx, by, a) => {
      const s = 1.5 + rng.next() * 1.5;
      particles.spawn(bx, by, Math.cos(a) * s, Math.sin(a) * s, 22, '#bff');
      if (!this.items.spawn(IT_POINT, bx, by, null, true)) this.score += SCORE.pointItem;
    });
    if (bomb.active && bomb.t <= 60) {
      const r2 = bomb.r * bomb.r;
      for (const e of this.enemies.list) {
        if (e.alive && (e.x - bomb.x) ** 2 + (e.y - bomb.y) ** 2 < r2) {
          e.entered = true;
          e.hit(99999);
        }
      }
      const b = this.boss;
      if (b && !bomb.bossHit && (b.x - bomb.x) ** 2 + (b.y - bomb.y) ** 2 <= r2) {
        bomb.bossHit = true;
        if (b.bombHit() > 0) particles.burst(rng, b.x, b.y, 30, 5, 30, '#bff');
      }
    }

    const canHit = () => alive && this.pending === 0 && player.invincible === 0 &&
      !bomb.protecting && !debugFlags.invincible;
    this.world.canHit = canHit();
    this.world.canGraze = alive;
    bullets.update(this.world);

    // 突進中のボス本体との接触
    const b = this.boss;
    if (b && b.bodyActive && canHit()) {
      const r = PLAYER.hitRadius + b.bodyRadius;
      if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 < r * r) this.onHit();
    }

    // アイテム：回収ラインより上にいれば全部吸い寄せる
    this.items.update(player, alive, player.y < ITEMS.collectLine, player.slow,
      (type, x, y) => this.onItem(type, x, y));
  }

  updateBoss() {
    const b = this.boss;
    const { bullets, player } = this.app;
    b.update(bullets, player);
    if (b.state !== this.lastBossState) {
      if (b.state === 'intro' || b.state === 'entry') sound.play('cutin');
      if (b.state === 'intro') {
        record(this.diff, `${this.seg.id}-${b.phaseIdx}`, false);
        this.phaseMiss = this.phaseBomb = false;
      }
      this.lastBossState = b.state;
    }
    // 残り10秒からは1秒ごとに警告音
    if (b.state === 'active' && b.timer % 60 === 0 && b.timer / 60 <= BOSS.warnSeconds) sound.play('warn');
  }

  debugSkip() {
    if (this.boss) {
      this.boss.skipPhase();
    } else {
      this.enemies.clear();
      this.queueIdx = this.queue.length;
      this.segT = this.seg.length;
    }
  }

  onHit() {
    if (this.pending > 0) return;
    this.pending = PLAYER.deathbombFrames;
    const { particles, rng, player } = this.app;
    particles.burst(rng, player.x, player.y, 10, 2, 16, '#f8a');
    sound.play('pichun');
  }

  onGraze(x, y) {
    this.graze++;
    this.score += SCORE.graze;
    sound.play('graze');
    const { particles, rng, player } = this.app;
    const a = Math.atan2(y - player.y, x - player.x);
    for (let k = 0; k < 3; k++) {
      const s = 1.5 + rng.next() * 1.5, d = a + rng.range(-0.6, 0.6);
      particles.spawn(player.x + Math.cos(a) * 6, player.y + Math.sin(a) * 6,
        Math.cos(d) * s, Math.sin(d) * s, 14, '#ffd');
    }
  }

  onEnemyKill(e) {
    const { particles, rng } = this.app;
    this.score += e.type.score;
    const big = e.type.big;
    particles.burst(rng, e.x, e.y, big ? 40 : 12, big ? 5 : 3, big ? 40 : 24, e.type.color);
    sound.play(big ? 'bigkill' : 'kill');
    // ドロップ
    const d = e.type.drop || {};
    for (const [k, v] of Object.entries(d)) {
      if (v < 1) {
        if (rng.next() < v) this.items.spawn(ITEM_OF[k], e.x, e.y, rng);
      } else {
        for (let i = 0; i < v; i++) this.items.spawn(ITEM_OF[k], e.x, e.y, rng);
      }
    }
    if (e.drop) this.items.spawn(ITEM_OF[e.drop], e.x, e.y, rng);
  }

  onItem(type, x, y) {
    switch (type) {
      case IT_POW_S:
      case IT_POW_L: {
        const add = type === IT_POW_S ? 1 : 5;
        const before = this.power;
        this.power = Math.min(POWER.maxLevel, this.power + add);
        if (this.power === before) this.score += SCORE.powerOverflow;
        if (this.power === POWER.maxLevel && before < POWER.maxLevel) this.popup('POWER MAX', x, y - 10, '#f9b');
        sound.play('power');
        break;
      }
      case IT_BOMB:
        if (this.bombs < this.maxBombs) {
          this.bombs++;
          this.popup('BOMB +1', x, y - 10, '#9fc');
        } else {
          this.score += SCORE.overflowBomb;
          this.popup('+' + fmt(SCORE.overflowBomb), x, y - 10, '#9fc');
        }
        sound.play('get');
        break;
      case IT_POINT:
        this.score += SCORE.pointItem;
        sound.play('item');
        break;
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
    sound.play('bomb');
  }

  die() {
    const { player, bullets, particles, rng } = this.app;
    this.lives--;
    this.phaseMiss = true;
    sound.play('miss');
    particles.burst(rng, player.x, player.y, 40, 5, 40, '#f8a');
    particles.burst(rng, player.x, player.y, 20, 2.5, 30, '#fff');
    bullets.clearCircle(player.x, player.y, MISS.clearRadius,
      (bx, by) => particles.spawn(bx, by, 0, -0.5, 16, '#fff'));
    // ボムは上限まで補充
    this.bombs = Math.max(this.bombs, this.maxBombs);
    // 攻撃力が下がり、一部をその場にばらまく
    const lost = Math.min(this.power, POWER.missLoss);
    this.power -= lost;
    for (let i = 0; i < Math.min(lost, POWER.missDrop); i++) {
      this.items.spawn(IT_POW_S, player.x, player.y, rng);
    }
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
    const { bullets, particles, rng } = this.app;
    const kill = r.kind === 'kill';
    const b = this.boss;
    // 画面の弾を消す。削り切ったときはスコア点アイテムに変わって自機に集まる
    bullets.clearCircle(W / 2, H / 2, 2000, (x, y) => {
      particles.spawn(x, y, 0, -1.2, 24, kill ? '#ffd' : '#99c');
      if (kill && !this.items.spawn(IT_POINT, x, y, null, true)) this.score += SCORE.pointItem;
    });
    let gain = SCORE.phaseBase;
    const timeBonus = kill ? Math.round(r.remainSec * SCORE.timeBonusPerSec) : 0;
    const noMiss = !this.phaseMiss && !this.phaseBomb;
    gain += timeBonus + (noMiss ? SCORE.noMissBonus : 0);
    this.score += gain;
    if (!this.phaseMiss) record(this.diff, `${this.seg.id}-${r.phaseIdx}`, true);
    this.phaseLog.push({ name: b.def.phases[r.phaseIdx].name, kind: r.kind, gain, noMiss, mid: !!this.seg.midboss });
    this.banner = {
      t: 0,
      title: kill ? 'PHASE CLEAR' : r.kind === 'timeout' ? 'TIME OUT' : 'SURVIVED',
      sub: '+' + fmt(gain),
      detail: [
        kill ? `残り ${r.remainSec.toFixed(1)}秒` : '',
        noMiss ? 'ノーミス・ノーボム' : '',
      ].filter(Boolean).join('　'),
    };
    sound.play('phase');
    this.phaseMiss = this.phaseBomb = false;
    if (r.last && !b.retreated) {
      particles.burst(rng, b.x, b.y, 80, 7, 60, '#f8c');
      particles.burst(rng, b.x, b.y, 60, 4, 50, '#fff');
      sound.play('bigkill');
      // 中ボスを倒したら、ボムなどを落とす
      for (const d of b.def.drops || []) this.items.spawn(ITEM_OF[d], b.x, b.y, rng);
    }
  }

  // ボスが撃破されるか、中ボスが去った
  onBossGone(retreated) {
    if (!retreated) record(this.diff, this.seg.id, true);
    this.boss = null;
    if (this.seg.midboss) this.nextSegment();
    else this.finish('clear');
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
    res.newRecord = submitScore(this.diff, this.score);
    this.result = res;
    sound.stopMusic();
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
    this.asteroids.draw(ctx);

    const inGame = this.state !== 'title' && this.state !== 'select';
    if (inGame) {
      this.boss?.draw(ctx);
      this.enemies.draw(ctx);
      shots.draw(ctx);
      this.items.draw(ctx);
      const visible = !this.out && this.dead <= MISS.riseFrames;
      if (visible) player.draw(ctx, this.frame);
      particles.draw(ctx);
      this.bomb.draw(ctx);
      bullets.draw(ctx, view);
      if (debugFlags.hitboxes) bullets.drawHitboxes(ctx);
      if (visible) player.drawHitbox(ctx, debugFlags.hitboxes || this.pending > 0);
      if (this.pending > 0) this.drawDeathbomb(ctx);
      this.drawPopups(ctx);
      if (this.boss) this.drawCutin(ctx);
      this.drawBanner(ctx);
      this.drawStageIntro(ctx);
      // 回収ライン（自機が近づくと薄く表示）
      if (this.state === 'play' && player.y < ITEMS.collectLine + 60 && this.items.count > 0) {
        ctx.fillStyle = 'rgba(150, 200, 255, 0.15)';
        ctx.fillRect(0, ITEMS.collectLine, W, 1);
      }
    } else {
      particles.draw(ctx);
    }
    endField(ctx);

    if (this.state === 'title') this.drawTitle(ctx);
    else if (this.state === 'select') this.drawSelect(ctx);
    else this.drawHud(ctx);
    if (this.state === 'paused') this.drawOverlay(ctx, 'PAUSE');
    if (this.state === 'resume') this.drawCountdown(ctx);
    if (this.state === 'over' || this.state === 'clear') this.drawResult(ctx);

    const { input } = this.app;
    for (const b of this.buttons) {
      if (b.invisible) continue;
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
    ctx.fillText('HI ' + fmt(Math.max(save.hi[this.diff], this.score)), W - 44, y0 + 3);

    // 2行目：残機・ボム・攻撃力・グレイズ
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
    const px = bx0 + this.maxBombs * 13 + 4;
    ctx.textAlign = 'left';
    ctx.fillStyle = this.power >= POWER.maxLevel ? '#f9b' : COLORS.ui;
    ctx.fillText(`P ${(1 + this.power * POWER.step).toFixed(2)}`, px, y1);
    ctx.fillStyle = COLORS.uiDim;
    ctx.textAlign = 'right';
    ctx.fillText('GRAZE ' + this.graze, W - 44, y1);

    // ボスの体力ゲージ（フェーズの区切り線つき）と残り時間
    if (b && b.state !== 'entry' && b.state !== 'gone') {
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

  // ステージ開始時のステージ名
  drawStageIntro(ctx) {
    const t = this.playT;
    if (t > STAGE_INTRO || this.state === 'title') return;
    const a = Math.min(1, t / 20, (STAGE_INTRO - t) / 30);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillStyle = '#dff';
    ctx.shadowColor = '#4df';
    ctx.shadowBlur = 14;
    ctx.fillText(this.stage.label, W / 2, 260);
    ctx.shadowBlur = 0;
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = COLORS.ui;
    ctx.fillText(this.stage.title, W / 2, 294);
    ctx.restore();
  }

  // フェーズ開始と登場のカットイン（文字と帯だけ）
  drawCutin(ctx) {
    const b = this.boss;
    let main, sub, t, len;
    if (b.state === 'entry') {
      main = b.def.name;
      sub = this.seg.midboss ? 'CAUTION' : 'WARNING';
      t = b.stateT;
      len = BOSS.entryFrames;
    } else if (b.state === 'intro') {
      main = b.phase.name;
      sub = b.phase.endurance ? `FINAL PHASE ― 耐え切れ` : this.seg.midboss ? '中ボス' : `PHASE ${b.phaseIdx + 1}`;
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
      ctx.globalAlpha = Math.max(0, 1 - p.t / 50);
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

  // 再開前のカウントダウン（3, 2, 1）
  drawCountdown(ctx) {
    const n = Math.ceil(this.resumeT / 60);
    const k = (this.resumeT % 60) / 60;   // 1 → 0 で各数字が縮む
    ctx.fillStyle = 'rgba(2, 4, 12, 0.35)';
    ctx.fillRect(this.view.left, this.view.top, this.view.right - this.view.left, this.view.bottom - this.view.top);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.font = `bold ${48 + 24 * k}px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#4df';
    ctx.shadowBlur = 16;
    ctx.fillText(String(n), W / 2, 300);
    ctx.restore();
  }

  drawTitle(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillStyle = '#dff';
    ctx.shadowColor = '#4df';
    ctx.shadowBlur = 20;
    ctx.fillText('STARFALL', W / 2, 220);
    ctx.shadowBlur = 0;
    // ゆっくり明滅（点滅はしない）
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(this.frame * 0.05);
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = COLORS.ui;
    ctx.fillText('タップしてスタート', W / 2, 380);
    ctx.globalAlpha = 1;
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = COLORS.uiDim;
    DIFFICULTY_ORDER.forEach((d, i) => {
      ctx.fillText(`${DIFF_NAME[d]}  HI ${fmt(save.hi[d])}`, W / 2, 440 + i * 18);
    });
    ctx.restore();
  }

  drawSelect(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#dff';
    ctx.fillText('難易度を選んでください', W / 2, 170);
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = COLORS.uiDim;
    DIFFICULTY_ORDER.forEach((d, i) => {
      const st = START[d];
      ctx.fillText(`残機 ${st.lives}・ボム ${st.bombs}　HI ${fmt(save.hi[d])}`, W / 2, 220 + i * 86 + 70);
    });
    ctx.restore();
  }

  drawResult(ctx) {
    const r = this.result;
    this.drawOverlay(ctx, r.kind === 'clear' ? 'STAGE CLEAR' : 'GAME OVER');
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `12px ${FONT}`;
    let y = 236;
    const row = (l, rt, color = COLORS.ui) => {
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(l, 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(rt, W - 40, y);
      y += 20;
    };
    let n = 0;
    for (const p of this.phaseLog) {
      // 「」の中だけを短く表示する
      const short = p.name.match(/「(.+)」/)?.[1] ?? p.name;
      const label = p.mid ? `中ボス ${short}` : `${++n}. ${short}`;
      row(label, `${KIND_LABEL[p.kind]}${p.noMiss ? '★' : ''}  +${fmt(p.gain)}`);
    }
    for (const [l, rt] of r.lines) row(l, rt, '#ffd');
    y += 8;
    ctx.font = `bold 18px ${FONT}`;
    row(`SCORE`, fmt(this.score), '#fff');
    ctx.font = `12px ${FONT}`;
    row(`${DIFF_NAME[this.diff]}  グレイズ ${this.graze}`, r.newRecord ? 'NEW RECORD!' : `HI ${fmt(save.hi[this.diff])}`,
      r.newRecord ? '#ff8' : COLORS.uiDim);
    ctx.restore();
  }
}
