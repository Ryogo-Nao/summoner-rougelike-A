import {
  HAND_LIMIT,
  IZUTSUCHI,
  LIGHTNING_CHANCE,
  PERSONALITIES,
  PERSONALITY_IDS,
  SUMMON_LIMIT,
  captureChance,
  cardStats,
  createCard,
  refreshStats,
  reserveCardIds,
  dropChance,
  growCard,
  cardName,
  isPartner,
  noAilments,
  swapInList,
  type Ailments,
  type Ally,
  type AllyOrder,
  type Card,
} from './cards';
import { HIT_RATE, allyLevelForExp, playerLevelForExp, rollDamage } from './combat';
import { DIR_VECTORS, dirFromDelta, distance, isDiagonal, type Dir, type Pos } from './dir';
import { generateFloor, randomFreePointIn } from './dungeon';
import { dungeonById, monstersForFloor, randomItem, randomRune, type Dungeon } from './dungeons';
import { GameMap, Tile, type Room } from './map';
import { SPECIES, createMonster, monsterExp, type Monster, type Species } from './monsters';
import {
  ARROW_STACK,
  BAG_LIMIT,
  ITEMS,
  PLUS_LIMIT,
  THROW_DAMAGE,
  noShortcuts,
  START_ITEMS,
  createItem,
  equipBonus,
  itemName,
  reserveItemIds,
  sortItems,
  allItems,
  type FloorItem,
  type Item,
  type SealKind,
  type StarKind,
  type ItemKind,
  type Shortcuts,
} from './items';
import { distanceField, firstStepToward } from './path';
import { Rng } from './rng';

/** 階に入ったときの魔物の数と、増える間隔（balance.md 6.1） */
const INITIAL_MONSTERS: [number, number] = [5, 7];
const SPAWN_INTERVAL = 40;
/** HPが全回復するまでのターン数（balance.md 1.4） */
const REGEN_TURNS = 150;

/** 魔法（balance.md 2.1）。name はログに、label は魔法の一覧に出す */
export const SPELLS = {
  fire: { name: '火の魔法', label: '火', mp: 4 },
  thunder: { name: '雷の魔法', label: '雷', mp: 5 },
  power: { name: '力の魔法', label: '力', mp: 6 },
  guard: { name: '守りの魔法', label: '守り', mp: 6 },
  bigFire: { name: '大火球', label: '大火球', mp: 10 },
} as const;
export type SpellId = keyof typeof SPELLS;
/** 火の魔法と、投げた白紙カードが飛ぶ最大のマス数 */
const LINE_RANGE = 10;
/** 満腹度が1減るまでのターン数と、知らせる満腹度（balance.md 1.5） */
const FOOD_INTERVAL = 10;
const HUNGER_WARNINGS: Record<number, string> = {
  20: 'おなかが減ってきた',
  10: 'おなかがペコペコだ',
  0: 'おなかが空いて倒れそうだ',
};
/** 力の魔法・守りの魔法が続くターン数（balance.md 2.1） */
const BUFF_TURNS = 20;
/** 魔法のランクの上限。同じ魔導書を読むたびに1つ上がる（balance.md 2.2） */
export const SPELL_MAX_RANK = 5;
/** 力の魔法の攻撃力の倍率。無印で1.5、+5で2倍 */
export const powerRate = (rank: number) => Math.round((1.5 + 0.1 * rank) * 100) / 100;
/** 守りの魔法で受けるダメージの倍率。無印で0.6、+5で0.4 */
export const guardRate = (rank: number) => Math.round((0.6 - 0.04 * rank) * 100) / 100;
/** 魔法の名前にランクを付ける。無印は付けない */
export const rankedName = (name: string, rank: number) => (rank > 0 ? `${name}+${rank}` : name);
/** 大火球が届くマス数（前方3マス幅） */
const BIG_FIRE_RANGE = 5;
/** 状態異常と特技（balance.md 3.5、4章） */
const CONFUSE_TURNS = 5;
/** 毒は30ターン続き、3ターンに1回、最大HPの1％（最低1）のダメージを受ける */
const POISON_TURNS = 30;
const POISON_INTERVAL = 3;
const POISON_RATE = 0.01;
/** 昏睡の印で眠るターン数 */
const SLEEP_TURNS: [number, number] = [2, 4];
/** 攻撃が当たったときに、胞子で混乱させる・毒にする・眠らせる・はりつけにする・お腹を減らす確率 */
const AILMENT_CHANCE = 0.3;
/** アミグモの糸で、主人公と仲間がはりつけになるターン数（魔物は攻撃されるまで） */
const PIN_TURNS: [number, number] = [3, 5];
/** クイムシの攻撃で減るMP（最大MPの割合。最低1） */
const MANA_BITE = 0.01;
/** チスイが吸い取る、与えたダメージの割合 */
const DRAIN_RATE = 0.5;
/** 火を吐く確率と、届くマス数、主人公と仲間への火のダメージ */
const BREATH_CHANCE = 0.3;
const BREATH_RANGE = 4;
const BREATH_DAMAGE = 8;

/** 星（balance.md 6.6）。激昂・要塞・魔力が続くターン、激昂の攻撃の倍率、要塞で受けるダメージの倍率 */
const STAR_TURNS = 10;
const RAGE_RATE = 2;
const FORT_RATE = 0.4;
/** 魔力の星で、毎ターン回復するMP（最大MPの割合） */
const MANA_RATE = 0.02;
/** 炸裂の星のダメージ。食べると1マス先が爆発し、投げると当たった相手に当たる。防御力に関係なく決まった分 */
const BURST_EAT_DAMAGE = 50;
const BURST_THROW_DAMAGE = 20;

/** 残しておくログの行数 */
const LOG_LIMIT = 100;

export interface LogEntry {
  /** その出来事が起きたターン */
  turn: number;
  text: string;
  /** 書いた順の通し番号。攻撃の場面を順に見せるとき、どこまでのログを出すかに使う */
  serial: number;
}

/** 仲間のいるマスへ進むときの動き。押すと、仲間を1マス先へ押し出して主人公が進む */
export type AllyMove = 'swap' | 'push';

/** マップに描くもの1つぶん。主人公・仲間・見えている魔物 */
export interface ActorView {
  emoji: string;
  /** 絵の id（主人公は player、魔物は種類の id）。絵がなければ emoji で出す */
  art: string;
  /** 同じものを見分ける名前。歩く動きをつなげるのに使う */
  key: string;
  pos: Pos;
  facing: Dir;
  /** 足もとに出すHPの棒。null なら出さない */
  hp: { ratio: number; ally: boolean } | null;
  isPlayer: boolean;
  isPartner: boolean;
  /** 敵の魔物か。足もとの影の色を分ける（味方は緑、敵は赤） */
  enemy: boolean;
  /** かかっている状態異常の印（混乱🌀、毒☠️）。なければ空。あとで絵に差し替える */
  sick: string;
}

/** ダッシュで1歩進む前の様子。進んだあとと比べて、止まるかを決める */
export interface DashSnapshot {
  hp: number;
  room: Room | undefined;
}

/**
 * 場面の種類（演出の種類。docs/effects.md）。
 * attack は隣への攻撃（空振りも）、reach は舌・触手で2マス先へ、breath は火を吐く、lightning はいかずち、
 * throw は投げる、shoot は矢、fire・bigFire・thunder・power・guard は魔法、burst は炸裂の星を食べた爆発、
 * item は道具を使った（薬草の回復など。誰も動かない）
 */
export type SceneAction =
  | 'attack'
  | 'reach'
  | 'breath'
  | 'lightning'
  | 'throw'
  | 'shoot'
  | 'fire'
  | 'bigFire'
  | 'thunder'
  | 'power'
  | 'guard'
  | 'burst'
  | 'item';

/** 場面を記録するときに渡す、演出の種類と範囲 */
interface SceneFx {
  action: SceneAction;
  /** 演出がかかるマス。省くと toward の1マス */
  cells?: Pos[];
  item?: ItemKind;
}

/**
 * 攻撃1回ぶんの場面。行動のあとに、起きた順に画面で再生する。
 * actors は攻撃する直前の様子。attacker（actors の番号、-1 ならいない）が toward へ向けて action をし、popups が出る
 */
export interface Scene {
  actors: ActorView[];
  /** 攻撃する者の actors の番号。-1 なら誰も踏み込まない（主人公が道具を使った場面など） */
  attacker: number;
  toward: Pos;
  /** 何をした場面か */
  action: SceneAction;
  /**
   * 演出がかかるマス。飛ぶもの（投げた物・矢・火・いかずち・舌）は通る道すじで、最後が当たった・止まったマス。
   * 範囲の魔法はその範囲、力・守りの魔法はかかった味方のマス
   */
  cells: Pos[];
  /** 投げた・撃った道具の種類（飛んでいく絵に使う） */
  item?: ItemKind;
  popups: Popup[];
  /** 攻撃の前と後で、ログをどこまで出すか（serial）と主人公のHP */
  logBefore: number;
  logAfter: number;
  hpBefore: number;
  hpAfter: number;
}

export interface Player {
  pos: Pos;
  facing: Dir;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  food: number;
  maxFood: number;
  level: number;
  exp: number;
  atk: number;
  def: number;
  /** 装備しているもの。どちらもバッグの中のアイテム */
  weapon: Item | null;
  shield: Item | null;
  /** 力の魔法・守りの魔法の残りターン */
  powerTurns: number;
  guardTurns: number;
  /** 魔力の星の残りターン。毎ターンMPが回復する */
  manaTurns: number;
  /** 状態異常と、激昂・要塞の残りターン */
  ailments: Ailments;
}

/** マップの上に一時的に出す文字（ダメージなど）。次の行動で消える */
export interface Popup {
  pos: Pos;
  text: string;
  kind: 'damage' | 'hurt' | 'miss' | 'info';
}

/** ダンジョンに持っていくもの。拠点で選ぶ */
export interface Loadout {
  cards: Card[];
  bag: Item[];
  learned: SpellId[];
  ranks: SpellRanks;
  shortcuts: Shortcuts;
}

/** 覚えた魔法のランク。0（無印）のものは省いてよい */
export type SpellRanks = Partial<Record<SpellId, number>>;

/** 保存するときのカード。魔物の種類は id で持つ */
export type CardData = Omit<Card, 'species'> & { species: string };

/** ダンジョンの途中の保存データ（requirements.md 2章：毎ターン自動保存） */
export interface RunData {
  version: 1;
  /** どのダンジョンか。古い保存データにはないので、最初のダンジョンとして読む */
  dungeon?: string;
  /** 千里の印を使った階か */
  revealed?: boolean;
  /** このダンジョンで拾ったルーン */
  runes?: number;
  stats?: RunStats;
  /** モンスターハウスの部屋の番号（map.rooms）。ない・もう起きたなら -1 */
  monsterHouse?: number;
  rng: number;
  floor: number;
  turn: number;
  map: { width: number; height: number; tiles: number[]; rooms: Room[] };
  explored: string;
  player: Omit<Player, 'weapon' | 'shield'> & { weapon: number | null; shield: number | null };
  monsters: (Omit<Monster, 'species'> & { species: string })[];
  cards: CardData[];
  storage: CardData[];
  pendingCard: CardData | null;
  allies: { card: number; pos: Pos; facing: Dir; order: AllyOrder; ailments?: Ailments }[];
  bag: Item[];
  floorItems: FloorItem[];
  learned: SpellId[];
  ranks?: SpellRanks;
  shortcuts?: Shortcuts;
  log: LogEntry[];
  logSerial: number;
  provoker: number;
  regenCarry: number;
  slowRest: boolean;
}

const ALL_SPECIES: readonly Species[] = [...SPECIES, IZUTSUCHI];

export function speciesById(id: string): Species {
  const s = ALL_SPECIES.find((x) => x.id === id);
  if (!s) throw new Error(`知らない魔物: ${id}`);
  return s;
}

export const cardToData = (card: Card): CardData => ({ ...card, species: card.species.id });
/** 状態異常の印。混乱は🌀、毒は☠️。激昂は💢、要塞は🏰（仮の絵文字。あとで絵に差し替える） */
export const sickMark = (a: Ailments) =>
  `${a.confused > 0 ? '🌀' : ''}${a.poisoned > 0 ? '☠️' : ''}${a.pinned > 0 ? '📌' : ''}${a.asleep > 0 ? '💤' : ''}${a.raged > 0 ? '💢' : ''}${a.fortified > 0 ? '🏰' : ''}`;

/** 激昂していれば攻撃を2倍にする */
const raged = (atk: number, a: Ailments) => (a.raged > 0 ? atk * RAGE_RATE : atk);
/** 要塞なら受けるダメージを60％減らす（最低1） */
const fortified = (dmg: number, a: Ailments) => (a.fortified > 0 ? Math.max(1, Math.round(dmg * FORT_RATE)) : dmg);

/** 毒のダメージ。残りターンが3の倍数のターンだけ、最大HPの1％（最低1）。毒で力つきることもある */
function poisonHit(ailments: Ailments, maxHp: number): number {
  if (ailments.poisoned <= 0 || ailments.poisoned % POISON_INTERVAL !== 0) return 0;
  return Math.max(1, Math.round(maxHp * POISON_RATE));
}

/**
 * 保存したカードを読み込み、能力を今の決まりで求め直す。
 * 性格のない古いカードは「すなお」にし、今の決まりより高かった分は足し算の補正として残す
 */
export function cardFromData(data: CardData): Card {
  const card: Card = { ...data, species: speciesById(data.species) };
  // 前に作った「きまぐれ」など、今はない性格は「すなお」にする
  if (data.personality !== undefined && !(data.personality in PERSONALITIES)) card.personality = 'sunao';
  if (data.personality === undefined) {
    card.personality = 'sunao';
    const now = cardStats(card.species, card.level);
    card.bonus = {
      maxHp: Math.max(0, data.maxHp - now.maxHp),
      atk: Math.max(0, data.atk - now.atk),
      def: Math.max(0, data.def - now.def),
    };
  }
  refreshStats(card);
  return card;
}

/** ダンジョンに入るときの主人公の能力（Lv1。balance.md 1章） */
export const PLAYER_BASE = { hp: 30, mp: 20, food: 100, atk: 5, def: 3 };

