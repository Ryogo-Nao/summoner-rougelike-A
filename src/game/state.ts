import { DIR_VECTORS, type Dir, type Pos } from './dir';
import { GameMap, Tile } from './map';

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
  map: GameMap;
  player: Player;
  floor = 1;
  turn = 0;
  log: string[] = [];

  constructor(map: GameMap, start: Pos) {
    this.map = map;
    this.player = {
      pos: { ...start },
      facing: 4,
      hp: 30,
      maxHp: 30,
      mp: 20,
      maxMp: 20,
      food: 100,
      maxFood: 100,
      level: 1,
    };
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
    if (this.map.get(p.pos.x, p.pos.y) === Tile.Stairs) {
      this.addLog('階段がある。');
    }
    return true;
  }

  wait(): void {
    this.endTurn();
  }

  private endTurn(): void {
    this.turn++;
  }
}
