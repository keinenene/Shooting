// 1面（仮）。道中のタイムライン、中ボス、ボスをすべてデータで定義する。
// 弾パターンの書き方は patterns/basic.js と同じ（角度は度、0度が右・90度が真下）

// 道中の敵が使う弾パターン（タイムラインから名前で指定する）
const ENEMY_PATTERNS = {
  aim1: { emitters: [{
    delay: 40, interval: 90, count: 1, aim: true,
    bullet: { type: 'small', color: '#f8c', speed: 2.6 },
  }] },
  aim3: { emitters: [{
    delay: 30, interval: 60, count: 3, spread: 24, aim: true,
    bullet: { type: 'rice', color: '#fc8', speed: 3.0 },
  }] },
  fan5: { emitters: [{
    delay: 20, interval: 45, count: 5, spread: 60, aim: true, layers: 2, layerStep: 0.5,
    bullet: { type: 'small', color: '#fa4', speed: 2.3 },
  }] },
  ring8: { emitters: [{
    delay: 30, interval: 40, count: 8, spread: 360,
    baseAngle: { type: 'rotate', start: 0, speed: 11 },
    bullet: { type: 'medium', color: '#fa4', speed: 1.8 },
  }] },
  spray: { emitters: [{
    delay: 20, interval: 5, count: 1, spread: 0,
    baseAngle: { type: 'random', start: 55, range: 70 },
    bullet: { type: 'small', color: '#fd6', speed: 2.2 },
  }] },
  carrier: { emitters: [
    {
      delay: 40, interval: 36, count: 18, spread: 360, radius: 16,
      baseAngle: { type: 'rotate', start: 0, speed: 6 },
      bullet: { type: 'medium', color: '#6f8', speed: 1.7 },
    },
    {
      delay: 70, interval: 60, count: 5, spread: 40, aim: true, layers: 2, layerStep: 0.6,
      bullet: { type: 'rice', color: '#bfa', speed: 2.6 },
    },
  ] },
  carrier2: { emitters: [
    {
      delay: 40, interval: 6, count: 4, spread: 360, radius: 16,
      baseAngle: { type: 'rotate', start: 0, speed: 8 },
      bullet: { type: 'rice', color: '#6f8', speed: 2.0 },
    },
  ] },
};

// 道中前半（約45秒）。at: 区間の開始からのフレーム数。
// count/gap/dx で、同じ敵を gap フレームごと・dx ずつずらして並べる
const ROAD1 = [
  { at: 60,   type: 'drone', x: 60,  dx: 30, count: 5, gap: 10, path: { type: 'linear', vx: 0.8, vy: 2.4 }, pattern: 'aim1' },
  { at: 220,  type: 'drone', x: 300, dx: -30, count: 5, gap: 10, path: { type: 'linear', vx: -0.8, vy: 2.4 }, pattern: 'aim1' },
  { at: 400,  type: 'fighter', x: 90, dx: 90, count: 3, gap: 20, path: { type: 'stop', toY: 110, wait: 150, exitVy: -2.5 }, pattern: 'fan5' },
  { at: 700,  type: 'drone', x: 100, count: 8, gap: 14, path: { type: 'sine', vy: 1.8, amp: 60, period: 140 }, pattern: 'aim1' },
  { at: 700,  type: 'drone', x: 260, count: 8, gap: 14, path: { type: 'sine', vy: 1.8, amp: -60, period: 140 }, pattern: 'aim1' },
  // 中型機：倒すとボムを落とす
  { at: 1000, type: 'carrier', x: 180, path: { type: 'stop', toY: 150, wait: 420, exitVy: -1.5 }, pattern: 'carrier', drop: 'bomb' },
  { at: 1080, type: 'drone', x: -10, y: 80, count: 6, gap: 12, path: { type: 'arc', speed: 2.6, angle: 10, turn: 1.2, turnFrames: 90 }, pattern: 'aim1' },
  { at: 1260, type: 'drone', x: 370, y: 80, count: 6, gap: 12, path: { type: 'arc', speed: 2.6, angle: 170, turn: -1.2, turnFrames: 90 }, pattern: 'aim1' },
  { at: 1550, type: 'fighter', x: 60, dx: 80, count: 4, gap: 15, path: { type: 'stop', toY: 100, wait: 180, exitVy: -2 }, pattern: 'aim3' },
  { at: 1850, type: 'drone', x: 40, dx: 70, count: 5, path: { type: 'linear', vy: 3 }, pattern: 'aim1' },
  { at: 1900, type: 'drone', x: 75, dx: 70, count: 5, path: { type: 'linear', vy: 3 }, pattern: 'aim1' },
  { at: 2050, type: 'fighter', x: 120, dx: 120, count: 2, path: { type: 'stop', toY: 90, wait: 200, exitVy: -2 }, pattern: 'spray' },
  { at: 2150, type: 'drone', x: 180, count: 10, gap: 10, path: { type: 'sine', vy: 1.6, amp: 120, period: 200 }, pattern: 'aim1' },
  { at: 2400, type: 'fighter', x: -10, y: 140, count: 3, gap: 30, path: { type: 'arc', speed: 2.2, angle: 0, turn: 0.6, turnFrames: 120 }, pattern: 'fan5' },
];

