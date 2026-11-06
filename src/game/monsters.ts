import { monsterStats, noAilments, type Ailments } from './cards';
import type { Dir, Pos } from './dir';

export type Speed = 'normal' | 'fast' | 'slow';
/** 仲間にしたときに、どの能力がよく伸びるか（requirements.md 6.2）。partner は相棒イヅツチだけ */
export type GrowthType = 'balance' | 'hp' | 'attack' | 'defense' | 'partner';
/** 仲間にしたときの、伸びる時期。early は早熟、late は晩成 */
export type GrowthPace = 'early' | 'normal' | 'late';

/** 魔物の種類ごとの値（balance.md 4章） */
export interface Species {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  /** 基本捕獲率（0〜1） */
  capture: number;
  cost: number;
  speed: Speed;
  /** 1ターンに2回攻撃する（隣の相手への通常攻撃だけ。動くのは1回） */
  twoHits?: boolean;
  /** 2マス先まで、まっすぐ攻撃が届く */
  reach?: number;
  /** 離れたところから届く攻撃の名前（ログと特技の説明に出す）。省くと「舌」 */
  reachName?: string;
  /** 毎ターン、最大HPのこの割合だけHPが戻る（最低1）。毒のあいだは戻らない */
  regen?: number;
  /** 動きがふらつく（半分の確率で、でたらめな方向に動く。隣にいるときは、半分の確率で行動を失う） */
  erratic?: boolean;
  /** 壁をすり抜ける */
  phasing?: boolean;
  /**
   * 特技（balance.md 3.5、4章）。spore は胞子で混乱、venom は毒、breath は火を吐く、
   * sleep は鱗粉で眠らせる、pin は糸ではりつけにする、manaBite はMPを減らす（主人公だけ）、drain は与えたダメージの半分を吸い取る
   */
  special?: 'spore' | 'venom' | 'breath' | 'sleep' | 'pin' | 'manaBite' | 'drain';
  /** 仲間にしたときの成長の型と早さ。プレイヤーには見せない */
  growth: GrowthType;
  pace: GrowthPace;
  /** 仲間にしたばかり（Lv1）の能力が、敵のときの何倍か。省くと CAPTURED_RATE */
  allyRate?: number;
}

