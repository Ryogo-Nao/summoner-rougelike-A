import type { Pos } from './dir';

/** バッグに入るアイテムの数（requirements.md 11章）。まとまった矢は1つと数える */
export const BAG_LIMIT = 40;
/** 魔導書・食料など以外を魔物に投げたときのダメージ */
export const THROW_DAMAGE = 1;
/** 矢が1つにまとまる本数の上限と、床に落ちているときの本数 */
export const ARROW_STACK = 99;
export const ARROW_DROP: [number, number] = [5, 15];
/** 錬金釜で強くできる上限 */
export const PLUS_LIMIT = 10;
/** ［攻撃］の長押しで使える、登録した道具の枠の数（左上・上・右上） */
export const SHORTCUT_SLOTS = 3;
export const SHORTCUT_LABELS = ['左上', '上', '右上'];
/** 登録した道具の種類。空いている枠は null */
export type Shortcuts = (ItemKind | null)[];
export const noShortcuts = (): Shortcuts => Array<ItemKind | null>(SHORTCUT_SLOTS).fill(null);

export type ItemKind =
  | 'bread'
  | 'bigBread'
  | 'herb'
  | 'bigHerb'
  | 'antidote'
  | 'kitsuke'
  | 'water'
  | 'blank'
  | 'arrow'
  | 'ironArrow'
  | 'sealRevive'
  | 'sealSummon'
  | 'sealEscape'
  | 'sealReveal'
  | 'sealPoison'
  | 'sealConfuse'
  | 'sealPin'
  | 'sealSleep'
  | 'sealDoom'
  | 'starSleep'
  | 'starConfuse'
  | 'starPoison'
  | 'starBurst'
  | 'starRage'
  | 'starFort'
  | 'starHoly'
  | 'starHeal'
  | 'starMana'
  | 'tomePower'
  | 'tomeGuard'
  | 'fusionBook'
  | 'rebirthBook'
  | 'pot'
  | 'pouch'
  | 'finePouch'
  | 'holyPouch'
  | 'club'
  | 'bronzeSword'
  | 'ironSword'
  | 'woodShield'
  | 'leatherShield'
  | 'ironShield'
  | 'rune';

/** 印の効き目（requirements.md 6章）。どれも1回使うとなくなる */
export type SealKind = 'revive' | 'summon' | 'escape' | 'reveal' | 'poison' | 'confuse' | 'pin' | 'sleep' | 'doom';

/**
 * 星の効き目（balance.md 6.6）。食べると自分に効き（満腹度も5増える）、投げて当てると当たった相手に効く。
 * どれも1回でなくなる
 */
export type StarKind = 'sleep' | 'confuse' | 'poison' | 'burst' | 'rage' | 'fort' | 'holy' | 'heal' | 'mana';

/** 星の道具（表の順）。商店とダンジョンに、印と同じくらいの割合で出す */
export const STAR_ITEMS: ItemKind[] = ['starSleep', 'starConfuse', 'starPoison', 'starBurst', 'starRage', 'starFort', 'starHoly', 'starHeal', 'starMana'];

/** 装備するところ。あとで装飾品などを足す */
export type Slot = 'weapon' | 'shield';

export interface ItemDef {
  name: string;
  /** 名前の読み。名前順に並べるときに使う */
  kana: string;
  emoji: string;
  /** バッグの一覧に出す説明 */
  desc: string;
  /** 食べると増える満腹度 */
  food?: number;
  /** 回復するHPの幅 */
  heal?: [number, number];
  /** 治す状態異常 */
  cure?: 'poison' | 'confusion';
  /** 回復するMP */
  mp?: number;
  /** 装備するところと、上がる攻撃力・防御力 */
  slot?: Slot;
  bonus?: number;
  /** 使うと覚える魔法 */
  spell?: 'power' | 'guard';
  /** 拠点の［配合］で使う書（requirements.md 9.2・9.3）。ダンジョンでは使えない */
  book?: 'fusion' | 'rebirth';
  /** 矢。通常攻撃のダメージに対する倍率 */
  arrow?: number;
  seal?: SealKind;
  star?: StarKind;
  /** 印が部屋の敵に効かない確率 */
  miss?: number;
  /** 袋。中に道具をしまえる。入る数は1つずつ違う（この幅の中で決まる） */
  pouch?: { capacity: [number, number]; holy?: boolean };
  /**
   * 値打ち（ルーン）。商店の買い値で、売り値はこの3分の1（balance.md 9章）。
   * 矢は1本あたり。0 なら売り買いしない
   */
  value: number;
  /** ルーン（お金）。拾うとバッグに入れずに、持っているルーンが増える */
  rune?: boolean;
}

