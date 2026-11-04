import { ARROW_DROP, ITEMS, createItem, type Item, type ItemKind } from './items';
import type { Rng } from './rng';

/** 落ちているアイテム1行ぶん。floors を省くと全階に出る（同じアイテムを階ごとに分けて書いてもよい） */
export interface ItemEntry {
  kind: ItemKind;
  weight: number;
  floors?: [number, number];
}

/**
 * 出てくる魔物1行ぶん。level を省くとダンジョンの monsterLevel。
 * 深い階ほどレベルを上げて、弱い魔物も手ごわい敵として出せる（同じ魔物を階ごとに分けて書いてよい）
 */
export interface MonsterEntry {
  species: string;
  floors: [number, number];
  level?: number;
}

/**
 * ダンジョン（requirements.md 7章）。階数、階段での仲間の回復、
 * 落ちているアイテムの出やすさ、出てくる魔物をダンジョンごとに持つ
 */
export interface Dungeon {
  id: string;
  name: string;
  /** ダンジョンを選ぶ画面に出す説明 */
  desc: string;
  /** 挑むのに踏破が必要なダンジョンの id。省くと最初から挑める */
  requires?: string;
  floors: number;
  /** 階段を降りたときに仲間が回復する割合。0 なら回復しない */
  allyStairsHeal: number;
  /** 1階に落ちているアイテムの数 */
  itemsPerFloor: [number, number];
  /** 出てくる魔物の基本のレベル。難しいダンジョンほど上げる（2つ目以降は2ずつなど） */
  monsterLevel: number;
  items: ItemEntry[];
  monsters: MonsterEntry[];
}

/** 最初のダンジョン（balance.md 6.2、4章） */
const FIRST: Dungeon = {
  id: 'first',
  name: 'はじまりの洞窟',
  desc: '全10階　魔物はLv1\n仲間と出会う、最初のダンジョン',
  floors: 10,
  allyStairsHeal: 0.25,
  itemsPerFloor: [4, 6],
  monsterLevel: 1,
  items: [
    { kind: 'herb', weight: 20 },
    { kind: 'bigHerb', weight: 6, floors: [4, 10] },
    { kind: 'water', weight: 12 },
    { kind: 'antidote', weight: 6 },
    { kind: 'kitsuke', weight: 6 },
    { kind: 'bread', weight: 4 },
    { kind: 'bigBread', weight: 1.5 },
    { kind: 'blank', weight: 4 },
    { kind: 'arrow', weight: 6 },
    { kind: 'ironArrow', weight: 2 },
    { kind: 'sealReveal', weight: 2 },
    { kind: 'sealRevive', weight: 1.5 },
    { kind: 'sealSummon', weight: 1.5 },
    { kind: 'sealPoison', weight: 1.5 },
    { kind: 'sealConfuse', weight: 1.5 },
    { kind: 'sealEscape', weight: 1 },
    { kind: 'sealPin', weight: 1 },
    { kind: 'sealSleep', weight: 1 },
    { kind: 'sealDoom', weight: 0.5 },
    { kind: 'pot', weight: 1 },
    // 袋はめったに出ない
    { kind: 'pouch', weight: 0.5 },
    { kind: 'finePouch', weight: 0.2 },
    { kind: 'holyPouch', weight: 0.15 },
    { kind: 'club', weight: 4 },
    { kind: 'bronzeSword', weight: 3 },
    { kind: 'ironSword', weight: 1.5 },
    { kind: 'woodShield', weight: 4 },
    { kind: 'leatherShield', weight: 3 },
    { kind: 'ironShield', weight: 1.5 },
    // 魔導書はめったに出ない
    { kind: 'tomePower', weight: 1.25 },
    { kind: 'tomeGuard', weight: 1.25 },
  ],
  monsters: [
    { species: 'chuppi', floors: [1, 3] },
    { species: 'berogg', floors: [1, 4] },
    { species: 'patari', floors: [2, 5] },
    { species: 'pokotake', floors: [3, 7] },
    { species: 'shururu', floors: [3, 6] },
    { species: 'garuf', floors: [4, 8] },
    { species: 'kaburamu', floors: [5, 9] },
    { species: 'moyari', floors: [6, 10] },
    { species: 'hidamari', floors: [7, 10] },
    { species: 'goromu', floors: [8, 10] },
  ],
};

/**
 * 2つ目のダンジョン（案）。15階で、魔物のレベルは浅い階のLv3から、深い階のLv9まで上がる。
 * 階段での仲間の回復は少なめ。上薬草と強い装備が出やすい
 */
