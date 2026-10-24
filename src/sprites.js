// 弾の見た目。種類×色ごとに一度だけオフスクリーンに描き、毎フレームは drawImage で貼るだけにする

const RES = 3; // 拡大表示でもぼやけないよう、論理pxの3倍で描いておく

// 見た目の種類。r: 当たり判定の半径（初期値）、rotate: 進行方向に回すか
export const BULLET_TYPES = {
  small:  { r: 3,   rotate: false },
  medium: { r: 5.5, rotate: false },
  large:  { r: 11,  rotate: false },
  rice:   { r: 2.8, rotate: true },  // 米粒
  needle: { r: 2,   rotate: true },  // 針
  wedge:  { r: 3,   rotate: true },  // 楔
};

export const sprites = [];   // { img, w, h, rotate }（w, h は論理px）
const cache = new Map();

export function getSprite(type, color) {
  const key = type + '|' + color;
  let idx = cache.get(key);
  if (idx === undefined) {
    if (!BULLET_TYPES[type]) throw new Error('未知の弾の種類: ' + type);
    idx = sprites.length;
    sprites.push(build(type, color));
    cache.set(key, idx);
  }
  return idx;
}

function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w * RES, h * RES)
    : Object.assign(document.createElement('canvas'), { width: w * RES, height: h * RES });
  const ctx = c.getContext('2d');
  ctx.scale(RES, RES);
  ctx.translate(w / 2, h / 2);
  return { c, ctx };
}

function build(type, color) {
  switch (type) {
    case 'small':  return round(5, 3, color);
    case 'medium': return round(9, 4, color);
    case 'large':  return round(16, 6, color);
    case 'rice':   return oval(6, 3.2, color);
    case 'needle': return oval(9, 1.6, color);
    case 'wedge':  return wedge(6, 4.5, color);
  }
}

// 丸弾：白い芯＋色の縁＋外側のにじみ
function round(r, glow, color) {
  const s = (r + glow) * 2;
  const { c, ctx } = makeCanvas(s, s);
  const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r + glow);
  g.addColorStop(0, color);
  g.addColorStop(r / (r + glow), color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r + glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  return { img: c, w: s, h: s, rotate: false };
}

// 楕円弾（米粒・針）：右向き（角度0）で描く
function oval(rx, ry, color) {
  const glow = 3;
  const w = (rx + glow) * 2, h = (ry + glow) * 2;
  const { c, ctx } = makeCanvas(w, h);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx + glow, ry + glow, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.65, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  return { img: c, w, h, rotate: true };
}

// 楔弾：右向きの三角
function wedge(len, half, color) {
  const glow = 3;
  const w = (len + glow) * 2, h = (half + glow) * 2;
  const { c, ctx } = makeCanvas(w, h);
  const tri = (k) => {
    ctx.beginPath();
    ctx.moveTo(len * k, 0);
    ctx.lineTo(-len * 0.7 * k, -half * k);
    ctx.lineTo(-len * 0.4 * k, 0);
    ctx.lineTo(-len * 0.7 * k, half * k);
    ctx.closePath();
    ctx.fill();
  };
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = color;
  tri(1.35);
  ctx.globalAlpha = 1;
  tri(1);
  ctx.fillStyle = '#fff';
  tri(0.5);
  return { img: c, w, h, rotate: true };
}
