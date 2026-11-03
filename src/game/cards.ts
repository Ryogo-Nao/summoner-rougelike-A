import type { Dir, Pos } from './dir';
import type { Species } from './monsters';

/** 手元に持てるカードの数と、同時に召喚できる数（requirements.md 5.3） */
export const HAND_LIMIT = 5;
export const SUMMON_LIMIT = 3;
/** 階段を降りたときに仲間が回復する割合（balance.md 7章） */
export const ALLY_STAIRS_HEAL = 0.25;
/** イヅツチの「いかずち」を使う確率 */
export const LIGHTNING_CHANCE = 0.35;

/** 相棒イヅツチ。ダンジョンには出ないので、出現階は空にしておく（balance.md 4.0） */
export const IZUTSUCHI: Species = {
  id: 'izutsuchi',
  name: 'イヅツチ',
  emoji: '🐈',
  floors: [0, -1],
  hp: 20,
  atk: 5,
  def: 3,
  exp: 0,
  capture: 0,
  cost: 3,
  speed: 'normal',
};

export type CardStatus = 'ready' | 'summoned' | 'dying';

/** 魔物を封印したカード。仲間のレベルとHPはカードに残る */
export interface Card {
  id: number;
  species: Species;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  status: CardStatus;
  /** このダンジョンで手に入れたカード。力つきると失う（requirements.md 6章） */
  obtainedHere: boolean;
}

/** フィールドに召喚している仲間 */
export interface Ally {
  card: Card;
  pos: Pos;
  facing: Dir;
}

let nextCardId = 1;

export function createCard(species: Species, obtainedHere: boolean): Card {
  return {
    id: nextCardId++,
    species,
    level: 1,
    exp: 0,
    hp: species.hp,
    maxHp: species.hp,
    atk: species.atk,
    def: species.def,
    status: 'ready',
    obtainedHere,
  };
}

export const isPartner = (card: Card) => card.species.id === IZUTSUCHI.id;

/** 仲間が1レベル上がったときの成長（balance.md 4.0、4.2）。イヅツチは少し良い */
export function growCard(card: Card): void {
  card.level++;
  const before = card.maxHp;
  if (isPartner(card)) {
    card.maxHp = Math.max(before + 3, Math.round(before * 1.12));
    card.def += 1;
  } else {
    card.maxHp = Math.max(before + 2, Math.round(before * 1.1));
    if (card.level % 2 === 1) card.def += 1;
  }
  card.atk += 1;
  // 増えた分だけ今のHPも増える。仲間は自然回復しないので、全回復はしない
  card.hp += card.maxHp - before;
}

/**
 * 封印カードの成功率（requirements.md 5.2）。hpRatio は残りHPの割合。
 * h > 0.15 → 基本 × (1 + (1 − h))、h ≦ 0.15 → 基本 × (3 + 2 × (0.15 − h) / 0.15)。最大100％
 */
export function captureChance(base: number, hpRatio: number): number {
  const h = Math.max(0, Math.min(1, hpRatio));
  const scale = h > 0.15 ? 1 + (1 - h) : 3 + (2 * (0.15 - h)) / 0.15;
  return Math.min(1, base * scale);
}

/** 倒したときにカードを落とす確率（balance.md 4.1） */
export const dropChance = (species: Species) => species.capture * 0.1;
