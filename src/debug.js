// FPS の計測とデバッグ表示の切替

export const debugFlags = {
  enabled: new URLSearchParams(location.search).has('debug'),
  hitboxes: false,    // 弾の当たり判定円
  invincible: false,  // 無敵
};

export class FpsMeter {
  constructor() {
    this.frames = 0;
    this.updates = 0;
    this.last = performance.now();
    this.fps = 0;
    this.ups = 0;
    this.worst = 0;     // 直近1秒で最も長かった1フレームの処理時間（ms）
    this.worstAcc = 0;
  }

  // 1回の描画ごとに呼ぶ。work: そのフレームの処理にかかった時間（ms）
  frame(updates, work) {
    this.frames++;
    this.updates += updates;
    if (work > this.worstAcc) this.worstAcc = work;
    const now = performance.now();
    if (now - this.last >= 1000) {
      const k = 1000 / (now - this.last);
      this.fps = Math.round(this.frames * k);
      this.ups = Math.round(this.updates * k);
      this.worst = this.worstAcc;
      this.frames = this.updates = 0;
      this.worstAcc = 0;
      this.last = now;
    }
  }
}
