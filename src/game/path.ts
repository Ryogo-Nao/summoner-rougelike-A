import { DIR_VECTORS, type Dir, type Pos } from './dir';

/** 縦横を先に試すと、通路で斜めにふらつかず自然な道筋になる */
const SEARCH_ORDER: readonly Dir[] = [0, 2, 4, 6, 1, 3, 5, 7];

/**
 * from から goal へ向かう最短経路の、最初の1歩の向きを幅優先探索で求める。
 * canStep(マス, 向き) でその向きに進めるかを判定する。goal 自体は塞がっていてもよい。
 * たどり着けなければ null
 */
export function firstStepToward(
  width: number,
  height: number,
  from: Pos,
  goal: Pos,
  canStep: (at: Pos, dir: Dir, isGoal: boolean) => boolean,
): Dir | null {
  if (from.x === goal.x && from.y === goal.y) return null;
  const firstDir = new Int8Array(width * height).fill(-1);
  const start = from.y * width + from.x;
  firstDir[start] = 8;
  const queue: Pos[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    const atFirst = firstDir[at.y * width + at.x];
    for (const dir of SEARCH_ORDER) {
      const v = DIR_VECTORS[dir];
      const x = at.x + v.x;
      const y = at.y + v.y;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = y * width + x;
      if (firstDir[i] !== -1) continue;
      const isGoal = x === goal.x && y === goal.y;
      if (!canStep(at, dir, isGoal)) continue;
      const d = atFirst === 8 ? dir : atFirst;
      if (isGoal) return d as Dir;
      firstDir[i] = d;
      queue.push({ x, y });
    }
  }
  return null;
}
