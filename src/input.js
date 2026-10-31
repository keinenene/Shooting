// タッチ入力。ボタン以外の場所でのドラッグは相対移動として溜め、update() で取り出す

const HIT_PAD = 8; // ボタンの押せる範囲を見た目より少し広げる

export class Input {
  constructor(canvas, view) {
    this.canvas = canvas;
    this.view = view;
    this.buttons = [];          // { id, x, y, w, h, mode: 'hold' | 'tap' }
    this.holds = new Map();     // pointerId → ボタンid（押している間）
    this.taps = [];             // 押されたタップボタンのid
    this.dragId = -1;
    this.lastX = 0;
    this.lastY = 0;
    this.dx = 0;
    this.dy = 0;
    this.firstTouch = [];

    const opt = { passive: false };
    canvas.addEventListener('pointerdown', (e) => this.down(e), opt);
    canvas.addEventListener('pointermove', (e) => this.move(e), opt);
    canvas.addEventListener('pointerup', (e) => this.up(e), opt);
    canvas.addEventListener('pointercancel', (e) => this.up(e), opt);
    // 長押しメニュー・ピンチ・ダブルタップ拡大を止める
    for (const t of ['contextmenu', 'gesturestart', 'dblclick', 'touchstart', 'touchmove']) {
      canvas.addEventListener(t, (e) => e.preventDefault(), opt);
    }
  }

  // 初回タップ時に一度だけ呼ぶ（AudioContext の開始などに使う）
  onFirstTouch(fn) {
    this.firstTouch.push(fn);
  }

  setButtons(list) {
    this.buttons = list;
  }

  hitButton(lx, ly) {
    for (const b of this.buttons) {
      if (b.hidden) continue;
      if (lx >= b.x - HIT_PAD && lx <= b.x + b.w + HIT_PAD &&
          ly >= b.y - HIT_PAD && ly <= b.y + b.h + HIT_PAD) return b;
    }
    return null;
  }

  down(e) {
    e.preventDefault();
    if (this.firstTouch.length) {
      for (const fn of this.firstTouch) fn();
      this.firstTouch.length = 0;
    }
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this.view.toLogical(e.clientX, e.clientY);
    const b = this.hitButton(p.x, p.y);
    if (b) {
      if (b.mode === 'hold') this.holds.set(e.pointerId, b.id);
      else this.taps.push(b.id);
      return;
    }
    if (this.dragId === -1) {
      this.dragId = e.pointerId;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }

  move(e) {
    if (e.pointerId !== this.dragId) return;
    e.preventDefault();
    // 指の移動量（CSS px）を論理pxに直して溜める
    this.dx += (e.clientX - this.lastX) / this.view.scale;
    this.dy += (e.clientY - this.lastY) / this.view.scale;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  up(e) {
    if (e.pointerId === this.dragId) this.dragId = -1;
    this.holds.delete(e.pointerId);
  }

  // 溜まったドラッグ量を out に書き出してリセットする
  takeDrag(out) {
    out.x = this.dx;
    out.y = this.dy;
    this.dx = 0;
    this.dy = 0;
    return out;
  }

  isHeld(id) {
    for (const v of this.holds.values()) if (v === id) return true;
    return false;
  }

  // タップされていれば true を返し、印を消す
  takeTap(id) {
    const i = this.taps.indexOf(id);
    if (i < 0) return false;
    this.taps.splice(i, 1);
    return true;
  }

  // 画面が裏に回ったときなどに入力をリセットする
  reset() {
    this.holds.clear();
    this.taps.length = 0;
    this.dragId = -1;
    this.dx = this.dy = 0;
  }
}