/** 並べる順は、種類順に並べたときの順でもある */
export const ITEMS: Record<ItemKind, ItemDef> = {
  bread: { kana: 'ぱん', name: 'パン', emoji: '🍞', desc: '満腹度+50', food: 50, value: 30 },
  bigBread: { kana: 'おおきなぱん', name: '大きなパン', emoji: '🥖', desc: '満腹度+100', food: 100, value: 70 },
  herb: { kana: 'やくそう', name: '薬草', emoji: '🌿', desc: 'HP+25〜35\n投げると当たった相手を回復', heal: [25, 35], value: 20 },
  bigHerb: { kana: 'じょうやくそう', name: '上薬草', emoji: '🍀', desc: 'HP+80〜120\n投げると当たった相手を回復', heal: [80, 120], value: 80 },
  antidote: { kana: 'どくけしそう', name: '毒消し草', emoji: '🥬', desc: '毒を治す\n投げると当たった相手の毒を治す', cure: 'poison', value: 20 },
  kitsuke: { kana: 'きつけそう', name: 'キツケソウ', emoji: '🌼', desc: '混乱を治す\n投げると当たった相手の混乱を治す', cure: 'confusion', value: 20 },
  water: { kana: 'まりょくのみず', name: '魔力の水', emoji: '💧', desc: 'MP+15', mp: 15, value: 40 },
  blank: { kana: 'はくしかーど', name: '白紙カード', emoji: '🃏', desc: '投げて魔物を封印する\n弱っている魔物ほど封印しやすい', value: 30 },
  arrow: { kana: 'ふつうのや', name: 'ふつうの矢', emoji: '🪶', desc: '向いている方向に撃つ\n通常攻撃の1.1倍のダメージ', arrow: 1.1, value: 2 },
  ironArrow: { kana: 'てつのや', name: '鉄の矢', emoji: '🏹', desc: '向いている方向に撃つ\n通常攻撃の1.3倍のダメージ', arrow: 1.3, value: 4 },
  sealRevive: { kana: 'ふっかつのしるし', name: '復活の印', emoji: '📜', desc: '瀕死の仲間を1人\nHP半分で戻す', seal: 'revive', value: 300 },
  sealSummon: { kana: 'しょうかんのしるし', name: '召喚の印', emoji: '📜', desc: '仲間を1人\nMPを使わずに召喚する', seal: 'summon', value: 150 },
  sealEscape: { kana: 'てんそうのしるし', name: '転送の印', emoji: '📜', desc: 'ダンジョンから脱出する\n道具も仲間も失わない', seal: 'escape', value: 120 },
  sealReveal: { kana: 'せんりのしるし', name: '千里の印', emoji: '📜', desc: 'この階の地図と\n階段・道具・敵の場所がわかる', seal: 'reveal', value: 100 },
  sealPoison: { kana: 'どくのしるし', name: '毒の印', emoji: '📜', desc: '部屋の敵をすべて毒にする\n1体ごとに10％で外れる', seal: 'poison', miss: 0.1, value: 80 },
  sealConfuse: { kana: 'こんらんのしるし', name: '混乱の印', emoji: '📜', desc: '部屋の敵をすべて混乱させる\n1体ごとに10％で外れる', seal: 'confuse', miss: 0.1, value: 80 },
  sealPin: { kana: 'こうちょくのしるし', name: '硬直の印', emoji: '📜', desc: '部屋の敵をすべてはりつける\n1体ごとに10％で外れる', seal: 'pin', miss: 0.1, value: 80 },
  sealSleep: { kana: 'こんすいのしるし', name: '昏睡の印', emoji: '📜', desc: '部屋の敵をすべて眠らせる\n1体ごとに10％で外れる', seal: 'sleep', miss: 0.1, value: 80 },
  sealDoom: { kana: 'はめつのしるし', name: '破滅の印', emoji: '📜', desc: '部屋の敵をすべてたおす\n1体ごとに30％で外れる', seal: 'doom', miss: 0.3, value: 250 },
  starSleep: { kana: 'すいみんのほし', name: '睡眠の星', emoji: '⭐', desc: '食べると眠る\n投げると相手が眠る', food: 5, star: 'sleep', value: 60 },
  starConfuse: { kana: 'こんらんのほし', name: '混乱の星', emoji: '⭐', desc: '食べると混乱する\n投げると相手が混乱', food: 5, star: 'confuse', value: 60 },
  starPoison: { kana: 'どくのほし', name: '毒の星', emoji: '⭐', desc: '食べると毒になる\n投げると相手が毒に', food: 5, star: 'poison', value: 60 },
  starBurst: { kana: 'さくれつのほし', name: '炸裂の星', emoji: '⭐', desc: '食べると前が爆発\n投げると20ダメージ', food: 5, star: 'burst', value: 100 },
  starRage: { kana: 'げっこうのほし', name: '激昂の星', emoji: '⭐', desc: '10ターン攻撃2倍\n食べる・投げるで効く', food: 5, star: 'rage', value: 100 },
  starFort: { kana: 'ようさいのほし', name: '要塞の星', emoji: '⭐', desc: '受けるダメージ60％減\n食べる・投げるで効く', food: 5, star: 'fort', value: 100 },
  starHoly: { kana: 'せいなるほし', name: '聖なる星', emoji: '⭐', desc: '階段の部屋へ移る\n食べる・投げるで効く', food: 5, star: 'holy', value: 120 },
  starHeal: { kana: 'いやしのほし', name: '癒しの星', emoji: '⭐', desc: '状態異常がすべて治る\n食べる・投げるで効く', food: 5, star: 'heal', value: 80 },
  starMana: { kana: 'まりょくのほし', name: '魔力の星', emoji: '⭐', desc: '10ターンMPが回復\n食べると効く', food: 5, star: 'mana', value: 80 },
  tomePower: { kana: 'ちからのまどうしょ', name: '力の魔導書', emoji: '📕', desc: '力の魔法を覚える', spell: 'power', value: 800 },
  tomeGuard: { kana: 'まもりのまどうしょ', name: '守りの魔導書', emoji: '📘', desc: '守りの魔法を覚える', spell: 'guard', value: 800 },
  fusionBook: { kana: 'はいごうのしょ', name: '配合の書', emoji: '📗', desc: '拠点の［配合］で\n仲間2体を合わせる', book: 'fusion', value: 3000 },
  rebirthBook: { kana: 'てんせいのしょ', name: '転生の書', emoji: '📙', desc: '拠点の［配合］で\nイヅツチを転生させる', book: 'rebirth', value: 3000 },
  pouch: { kana: 'ふつうのふくろ', name: 'ふつうの袋', emoji: '👝', desc: '道具を2〜4個しまえる', pouch: { capacity: [2, 4] }, value: 100 },
  finePouch: { kana: 'こうきゅうなふくろ', name: '高級な袋', emoji: '👜', desc: '道具を5〜7個しまえる', pouch: { capacity: [5, 7] }, value: 300 },
  holyPouch: {
    kana: 'せいなるふくろ',
    name: '聖なる袋',
    emoji: '👛',
    desc: '道具を2〜3個しまえる\n力つきても中の道具は失わない\n力つきると30％でふつうの袋に戻る',
    pouch: { capacity: [2, 3], holy: true },
    value: 600,
  },
  pot: { kana: 'れんきんがま', name: '錬金釜', emoji: '⚱️', desc: '同じ名前の装備2つを合わせて\n強くする（大きいほうの＋に＋1）', value: 300 },
  club: { kana: 'こんぼう', name: 'こん棒', emoji: '🏏', desc: '攻撃力+2', slot: 'weapon', bonus: 2, value: 50 },
  bronzeSword: { kana: 'どうのけん', name: '銅の剣', emoji: '🗡️', desc: '攻撃力+4', slot: 'weapon', bonus: 4, value: 150 },
  ironSword: { kana: 'てつのけん', name: '鉄の剣', emoji: '⚔️', desc: '攻撃力+7', slot: 'weapon', bonus: 7, value: 400 },
  woodShield: { kana: 'きのたて', name: '木の盾', emoji: '🪵', desc: '防御力+2', slot: 'shield', bonus: 2, value: 60 },
  leatherShield: { kana: 'かわのたて', name: '革の盾', emoji: '🛡️', desc: '防御力+4', slot: 'shield', bonus: 4, value: 180 },
  ironShield: { kana: 'てつのたて', name: '鉄の盾', emoji: '🔰', desc: '防御力+7', slot: 'shield', bonus: 7, value: 450 },
  rune: { kana: 'るーん', name: 'ルーン', emoji: '💠', desc: '拾うと持っているルーンが増える', rune: true, value: 0 },
};

