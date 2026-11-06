import type { Dir, Pos } from './dir';
import { allyExpForLevel } from './combat';
import type { GrowthPace, GrowthType, Species } from './monsters';

/** 手元に持てるカードの数と、同時に召喚できる数（requirements.md 5.3） */
export const HAND_LIMIT = 5;
export const SUMMON_LIMIT = 3;
/** イヅツチの「いかずち」を使う確率 */
export const LIGHTNING_CHANCE = 0.35;

/** 相棒イヅツチ。ダンジョンには出ないので、出現階は空にしておく（balance.md 4.0） */
export const IZUTSUCHI: Species = {
  id: 'izutsuchi',
  name: 'イヅツチ',
  emoji: '🐈',
  hp: 20,
  atk: 5,
  def: 3,
  exp: 0,
  capture: 0,
  cost: 3,
  speed: 'normal',
  growth: 'partner',
  pace: 'normal',
  allyRate: 1,
};

export type CardStatus = 'ready' | 'summoned' | 'dying';

/** レベルと補正から求める能力 */
export type Stat = 'maxHp' | 'atk' | 'def';
export type Stats = Record<Stat, number>;
export const STAT_LABEL: Record<Stat, string> = { maxHp: 'HP', atk: '攻撃', def: '防御' };

/** 性格（requirements.md 6.2）。封印したときにカードごとに決まり、能力だけに効く */
export type PersonalityId = 'ganbari' | 'shincho' | 'takumashii' | 'okubyo' | 'sunao';

export interface Personality {
  name: string;
  /** ×1.1 になる能力と、×0.9 になる能力 */
  up?: Stat;
  down?: Stat;
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  ganbari: { name: 'がんばりや', up: 'atk', down: 'def' },
  shincho: { name: 'しんちょう', up: 'def', down: 'atk' },
  takumashii: { name: 'たくましい', up: 'maxHp', down: 'atk' },
  okubyo: { name: 'おくびょう', up: 'maxHp', down: 'def' },
  sunao: { name: 'すなお' },
};
export const PERSONALITY_IDS = Object.keys(PERSONALITIES) as PersonalityId[];
/** 性格で上がる・下がる割合 */
export const PERSONALITY_RATE = 0.1;

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
  /** 性格と、あとから足す能力（世代継承や道具など）。maxHp・atk・def はこれらとレベルから求める */
  personality: PersonalityId;
  bonus: Stats;
  status: CardStatus;
  /** このダンジョンで手に入れたカード。力つきると失う（requirements.md 6章） */
  obtainedHere: boolean;
  /** 付けた名前（ニックネーム）。なければ種族の名前で呼ぶ */
  nickname?: string;
  /** 配合回数（イヅツチは転生回数）。伸びが上がる（requirements.md 9.2） */
  fusions?: number;
}

/** 配合回数1回ごとに上がる伸びの割合と、上がるのをやめる回数（10回で1.5倍） */
export const FUSION_GROWTH = 0.05;
export const FUSION_GROWTH_LIMIT = 10;

/** 配合回数 fusions のときの伸びの倍率 */
export const growthRate = (fusions = 0) => 1 + FUSION_GROWTH * Math.min(fusions, FUSION_GROWTH_LIMIT);

/** ニックネームの長さの上限（文字） */
export const NICKNAME_LIMIT = 8;

/** 仲間の呼び名。ニックネームがあればそれ、なければ種族の名前。配合・転生していれば「+3」を付ける */
export const cardName = (card: Card) => `${card.nickname || card.species.name}${card.fusions ? `+${card.fusions}` : ''}`;

/** 文字の数。絵文字なども1文字と数える */
export const nicknameLength = (text: string) => Array.from(text.trim()).length;

/** フィールドに召喚している仲間 */
/** 仲間への指示（requirements.md 6章）。ついてくる・待機・突撃・逃げる */
export type AllyOrder = 'follow' | 'wait' | 'charge' | 'flee';

export const ORDER_LABEL: Record<AllyOrder, string> = {
  follow: 'ついてくる',
  wait: '待機',
  charge: '突撃',
  flee: '逃げる',
};

export interface Ally {
  card: Card;
  pos: Pos;
  facing: Dir;
  order: AllyOrder;
  /** 混乱・毒の残りターン。カードに戻すと治る */
  ailments: Ailments;
}

/** 状態異常の残りターン（balance.md 3.5）。0 ならかかっていない */
export interface Ailments {
  confused: number;
  poisoned: number;
  /** はりつけ。魔物は攻撃されるまで（1のまま減らない）、主人公と仲間は3〜5ターン。攻撃されると解ける */
  pinned: number;
  /** 昏睡。2〜4ターン行動できない。攻撃されると起きる */
  asleep: number;
  /** 激昂（攻撃が2倍）と要塞（受けるダメージを60％減らす）の残りターン。激昂の星・要塞の星でかかる。状態異常ではないので、癒しの星では消えない */
  raged: number;
  fortified: number;
}

export const noAilments = (): Ailments => ({ confused: 0, poisoned: 0, pinned: 0, asleep: 0, raged: 0, fortified: 0 });

let nextCardId = 1;

/** 保存したカードを読み込んだあと、新しいカードの番号が重ならないようにする */
export function reserveCardIds(maxId: number): void {
  nextCardId = Math.max(nextCardId, maxId + 1);
}

/** 仲間にしたばかり（Lv1）の能力は、敵のときのこの割合（balance.md 4.2） */
export const CAPTURED_RATE = 0.8;

