export interface Pos {
  x: number;
  y: number;
}

/** 0=上 から時計回りに 7=左上 */
export type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIR_VECTORS: readonly Pos[] = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
];

export function isDiagonal(dir: Dir): boolean {
  return dir % 2 === 1;
}

/** (dx, dy) の符号から向きを求める。どちらも0なら null */
export function dirFromDelta(dx: number, dy: number): Dir | null {
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const i = DIR_VECTORS.findIndex((v) => v.x === sx && v.y === sy);
  return i >= 0 ? (i as Dir) : null;
}

/** 縦横斜めの歩数（チェビシェフ距離） */
export function distance(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