export interface Item {
  id: number;
  kind: ItemKind;
  /** 矢の本数。矢でなければ省く */
  count?: number;
  /** 錬金釜で強くした分（装備だけ） */
  plus?: number;
  /** 袋に入る数と、中の道具（袋だけ） */
  capacity?: number;
  contents?: Item[];
  /** ルーンの額（ルーンだけ） */
  runes?: number;
}

/** 床に落ちているアイテム */
export interface FloorItem {
  item: Item;
  pos: Pos;
}

/** 画面とログに出す名前。＋と、矢の本数を付ける（例：鉄の剣+3、ふつうの矢（12本）） */
export function itemName(item: Item): string {
  if (ITEMS[item.kind].rune) return `${item.runes ?? 0}ルーン`;
  const plus = item.plus ? `+${item.plus}` : '';
  const count = item.count !== undefined ? `（${item.count}本）` : '';
  const pouch = item.contents ? `［${item.contents.length}/${item.capacity ?? 0}］` : '';
  return `${ITEMS[item.kind].name}${plus}${count}${pouch}`;
}

/** 装備で上がる攻撃力・防御力。錬金釜の＋を含む */
export const equipBonus = (item: Item) => (ITEMS[item.kind].bonus ?? 0) + (item.plus ?? 0);

let nextItemId = 1;

