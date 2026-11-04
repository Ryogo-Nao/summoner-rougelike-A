import { ARROW_DROP, ITEMS, createItem, type Item, type ItemKind } from './items';
import type { Rng } from './rng';

/** 落ちているアイテム1行ぶん。floors を省くと全階に出る（同じアイテムを階ごとに分けて書いてもよい） */
export interface ItemEntry {
  kind: ItemKind;
  weight: number;
  floors?: [number, number];
}

/** 出てくる魔物1行ぶん */
export interface MonsterEntry {
  species: string;
  floors: [number, number];
}

/**
 * ダンジョン（requirements.md 7章）。階数、階段での仲間の回復、
 * 落ちているアイテムの出やすさ、出てくる魔物をダンジョンごとに持つ
 */
export interface Dungeon {
  id: string;
  name: string;
  floors: number;
  /** 階段を降りたときに仲間が回復する割合。0 なら回復しない */
  allyStairsHeal: number;
  /** 1階に落ちているアイテムの数 */
  itemsPerFloor: [number, number];
  items: ItemEntry[];
  monsters: MonsterEntry[];
}

/** 最初のダンジョン（balance.md 6.2、4章） */
const FIRST: Dungeon = {
  id: 'first',
  name: 'はじまりの洞窟',
  floors: 10,
  allyStairsHeal: 0.25,
  itemsPerFloor: [4, 8],
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

export const DUNGEONS: Dungeon[] = [FIRST];

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
  return createItem(kind, ITEMS[kind].arrow ? rng.int(...ARROW_DROP) : undefined);
}

/** その階に出る魔物の種類の id */
export function monstersForFloor(dungeon: Dungeon, floor: number): string[] {
  return dungeon.monsters.filter((e) => onFloor(e.floors, floor)).map((e) => e.species);
}
