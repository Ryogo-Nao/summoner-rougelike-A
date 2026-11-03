import type { Dir, Pos } from './dir';

export type Speed = 'normal' | 'fast' | 'slow';

/** 魔物の種類ごとの値（balance.md 4章） */
export interface Species {
  id: string;
  name: string;
  emoji: string;
  floors: [number, number];
  hp: number;
  atk: number;
  def: number;
  exp: number;
  /** 基本捕獲率（0〜1） */
  capture: number;
  cost: number;
  speed: Speed;
  /** 2マス先まで、まっすぐ攻撃が届く */
  reach?: number;
  /** 動きがふらつく（半分の確率で、でたらめな方向に動く） */
  erratic?: boolean;
  /** 壁をすり抜ける */
  phasing?: boolean;
}

// 混乱・毒・火を吐くなどの特技は、状態異常を作るときに足す
export const SPECIES: readonly Species[] = [
  { id: 'chuppi', name: 'チュッピ', emoji: '🐭', floors: [1, 3], hp: 8, atk: 3, def: 1, exp: 3, capture: 0.3, cost: 3, speed: 'normal' },
  { id: 'berogg', name: 'ベロッグ', emoji: '🐸', floors: [1, 4], hp: 12, atk: 4, def: 2, exp: 5, capture: 0.25, cost: 4, speed: 'normal', reach: 2 },
  { id: 'patari', name: 'パタリ', emoji: '🦇', floors: [2, 5], hp: 10, atk: 4, def: 1, exp: 6, capture: 0.2, cost: 4, speed: 'fast', erratic: true },
  { id: 'pokotake', name: 'ポコタケ', emoji: '🍄', floors: [3, 7], hp: 18, atk: 5, def: 4, exp: 10, capture: 0.18, cost: 5, speed: 'normal' },
  { id: 'shururu', name: 'シュルル', emoji: '🐍', floors: [3, 6], hp: 16, atk: 6, def: 3, exp: 10, capture: 0.15, cost: 6, speed: 'normal' },
  { id: 'garuf', name: 'ガルフ', emoji: '🐺', floors: [4, 8], hp: 24, atk: 8, def: 4, exp: 16, capture: 0.12, cost: 8, speed: 'fast' },
  { id: 'kaburamu', name: 'カブラム', emoji: '🦂', floors: [5, 9], hp: 26, atk: 9, def: 7, exp: 20, capture: 0.1, cost: 8, speed: 'normal' },
  { id: 'moyari', name: 'モヤリ', emoji: '👻', floors: [6, 10], hp: 20, atk: 8, def: 3, exp: 22, capture: 0.08, cost: 9, speed: 'normal', phasing: true },
  { id: 'hidamari', name: 'ヒダマリ', emoji: '🦎', floors: [7, 10], hp: 30, atk: 10, def: 5, exp: 28, capture: 0.07, cost: 10, speed: 'normal' },
  { id: 'goromu', name: 'ゴロム', emoji: '🗿', floors: [8, 10], hp: 45, atk: 13, def: 10, exp: 40, capture: 0.05, cost: 12, speed: 'slow' },
];

export function speciesForFloor(floor: number): Species[] {
  return SPECIES.filter((s) => floor >= s.floors[0] && floor <= s.floors[1]);
}

export interface Monster {
  species: Species;
  pos: Pos;
  facing: Dir;
  hp: number;
  maxHp: number;
  /** 最後に主人公を見た場所。見失ったらそこまで行ってから探しに戻る */
  lastSeen: Pos | null;
  /** 主人公を見ていないときに向かう場所 */
  wanderTarget: Pos | null;
}

export function createMonster(species: Species, pos: Pos): Monster {
  return { species, pos, facing: 4, hp: species.hp, maxHp: species.hp, lastSeen: null, wanderTarget: null };
}