/** 保存したアイテムを読み込んだあと、新しいアイテムの番号が重ならないようにする */
export function reserveItemIds(maxId: number): void {
  nextItemId = Math.max(nextItemId, maxId + 1);
}

/** 初めて遊ぶときのバッグの中身（balance.md 8章） */
export const START_ITEMS: ItemKind[] = ['bread', 'herb', 'blank', 'blank'];

/** count は矢の本数（省くと1本）、袋なら入る数（省くといちばん少ない数） */
export function createItem(kind: ItemKind, count?: number): Item {
  const item: Item = { id: nextItemId++, kind };
  const def = ITEMS[kind];
  if (def.arrow) item.count = count ?? 1;
  if (def.pouch) {
    item.capacity = count ?? def.pouch.capacity[0];
    item.contents = [];
  }
  return item;
}

/** ルーンの額の道具（床に落とすもの） */
export function createRune(amount: number): Item {
  return { id: nextItemId++, kind: 'rune', runes: amount };
}

/** 売り値の割合（買い値の3分の1） */
export const SELL_RATE = 1 / 3;

/** 商店の買い値。0 なら商店では売っていない */
export const buyPrice = (kind: ItemKind) => ITEMS[kind].value;

/**
 * 売り値（balance.md 9章）。値打ちの3分の1。＋の付いた装備は＋1ごとに半分ずつ上がる。
 * 矢は本数ぶん。売れないものは 0
 */
export function sellPrice(item: Item): number {
  const def = ITEMS[item.kind];
  const plus = 1 + (item.plus ?? 0) * 0.5;
  return Math.floor(def.value * (item.count ?? 1) * plus * SELL_RATE);
}

/** 袋の中も含めた、すべての道具（保存データの番号を確かめるときなどに使う） */
export function allItems(items: Item[]): Item[] {
  return items.flatMap((i) => [i, ...(i.contents ?? [])]);
}

/** 並べ替える。種類順はアイテムの表の順、名前順は読みの五十音順。同じなら手に入れた順 */
/** 道具の種類の呼び名と読み。拠点の一覧の検索で使う（「印」「いん」「星」などで探せる） */
export function itemCategory(kind: ItemKind): string {
  const d = ITEMS[kind];
  if (d.slot) return d.slot === 'weapon' ? '武器 ぶき 装備 そうび' : '盾 たて 装備 そうび';
  if (d.seal) return '印 いん しるし';
  if (d.star) return '星 ほし';
  if (d.pouch) return '袋 ふくろ';
  if (d.spell) return '魔導書 まどうしょ 本';
  if (d.heal || d.cure) return '草 くさ';
  if (d.arrow) return '矢 や';
  if (d.food) return '食べ物 たべもの 食料 しょくりょう';
  return '';
}

export function sortItems(items: Item[], by: 'kind' | 'name'): Item[] {
  const kinds = Object.keys(ITEMS);
  const kana = (i: Item) => ITEMS[i.kind].kana;
  return [...items].sort((a, b) =>
    by === 'kind'
      ? kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.id - b.id
      : kana(a).localeCompare(kana(b), 'ja') || a.id - b.id,
  );
}
