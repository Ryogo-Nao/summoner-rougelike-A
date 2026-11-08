import { HAND_LIMIT, IZUTSUCHI, createCard, isPartner, reserveCardIds, type Card } from './cards';
import { BAG_LIMIT, ITEMS, START_ITEMS, allItems, createItem, noShortcuts, reserveItemIds, type Item, type ItemKind, type Shortcuts } from './items';
import { STAPLES, rollStock } from './shop';
import {
  cardFromData,
  cardToData,
  type CardData,
  type GameState,
  type Loadout,
  type SpellId,
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
  /** 覚えた魔法。一度覚えればずっと使える（＋値はダンジョンの間だけなので、ここには残らない） */
  learned: SpellId[];
  /** 踏破したダンジョンの id。次のダンジョンに挑めるかなどに使う */
  cleared: string[];
  /** ［攻撃］の長押しで使う、登録した道具の種類 */
  shortcuts: Shortcuts;
  /** 持っているルーン（お金） */
  runes: number;
  /** 商店の棚（薬草とパンの2つずつと、入れ替わる品）。ダンジョンから戻るたびに選び直す */
  shopStock: ItemKind[];
  /** 棚に薬草とパンが入るようになってからの保存データか（前のデータは、読むときに一度だけ足す） */
  staples?: boolean;
  /** 戦績と累積（拠点の［記録］に出す） */
  records: Records;
  /** 何代目の召喚士か（requirements.md 9.1 世代継承）。今は継承の仕組みがないので、いつも1（初代） */
  generation: number;
  /** 拠点の知らせ */
  notices: Notices;
  /** 配合の「別の種族」で生んだことのある種族の id。まだ生んでいない種族は、配合の画面で「？？？」と出す */
  bred: string[];
}

/**
 * 拠点の下のタブとメニューに出す知らせ（requirements.md 10.4）。
 * allies：新しい仲間が加わった。shop：商店の品が入れ替わった。どちらも、その画面を開くと消える。
 * fusionSeen：配合できる組み合わせがそろったのを、配合の画面で見たか（そろわなくなったら戻す）
 */
export interface Notices {
  allies: boolean;
  shop: boolean;
  fusionSeen: boolean;
}

const noNotices = (): Notices => ({ allies: false, shop: false, fusionSeen: false });

/** 「初代」「2代目」… */
export const generationName = (g: number) => (g <= 1 ? '初代' : `${g}代目`);

/** ダンジョンごとの戦績 */
export interface DungeonRecord {
  tries: number;
  cleared: number;
  escaped: number;
  failed: number;
  gaveUp: number;
  /** いちばん深く行った階 */
  bestFloor: number;
}

/** これまでの累積。あきらめたダンジョンの分も、記録としては数える */
export interface Records {
  dungeons: Record<string, DungeonRecord>;
  kills: number;
  /** 仲間にした魔物の数（別れた仲間も含む） */
  cards: number;
  items: number;
  /** ダンジョンで拾ったルーン（失った分も含む） */
  runes: number;
}

export const newRecords = (): Records => ({ dungeons: {}, kills: 0, cards: 0, items: 0, runes: 0 });

/** 終わったダンジョンを記録に足す */
function recordRun(profile: Profile, state: GameState): void {
  const r = profile.records;
  const d = (r.dungeons[state.dungeon.id] ??= { tries: 0, cleared: 0, escaped: 0, failed: 0, gaveUp: 0, bestFloor: 0 });
  d.tries++;
  if (state.cleared) d.cleared++;
  else if (state.escaped) d.escaped++;
  else if (state.gaveUp) d.gaveUp++;
  else d.failed++;
  // 踏破したときは、いちばん下の階まで行ったと数える
  d.bestFloor = Math.max(d.bestFloor, state.cleared ? state.dungeon.floors : state.floor);
  r.kills += state.stats.kills;
  r.cards += state.stats.cards;
  r.items += state.stats.items;
  r.runes += state.runes;
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
  /** ＋値を拠点に持ち帰っていたころの保存データにある。今は読まない */
  ranks?: unknown;
  cleared?: string[];
  shortcuts?: Shortcuts;
  runes?: number;
  shopStock?: ItemKind[];
  staples?: boolean;
  records?: Records;
  generation?: number;
  notices?: Notices;
  bred?: string[];
}

const PROFILE_KEY = 'summoner-profile';
const RUN_KEY = 'summoner-run';

