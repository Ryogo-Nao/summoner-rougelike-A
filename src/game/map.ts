import { DIR_VECTORS, isDiagonal, type Dir, type Pos } from './dir';

export const enum Tile {
  Wall,
  Floor,
  Stairs,
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class GameMap {
  readonly width: number;
  readonly height: number;
  readonly rooms: Room[];
  private readonly tiles: Tile[];
  /** 各マスがどの部屋に属するか。通路と壁は -1 */
  private readonly roomIds: Int16Array;

  constructor(width: number, height: number, tiles: Tile[], rooms: Room[] = []) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.rooms = rooms;
    this.roomIds = new Int16Array(width * height).fill(-1);
    rooms.forEach((r, id) => {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) this.roomIds[y * width + x] = id;
      }
    });
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Tile {
    if (!this.inBounds(x, y)) return Tile.Wall;
    return this.tiles[y * this.width + x];
  }

  set(x: number, y: number, tile: Tile): void {
    if (this.inBounds(x, y)) this.tiles[y * this.width + x] = tile;
  }

  /** そのマスがある部屋。部屋の外なら undefined */
  roomAt(x: number, y: number): Room | undefined {
    if (!this.inBounds(x, y)) return undefined;
    const id = this.roomIds[y * this.width + x];
    return id >= 0 ? this.rooms[id] : undefined;
  }

  isWalkable(x: number, y: number): boolean {
    return this.get(x, y) !== Tile.Wall;
  }

  /** 部屋のマスのうち、通路と接している出入口。ここには物を置かない */
  isEntrance(x: number, y: number): boolean {
    if (!this.roomAt(x, y)) return false;
    return [DIR_VECTORS[0], DIR_VECTORS[2], DIR_VECTORS[4], DIR_VECTORS[6]].some(
      (v) => this.isWalkable(x + v.x, y + v.y) && !this.roomAt(x + v.x, y + v.y),
    );
  }

  /** 斜め移動は、両隣のどちらかが壁なら角を抜けられない */
  canStep(from: Pos, dir: Dir): boolean {
    const v = DIR_VECTORS[dir];
    if (!this.isWalkable(from.x + v.x, from.y + v.y)) return false;
    if (isDiagonal(dir)) {
      return this.isWalkable(from.x + v.x, from.y) && this.isWalkable(from.x, from.y + v.y);
    }
    return true;
  }
}
