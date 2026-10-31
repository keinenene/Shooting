// 画面の拡大縮小。論理座標 360x640 のゲーム領域を画面中央に置き、余白は上下（または左右）にできる
import { W, H, VIEW } from './config.js';

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
    const dpr = Math.min(window.devicePixelRatio || 1, VIEW.maxDpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    // セーフエリア（ノッチやホームバー）の寸法（CSS px）
    const st = getComputedStyle(document.getElementById('safe'));
    const safeTop = parseFloat(st.paddingTop) || 0;
    const safeBottom = parseFloat(st.paddingBottom) || 0;

    this.scale = Math.min(cssW / W, cssH / H);  // 論理px → CSS px
    this.gx = (cssW - W * this.scale) / 2;        // ゲーム領域の左上（CSS px）
    // 縦の余白は下に多く配る（下にボタンを置くため）。上はノッチにかからない分だけは空ける
    const extra = cssH - H * this.scale;
    this.gy = Math.min(extra, Math.max(safeTop + 4, extra * VIEW.topShare));
    this.dpr = dpr;
    // 描画用の変換（論理px → キャンバスの実ピクセル）
    this.k = dpr * this.scale;
    this.ox = dpr * this.gx;
    this.oy = dpr * this.gy;

    // 画面全体を論理座標で表した範囲（余白を含む）
    this.left = -this.gx / this.scale;
    this.top = -this.gy / this.scale;
    this.right = (cssW - this.gx) / this.scale;
    this.bottom = (cssH - this.gy) / this.scale;
    this.safeTop = safeTop / this.scale;
    this.safeBottom = safeBottom / this.scale;

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
