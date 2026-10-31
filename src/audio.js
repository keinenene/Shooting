// Web Audio で効果音と BGM を合成する（音声素材は使わない）。初回タップで開始する

const m2f = (m) => 440 * 2 ** ((m - 69) / 12);

// ---- BGM の譜面 ----
// 1小節16ステップ。lead は [ステップ, MIDIノート番号, 長さ(ステップ)] の並び

const MINOR = [0, 3, 7], MAJOR = [0, 4, 7];

const SONGS = {
  stage: {
    bpm: 138,
    chords: [[45, MINOR], [41, MAJOR], [48, MAJOR], [43, MAJOR], [45, MINOR], [41, MAJOR], [48, MAJOR], [43, MAJOR]],
    bass: [0, 0, 12, 0, 0, 12, 0, 7],        // 8分音符ごとの根音からの距離
    lead: [
      [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 69, 6], [14, 72, 2]],
      [[0, 72, 4], [4, 74, 4], [8, 76, 6], [14, 74, 2]],
      [[0, 79, 4], [4, 76, 2], [6, 74, 2], [8, 72, 4], [12, 74, 4]],
      [[0, 74, 6], [6, 71, 2], [8, 67, 8]],
      [[0, 81, 4], [4, 79, 2], [6, 76, 2], [8, 79, 4], [12, 76, 4]],
      [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 72, 8]],
      [[0, 72, 2], [2, 74, 2], [4, 76, 4], [8, 79, 4], [12, 81, 4]],
      [[0, 79, 8], [8, 74, 4], [12, 71, 4]],
    ],
    kick: [0, 6, 8],
    snare: [4, 12],
  },
  boss: {
    bpm: 160,
    chords: [[38, MINOR], [46, MAJOR], [48, MAJOR], [45, MAJOR], [38, MINOR], [46, MAJOR], [48, MAJOR], [45, MAJOR]],
    bass: [0, 12, 0, 12, 0, 12, 0, 12],
    bass16: true,                              // 16分音符で刻む
    lead: [
      [[0, 74, 2], [2, 74, 2], [4, 77, 2], [6, 74, 2], [8, 81, 4], [12, 79, 2], [14, 77, 2]],
      [[0, 77, 2], [2, 77, 2], [4, 74, 2], [6, 70, 2], [8, 74, 6], [14, 77, 2]],
      [[0, 79, 2], [2, 79, 2], [4, 76, 2], [6, 72, 2], [8, 79, 4], [12, 81, 2], [14, 84, 2]],
      [[0, 81, 6], [6, 79, 2], [8, 76, 4], [12, 73, 4]],
      [[0, 74, 2], [2, 74, 2], [4, 77, 2], [6, 74, 2], [8, 81, 4], [12, 79, 2], [14, 77, 2]],
      [[0, 77, 2], [2, 77, 2], [4, 74, 2], [6, 70, 2], [8, 74, 6], [14, 77, 2]],
      [[0, 79, 2], [2, 79, 2], [4, 76, 2], [6, 72, 2], [8, 79, 4], [12, 81, 2], [14, 84, 2]],
      [[0, 81, 4], [4, 84, 4], [8, 86, 8]],
    ],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
  },
};

class Sound {
  constructor() {
    this.ctx = null;
    this.song = null;
    this.last = new Map();   // 効果音ごとの最後に鳴らした時刻（鳴らしすぎ防止）
    this.vol = { se: 0.6, bgm: 0.4 };
  }

