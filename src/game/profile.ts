import { HAND_LIMIT, IZUTSUCHI, createCard, isPartner, reserveCardIds, type Card } from './cards';
import { BAG_LIMIT, ITEMS, START_ITEMS, allItems, createItem, noShortcuts, reserveItemIds, type Item, type Shortcuts } from './items';
import {
  cardFromData,
  cardToData,
  type CardData,
  type GameState,
  type Loadout,
  type SpellId,
  type SpellRanks,
} from './state';

/** 倉庫に入るアイテムの数（requirements.md 10.4） */
export const WAREHOUSE_LIMIT = 9999;

/**
 * ダンジョンの外に残るもの。持っているカードすべて、そのうち持っていくカード、
 * 持っていくバッグの中身、倉庫、覚えた魔法
 */
export interface Profile {
  cards: Card[];
  /** 持っていくカードの id（5枚まで）。残りは保管庫にある */
  hand: number[];
  bag: Item[];
  warehouse: Item[];
  learned: SpellId[];
  /** 魔法のランク（無印は0） */
  ranks: SpellRanks;
  /** 踏破したダンジョンの id。次のダンジョンに挑めるかなどに使う */
  cleared: string[];
  /** ［攻撃］の長押しで使う、登録した道具の種類 */
  shortcuts: Shortcuts;
}

/** ダンジョンの終わり方。踏破（いちばん下まで行った）・離脱（転送の印で出た）・失敗（力つきた） */
export type Outcome = 'cleared' | 'escaped' | 'failed';

export function outcomeOf(state: GameState): Outcome | null {
  if (state.cleared) return 'cleared';
  if (state.escaped) return 'escaped';
  if (state.dead) return 'failed';
  return null;
}

interface ProfileData {
  version: 1;
  cards: CardData[];
  hand: number[];
  bag: Item[];
  warehouse: Item[];
  learned: SpellId[];
  ranks?: SpellRanks;
  cleared?: string[];
  shortcuts?: Shortcuts;
}

const PROFILE_KEY = 'summoner-profile';
const RUN_KEY = 'summoner-run';

/** 初めて遊ぶとき。イヅツチのカードと、最初の持ち物だけを持っている（balance.md 8章） */
export function newProfile(): Profile {
  const partner = createCard(IZUTSUCHI, false);
  return { cards: [partner], hand: [partner.id], bag: START_ITEMS.map(createItem), warehouse: [], learned: [], ranks: {}, cleared: [], shortcuts: noShortcuts() };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return newProfile();
    const data = JSON.parse(raw) as ProfileData;
    const profile: Profile = { ...data, cards: data.cards.map(cardFromData), ranks: data.ranks ?? {}, cleared: data.cleared ?? [], shortcuts: data.shortcuts ?? noShortcuts() };
    reserveCardIds(Math.max(0, ...profile.cards.map((c) => c.id)));
    reserveItemIds(Math.max(0, ...allItems([...profile.bag, ...profile.warehouse]).map((i) => i.id)));
    return profile;
  } catch {
    return newProfile();
  }
}

export function saveProfile(profile: Profile): void {
  const data: ProfileData = { version: 1, ...profile, cards: profile.cards.map(cardToData) };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch {
    // 保存できない環境でも、開いている間は遊べる
  }
}

/** 持っていくカード・バッグ・魔法。カードは召喚できる状態にする */
export function loadoutOf(profile: Profile): Loadout {
  // 拠点のカードの一覧の順に持っていく
  const cards = profile.cards.filter((c) => profile.hand.includes(c.id)).slice(0, HAND_LIMIT);
  return { cards: cards.map((c) => ({ ...c })), bag: profile.bag.map((i) => ({ ...i })), learned: [...profile.learned], ranks: { ...profile.ranks }, shortcuts: [...profile.shortcuts] };
}

// ---- ダンジョンの途中の保存 ----

export function saveRun(state: GameState): void {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(state.toData()));
  } catch {
    // 保存できなくても、開いている間は遊べる
  }
}

export function loadRunData(): unknown {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    // 消せなくても、次に保存したときに上書きされる
  }
}

/** ダンジョンから戻ったときに失ったもの。downgraded は、ふつうの袋に戻った聖なる袋の数 */
export interface Losses {
  cards: Card[];
  items: Item[];
  downgraded: number;
}

/** 力つきたときに、聖なる袋がふつうの袋に戻る確率 */
const HOLY_DOWNGRADE = 0.3;

/**
 * ダンジョンから拠点に戻る。力つきたときは、そのダンジョンで手に入れたカードと、
 * バッグの中身の半分（ランダム）を失う（requirements.md 5.7）。
 * 残ったカードは瀕死から戻し、HPを満タンにする。持っていたカードは次も持っていく
 */
export function returnToBase(profile: Profile, state: GameState): Losses {
  const brought = new Set(profile.hand);
  const runCards = [...state.cards, ...state.storage, ...(state.pendingCard ? [state.pendingCard] : [])];
  const losses: Losses = { cards: [], items: [], downgraded: 0 };
  let bag = [...state.bag];
  if (state.dead) {
    losses.cards = runCards.filter((c) => c.obtainedHere && !isPartner(c));
    // 聖なる袋（と中の道具）は失わない。それ以外の半分を失う。ほかの袋は、失えば中身ごとなくなる
    const holy = (i: Item) => ITEMS[i.kind].pouch?.holy === true;
    const pool = bag.filter((i) => !holy(i));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    losses.items = shuffled.slice(0, Math.floor(pool.length / 2));
    bag = bag.filter((i) => !losses.items.includes(i));
    // 聖なる袋は、30％でふつうの袋に戻る（中の道具はそのまま）
    for (const i of bag) {
      if (holy(i) && Math.random() < HOLY_DOWNGRADE) {
        i.kind = 'pouch';
        losses.downgraded++;
      }
    }
  }
  const kept = runCards
    .filter((c) => !losses.cards.includes(c))
    .map((c) => ({ ...c, status: 'ready' as const, hp: c.maxHp, obtainedHere: false }));
  const hand = state.cards.filter((c) => !losses.cards.includes(c)).map((c) => c.id);
  // 持っていったカードは、一覧のもとの場所にダンジョンでの順で戻す。新しく手に入れたカードは後ろに付ける
  const back = kept.filter((c) => brought.has(c.id));
  const placed = profile.cards.flatMap((c) => (brought.has(c.id) ? (back.length > 0 ? [back.shift()!] : []) : [c]));
  profile.cards = [...placed, ...back, ...kept.filter((c) => !brought.has(c.id))];
  profile.hand = hand.slice(0, HAND_LIMIT);
  profile.bag = bag.slice(0, BAG_LIMIT);
  profile.learned = [...state.learned];
  profile.ranks = { ...state.ranks };
  profile.shortcuts = [...state.shortcuts];
  if (state.cleared && !profile.cleared.includes(state.dungeon.id)) profile.cleared.push(state.dungeon.id);
  saveProfile(profile);
  clearRun();
  return losses;
}