/** 初めて遊ぶとき。イヅツチのカードと、最初の持ち物だけを持っている（balance.md 8章） */
export function newProfile(): Profile {
  const partner = createCard(IZUTSUCHI, false);
  return {
    cards: [partner],
    hand: [partner.id],
    bag: START_ITEMS.map(createItem),
    warehouse: [],
    learned: [],
    cleared: [],
    shortcuts: noShortcuts(),
    runes: 0,
    shopStock: rollStock([]),
    staples: true,
    records: newRecords(),
    generation: 1,
    notices: noNotices(),
    bred: [],
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return newProfile();
    const { ranks: _ranks, ...data } = JSON.parse(raw) as ProfileData;
    const profile: Profile = {
      ...data,
      cards: data.cards.map(cardFromData),
      cleared: data.cleared ?? [],
      shortcuts: data.shortcuts ?? noShortcuts(),
      runes: data.runes ?? 0,
      // 前の保存データの棚には薬草とパンがない（いくつでも買えた）ので、一度だけ足す
      shopStock: data.shopStock ? (data.staples ? data.shopStock : [...STAPLES, ...data.shopStock]) : rollStock(data.cleared ?? []),
      staples: true,
      records: { ...newRecords(), ...data.records },
      generation: data.generation ?? 1,
      notices: { ...noNotices(), ...data.notices },
      bred: data.bred ?? [],
    };
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
  // 連れていく仲間に選んだ順に持っていく（最初の3体は、召喚した状態で入る）
  const cards = profile.hand
    .map((id) => profile.cards.find((c) => c.id === id))
    .filter((c): c is Card => c !== undefined)
    .slice(0, HAND_LIMIT);
  return { cards: cards.map((c) => ({ ...c })), bag: profile.bag.map((i) => ({ ...i })), learned: [...profile.learned], shortcuts: [...profile.shortcuts] };
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

/**
 * ダンジョンから戻ったときに失ったもの。downgraded は、ふつうの袋に戻った聖なる袋の数。
 * runesKept は持ち帰ったルーン、runesLost は力つきて失ったルーン
 */
export interface Losses {
  cards: Card[];
  items: Item[];
  downgraded: number;
  runesKept: number;
  runesLost: number;
}

/**
 * ダンジョンをあきらめて拠点に戻る（requirements.md 5.8）。ダンジョンに入る前に戻す。
 * 拠点の中身はダンジョンの間は変わらないので、そのまま使う（ダンジョンで手に入れたもの・上がったレベルは残らない）。
 * そのうえで、持っているルーンと、持っていったバッグの道具の半分を失う
 */
/**
 * あきらめたら失うものの数。道具は持っていった道具の半分（聖なる袋は数えない）、
 * ルーンはこのダンジョンで拾ったルーン（拠点のルーンは減らない）
 */
export function giveUpLoss(profile: Profile, state: GameState): { items: number; runes: number; cards: number } {
  const pool = profile.bag.filter((i) => ITEMS[i.kind].pouch?.holy !== true);
  const cards = [...state.cards, ...state.storage, ...(state.pendingCard ? [state.pendingCard] : [])].filter((c) => c.obtainedHere);
  return { items: Math.floor(pool.length / 2), runes: state.runes, cards: cards.length };
}

function giveUpToBase(profile: Profile, state: GameState): Losses {
  const found = [...state.cards, ...state.storage, ...(state.pendingCard ? [state.pendingCard] : [])].filter(
    (c) => c.obtainedHere,
  );
  // ルーンは、このダンジョンで拾った分だけを失う（拠点に持ち帰らない）。拠点のルーンはそのまま
  const runesLost = state.runes;
  const { bag, lost, downgraded } = halveBag(profile.bag);
  profile.bag = bag;
  profile.shopStock = rollStock(profile.cleared);
  profile.notices.shop = true;
  saveProfile(profile);
  clearRun();
  return { cards: found, items: lost, downgraded, runesKept: 0, runesLost };
}

/**
 * バッグの道具の半分（ランダム）を失う。聖なる袋（と中の道具）は失わない。ほかの袋は、失えば中身ごとなくなる。
 * 残った聖なる袋は、30％でふつうの袋に戻る（中の道具はそのまま）
 */
function halveBag(items: Item[]): { bag: Item[]; lost: Item[]; downgraded: number } {
  const holy = (i: Item) => ITEMS[i.kind].pouch?.holy === true;
  const pool = items.filter((i) => !holy(i));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const lost = shuffled.slice(0, Math.floor(pool.length / 2));
  const bag = items.filter((i) => !lost.includes(i));
  let downgraded = 0;
  for (const i of bag) {
    if (holy(i) && Math.random() < HOLY_DOWNGRADE) {
      i.kind = 'pouch';
      downgraded++;
    }
  }
  return { bag, lost, downgraded };
}

/** 力つきたときに、聖なる袋がふつうの袋に戻る確率 */
const HOLY_DOWNGRADE = 0.3;

/**
 * ダンジョンから拠点に戻る。力つきたときは、そのダンジョンで手に入れたカードと、
 * バッグの中身の半分（ランダム）を失う（requirements.md 5.7）。
 * 残ったカードは瀕死から戻し、HPを満タンにする。持っていたカードは次も持っていく
 */
export function returnToBase(profile: Profile, state: GameState): Losses {
  recordRun(profile, state);
  if (state.gaveUp) return giveUpToBase(profile, state);
  const brought = new Set(profile.hand);
  const runCards = [...state.cards, ...state.storage, ...(state.pendingCard ? [state.pendingCard] : [])];
  // 力つきたら、拾ったルーンの半分を失う
  const runesLost = state.dead ? Math.ceil(state.runes / 2) : 0;
  const losses: Losses = { cards: [], items: [], downgraded: 0, runesKept: state.runes - runesLost, runesLost };
  let bag = [...state.bag];
  if (state.dead) {
    losses.cards = runCards.filter((c) => c.obtainedHere && !isPartner(c));
    const halved = halveBag(bag);
    bag = halved.bag;
    losses.items = halved.lost;
    losses.downgraded = halved.downgraded;
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
  // 覚えた魔法は残る。＋値はダンジョンの間だけ
  profile.learned = [...state.learned];
  profile.shortcuts = [...state.shortcuts];
  profile.runes += losses.runesKept;
  if (state.cleared && !profile.cleared.includes(state.dungeon.id)) profile.cleared.push(state.dungeon.id);
  // 戻るたびに、商店の品を入れ替える（踏破して挑めるようになったダンジョンの品も並ぶ）
  profile.shopStock = rollStock(profile.cleared);
  profile.notices.shop = true;
  if (kept.some((c) => !brought.has(c.id))) profile.notices.allies = true;
  saveProfile(profile);
  clearRun();
  return losses;
}
