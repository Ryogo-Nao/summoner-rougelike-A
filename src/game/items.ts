import type { Pos } from './dir';
import type { Rng } from './rng';

/** バッグに入るアイテムの数（requirements.md 11章） */
export const BAG_LIMIT = 20;
/** 1階に落ちているアイテムの数（balance.md 6.1） */
export const ITEMS_PER_FLOOR: [number, number] = [4, 5];
/** 薬草で回復するHP、魔力の水で回復するMP（balance.md 6章） */
export const HERB_HEAL = 30;
export const WATER_MP = 15;
/** 薬草と白紙カード以外を魔物に投げたときのダメージ */
export const THROW_DAMAGE = 1;

export type ItemKind =
  | 'bread'
  | 'bigBread'
  | 'herb'
  | 'water'
  | 'blank'
  | 'tomePower'
  | 'tomeGuard'
  | 'club'
  | 'bronzeSword'
  | 'ironSword'
  | 'woodShield'
  | 'leatherShield'
  | 'ironShield';

export interface ItemDef {
  name: string;
  emoji: string;
  /** バッグの一覧に出す説明 */
  desc: string;
  /** 食べると増える満腹度 */
  food?: number;
  /** 装備するところと、上がる攻撃力・防御力 */
  slot?: 'weapon' | 'shield';
  bonus?: number;
  /** 使うと覚える魔法 */
  spell?: 'power' | 'guard';
}

export const ITEMS: Record<ItemKind, ItemDef> = {
  bread: { name: 'パン', emoji: '🍞', desc: '満腹度+50', food: 50 },
  bigBread: { name: '大きなパン', emoji: '🥖', desc: '満腹度+100', food: 100 },
  herb: { name: '薬草', emoji: '🌿', desc: `HP+${HERB_HEAL}\n仲間に投げるとその仲間を回復` },
  water: { name: '魔力の水', emoji: '💧', desc: `MP+${WATER_MP}` },
  blank: { name: '白紙カード', emoji: '🃏', desc: '投げて魔物を封印する\n弱っている魔物ほど封印しやすい' },
  tomePower: { name: '力の魔導書', emoji: '📕', desc: '力の魔法を覚える', spell: 'power' },
  tomeGuard: { name: '守りの魔導書', emoji: '📘', desc: '守りの魔法を覚える', spell: 'guard' },
  club: { name: 'こん棒', emoji: '🏏', desc: '攻撃力+2', slot: 'weapon', bonus: 2 },
  bronzeSword: { name: '銅の剣', emoji: '🗡️', desc: '攻撃力+4', slot: 'weapon', bonus: 4 },
  ironSword: { name: '鉄の剣', emoji: '⚔️', desc: '攻撃力+7', slot: 'weapon', bonus: 7 },
  woodShield: { name: '木の盾', emoji: '🪵', desc: '防御力+2', slot: 'shield', bonus: 2 },
  leatherShield: { name: '革の盾', emoji: '🛡️', desc: '防御力+4', slot: 'shield', bonus: 4 },
  ironShield: { name: '鉄の盾', emoji: '🔰', desc: '防御力+7', slot: 'shield', bonus: 7 },
};

export interface Item {
  id: number;
  kind: ItemKind;
}

/** 床に落ちているアイテム */
export interface FloorItem {
  item: Item;
  pos: Pos;
}

let nextItemId = 1;

export function createItem(kind: ItemKind): Item {
  return { id: nextItemId++, kind };
}

/**
 * 落ちているアイテムの割合（balance.md 6.2）。
 * 食料・武器・盾・魔導書の中の分け方は、弱いものほど多くする
 */
const DROP_TABLE: [ItemKind, number][] = [
  ['herb', 22],
  ['water', 18],
  ['blank', 18],
  ['bread', 9],
  ['bigBread', 3],
  ['club', 6],
  ['bronzeSword', 4],
  ['ironSword', 2],
  ['woodShield', 6],
  ['leatherShield', 4],
  ['ironShield', 2],
  ['tomePower', 3],
  ['tomeGuard', 3],
];

export function randomItemKind(rng: Rng): ItemKind {
  const total = DROP_TABLE.reduce((sum, [, w]) => sum + w, 0);
  let r = rng.next() * total;
  for (const [kind, w] of DROP_TABLE) {
    r -= w;
    if (r < 0) return kind;
  }
  return DROP_TABLE[0][0];
}