const FOREST: Dungeon = {
  id: 'forest',
  name: 'ささやきの森',
  desc: '全15階　魔物はLv3〜9\n階段での仲間の回復が少ない',
  requires: 'first',
  floors: 15,
  allyStairsHeal: 0.15,
  itemsPerFloor: [4, 6],
  monsterLevel: 3,
  items: [
    { kind: 'herb', weight: 18 },
    { kind: 'bigHerb', weight: 8, floors: [3, 15] },
    { kind: 'water', weight: 12 },
    { kind: 'antidote', weight: 7 },
    { kind: 'kitsuke', weight: 7 },
    { kind: 'bread', weight: 4 },
    { kind: 'bigBread', weight: 2 },
    { kind: 'blank', weight: 4 },
    { kind: 'arrow', weight: 5 },
    { kind: 'ironArrow', weight: 3 },
    { kind: 'sealReveal', weight: 2 },
    { kind: 'sealRevive', weight: 1.5 },
    { kind: 'sealSummon', weight: 1.5 },
    { kind: 'sealPoison', weight: 1.5 },
    { kind: 'sealConfuse', weight: 1.5 },
    { kind: 'sealEscape', weight: 1.5 },
    { kind: 'sealPin', weight: 1.5 },
    { kind: 'sealSleep', weight: 1.5 },
    { kind: 'sealDoom', weight: 0.5 },
    { kind: 'pot', weight: 1.5 },
    { kind: 'pouch', weight: 0.6 },
    { kind: 'finePouch', weight: 0.3 },
    { kind: 'holyPouch', weight: 0.2 },
    { kind: 'club', weight: 2 },
    { kind: 'bronzeSword', weight: 3 },
    { kind: 'ironSword', weight: 2.5 },
    { kind: 'woodShield', weight: 2 },
    { kind: 'leatherShield', weight: 3 },
    { kind: 'ironShield', weight: 2.5 },
    { kind: 'tomePower', weight: 1.25 },
    { kind: 'tomeGuard', weight: 1.25 },
  ],
  monsters: [
    // 浅い階：はじまりの洞窟の魔物を、少し強くして出す
    { species: 'chuppi', floors: [1, 3], level: 3 },
    { species: 'berogg', floors: [1, 4], level: 3 },
    { species: 'patari', floors: [2, 5], level: 3 },
    { species: 'pokotake', floors: [3, 7], level: 4 },
    { species: 'shururu', floors: [3, 7], level: 4 },
    { species: 'garuf', floors: [4, 8], level: 4 },
    // 中ほど
    { species: 'kaburamu', floors: [6, 10], level: 5 },
    { species: 'moyari', floors: [6, 10], level: 5 },
    { species: 'berogg', floors: [7, 10], level: 6 },
    { species: 'hidamari', floors: [8, 12], level: 6 },
    { species: 'goromu', floors: [9, 12], level: 6 },
    { species: 'garuf', floors: [9, 12], level: 7 },
    // 深い階：弱い魔物もレベルを上げて、手ごわい敵にする
    { species: 'chuppi', floors: [11, 15], level: 8 },
    { species: 'patari', floors: [11, 15], level: 8 },
    { species: 'shururu', floors: [11, 15], level: 8 },
    { species: 'moyari', floors: [12, 15], level: 8 },
    { species: 'hidamari', floors: [13, 15], level: 9 },
    { species: 'goromu', floors: [13, 15], level: 9 },
  ],
};

export const DUNGEONS: Dungeon[] = [FIRST, FOREST];

/** 挑めるか。前のダンジョンを踏破していなければ挑めない */
export function isUnlocked(dungeon: Dungeon, cleared: string[]): boolean {
  return !dungeon.requires || cleared.includes(dungeon.requires);
}

export function dungeonById(id: string): Dungeon {
  return DUNGEONS.find((d) => d.id === id) ?? FIRST;
}

const onFloor = (floors: [number, number] | undefined, floor: number) =>
  !floors || (floor >= floors[0] && floor <= floors[1]);

/** その階に落ちているアイテムを1つ作る。矢は何本かまとめて落ちている */
export function randomItem(dungeon: Dungeon, floor: number, rng: Rng): Item {
  const entries = dungeon.items.filter((e) => onFloor(e.floors, floor));
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let r = rng.next() * total;
  let kind = entries[0].kind;
  for (const e of entries) {
    r -= e.weight;
    if (r < 0) {
      kind = e.kind;
      break;
    }
  }
  const def = ITEMS[kind];
  if (def.arrow) return createItem(kind, rng.int(...ARROW_DROP));
  if (def.pouch) return createItem(kind, rng.int(...def.pouch.capacity));
  return createItem(kind);
}

/** その階に出る魔物と、そのレベル */
export function monstersForFloor(dungeon: Dungeon, floor: number): { species: string; level: number }[] {
  return dungeon.monsters
    .filter((e) => onFloor(e.floors, floor))
    .map((e) => ({ species: e.species, level: e.level ?? dungeon.monsterLevel }));
}
