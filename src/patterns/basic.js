// 基本12パターン。データだけで定義する（角度は度、0度が右・90度が真下、速さは px/F）
// 新しいパターンはこの配列にオブジェクトを足すだけで増やせる

export const BASIC_PATTERNS = [
  {
    id: 'circle', name: '円形',
    emitters: [{
      interval: 30, count: 24, spread: 360,
      baseAngle: { type: 'rotate', start: 0, speed: 7.5 },   // 毎回半目ずらす
      bullet: { type: 'medium', color: '#f46', speed: 2.0 },
    }],
  },
  {
    id: 'fan', name: '扇形',
    emitters: [{
      interval: 36, count: 9, spread: 70,
      baseAngle: { type: 'sine', start: 90, amp: 30, period: 6 },  // 左右に首を振る
      layers: 2, layerStep: 0.6,
      bullet: { type: 'small', color: '#fa3', speed: 2.4 },
    }],
  },
  {
    id: 'nway', name: 'n-way自機狙い',
    emitters: [{
      interval: 24, count: 5, spread: 36, aim: true,
      bullet: { type: 'rice', color: '#4df', speed: 3.4 },
    }],
  },
  {
    id: 'spiral', name: '螺旋',
    emitters: [{
      interval: 4, count: 3, spread: 360,
      baseAngle: { type: 'rotate', start: 0, speed: 9 },
      bullet: { type: 'small', color: '#4df', speed: 2.2 },
    }],
  },
  {
    id: 'double_spiral', name: '二重螺旋（逆回転）',
    emitters: [
      {
        interval: 5, count: 4, spread: 360,
        baseAngle: { type: 'rotate', start: 0, speed: 7 },
        bullet: { type: 'rice', color: '#f6c', speed: 2.0 },
      },
      {
        interval: 5, count: 4, spread: 360,
        baseAngle: { type: 'rotate', start: 45, speed: -7 },
        bullet: { type: 'rice', color: '#a7f', speed: 2.0 },
      },
    ],
  },
  {
    id: 'scatter', name: 'ランダム散布',
    emitters: [{
      interval: 2, count: 2, spread: 0,
      baseAngle: { type: 'random', start: 20, range: 140 },  // 下向き140度の範囲
      speedJitter: 1.0,
      bullet: { type: 'small', color: '#6f8', speed: 2.4 },
    }],
  },
  {
    id: 'wall', name: '壁（横一列）',
    emitters: [{
      interval: 40, count: 12, shape: 'line', width: 352, shift: 16,
      origin: { x: 180, y: -8 },
      baseAngle: { type: 'fixed', start: 90 },
      bullet: { type: 'medium', color: '#fd4', speed: 1.6 },
    }, {
      // 壁の間を埋める自機狙い
      delay: 20, interval: 40, count: 3, spread: 20, aim: true,
      bullet: { type: 'small', color: '#f84', speed: 3.0 },
    }],
  },
  {
    id: 'accel', name: '加速弾',
    emitters: [{
      interval: 20, count: 18, spread: 360,
      baseAngle: { type: 'aim', start: 0 },
      bullet: { type: 'needle', color: '#ff6', speed: 0.4, accel: 0.06, maxSpeed: 5 },
    }],
  },
  {
    id: 'decel_reaccel', name: '減速→再加速弾',
    emitters: [{
      interval: 50, count: 20, spread: 360,
      baseAngle: { type: 'rotate', start: 0, speed: 9 },
      bullet: {
        type: 'medium', color: '#7af', speed: 4.0, accel: -0.1, minSpeed: 0,
        // 止まったら自機の方へ向き直して加速する
        events: [{ at: 50, do: 'aim', accel: 0.07, maxSpeed: 3.6 }],
      },
    }],
  },
  {
    id: 'curve', name: '曲がる弾',
    emitters: [
      {
        interval: 14, count: 10, spread: 360,
        baseAngle: { type: 'rotate', start: 0, speed: 5 },
        bullet: { type: 'rice', color: '#5fd', speed: 1.8, curve: 0.5 },
      },
      {
        interval: 14, count: 10, spread: 360,
        baseAngle: { type: 'rotate', start: 18, speed: -5 },
        bullet: { type: 'rice', color: '#fb5', speed: 1.8, curve: -0.5 },
      },
    ],
  },
  {
    id: 'split', name: '分裂弾',
    emitters: [{
      interval: 48, count: 5, spread: 60, aim: true,
      bullet: {
        type: 'large', color: '#48f', speed: 2.4,
        events: [{
          at: 45, do: 'split', count: 6, spread: 120, relative: true,
          bullet: { type: 'wedge', color: '#8cf', speed: 2.2 },
        }],
      },
    }],
  },
  {
    id: 'firework', name: '花火型',
    emitters: [{
      interval: 40, count: 2, spread: 80,
      baseAngle: { type: 'sine', start: 90, amp: 50, period: 5 },
      bullet: {
        type: 'large', color: '#f5a', speed: 3.6, accel: -0.07, minSpeed: 0,
        // 止まったところで円形に弾ける
        events: [{
          at: 52, do: 'split', count: 24, spread: 360,
          bullet: { type: 'small', color: '#fcf', speed: 1.8 },
        }],
      },
    }],
  },
];

// 負荷テスト用（デバッグ画面のみ）。画面内に約1000発を保つ
export const STRESS_PATTERN = {
  id: 'stress', name: '負荷テスト（約1000発）',
  emitters: [{
    interval: 6, count: 13, spread: 360,
    baseAngle: { type: 'rotate', start: 0, speed: 4 },
    bullet: { type: 'small', color: '#9cf', speed: 1.0 },
  }, {
    interval: 6, count: 8, spread: 360,
    baseAngle: { type: 'rotate', start: 0, speed: -3 },
    bullet: { type: 'rice', color: '#f9c', speed: 1.3 },
  }],
};
