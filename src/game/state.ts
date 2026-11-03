import {
  ALLY_STAIRS_HEAL,
  HAND_LIMIT,
  IZUTSUCHI,
  LIGHTNING_CHANCE,
  SUMMON_LIMIT,
  captureChance,
  createCard,
  dropChance,
  growCard,
  isPartner,
  type Ally,
  type AllyOrder,
  type Card,
} from './cards';
import { HIT_RATE, levelForExp, rollDamage } from './combat';
import { DIR_VECTORS, dirFromDelta, distance, isDiagonal, type Dir, type Pos } from './dir';
import { generateFloor, randomFreePointIn } from './dungeon';
import { GameMap, Tile, type Room } from './map';
import { createMonster, speciesForFloor, type Monster, type Species } from './monsters';
import {
  BAG_LIMIT,
  HERB_HEAL,
  ITEMS,
  ITEMS_PER_FLOOR,
  THROW_DAMAGE,
  WATER_MP,
  createItem,
  randomItemKind,
  type FloorItem,
  type Item,
  type ItemKind,
} from './items';
import { distanceField, firstStepToward } from './path';
import { Rng } from './rng';

/** MVPのダンジョンの階数（requirements.md 8章） */
export const MAX_FLOOR = 10;
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
} as const;
export type SpellId = keyof typeof SPELLS;
/** 火の魔法と、投げた白紙カードが飛ぶ最大のマス数 */
const LINE_RANGE = 10;
/** 初めて遊ぶときのバッグの中身（balance.md 8章） */
const START_ITEMS: ItemKind[] = ['bread', 'herb', 'blank', 'blank'];
/** 満腹度が1減るまでのターン数と、知らせる満腹度（balance.md 1.5） */
const FOOD_INTERVAL = 10;
const HUNGER_WARNINGS: Record<number, string> = {
  20: 'おなかが減ってきた',
  10: 'おなかがペコペコだ',
  0: 'おなかが空いて倒れそうだ',
};
/** 力の魔法・守りの魔法が続くターン数と強さ（balance.md 2.1） */
const BUFF_TURNS = 20;
const POWER_RATE = 1.5;
const GUARD_RATE = 0.6;

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
  pos: Pos;
  facing: Dir;
  /** 足もとに出すHPの棒。null なら出さない */
  hp: { ratio: number; ally: boolean } | null;
  isPlayer: boolean;
  isPartner: boolean;
}

/**
 * 攻撃1回ぶんの場面。行動のあとに、起きた順に画面で再生する。
 * actors は攻撃する直前の様子。attacker（actors の番号、-1 ならいない）が toward へ踏み込み、popups が出る
 */
export interface Scene {
  actors: ActorView[];
  attacker: number;
  toward: Pos;
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
}