  // 初回タップ時に呼ぶ
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.seGain = c.createGain();
    this.bgmGain = c.createGain();
    this.seGain.connect(this.master);
    this.bgmGain.connect(this.master);
    this.setVolume(this.vol.se, this.vol.bgm);
    // ノイズ用のバッファ（1秒）
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < d.length; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      d[i] = (s / 4294967296) * 2 - 1;
    }
    if (this.pending) this.playMusic(this.pending);
  }

  setVolume(se, bgm) {
    this.vol = { se, bgm };
    if (!this.ctx) return;
    this.seGain.gain.value = se;
    this.bgmGain.gain.value = bgm * 0.5;
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }

  // ---- 合成の部品 ----

  tone(dest, t, { type = 'square', f0, f1 = f0, dur, vol, attack = 0.005 }) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dest, t, { dur, vol, type = 'lowpass', f0 = 3000, f1 = f0, q = 0.7 }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(dest);
    // 毎回ノイズの開始位置をずらす（Math.random は使わない）
    this.noiseOfs = ((this.noiseOfs ?? 0) + 0.137) % 0.5;
    src.start(t, this.noiseOfs);
    src.stop(t + dur + 0.02);
  }

  // ---- 効果音 ----

  play(name) {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    // 同じ音は短い間隔で重ねない
    const gap = name === 'graze' ? 0.05 : name === 'hit' ? 0.07 : 0.03;
    if (t - (this.last.get(name) ?? -1) < gap) return;
    this.last.set(name, t);
    const d = this.seGain;
    switch (name) {
      case 'hit':     this.tone(d, t, { f0: 900, dur: 0.03, vol: 0.04 }); break;
      case 'kill':
        this.noise(d, t, { dur: 0.18, vol: 0.25, f0: 2500, f1: 300 });
        this.tone(d, t, { type: 'sine', f0: 220, f1: 60, dur: 0.15, vol: 0.25 });
        break;
      case 'bigkill':
        this.noise(d, t, { dur: 0.7, vol: 0.4, f0: 3000, f1: 100 });
        this.tone(d, t, { type: 'sine', f0: 140, f1: 35, dur: 0.6, vol: 0.4 });
        break;
      case 'graze':   this.tone(d, t, { type: 'sine', f0: 2600, dur: 0.035, vol: 0.06 }); break;
      case 'item':    this.tone(d, t, { type: 'triangle', f0: 1300, f1: 1900, dur: 0.05, vol: 0.06 }); break;
      case 'power':   this.tone(d, t, { f0: 600, f1: 1000, dur: 0.08, vol: 0.06 }); break;
      case 'get':     // ボム獲得・残機増加
        [880, 1100, 1320, 1760].forEach((f, i) => this.tone(d, t + i * 0.06, { type: 'triangle', f0: f, dur: 0.12, vol: 0.15 }));
        break;
      case 'bomb':
        this.noise(d, t, { dur: 0.9, vol: 0.45, f0: 4000, f1: 150 });
        this.tone(d, t, { type: 'sine', f0: 110, f1: 30, dur: 0.8, vol: 0.5 });
        break;
      case 'pichun':  // 被弾（喰らいボムの猶予の開始）
        this.tone(d, t, { f0: 1500, f1: 500, dur: 0.12, vol: 0.15 });
        break;
      case 'miss':
        this.noise(d, t, { dur: 0.6, vol: 0.35, f0: 2000, f1: 100 });
        this.tone(d, t, { type: 'sawtooth', f0: 400, f1: 60, dur: 0.5, vol: 0.15 });
        break;
      case 'phase':
        [880, 1320, 1760].forEach((f, i) => this.tone(d, t + i * 0.08, { type: 'triangle', f0: f, dur: 0.35, vol: 0.15 }));
        break;
      case 'warn':    this.tone(d, t, { type: 'sine', f0: 1000, dur: 0.08, vol: 0.12 }); break;
      case 'charge':  this.tone(d, t, { type: 'sawtooth', f0: 150, f1: 900, dur: 0.7, vol: 0.08 }); break;
      case 'cutin':   this.noise(d, t, { dur: 0.4, vol: 0.12, type: 'bandpass', f0: 500, f1: 4000, q: 2 }); break;
      case 'select':  this.tone(d, t, { type: 'triangle', f0: 1200, dur: 0.06, vol: 0.12 }); break;
    }
  }

  // ---- BGM ----

  playMusic(id) {
    if (!this.ctx) {
      this.pending = id;   // まだ開始前なら、開始時に鳴らす
      return;
    }
    if (this.song === SONGS[id]) return;
    this.stopMusic();
    this.song = SONGS[id];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicOut = this.ctx.createGain();
    this.musicOut.connect(this.bgmGain);
  }

  stopMusic() {
    this.pending = null;
    if (!this.song) return;
    const g = this.musicOut;
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    setTimeout(() => g.disconnect(), 500);
    this.song = null;
  }

  // 毎フレーム呼ぶ。少し先までの音符を予約する
  update() {
    const c = this.ctx;
    if (!c || !this.song || c.state !== 'running') return;
    const s = this.song;
    const stepDur = 60 / s.bpm / 4;
    if (this.nextTime < c.currentTime - 0.1) this.nextTime = c.currentTime + 0.05;
    const len = s.chords.length * 16;
    while (this.nextTime < c.currentTime + 0.15) {
      this.scheduleStep(s, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % len;
    }
  }

  scheduleStep(s, step, t, sd) {
    const out = this.musicOut;
    const bar = step >> 4, i = step & 15;
    const [root, q] = s.chords[bar];
    // ベース
    if (s.bass16 || i % 2 === 0) {
      const n = root + s.bass[(i >> 1) % 8];
      this.tone(out, t, { type: 'triangle', f0: m2f(n), dur: sd * (s.bass16 ? 0.9 : 1.8), vol: 0.35 });
    }
    // アルペジオ（和音の構成音を上下する）
    const arp = [0, 1, 2, 1];
    const n = root + 24 + q[arp[i % 4]] + (i % 8 >= 4 ? 12 : 0);
    this.tone(out, t, { type: 'square', f0: m2f(n), dur: sd * 0.8, vol: 0.035 });
    // メロディ
    for (const [st, note, l] of s.lead[bar]) {
      if (st === i) this.tone(out, t, { type: 'square', f0: m2f(note), dur: sd * l * 0.95, vol: 0.07, attack: 0.01 });
    }
    // ドラム
    if (s.kick.includes(i)) this.tone(out, t, { type: 'sine', f0: 150, f1: 45, dur: 0.12, vol: 0.5 });
    if (s.snare.includes(i)) this.noise(out, t, { dur: 0.1, vol: 0.2, type: 'highpass', f0: 1500 });
    if (i % 2 === 1) this.noise(out, t, { dur: 0.03, vol: 0.06, type: 'highpass', f0: 7000 });
  }
}

export const sound = new Sound();