// 道中後半（約45秒）。前半より密度を上げる
const ROAD2 = [
  { at: 60,   type: 'carrier', x: 180, path: { type: 'stop', toY: 140, wait: 360, exitVy: -1.5 }, pattern: 'carrier2' },
  { at: 120,  type: 'drone', x: -10, y: 60, count: 8, gap: 10, path: { type: 'arc', speed: 2.8, angle: 15, turn: 1, turnFrames: 100 }, pattern: 'aim1' },
  { at: 240,  type: 'drone', x: 370, y: 60, count: 8, gap: 10, path: { type: 'arc', speed: 2.8, angle: 165, turn: -1, turnFrames: 100 }, pattern: 'aim1' },
  { at: 520,  type: 'fighter', x: 40, dx: 70, count: 5, gap: 12, path: { type: 'stop', toY: 90, wait: 180, exitVy: -2 }, pattern: 'aim3' },
  { at: 800,  type: 'drone', x: 30, dx: 60, count: 6, path: { type: 'linear', vy: 2.8 }, pattern: 'aim1' },
  { at: 860,  type: 'drone', x: 60, dx: 60, count: 5, path: { type: 'linear', vy: 2.8 }, pattern: 'aim1' },
  { at: 920,  type: 'drone', x: 30, dx: 60, count: 6, path: { type: 'linear', vy: 2.8 }, pattern: 'aim1' },
  { at: 1100, type: 'fighter', x: 90, dx: 180, count: 2, path: { type: 'sine', vy: 0.9, amp: 40, period: 180 }, pattern: 'spray' },
  // 中型機：倒すとボムを落とす
  { at: 1300, type: 'carrier', x: 180, path: { type: 'stop', toY: 160, wait: 420, exitVy: -1.5 }, pattern: 'carrier', drop: 'bomb' },
  { at: 1400, type: 'drone', x: 60, count: 10, gap: 12, path: { type: 'sine', vy: 1.8, amp: 40, period: 120 }, pattern: 'aim1' },
  { at: 1400, type: 'drone', x: 300, count: 10, gap: 12, path: { type: 'sine', vy: 1.8, amp: -40, period: 120 }, pattern: 'aim1' },
  { at: 1800, type: 'fighter', x: -10, y: 120, count: 3, gap: 25, path: { type: 'arc', speed: 2.2, angle: 0, turn: 0.5, turnFrames: 140 }, pattern: 'fan5' },
  { at: 1800, type: 'fighter', x: 370, y: 120, count: 3, gap: 25, path: { type: 'arc', speed: 2.2, angle: 180, turn: -0.5, turnFrames: 140 }, pattern: 'fan5' },
  { at: 2100, type: 'drone', x: 20, dx: 32, count: 11, gap: 6, path: { type: 'linear', vy: 3.2 }, pattern: 'aim1' },
  { at: 2300, type: 'fighter', x: 60, dx: 80, count: 4, gap: 10, path: { type: 'stop', toY: 120, wait: 200, exitVy: -2 }, pattern: 'ring8' },
];

