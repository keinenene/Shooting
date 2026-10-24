// 画面の拡大縮小。論理座標 360x640 のゲーム領域を画面中央に置き、余白は上下（または左右）にできる
import { W, H } from './config.js';

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.listeners = [];
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
  }

  onResize(fn) {
    this.listeners.push(fn);
  }

  resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    this.scale = Math.min(cssW / W, cssH / H);  // 論理px → CSS px
    this.gx = (cssW - W * this.scale) / 2;        // ゲーム領域の左上（CSS px）
    this.gy = (cssH - H * this.scale) / 2;
    this.dpr = dpr;
    // 描画用の変換（論理px → キャンバスの実ピクセル）
    this.k = dpr * this.scale;
    this.ox = dpr * this.gx;
    this.oy = dpr * this.gy;

    // 画面全体を論理座標で表した範囲（余白を含む）
    this.left = -this.gx / this.scale;
    this.top = -this.gy / this.scale;
    this.right = W - this.left;
    this.bottom = H - this.top;

    // セーフエリア（ノッチやホームバー）を論理pxで
    const st = getComputedStyle(document.getElementById('safe'));
    this.safeTop = parseFloat(st.paddingTop) / this.scale || 0;
    this.safeBottom = parseFloat(st.paddingBottom) / this.scale || 0;

    for (const fn of this.listeners) fn(this);
  }

  // 画面座標（CSS px）→ 論理座標
  toLogical(clientX, clientY) {
    return {
      x: (clientX - this.gx) / this.scale,
      y: (clientY - this.gy) / this.scale,
    };
  }

  // 論理座標で描くための変換をセットする
  apply(ctx = this.ctx) {
    ctx.setTransform(this.k, 0, 0, this.k, this.ox, this.oy);
  }
}
