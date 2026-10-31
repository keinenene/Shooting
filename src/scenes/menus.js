// 練習モードと設定画面のボタン配置・描画
import { W, DIFFICULTY_ORDER, COLORS } from '../config.js';
import { save } from '../storage.js';
import { FONT } from '../ui.js';

export const DIFF_NAME = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

// ---- 練習モード ----

// 練習できる項目の一覧（区間と、ボスの各フェーズ）
export function practiceEntries(stage) {
  const list = [];
  stage.segments.forEach((seg, i) => {
    list.push({ id: seg.id, label: seg.name, segIdx: i });
    if (seg.type === 'boss' && !seg.midboss) {
      seg.boss.phases.forEach((ph, k) => {
        const short = ph.name.match(/「(.+)」/)?.[1] ?? ph.name;
        list.push({ id: `${seg.id}-${k}`, label: `フェーズ${k + 1} ${short}`, segIdx: i, phase: k, sub: true });
      });
    }
  });
  return list;
}

// 一度でも到達した項目だけ選べる（最初の区間は最初から選べる）
export function isUnlocked(diff, entry, idx) {
  if (idx === 0) return true;
  return (save.records[diff][entry.id]?.tries ?? 0) > 0;
}

export function practiceButtons(stage, diff) {
  const list = [];
  DIFFICULTY_ORDER.forEach((d, i) => {
    list.push({ id: 'pd-' + d, mode: 'tap', x: 30 + i * 102, y: 84, w: 96, h: 34, label: DIFF_NAME[d] });
  });
  practiceEntries(stage).forEach((e, i) => {
    list.push({ id: 'pr-' + i, mode: 'tap', x: e.sub ? 44 : 24, y: 136 + i * 48, w: e.sub ? 292 : 312, h: 40, label: '' });
  });
  list.push({ id: 'back', mode: 'tap', x: W / 2 - 60, y: 540, w: 120, h: 40, label: '戻る' });
  return list;
}

export function drawPractice(ctx, stage, diff) {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = '#dff';
  ctx.fillText('練習モード', W / 2, 52);
  practiceEntries(stage).forEach((e, i) => {
    const y = 136 + i * 48 + 20;
    const x = e.sub ? 56 : 36;
    const open = isUnlocked(diff, e, i);
    const r = save.records[diff][e.id];
    ctx.textAlign = 'left';
    ctx.font = `${e.sub ? 12 : 14}px ${FONT}`;
    ctx.fillStyle = open ? COLORS.ui : COLORS.uiDim;
    ctx.fillText(open ? e.label : '？？？（未到達）', x, y);
    if (open && r) {
      ctx.textAlign = 'right';
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = COLORS.uiDim;
      ctx.fillText(`突破 ${r.clears} / 挑戦 ${r.tries}`, W - 36, y);
    }
  });
  ctx.restore();
}

// ---- 設定 ----

// 項目：range は −/＋ で増減、toggle は押すと切り替え
export const SETTING_ROWS = [
  { key: 'se', label: '効果音', type: 'range', min: 0, max: 1, step: 0.1, show: (v) => Math.round(v * 10) },
  { key: 'bgm', label: 'BGM', type: 'range', min: 0, max: 1, step: 0.1, show: (v) => Math.round(v * 10) },
  { key: 'sensitivity', label: '移動感度', type: 'range', min: 0.8, max: 1.6, step: 0.1, show: (v) => v.toFixed(1) },
  { key: 'swapButtons', label: 'ボタン配置', type: 'toggle', show: (v) => (v ? '右下' : '左下') },
  { key: 'showHitbox', label: '判定点を常に表示', type: 'toggle', show: (v) => (v ? 'ON' : 'OFF') },
  { key: 'shake', label: '画面振動', type: 'toggle', show: (v) => (v ? 'ON' : 'OFF') },
];

const rowY = (i) => 120 + i * 62;

export function settingsButtons() {
  const list = [];
  SETTING_ROWS.forEach((r, i) => {
    const y = rowY(i);
    if (r.type === 'range') {
      list.push({ id: 'set-' + r.key + '-', mode: 'tap', x: 206, y, w: 44, h: 40, label: '−' });
      list.push({ id: 'set-' + r.key + '+', mode: 'tap', x: 302, y, w: 44, h: 40, label: '＋' });
    } else {
      list.push({ id: 'set-' + r.key, mode: 'tap', x: 206, y, w: 140, h: 40, label: '' });
    }
  });
  list.push({ id: 'back', mode: 'tap', x: W / 2 - 60, y: 520, w: 120, h: 40, label: '戻る' });
  return list;
}

// 押されたボタンから新しい設定値を求める。該当しなければ null
export function settingFromTap(id, current) {
  for (const r of SETTING_ROWS) {
    const v = current[r.key];
    if (r.type === 'toggle' && id === 'set-' + r.key) return [r.key, !v];
    if (r.type === 'range') {
      const d = id === 'set-' + r.key + '+' ? 1 : id === 'set-' + r.key + '-' ? -1 : 0;
      if (d) {
        const nv = Math.round(Math.min(r.max, Math.max(r.min, v + d * r.step)) * 10) / 10;
        return [r.key, nv];
      }
    }
  }
  return null;
}

export function toggleLabel(id, current) {
  const r = SETTING_ROWS.find((r) => 'set-' + r.key === id);
  return r ? r.show(current[r.key]) : null;
}

export function drawSettings(ctx, current) {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = '#dff';
  ctx.fillText('設定', W / 2, 60);
  SETTING_ROWS.forEach((r, i) => {
    const y = rowY(i) + 20;
    ctx.textAlign = 'left';
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = COLORS.ui;
    ctx.fillText(r.label, 24, y);
    if (r.type === 'range') {
      ctx.textAlign = 'center';
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(String(r.show(current[r.key])), 276, y);
    }
  });
  ctx.restore();
}