/** マップの上に一時的に出す文字（ダメージなど）。次の行動で消える */
export interface Popup {
  pos: Pos;
  text: string;
  kind: 'damage' | 'hurt' | 'miss' | 'info';
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
  /** 一度でも見たマス（ミニマップと、暗く表示する範囲） */
  explored!: Uint8Array;
  /** 今見えているマス */
  visible!: Uint8Array;
  cleared = false;
  dead = false;
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

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.player = {
      pos: { x: 0, y: 0 },
      facing: 4,
      hp: 30,
      maxHp: 30,
      mp: 20,
      maxMp: 20,
      food: 100,
      maxFood: 100,
      level: 1,
      exp: 0,
      atk: 5,
      def: 3,
      weapon: null,
      shield: null,
      powerTurns: 0,
      guardTurns: 0,
    };
    this.enterFloor();
  }

  private enterFloor(): void {
    const { map, start } = generateFloor(this.rng);
    this.map = map;
    this.player.pos = start;
    this.monsters = [];
    this.popups = [];
    this.provoker = null;
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
    const items = this.rng.int(...ITEMS_PER_FLOOR);
    for (let i = 0; i < items; i++) this.placeItem(this.rng.pick(map.rooms));
    this.updateVisibility();
  }

  /** 部屋の空いているマスに、アイテムを1つ置く。主人公の足もとと、他のアイテムの上には置かない */
  private placeItem(room: Room): void {
    for (let attempt = 0; attempt < 10; attempt++) {
      const pos = randomFreePointIn(this.rng, this.map, room);
      const p = this.player.pos;
      if ((pos.x === p.x && pos.y === p.y) || this.itemAt(pos.x, pos.y)) continue;
      this.floorItems.push({ item: createItem(randomItemKind(this.rng)), pos });
      return;
    }
  }

  itemAt(x: number, y: number): FloorItem | undefined {
    return this.floorItems.find((f) => f.pos.x === x && f.pos.y === y);
  }

  /** 部屋の空いているマスに、この階に出る魔物を1体置く。置けなければ何もしない */
  private spawnMonster(room: Room): void {
    const kinds = speciesForFloor(this.floor);
    for (let attempt = 0; attempt < 10; attempt++) {
      const pos = randomFreePointIn(this.rng, this.map, room);
      if (this.isOccupied(pos.x, pos.y)) continue;
      this.monsters.push(createMonster(this.rng.pick(kinds), pos));
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

  /** 仲間に指示を出す。ターンは使わない */
  setOrder(ally: Ally, order: AllyOrder): void {
    ally.order = order;
  }

  /** 隣の仲間の方へ進めるか（壁の角越しでないか） */
  canReachAlly(ally: Ally): boolean {
    const dir = dirFromDelta(ally.pos.x - this.player.pos.x, ally.pos.y - this.player.pos.y);
    return distance(ally.pos, this.player.pos) === 1 && dir !== null && this.map.canStep(this.player.pos, dir);
  }

  /** 仲間を、主人公から見て向こう側へ1マス押し出せるか */
  canPush(ally: Ally): boolean {
    const dir = dirFromDelta(ally.pos.x - this.player.pos.x, ally.pos.y - this.player.pos.y);
    return dir !== null && this.canReachAlly(ally) && this.canMoveTo(ally.card.species, ally.pos, dir);
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
      ally.pos = this.ahead(ally.pos, dir);
      ally.facing = dir;
    } else {
      ally.pos = { ...this.player.pos };
    }
  }

  /** 足もとのアイテムを拾う。バッグがいっぱいなら拾わない */
  private pickUp(): void {
    const { x, y } = this.player.pos;
    const found = this.itemAt(x, y);
    if (!found) return;
    const { name } = ITEMS[found.item.kind];
    if (this.bag.length >= BAG_LIMIT) {
      this.addLog(`バッグがいっぱいで${name}を拾えない`);
      return;
    }
    this.floorItems = this.floorItems.filter((f) => f !== found);
    this.bag.push(found.item);
    this.addLog(`${name}を拾った`);
  }

  /** 攻撃力と防御力。装備と、力の魔法の分を含む */
  attackPower(): number {
    const p = this.player;
    const atk = p.atk + (p.weapon ? (ITEMS[p.weapon.kind].bonus ?? 0) : 0);
    return p.powerTurns > 0 ? Math.round(atk * POWER_RATE) : atk;
  }

  defensePower(): number {
    const p = this.player;
    return p.def + (p.shield ? (ITEMS[p.shield.kind].bonus ?? 0) : 0);
  }

  // ---- バッグ ----

  /** アイテムの「使う」ボタンの名前。使えないアイテム（白紙カードは投げるだけ）は null */
  useLabel(item: Item): string | null {
    const def = ITEMS[item.kind];
    if (def.food) return '食べる';
    if (def.spell) return '読む';
    if (def.slot) return this.isEquipped(item) ? '外す' : '装備';
    if (item.kind === 'blank') return null;
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

  /** 使えない理由。使えるなら null */
  useProblem(item: Item): string | null {
    const spell = ITEMS[item.kind].spell;
    if (spell && this.learned.has(spell)) return `${SPELLS[spell].name}はもう覚えている`;
    return null;
  }

  /** アイテムを使う（食べる・飲む・読む・装備する・外す）。1ターンかかる */
  useItem(item: Item): void {
    if (!this.bag.includes(item) || this.useLabel(item) === null || this.useProblem(item)) return;
    const p = this.player;
    const def = ITEMS[item.kind];
    this.beginAction();
    if (def.slot) {
      const key = def.slot === 'weapon' ? 'weapon' : 'shield';
      if (p[key] === item) {
        p[key] = null;
        this.addLog(`${def.name}を外した`);
      } else {
        p[key] = item;
        this.addLog(`${def.name}を装備した`);
      }
      this.endTurn();
      return;
    }
    this.removeFromBag(item);
    if (def.food) {
      p.food = Math.min(p.maxFood, p.food + def.food);
      this.addLog(`${def.name}を食べた`);
    } else if (def.spell) {
      this.learned.add(def.spell);
      this.addLog(`${SPELLS[def.spell].name}を覚えた！`);
    } else if (item.kind === 'herb') {
      const heal = Math.min(HERB_HEAL, p.maxHp - p.hp);
      p.hp += heal;
      this.addLog(`薬草を使った（HP+${heal}）`);
      this.popups.push({ pos: p.pos, text: `+${heal}`, kind: 'info' });
    } else if (item.kind === 'water') {
      const gain = Math.min(WATER_MP, p.maxMp - p.mp);
      p.mp += gain;
      this.addLog(`魔力の水を飲んだ（MP+${gain}）`);
    }
    this.endTurn();
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
    this.addLog(`${ITEMS[item.kind].name}を置いた`);
    this.endTurn();
  }

  /**
   * 向いている方向に投げる。白紙カードは魔物の封印を試み、薬草は当たった相手（仲間も）を回復し、
   * それ以外は魔物に小さなダメージを与える。何にも当たらなければ、止まったところに落ちる
   */
  throwItem(item: Item): void {
    if (!this.bag.includes(item)) return;
    const p = this.player;
    const { name } = ITEMS[item.kind];
    this.beginAction();
    this.removeFromBag(item);
    const { monster, ally, landing } = this.traceThrow(item.kind === 'herb');
    this.scene(p.pos, this.ahead(p.pos, p.facing), () => {
      if (item.kind === 'blank' && monster) {
        this.seal(monster);
      } else if (item.kind === 'herb' && ally) {
        const heal = Math.min(HERB_HEAL, ally.card.maxHp - ally.card.hp);
        ally.card.hp += heal;
        this.addLog(`薬草を投げた → ${ally.card.species.name}のHP+${heal}`);
        this.popups.push({ pos: ally.pos, text: `+${heal}`, kind: 'info' });
      } else if (item.kind === 'herb' && monster) {
        const heal = Math.min(HERB_HEAL, monster.maxHp - monster.hp);
        monster.hp += heal;
        this.addLog(`薬草を投げた → ${monster.species.name}のHP+${heal}`);
        this.popups.push({ pos: monster.pos, text: `+${heal}`, kind: 'info' });
      } else if (monster) {
        this.damageMonster(monster, THROW_DAMAGE, null, `投げた${name}`);
      } else {
        this.landItem(item, landing);
      }
    });
    this.endTurn();
  }

  /** 床に落とす。そのマスに置けなければまわりに落とし、どこにも置けなければなくなる */
  private landItem(item: Item, at: Pos): void {
    const { name } = ITEMS[item.kind];
    const canLand = (x: number, y: number) =>
      this.map.isWalkable(x, y) && this.map.get(x, y) !== Tile.Stairs && !this.itemAt(x, y);
    let spot: Pos | null = canLand(at.x, at.y) ? at : null;
    for (const v of DIR_VECTORS) {
      if (spot) break;
      if (canLand(at.x + v.x, at.y + v.y)) spot = { x: at.x + v.x, y: at.y + v.y };
    }
    if (!spot) {
      this.addLog(`${name}は消えた`);
      return;
    }
    this.floorItems.push({ item, pos: spot });
    this.addLog(item.kind === 'blank' ? '白紙カードは外れた' : `${name}は床に落ちた`);
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

  /** 向いている方向を攻撃する。誰もいなくても1ターン使う */
  attack(): void {
    this.beginAction();
    const p = this.player;
    const v = DIR_VECTORS[p.facing];
    const target = this.monsterAt(p.pos.x + v.x, p.pos.y + v.y);
    // 壁の角越しには斜めに攻撃できない
    const reachable = !isDiagonal(p.facing) || this.map.canStep(p.pos, p.facing);
    // 誰もいなくても、振りかぶる動きは見せる
    this.scene(p.pos, this.ahead(p.pos, p.facing), () => {
      if (!target || !reachable) return;
      if (this.rng.chance(HIT_RATE)) {
        this.damageMonster(target, rollDamage(this.rng, this.attackPower(), target.species.def), null, '攻撃');
      } else {
        this.addLog(`${target.species.name}はかわした`);
        this.popups.push({ pos: target.pos, text: 'ミス', kind: 'miss' });
      }
    });
    this.endTurn();
  }

  /** by が null なら主人公の攻撃。how は「攻撃」「火の魔法」など、ログに出す行動の名前 */
  private damageMonster(m: Monster, dmg: number, by: Ally | null, how: string): void {
    m.hp -= dmg;
    this.popups.push({ pos: m.pos, text: `${dmg}`, kind: 'damage' });
    // 攻撃された魔物は、見えていなくても主人公に気づく
    m.lastSeen = { ...this.player.pos };
    this.addLog(`${by ? by.card.species.name : 'あなた'}の${how} → ${m.species.name}に${dmg}ダメージ`);
    if (m.hp > 0) return;
    this.monsters = this.monsters.filter((x) => x !== m);
    this.addLog(`${m.species.name}をたおした（経験値${m.species.exp}）`);
    this.shareExp(m.species.exp, by);
    if (this.rng.chance(dropChance(m.species))) {
      this.addLog(`${m.species.name}がカードを落とした`);
      this.addCard(createCard(m.species, true));
    }
  }

  /** 経験値を主人公と召喚中の仲間で山分けし、とどめを刺した者は1.5倍もらう（balance.md 4.3） */
  private shareExp(total: number, killer: Ally | null): void {
    const share = total / (1 + this.allies.length);
    this.gainExp(killer === null ? share * 1.5 : share);
    for (const a of [...this.allies]) this.gainAllyExp(a, a === killer ? share * 1.5 : share);
  }

  private gainExp(amount: number): void {
    const p = this.player;
    p.exp += amount;
    const next = levelForExp(p.exp);
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
    const next = levelForExp(card.exp);
    while (card.level < next) {
      growCard(card);
      this.addLog(`${card.species.name}はLv${card.level}になった！`);
      this.popups.push({ pos: a.pos, text: 'Lv UP', kind: 'info' });
    }
  }

  // ---- カード ----

  /** 召喚できないときは、その理由を返す */
  summonProblem(card: Card): string | null {
    if (card.status === 'dying') return '瀕死のカードはこのダンジョンでは召喚できない';
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
    card.status = 'summoned';
    this.allies.push({ card, pos: this.freeSpotNear(this.player.pos)!, facing: this.player.facing, order: 'follow' });
    this.addLog(`${card.species.name}を召喚した`);
    this.endTurn();
  }

  /** 仲間をカードに戻す。MPは使わないが、1ターンかかる */
  recall(card: Card): void {
    if (card.status !== 'summoned') return;
    this.beginAction();
    this.dismissAlly(card);
    this.addLog(`${card.species.name}を戻した`);
    this.endTurn();
  }

  private dismissAlly(card: Card): void {
    this.allies = this.allies.filter((a) => a.card !== card);
    if (card.status === 'summoned') card.status = 'ready';
  }

  /** 手元に加える。いっぱいなら、保管庫へ送るカードを選ぶまで pendingCard で待つ */
  private addCard(card: Card): void {
    if (this.cards.length < HAND_LIMIT) {
      this.cards.push(card);
      this.addLog(`${card.species.name}のカードを手に入れた`);
      return;
    }
    this.pendingCard = card;
    this.addLog(`${card.species.name}のカードを手に入れた（手持ちがいっぱいのため保管庫へ送るカードを選んでください）`);
  }

  /** pendingCard があるとき、手元の5枚と新しい1枚のうち index のカードを保管庫へ送る。ターンは使わない */
  sendToStorage(index: number): void {
    const pending = this.pendingCard;
    if (!pending) return;
    const all = [...this.cards, pending];
    const chosen = all[index];
    if (!chosen) return;
    this.dismissAlly(chosen);
    this.storage.push(chosen);
    this.cards = all.filter((c) => c !== chosen);
    this.pendingCard = null;
    this.addLog(`${chosen.species.name}を保管庫へ`);
  }

  /** 白紙カードが魔物に当たったとき。弱っているほど封印しやすい */
  private seal(target: Monster): void {
    if (this.rng.chance(captureChance(target.species.capture, target.hp / target.maxHp))) {
      this.monsters = this.monsters.filter((m) => m !== target);
      this.popups.push({ pos: target.pos, text: '封印', kind: 'info' });
      this.addLog(`${target.species.name}を封印した！`);
      this.addCard(createCard(target.species, true));
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

  /** 主人公の向いている方向にまっすぐ進み、最初に当たる魔物。仲間はすり抜け、壁で止まる */
  private traceLine(): Monster | undefined {
    let at = this.player.pos;
    const dir = this.player.facing;
    for (let i = 0; i < LINE_RANGE; i++) {
      if (!this.map.canStep(at, dir)) return undefined;
      const v = DIR_VECTORS[dir];
      at = { x: at.x + v.x, y: at.y + v.y };
      const m = this.monsterAt(at.x, at.y);
      if (m) return m;
    }
    return undefined;
  }

  // ---- 魔法 ----

  /** いま使える魔法。雷の魔法はイヅツチを召喚している間だけ */
  availableSpells(): SpellId[] {
    const spells: SpellId[] = ['fire'];
    if (this.allies.some((a) => isPartner(a.card))) spells.push('thunder');
    for (const id of ['power', 'guard'] as const) if (this.learned.has(id)) spells.push(id);
    return spells;
  }

  /** 魔法は必ず当たる。火は向いている方向の最初の魔物、雷はまわり8マスの魔物すべて */
  cast(spell: SpellId): void {
    const p = this.player;
    const { name, mp } = SPELLS[spell];
    if (p.mp < mp || !this.availableSpells().includes(spell)) return;
    this.beginAction();
    p.mp -= mp;
    if (spell === 'power' || spell === 'guard') {
      // 自分にかける魔法。続いている間にかけ直すと、残りターンが元に戻る
      if (spell === 'power') p.powerTurns = BUFF_TURNS;
      else p.guardTurns = BUFF_TURNS;
      this.addLog(`${name}を使った`);
      this.popups.push({ pos: p.pos, text: spell === 'power' ? '力UP' : '守りUP', kind: 'info' });
      this.endTurn();
      return;
    }
    const targets =
      spell === 'fire'
        ? [this.traceLine()].filter((m) => m !== undefined)
        : this.monsters.filter((m) => distance(m.pos, p.pos) === 1);
    const dmg = spell === 'fire' ? 10 + p.level * 2 : 6 + p.level;
    this.scene(p.pos, this.ahead(p.pos, p.facing), () => {
      if (targets.length === 0) this.addLog(`${name}は外れた`);
      for (const m of targets) this.damageMonster(m, dmg, null, name);
    });
    this.endTurn();
  }

  /** 階段を降りる。最下層の階段なら踏破 */
  descend(): void {
    if (this.floor >= MAX_FLOOR) {
      this.cleared = true;
      this.addLog('ダンジョンを踏破した！');
      return;
    }
    this.floor++;
    for (const a of this.allies) {
      a.card.hp = Math.min(a.card.maxHp, a.card.hp + Math.ceil(a.card.maxHp * ALLY_STAIRS_HEAL));
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
        pos: { ...m.pos },
        facing: m.facing,
        hp: m.hp < m.maxHp ? { ratio: m.hp / m.maxHp, ally: false } : null,
        isPlayer: false,
        isPartner: false,
      });
    }
    // 仲間は敵と見分けやすいよう、足もとに緑のHPの棒をいつも出す
    for (const a of this.allies) {
      views.push({
        emoji: a.card.species.emoji,
        pos: { ...a.pos },
        facing: a.facing,
        hp: { ratio: a.card.hp / a.card.maxHp, ally: true },
        isPlayer: false,
        isPartner: isPartner(a.card),
      });
    }
    views.push({ emoji: '🧙', pos: { ...p.pos }, facing: p.facing, hp: null, isPlayer: true, isPartner: false });
    return views;
  }

  /** attacker が toward へ攻撃する場面を記録しながら act を行う。act の中で出た文字はその場面で出す */
  private scene(attacker: Pos, toward: Pos, act: () => void): void {
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

  /** 主人公のあと、仲間、魔物の順に動く */
  private endTurn(): void {
    // 主人公が動いた後の視界で、魔物が主人公に気づくかを決める
    this.updateVisibility();
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
    if (this.dead || p.hp >= p.maxHp) {
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

    // 主人公に届けば主人公を、届かなくても隣に仲間がいれば仲間を攻撃する
    const attackPlayer = m.lastSeen !== null && this.canAttackPlayer(m);
    const allyTarget = attackPlayer ? undefined : this.allies.find((a) => this.canHitAdjacent(m.species, m.pos, a.pos));
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
      this.scene(m.pos, target, () => {
        if (allyTarget) this.monsterAttackAlly(m, allyTarget);
        else this.monsterAttack(m);
      });
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
    // 2マス先から届くのは今はベロッグの舌だけ。ログで普通の攻撃と見分けられるようにする
    const ranged = distance(m.pos, p.pos) > 1;
    const how = ranged ? '舌の攻撃' : '攻撃';
    // 離れたところから攻撃してきた魔物には、仲間が近づいて戦う
    if (ranged) this.provoker = m;
    if (!this.rng.chance(HIT_RATE)) {
      this.addLog('あなたはかわした');
      this.popups.push({ pos: p.pos, text: 'ミス', kind: 'miss' });
      return;
    }
    const raw = rollDamage(this.rng, m.species.atk, this.defensePower());
    const dmg = p.guardTurns > 0 ? Math.max(1, Math.round(raw * GUARD_RATE)) : raw;
    p.hp = Math.max(0, p.hp - dmg);
    this.addLog(`${m.species.name}の${how} → あなたに${dmg}ダメージ`);
    this.popups.push({ pos: p.pos, text: `${dmg}`, kind: 'hurt' });
    if (p.hp === 0) {
      this.dead = true;
      this.addLog('あなたは力つきてしまった…');
    }
  }

  private monsterAttackAlly(m: Monster, a: Ally): void {
    const name = a.card.species.name;
    if (!this.rng.chance(HIT_RATE)) {
      this.addLog(`${name}はかわした`);
      this.popups.push({ pos: a.pos, text: 'ミス', kind: 'miss' });
      return;
    }
    const dmg = rollDamage(this.rng, m.species.atk, a.card.def);
    a.card.hp = Math.max(0, a.card.hp - dmg);
    this.addLog(`${m.species.name}の攻撃 → ${name}に${dmg}ダメージ`);
    this.popups.push({ pos: a.pos, text: `${dmg}`, kind: 'hurt' });
    if (a.card.hp === 0) {
      this.allies = this.allies.filter((x) => x !== a);
      a.card.status = 'dying';
      this.addLog(`${name}は瀕死になりカードに戻った`);
    }
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
    // 逃げる：近くに魔物がいれば、まず離れる。逃げ場がなければ、その場で戦う
    if (a.order === 'flee' && this.fleeStep(a)) return;
    const adjacent = this.monsters
      .filter((m) => this.canHitAdjacent(species, a.pos, m.pos))
      .sort((x, y) => x.hp - y.hp);
    if (adjacent.length > 0) {
      if (species.erratic && this.rng.chance(0.5)) return;
      const target = adjacent[0];
      a.facing = dirFromDelta(target.pos.x - a.pos.x, target.pos.y - a.pos.y) ?? a.facing;
      this.scene(a.pos, target.pos, () => {
        if (this.rng.chance(HIT_RATE)) {
          this.damageMonster(target, rollDamage(this.rng, a.card.atk, target.species.def), a, '攻撃');
        } else {
          this.addLog(`${target.species.name}はかわした`);
          this.popups.push({ pos: target.pos, text: 'ミス', kind: 'miss' });
        }
      });
      return;
    }

    if (isPartner(a.card) && this.rng.chance(LIGHTNING_CHANCE)) {
      const target = this.monsters.find((m) => distance(m.pos, a.pos) === 2 && this.isClearLine(a.pos, m.pos, 2));
      if (target) {
        a.facing = dirFromDelta(target.pos.x - a.pos.x, target.pos.y - a.pos.y) ?? a.facing;
        this.scene(a.pos, target.pos, () =>
          this.damageMonster(target, rollDamage(this.rng, a.card.atk, target.species.def), a, 'いかずち'),
        );
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