/** ダンジョンの中で数える戦績。拠点に戻ると、累積の記録に足す */
export interface RunStats {
  /** たおした魔物（毒でたおれたものも含む） */
  kills: number;
  /** 手に入れたカード */
  cards: number;
  /** 拾った道具（ルーンは含まない） */
  items: number;
}

/** 魔物などに付ける、見分けるための番号。保存はしない */
const objectKeys = new WeakMap<object, number>();
let nextObjectKey = 1;
function objectKey(o: object): number {
  let k = objectKeys.get(o);
  if (k === undefined) {
    k = nextObjectKey++;
    objectKeys.set(o, k);
  }
  return k;
}

/** ログに出す、まとめて動かした道具の名前。4つ以上は「〇〇など4個」にする */
function namesOf(items: Item[]): string {
  if (items.length <= 3) return items.map(itemName).join('と');
  return `${itemName(items[0])}など${items.length}個`;
}

export class GameState {
  readonly rng: Rng;
  map!: GameMap;
  player: Player;
  monsters: Monster[] = [];
  /** 手元のカード（最大5枚）と、ダンジョンの外の保管庫 */
  cards: Card[] = [createCard(IZUTSUCHI, false)];
  storage: Card[] = [];
  /** 召喚している仲間 */
  allies: Ally[] = [];
  /** バッグの中身（最大20個）と、この階の床に落ちているアイテム */
  bag: Item[] = START_ITEMS.map(createItem);
  floorItems: FloorItem[] = [];
  /** 魔導書で覚えた魔法 */
  learned = new Set<SpellId>();
  ranks: SpellRanks = {};
  /** ［攻撃］の長押しで使える、登録した道具の種類 */
  shortcuts: Shortcuts = noShortcuts();
  /** 手元がいっぱいのときに手に入れたカード。保管庫へ送るカードを選ぶまで、ここで待つ */
  pendingCard: Card | null = null;
  popups: Popup[] = [];
  floor = 1;
  turn = 0;
  log: LogEntry[] = [];
  private logSerial = 0;
  /** 主人公から各マスまでの歩数。仲間がついていくときに使い、仲間が動く前に作り直す */
  private followField: Int16Array = new Int16Array(0);
  /** この行動で起きた攻撃の場面。画面が再生する */
  private scenes: Scene[] = [];
  /** この行動の前のログの番号と、主人公のHP。主人公の行動で出た文字を見せる場面に使う */
  private actionLog = 0;
  private actionHp = 0;
  /** 一度でも見たマス（ミニマップと、暗く表示する範囲） */
  explored!: Uint8Array;
  /** 今見えているマス */
  visible!: Uint8Array;
  /** 遊んでいるダンジョン */
  readonly dungeon: Dungeon;
  /** ダンジョンの終わり方。踏破（いちばん下の階段を降りた）・離脱（転送の印）・失敗（力つきた） */
  cleared = false;
  escaped = false;
  dead = false;
  /** このダンジョンで拾ったルーン。拠点に戻ると持っているルーンに足す（力つきたら半分） */
  runes = 0;
  stats: RunStats = { kills: 0, cards: 0, items: 0 };
  /** 自分でダンジョンをあきらめた（dead と一緒に立てる） */
  gaveUp = false;
  /** 千里の印で、この階の地図と、階段・道具・敵の場所がわかっている */
  revealed = false;
  /** この階のモンスターハウスの部屋。ない・もう起きたなら null */
  monsterHouse: Room | null = null;
  /** 1回目のタップで振り向くか。オフなら、押した方向へすぐ進む（メニューで切り替える） */
  turnFirst = true;
  /** 仲間のいるマスへ進んだとき、入れ替わるか押すか（メニューで切り替える） */
  allyMove: AllyMove = 'swap';
  /** 離れたところから主人公を攻撃してきた魔物。仲間はこの魔物には自分から近づく */
  private provoker: Monster | null = null;
  /** HP回復の端数の持ち越し */
  private regenCarry = 0;
  /** 鈍足の魔物が休むターンかどうか */
  private slowRest = false;

  /** loadout を省くと、初めて遊ぶときの持ち物で始める */
  constructor(seed: number, loadout?: Loadout, dungeonId = 'first') {
    this.rng = new Rng(seed);
    this.dungeon = dungeonById(dungeonId);
    if (loadout) {
      this.cards = loadout.cards;
      this.bag = loadout.bag;
      this.learned = new Set(loadout.learned);
      this.ranks = { ...loadout.ranks };
      this.shortcuts = [...loadout.shortcuts];
    }
    const b = PLAYER_BASE;
    this.player = {
      pos: { x: 0, y: 0 },
      facing: 4,
      hp: b.hp,
      maxHp: b.hp,
      mp: b.mp,
      maxMp: b.mp,
      food: b.food,
      maxFood: b.food,
      level: 1,
      exp: 0,
      atk: b.atk,
      def: b.def,
      weapon: null,
      shield: null,
      powerTurns: 0,
      guardTurns: 0,
      manaTurns: 0,
      ailments: noAilments(),
    };
    // 連れていく仲間のうち最初の3体は、召喚した状態で入る（MPは使わない）。置く場所は enterFloor で決める
    if (loadout) {
      for (const card of this.cards.filter((c) => c.status === 'ready').slice(0, SUMMON_LIMIT)) {
        card.status = 'summoned';
        this.allies.push({ card, pos: { x: 0, y: 0 }, facing: 4, order: 'follow', ailments: noAilments() });
      }
    }
    this.enterFloor();
  }

  // ---- 保存と再開 ----

  toData(): RunData {
    const p = this.player;
    return {
      version: 1,
      dungeon: this.dungeon.id,
      revealed: this.revealed,
      runes: this.runes,
      stats: this.stats,
      monsterHouse: this.monsterHouse ? this.map.rooms.indexOf(this.monsterHouse) : -1,
      rng: this.rng.save(),
      floor: this.floor,
      turn: this.turn,
      map: { width: this.map.width, height: this.map.height, tiles: this.map.tileData(), rooms: this.map.rooms },
      explored: Array.from(this.explored).join(''),
      player: { ...p, weapon: p.weapon?.id ?? null, shield: p.shield?.id ?? null },
      monsters: this.monsters.map((m) => ({ ...m, species: m.species.id })),
      cards: this.cards.map(cardToData),
      storage: this.storage.map(cardToData),
      pendingCard: this.pendingCard ? cardToData(this.pendingCard) : null,
      allies: this.allies.map((a) => ({ card: a.card.id, pos: a.pos, facing: a.facing, order: a.order, ailments: a.ailments })),
      bag: this.bag,
      floorItems: this.floorItems,
      learned: [...this.learned],
      ranks: this.ranks,
      shortcuts: this.shortcuts,
      log: this.log,
      logSerial: this.logSerial,
      provoker: this.provoker ? this.monsters.indexOf(this.provoker) : -1,
      regenCarry: this.regenCarry,
      slowRest: this.slowRest,
    };
  }

  /** 保存データから、ダンジョンの途中の状態を作り直す */
  static fromData(data: RunData): GameState {
    if (data.version !== 1) throw new Error('保存データの形式が違う');
    const s = new GameState(1, undefined, data.dungeon ?? 'first');
    s.revealed = data.revealed ?? false;
    s.runes = data.runes ?? 0;
    s.stats = { kills: 0, cards: 0, items: 0, ...data.stats };
    s.rng.load(data.rng);
    s.floor = data.floor;
    s.turn = data.turn;
    s.map = new GameMap(data.map.width, data.map.height, data.map.tiles as Tile[], data.map.rooms);
    s.explored = Uint8Array.from(data.explored, (c) => Number(c));
    s.visible = new Uint8Array(data.map.width * data.map.height);
    s.bag = data.bag;
    const itemById = (id: number | null) => (id === null ? null : (s.bag.find((i) => i.id === id) ?? null));
    s.player = {
      ...data.player,
      manaTurns: data.player.manaTurns ?? 0,
      weapon: itemById(data.player.weapon),
      shield: itemById(data.player.shield),
      ailments: { ...noAilments(), ...data.player.ailments },
    };
    s.monsters = data.monsters.map((m) => {
      const species = speciesById(m.species);
      // 古い保存データの魔物には、レベルと攻撃力・防御力がない
      return {
        ...m,
        species,
        level: m.level ?? 1,
        atk: m.atk ?? species.atk,
        def: m.def ?? species.def,
        ailments: { ...noAilments(), ...m.ailments },
      };
    });
    s.cards = data.cards.map(cardFromData);
    s.storage = data.storage.map(cardFromData);
    s.pendingCard = data.pendingCard ? cardFromData(data.pendingCard) : null;
    s.allies = data.allies.flatMap((a) => {
      const card = s.cards.find((c) => c.id === a.card);
      return card ? [{ card, pos: a.pos, facing: a.facing, order: a.order, ailments: { ...noAilments(), ...a.ailments } }] : [];
    });
    s.floorItems = data.floorItems;
    s.learned = new Set(data.learned);
    s.ranks = data.ranks ?? {};
    s.shortcuts = data.shortcuts ?? noShortcuts();
    s.log = data.log;
    s.logSerial = data.logSerial;
    s.provoker = s.monsters[data.provoker] ?? null;
    s.regenCarry = data.regenCarry;
    s.monsterHouse = s.map.rooms[data.monsterHouse ?? -1] ?? null;
    s.slowRest = data.slowRest;
    s.popups = [];
    const cards = [...s.cards, ...s.storage, ...(s.pendingCard ? [s.pendingCard] : [])];
    reserveCardIds(Math.max(0, ...cards.map((c) => c.id)));
    reserveItemIds(Math.max(0, ...allItems([...s.bag, ...s.floorItems.map((f) => f.item)]).map((i) => i.id)));
    s.updateVisibility();
    return s;
  }

  private enterFloor(): void {
    const { map, start } = generateFloor(this.rng);
    this.map = map;
    this.player.pos = start;
    this.monsters = [];
    this.popups = [];
    this.provoker = null;
    this.revealed = false;
    this.monsterHouse = null;
    // 召喚している仲間は、主人公のまわりに一緒に降りてくる
    const allies = this.allies;
    this.allies = [];
    for (const a of allies) {
      const pos = this.freeSpotNear(start);
      if (pos) this.allies.push({ ...a, pos });
      else a.card.status = 'ready';
    }
    this.explored = new Uint8Array(map.width * map.height);
    this.visible = new Uint8Array(map.width * map.height);

    // 最初の魔物は、主人公のいる部屋には置かない
    const startRoom = map.roomAt(start.x, start.y);
    const rooms = map.rooms.filter((r) => r !== startRoom);
    const count = this.rng.int(...INITIAL_MONSTERS);
    for (let i = 0; i < count; i++) this.spawnMonster(this.rng.pick(rooms));
    this.floorItems = [];
    const items = this.rng.int(...this.dungeon.itemsPerFloor);
    for (let i = 0; i < items; i++) this.placeItem(this.rng.pick(map.rooms));
    const runes = this.rng.int(...this.dungeon.runes.piles);
    for (let i = 0; i < runes; i++) this.placeItem(this.rng.pick(map.rooms), randomRune(this.dungeon, this.floor, this.rng));
    // モンスターハウス：主人公のいない部屋の1つに、眠っている魔物とアイテムをたくさん置く
    const house = this.dungeon.monsterHouse;
    if (this.floor >= house.fromFloor && rooms.length > 0 && this.rng.chance(house.chance)) {
      const room = this.rng.pick(rooms);
      this.monsterHouse = room;
      const n = this.rng.int(...house.monsters);
      for (let i = 0; i < n; i++) this.spawnMonster(room, true);
      const m = this.rng.int(...house.items);
      for (let i = 0; i < m; i++) this.placeItem(room);
    }
    this.updateVisibility();
  }

  /** 主人公がモンスターハウスの部屋に入ったら、眠っている魔物がいっせいに起きる */
  private checkMonsterHouse(): void {
    const room = this.monsterHouse;
    const p = this.player.pos;
    if (!room || this.map.roomAt(p.x, p.y) !== room) return;
    this.monsterHouse = null;
    for (const m of this.monsters) {
      if (!m.dormant) continue;
      m.dormant = false;
      m.lastSeen = { ...p };
    }
    this.addLog('モンスターハウスだ！');
    this.popups.push({ pos: { ...p }, text: 'モンスターハウス！', kind: 'hurt' });
  }

  /** 部屋の空いているマスに、アイテムを1つ置く。主人公の足もとと、他のアイテムの上には置かない */
  /** 部屋の空いているマスにアイテムを置く。item を省くと、この階に出るアイテムからランダムに選ぶ */
  private placeItem(room: Room, item?: Item): void {
    for (let attempt = 0; attempt < 10; attempt++) {
      const pos = randomFreePointIn(this.rng, this.map, room);
      const p = this.player.pos;
      if ((pos.x === p.x && pos.y === p.y) || this.itemAt(pos.x, pos.y)) continue;
      this.floorItems.push({ item: item ?? randomItem(this.dungeon, this.floor, this.rng), pos });
      return;
    }
  }

  itemAt(x: number, y: number): FloorItem | undefined {
    return this.floorItems.find((f) => f.pos.x === x && f.pos.y === y);
  }

  /** 部屋の空いているマスに、この階に出る魔物を1体置く。置けなければ何もしない */
  /** dormant なら、モンスターハウスで眠っている魔物にする */
  private spawnMonster(room: Room, dormant = false): void {
    const kinds = monstersForFloor(this.dungeon, this.floor);
    for (let attempt = 0; attempt < 10; attempt++) {
      const pos = randomFreePointIn(this.rng, this.map, room);
      if (this.isOccupied(pos.x, pos.y)) continue;
      const kind = this.rng.pick(kinds);
      const monster = createMonster(speciesById(kind.species), pos, kind.level);
      if (dormant) monster.dormant = true;
      this.monsters.push(monster);
      return;
    }
  }

  get isOnStairs(): boolean {
    const { x, y } = this.player.pos;
    return this.map.get(x, y) === Tile.Stairs;
  }

  addLog(text: string): void {
    this.log.push({ turn: this.turn, text, serial: ++this.logSerial });
    if (this.log.length > LOG_LIMIT) this.log.shift();
  }

  monsterAt(x: number, y: number): Monster | undefined {
    return this.monsters.find((m) => m.pos.x === x && m.pos.y === y);
  }