// 中ボス：1フェーズ。時間切れなら撃破されずに去る
export const MIDBOSS1 = {
  name: '哨戒機 ストライダー',
  phaseHp: 9000,
  retreat: true,               // 時間切れで画面上へ去る
  drops: ['bomb', 'powL', 'powL'],
  phases: [
    {
      name: '迎撃「クロスファイア」',
      time: 30,
      color: '#fd4',
      move: { type: 'sway', x: 180, y: 110, amp: 50, period: 320 },
      patterns: [
        {
          id: 'm1_cross', emitters: [
            {
              interval: 8, count: 3, spread: 30, radius: 16,
              baseAngle: { type: 'sine', start: 90, amp: 60, period: 30 },
              bullet: { type: 'rice', color: '#fd4', speed: 2.6 },
            },
            {
              interval: 8, count: 3, spread: 30, radius: 16,
              baseAngle: { type: 'sine', start: 90, amp: -60, period: 30 },
              bullet: { type: 'rice', color: '#fa6', speed: 2.6 },
            },
          ],
        },
        {
          id: 'm1_needle', emitters: [{
            delay: 30, interval: 60, count: 5, spread: 20, aim: true,
            bullet: { type: 'needle', color: '#fff', speed: 3.6 },
          }],
        },
      ],
    },
  ],
};

