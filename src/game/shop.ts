import { DUNGEONS, isUnlocked } from './dungeons';
import { BAG_LIMIT, ITEMS, STAR_ITEMS, buyPrice, createItem, sellPrice, type Item, type ItemKind } from './items';
import type { Profile } from './profile';
import { WAREHOUSE_LIMIT } from './profile';

/**
 * 商店（requirements.md 10.5、balance.md 9章）。今は拠点にだけある。
 * あとでダンジョンの中の店にも使えるよう、品ぞろえと売り買いはここにまとめる
 */

/**
 * いつも並ぶ品（常設4つ）。2026-11-08 から、いくつでも買えるのをやめて薬草とパンを2つずつ。
 * どの品も、棚の1つにつき1つ買える。買うと棚からなくなり、ダンジョンから戻ると並べ直す
 */
export const STAPLES: ItemKind[] = ['herb', 'herb', 'bread', 'bread'];

/** 戻るたびに入れ替わる品（日替わり）の数。常設4つと合わせて12（2026-11-11） */
export const STOCK_SIZE = 8;

/**
 * 入れ替わる品の出やすさ。強い印は出にくい。
 * dungeon があるものは、そのダンジョンに挑めるようになってから並ぶ
 */
const STOCK_POOL: { kind: ItemKind; weight: number; dungeon?: string }[] = [
  { kind: 'club', weight: 10 },
  { kind: 'bronzeSword', weight: 8 },
  { kind: 'ironSword', weight: 4 },
  { kind: 'woodShield', weight: 10 },
  { kind: 'leatherShield', weight: 8 },
  { kind: 'ironShield', weight: 4 },
  // 属性の装備は、そのダンジョンの魔物の弱点を突くものを売る（balance.md 6.7）。
  // ささやきの森の風の魔物には炎、しずくの氷穴の水の魔物には雷。
  // 光と闇の装備は、これから足すダンジョンに挑めるようになったら並べる
  { kind: 'fireSword', weight: 3, dungeon: 'forest' },
  { kind: 'fireShield', weight: 3, dungeon: 'forest' },
  { kind: 'fireStaff', weight: 2, dungeon: 'forest' },
  { kind: 'thunderSword', weight: 3, dungeon: 'ice' },
  { kind: 'thunderShield', weight: 3, dungeon: 'ice' },
  { kind: 'thunderStaff', weight: 2, dungeon: 'ice' },
  // 光の装備はいかずちの坑道に、闇の装備はとこやみの大穴に挑めるようになってから
  { kind: 'lightSword', weight: 2, dungeon: 'mine' },
  { kind: 'lightShield', weight: 2, dungeon: 'mine' },
  { kind: 'darkSword', weight: 2, dungeon: 'abyss' },
  { kind: 'darkShield', weight: 2, dungeon: 'abyss' },
  { kind: 'tomeFire', weight: 1 },
  { kind: 'tomeIce', weight: 1 },
  { kind: 'tomeWind', weight: 1 },
  { kind: 'tomeThunder', weight: 1 },
  { kind: 'tomeEarth', weight: 1 },
  { kind: 'tomePower', weight: 1 },
  { kind: 'tomeGuard', weight: 1 },
  { kind: 'tomeMagic', weight: 1 },
  { kind: 'tomeWard', weight: 1 },
  { kind: 'sealReveal', weight: 8 },
  { kind: 'sealEscape', weight: 8 },
  { kind: 'sealPoison', weight: 6 },
  { kind: 'sealConfuse', weight: 6 },
  { kind: 'sealPin', weight: 6 },
  { kind: 'sealSleep', weight: 6 },
  { kind: 'sealSummon', weight: 4 },
  { kind: 'sealRevive', weight: 2 },
  { kind: 'sealDoom', weight: 1 },
  // 星は、印と同じくらい並ぶ
  ...STAR_ITEMS.map((kind) => ({ kind, weight: 5 })),
  // 配合の書・転生の書はまれに並ぶ
  { kind: 'fusionBook', weight: 1 },
  { kind: 'rebirthBook', weight: 1 },
];

/**
 * 棚を並べ直す。常設の薬草とパンを2つずつと、日替わりの品を8つ（同じ品が重なることもある）。
 * cleared は踏破したダンジョン（挑めるダンジョンの品だけ並べる）
 */
export function rollStock(cleared: string[], random: () => number = Math.random): ItemKind[] {
  const open = (id: string) => DUNGEONS.some((d) => d.id === id && isUnlocked(d, cleared));
  const pool = STOCK_POOL.filter((e) => !e.dungeon || open(e.dungeon));
  const total = pool.reduce((n, e) => n + e.weight, 0);
  const stock: ItemKind[] = [];
  for (let n = 0; n < STOCK_SIZE; n++) {
    let r = random() * total;
    const i = pool.findIndex((e) => (r -= e.weight) < 0);
    stock.push(pool[i < 0 ? pool.length - 1 : i].kind);
  }
  return [...STAPLES, ...stock];
}

/**
 * 1つ買って、where（バッグか倉庫）へ送る。買うと棚からなくなる。
 * ルーンが足りない・送り先がいっぱい・棚にないときは買わずに false
 */
export function buy(p: Profile, kind: ItemKind, where: 'bag' | 'warehouse'): boolean {
  const to = where === 'bag' ? p.bag : p.warehouse;
  if (p.runes < buyPrice(kind) || to.length >= (where === 'bag' ? BAG_LIMIT : WAREHOUSE_LIMIT)) return false;
  const i = p.shopStock.indexOf(kind);
  if (i < 0) return false;
  p.shopStock.splice(i, 1);
  p.runes -= buyPrice(kind);
  to.push(createItem(kind));
  return true;
}

/** 売れるか。値打ちのないもの、中身の入った袋（先に出す）は売れない */
export function canSell(item: Item): boolean {
  if (sellPrice(item) <= 0) return false;
  return !(ITEMS[item.kind].pouch && (item.contents?.length ?? 0) > 0);
}

/** まとめて売る。バッグと倉庫から取り除き、売り値の合計をルーンに足す。合計を返す */
export function sell(p: Profile, items: Item[]): number {
  const selling = items.filter(canSell);
  const total = selling.reduce((n, i) => n + sellPrice(i), 0);
  p.bag = p.bag.filter((i) => !selling.includes(i));
  p.warehouse = p.warehouse.filter((i) => !selling.includes(i));
  p.runes += total;
  return total;
}
