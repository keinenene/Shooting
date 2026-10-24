// 調整用の定数はすべてここにまとめる

export const W = 360;   // 論理解像度（横）
export const H = 640;   // 論理解像度（縦）
export const DT = 1 / 60;
export const MAX_STEPS = 5;        // 1回の描画までに進める更新の最大回数

export const PLAYER = {
  speed: 4.0,            // 通常速度（px/F）
  slowSpeed: 1.8,        // 低速時の速度（px/F）
  dragMaxStep: 12,       // 相対ドラッグで1フレームに動ける最大距離（通常時）
  dragBuffer: 48,        // 持ち越せるドラッグ量の上限
  hitRadius: 2.5,
  grazeRadius: 12,
  margin: 6,             // 画面端からの余白
  startX: W / 2,
  startY: H - 80,
  invincibleFrames: 120, // 被弾後の無敵
  deathbombFrames: 24,   // 喰らいボムの猶予（M3で使う）
};

export const SHOT = {
  interval: 4,           // 何フレームごとに撃つか
  speed: 14,
  lanes: 5,              // 直線の本数
  spacing: 14,           // 通常時の間隔
  slowSpacing: 5,        // 低速時の間隔
  damage: 10,
  width: 3,
  length: 18,
  poolSize: 128,
};

export const VIEW = {
  topShare: 0.3,         // 縦の余白のうち上に配る割合（残りは下。ボタン用）
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

export const BOMB = {
  invincibleFrames: 120, // 発動中の無敵
  waveFrames: 45,        // 衝撃波が画面の端まで届くまでのフレーム数
};

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