export const BOSS1 = {
  name: '監視衛星 オクルス',
  phaseHp: 18000,            // 1フェーズで削れる量（体力の合計はこれ×フェーズ数）
  phases: [
    {
      name: '軌道封鎖「リングバリア」',
      time: 40,
      color: '#4df',
      move: { type: 'sway', x: 180, y: 120, amp: 45, period: 420 },
      patterns: [
        {
          id: 'p1_ring', emitters: [{
            radius: 22,   // ボス本体が隠れないよう、少し外側から撃つ
            interval: 40, count: 32, spread: 360,
            baseAngle: { type: 'rotate', start: 0, speed: 5.625 },
            bullet: { type: 'medium', color: '#4df', speed: 1.8 },
          }],
        },
        {
          id: 'p1_spiral', emitters: [{
            radius: 22,   // ボス本体が隠れないよう、少し外側から撃つ
            interval: 6, count: 2, spread: 360,
            baseAngle: { type: 'rotate', start: 0, speed: 13 },
            bullet: { type: 'small', color: '#28f', speed: 2.4 },
          }],
        },
        {
          id: 'p1_aim', emitters: [{
            delay: 20, interval: 50, count: 7, spread: 30, aim: true,
            bullet: { type: 'rice', color: '#8ff', speed: 3.2 },
          }],
        },
      ],
    },
    {
      name: '流星群「ミーティアシャワー」',
      time: 45,
      color: '#fa4',
      move: { type: 'wander', points: [[180, 110], [135, 125], [225, 125], [180, 100]], wait: 240 },
      patterns: [
        {
          // 画面上端から降る流星
          id: 'p2_rain', emitters: [{
            interval: 3, count: 1, origin: { x: 180, y: -8 }, spreadX: 180,
            baseAngle: { type: 'fixed', start: 90 }, jitter: 12, speedJitter: 0.6,
            bullet: { type: 'rice', color: '#fa4', speed: 2.0, accel: 0.02, maxSpeed: 3.8 },
          }],
        },
        {
          id: 'p2_aim', emitters: [{
            interval: 45, count: 5, spread: 40, aim: true, layers: 3, layerStep: 0.5,
            bullet: { type: 'wedge', color: '#f64', speed: 2.6 },
          }],
        },
      ],
    },
    {
      name: '重力井戸「グラビティウェル」',
      time: 50,
      color: '#a6f',
      move: { type: 'hover', x: 180, y: 120 },
      // 突進：予告のあと自機の位置へ飛び込む。突進中だけ本体に当たり判定がある
      charge: { first: 240, every: 420, telegraph: 50, speed: 7, returnSpeed: 3, bodyRadius: 20 },
      patterns: [
        {
          id: 'p3_well', emitters: [{
            radius: 22,   // ボス本体が隠れないよう、少し外側から撃つ
            interval: 70, count: 24, spread: 360,
            baseAngle: { type: 'rotate', start: 0, speed: 7.5 },
            bullet: {
              type: 'medium', color: '#a6f', speed: 4.0, accel: -0.12, minSpeed: 0,
              events: [{ at: 45, do: 'aim', accel: 0.06, maxSpeed: 3.4 }],
            },
          }],
        },
        {
          id: 'p3_curve', emitters: [
            {
              interval: 10, count: 6, spread: 360,
              baseAngle: { type: 'rotate', start: 0, speed: 7 },
              bullet: { type: 'rice', color: '#f6f', speed: 1.6, curve: 0.6 },
            },
            {
              interval: 10, count: 6, spread: 360,
              baseAngle: { type: 'rotate', start: 30, speed: -7 },
              bullet: { type: 'rice', color: '#c8f', speed: 1.6, curve: -0.6 },
            },
          ],
        },
      ],
    },
    {
      name: '終焉観測「イベントホライズン」',
      time: 40,
      color: '#f46',
      endurance: true,         // 耐え切りフェーズ：攻撃もボムも効かない
      move: { type: 'hover', x: 180, y: 140 },
      patterns: [
        {
          id: 'p4_double', emitters: [
            {
              radius: 22,
              interval: 4, count: 4, spread: 360,
              baseAngle: { type: 'rotate', start: 0, speed: 6.5 },
              bullet: { type: 'small', color: '#f46', speed: 2.0 },
            },
            {
              radius: 22,
              interval: 4, count: 4, spread: 360,
              baseAngle: { type: 'rotate', start: 45, speed: -6.5 },
              bullet: { type: 'small', color: '#fa8', speed: 2.0 },
            },
          ],
        },
        {
          id: 'p4_firework', emitters: [{
            delay: 60, interval: 100, count: 3, spread: 120, aim: true,
            bullet: {
              type: 'large', color: '#fff', speed: 3.0, accel: -0.06, minSpeed: 0,
              events: [{
                at: 50, do: 'split', count: 20, spread: 360,
                bullet: { type: 'small', color: '#f8c', speed: 1.6 },
              }],
            },
          }],
        },
        {
          id: 'p4_needle', emitters: [{
            delay: 30, interval: 70, count: 16, spread: 360,
            baseAngle: { type: 'aim', start: 0 },
            bullet: { type: 'needle', color: '#ff6', speed: 0.3, accel: 0.05, maxSpeed: 4.5 },
          }],
        },
      ],
    },
  ],
};

export const STAGE1 = {
  id: 'stage1',
  label: 'STAGE 1',
  title: '小惑星帯',
  patterns: ENEMY_PATTERNS,
  // 区間の並び。id は練習モードと到達記録に使う
  segments: [
    { id: 'road1', name: '道中前半', type: 'waves', length: 45 * 60, waves: ROAD1, bgm: 'stage' },
    { id: 'mid', name: '中ボス', type: 'boss', boss: MIDBOSS1, midboss: true, bgm: 'stage' },
    { id: 'road2', name: '道中後半', type: 'waves', length: 45 * 60, waves: ROAD2, bgm: 'stage' },
    { id: 'boss', name: 'ボス', type: 'boss', boss: BOSS1, bgm: 'boss' },
  ],
};
