import { BAG_LIMIT, ITEMS, buyPrice, createItem, sellPrice, type Item, type ItemKind } from './items';
import type { Profile } from './profile';
import { WAREHOUSE_LIMIT } from './profile';

/**
 * 商店（requirements.md 10.5、balance.md 9章）。今は拠点にだけある。
 * あとでダンジョンの中の店にも使えるよう、品ぞろえと売り買いはここにまとめる
 */

/** いつでも、いくつでも買えるもの */
export const ALWAYS_SOLD: ItemKind[] = ['herb', 'bread'];

/** 戻るたびに入れ替わる品の数 */
const STOCK_SIZE: [number, number] = [3, 5];

/** 入れ替わる品の出やすさ。強い印は出にくい */
const STOCK_POOL: { kind: ItemKind; weight: number }[] = [
  { kind: 'club', weight: 10 },
  { kind: 'bronzeSword', weight: 8 },
  { kind: 'ironSword', weight: 4 },
  { kind: 'woodShield', weight: 10 },
  { kind: 'leatherShield', weight: 8 },
  { kind: 'ironShield', weight: 4 },
  { kind: 'tomePower', weight: 2 },
  { kind: 'tomeGuard', weight: 2 },
  { kind: 'sealReveal', weight: 8 },
  { kind: 'sealEscape', weight: 8 },
  { kind: 'sealPoison', weight: 6 },
  { kind: 'sealConfuse', weight: 6 },
  { kind: 'sealPin', weight: 6 },
  { kind: 'sealSleep', weight: 6 },
  { kind: 'sealSummon', weight: 4 },
  { kind: 'sealRevive', weight: 2 },
  { kind: 'sealDoom', weight: 1 },
];

/** 入れ替わる品を選び直す。同じ品は並べない */
export function rollStock(random: () => number = Math.random): ItemKind[] {
  const size = STOCK_SIZE[0] + Math.floor(random() * (STOCK_SIZE[1] - STOCK_SIZE[0] + 1));
  const pool = [...STOCK_POOL];
  const stock: ItemKind[] = [];
  while (stock.length < size && pool.length > 0) {
    const total = pool.reduce((n, e) => n + e.weight, 0);
    let r = random() * total;
    const i = pool.findIndex((e) => (r -= e.weight) < 0);
    const [picked] = pool.splice(i < 0 ? pool.length - 1 : i, 1);
    stock.push(picked.kind);
  }
  return stock;
}

/** 買った物を入れるところ。バッグがいっぱいなら倉庫。どちらもいっぱいなら null */
export function buyDestination(p: Profile): 'bag' | 'warehouse' | null {
  if (p.bag.length < BAG_LIMIT) return 'bag';
  if (p.warehouse.length < WAREHOUSE_LIMIT) return 'warehouse';
  return null;
}

/** 買えない理由。買えるなら null */
export function buyProblem(p: Profile, kind: ItemKind): string | null {
  if (p.runes < buyPrice(kind)) return 'ルーンが足りない';
  if (!buyDestination(p)) return 'バッグも倉庫もいっぱい';
  return null;
}

/** 1つ買う。入れ替わる品は、買うと棚からなくなる。入れたところを返す */
export function buy(p: Profile, kind: ItemKind): 'bag' | 'warehouse' | null {
  const where = buyDestination(p);
  if (!where || buyProblem(p, kind)) return null;
  if (!ALWAYS_SOLD.includes(kind)) {
    const i = p.shopStock.indexOf(kind);
    if (i < 0) return null;
    p.shopStock.splice(i, 1);
  }
  p.runes -= buyPrice(kind);
  (where === 'bag' ? p.bag : p.warehouse).push(createItem(kind));
  return where;
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
