import { HAND_LIMIT, IZUTSUCHI, createCard, isPartner, reserveCardIds, type Card } from './cards';
import { BAG_LIMIT, START_ITEMS, createItem, reserveItemIds, type Item } from './items';
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
export const WAREHOUSE_LIMIT = 100;

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
}

interface ProfileData {
  version: 1;
  cards: CardData[];
  hand: number[];
  bag: Item[];
  warehouse: Item[];
  learned: SpellId[];
  ranks?: SpellRanks;
}

const PROFILE_KEY = 'summoner-profile';
const RUN_KEY = 'summoner-run';

/** 初めて遊ぶとき。イヅツチのカードと、最初の持ち物だけを持っている（balance.md 8章） */
export function newProfile(): Profile {
  const partner = createCard(IZUTSUCHI, false);
  return { cards: [partner], hand: [partner.id], bag: START_ITEMS.map(createItem), warehouse: [], learned: [], ranks: {} };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return newProfile();
    const data = JSON.parse(raw) as ProfileData;
    const profile: Profile = { ...data, cards: data.cards.map(cardFromData), ranks: data.ranks ?? {} };
    reserveCardIds(Math.max(0, ...profile.cards.map((c) => c.id)));
    reserveItemIds(Math.max(0, ...profile.bag.map((i) => i.id), ...profile.warehouse.map((i) => i.id)));
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
  const cards = profile.hand.flatMap((id) => profile.cards.filter((c) => c.id === id)).slice(0, HAND_LIMIT);
  return { cards: cards.map((c) => ({ ...c })), bag: profile.bag.map((i) => ({ ...i })), learned: [...profile.learned], ranks: { ...profile.ranks } };
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

/** ダンジョンから戻ったときに失ったもの */
export interface Losses {
  cards: Card[];
  items: Item[];
}

/**
 * ダンジョンから拠点に戻る。力つきたときは、そのダンジョンで手に入れたカードと、
 * バッグの中身の半分（ランダム）を失う（requirements.md 5.7）。
 * 残ったカードは瀕死から戻し、HPを満タンにする。持っていたカードは次も持っていく
 */
export function returnToBase(profile: Profile, state: GameState): Losses {
  const brought = new Set(profile.hand);
  const leftAtBase = profile.cards.filter((c) => !brought.has(c.id));
  const runCards = [...state.cards, ...state.storage, ...(state.pendingCard ? [state.pendingCard] : [])];
  const losses: Losses = { cards: [], items: [] };
  let bag = [...state.bag];
  if (state.dead) {
    losses.cards = runCards.filter((c) => c.obtainedHere && !isPartner(c));
    const shuffled = [...bag].sort(() => Math.random() - 0.5);
    losses.items = shuffled.slice(0, Math.floor(bag.length / 2));
    bag = bag.filter((i) => !losses.items.includes(i));
  }
  const kept = runCards
    .filter((c) => !losses.cards.includes(c))
    .map((c) => ({ ...c, status: 'ready' as const, hp: c.maxHp, obtainedHere: false }));
  const hand = state.cards.filter((c) => !losses.cards.includes(c)).map((c) => c.id);
  profile.cards = [...leftAtBase, ...kept];
  profile.hand = hand.slice(0, HAND_LIMIT);
  profile.bag = bag.slice(0, BAG_LIMIT);
  profile.learned = [...state.learned];
  profile.ranks = { ...state.ranks };
  saveProfile(profile);
  clearRun();
  return losses;
}
