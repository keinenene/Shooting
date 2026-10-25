// Service Worker：ゲームのファイルを端末に保存し、オフラインでも起動できるようにする。
// 保存済みのファイルをすぐ返しつつ、裏で最新版を取り直す（次に開いたときに反映される）

const CACHE = 'starfall-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/audio.js',
  './src/bomb.js',
  './src/boss.js',
  './src/bullets.js',
  './src/config.js',
  './src/debug.js',
  './src/emitter.js',
  './src/enemies.js',
  './src/input.js',
  './src/items.js',
  './src/main.js',
  './src/patterns/basic.js',
  './src/player.js',
  './src/render.js',
  './src/rng.js',
  './src/scenes/game.js',
  './src/scenes/menus.js',
  './src/scenes/test.js',
  './src/settings.js',
  './src/ships.js',
  './src/shots.js',
  './src/sprites.js',
  './src/stages/stage1.js',
  './src/storage.js',
  './src/ui.js',
  './src/view.js',
  './src/wakelock.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // 古い版の保存を消す
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
