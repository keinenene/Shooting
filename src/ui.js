// 画面共通の部品（ボタン配置、ボタン描画、ゲーム領域の下地）
import { W, H, INPUT, COLORS } from './config.js';

const TAU = Math.PI * 2;
export const FONT = 'system-ui, -apple-system, "Hiragino Sans", sans-serif';

// 低速とボムのボタン。左手の親指で押せるよう、左下に縦に並べる（ボムが上）。
// 下の余白に2つ収まれば余白へ、1つなら低速だけ余白へ、足りなければゲーム領域に半透明で重ねる。
// ボムがゲーム領域に重なるときは、誤タップしないよう間隔を広げる
export function controlButtons(view) {
  const S = INPUT.buttonSize;
  const G = INPUT.buttonGap;
  const bm = view.bottom - H - view.safeBottom;  // 下の余白（ホームバーを除く）
  let by, gap = INPUT.buttonGapWide;
  if (bm >= S * 2 + G + 8) {
    by = H + (bm - (S * 2 + G)) / 2 + S + G;
    gap = G;
  } else if (bm >= S + 4) by = H + (bm - S) / 2;
  else by = H - S - 10;
  const bx = INPUT.swapButtons ? W - 16 - S : 16;
  return [
    { id: 'slow', mode: 'hold', x: bx, y: by, w: S, h: S, label: '低速', round: true },
    { id: 'bomb', mode: 'tap', x: bx, y: by - S - gap, w: S, h: S, label: 'ボム', round: true },
  ];
}

// HUD の上端。上の余白が十分あれば余白に、なければゲーム領域の上端に置く
export function hudTop(view, need) {
  const y = view.top + view.safeTop + 4;
  return y + need <= 0 ? y : 2;
}

export function drawButton(ctx, b, { on = false, disabled = false, label = b.label, size } = {}) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  ctx.fillStyle = on ? 'rgba(90, 220, 255, 0.35)' : 'rgba(40, 70, 120, 0.3)';
  ctx.strokeStyle = on ? 'rgba(150, 240, 255, 0.9)' : COLORS.uiDim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (b.round) ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, TAU);
  else ctx.roundRect(b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.ui;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${b.round ? 'bold ' : ''}${size ?? (b.round ? 14 : 12)}px ${FONT}`;
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

// 余白を塗り、ゲーム領域を下地で塗ってクリップする。終わったら ctx.restore() を呼ぶ
export function beginField(ctx, view) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.margin;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  view.apply(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
}

export function endField(ctx) {
  ctx.restore();
  ctx.strokeStyle = 'rgba(80, 120, 200, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, W, H);
}

// 数字を3桁区切りにする
export function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}