export const SPECIES: readonly Species[] = [
  { id: 'chuppi', name: 'チュッピ', emoji: '🐭', hp: 8, atk: 3, def: 1, exp: 3, capture: 0.3, cost: 3, speed: 'normal', growth: 'balance', pace: 'early' },
  { id: 'berogg', name: 'ベロッグ', emoji: '🐸', hp: 12, atk: 4, def: 2, exp: 5, capture: 0.25, cost: 4, speed: 'normal', reach: 2, growth: 'balance', pace: 'normal' },
  { id: 'patari', name: 'パタリ', emoji: '🦇', hp: 10, atk: 4, def: 1, exp: 6, capture: 0.2, cost: 4, speed: 'normal', twoHits: true, erratic: true, growth: 'balance', pace: 'early' },
  { id: 'pokotake', name: 'ポコタケ', emoji: '🍄', hp: 18, atk: 5, def: 4, exp: 10, capture: 0.18, cost: 5, speed: 'normal', special: 'spore', growth: 'hp', pace: 'late' },
  { id: 'shururu', name: 'シュルル', emoji: '🐍', hp: 16, atk: 6, def: 3, exp: 10, capture: 0.15, cost: 6, speed: 'normal', special: 'venom', growth: 'attack', pace: 'early' },
  { id: 'garuf', name: 'ガルフ', emoji: '🐺', hp: 24, atk: 8, def: 4, exp: 16, capture: 0.12, cost: 8, speed: 'normal', twoHits: true, growth: 'attack', pace: 'normal' },
  { id: 'kaburamu', name: 'カブラム', emoji: '🦂', hp: 26, atk: 9, def: 7, exp: 20, capture: 0.1, cost: 8, speed: 'normal', growth: 'defense', pace: 'normal' },
  { id: 'moyari', name: 'モヤリ', emoji: '👻', hp: 20, atk: 8, def: 3, exp: 22, capture: 0.08, cost: 9, speed: 'normal', phasing: true, growth: 'attack', pace: 'late' },
  { id: 'hidamari', name: 'ヒダマリ', emoji: '🦎', hp: 30, atk: 10, def: 5, exp: 28, capture: 0.07, cost: 10, speed: 'normal', special: 'breath', growth: 'balance', pace: 'normal' },
  { id: 'goromu', name: 'ゴロム', emoji: '🗿', hp: 45, atk: 13, def: 10, exp: 40, capture: 0.05, cost: 12, speed: 'slow', growth: 'hp', pace: 'late' },
  // 2026-11-07 に足した10種（強さは仮。balance.md 4章）
  { id: 'nemuriga', name: 'ネムリガ', emoji: '🦋', hp: 14, atk: 4, def: 2, exp: 9, capture: 0.18, cost: 5, speed: 'normal', special: 'sleep', growth: 'balance', pace: 'early' },
  { id: 'kuimushi', name: 'クイムシ', emoji: '🐛', hp: 16, atk: 5, def: 3, exp: 10, capture: 0.18, cost: 5, speed: 'normal', special: 'manaBite', growth: 'hp', pace: 'normal' },
  { id: 'amigumo', name: 'アミグモ', emoji: '🕷️', hp: 18, atk: 6, def: 3, exp: 12, capture: 0.15, cost: 6, speed: 'normal', special: 'pin', growth: 'attack', pace: 'normal' },
  { id: 'chisui', name: 'チスイ', emoji: '🦟', hp: 15, atk: 7, def: 2, exp: 13, capture: 0.14, cost: 6, speed: 'normal', special: 'drain', growth: 'attack', pace: 'early' },
  { id: 'tsubumaru', name: 'ツブマル', emoji: '🐌', hp: 30, atk: 6, def: 9, exp: 14, capture: 0.14, cost: 7, speed: 'slow', growth: 'defense', pace: 'late' },
  { id: 'fuwakura', name: 'フワクラ', emoji: '🪼', hp: 28, atk: 8, def: 3, exp: 24, capture: 0.09, cost: 8, speed: 'normal', regen: 0.05, growth: 'hp', pace: 'late' },
  { id: 'nurarika', name: 'ヌラリカ', emoji: '🦑', hp: 28, atk: 10, def: 4, exp: 26, capture: 0.08, cost: 9, speed: 'normal', reach: 2, reachName: '触手', growth: 'attack', pace: 'normal' },
  { id: 'kirigani', name: 'キリガニ', emoji: '🦀', hp: 32, atk: 9, def: 10, exp: 30, capture: 0.07, cost: 10, speed: 'normal', twoHits: true, growth: 'defense', pace: 'normal' },
  { id: 'dosuino', name: 'ドスイノ', emoji: '🐗', hp: 40, atk: 12, def: 4, exp: 34, capture: 0.06, cost: 10, speed: 'normal', growth: 'attack', pace: 'normal' },
  { id: 'tsuraragu', name: 'ツララグマ', emoji: '🐻‍❄️', hp: 50, atk: 14, def: 8, exp: 48, capture: 0.04, cost: 13, speed: 'normal', growth: 'hp', pace: 'normal' },
];


export interface Monster {
  species: Species;
  /** レベル。ダンジョンごとに決まる（はじまりの洞窟は1）。能力と経験値はレベルで上がる */
  level: number;
  atk: number;
  def: number;
  pos: Pos;
  facing: Dir;
  hp: number;
  maxHp: number;
  /** 最後に主人公を見た場所。見失ったらそこまで行ってから探しに戻る */
  lastSeen: Pos | null;
  /** 主人公を見ていないときに向かう場所 */
  wanderTarget: Pos | null;
  /** 混乱・毒の残りターン。仲間のポコタケ・シュルルの特技でかかる */
  ailments: Ailments;
  /** モンスターハウスで眠っている。主人公が部屋に入るか、攻撃されると起きる */
  dormant?: boolean;
}

export function createMonster(species: Species, pos: Pos, level = 1): Monster {
  const { maxHp, atk, def } = monsterStats(species, level);
  return {
    species,
    level,
    atk,
    def,
    pos,
    facing: 4,
    hp: maxHp,
    maxHp,
    lastSeen: null,
    wanderTarget: null,
    ailments: noAilments(),
  };
}

/** たおしたときの経験値。レベルが1上がるごとに5割増える（balance.md 4.5） */
export const monsterExp = (m: Monster) => Math.round(m.species.exp * (1 + 0.5 * (m.level - 1)));
