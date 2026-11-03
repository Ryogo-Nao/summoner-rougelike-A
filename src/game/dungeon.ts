import type { Pos } from './dir';
import { GameMap, Tile, type Room } from './map';
import type { Rng } from './rng';

/** balance.md 7章 */
const MAP_WIDTH = 44;
const MAP_HEIGHT = 30;
const GRID_COLS = 4;
const GRID_ROWS = 3;
const MIN_ROOMS = 7;
const MAX_ROOMS = 10;
/** 全域木とは別に通路を足して、ループを作る確率 */
const EXTRA_LINK_CHANCE = 0.35;
/** 通路が1本しかない部屋に、もう1本通路を足す確率 */
const SECOND_EXIT_CHANCE = 0.75;

export interface Floor {
  map: GameMap;
  start: Pos;
  stairs: Pos;
}

/** 区画の中身。部屋か、部屋のない区画で通路が曲がる1マスの点 */
interface Node {
  rect: Room;
  isRoom: boolean;
}

/**
 * 区画分割でフロアを作る。
 * 4×3の区画のうち7〜10個に部屋を置き、残りは通路の中継点にする。
 * 部屋を区画いっぱい近くまで広げて、通路を短くする。
 * 区画どうしは全域木でつなぐので、全マスが必ずつながる。そのうえで通路を足して回り道を作る。
 */
export function generateFloor(rng: Rng): Floor {
  const tiles: Tile[] = new Array(MAP_WIDTH * MAP_HEIGHT).fill(Tile.Wall);
  const carve = (x: number, y: number) => {
    tiles[y * MAP_WIDTH + x] = Tile.Floor;
  };

  const cellW = Math.floor(MAP_WIDTH / GRID_COLS);
  const cellH = Math.floor(MAP_HEIGHT / GRID_ROWS);
  const roomCount = rng.int(MIN_ROOMS, MAX_ROOMS);
  const roomCells = new Set(rng.shuffle([...Array(GRID_COLS * GRID_ROWS).keys()]).slice(0, roomCount));

  // 区画の左上は1マス、右下は2マス空ける。隣の部屋とは壁が3マス以上離れ、
  // その間で通路を曲げられる
  const nodes: Node[] = [];
  for (let cy = 0; cy < GRID_ROWS; cy++) {
    for (let cx = 0; cx < GRID_COLS; cx++) {
      const x0 = cx * cellW;
      const y0 = cy * cellH;
      if (roomCells.has(cy * GRID_COLS + cx)) {
        const w = rng.int(5, cellW - 3);
        const h = rng.int(4, cellH - 3);
        const x = x0 + rng.int(1, cellW - w - 2);
        const y = y0 + rng.int(1, cellH - h - 2);
        nodes.push({ rect: { x, y, w, h }, isRoom: true });
      } else {
        const x = x0 + rng.int(2, cellW - 4);
        const y = y0 + rng.int(2, cellH - 4);
        nodes.push({ rect: { x, y, w: 1, h: 1 }, isRoom: false });
      }
    }
  }

  for (const { rect } of nodes) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) carve(x, y);
    }
  }

  for (const [a, b] of pickLinks(rng, nodes)) {
    const horizontal = Math.floor(a / GRID_COLS) === Math.floor(b / GRID_COLS);
    digCorridor(rng, nodes[a], nodes[b], horizontal, carve);
  }

  const rooms = nodes.filter((n) => n.isRoom).map((n) => n.rect);
  const map = new GameMap(MAP_WIDTH, MAP_HEIGHT, tiles, rooms);

  const [startRoom, stairsRoom] = rng.shuffle([...rooms]);
  const stairs = randomFreePointIn(rng, map, stairsRoom);
  map.set(stairs.x, stairs.y, Tile.Stairs);
  const start = randomFreePointIn(rng, map, startRoom);

  return { map, start, stairs };
}