  allyAt(x: number, y: number): Ally | undefined {
    return this.allies.find((a) => a.pos.x === x && a.pos.y === y);
  }

  private isOccupied(x: number, y: number): boolean {
    const p = this.player.pos;
    return (p.x === x && p.y === y) || this.monsterAt(x, y) !== undefined || this.allyAt(x, y) !== undefined;
  }

  /** at のまわり8マスのうち、歩けて空いているマス。主人公の向いている方向から順に探す */
  private freeSpotNear(at: Pos): Pos | null {
    for (let i = 0; i < 8; i++) {
      const dir = ((this.player.facing + i) % 8) as Dir;
      const v = DIR_VECTORS[dir];
      const x = at.x + v.x;
      const y = at.y + v.y;
      if (this.map.canStep(at, dir) && !this.isOccupied(x, y)) return { x, y };
    }
    return null;
  }

  // ---- 主人公の行動。行動すると、そのあと仲間と魔物が動く ----

  /**
   * パッドの方向を押したとき。turnFirst なら、今の向きと違えば振り向くだけで、ターンは使わない。
   * 進む先に魔物がいれば、その方を向くだけで攻撃はしない（攻撃は［攻撃］ボタンで）。
   * 仲間がいれば、設定（allyMove）に従って入れ替わるか押す。押せなければ入れ替わる。進めたら 'moved'、それ以外は 'none'
   */
  tryMove(dir: Dir): 'moved' | 'none' {
    const p = this.player;
    // 混乱していても、移動は押した方向へ進む（でたらめになるのは攻撃の向きだけ）
    if (this.turnFirst && p.facing !== dir) {
      p.facing = dir;
      return 'none';
    }
    p.facing = dir;
    const v = DIR_VECTORS[dir];
    if (this.monsterAt(p.pos.x + v.x, p.pos.y + v.y)) return 'none';
    if (!this.map.canStep(p.pos, dir)) return 'none';
    this.beginAction();
    const to = { x: p.pos.x + v.x, y: p.pos.y + v.y };
    const ally = this.allyAt(to.x, to.y);
    if (ally) this.passAlly(ally, dir, this.allyMove === 'push' && this.canPush(ally) ? 'push' : 'swap');
    p.pos = to;
    this.pickUp();
    this.endTurn();
    return 'moved';
  }

  // ---- ダッシュ（方向を押し続けたとき） ----

  /**
   * ダッシュで次に進む向き。止まるべきなら null。
   * 魔物が見えていれば止まる。部屋の中はまっすぐ進み、通路は曲がり角に沿って曲がる。
   * 通路の分かれ道と行き止まりでは止まる
   */
  dashDirection(dir: Dir): Dir | null {
    const p = this.player.pos;
    if (this.monsters.some((m) => this.isVisible(m.pos.x, m.pos.y))) return null;
    const open = (d: Dir) => {
      const v = DIR_VECTORS[d];
      return this.map.canStep(p, d) && !this.monsterAt(p.x + v.x, p.y + v.y);
    };
    if (this.map.roomAt(p.x, p.y)) return open(dir) ? dir : null;
    // 通路：来た方向とその両どなりは除く。斜めは、同じ向きのまっすぐの道があれば数えない
    const back = (dir + 4) % 8;
    const ways = ([0, 1, 2, 3, 4, 5, 6, 7] as Dir[]).filter(
      (d) => d !== back && d !== (back + 1) % 8 && d !== (back + 7) % 8 && open(d),
    );
    const straight = ways.filter((d) => d % 2 === 0);
    const choices = ways.filter((d) => d % 2 === 0 || !(straight.includes(((d + 1) % 8) as Dir) || straight.includes(((d + 7) % 8) as Dir)));
    if (choices.length !== 1) return null;
    return choices[0];
  }

  dashSnapshot(): DashSnapshot {
    const p = this.player.pos;
    return { hp: this.player.hp, room: this.map.roomAt(p.x, p.y) };
  }

  /** ダッシュで1歩進んだあと、止まるか。傷ついた、道具や階段の上、部屋に出入りした、魔物が見えた */
  dashShouldStop(before: DashSnapshot): boolean {
    const p = this.player.pos;
    return (
      this.dead ||
      this.player.hp < before.hp ||
      this.itemUnderfoot() !== undefined ||
      this.isOnStairs ||
      this.map.roomAt(p.x, p.y) !== before.room ||
      this.monsters.some((m) => this.isVisible(m.pos.x, m.pos.y))
    );
  }

  /** ダッシュの1歩。振り向きの設定にかかわらず、その向きへ進む */
  dash(dir: Dir): 'moved' | 'none' {
    this.player.facing = dir;
    return this.tryMove(dir);
  }

  /** 仲間に指示を出す。ターンは使わない */
  setOrder(ally: Ally, order: AllyOrder): void {
    ally.order = order;
  }

  /** 隣の仲間の方へ進めるか（壁の角越しでないか） */
  canReachAlly(ally: Ally): boolean {
    const dir = dirFromDelta(ally.pos.x - this.player.pos.x, ally.pos.y - this.player.pos.y);
    return distance(ally.pos, this.player.pos) === 1 && dir !== null && this.map.canStep(this.player.pos, dir);
  }

  /** 仲間を、主人公から見て向こう側へ1マス押し出せるか。後ろに仲間が一列に並んでいれば、まとめて押す */
  canPush(ally: Ally): boolean {
    const dir = dirFromDelta(ally.pos.x - this.player.pos.x, ally.pos.y - this.player.pos.y);
    return dir !== null && this.canReachAlly(ally) && this.pushLine(ally, dir) !== null;
  }

  /**
   * ally から dir の向きに、すき間なく並んでいる仲間の列。いちばん先の仲間が1マス進めなければ null。
   * 途中の仲間は、前の仲間のいたマスに入る
   */
  private pushLine(ally: Ally, dir: Dir): Ally[] | null {
    const line: Ally[] = [];
    let a: Ally | undefined = ally;
    while (a) {
      if (!this.canPass(a.card.species, a.pos, dir)) return null;
      line.push(a);
      const next = this.ahead(a.pos, dir);
      a = this.allyAt(next.x, next.y);
    }
    const last = line[line.length - 1];
    return this.canMoveTo(last.card.species, last.pos, dir) ? line : null;
  }

  /** 隣の仲間をタップして選んだとき。その仲間と入れ替わるか、押して進む。1ターンかかる */
  moveThroughAlly(ally: Ally, how: AllyMove): void {
    if (!this.allies.includes(ally) || !this.canReachAlly(ally) || (how === 'push' && !this.canPush(ally))) return;
    const p = this.player;
    const dir = dirFromDelta(ally.pos.x - p.pos.x, ally.pos.y - p.pos.y)!;
    p.facing = dir;
    this.beginAction();
    const to = { ...ally.pos };
    this.passAlly(ally, dir, how);
    p.pos = to;
    this.pickUp();
    this.endTurn();
  }

  /** 主人公が dir へ進んで仲間のマスに入る前に、仲間をどかす */
  private passAlly(ally: Ally, dir: Dir, how: AllyMove): void {
    if (how === 'push') {
      // 列のいちばん先から順に1マスずつ進める
      for (const a of [...(this.pushLine(ally, dir) ?? [ally])].reverse()) {
        a.pos = this.ahead(a.pos, dir);
        a.facing = dir;
      }
    } else {
      ally.pos = { ...this.player.pos };
    }
  }

  /** 足もとのアイテムを拾う。バッグがいっぱいなら拾わない */
  private pickUp(): void {
    const { x, y } = this.player.pos;
    const found = this.itemAt(x, y);
    if (!found) return;
    const name = itemName(found.item);
    // ルーンはバッグに入れず、持っているルーンに足す
    if (ITEMS[found.item.kind].rune) {
      this.runes += found.item.runes ?? 0;
      this.floorItems = this.floorItems.filter((f) => f !== found);
      this.addLog(`${name}を拾った`);
      return;
    }
    if (!this.canPickUp(found.item)) {
      this.addLog(`バッグがいっぱいで${name}を拾えない`);
      return;
    }
    this.addLog(`${name}を拾った`);
    this.stats.items++;
    // 矢は、バッグの同じ矢に99本までまとめる。入りきらない分は別の1つにする
    const item = found.item;
    if (item.count !== undefined) {
      for (const stack of this.bag) {
        if (stack.kind !== item.kind || stack.count === undefined) continue;
        const add = Math.min(ARROW_STACK - stack.count, item.count);
        stack.count += add;
        item.count -= add;
      }
      if (item.count === 0) {
        this.floorItems = this.floorItems.filter((f) => f !== found);
        return;
      }
      if (this.bag.length >= BAG_LIMIT) return;
    }
    this.floorItems = this.floorItems.filter((f) => f !== found);
    this.bag.push(item);
  }

  /** 拾えるか。バッグがいっぱいでも、同じ矢にまとめられるなら拾える */
  canPickUp(item: Item): boolean {
    if (this.bag.length < BAG_LIMIT || ITEMS[item.kind].rune) return true;
    return item.count !== undefined && this.bag.some((i) => i.kind === item.kind && (i.count ?? ARROW_STACK) < ARROW_STACK);
  }

  /** 仲間の攻撃力。力の魔法がかかっていれば上がる（味方全体にかかる） */
  private allyAttack(a: Ally): number {
    const atk = raged(a.card.atk, a.ailments);
    return this.player.powerTurns > 0 ? Math.round(atk * powerRate(this.rankOf('power'))) : atk;
  }

  /** 主人公と仲間が受けるダメージ。守りの魔法がかかっていれば減る（味方全体にかかる） */
  private guarded(raw: number): number {
    return this.player.guardTurns > 0 ? Math.max(1, Math.round(raw * guardRate(this.rankOf('guard')))) : raw;
  }

  /** 攻撃力と防御力。装備と、力の魔法の分を含む */
  attackPower(): number {
    const p = this.player;
    const atk = raged(p.atk + (p.weapon ? equipBonus(p.weapon) : 0), p.ailments);
    return p.powerTurns > 0 ? Math.round(atk * powerRate(this.rankOf('power'))) : atk;
  }

  defensePower(): number {
    const p = this.player;
    return p.def + (p.shield ? equipBonus(p.shield) : 0);
  }

  // ---- バッグ ----

  /** アイテムの「使う」ボタンの名前。使えないアイテム（白紙カードは投げるだけ）は null */
  useLabel(item: Item): string | null {
    const def = ITEMS[item.kind];
    if (def.food) return '食べる';
    if (def.spell) return '読む';
    if (def.slot) return this.isEquipped(item) ? '外す' : '装備';
    if (def.arrow) return '撃つ（向いている方向）';
    // 袋は「中を見る」で開く（画面の側で扱う）
    // 配合の書・転生の書は拠点で使う
    if (item.kind === 'blank' || def.pouch || def.book) return null;
    return '使う';
  }

  /** 装備する（装備中なら外す）と、攻撃力か防御力がいくつからいくつになるか。装備できないアイテムは null */
  equipPreview(item: Item): { stat: '攻撃力' | '防御力'; before: number; after: number } | null {
    const slot = ITEMS[item.kind].slot;
    if (!slot) return null;
    const p = this.player;
    const value = () => (slot === 'weapon' ? this.attackPower() : this.defensePower());
    const current = p[slot];
    const before = value();
    p[slot] = current === item ? null : item;
    const after = value();
    p[slot] = current;
    return { stat: slot === 'weapon' ? '攻撃力' : '防御力', before, after };
  }

  isEquipped(item: Item): boolean {
    return this.player.weapon === item || this.player.shield === item;
  }

  /** 使えない理由。使えるなら null。足もとの装備はバッグに入れてから装備する */
  useProblem(item: Item): string | null {
    const def = ITEMS[item.kind];
    if (def.spell && this.learned.has(def.spell) && this.rankOf(def.spell) >= SPELL_MAX_RANK) {
      return `${this.spellName(def.spell)}は最大ランク`;
    }
    if (def.slot && !this.bag.includes(item) && this.bag.length >= BAG_LIMIT) return 'バッグがいっぱいで装備できない';
    if (def.seal === 'revive' && this.reviveTargets().length === 0) return '瀕死の仲間がいない';
    if (def.seal === 'summon' && this.summonTargets().length === 0) return '召喚できる仲間がいない';
    if (item.kind === 'pot' && this.potBases().length === 0) return '同じ名前の装備が2つない';
    return null;
  }

  // ---- 登録した道具（［攻撃］の長押し） ----

  /** 登録できる道具か。使える道具だけで、装備（武器・盾）と白紙カードは登録できない */
  canRegister(item: Item): boolean {
    return this.useLabel(item) !== null && !ITEMS[item.kind].slot;
  }

  /** slot の枠に道具の種類を登録する（null で外す）。同じ種類がほかの枠にあれば、そちらは外す */
  setShortcut(slot: number, kind: ItemKind | null): void {
    this.shortcuts = this.shortcuts.map((k, i) => (i === slot ? kind : k === kind ? null : k));
  }

  /** その枠で使うバッグの道具。同じ種類が何個あっても、最初のものを使う */
  shortcutItem(slot: number): Item | undefined {
    const kind = this.shortcuts[slot];
    return kind ? this.bag.find((i) => i.kind === kind) : undefined;
  }

  /** バッグにあるその種類の数。矢は本数を足す */
  countInBag(kind: ItemKind): number {
    return this.bag.filter((i) => i.kind === kind).reduce((n, i) => n + (i.count ?? 1), 0);
  }

  // ---- 袋 ----

  /** 袋にしまえる道具（バッグの、袋でない道具） */
  pouchable(pouch: Item): Item[] {
    return this.bag.filter((i) => i !== pouch && !ITEMS[i.kind].pouch);
  }

  /** バッグの道具を袋にしまう。装備していれば外す。1ターンかかる */
  putInPouch(pouch: Item, items: Item[]): void {
    const contents = pouch.contents;
    if (!contents || !this.bag.includes(pouch) || items.length === 0) return;
    const able = this.pouchable(pouch);
    if (!items.every((i) => able.includes(i))) return;
    if (contents.length + items.length > (pouch.capacity ?? 0)) return;
    this.beginAction();
    for (const item of items) {
      this.removeFromBag(item);
      contents.push(item);
    }
    this.addLog(`${namesOf(items)}を${ITEMS[pouch.kind].name}にしまった`);
    this.endTurn();
  }

