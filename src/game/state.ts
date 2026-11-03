import { HIT_RATE, levelForExp, rollDamage } from './combat';
import { DIR_VECTORS, dirFromDelta, distance, isDiagonal, type Dir, type Pos } from './dir';
import { generateFloor, randomFreePointIn } from './dungeon';
import { GameMap, Tile, type Room } from './map';
import { createMonster, speciesForFloor, type Monster } from './monsters';
import { firstStepToward } from './path';
import { Rng } from './rng';

/** MVPのダンジョンの階数（requirements.md 8章） */
export const MAX_FLOOR = 10;
/** 階に入ったときの魔物の数と、増える間隔（balance.md 6.1） */
const INITIAL_MONSTERS: [number, number] = [5, 7];
const SPAWN_INTERVAL = 40;
/** HPが全回復するまでのターン数（balance.md 1.4） */
const REGEN_TURNS = 150;

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
  popups: Popup[] = [];
  floor = 1;
  turn = 0;
  log: string[] = [];
  /** 一度でも見たマス（ミニマップと、暗く表示する範囲） */
  explored!: Uint8Array;
  /** 今見えているマス */
  visible!: Uint8Array;
  cleared = false;
  dead = false;
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
    };
    this.enterFloor();
  }

  private enterFloor(): void {
    const { map, start } = generateFloor(this.rng);
    this.map = map;
    this.player.pos = start;
    this.monsters = [];
    this.popups = [];
    this.explored = new Uint8Array(map.width * map.height);
    this.visible = new Uint8Array(map.width * map.height);

    // 最初の魔物は、主人公のいる部屋には置かない
    const startRoom = map.roomAt(start.x, start.y);
    const rooms = map.rooms.filter((r) => r !== startRoom);
    const count = this.rng.int(...INITIAL_MONSTERS);
    for (let i = 0; i < count; i++) this.spawnMonster(this.rng.pick(rooms));
    this.updateVisibility();
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

  addLog(message: string): void {
    this.log.push(message);
    if (this.log.length > 50) this.log.shift();
  }

  monsterAt(x: number, y: number): Monster | undefined {
    return this.monsters.find((m) => m.pos.x === x && m.pos.y === y);
  }

  private isOccupied(x: number, y: number): boolean {
    const p = this.player.pos;
    return (p.x === x && p.y === y) || this.monsterAt(x, y) !== undefined;
  }

  // ---- 主人公の行動。行動したら true を返し、そのあと魔物が動く ----

  /** 移動できたら true。魔物や壁で進めなければ向きだけ変わり、ターンは進まない */
  tryMove(dir: Dir): boolean {
    const p = this.player;
    p.facing = dir;
    const v = DIR_VECTORS[dir];
    if (!this.map.canStep(p.pos, dir) || this.monsterAt(p.pos.x + v.x, p.pos.y + v.y)) return false;
    this.popups = [];
    p.pos = { x: p.pos.x + v.x, y: p.pos.y + v.y };
    this.endTurn();
    return true;
  }

  wait(): void {
    this.popups = [];
    this.endTurn();
  }

  /** 向いている方向を攻撃する。誰もいなくても1ターン使う */
  attack(): void {
    this.popups = [];
    const p = this.player;
    const v = DIR_VECTORS[p.facing];
    const target = this.monsterAt(p.pos.x + v.x, p.pos.y + v.y);
    // 壁の角越しには斜めに攻撃できない
    const reachable = !isDiagonal(p.facing) || this.map.canStep(p.pos, p.facing);
    if (target && reachable) {
      if (this.rng.chance(HIT_RATE)) {
        const dmg = rollDamage(this.rng, p.atk, target.species.def);
        this.damageMonster(target, dmg);
      } else {
        this.addLog(`${target.species.name}に攻撃は外れた。`);
        this.popups.push({ pos: target.pos, text: 'ミス', kind: 'miss' });
      }
    }
    this.endTurn();
  }

  private damageMonster(m: Monster, dmg: number): void {
    m.hp -= dmg;
    this.popups.push({ pos: m.pos, text: `${dmg}`, kind: 'damage' });
    // 攻撃された魔物は、見えていなくても主人公に気づく
    m.lastSeen = { ...this.player.pos };
    if (m.hp > 0) {
      this.addLog(`${m.species.name}に${dmg}のダメージ。`);
      return;
    }
    this.monsters = this.monsters.filter((x) => x !== m);
    this.addLog(`${m.species.name}をたおした。経験値${m.species.exp}`);
    // 仲間を作ったら、経験値を山分けする（balance.md 4.3）
    this.gainExp(m.species.exp);
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
      this.addLog(`レベルが${p.level}に上がった！`);
      this.popups.push({ pos: p.pos, text: 'Lv UP', kind: 'info' });
    }
  }

  /** 階段を降りる。最下層の階段なら踏破 */
  descend(): void {
    if (this.floor >= MAX_FLOOR) {
      this.cleared = true;
      this.addLog('ダンジョンを踏破した！');
      return;
    }
    this.floor++;
    this.enterFloor();
    this.addLog(`B${this.floor}Fに降りた。`);
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

  private endTurn(): void {
    this.turn++;
    // 主人公が動いた後の視界で、魔物が主人公に気づくかを決める
    this.updateVisibility();
    this.slowRest = !this.slowRest;
    for (const m of [...this.monsters]) {
      if (this.dead) break;
      const actions = m.species.speed === 'fast' ? 2 : m.species.speed === 'slow' && this.slowRest ? 0 : 1;
      for (let i = 0; i < actions && !this.dead; i++) this.monsterAct(m);
    }
    this.regenerate();
    if (this.turn % SPAWN_INTERVAL === 0) this.spawnOutOfSight();
    this.updateVisibility();
  }

  private regenerate(): void {
    const p = this.player;
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

  // ---- 魔物の行動 ----

  /** 魔物がそのマスからその向きに進めるか。塞がっているかは別に見る */
  private monsterCanPass(m: Monster, at: Pos, dir: Dir): boolean {
    if (!m.species.phasing) return this.map.canStep(at, dir);
    // 壁抜けの魔物も、マップの外周より外には出ない
    const v = DIR_VECTORS[dir];
    const x = at.x + v.x;
    const y = at.y + v.y;
    return x > 0 && y > 0 && x < this.map.width - 1 && y < this.map.height - 1;
  }

  /** 魔物が今いる場所から主人公を攻撃できる向き。届かなければ null */
  private attackDir(m: Monster): Dir | null {
    const p = this.player.pos;
    const dx = p.x - m.pos.x;
    const dy = p.y - m.pos.y;
    const dist = distance(m.pos, p);
    const dir = dirFromDelta(dx, dy);
    if (dir === null) return null;
    if (dist === 1) return this.monsterCanPass(m, m.pos, dir) ? dir : null;
    // 舌などで、まっすぐ並んだ数マス先まで届く
    const straight = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    if (!m.species.reach || dist > m.species.reach || !straight) return null;
    let at = m.pos;
    for (let i = 0; i < dist; i++) {
      if (!this.map.canStep(at, dir)) return null;
      const v = DIR_VECTORS[dir];
      at = { x: at.x + v.x, y: at.y + v.y };
      if (i < dist - 1 && this.isOccupied(at.x, at.y)) return null;
    }
    return dir;
  }

  private monsterAct(m: Monster): void {
    if (!this.monsters.includes(m)) return;
    const p = this.player.pos;
    if (this.isVisible(m.pos.x, m.pos.y)) m.lastSeen = { ...p };

    const atk = m.lastSeen ? this.attackDir(m) : null;
    if (atk !== null) {
      m.facing = atk;
      this.monsterAttack(m);
      return;
    }

    if (m.species.erratic && this.rng.chance(0.5)) {
      const dirs = ([0, 1, 2, 3, 4, 5, 6, 7] as Dir[]).filter((d) => this.canMonsterMove(m, d));
      if (dirs.length > 0) this.moveMonster(m, this.rng.pick(dirs));
      return;
    }

    if (m.lastSeen && m.lastSeen.x === m.pos.x && m.lastSeen.y === m.pos.y) m.lastSeen = null;
    if (m.wanderTarget && m.wanderTarget.x === m.pos.x && m.wanderTarget.y === m.pos.y) m.wanderTarget = null;
    if (!m.lastSeen && !m.wanderTarget) {
      m.wanderTarget = randomFreePointIn(this.rng, this.map, this.rng.pick(this.map.rooms));
    }
    const goal = m.lastSeen ?? m.wanderTarget!;

    const { width, height } = this.map;
    // まず他の魔物をよけた道を探し、なければ魔物を無視した道で、空くのを待つ
    const dir =
      firstStepToward(width, height, m.pos, goal, (at, d, isGoal) => {
        if (!this.monsterCanPass(m, at, d)) return false;
        const v = DIR_VECTORS[d];
        return isGoal || !this.isOccupied(at.x + v.x, at.y + v.y);
      }) ?? firstStepToward(width, height, m.pos, goal, (at, d) => this.monsterCanPass(m, at, d));

    if (dir !== null && this.canMonsterMove(m, dir)) {
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

  private canMonsterMove(m: Monster, dir: Dir): boolean {
    const v = DIR_VECTORS[dir];
    return this.monsterCanPass(m, m.pos, dir) && !this.isOccupied(m.pos.x + v.x, m.pos.y + v.y);
  }

  private moveMonster(m: Monster, dir: Dir): void {
    const v = DIR_VECTORS[dir];
    m.facing = dir;
    m.pos = { x: m.pos.x + v.x, y: m.pos.y + v.y };
  }

  private monsterAttack(m: Monster): void {
    const p = this.player;
    if (!this.rng.chance(HIT_RATE)) {
      this.addLog(`${m.species.name}の攻撃は外れた。`);
      this.popups.push({ pos: p.pos, text: 'ミス', kind: 'miss' });
      return;
    }
    const dmg = rollDamage(this.rng, m.species.atk, p.def);
    p.hp = Math.max(0, p.hp - dmg);
    this.addLog(`${m.species.name}の攻撃。${dmg}のダメージ。`);
    this.popups.push({ pos: p.pos, text: `${dmg}`, kind: 'hurt' });
    if (p.hp === 0) {
      this.dead = true;
      this.addLog('力つきてしまった…');
    }
  }
}