/**
 * 区画同士のつなぎ方。各組は [小さい番号, 大きい番号]。
 * 1. 辺をランダムに並べて全域木を作る（深さ優先より枝分かれが多く、一本道になりにくい）
 * 2. 中継点は行き止まりにしない。部屋も多くは出口を2つ以上にする
 * 3. 残りの辺もいくつか足してループを作る
 */
function pickLinks(rng: Rng, nodes: Node[]): [number, number][] {
  const count = GRID_COLS * GRID_ROWS;
  const edges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (i % GRID_COLS < GRID_COLS - 1) edges.push([i, i + 1]);
    if (i + GRID_COLS < count) edges.push([i, i + GRID_COLS]);
  }

  const parent = [...Array(count).keys()];
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const used = new Set<[number, number]>();
  const degree = new Array<number>(count).fill(0);
  const use = (e: [number, number]) => {
    used.add(e);
    degree[e[0]]++;
    degree[e[1]]++;
  };

  for (const e of rng.shuffle([...edges])) {
    const [ra, rb] = [root(e[0]), root(e[1])];
    if (ra === rb) continue;
    parent[ra] = rb;
    use(e);
  }

  for (let i = 0; i < count; i++) {
    if (degree[i] >= 2) continue;
    if (nodes[i].isRoom && !rng.chance(SECOND_EXIT_CHANCE)) continue;
    const spare = edges.filter((e) => !used.has(e) && (e[0] === i || e[1] === i));
    if (spare.length > 0) use(rng.pick(spare));
  }

  for (const e of edges) {
    if (!used.has(e) && rng.chance(EXTRA_LINK_CHANCE)) use(e);
  }
  return edges.filter((e) => used.has(e));
}

/**
 * 隣り合う2つの区画をクランク型の通路でつなぐ。曲がり角は部屋の壁から1マス以上離す。
 * from が左（または上）の区画
 */
function digCorridor(rng: Rng, from: Node, to: Node, horizontal: boolean, carve: (x: number, y: number) => void): void {
  if (horizontal) {
    const s = from.isRoom
      ? { x: from.rect.x + from.rect.w, y: rng.int(from.rect.y, from.rect.y + from.rect.h - 1) }
      : { x: from.rect.x, y: from.rect.y };
    const e = to.isRoom
      ? { x: to.rect.x - 1, y: rng.int(to.rect.y, to.rect.y + to.rect.h - 1) }
      : { x: to.rect.x, y: to.rect.y };
    const mx = rng.int(s.x + 1, e.x - 1);
    for (let x = s.x; x <= mx; x++) carve(x, s.y);
    for (let y = Math.min(s.y, e.y); y <= Math.max(s.y, e.y); y++) carve(mx, y);
    for (let x = mx; x <= e.x; x++) carve(x, e.y);
  } else {
    const s = from.isRoom
      ? { x: rng.int(from.rect.x, from.rect.x + from.rect.w - 1), y: from.rect.y + from.rect.h }
      : { x: from.rect.x, y: from.rect.y };
    const e = to.isRoom
      ? { x: rng.int(to.rect.x, to.rect.x + to.rect.w - 1), y: to.rect.y - 1 }
      : { x: to.rect.x, y: to.rect.y };
    const my = rng.int(s.y + 1, e.y - 1);
    for (let y = s.y; y <= my; y++) carve(s.x, y);
    for (let x = Math.min(s.x, e.x); x <= Math.max(s.x, e.x); x++) carve(x, my);
    for (let y = my; y <= e.y; y++) carve(e.x, y);
  }
}

/** 部屋の中で、出入口でも階段でもないマスを選ぶ */
export function randomFreePointIn(rng: Rng, map: GameMap, room: Room): Pos {
  const free: Pos[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (map.get(x, y) === Tile.Floor && !map.isEntrance(x, y)) free.push({ x, y });
    }
  }
  return rng.pick(free);
}
