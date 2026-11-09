import { monsterStats, noAilments, type Ailments } from './cards';
import type { Dir, Pos } from './dir';
import type { Element } from './elements';

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
  /** 魔法攻撃力・魔法防御力（balance.md 3.6）。魔法の攻撃（火を吐く・いかずちなど）だけに効く */
  matk: number;
  mdef: number;
  /** 属性（balance.md 3.7）。この属性で攻撃し、この属性で受ける */
  element: Element;
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
   * 弱み（鈍足・ふらふら）の代わりの強み（2026-11-08。balance.md 4.6）。
   * mighty は通常攻撃の攻撃力が1.5倍、sturdy は受けるダメージが半分、armored は物理（通常攻撃）で受けるダメージが2/3
   */
  mighty?: boolean;
  sturdy?: boolean;
  armored?: boolean;
  /**
   * 特技（balance.md 3.5、4章）。spore は胞子で混乱、venom は毒、breath は火を吐く、
   * sleep は鱗粉で眠らせる、pin は糸ではりつけにする、manaBite はMPを減らす（主人公だけ）、drain は与えたダメージの半分を吸い取る
   */
  special?: 'spore' | 'venom' | 'breath' | 'sleep' | 'pin' | 'manaBite' | 'drain';
  /** 特技の呼び名（ログに出す）。省くと 胞子・毒・火・鱗粉・糸。水の属性の breath は水の見た目で吐く */
  specialName?: string;
  /** 仲間にしたときの成長の型と早さ。プレイヤーには見せない */
  growth: GrowthType;
  pace: GrowthPace;
  /** 仲間にしたばかり（Lv1）の能力が、敵のときの何倍か。省くと CAPTURED_RATE */
  allyRate?: number;
}

