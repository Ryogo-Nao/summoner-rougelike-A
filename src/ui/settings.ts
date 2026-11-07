import type { EffectSpeed } from '../render/effects';

/** 遊び方の設定。端末のブラウザに保存する */
export interface Settings {
  turnFirst: boolean;
  allyMove: 'swap' | 'push';
  /** パッドを左右どちらに置くか */
  padSide: 'left' | 'right';
  /** 攻撃や魔法の演出の速さ */
  effectSpeed: EffectSpeed;
}

const KEY = 'summoner-settings';
const DEFAULTS: Settings = { turnFirst: true, allyMove: 'swap', padSide: 'left', effectSpeed: 'normal' };

/** 保存できない環境（プライベートブラウズなど）でも、初期値で遊べるようにする */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくても、このプレイの間は切り替えたまま遊べる
  }
}
