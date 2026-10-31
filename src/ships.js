// 自機の機体定義。機体ごとの違い（速さ・判定・ショット・攻撃力の伸び方）はすべてここに書く。
// 機体を増やすときは、この表に足し、shots.js にショットの種類（kind）を実装する。
//
// 例（未実装）：
//   追尾型   shot.kind = 'homing'（弾が近くの敵へ曲がる。1発は弱め）
//   高倍率型 shot.lanes を減らし spacing を狭く、damage と power.step を大きく

export const SHIPS = {
  striker: {
    name: 'ストライカー',
    type: '直線型',
    speed: 4.0,              // 通常の速さ（指の移動量に対する上限の基準）
    slowSpeed: 1.8,          // 低速時の速さ（通常との比で指の移動量を縮める）
    hitRadius: 2.5,          // 当たり判定の半径
    shot: {
      kind: 'straight',      // 前方への直線
      interval: 4,           // 何フレームごとに撃つか
      speed: 14,
      lanes: 5,              // 直線の本数
      spacing: 24,           // 通常時の間隔（広いのでボスには一部しか当たらない）
      slowSpacing: 5,        // 低速時の間隔（集めると全弾がボスに当たる）
      damage: 10,
      width: 3,
      length: 18,
    },
    power: {
      maxLevel: 20,          // 攻撃力の段階（0〜20）
      step: 0.025,           // 1段階あたりの倍率（0段階で1.0倍、20段階で1.5倍）
    },
  },
};

export const DEFAULT_SHIP = 'striker';
