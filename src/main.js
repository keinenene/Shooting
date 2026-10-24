// 起動とゲームループ。ロジックは1/60秒の固定ステップで進め、描画とは分ける
import { DT, MAX_STEPS } from './config.js';
import { View } from './view.js';
import { Input } from './input.js';
import { Rng } from './rng.js';
import { Player } from './player.js';
import { Shots } from './shots.js';
import { Bullets } from './bullets.js';
import { Particles, Starfield } from './render.js';
import { FpsMeter, debugFlags } from './debug.js';
import { TestScene } from './scenes/test.js';
import { GameScene } from './scenes/game.js';
import { sound } from './audio.js';
import { save } from './storage.js';

const canvas = document.getElementById('screen');
const view = new View(canvas);
const rng = new Rng(Date.now() & 0xffffffff);

const app = {
  view,
  rng,
  input: new Input(canvas, view),
  player: new Player(),
  shots: new Shots(),
  bullets: new Bullets(),
  particles: new Particles(),
  stars: new Starfield(new Rng(12345)),
  fps: new FpsMeter(),
};
function setScene(scene) {
  app.scene = scene;
  app.input.reset();
  scene.layout(view);
}
const game = new GameScene(app);
app.toGame = () => {
  game.state = 'title';
  setScene(game);
};
// パターンテスト画面は ?debug=1 のときだけ開ける
if (debugFlags.enabled) app.toTest = () => setScene(new TestScene(app));
// 音は初回タップで開始する（ブラウザの制限）
sound.setVolume(save.settings.se, save.settings.bgm);
app.input.onFirstTouch(() => sound.init());
setScene(game);
view.onResize((v) => app.scene.layout(v));

let acc = 0;
let last = performance.now();
let running = true;

function tick(now) {
  if (!running) return;
  const t0 = performance.now();
  // 間が空きすぎたとき（処理落ちなど）は一気に進めない
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  let steps = 0;
  while (acc >= DT && steps < MAX_STEPS) {
    app.scene.update();
    acc -= DT;
    steps++;
  }
  if (steps === MAX_STEPS) acc = 0;  // 追いつけない分は捨てる
  app.scene.draw(view.ctx);
  app.fps.frame(steps, performance.now() - t0);
  requestAnimationFrame(tick);
}

// 画面が裏に回ったら止め、戻ったら蓄積をリセットして再開する
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    app.input.reset();
    app.scene.onHide?.();
    sound.suspend();
  } else if (!running) {
    running = true;
    acc = 0;
    last = performance.now();
    sound.resume();
    requestAnimationFrame(tick);
  }
});

requestAnimationFrame(tick);

// デバッグ・自動テスト用
window.__app = app;
