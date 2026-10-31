// localStorage への保存（ハイスコア、到達記録、設定）。読み書きは失敗しても動き続ける

const KEY = 'starfall.v1';

const DEFAULT = {
  hi: { easy: 0, normal: 0, hard: 0 },
  // 難易度ごとの区間・フェーズの記録 { [id]: { tries, clears } }（練習モードで使う）
  records: { easy: {}, normal: {}, hard: {} },
  settings: { se: 0.6, bgm: 0.4 },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const d = JSON.parse(raw);
    return {
      hi: { ...DEFAULT.hi, ...d.hi },
      records: { ...structuredClone(DEFAULT.records), ...d.records },
      settings: { ...DEFAULT.settings, ...d.settings },
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export const save = load();

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // 容量不足やプライベートモードでは保存しない
  }
}

// ハイスコアを更新したら true
export function submitScore(diff, score) {
  if (score <= save.hi[diff]) return false;
  save.hi[diff] = score;
  persist();
  return true;
}

// 区間やフェーズに到達・突破したことを記録する
export function record(diff, id, cleared) {
  const r = (save.records[diff][id] ??= { tries: 0, clears: 0 });
  if (cleared) r.clears++;
  else r.tries++;
  persist();
}
