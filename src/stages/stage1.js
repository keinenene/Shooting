// 1面のボス（仮）。フェーズの名前・移動・弾幕はすべてデータで定義する。
// 弾パターンの書き方は patterns/basic.js と同じ（角度は度、0度が右・90度が真下）

export const BOSS1 = {
  name: '監視衛星 オクルス',
  phaseHp: 8000,             // 1フェーズで削れる量（体力の合計はこれ×フェーズ数）
  phases: [
    {
      name: '軌道封鎖「リングバリア」',
      time: 40,
      color: '#4df',
      move: { type: 'sway', x: 180, y: 120, amp: 90, period: 300 },
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
      move: { type: 'wander', points: [[180, 110], [90, 140], [270, 140], [180, 90]], wait: 150 },
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
