// テストで使う道具。決まった種（seed）で状態を作り、魔物や道具を置く
import { DIR_VECTORS, type Dir, type Pos } from '../src/game/dir';
import { SPECIES, createMonster, type Monster } from '../src/game/monsters';
import { GameState } from '../src/game/state';
import type { GameMap } from '../src/game/map';

export const DIRS = [0, 1, 2, 3, 4, 5, 6, 7] as Dir[];
/** 上・右・下・左（斜めは角に邪魔されることがあるので、置く場所はまっすぐの4方向にする） */
export const STRAIGHT = [0, 2, 4, 6] as Dir[];

export const species = (id: string) => {
  const s = SPECIES.find((x) => x.id === id);
  if (!s) throw new Error(`no species ${id}`);
  return s;
};

/** 魔物も床の道具もない状態。1回目のタップで振り向く設定は切る */
export function emptyState(seed = 1, dungeon = 'first'): GameState {
  const g = new GameState(seed, undefined, dungeon);
  g.monsters = [];
  g.floorItems = [];
  g.turnFirst = false;
  return g;
}

/** 主人公が倒れないようにする（魔物の攻撃を何度も見るテスト用） */
export function sturdy(g: GameState): void {
  g.player.maxHp = 9999;
  g.player.hp = 9999;
}

const occupied = (g: GameState, x: number, y: number) =>
  (g.player.pos.x === x && g.player.pos.y === y) ||
  g.monsters.some((m) => m.pos.x === x && m.pos.y === y) ||
  g.allies.some((a) => a.pos.x === x && a.pos.y === y);

/** at からまっすぐ dist マス先の、空いている床のマス。間も床であること */
export function freeAt(g: GameState, at: Pos, dist = 1): { pos: Pos; dir: Dir } | null {
  for (const dir of STRAIGHT) {
    const v = DIR_VECTORS[dir];
    let ok = true;
    for (let i = 1; i <= dist; i++) {
      const x = at.x + v.x * i;
      const y = at.y + v.y * i;
      if (!g.map.isWalkable(x, y) || occupied(g, x, y)) ok = false;
    }
    if (ok) return { pos: { x: at.x + v.x * dist, y: at.y + v.y * dist }, dir };
  }
  return null;
}

/** 主人公からまっすぐ dist マス先に魔物を置く。置けなければ null（その種は飛ばす） */
export function placeMonster(g: GameState, id: string, dist = 1, level = 1): { m: Monster; dir: Dir } | null {
  const spot = freeAt(g, g.player.pos, dist);
  if (!spot) return null;
  const m = createMonster(species(id), spot.pos, level);
  m.lastSeen = { ...g.player.pos };
  g.monsters.push(m);
  return { m, dir: spot.dir };
}

/** 新しく出たログの文 */
export function logsSince(g: GameState, run: () => void): string[] {
  const before = g.log.length ? g.log[g.log.length - 1].serial : 0;
  run();
  return g.log.filter((e) => e.serial > before).map((e) => e.text);
}

/** from から歩いて行けるマス（斜めは角を抜けられるときだけ） */
export function reachable(map: GameMap, from: Pos): Set<number> {
  const seen = new Set<number>([from.y * map.width + from.x]);
  const queue: Pos[] = [from];
  while (queue.length) {
    const at = queue.shift()!;
    for (const d of DIRS) {
      if (!map.canStep(at, d)) continue;
      const v = DIR_VECTORS[d];
      const key = (at.y + v.y) * map.width + at.x + v.x;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: at.x + v.x, y: at.y + v.y });
    }
  }
  return seen;
}

/** 階段のマス（Tile.Stairs は 2） */
export function stairsOf(map: GameMap): Pos | null {
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (map.get(x, y) === 2) return { x, y };
  return null;
}

/** 何回も試して、条件に合った回数を数える（確率で起きる特技のテスト用） */
export function countTrials(n: number, trial: (seed: number) => boolean | null): { hits: number; tries: number } {
  let hits = 0;
  let tries = 0;
  for (let i = 0; i < n; i++) {
    const r = trial(1000 + i);
    if (r === null) continue;
    tries++;
    if (r) hits++;
  }
  return { hits, tries };
}
