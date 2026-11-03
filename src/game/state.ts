import { DIR_VECTORS, type Dir, type Pos } from './dir';
import { generateFloor } from './dungeon';
import { GameMap, Tile } from './map';
import { Rng } from './rng';

/** MVPのダンジョンの階数（requirements.md 8章） */
export const MAX_FLOOR = 10;

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
}

export class GameState {
  readonly rng: Rng;
  map!: GameMap;
  player: Player;
  floor = 1;
  turn = 0;
  log: string[] = [];
  /** 一度でも見たマス（ミニマップと、暗く表示する範囲） */
  explored!: Uint8Array;
  /** 今見えているマス */
  visible!: Uint8Array;
  cleared = false;

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
    };
    this.enterFloor();
  }

  private enterFloor(): void {
    const { map, start } = generateFloor(this.rng);
    this.map = map;
    this.player.pos = start;
    this.explored = new Uint8Array(map.width * map.height);
    this.visible = new Uint8Array(map.width * map.height);
    this.updateVisibility();
  }

  get isOnStairs(): boolean {
    const { x, y } = this.player.pos;
    return this.map.get(x, y) === Tile.Stairs;
  }

  addLog(message: string): void {
    this.log.push(message);
    if (this.log.length > 50) this.log.shift();
  }

  /** 移動できたら true。向きは移動できなくても変わる */
  tryMove(dir: Dir): boolean {
    const p = this.player;
    p.facing = dir;
    if (!this.map.canStep(p.pos, dir)) return false;
    const v = DIR_VECTORS[dir];
    p.pos = { x: p.pos.x + v.x, y: p.pos.y + v.y };
    this.endTurn();
    return true;
  }

  wait(): void {
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
    this.enterFloor();
    this.addLog(`B${this.floor}Fに降りた。`);
  }

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

  private endTurn(): void {
    this.turn++;
    this.updateVisibility();
  }
}
