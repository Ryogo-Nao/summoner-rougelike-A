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