  /** 袋から道具を出してバッグに入れる。まとめて出しても1ターン。バッグに入りきらなければできない */
  takeFromPouch(pouch: Item, items: Item[]): void {
    const contents = pouch.contents;
    if (!contents || items.length === 0 || !items.every((i) => contents.includes(i))) return;
    if (this.bag.length + items.length > BAG_LIMIT) return;
    this.beginAction();
    pouch.contents = contents.filter((i) => !items.includes(i));
    this.bag.push(...items);
    this.addLog(`${ITEMS[pouch.kind].name}から${namesOf(items)}を出した`);
    this.endTurn();
  }

  /**
   * 手持ちのカードの順番を入れ替える。ターンは使わない。
   * 召喚中の仲間も同じ順に並べ直す（仲間の枠の並びと、動く順番が変わる）
   */
  swapCards(a: Card, b: Card): void {
    swapInList(this.cards, a, b);
    this.allies.sort((x, y) => this.cards.indexOf(x.card) - this.cards.indexOf(y.card));
  }

  /** ダンジョンをあきらめる。力つきたときと同じ扱いにする */
  giveUp(): void {
    if (this.dead || this.cleared || this.escaped) return;
    this.dead = true;
    this.gaveUp = true;
    this.addLog('ダンジョンをあきらめた');
  }

  /** 復活の印で選べるカード（瀕死のカード） */
  reviveTargets(): Card[] {
    return this.cards.filter((c) => c.status === 'dying');
  }

  /** 召喚の印で選べるカード。召喚の上限と、隣の空きはふつうの召喚と同じ */
  summonTargets(): Card[] {
    if (this.allies.length >= SUMMON_LIMIT || !this.freeSpotNear(this.player.pos)) return [];
    return this.cards.filter((c) => c.status === 'ready');
  }

  /** 錬金釜で強くできる装備（バッグに同じ名前の装備がもう1つあるもの） */
  potBases(): Item[] {
    return this.bag.filter((i) => ITEMS[i.kind].slot && this.potPartners(i).length > 0);
  }

  /** base と合わせられる、同じ名前の装備 */
  potPartners(base: Item): Item[] {
    return this.bag.filter((i) => i !== base && i.kind === base.kind);
  }

  /** バッグか足もとにあるアイテムか */
  private isAtHand(item: Item): boolean {
    return this.bag.includes(item) || this.itemUnderfoot() === item;
  }

  /**
   * アイテムを使う（食べる・飲む・読む・装備する・外す・撃つ・印を使う）。足もとのアイテムも使える。1ターンかかる。
   * target は、復活の印・召喚の印で選んだカード。錬金釜は alchemy() で使う
   */
  useItem(item: Item, target?: Card): void {
    if (!this.isAtHand(item) || this.useLabel(item) === null || this.useProblem(item) || item.kind === 'pot') return;
    const p = this.player;
    const def = ITEMS[item.kind];
    const name = itemName(item);
    if (def.seal === 'revive' && !(target && this.reviveTargets().includes(target))) return;
    if (def.seal === 'summon' && !(target && this.summonTargets().includes(target))) return;
    this.beginAction();
    if (def.arrow) {
      this.shoot(item);
      this.endTurn();
      return;
    }
    if (def.slot && !this.bag.includes(item)) {
      // 足もとの装備は拾って装備する
      this.release(item);
      this.bag.push(item);
      p[def.slot] = item;
      this.addLog(`${name}を拾って装備した`);
      this.endTurn();
      return;
    }
    if (def.slot) {
      const key = def.slot;
      if (p[key] === item) {
        p[key] = null;
        this.addLog(`${name}を外した`);
      } else {
        p[key] = item;
        this.addLog(`${name}を装備した`);
      }
      this.endTurn();
      return;
    }
    this.release(item);
    if (def.seal) {
      this.addLog(`${def.name}を使った`);
      this.useSeal(def.seal, def.miss ?? 0, target);
      this.endTurn();
      return;
    }
    if (def.star) {
      this.eatStar(def.star, def.name, def.food ?? 0);
    } else if (def.food) {
      p.food = Math.min(p.maxFood, p.food + def.food);
      this.addLog(`${def.name}を食べた`);
    } else if (def.spell && this.learned.has(def.spell)) {
      // 覚えている魔法の魔導書を読むと、ランクが1つ上がる
      this.ranks[def.spell] = this.rankOf(def.spell) + 1;
      this.addLog(`${SPELLS[def.spell].name}が+${this.rankOf(def.spell)}になった！`);
    } else if (def.spell) {
      this.learned.add(def.spell);
      this.addLog(`${SPELLS[def.spell].name}を覚えた！`);
    } else if (def.heal) {
      const heal = Math.min(this.rng.int(...def.heal), p.maxHp - p.hp);
      p.hp += heal;
      this.addLog(`${def.name}を使った（HP+${heal}）`);
      this.popups.push({ pos: p.pos, text: `+${heal}`, kind: 'info' });
    } else if (def.cure) {
      this.addLog(`${def.name}を使った`);
      this.cure(def.cure, p.ailments, 'あなた');
    } else if (def.mp) {
      const gain = Math.min(def.mp, p.maxMp - p.mp);
      p.mp += gain;
      this.addLog(`${def.name}を飲んだ（MP+${gain}）`);
    }
    this.endTurn();
  }

  /** 星を食べる。満腹度が増え、自分に効く。炸裂の星は、向いている方向の1マス先が爆発する */
  private eatStar(kind: StarKind, name: string, food: number): void {
    const p = this.player;
    p.food = Math.min(p.maxFood, p.food + food);
    this.addLog(`${name}を食べた`);
    if (kind === 'burst') {
      const at = this.ahead(p.pos, p.facing);
      const target = this.monsterAt(at.x, at.y);
      this.scene(
        p.pos,
        at,
        () => {
          this.addLog('1マス先で爆発が起きた');
          if (target) this.damageMonster(target, BURST_EAT_DAMAGE, null, '爆発');
        },
        { action: 'burst' },
      );
      return;
    }
    if (kind === 'mana') {
      p.manaTurns = STAR_TURNS;
      this.addLog('魔力が満ちてきた');
      return;
    }
    if (kind === 'holy') {
      if (this.warpToStairs(p)) this.addLog('あなたは階段の部屋に移動した');
      else this.addLog('何も起きなかった');
      return;
    }
    this.starEffect(kind, p.ailments, 'あなた');
    // 食べたターンの終わりにも1減るので、そのぶん足して、次のターンから10ターン効くようにする
    if (kind === 'rage') p.ailments.raged++;
    if (kind === 'fort') p.ailments.fortified++;
  }

  /**
   * 星を投げて当てたとき。当たった相手（魔物か仲間）に効く。
   * 炸裂の星は決まったダメージ、聖なる星は相手を階段の部屋へ移す。魔力の星はほかの者には効かない
   */
  private starHit(kind: StarKind, name: string, monster?: Monster, ally?: Ally): void {
    const hitName = ally ? cardName(ally.card) : monster!.species.name;
    if (monster) monster.lastSeen = { ...this.player.pos };
    if (kind === 'burst') {
      if (monster) this.damageMonster(monster, BURST_THROW_DAMAGE, null, `投げた${name}`);
      return;
    }
    this.addLog(`${name}を投げた → ${hitName}に当たった`);
    if (kind === 'mana') {
      this.addLog('何も起きなかった');
      return;
    }
    if (kind === 'holy') {
      const who = ally ?? monster!;
      if (this.warpToStairs(who)) this.addLog(`${hitName}は階段の部屋に移動した`);
      else this.addLog('何も起きなかった');
      if (monster && this.provoker === monster) this.provoker = null;
      return;
    }
    this.starEffect(kind, ally ? ally.ailments : monster!.ailments, hitName);
  }

  /** 状態を変える星（睡眠・混乱・毒・激昂・要塞・癒し）の効き目。who はログに出す名前 */
  private starEffect(kind: StarKind, a: Ailments, who: string): void {
    if (kind === 'sleep') {
      a.asleep = this.rng.int(...SLEEP_TURNS);
      this.addLog(`${who}は眠ってしまった`);
    } else if (kind === 'confuse') {
      a.confused = CONFUSE_TURNS;
      this.addLog(`${who}は混乱した`);
    } else if (kind === 'poison') {
      a.poisoned = POISON_TURNS;
      this.addLog(`${who}は毒を受けた`);
    } else if (kind === 'rage') {
      a.raged = STAR_TURNS;
      this.addLog(`${who}は激昂した（攻撃2倍）`);
    } else if (kind === 'fort') {
      a.fortified = STAR_TURNS;
      this.addLog(`${who}の守りが固くなった（受けるダメージ60％減）`);
    } else if (kind === 'heal') {
      if (a.confused + a.poisoned + a.pinned + a.asleep === 0) {
        this.addLog(`${who}は状態異常になっていない`);
        return;
      }
      a.confused = 0;
      a.poisoned = 0;
      a.pinned = 0;
      a.asleep = 0;
      this.addLog(`${who}の状態異常がすべて治った`);
    }
  }

