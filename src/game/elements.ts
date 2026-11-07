// 属性（balance.md 3.7）。攻撃する側の属性と受ける側の属性で、ダメージの倍率が決まる

export type Element = 'none' | 'fire' | 'water' | 'thunder' | 'earth' | 'wind' | 'light' | 'dark';

export const ELEMENT_LABEL: Record<Element, string> = {
  none: '無',
  fire: '火',
  water: '水',
  thunder: '雷',
  earth: '土',
  wind: '風',
  light: '光',
  dark: '闇',
};

/** 属性のしるし。仮の絵文字で、あとで絵に置きかえる。無は出さない */
export const ELEMENT_ICON: Record<Element, string> = {
  none: '',
  fire: '🔥',
  water: '💧',
  thunder: '⚡',
  earth: '🪨',
  wind: '🌪️',
  light: '🌟',
  dark: '🌑',
};

/** 「🔥火」のように、しるしと名前。無は「無」だけ */
export const elementText = (e: Element) => `${ELEMENT_ICON[e]}${ELEMENT_LABEL[e]}`;

/**
 * それぞれの属性が強い相手。火→風→土→雷→水→火 と1つずつ強い。光と闇は、おたがいに強い（おたがいの弱点）
 */
const STRONG_AGAINST: Record<Element, readonly Element[]> = {
  none: [],
  fire: ['wind'],
  water: ['fire'],
  thunder: ['water'],
  earth: ['thunder'],
  wind: ['earth'],
  light: ['dark'],
  dark: ['light'],
};

/** 強い相手へのダメージの倍率と、効きにくい相手へのダメージの倍率 */
export const STRONG_RATE = 1.5;
export const WEAK_RATE = 2 / 3;

/**
 * attack の属性の攻撃が target の属性の相手に当たったときの倍率。
 * 強い相手へ ×1.5、相手が自分に強い属性か同じ属性なら ×2/3、それ以外と無は ×1
 */
export function elementRate(attack: Element, target: Element): number {
  if (attack === 'none' || target === 'none') return 1;
  if (STRONG_AGAINST[attack].includes(target)) return STRONG_RATE;
  if (attack === target || STRONG_AGAINST[target].includes(attack)) return WEAK_RATE;
  return 1;
}

/** 倍率から、ダメージの横に出す言葉。×1 なら null */
export const effectOf = (rate: number): 'strong' | 'weak' | null => (rate > 1 ? 'strong' : rate < 1 ? 'weak' : null);

export const EFFECT_TEXT: Record<'strong' | 'weak', string> = { strong: 'よく効いた', weak: '効きにくい' };