export const SPECIES: readonly Species[] = [
  { id: 'chuppi', name: 'チュッピ', emoji: '🐭', hp: 8, atk: 3, def: 1, matk: 2, mdef: 1, element: 'none', exp: 3, capture: 0.3, cost: 3, speed: 'normal', growth: 'balance', pace: 'early' },
  { id: 'berogg', name: 'ベロッグ', emoji: '🐸', hp: 12, atk: 4, def: 2, matk: 3, mdef: 3, element: 'water', exp: 5, capture: 0.25, cost: 4, speed: 'normal', reach: 2, growth: 'balance', pace: 'normal' },
  { id: 'patari', name: 'パタリ', emoji: '🦇', hp: 10, atk: 4, def: 1, matk: 3, mdef: 2, element: 'wind', exp: 6, capture: 0.2, cost: 4, speed: 'normal', twoHits: true, erratic: true, special: 'drain', growth: 'balance', pace: 'early' },
  { id: 'pokotake', name: 'ポコタケ', emoji: '🍄', hp: 18, atk: 5, def: 4, matk: 5, mdef: 4, element: 'earth', exp: 10, capture: 0.18, cost: 5, speed: 'normal', special: 'spore', growth: 'hp', pace: 'late' },
  { id: 'shururu', name: 'シュルル', emoji: '🐍', hp: 16, atk: 6, def: 3, matk: 4, mdef: 3, element: 'none', exp: 10, capture: 0.15, cost: 6, speed: 'normal', special: 'venom', growth: 'attack', pace: 'early' },
  { id: 'garuf', name: 'ガルフ', emoji: '🐺', hp: 24, atk: 8, def: 4, matk: 4, mdef: 2, element: 'wind', exp: 16, capture: 0.12, cost: 8, speed: 'normal', twoHits: true, growth: 'attack', pace: 'normal' },
  { id: 'kaburamu', name: 'カブラム', emoji: '🦂', hp: 26, atk: 9, def: 7, matk: 4, mdef: 2, element: 'earth', exp: 20, capture: 0.1, cost: 8, speed: 'normal', growth: 'defense', pace: 'normal' },
  { id: 'moyari', name: 'モヤリ', emoji: '👻', hp: 20, atk: 8, def: 3, matk: 8, mdef: 8, element: 'dark', exp: 22, capture: 0.08, cost: 9, speed: 'normal', phasing: true, growth: 'attack', pace: 'late' },
  { id: 'hidamari', name: 'ヒダマリ', emoji: '🦎', hp: 30, atk: 10, def: 5, matk: 10, mdef: 6, element: 'fire', exp: 28, capture: 0.07, cost: 10, speed: 'normal', special: 'breath', growth: 'balance', pace: 'normal' },
  { id: 'goromu', name: 'ゴロム', emoji: '🗿', hp: 45, atk: 13, def: 10, matk: 5, mdef: 3, element: 'earth', exp: 40, capture: 0.05, cost: 12, speed: 'slow', mighty: true, growth: 'hp', pace: 'late' },
  // 2026-11-07 に足した10種（強さは仮。balance.md 4章）
  { id: 'nemuriga', name: 'ネムリガ', emoji: '🦋', hp: 14, atk: 4, def: 2, matk: 6, mdef: 5, element: 'wind', exp: 9, capture: 0.18, cost: 5, speed: 'normal', special: 'sleep', growth: 'balance', pace: 'early' },
  { id: 'kuimushi', name: 'クイムシ', emoji: '🐛', hp: 16, atk: 5, def: 3, matk: 5, mdef: 6, element: 'none', exp: 10, capture: 0.18, cost: 5, speed: 'normal', special: 'manaBite', growth: 'hp', pace: 'normal' },
  { id: 'amigumo', name: 'アミグモ', emoji: '🕷️', hp: 18, atk: 6, def: 3, matk: 4, mdef: 3, element: 'dark', exp: 12, capture: 0.15, cost: 6, speed: 'normal', special: 'pin', growth: 'attack', pace: 'normal' },
  { id: 'chisui', name: 'チスイ', emoji: '🦟', hp: 15, atk: 7, def: 2, matk: 5, mdef: 3, element: 'dark', exp: 13, capture: 0.14, cost: 6, speed: 'normal', special: 'drain', growth: 'attack', pace: 'early' },
  { id: 'tsubumaru', name: 'ツブマル', emoji: '🐌', hp: 30, atk: 6, def: 9, matk: 3, mdef: 4, element: 'water', exp: 14, capture: 0.14, cost: 7, speed: 'slow', sturdy: true, growth: 'defense', pace: 'late' },
  { id: 'fuwakura', name: 'フワクラ', emoji: '🪼', hp: 28, atk: 8, def: 3, matk: 7, mdef: 7, element: 'light', exp: 24, capture: 0.09, cost: 8, speed: 'normal', regen: 0.05, growth: 'hp', pace: 'late' },
  { id: 'nurarika', name: 'ヌラリカ', emoji: '🦑', hp: 28, atk: 10, def: 4, matk: 7, mdef: 5, element: 'water', exp: 26, capture: 0.08, cost: 9, speed: 'normal', reach: 2, reachName: '触手', growth: 'attack', pace: 'normal' },
  { id: 'kirigani', name: 'キリガニ', emoji: '🦀', hp: 32, atk: 9, def: 10, matk: 4, mdef: 3, element: 'water', exp: 30, capture: 0.07, cost: 10, speed: 'normal', twoHits: true, growth: 'defense', pace: 'normal' },
  { id: 'dosuino', name: 'ドスイノ', emoji: '🐗', hp: 40, atk: 12, def: 4, matk: 3, mdef: 2, element: 'none', exp: 34, capture: 0.06, cost: 10, speed: 'normal', growth: 'attack', pace: 'normal' },
  { id: 'tsuraragu', name: 'ツララグマ', emoji: '🐻‍❄️', hp: 50, atk: 14, def: 8, matk: 4, mdef: 4, element: 'water', exp: 48, capture: 0.04, cost: 13, speed: 'normal', growth: 'hp', pace: 'normal' },
  // 2026-11-08 に足した24種。属性ごとに、野生の弱い魔物・野生の強い魔物・配合でしか生まれない魔物を1体ずつ（balance.md 4章）
  { id: 'hinoko', name: 'ヒノコ', emoji: '🐤', hp: 12, atk: 4, def: 2, matk: 5, mdef: 3, element: 'fire', exp: 6, capture: 0.25, cost: 4, speed: 'normal', growth: 'balance', pace: 'early' },
  { id: 'pukuri', name: 'プクリ', emoji: '🐡', hp: 14, atk: 3, def: 6, matk: 3, mdef: 4, element: 'water', exp: 6, capture: 0.25, cost: 4, speed: 'normal', growth: 'defense', pace: 'normal' },
  { id: 'birisu', name: 'ビリス', emoji: '🐿️', hp: 12, atk: 4, def: 2, matk: 5, mdef: 3, element: 'thunder', exp: 7, capture: 0.22, cost: 4, speed: 'normal', twoHits: true, growth: 'balance', pace: 'early' },
  { id: 'tsuchimogu', name: 'ツチモグ', emoji: '🐹', hp: 16, atk: 4, def: 5, matk: 2, mdef: 3, element: 'earth', exp: 7, capture: 0.22, cost: 5, speed: 'normal', growth: 'defense', pace: 'normal' },
  { id: 'watage', name: 'ワタゲ', emoji: '🌼', hp: 10, atk: 3, def: 2, matk: 6, mdef: 5, element: 'wind', exp: 6, capture: 0.25, cost: 4, speed: 'normal', erratic: true, special: 'sleep', specialName: '綿毛', growth: 'balance', pace: 'early' },
  { id: 'hotari', name: 'ホタリ', emoji: '🪲', hp: 11, atk: 3, def: 2, matk: 6, mdef: 8, element: 'light', exp: 6, capture: 0.25, cost: 4, speed: 'normal', growth: 'balance', pace: 'normal' },
  { id: 'yoruneko', name: 'ヨルネコ', emoji: '🐈‍⬛', hp: 14, atk: 5, def: 2, matk: 5, mdef: 4, element: 'dark', exp: 7, capture: 0.22, cost: 5, speed: 'normal', special: 'spore', specialName: '妖しい瞳', growth: 'attack', pace: 'early' },
  { id: 'tsunousa', name: 'ツノウサ', emoji: '🐇', hp: 13, atk: 5, def: 3, matk: 2, mdef: 2, element: 'none', exp: 6, capture: 0.25, cost: 4, speed: 'normal', growth: 'attack', pace: 'early' },
  { id: 'homurajishi', name: 'ホムラジシ', emoji: '🦁', hp: 44, atk: 13, def: 6, matk: 11, mdef: 6, element: 'fire', exp: 36, capture: 0.06, cost: 11, speed: 'normal', special: 'breath', growth: 'attack', pace: 'normal' },
  { id: 'kujiran', name: 'クジラン', emoji: '🐋', hp: 55, atk: 12, def: 7, matk: 11, mdef: 8, element: 'water', exp: 40, capture: 0.05, cost: 12, speed: 'slow', special: 'breath', specialName: '水の塊', growth: 'hp', pace: 'late' },
  { id: 'raijuu', name: 'ライジュウ', emoji: '🐆', hp: 42, atk: 13, def: 5, matk: 8, mdef: 5, element: 'thunder', exp: 38, capture: 0.06, cost: 11, speed: 'normal', twoHits: true, growth: 'attack', pace: 'normal' },
  { id: 'iwagame', name: 'イワガメ', emoji: '🐢', hp: 48, atk: 10, def: 15, matk: 4, mdef: 6, element: 'earth', exp: 36, capture: 0.06, cost: 11, speed: 'slow', armored: true, growth: 'defense', pace: 'late' },
  { id: 'kamaitachi', name: 'カマイタチ', emoji: '🦦', hp: 32, atk: 12, def: 5, matk: 6, mdef: 4, element: 'wind', exp: 30, capture: 0.07, cost: 10, speed: 'normal', twoHits: true, growth: 'attack', pace: 'early' },
  { id: 'shirojika', name: 'シロジカ', emoji: '🦌', hp: 40, atk: 11, def: 7, matk: 9, mdef: 10, element: 'light', exp: 34, capture: 0.06, cost: 11, speed: 'normal', growth: 'balance', pace: 'normal' },
  { id: 'karabone', name: 'カラボネ', emoji: '💀', hp: 40, atk: 13, def: 8, matk: 4, mdef: 4, element: 'dark', exp: 34, capture: 0.06, cost: 11, speed: 'normal', growth: 'defense', pace: 'normal' },
  { id: 'gouriki', name: 'ゴウリキ', emoji: '🦍', hp: 52, atk: 15, def: 7, matk: 3, mdef: 3, element: 'none', exp: 40, capture: 0.05, cost: 12, speed: 'slow', mighty: true, growth: 'hp', pace: 'late' },
  { id: 'hiirodori', name: 'ヒイロドリ', emoji: '🐦', hp: 34, atk: 10, def: 5, matk: 10, mdef: 7, element: 'fire', exp: 30, capture: 0.05, cost: 10, speed: 'normal', regen: 0.05, growth: 'balance', pace: 'normal' },
  { id: 'mizuchi', name: 'ミズチ', emoji: '🐉', hp: 58, atk: 15, def: 8, matk: 12, mdef: 9, element: 'water', exp: 40, capture: 0.05, cost: 12, speed: 'normal', reach: 2, reachName: '水の息', growth: 'attack', pace: 'normal' },
  { id: 'narukami', name: 'ナルカミ', emoji: '🐺', hp: 50, atk: 15, def: 6, matk: 10, mdef: 6, element: 'thunder', exp: 42, capture: 0.05, cost: 12, speed: 'normal', twoHits: true, growth: 'attack', pace: 'normal' },
  { id: 'kodama', name: 'コダマ', emoji: '🌳', hp: 34, atk: 9, def: 7, matk: 8, mdef: 8, element: 'earth', exp: 30, capture: 0.05, cost: 10, speed: 'normal', special: 'spore', regen: 0.06, growth: 'hp', pace: 'late' },
  { id: 'tsumuji', name: 'ツムジ', emoji: '🌪️', hp: 46, atk: 13, def: 5, matk: 10, mdef: 7, element: 'wind', exp: 40, capture: 0.05, cost: 12, speed: 'normal', reach: 2, reachName: '風の刃', growth: 'attack', pace: 'normal' },
  { id: 'kourin', name: 'コウリン', emoji: '😇', hp: 46, atk: 12, def: 6, matk: 12, mdef: 10, element: 'light', exp: 40, capture: 0.05, cost: 12, speed: 'normal', special: 'drain', growth: 'balance', pace: 'normal' },
  { id: 'nue', name: 'ヌエ', emoji: '🐒', hp: 34, atk: 11, def: 5, matk: 7, mdef: 5, element: 'dark', exp: 30, capture: 0.05, cost: 10, speed: 'normal', twoHits: true, special: 'venom', growth: 'attack', pace: 'normal' },
  { id: 'yumebaku', name: 'ユメバク', emoji: '🐘', hp: 46, atk: 13, def: 7, matk: 10, mdef: 8, element: 'none', exp: 30, capture: 0.05, cost: 10, speed: 'normal', special: 'sleep', specialName: '夢の霧', growth: 'hp', pace: 'normal' },
];

