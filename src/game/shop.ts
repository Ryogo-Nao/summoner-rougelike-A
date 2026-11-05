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
  // 配合の書・転生の書はまれに並ぶ
  { kind: 'fusionBook', weight: 1 },
  { kind: 'rebirthBook', weight: 1 },
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

/**
 * 1つ買って、where（バッグか倉庫）へ送る。入れ替わる品は、買うと棚からなくなる。
 * ルーンが足りない・送り先がいっぱい・棚にないときは買わずに false
 */
export function buy(p: Profile, kind: ItemKind, where: 'bag' | 'warehouse'): boolean {
  const to = where === 'bag' ? p.bag : p.warehouse;
  if (p.runes < buyPrice(kind) || to.length >= (where === 'bag' ? BAG_LIMIT : WAREHOUSE_LIMIT)) return false;
  if (!ALWAYS_SOLD.includes(kind)) {
    const i = p.shopStock.indexOf(kind);
    if (i < 0) return false;
    p.shopStock.splice(i, 1);
  }
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
