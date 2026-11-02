import { DIR_VECTORS, isDiagonal, type Dir, type Pos } from './dir';

export const enum Tile {
  Wall,
  Floor,
  Stairs,
}

export class GameMap {
  readonly width: number;
  readonly height: number;
  private readonly tiles: Tile[];

  constructor(width: number, height: number, tiles: Tile[]) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
  }

  /** '#'=壁 '.'=床 '>'=階段 の文字列配列から作る（ダンジョン生成ができるまでの仮） */
  static fromStrings(rows: string[]): GameMap {
    const width = Math.max(...rows.map((r) => r.length));
    const tiles: Tile[] = [];
    for (const row of rows) {
      for (let x = 0; x < width; x++) {
        const c = row[x] ?? '#';
        tiles.push(c === '.' ? Tile.Floor : c === '>' ? Tile.Stairs : Tile.Wall);
      }
    }
    return new GameMap(width, rows.length, tiles);
  }

  get(x: number, y: number): Tile {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return Tile.Wall;
    return this.tiles[y * this.width + x];
  }

  isWalkable(x: number, y: number): boolean {
    return this.get(x, y) !== Tile.Wall;
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