/** 配合でしか生まれない魔物（野生には出ない。fusion.ts の RECIPES で生まれる） */
export const FUSION_ONLY = ['hiirodori', 'mizuchi', 'narukami', 'kodama', 'tsumuji', 'kourin', 'nue', 'yumebaku'];


/** 強みの倍率（balance.md 4.6） */
export const MIGHTY_RATE = 1.5;
export const STURDY_RATE = 0.5;
export const ARMORED_RATE = 2 / 3;

/** 通常攻撃の攻撃力。mighty なら1.5倍 */
export const mightyAtk = (species: Species, atk: number) => (species.mighty ? Math.round(atk * MIGHTY_RATE) : atk);

/** 受けるダメージ。sturdy なら半分、armored なら物理（physical）だけ2/3（どちらも最低1） */
export function sturdyDamage(species: Species, dmg: number, physical = false): number {
  if (species.sturdy) return Math.max(1, Math.round(dmg * STURDY_RATE));
  if (species.armored && physical) return Math.max(1, Math.round(dmg * ARMORED_RATE));
  return dmg;
}

export interface Monster {
  species: Species;
  /** レベル。ダンジョンごとに決まる（はじまりの洞窟は1）。能力と経験値はレベルで上がる */
  level: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
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
  const { maxHp, atk, def, matk, mdef } = monsterStats(species, level);
  return {
    species,
    level,
    atk,
    def,
    matk,
    mdef,
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
