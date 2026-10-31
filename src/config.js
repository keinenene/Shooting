// 調整用の定数はすべてここにまとめる

export const W = 360;   // 論理解像度（横）
export const H = 640;   // 論理解像度（縦）
export const DT = 1 / 60;
export const MAX_STEPS = 5;        // 1回の描画までに進める更新の最大回数

// 機体ごとの値（速さ・判定・ショット・攻撃力の伸び方）は ships.js にある
export const PLAYER = {
  dragMaxStep: 12,       // 相対ドラッグで1フレームに動ける最大距離（通常時）
  dragBuffer: 48,        // 持ち越せるドラッグ量の上限
  grazeRadius: 12,
  margin: 6,             // 画面端からの余白
  startX: W / 2,
  startY: H - 80,
  invincibleFrames: 120, // 被弾後の無敵
  deathbombFrames: 24,   // 喰らいボムの猶予
};

export const SHOT = {
  poolSize: 128,
};

export const VIEW = {
  topShare: 0.3,         // 縦の余白のうち上に配る割合（残りは下。ボタン用）
  maxDpr: 2,             // 描画の解像度の上限（端末の倍率が3でも2倍で描いて負荷を下げる）
};

export const INPUT = {
  sensitivity: 1.0,      // 移動感度（設定で0.8〜1.6）
  buttonSize: 56,        // ボタンの大きさ（論理px）
  swapButtons: false,    // ボタン配置の左右反転（true で右下に低速とボム）
  buttonGap: 12,         // 低速ボタンとボムボタンの間隔（2つとも余白に収まるとき）
  buttonGapWide: 32,     // ボムがゲーム領域に重なるときの間隔（誤タップ防止に広げる）
};

export const BULLETS = {
  max: 2048,
  offscreenMargin: 24,   // 画面外に出てから消すまでの余白
};

export const PARTICLES = { max: 1024 };

export const ITEMS = {
  max: 768,
  launch: -2.6,          // 出現時に上へ跳ねる速さ
  gravity: 0.07,
  fallMax: 2.2,
  collectRadius: 22,     // 取得できる距離
  collectLine: H * 0.25, // 自機がこれより上に行くと全部吸い寄せる
  slowMagnet: 64,        // 低速中に吸い寄せる距離
  homingSpeed: 9,
};

// 攻撃力の段階と倍率は機体ごと（ships.js）
export const POWER = {
  missLoss: 5,           // ミスで下がる段階
  missDrop: 3,           // ミスでばらまく小アイテムの数
};

export const ENEMY = {
  max: 64,
  noFireBelow: H - 150,  // これより下では撃たない（目の前で撃たれるのを防ぐ）
};

export const BOMB = {
  invincibleFrames: 120, // 発動中の無敵
  waveFrames: 45,        // 衝撃波が画面の端まで届くまでのフレーム数
};

// 難易度ごとの残機とボム（初期値＝上限）
export const START = {
  easy:   { lives: 5, bombs: 3 },
  normal: { lives: 3, bombs: 3 },
  hard:   { lives: 2, bombs: 2 },
};

export const MISS = {
  hiddenFrames: 30,      // 被弾後、自機が消えている時間
  riseFrames: 30,        // 画面下から戻ってくる時間
  clearRadius: 80,       // 被弾した場所の周りで消す弾の範囲
  gameOverDelay: 60,     // 最後の被弾からゲームオーバー表示までの時間
};

export const BOSS = {
  entryFrames: 90,       // 登場
  introFrames: 60,       // フェーズ開始の猶予（カットイン表示中）
  transitionFrames: 75,  // フェーズ終了から次のフェーズの開始まで
  defeatFrames: 120,     // 撃破演出
  bombRatio: 0.1,        // ボムのダメージ（そのフェーズの割り当て分に対する割合）
  shotRadius: 26,        // 自機ショットが当たる半径
  follow: 0.03,          // 移動の目標へ寄せる速さ（1フレームあたりの割合）
  warnSeconds: 10,       // 残り何秒から警告するか
};

export const SCORE = {
  shotHit: 10,           // ボスにショットが当たるごと
  graze: 500,
  pointItem: 100,        // スコア点アイテム（消した弾が変わったもの）1つ
  powerOverflow: 1000,   // 攻撃力が最大のときの攻撃力アイテム
  phaseBase: 100000,     // フェーズの素点（削り切りでも時間切れでも入る）
  timeBonusPerSec: 20000,// 削り切ったときの残り1秒あたり
  noMissBonus: 300000,   // ノーミス・ノーボムでフェーズを終えたとき
  clearLife: 1000000,    // ステージクリア時の残機1つあたり
  clearBomb: 300000,     // ステージクリア時のボム1つあたり
  overflowLife: 500000,  // 上限で増えなかった残機（仮）
  overflowBomb: 100000,  // 上限で増えなかったボム（仮）
};

// 敵弾の速さ全体に掛ける係数（難易度係数とは別。全体の速さの調整用）
export const BULLET_SPEED_SCALE = 0.8;

// 難易度係数（弾数・弾速・発射間隔に掛ける）
export const DIFFICULTY = {
  easy:   { count: 0.6, speed: 0.8,  interval: 1.4 },
  normal: { count: 1.0, speed: 1.0,  interval: 1.0 },
  hard:   { count: 1.4, speed: 1.15, interval: 0.75 },
};
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];

export const COLORS = {
  bg: '#05060f',
  margin: '#020309',
  ui: 'rgba(160, 220, 255, 0.85)',
  uiDim: 'rgba(160, 220, 255, 0.35)',
  player: '#5ff',
  shot: '#9ff',
};