  /** 階段のある部屋の、空いているマスへ移す。部屋が見つからない・空きがなければ false */
  private warpToStairs(who: { pos: Pos }): boolean {
    const { width, height } = this.map;
    let room: Room | undefined;
    for (let i = 0; i < width * height && !room; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      if (this.map.get(x, y) === Tile.Stairs) room = this.map.roomAt(x, y);
    }
    if (!room) return false;
    const free: Pos[] = [];
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (this.map.isWalkable(x, y) && !this.isOccupied(x, y)) free.push({ x, y });
      }
    }
    if (free.length === 0) return false;
    who.pos = this.rng.pick(free);
    return true;
  }

  /** 毒消し草・キツケソウで治す。who はログに出す名前 */
  private cure(kind: 'poison' | 'confusion', ailments: Ailments, who: string): void {
    const key = kind === 'poison' ? 'poisoned' : 'confused';
    const label = kind === 'poison' ? '毒' : '混乱';
    if (ailments[key] === 0) {
      this.addLog(`${who}は${label}になっていない`);
      return;
    }
    ailments[key] = 0;
    this.addLog(`${who}の${label}が治った`);
  }

  /**
   * 印の効き目。部屋の敵に効く印は、1体ごとに miss の確率で外れる。
   * 通路で使ったときは、まわり1マスの敵に効く
   */
  private useSeal(kind: SealKind, miss: number, target?: Card): void {
    const p = this.player;
    if (kind === 'revive' && target) {
      target.status = 'ready';
      target.hp = Math.ceil(target.maxHp / 2);
      this.addLog(`${cardName(target)}が復活した`);
      return;
    }
    if (kind === 'summon' && target) {
      this.placeAlly(target);
      return;
    }
    if (kind === 'escape') {
      this.escaped = true;
      this.addLog('ダンジョンから脱出した');
      return;
    }
    if (kind === 'reveal') {
      this.explored.fill(1);
      this.revealed = true;
      this.addLog('この階の様子がわかった');
      return;
    }
    const room = this.map.roomAt(p.pos.x, p.pos.y);
    const targets = this.monsters.filter((m) =>
      room ? this.map.roomAt(m.pos.x, m.pos.y) === room : distance(m.pos, p.pos) === 1,
    );
    if (targets.length === 0) {
      this.addLog('何も起きなかった');
      return;
    }
    for (const m of targets) {
      const name = m.species.name;
      if (this.rng.chance(miss)) {
        this.addLog(`${name}には効かなかった`);
        this.popups.push({ pos: m.pos, text: 'ミス', kind: 'miss' });
        continue;
      }
      m.lastSeen = { ...p.pos };
      if (kind === 'poison') {
        m.ailments.poisoned = POISON_TURNS;
        this.addLog(`${name}は毒を受けた`);
      } else if (kind === 'confuse') {
        m.ailments.confused = CONFUSE_TURNS;
        this.addLog(`${name}は混乱した`);
      } else if (kind === 'pin') {
        m.ailments.pinned = 1;
        this.addLog(`${name}ははりつけになった`);
      } else if (kind === 'sleep') {
        m.ailments.asleep = this.rng.int(...SLEEP_TURNS);
        this.addLog(`${name}は眠った`);
      } else if (kind === 'doom') {
        this.defeatMonster(m, null, true, false);
      }
    }
  }

  /**
   * 錬金釜で、同じ名前の装備2つを1つにまとめて強くする。＋は2つのうち大きいほうに＋1（最大+10）。
   * 装備しているほうを残す。釜はなくなる。1ターンかかる
   */
  alchemy(pot: Item, base: Item, other: Item): void {
    if (pot.kind !== 'pot' || !this.isAtHand(pot) || !this.potPartners(base).includes(other)) return;
    this.beginAction();
    this.release(pot);
    const keep = this.isEquipped(other) && !this.isEquipped(base) ? other : base;
    const gone = keep === base ? other : base;
    keep.plus = Math.min(PLUS_LIMIT, Math.max(base.plus ?? 0, other.plus ?? 0) + 1);
    this.removeFromBag(gone);
    this.addLog(`錬金釜で${itemName(keep)}になった`);
    this.endTurn();
  }

  /** 足もとのアイテム。なければ undefined */
  itemUnderfoot(): Item | undefined {
    return this.itemAt(this.player.pos.x, this.player.pos.y)?.item;
  }

  /** 足もとのアイテムを拾う。1ターンかかる */
  pickUpHere(): void {
    const item = this.itemUnderfoot();
    if (!item || !this.canPickUp(item)) return;
    this.beginAction();
    this.pickUp();
    this.endTurn();
  }

  /** バッグのアイテムを足もとに置いて、足もとのアイテムを拾う。1ターンかかる */
  swapWithFloor(item: Item): void {
    const found = this.itemAt(this.player.pos.x, this.player.pos.y);
    if (!found || !this.bag.includes(item)) return;
    this.beginAction();
    this.removeFromBag(item);
    this.floorItems = this.floorItems.filter((f) => f !== found);
    this.bag.push(found.item);
    this.floorItems.push({ item, pos: { ...this.player.pos } });
    this.addLog(`${itemName(found.item)}を拾って${itemName(item)}を置いた`);
    this.endTurn();
  }

  /** バッグの並べ方。はじめは種類順。あとから拾った道具も、この並べ方で出す */
  bagOrder: 'kind' | 'name' = 'kind';

  /** バッグを並べ替える。種類順はアイテムの表の順、名前順は五十音順。ターンは使わない */
  sortBag(by: 'kind' | 'name'): void {
    this.bagOrder = by;
    this.bag = sortItems(this.bag, by);
  }

  /** 一覧に出すときの並び（バッグ・袋の中など）。選んでいる並べ方にする */
  sorted(items: Item[]): Item[] {
    return sortItems(items, this.bagOrder);
  }

  /** 足もとに置けない理由。階段や、他のアイテムがあるマスには置けない */
  dropProblem(): string | null {
    const { x, y } = this.player.pos;
    if (this.map.get(x, y) === Tile.Stairs || this.itemAt(x, y)) return 'ここには置けない';
    return null;
  }

  /** 足もとに置く。1ターンかかる */
  dropItem(item: Item): void {
    if (!this.bag.includes(item) || this.dropProblem()) return;
    this.beginAction();
    this.removeFromBag(item);
    this.floorItems.push({ item, pos: { ...this.player.pos } });
    this.addLog(`${itemName(item)}を置いた`);
    this.endTurn();
  }

  /**
   * 向いている方向に投げる（balance.md 6章）。白紙カードは魔物の封印を試み、
   * 薬草・上薬草は当たった相手（仲間も）を回復し、毒消し草・キツケソウは治す。
   * 武器・盾は強さに応じたダメージ、印は効かずに落ちる。矢は撃つのと同じ。
   * 何にも当たらなければ、止まったところに落ちる
   */
  throwItem(item: Item): void {
    if (!this.isAtHand(item)) return;
    const p = this.player;
    const def = ITEMS[item.kind];
    const name = def.name;
    this.beginAction();
    if (def.arrow) {
      this.shoot(item);
      this.endTurn();
      return;
    }
    this.release(item);
    // 回復する道具と、仲間を助ける星（激昂・要塞・癒し）は、仲間にも当たる。ほかは仲間の上を越えていく
    const helps = def.heal !== undefined || def.cure !== undefined || (def.star !== undefined && ['rage', 'fort', 'heal'].includes(def.star));
    const { monster, ally, landing } = this.traceThrow(helps);
    const throwFx: SceneFx = { action: 'throw', cells: this.lineCells(p.pos, landing), item: item.kind };
    this.scene(p.pos, this.ahead(p.pos, p.facing), () => {
      const hitName = ally ? cardName(ally.card) : monster?.species.name;
      const hitPos = ally?.pos ?? monster?.pos;
      if (item.kind === 'blank' && monster) {
        this.seal(monster);
      } else if (def.star && (monster || ally)) {
        this.starHit(def.star, name, monster, ally);
      } else if (def.heal && hitName && hitPos) {
        const target = ally ? ally.card : monster!;
        const heal = Math.min(this.rng.int(...def.heal), target.maxHp - target.hp);
        target.hp += heal;
        this.addLog(`${name}を投げた → ${hitName}のHP+${heal}`);
        this.popups.push({ pos: hitPos, text: `+${heal}`, kind: 'info' });
      } else if (def.cure && hitName) {
        this.addLog(`${name}を投げた`);
        this.cure(def.cure, ally ? ally.ailments : monster!.ailments, hitName);
      } else if (monster && !def.seal) {
        this.damageMonster(monster, this.throwDamage(item), null, `投げた${name}`);
      } else {
        this.landItem(item, landing);
      }
    }, throwFx);
    this.endTurn();
  }

  /** 投げたときのダメージ。武器は上がる攻撃力、盾は上がる防御力の半分、それ以外は1 */
  private throwDamage(item: Item): number {
    const slot = ITEMS[item.kind].slot;
    if (slot === 'weapon') return equipBonus(item);
    if (slot === 'shield') return Math.max(1, Math.floor(equipBonus(item) / 2));
    return THROW_DAMAGE;
  }

  /**
   * 矢を1本、向いている方向に撃つ。通常攻撃のダメージに矢の倍率をかける。命中率は通常攻撃と同じ。
   * 外れたり何にも当たらなかった矢は床に落ちる
   */
  private shoot(stack: Item): void {
    const p = this.player;
    const def = ITEMS[stack.kind];
    // 1本だけ取り出す。最後の1本なら、まとまりごとなくなる
    if ((stack.count ?? 1) > 1) stack.count! -= 1;
    else this.release(stack);
    const arrow = createItem(stack.kind, 1);
    const { monster, landing } = this.traceThrow(false);
    const shootFx: SceneFx = { action: 'shoot', cells: this.lineCells(p.pos, landing), item: stack.kind };
    this.scene(p.pos, this.ahead(p.pos, p.facing), () => {
      if (monster && this.rng.chance(HIT_RATE)) {
        const atk = Math.round(this.attackPower() * (def.arrow ?? 1));
        this.damageMonster(monster, rollDamage(this.rng, atk, monster.def), null, def.name);
        return;
      }
      if (monster) {
        this.addLog(`${monster.species.name}はかわした`);
        this.popups.push({ pos: monster.pos, text: 'ミス', kind: 'miss' });
      }
      this.landItem(arrow, landing);
    }, shootFx);
  }

  /** 床に落とす。そのマスに置けなければまわりに落とし、どこにも置けなければなくなる */
  private landItem(item: Item, at: Pos): void {
    const { name } = ITEMS[item.kind];
    // 矢は、同じ矢が落ちているマスならそこにまとめる
    const sameArrow = (x: number, y: number) => {
      const there = this.itemAt(x, y)?.item;
      return item.count !== undefined && there?.kind === item.kind && (there.count ?? 0) + item.count <= ARROW_STACK;
    };
    const canLand = (x: number, y: number) =>
      this.map.isWalkable(x, y) && this.map.get(x, y) !== Tile.Stairs && (!this.itemAt(x, y) || sameArrow(x, y));
    let spot: Pos | null = canLand(at.x, at.y) ? at : null;
    for (const v of DIR_VECTORS) {
      if (spot) break;
      if (canLand(at.x + v.x, at.y + v.y)) spot = { x: at.x + v.x, y: at.y + v.y };
    }
    if (!spot) {
      this.addLog(`${name}は消えた`);
      return;
    }
    const there = this.itemAt(spot.x, spot.y)?.item;
    if (there && there.count !== undefined) there.count += item.count ?? 1;
    else this.floorItems.push({ item, pos: spot });
    this.addLog(item.kind === 'blank' ? '白紙カードは外れた' : `${name}は床に落ちた`);
  }

  /** バッグか足もとから取り出す */
  private release(item: Item): void {
    if (this.bag.includes(item)) this.removeFromBag(item);
    else this.floorItems = this.floorItems.filter((f) => f.item !== item);
  }

  private removeFromBag(item: Item): void {
    this.bag = this.bag.filter((i) => i !== item);
    const p = this.player;
    if (p.weapon === item) p.weapon = null;
    if (p.shield === item) p.shield = null;
  }

  wait(): void {
    this.beginAction();
    this.endTurn();
  }

  /**
   * 向いている方向を攻撃する。誰もいなくても1ターン使う。
   * 混乱しているときは、まわり8方向と足もとの9か所からでたらめに選ぶ。足もとなら空振りする
   */
  attack(): void {
    const p = this.player;
    this.beginAction();
    if (p.ailments.confused > 0) {
      const pick = this.rng.int(0, 8);
      if (pick === 8) {
        this.addLog('あなたは混乱して空振りした');
        this.endTurn();
        return;
      }
      p.facing = pick as Dir;
    }
    this.strike();
    this.endTurn();
  }

  /** 向いている方向を攻撃する */
  private strike(): void {
    const p = this.player;
    const v = DIR_VECTORS[p.facing];
    const target = this.monsterAt(p.pos.x + v.x, p.pos.y + v.y);
    // 壁の角越しには斜めに攻撃できない
    const reachable = !isDiagonal(p.facing) || this.map.canStep(p.pos, p.facing);
    // 誰もいなくても、振りかぶる動きは見せる
    this.scene(p.pos, this.ahead(p.pos, p.facing), () => {
      if (!target || !reachable) return;
      if (this.rng.chance(HIT_RATE)) {
        this.damageMonster(target, rollDamage(this.rng, this.attackPower(), target.def), null, '攻撃');
      } else {
        this.addLog(`${target.species.name}はかわした`);
        this.popups.push({ pos: target.pos, text: 'ミス', kind: 'miss' });
      }
    });
  }

  /** by が null なら主人公の攻撃。how は「攻撃」「火の魔法」など、ログに出す行動の名前。与えたダメージを返す */
  private damageMonster(m: Monster, raw: number, by: Ally | null, how: string): number {
    const dmg = fortified(raw, m.ailments);
    m.hp -= dmg;
    this.wake(m.ailments);
    m.dormant = false;
    this.popups.push({ pos: m.pos, text: `${dmg}`, kind: 'damage' });
    // 攻撃された魔物は、見えていなくても主人公に気づく
    m.lastSeen = { ...this.player.pos };
    this.addLog(`${by ? by.card.species.name : 'あなた'}の${how} → ${m.species.name}に${dmg}ダメージ`);
    if (m.hp <= 0) this.defeatMonster(m, by, true);
    return dmg;
  }

  /**
   * 魔物をたおしたとき。経験値を山分けし、ときどきカードを落とす。
   * byPlayer が false（毒でたおれたなど）なら、とどめの上乗せはない
   */
  private defeatMonster(m: Monster, by: Ally | null, byPlayer: boolean, drop = true): void {
    this.monsters = this.monsters.filter((x) => x !== m);
    this.stats.kills++;
    if (this.provoker === m) this.provoker = null;
    const exp = monsterExp(m);
    this.addLog(byPlayer ? `${m.species.name}をたおした（経験値${exp}）` : `${m.species.name}は毒でたおれた（経験値${exp}）`);
    this.shareExp(exp, by, byPlayer);
    if (drop && this.rng.chance(dropChance(m.species))) {
      this.addCard(createCard(m.species, true, this.rng.pick(PERSONALITY_IDS), m.level));
    }
  }

  /** 経験値を主人公と召喚中の仲間で山分けし、とどめを刺した者は1.5倍もらう（balance.md 4.3） */
  private shareExp(total: number, killer: Ally | null, bonus = true): void {
    const share = total / (1 + this.allies.length);
    this.gainExp(bonus && killer === null ? share * 1.5 : share);
    for (const a of [...this.allies]) this.gainAllyExp(a, bonus && a === killer ? share * 1.5 : share);
  }

  private gainExp(amount: number): void {
    const p = this.player;
    p.exp += amount;
    const next = playerLevelForExp(p.exp);
    while (p.level < next) {
      p.level++;
      p.maxHp += 5;
      p.hp += 5;
      p.maxMp += 2;
      p.mp += 2;
      p.atk += 1;
      p.def += 1;
      this.addLog(`あなたはLv${p.level}になった！`);
      this.popups.push({ pos: p.pos, text: 'Lv UP', kind: 'info' });
    }
  }

  private gainAllyExp(a: Ally, amount: number): void {
    const card = a.card;
    card.exp += amount;
    const next = allyLevelForExp(card.exp);
    while (card.level < next) {
      growCard(card);
      this.addLog(`${cardName(card)}はLv${card.level}になった！`);
      this.popups.push({ pos: a.pos, text: 'Lv UP', kind: 'info' });
    }
  }

  // ---- カード ----

  /** 召喚できないときは、その理由を返す */
  summonProblem(card: Card): string | null {
    if (card.status === 'dying') return '瀕死の仲間はこのダンジョンでは召喚できない';
    if (card.status === 'summoned') return 'すでに召喚している';
    if (this.allies.length >= SUMMON_LIMIT) return `同時に召喚できるのは${SUMMON_LIMIT}体まで`;
    if (this.player.mp < card.species.cost) return 'MPが足りない';
    if (!this.freeSpotNear(this.player.pos)) return 'まわりに空いている場所がない';
    return null;
  }

  /** カードの魔物を、主人公の隣に呼び出す。MPを使い、1ターンかかる */
  summon(card: Card): void {
    if (this.summonProblem(card)) return;
    this.beginAction();
    this.player.mp -= card.species.cost;
    this.placeAlly(card);
    this.endTurn();
  }

  /** カードの魔物を主人公の隣に出す */
  private placeAlly(card: Card): void {
    card.status = 'summoned';
    this.allies.push({ card, pos: this.freeSpotNear(this.player.pos)!, facing: this.player.facing, order: 'follow', ailments: noAilments() });
    this.addLog(`${cardName(card)}を召喚した`);
  }

  /** 仲間をカードに戻す。MPは使わないが、1ターンかかる */
  recall(card: Card): void {
    if (card.status !== 'summoned') return;
    this.beginAction();
    this.dismissAlly(card);
    this.addLog(`${cardName(card)}を戻した`);
    this.endTurn();
  }

  private dismissAlly(card: Card): void {
    this.allies = this.allies.filter((a) => a.card !== card);
    if (card.status === 'summoned') card.status = 'ready';
  }

  /** 手元に加える。いっぱいなら、預けるか別れるカードを選ぶまで pendingCard で待つ */
  private addCard(card: Card): void {
    this.stats.cards++;
    if (this.cards.length < HAND_LIMIT) {
      this.cards.push(card);
      this.addLog(`${card.species.name}が仲間になった（性格：${PERSONALITIES[card.personality].name}）`);
      return;
    }
    this.pendingCard = card;
    this.addLog(
      `${card.species.name}が仲間になった（性格：${PERSONALITIES[card.personality].name}）\n仲間がいっぱいのため 預けるか別れる仲間を選んでください`,
    );
  }

  /** 拠点の保管庫へ預けられるか。預けられるのは、ダンジョンに持ってきたカードだけ（requirements.md 5.6） */
  canStore(card: Card): boolean {
    return !card.obtainedHere;
  }

  /** pendingCard があるとき、手元の5枚と新しい1枚のうち index のカードを保管庫へ預ける。ターンは使わない */
  sendToStorage(index: number): void {
    const card = this.pendingCard && [...this.cards, this.pendingCard][index];
    if (!card || !this.canStore(card)) return;
    const chosen = this.pickFromFull(index)!;
    this.storage.push(chosen);
    this.addLog(`${cardName(chosen)}を保管庫へ`);
  }

  /** pendingCard があるとき、index のカードの仲間と別れる。カードはなくなる。ターンは使わない */
  partWith(index: number): void {
    const chosen = this.pickFromFull(index);
    if (!chosen) return;
    this.addLog(`${cardName(chosen)}と別れた`);
  }

  /** 手元の5枚と新しい1枚から index のカードを外し、残りを手元にする */
  private pickFromFull(index: number): Card | null {
    const pending = this.pendingCard;
    if (!pending) return null;
    const all = [...this.cards, pending];
    const chosen = all[index];
    if (!chosen) return null;
    this.dismissAlly(chosen);
    this.cards = all.filter((c) => c !== chosen);
    this.pendingCard = null;
    return chosen;
  }

  /** 白紙カードが魔物に当たったとき。弱っているほど封印しやすい */
  private seal(target: Monster): void {
    if (this.rng.chance(captureChance(target.species.capture, target.hp / target.maxHp))) {
      this.monsters = this.monsters.filter((m) => m !== target);
      this.popups.push({ pos: target.pos, text: '封印', kind: 'info' });
      this.addLog(`${target.species.name}を封印した！`);
      this.addCard(createCard(target.species, true, this.rng.pick(PERSONALITY_IDS), target.level));
    } else {
      target.lastSeen = { ...this.player.pos };
      this.popups.push({ pos: target.pos, text: '失敗', kind: 'miss' });
      this.addLog('封印に失敗した');
    }
  }

  /**
   * 投げたアイテムが飛ぶ先。最初に当たる魔物（stopAtAlly なら仲間も）と、何にも当たらなかったときに止まるマス。
   * 壁の手前で止まる
   */
  private traceThrow(stopAtAlly: boolean): { monster?: Monster; ally?: Ally; landing: Pos } {
    let at = this.player.pos;
    const dir = this.player.facing;
    for (let i = 0; i < LINE_RANGE; i++) {
      if (!this.map.canStep(at, dir)) break;
      at = this.ahead(at, dir);
      const monster = this.monsterAt(at.x, at.y);
      if (monster) return { monster, landing: at };
      const ally = stopAtAlly ? this.allyAt(at.x, at.y) : undefined;
      if (ally) return { ally, landing: at };
    }
    return { landing: at };
  }

  /**
   * 主人公の向いている方向にまっすぐ進み、最初に当たる魔物と、そこまでに通るマス。仲間はすり抜け、壁で止まる。
   * 何にも当たらなければ、通るマスは壁の手前まで
   */
  private traceLine(): { monster?: Monster; cells: Pos[] } {
    let at = this.player.pos;
    const dir = this.player.facing;
    const cells: Pos[] = [];
    for (let i = 0; i < LINE_RANGE; i++) {
      if (!this.map.canStep(at, dir)) break;
      const v = DIR_VECTORS[dir];
      at = { x: at.x + v.x, y: at.y + v.y };
      cells.push(at);
      const m = this.monsterAt(at.x, at.y);
      if (m) return { monster: m, cells };
    }
    return { cells };
  }

  // ---- 魔法 ----

  /** いま使える魔法。雷の魔法はイヅツチを召喚している間だけ */
  availableSpells(): SpellId[] {
    const spells: SpellId[] = ['fire'];
    if (this.allies.some((a) => isPartner(a.card))) spells.push('thunder');
    if (this.allies.some((a) => a.card.species.special === 'breath')) spells.push('bigFire');
    for (const id of ['power', 'guard'] as const) if (this.learned.has(id)) spells.push(id);
    return spells;
  }

  /** 魔法のランク。覚えていない・無印なら0 */
  rankOf(spell: SpellId): number {
    return this.ranks[spell] ?? 0;
  }

  /** ランクを付けた魔法の名前（例：力の魔法+2） */
  spellName(spell: SpellId): string {
    return rankedName(SPELLS[spell].name, this.rankOf(spell));
  }

  /** 魔法は必ず当たる。火は向いている方向の最初の魔物、雷はまわり8マスの魔物すべて */
  cast(spell: SpellId): void {
    const p = this.player;
    const { mp } = SPELLS[spell];
    const name = this.spellName(spell);
    if (p.mp < mp || !this.availableSpells().includes(spell)) return;
    this.beginAction();
    p.mp -= mp;
    if (spell === 'power' || spell === 'guard') {
      // 味方全体（主人公と召喚中の仲間）にかかる。あとから召喚した仲間にも、続いている間はかかる。
      // 続いている間にかけ直すと、残りターンが元に戻る
      if (spell === 'power') p.powerTurns = BUFF_TURNS;
      else p.guardTurns = BUFF_TURNS;
      const text = spell === 'power' ? '力UP' : '守りUP';
      const cells = [p.pos, ...this.allies.map((a) => a.pos)];
      this.scene(
        p.pos,
        p.pos,
        () => {
          this.addLog(`${name}を使った（味方全体）`);
          for (const at of cells) this.popups.push({ pos: { ...at }, text, kind: 'info' });
        },
        { action: spell, cells },
      );
      this.endTurn();
      return;
    }
    // 雷はまわり8マス、大火球は前の3マス幅、火は最初の魔物まで
    const line = spell === 'fire' ? this.traceLine() : undefined;
    const targets = line
      ? [line.monster].filter((m) => m !== undefined)
      : spell === 'bigFire'
        ? this.bigFireTargets()
        : this.monsters.filter((m) => distance(m.pos, p.pos) === 1);
    const cells = line
      ? line.cells
      : spell === 'bigFire'
        ? this.bigFireTiles()
        : DIR_VECTORS.map((v) => ({ x: p.pos.x + v.x, y: p.pos.y + v.y }));
    const dmg = spell === 'fire' ? 10 + p.level * 2 : spell === 'bigFire' ? 20 + p.level * 2 : 6 + p.level;
    this.scene(
      p.pos,
      this.ahead(p.pos, p.facing),
      () => {
        if (targets.length === 0) this.addLog(`${name}は外れた`);
        for (const m of targets) this.damageMonster(m, dmg, null, name);
      },
      { action: spell, cells },
    );
    this.endTurn();
  }

  /**
   * 大火球が当たる魔物。向いている方向へ5マス先まで、その列と左右の列の3マス幅。
   * 見えている魔物だけに当たり、仲間には当たらない
   */
  private bigFireTargets(): Monster[] {
    const tiles = this.bigFireTiles();
    return this.monsters.filter(
      (m) => this.isVisible(m.pos.x, m.pos.y) && tiles.some((t) => t.x === m.pos.x && t.y === m.pos.y),
    );
  }

  /** 大火球がかかるマス。前へ1マスずつ、まん中・左・右の順に並ぶ */
  private bigFireTiles(): Pos[] {
    const p = this.player;
    const v = DIR_VECTORS[p.facing];
    const tiles: Pos[] = [];
    for (let i = 1; i <= BIG_FIRE_RANGE; i++) {
      const c = { x: p.pos.x + v.x * i, y: p.pos.y + v.y * i };
      tiles.push(c, { x: c.x - v.y, y: c.y + v.x }, { x: c.x + v.y, y: c.y - v.x });
    }
    return tiles;
  }

  /** 階段を降りる。最下層の階段なら踏破 */
  descend(): void {
    if (this.floor >= this.dungeon.floors) {
      this.cleared = true;
      this.addLog('ダンジョンを踏破した！');
      return;
    }
    this.floor++;
    // 階段を降りると、主人公と仲間の混乱・毒は治る
    this.player.ailments = noAilments();
    for (const a of this.allies) {
      a.card.hp = Math.min(a.card.maxHp, a.card.hp + Math.ceil(a.card.maxHp * this.dungeon.allyStairsHeal));
      a.ailments = noAilments();
    }
    this.enterFloor();
    this.addLog(`B${this.floor}Fに降りた`);
  }

  // ---- 視界 ----

  isVisible(x: number, y: number): boolean {
    return this.map.inBounds(x, y) && this.visible[y * this.map.width + x] === 1;
  }

  isExplored(x: number, y: number): boolean {
    return this.map.inBounds(x, y) && this.explored[y * this.map.width + x] === 1;
  }

  /** 部屋の中なら部屋全体（壁と出入口を含む）、通路なら周囲1マスが見える */
  private updateVisibility(): void {
    const { map, visible, explored } = this;
    visible.fill(0);
    const { x: px, y: py } = this.player.pos;
    const room = map.roomAt(px, py);
    const [x0, y0, x1, y1] = room
      ? [room.x - 1, room.y - 1, room.x + room.w, room.y + room.h]
      : [px - 1, py - 1, px + 1, py + 1];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y)) continue;
        visible[y * map.width + x] = 1;
        explored[y * map.width + x] = 1;
      }
    }
  }

  // ---- ターンの終わり ----

  /** 主人公が行動する直前に呼ぶ。この行動のログから新しいターンの番号で記録される */
  private beginAction(): void {
    this.turn++;
    this.popups = [];
    this.scenes = [];
    this.actionLog = this.logSerial;
    this.actionHp = this.player.hp;
  }

  /**
   * 主人公の行動で出た文字（薬草の回復、魔力の水など）を、仲間と魔物が動く前の場面にする。
   * こうしないと、回復の数字やログが、魔物の攻撃を見せ終わったあとに出てしまう
   */
  private showOwnAction(): void {
    if (this.popups.length === 0) return;
    const last = this.scenes[this.scenes.length - 1];
    this.scenes.push({
      actors: this.actorViews(),
      attacker: -1,
      toward: { ...this.player.pos },
      action: 'item',
      cells: [{ ...this.player.pos }],
      popups: this.popups.splice(0),
      logBefore: last ? last.logAfter : this.actionLog,
      logAfter: this.logSerial,
      hpBefore: last ? last.hpAfter : this.actionHp,
      hpAfter: this.player.hp,
    });
  }

  /** この行動で起きた攻撃の場面を取り出す。取り出すと空になる */
  takeScenes(): Scene[] {
    const scenes = this.scenes;
    this.scenes = [];
    return scenes;
  }

  /** 今マップに描くもの。魔物は見えているものだけ */
  actorViews(): ActorView[] {
    const p = this.player;
    const views: ActorView[] = [];
    for (const m of this.monsters) {
      if (!this.isVisible(m.pos.x, m.pos.y)) continue;
      views.push({
        emoji: m.species.emoji,
        art: m.species.id,
        key: `m${objectKey(m)}`,
        pos: { ...m.pos },
        facing: m.facing,
        hp: m.hp < m.maxHp ? { ratio: m.hp / m.maxHp, ally: false } : null,
        isPlayer: false,
        isPartner: false,
        enemy: true,
        sick: m.dormant ? '💤' : sickMark(m.ailments),
      });
    }
    // 仲間は敵と見分けやすいよう、足もとに緑のHPの棒をいつも出す
    for (const a of this.allies) {
      views.push({
        emoji: a.card.species.emoji,
        art: a.card.species.id,
        key: `a${a.card.id}`,
        pos: { ...a.pos },
        facing: a.facing,
        hp: { ratio: a.card.hp / a.card.maxHp, ally: true },
        isPlayer: false,
        isPartner: isPartner(a.card),
        enemy: false,
        sick: sickMark(a.ailments),
      });
    }
    views.push({ emoji: '🧙', art: 'player', key: 'player', pos: { ...p.pos }, facing: p.facing, hp: null, isPlayer: true, isPartner: false, enemy: false, sick: sickMark(p.ailments) });
    return views;
  }

  /**
   * attacker が toward へ攻撃する場面を記録しながら act を行う。act の中で出た文字はその場面で出す。
   * fx は演出の種類と範囲。省くと隣への攻撃
   */
  private scene(attacker: Pos, toward: Pos, act: () => void, fx: SceneFx = { action: 'attack' }): void {
    const actors = this.actorViews();
    const index = actors.findIndex((a) => a.pos.x === attacker.x && a.pos.y === attacker.y);
    const start = this.popups.length;
    const logBefore = this.logSerial;
    const hpBefore = this.player.hp;
    act();
    this.scenes.push({
      actors,
      attacker: index,
      toward: { ...toward },
      action: fx.action,
      cells: (fx.cells ?? [toward]).map((c) => ({ ...c })),
      item: fx.item,
      popups: this.popups.splice(start),
      logBefore,
      logAfter: this.logSerial,
      hpBefore,
      hpAfter: this.player.hp,
    });
  }

  /** 正面のマス */
  private ahead(at: Pos, dir: Dir): Pos {
    const v = DIR_VECTORS[dir];
    return { x: at.x + v.x, y: at.y + v.y };
  }

  /** from から to へまっすぐ（縦・横・斜め）並ぶマス。from は入れず、to は入れる */
  private lineCells(from: Pos, to: Pos): Pos[] {
    const sx = Math.sign(to.x - from.x);
    const sy = Math.sign(to.y - from.y);
    const cells: Pos[] = [];
    for (let i = 1; i <= distance(from, to); i++) cells.push({ x: from.x + sx * i, y: from.y + sy * i });
    return cells;
  }

  /** 主人公のあと、仲間、魔物の順に動く */
  private endTurn(): void {
    // 転送の印で脱出した・踏破したときは、その場でダンジョンを出る。仲間も魔物も動かない
    if (this.escaped || this.cleared) return;
    this.showOwnAction();
    // 主人公が動いた後の視界で、魔物が主人公に気づくかを決める
    this.updateVisibility();
    this.checkMonsterHouse();
    this.slowRest = !this.slowRest;
    // 主人公に近い仲間から動く。前の仲間が空けたマスに、後ろの仲間が続けて入れるようにする
    const { width, height } = this.map;
    this.followField = distanceField(width, height, this.player.pos, (at, d) => this.map.canStep(at, d));
    const allies = [...this.allies].sort((x, y) => this.followDistance(x.pos) - this.followDistance(y.pos));
    for (const a of allies) {
      for (let i = 0; i < this.actionsThisTurn(a.card.species); i++) this.allyAct(a);
    }
    for (const m of [...this.monsters]) {
      if (this.dead) break;
      for (let i = 0; i < this.actionsThisTurn(m.species) && !this.dead; i++) this.monsterAct(m);
    }
    this.digest();
    this.regenerate();
    this.tickBuffs();
    if (this.turn % SPAWN_INTERVAL === 0) this.spawnOutOfSight();
    this.updateVisibility();
  }

  private actionsThisTurn(species: Species): number {
    if (species.speed === 'fast') return 2;
    return species.speed === 'slow' && this.slowRest ? 0 : 1;
  }

  /** 満腹度は10ターンごとに1減る。減ってきたらログで知らせる */
  private digest(): void {
    const p = this.player;
    if (this.dead || p.food <= 0 || this.turn % FOOD_INTERVAL !== 0) return;
    p.food--;
    const warning = HUNGER_WARNINGS[p.food];
    if (warning) this.addLog(warning);
  }

  private tickBuffs(): void {
    const p = this.player;
    if (p.powerTurns > 0 && --p.powerTurns === 0) this.addLog('力の魔法が切れた');
    if (p.guardTurns > 0 && --p.guardTurns === 0) this.addLog('守りの魔法が切れた');
    if (this.dead) return;
    // 魔力の星：最大MPの2％ずつ。端数は、効いているあいだの合計で切り捨てる
    if (p.manaTurns > 0) {
      const done = STAR_TURNS - p.manaTurns;
      const gain = Math.floor(p.maxMp * MANA_RATE * (done + 1)) - Math.floor(p.maxMp * MANA_RATE * done);
      p.mp = Math.min(p.maxMp, p.mp + gain);
      if (--p.manaTurns === 0) this.addLog('魔力の星の効き目が切れた');
    }
    p.hp = Math.max(0, p.hp - poisonHit(p.ailments, p.maxHp));
    if (p.hp === 0) {
      this.dead = true;
      this.addLog('あなたは毒で力つきてしまった…');
      return;
    }
    this.tickAilments(p.ailments, 'あなた');
    for (const a of [...this.allies]) {
      a.card.hp = Math.max(0, a.card.hp - poisonHit(a.ailments, a.card.maxHp));
      if (a.card.hp === 0) {
        this.allies = this.allies.filter((x) => x !== a);
        a.card.status = 'dying';
        this.addLog(`${cardName(a.card)}は毒で瀕死になり召喚が解けた`);
        continue;
      }
      this.regenBody(a.card.species, a.card, a.ailments);
      this.tickAilments(a.ailments, cardName(a.card));
    }
    // 魔物の状態異常は、治ってもログには出さない
    for (const m of [...this.monsters]) {
      m.hp -= poisonHit(m.ailments, m.maxHp);
      if (m.hp <= 0) {
        this.defeatMonster(m, null, false);
        continue;
      }
      this.regenBody(m.species, m, m.ailments);
      if (m.ailments.confused > 0) m.ailments.confused--;
      if (m.ailments.poisoned > 0) m.ailments.poisoned--;
      // 魔物のはりつけは、攻撃されるまで解けない
      if (m.ailments.asleep > 0) m.ailments.asleep--;
      if (m.ailments.raged > 0) m.ailments.raged--;
      if (m.ailments.fortified > 0) m.ailments.fortified--;
    }
  }

  private tickAilments(ailments: Ailments, who: string): void {
    if (ailments.confused > 0 && --ailments.confused === 0) this.addLog(`${who}の混乱が治った`);
    if (ailments.poisoned > 0 && --ailments.poisoned === 0) this.addLog(`${who}の毒が消えた`);
    if (ailments.pinned > 0 && --ailments.pinned === 0) this.addLog(`${who}のはりつけが解けた`);
    if (ailments.asleep > 0 && --ailments.asleep === 0) this.addLog(`${who}は目を覚ました`);
    if (ailments.raged > 0 && --ailments.raged === 0) this.addLog(`${who}の激昂がおさまった`);
    if (ailments.fortified > 0 && --ailments.fortified === 0) this.addLog(`${who}の守りが元に戻った`);
  }

  /** 攻撃されると、はりつけと昏睡は解ける */
  private wake(ailments: Ailments): void {
    ailments.pinned = 0;
    ailments.asleep = 0;
  }

  /** 主人公がはりつけ・昏睡で動けない。画面は足踏みを続けて、ターンを進める */
  get helpless(): boolean {
    const a = this.player.ailments;
    return !this.dead && (a.pinned > 0 || a.asleep > 0);
  }

  /**
   * 攻撃が当たったあと、攻撃した側（from）の特技を受けるか。who はログに出す名前、target は受けた側。
   * MPを減らすのは主人公だけ。魔物のはりつけは、攻撃されるまで解けない
   */
  private afflict(from: Species, ailments: Ailments, who: string, target: 'player' | 'ally' | 'monster'): void {
    const kind = from.special;
    if (kind === undefined || kind === 'breath' || kind === 'drain') return;
    if (kind === 'manaBite' && target !== 'player') return;
    if (!this.rng.chance(AILMENT_CHANCE)) return;
    if (kind === 'spore') {
      ailments.confused = CONFUSE_TURNS;
      this.addLog(`${from.name}の胞子 → ${who}は混乱した`);
    } else if (kind === 'venom') {
      ailments.poisoned = POISON_TURNS;
      this.addLog(`${from.name}の毒 → ${who}は毒を受けた`);
    } else if (kind === 'sleep') {
      ailments.asleep = this.rng.int(...SLEEP_TURNS);
      this.addLog(`${from.name}の鱗粉 → ${who}は眠った`);
    } else if (kind === 'pin') {
      ailments.pinned = target === 'monster' ? 1 : this.rng.int(...PIN_TURNS);
      this.addLog(`${from.name}の糸 → ${who}ははりつけになった`);
    } else if (kind === 'manaBite') {
      const p = this.player;
      if (p.mp <= 0) return;
      const loss = Math.min(p.mp, Math.max(1, Math.round(p.maxMp * MANA_BITE)));
      p.mp -= loss;
      this.addLog(`${from.name}にかじられた → MPが${loss}減った`);
    }
  }

  /** 毎ターン、HPが少しずつ戻る魔物（フワクラ）。毒のあいだは戻らない */
  private regenBody(species: Species, body: { hp: number; maxHp: number }, ailments: Ailments): void {
    if (!species.regen || ailments.poisoned > 0 || body.hp <= 0 || body.hp >= body.maxHp) return;
    body.hp = Math.min(body.maxHp, body.hp + Math.max(1, Math.round(body.maxHp * species.regen)));
  }

  /** 主人公だけが自然回復する。仲間は回復しない。満腹度が0なら、回復せずに毎ターンHPが1減る */
  private regenerate(): void {
    const p = this.player;
    if (!this.dead && p.food <= 0) {
      this.regenCarry = 0;
      p.hp = Math.max(0, p.hp - 1);
      if (p.hp === 0) {
        this.dead = true;
        this.addLog('あなたは力つきてしまった…');
      }
      return;
    }
    if (this.dead || p.hp >= p.maxHp || p.ailments.poisoned > 0) {
      this.regenCarry = 0;
      return;
    }
    this.regenCarry += p.maxHp / REGEN_TURNS;
    const gain = Math.floor(this.regenCarry);
    this.regenCarry -= gain;
    p.hp = Math.min(p.maxHp, p.hp + gain);
  }

  /** 主人公から見えない部屋に、魔物を1体増やす */
  private spawnOutOfSight(): void {
    const here = this.map.roomAt(this.player.pos.x, this.player.pos.y);
    const rooms = this.map.rooms.filter((r) => r !== here);
    if (rooms.length > 0) this.spawnMonster(this.rng.pick(rooms));
  }

  /** 魔物（仲間も含む）がそのマスからその向きに進めるか。塞がっているかは別に見る */
  private canPass(species: Species, at: Pos, dir: Dir): boolean {
    if (!species.phasing) return this.map.canStep(at, dir);
    // 壁抜けの魔物も、マップの外周より外には出ない
    const v = DIR_VECTORS[dir];
    const x = at.x + v.x;
    const y = at.y + v.y;
    return x > 0 && y > 0 && x < this.map.width - 1 && y < this.map.height - 1;
  }

  /** from の隣にいて、角に邪魔されずに攻撃できる相手か */
  private canHitAdjacent(species: Species, from: Pos, to: Pos): boolean {
    const dir = dirFromDelta(to.x - from.x, to.y - from.y);
    return distance(from, to) === 1 && dir !== null && this.canPass(species, from, dir);
  }

  /** from から to がまっすぐ dist マス以内にあり、間のマスが空いているか */
  private isClearLine(from: Pos, to: Pos, maxDist: number): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = distance(from, to);
    const dir = dirFromDelta(dx, dy);
    const straight = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    if (!straight || dir === null || dist > maxDist) return false;
    let at = from;
    for (let i = 0; i < dist; i++) {
      if (!this.map.canStep(at, dir)) return false;
      const v = DIR_VECTORS[dir];
      at = { x: at.x + v.x, y: at.y + v.y };
      if (i < dist - 1 && this.isOccupied(at.x, at.y)) return false;
    }
    return true;
  }

  /** 他の魔物や仲間をよけて goal へ向かう1歩。塞がれていれば、よけない道で空くのを待つ */
  private stepToward(species: Species, from: Pos, goal: Pos): Dir | null {
    const { width, height } = this.map;
    return (
      firstStepToward(width, height, from, goal, (at, d, isGoal) => {
        if (!this.canPass(species, at, d)) return false;
        const v = DIR_VECTORS[d];
        return isGoal || !this.isOccupied(at.x + v.x, at.y + v.y);
      }) ?? firstStepToward(width, height, from, goal, (at, d) => this.canPass(species, at, d))
    );
  }

  private canMoveTo(species: Species, from: Pos, dir: Dir): boolean {
    const v = DIR_VECTORS[dir];
    return this.canPass(species, from, dir) && !this.isOccupied(from.x + v.x, from.y + v.y);
  }

  // ---- 魔物の行動 ----

  /** 魔物が今いる場所から主人公を攻撃できるか。舌などで数マス先まで届く魔物もいる */
  private canAttackPlayer(m: Monster): boolean {
    const p = this.player.pos;
    if (distance(m.pos, p) === 1) return this.canHitAdjacent(m.species, m.pos, p);
    return m.species.reach !== undefined && this.isClearLine(m.pos, p, m.species.reach);
  }

  private monsterAct(m: Monster): void {
    if (!this.monsters.includes(m)) return;
    const p = this.player.pos;
    if (this.isVisible(m.pos.x, m.pos.y)) m.lastSeen = { ...p };
    // はりつけ・昏睡の魔物と、モンスターハウスで眠っている魔物は動けない
    if (m.ailments.pinned > 0 || m.ailments.asleep > 0 || m.dormant) return;
    // 混乱している魔物は、ふつうに動くが、攻撃の向きがでたらめになる。火・舌などの離れた攻撃はしない
    const confused = m.ailments.confused > 0;

    // 火を吐く魔物は、まっすぐ4マス以内に主人公がいれば、ときどき火を吐く
    if (
      !confused &&
      m.species.special === 'breath' &&
      m.lastSeen !== null &&
      distance(m.pos, p) >= 2 &&
      this.isClearLine(m.pos, p, BREATH_RANGE) &&
      this.rng.chance(BREATH_CHANCE)
    ) {
      m.facing = dirFromDelta(p.x - m.pos.x, p.y - m.pos.y) ?? m.facing;
      this.player.facing = dirFromDelta(m.pos.x - p.x, m.pos.y - p.y) ?? this.player.facing;
      this.provoker = m;
      this.scene(m.pos, p, () => this.hurtPlayer(m, BREATH_DAMAGE, '火'), { action: 'breath', cells: this.lineCells(m.pos, p) });
      return;
    }

    // 主人公に届けば主人公を、届かなくても隣に仲間がいれば仲間を攻撃する
    let attackPlayer =
      m.lastSeen !== null && (confused ? this.canHitAdjacent(m.species, m.pos, p) : this.canAttackPlayer(m));
    let allyTarget = attackPlayer ? undefined : this.allies.find((a) => this.canHitAdjacent(m.species, m.pos, a.pos));
    if ((attackPlayer || allyTarget) && confused) {
      // 混乱：まわり8方向からでたらめに選んで攻撃する。そこに主人公か仲間がいれば当たり、いなければ空振り
      const dir = this.rng.pick([0, 1, 2, 3, 4, 5, 6, 7] as Dir[]);
      const at = this.ahead(m.pos, dir);
      const reach = (to: Pos) => to.x === at.x && to.y === at.y && this.canHitAdjacent(m.species, m.pos, to);
      attackPlayer = reach(p);
      allyTarget = attackPlayer ? undefined : this.allies.find((a) => reach(a.pos));
      if (!attackPlayer && !allyTarget) {
        m.facing = dir;
        this.scene(m.pos, at, () => this.logIfNear(m.pos, `${m.species.name}は混乱して空振りした`));
        return;
      }
    }
    if (attackPlayer || allyTarget) {
      const target = allyTarget?.pos ?? p;
      m.facing = dirFromDelta(target.x - m.pos.x, target.y - m.pos.y) ?? m.facing;
      // ふらつく魔物は、隣にいても半分の確率でその行動を失う
      if (m.species.erratic && this.rng.chance(0.5)) {
        this.logIfNear(m.pos, `${m.species.name}はふらついた`);
        return;
      }
      // 攻撃された側は、攻撃してきた方を向く
      const turnTo = dirFromDelta(m.pos.x - target.x, m.pos.y - target.y);
      if (turnTo !== null) {
        if (allyTarget) allyTarget.facing = turnTo;
        else this.player.facing = turnTo;
      }
      // ガルフ・パタリは、続けてもう1回攻撃する（相手が倒れたら、そこでやめる）
      const hits = m.species.twoHits ? 2 : 1;
      for (let i = 0; i < hits; i++) {
        if (this.dead || (allyTarget && !this.allies.includes(allyTarget))) break;
        const reach = distance(m.pos, target) > 1;
        this.scene(
          m.pos,
          target,
          () => {
            if (allyTarget) this.monsterAttackAlly(m, allyTarget);
            else this.monsterAttack(m);
          },
          reach ? { action: 'reach', cells: this.lineCells(m.pos, target) } : { action: 'attack' },
        );
      }
      return;
    }

    if (m.species.erratic && this.rng.chance(0.5)) {
      const dirs = ([0, 1, 2, 3, 4, 5, 6, 7] as Dir[]).filter((d) => this.canMoveTo(m.species, m.pos, d));
      this.logIfNear(m.pos, `${m.species.name}はふらふらと飛び回った`);
      if (dirs.length > 0) this.moveMonster(m, this.rng.pick(dirs));
      return;
    }

    if (m.lastSeen && m.lastSeen.x === m.pos.x && m.lastSeen.y === m.pos.y) m.lastSeen = null;
    if (m.wanderTarget && m.wanderTarget.x === m.pos.x && m.wanderTarget.y === m.pos.y) m.wanderTarget = null;
    if (!m.lastSeen && !m.wanderTarget) {
      m.wanderTarget = randomFreePointIn(this.rng, this.map, this.rng.pick(this.map.rooms));
    }
    const goal = m.lastSeen ?? m.wanderTarget!;
    const dir = this.stepToward(m.species, m.pos, goal);

    if (dir !== null && this.canMoveTo(m.species, m.pos, dir)) {
      this.moveMonster(m, dir);
    } else if (dir === null) {
      // たどり着けない場所なら、別の行き先を選び直す
      m.wanderTarget = null;
      m.lastSeen = null;
    } else if (!m.lastSeen) {
      // うろついている途中で道を塞がれたら、魔物どうしで譲り合えるよう行き先を変える
      m.wanderTarget = null;
    }
  }

  private moveMonster(m: Monster, dir: Dir): void {
    const v = DIR_VECTORS[dir];
    const to = { x: m.pos.x + v.x, y: m.pos.y + v.y };
    if (m.species.phasing && this.map.isWalkable(m.pos.x, m.pos.y) && !this.map.isWalkable(to.x, to.y)) {
      // 隣から壁の中へ逃げたとき
      this.logIfNear(m.pos, `${m.species.name}は壁に消えた`);
    } else if (m.species.phasing && !this.map.isWalkable(m.pos.x, m.pos.y) && this.map.isWalkable(to.x, to.y)) {
      // 壁の中から出て、隣に来たとき
      this.logIfNear(to, `${m.species.name}が壁から出た`);
    }
    m.facing = dir;
    m.pos = to;
  }

  /**
   * 魔物の特殊な動きは、主人公の隣で起きたときだけログに残す。
   * ログには主人公に関わることだけを書く。誰が何をしたかだけを書き、その結果（攻撃しなかった、など）は書かない
   */
  private logIfNear(at: Pos, text: string): void {
    if (distance(at, this.player.pos) <= 1) this.addLog(text);
  }

  private monsterAttack(m: Monster): void {
    const p = this.player;
    // 2マス先から届くのはベロッグの舌と、ヌラリカの触手。ログで普通の攻撃と見分けられるようにする
    const ranged = distance(m.pos, p.pos) > 1;
    const how = ranged ? `${m.species.reachName ?? '舌'}の攻撃` : '攻撃';
    // 離れたところから攻撃してきた魔物には、仲間が近づいて戦う
    if (ranged) this.provoker = m;
    if (!this.rng.chance(HIT_RATE)) {
      this.addLog('あなたはかわした');
      this.popups.push({ pos: p.pos, text: 'ミス', kind: 'miss' });
      return;
    }
    const dmg = this.hurtPlayer(m, rollDamage(this.rng, raged(m.atk, m.ailments), this.defensePower()), how);
    this.drain(m.species, m, dmg, m.species.name);
    if (!this.dead) this.afflict(m.species, p.ailments, 'あなた', 'player');
  }

  /** 魔物から主人公へのダメージ。守りの魔法がかかっていれば減らす。与えたダメージを返す */
  private hurtPlayer(m: Monster, raw: number, how: string): number {
    const p = this.player;
    const dmg = fortified(this.guarded(raw), p.ailments);
    p.hp = Math.max(0, p.hp - dmg);
    this.wake(p.ailments);
    this.addLog(`${m.species.name}の${how} → あなたに${dmg}ダメージ`);
    this.popups.push({ pos: p.pos, text: `${dmg}`, kind: 'hurt' });
    if (p.hp === 0) {
      this.dead = true;
      this.addLog('あなたは力つきてしまった…');
    }
    return dmg;
  }

  /** チスイの特技。与えたダメージの半分（切り捨て）だけ、攻撃した側（body）のHPが戻る */
  private drain(species: Species, body: { hp: number; maxHp: number }, dmg: number, name: string): void {
    if (species.special !== 'drain' || body.hp <= 0) return;
    const gain = Math.min(body.maxHp - body.hp, Math.floor(dmg * DRAIN_RATE));
    if (gain <= 0) return;
    body.hp += gain;
    this.addLog(`${name}はHPを${gain}吸い取った`);
  }

  private monsterAttackAlly(m: Monster, a: Ally): void {
    const name = cardName(a.card);
    if (!this.rng.chance(HIT_RATE)) {
      this.addLog(`${name}はかわした`);
      this.popups.push({ pos: a.pos, text: 'ミス', kind: 'miss' });
      return;
    }
    const dmg = fortified(this.guarded(rollDamage(this.rng, raged(m.atk, m.ailments), a.card.def)), a.ailments);
    a.card.hp = Math.max(0, a.card.hp - dmg);
    this.wake(a.ailments);
    this.addLog(`${m.species.name}の攻撃 → ${name}に${dmg}ダメージ`);
    this.popups.push({ pos: a.pos, text: `${dmg}`, kind: 'hurt' });
    this.drain(m.species, m, dmg, m.species.name);
    if (a.card.hp === 0) {
      this.allies = this.allies.filter((x) => x !== a);
      a.card.status = 'dying';
      this.addLog(`${name}は瀕死になり召喚が解けた`);
      return;
    }
    this.afflict(m.species, a.ailments, name, 'ally');
  }

  // ---- 仲間の行動（ついてくる） ----

  /**
   * 1. 隣に魔物がいれば、HPがいちばん少ない魔物を攻撃する
   * 2. イヅツチは、まっすぐ2マス先の魔物に、ときどき「いかずち」を飛ばす（必ず当たる）
   * 3. 離れたところから主人公を攻撃してきた魔物が見えていれば、近づく
   * 4. それ以外は主人公についていく。自分から魔物には近づかず、なるべく魔物の隣に入らない
   */
  private allyAct(a: Ally): void {
    if (!this.allies.includes(a)) return;
    const species = a.card.species;
    // はりつけ・昏睡の仲間は動けない
    if (a.ailments.pinned > 0 || a.ailments.asleep > 0) return;
    // 混乱している仲間は、ふつうに動くが、攻撃の向きがでたらめになる。いかずち・火は使わない
    const confused = a.ailments.confused > 0;
    // 逃げる：近くに魔物がいれば、まず離れる。逃げ場がなければ、その場で戦う
    if (a.order === 'flee' && this.fleeStep(a)) return;
    const adjacent = this.monsters
      .filter((m) => this.canHitAdjacent(species, a.pos, m.pos))
      .sort((x, y) => x.hp - y.hp);
    if (adjacent.length > 0) {
      if (species.erratic && this.rng.chance(0.5)) return;
      let target = adjacent[0];
      if (confused) {
        // まわり8方向からでたらめに選ぶ。そこに魔物がいれば当たり、いなければ空振り
        const dir = this.rng.pick([0, 1, 2, 3, 4, 5, 6, 7] as Dir[]);
        const at = this.ahead(a.pos, dir);
        const hit = adjacent.find((m) => m.pos.x === at.x && m.pos.y === at.y);
        if (!hit) {
          a.facing = dir;
          this.scene(a.pos, at, () => this.addLog(`${cardName(a.card)}は混乱して空振りした`));
          return;
        }
        target = hit;
      }
      a.facing = dirFromDelta(target.pos.x - a.pos.x, target.pos.y - a.pos.y) ?? a.facing;
      // ガルフ・パタリは、続けてもう1回攻撃する（相手をたおしたら、そこでやめる）
      const hits = species.twoHits ? 2 : 1;
      for (let i = 0; i < hits && this.monsters.includes(target); i++) {
        this.scene(a.pos, target.pos, () => {
          if (this.rng.chance(HIT_RATE)) {
            const dmg = this.damageMonster(target, rollDamage(this.rng, this.allyAttack(a), target.def), a, '攻撃');
            this.drain(species, a.card, dmg, cardName(a.card));
            // 仲間のポコタケ・シュルルなどは、攻撃が当たった魔物を混乱・毒などにすることがある
            if (this.monsters.includes(target)) this.afflict(species, target.ailments, target.species.name, 'monster');
          } else {
            this.addLog(`${target.species.name}はかわした`);
            this.popups.push({ pos: target.pos, text: 'ミス', kind: 'miss' });
          }
        });
      }
      return;
    }

    if (!confused && isPartner(a.card) && this.rng.chance(LIGHTNING_CHANCE)) {
      const target = this.monsters.find((m) => distance(m.pos, a.pos) === 2 && this.isClearLine(a.pos, m.pos, 2));
      if (target) {
        a.facing = dirFromDelta(target.pos.x - a.pos.x, target.pos.y - a.pos.y) ?? a.facing;
        this.scene(
          a.pos,
          target.pos,
          () => this.damageMonster(target, rollDamage(this.rng, this.allyAttack(a), target.def), a, 'いかずち'),
          { action: 'lightning', cells: this.lineCells(a.pos, target.pos) },
        );
        return;
      }
    }

    // 火を吐く仲間は、まっすぐ4マス以内に見えている魔物に、ときどき火を吐く（必ず当たる）
    if (!confused && species.special === 'breath' && this.rng.chance(BREATH_CHANCE)) {
      const target = this.monsters.find(
        (m) => this.isVisible(m.pos.x, m.pos.y) && distance(m.pos, a.pos) >= 2 && this.isClearLine(a.pos, m.pos, BREATH_RANGE),
      );
      if (target) {
        a.facing = dirFromDelta(target.pos.x - a.pos.x, target.pos.y - a.pos.y) ?? a.facing;
        this.scene(a.pos, target.pos, () => this.damageMonster(target, this.allyAttack(a), a, '火'), {
          action: 'breath',
          cells: this.lineCells(a.pos, target.pos),
        });
        return;
      }
    }

    // 待機：その場から動かない（隣の魔物への攻撃と、いかずちはする）
    if (a.order === 'wait') return;

    // 突撃：見えている魔物のうち、いちばん近いものへ向かう。いなければついてくる
    if (a.order === 'charge') {
      const target = this.monsters
        .filter((m) => this.isVisible(m.pos.x, m.pos.y))
        .sort((x, y) => distance(x.pos, a.pos) - distance(y.pos, a.pos))[0];
      if (target) {
        const dir = this.stepToward(species, a.pos, target.pos);
        if (dir !== null && this.canMoveTo(species, a.pos, dir)) this.moveAlly(a, dir);
        return;
      }
    }

    const provoker = this.provoker;
    if (provoker && (!this.monsters.includes(provoker) || !this.isVisible(provoker.pos.x, provoker.pos.y))) {
      this.provoker = null;
    }
    if (this.provoker) {
      const dir = this.stepToward(species, a.pos, this.provoker.pos);
      if (dir !== null && this.canMoveTo(species, a.pos, dir)) this.moveAlly(a, dir);
      return;
    }

    // 隣にいても、壁の角で斜めに進めないなら離れているのと同じ。曲がり角では主人公のいたマスに入る
    const p = this.player.pos;
    if (this.canHitAdjacent(species, a.pos, p)) return;
    const dir = this.followStep(a);
    if (dir !== null) this.moveAlly(a, dir);
  }

  /**
   * 逃げる仲間の1歩。4マス以内に見えている魔物がいれば、いちばん近い魔物から遠ざかるマスへ進む。
   * 同じだけ遠ざかれるなら、主人公に近いマスを選ぶ。動いたら true
   */
  private fleeStep(a: Ally): boolean {
    const near = this.monsters.filter((m) => this.isVisible(m.pos.x, m.pos.y) && distance(m.pos, a.pos) <= 4);
    if (near.length === 0) return false;
    const danger = (at: Pos) => Math.min(...near.map((m) => distance(m.pos, at)));
    let best: Dir | null = null;
    let bestDanger = danger(a.pos);
    let bestFollow = this.followDistance(a.pos);
    for (const d of [0, 1, 2, 3, 4, 5, 6, 7] as Dir[]) {
      if (!this.canMoveTo(a.card.species, a.pos, d)) continue;
      const to = this.ahead(a.pos, d);
      const away = danger(to);
      const follow = this.followDistance(to);
      if (away > bestDanger || (away === bestDanger && best !== null && follow < bestFollow)) {
        best = d;
        bestDanger = away;
        bestFollow = follow;
      }
    }
    if (best === null) return false;
    this.moveAlly(a, best);
    return true;
  }

  /** 主人公までの歩数。たどり着けないマスはとても遠いものとする */
  private followDistance(at: Pos): number {
    const d = this.followField[at.y * this.map.width + at.x];
    return d === undefined || d < 0 ? 9999 : d;
  }

  /**
   * 主人公についていく1歩。まわり8マスのうち、空いていて、主人公までの歩数がいちばん少なくなるマスへ進む。
   * 前の仲間が塞いでいても、斜めに回り込んで間を空けない。近づけるマスがなければ待つ（遠回りはしない）。
   * 同じだけ近づけるなら、魔物の隣でないマスを選ぶ
   */
  private followStep(a: Ally): Dir | null {
    const species = a.card.species;
    let best: Dir | null = null;
    let bestDist = this.followDistance(a.pos);
    let bestSafe = false;
    for (const d of [0, 2, 4, 6, 1, 3, 5, 7] as Dir[]) {
      if (!this.canMoveTo(species, a.pos, d)) continue;
      const dist = this.followDistance(this.ahead(a.pos, d));
      if (dist >= this.followDistance(a.pos)) continue;
      const safe = !this.nextToMonster(a.pos, d);
      if (dist < bestDist || (dist === bestDist && safe && !bestSafe)) {
        best = d;
        bestDist = dist;
        bestSafe = safe;
      }
    }
    return best;
  }

  /** from から dir へ1歩進んだマスが、魔物の隣か */
  private nextToMonster(from: Pos, dir: Dir): boolean {
    const v = DIR_VECTORS[dir];
    const to = { x: from.x + v.x, y: from.y + v.y };
    return this.monsters.some((m) => distance(m.pos, to) === 1);
  }

  private moveAlly(a: Ally, dir: Dir): void {
    const v = DIR_VECTORS[dir];
    a.facing = dir;
    a.pos = { x: a.pos.x + v.x, y: a.pos.y + v.y };
  }
}