/** 1レベルごとの伸び ＝ 決まった分 ＋ 敵のときの能力 × 割合（balance.md 4.2） */
const BASE_GAIN: Record<Stat, { flat: number; rate: number }> = {
  maxHp: { flat: 1, rate: 0.08 },
  atk: { flat: 0.5, rate: 0.06 },
  def: { flat: 0.3, rate: 0.06 },
};

/** 成長の型ごとの、伸びの倍率（balance.md 4.2） */
export const GROWTH_TYPES: Record<GrowthType, Stats> = {
  balance: { maxHp: 1, atk: 1, def: 1 },
  hp: { maxHp: 1.3, atk: 0.9, def: 0.9 },
  attack: { maxHp: 0.9, atk: 1.3, def: 0.8 },
  defense: { maxHp: 1, atk: 0.8, def: 1.4 },
  partner: { maxHp: 1.2, atk: 1.25, def: 2 },
};

/** 成長の早さ。until レベルまでは伸び × before、その先は × after */
export const GROWTH_PACES: Record<GrowthPace, { until: number; before: number; after: number }> = {
  early: { until: 10, before: 1.3, after: 0.6 },
  normal: { until: 10, before: 1, after: 1 },
  late: { until: 10, before: 0.7, after: 1.4 },
};

/** Lv1からそのレベルまでに、伸びを何回分もらったか（成長の早さを含む） */
function growthSteps(pace: GrowthPace, level: number): number {
  const { until, before, after } = GROWTH_PACES[pace];
  return (Math.min(level, until) - 1) * before + Math.max(0, level - until) * after;
}

/**
 * 仲間の能力（requirements.md 6.2）。
 * （Lv1の値 ＋ 1レベルの伸び × 成長の型 × 成長の早さ） × 性格 ＋ 足し算の補正
 */
export function cardStats(species: Species, level: number, personality: PersonalityId = 'sunao', bonus?: Stats, fusions = 0): Stats {
  return statsAt(species, level, species.allyRate ?? CAPTURED_RATE, personality, bonus, growthRate(fusions));
}

/**
 * 敵の魔物の、あるレベルでの能力（balance.md 4.5）。Lv1は表の値そのままで、
 * そこから仲間と同じ伸び方（成長の型・早さ）で強くなる
 */
export function monsterStats(species: Species, level: number): Stats {
  return statsAt(species, level, 1, 'sunao');
}

function statsAt(species: Species, level: number, startRate: number, personality: PersonalityId, bonus?: Stats, rate = 1): Stats {
  // 配合回数の分だけ、伸びを大きくする
  const steps = growthSteps(species.pace, level) * rate;
  const type = GROWTH_TYPES[species.growth];
  const { up, down } = PERSONALITIES[personality];
  const base: Stats = { maxHp: species.hp, atk: species.atk, def: species.def };
  const stat = (s: Stat) => {
    const gain = (BASE_GAIN[s].flat + base[s] * BASE_GAIN[s].rate) * type[s];
    const mood = s === up ? 1 + PERSONALITY_RATE : s === down ? 1 - PERSONALITY_RATE : 1;
    const value = (base[s] * startRate + gain * steps) * mood;
    return Math.max(1, Math.round(value) + (bonus?.[s] ?? 0));
  };
  return { maxHp: stat('maxHp'), atk: stat('atk'), def: stat('def') };
}

/** レベルや補正が変わったあとに、能力を求め直す。今のHPは最大HPを超えないようにする */
export function refreshStats(card: Card): void {
  Object.assign(card, cardStats(card.species, card.level, card.personality, card.bonus, card.fusions));
  card.hp = Math.min(card.hp, card.maxHp);
}

export const noBonus = (): Stats => ({ maxHp: 0, atk: 0, def: 0 });

/** level は封印した魔物のレベル。そのレベルになったばかりの経験値で始める */
export function createCard(species: Species, obtainedHere: boolean, personality: PersonalityId = 'sunao', level = 1): Card {
  const stats = cardStats(species, level, personality);
  return {
    id: nextCardId++,
    species,
    level,
    exp: allyExpForLevel(level),
    hp: stats.maxHp,
    ...stats,
    personality,
    bonus: noBonus(),
    status: 'ready',
    obtainedHere,
  };
}

export const isPartner = (card: Card) => card.species.id === IZUTSUCHI.id;

/** 一覧の中で a と b の場所を入れ替える（仲間の並べ替え） */
export function swapInList<T>(list: T[], a: T, b: T): void {
  const i = list.indexOf(a);
  const j = list.indexOf(b);
  if (i < 0 || j < 0 || i === j) return;
  list[i] = b;
  list[j] = a;
}

/** 仲間が1レベル上がったとき（balance.md 4.0、4.2） */
export function growCard(card: Card): void {
  card.level++;
  const before = card.maxHp;
  refreshStats(card);
  // 増えた分だけ今のHPも増える。仲間は自然回復しないので、全回復はしない
  card.hp += card.maxHp - before;
}

/**
 * 封印カードの成功率（requirements.md 5.2）。hpRatio は残りHPの割合。
 * h > 0.15 → 基本 × (1 + (1 − h))、0.01 < h ≦ 0.15 → 基本 × (3 + 2 × (0.15 − h) / 0.14)、
 * h ≦ 0.01 → 基本 × 5。最大100％
 */
export function captureChance(base: number, hpRatio: number): number {
  const h = Math.max(0, Math.min(1, hpRatio));
  const scale = h > 0.15 ? 1 + (1 - h) : h > 0.01 ? 3 + (2 * (0.15 - h)) / 0.14 : 5;
  return Math.min(1, base * scale);
}

/** 倒したときにカードを落とす確率（balance.md 4.1） */
export const dropChance = (species: Species) => species.capture * 0.1;
