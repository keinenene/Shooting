// 設定（音量・感度・ボタン配置・判定点・振動）。保存された値をゲームに反映する
import { INPUT } from './config.js';
import { sound } from './audio.js';
import { save, persist } from './storage.js';

export const SETTING_DEFAULTS = {
  se: 0.6,
  bgm: 0.4,
  sensitivity: 1.0,
  swapButtons: false,
  showHitbox: false,  // 判定点を常に表示
  shake: true,        // 画面振動
};

export function settings() {
  return save.settings;
}

// 保存されている設定をゲームに反映する
export function applySettings() {
  const s = { ...SETTING_DEFAULTS, ...save.settings };
  save.settings = s;
  INPUT.sensitivity = s.sensitivity;
  INPUT.swapButtons = s.swapButtons;
  sound.setVolume(s.se, s.bgm);
}

export function changeSetting(key, value) {
  save.settings[key] = value;
  applySettings();
  persist();
}
