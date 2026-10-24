// 画面の自動スリープを防ぐ（Wake Lock API。対応端末のみ）

let lock = null;
let wanted = false;

export async function keepAwake(on) {
  wanted = on;
  try {
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    // 省電力モードなどで断られたら何もしない
  }
}

// 画面が裏から戻ったとき、必要なら取り直す（裏に回ると自動で解除されるため）
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && wanted) keepAwake(true);
});
