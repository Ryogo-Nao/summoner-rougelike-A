import type { Pos } from './dir';
import { GameMap, Tile, type Room } from './map';
import type { Rng } from './rng';

/** balance.md 7章 */
const MAP_WIDTH = 40;
const MAP_HEIGHT = 28;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const MIN_ROOMS = 5;
const MAX_ROOMS = 8;
/** 全域木とは別に通路を足して、ループを作る確率 */
const EXTRA_LINK_CHANCE = 0.2;

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
 * 3×3の区画のうち5〜8個に部屋を置き、残りは通路の中継点にする。
 * 隣り合う区画を全域木でつなぐので、全マスが必ずつながる。
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

  const nodes: Node[] = [];
  for (let cy = 0; cy < GRID_ROWS; cy++) {
    for (let cx = 0; cx < GRID_COLS; cx++) {
      const x0 = cx * cellW;
      const y0 = cy * cellH;
      if (roomCells.has(cy * GRID_COLS + cx)) {
        const w = rng.int(4, cellW - 4);
        const h = rng.int(3, cellH - 4);
        const x = x0 + rng.int(2, cellW - w - 2);
        const y = y0 + rng.int(2, cellH - h - 2);
        nodes.push({ rect: { x, y, w, h }, isRoom: true });
      } else {
        const x = x0 + rng.int(2, cellW - 3);
        const y = y0 + rng.int(2, cellH - 3);
        nodes.push({ rect: { x, y, w: 1, h: 1 }, isRoom: false });
      }
    }
  }

  for (const { rect } of nodes) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) carve(x, y);
    }
  }

  for (const [a, b] of pickLinks(rng)) {
    const horizontal = Math.floor(a / GRID_COLS) === Math.floor(b / GRID_COLS);
    digCorridor(rng, nodes[a], nodes[b], horizontal, carve);
  }

  const rooms = nodes.filter((n) => n.isRoom).map((n) => n.rect);
  const map = new GameMap(MAP_WIDTH, MAP_HEIGHT, tiles, rooms);

  const [startRoom, stairsRoom] = rng.shuffle([...rooms]);
  const stairs = randomPointIn(rng, stairsRoom);
  map.set(stairs.x, stairs.y, Tile.Stairs);
  let start = randomPointIn(rng, startRoom);
  if (start.x === stairs.x && start.y === stairs.y) start = randomPointIn(rng, startRoom);

  return { map, start, stairs };
}

/** 区画同士のつなぎ方。全域木（ランダムなDFS）＋いくつかの追加辺。各組は [小さい番号, 大きい番号] */
function pickLinks(rng: Rng): [number, number][] {
  const index = (cx: number, cy: number) => cy * GRID_COLS + cx;
  const neighbors = (i: number): number[] => {
    const cx = i % GRID_COLS;
    const cy = Math.floor(i / GRID_COLS);
    const result: number[] = [];
    if (cx > 0) result.push(index(cx - 1, cy));
    if (cx < GRID_COLS - 1) result.push(index(cx + 1, cy));
    if (cy > 0) result.push(index(cx, cy - 1));
    if (cy < GRID_ROWS - 1) result.push(index(cx, cy + 1));
    return result;
  };

  const links: [number, number][] = [];
  const linked = new Set<string>();
  const addLink = (a: number, b: number) => {
    const pair: [number, number] = a < b ? [a, b] : [b, a];
    const key = `${pair[0]}-${pair[1]}`;
    if (linked.has(key)) return;
    linked.add(key);
    links.push(pair);
  };

  const visited = new Set<number>();
  const visit = (i: number) => {
    visited.add(i);
    for (const n of rng.shuffle(neighbors(i))) {
      if (!visited.has(n)) {
        addLink(i, n);
        visit(n);
      }
    }
  };
  visit(rng.int(0, GRID_COLS * GRID_ROWS - 1));

  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    for (const n of neighbors(i)) {
      if (n > i && rng.chance(EXTRA_LINK_CHANCE)) addLink(i, n);
    }
  }
  return links;
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

function randomPointIn(rng: Rng, room: Room): Pos {
  return { x: rng.int(room.x, room.x + room.w - 1), y: rng.int(room.y, room.y + room.h - 1) };
}
