import type { MapTheme } from '../game/dungeons';
import { Tile, type GameMap } from '../game/map';

/**
 * マップの床と壁の絵（requirements.md 10.1）。
 * 石の模様はプログラムで作り、階に入ったときに1つの大きな絵にまとめて描いておく。
 * 毎回の描き直しでは、その絵の見えているところを写すだけにする
 */

/** 石の模様の1枚の大きさ（px）。すき間なくつながるように作る */
const TEXTURE = 256;

/** たいまつの場所（マス） */
export interface Torch {
  x: number;
  y: number;
  /** 炎のゆれ方をずらす数 */
  seed: number;
}

export interface Terrain {
  map: GameMap;
  theme: MapTheme;
  /** 1マスの大きさ（絵の px） */
  tile: number;
  canvas: HTMLCanvasElement;
  torches: Torch[];
  /** 壁の奥の岩の模様（1マス = 模様の4分の1）。まだ見ていないマスとマップの外を、これで埋める */
  rock: HTMLCanvasElement;
}

/** 決まった数から、0〜1 の数をいつも同じに出す */
function hash(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 石を敷きつめた模様。cells × cells の区画に石を1つずつ置き、石と石の間を gap px のすき間にする。
 * 石は左上から光が当たるように、ふちを明るく・暗くする
 */
function stoneTexture(stone: string, mortar: string, cells: number, gap: number, seed: number): HTMLCanvasElement {
  const size = TEXTURE;
  const cs = size / cells;
  // 区画ごとの石の中心
  const pts: [number, number][] = [];
  for (let j = 0; j < cells; j++)
    for (let i = 0; i < cells; i++) pts.push([(i + 0.15 + hash(i, j, seed) * 0.7) * cs, (j + 0.15 + hash(j, i, seed + 7) * 0.7) * cs]);
  const [sr, sg, sb] = rgb(stone);
  const [mr, mg, mb] = rgb(mortar);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cs);
      const gy = Math.floor(y / cs);
      let f1 = Infinity;
      let f2 = Infinity;
      let id = 0;
      let nx = 0;
      let ny = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = (gx + dx + cells) % cells;
          const cy = (gy + dy + cells) % cells;
          const [px, py] = pts[cy * cells + cx];
          // 端をまたぐ石は、反対側の石として数える（模様をすき間なくつなげる）
          const ox = px + (gx + dx - cx) * cs;
          const oy = py + (gy + dy - cy) * cs;
          const dist = Math.hypot(x - ox, y - oy);
          if (dist < f1) {
            f2 = f1;
            f1 = dist;
            id = cy * cells + cx;
            nx = (x - ox) / cs;
            ny = (y - oy) / cs;
          } else if (dist < f2) f2 = dist;
        }
      }
      const edge = (f2 - f1) / 2;
      const grain = (hash(x, y, seed + 3) - 0.5) * 14;
      const k = (y * size + x) * 4;
      if (edge < gap) {
        // すき間。ふちに近いほど少し明るくして、石との境目をやわらげる
        const t = edge / gap;
        const m = 0.85 + t * 0.15;
        d[k] = mr * m + grain;
        d[k + 1] = mg * m + grain;
        d[k + 2] = mb * m + grain;
      } else {
        // 石ごとに明るさを変える。ふちに向かって丸く落ちるようにし、左上は明るく、右下は暗くする
        const tone = 0.8 + hash(id, seed, 11) * 0.34;
        const h = Math.min(1, (edge - gap) / (cs * 0.22));
        const round = Math.sqrt(h);
        const light = (-nx - ny) * (1 - h) * 1.1;
        const m = tone * (0.6 + round * 0.4) * (1 + light * 0.45);
        d[k] = sr * m + grain;
        d[k + 1] = sg * m + grain;
        d[k + 2] = sb * m + grain;
      }
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** 床の模様。土の上に、ところどころ小石が埋まっている */
function floorTexture(theme: MapTheme, seed: number): HTMLCanvasElement {
  const canvas = stoneTexture(theme.pebble, theme.floor, 9, 7, seed);
  // 小石を土になじませるため、土の色を薄く重ねる
  const ctx = canvas.getContext('2d')!;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.floor;
  ctx.fillRect(0, 0, TEXTURE, TEXTURE);
  ctx.globalAlpha = 1;
  return canvas;
}

interface Textures {
  floor: HTMLCanvasElement;
  wall: HTMLCanvasElement;
  face: HTMLCanvasElement;
  rim: HTMLCanvasElement;
  rock: HTMLCanvasElement;
}

/** 壁の奥の岩。壁の上の面と同じ石を、奥の壁と同じだけ暗くする */
function rockTexture(theme: MapTheme): HTMLCanvasElement {
  const canvas = stoneTexture(theme.wallStone, theme.mortar, 11, 2.5, 2);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = INNER_SHADE;
  ctx.fillRect(0, 0, TEXTURE, TEXTURE);
  return canvas;
}

/** まわりがすべて壁の、奥の壁にかける暗さ */
const INNER_SHADE = 'rgba(15, 10, 5, 0.22)';

/** 模様はダンジョンの見た目ごとに1回だけ作る */
const textureCache = new Map<MapTheme, Textures>();

function texturesFor(theme: MapTheme): Textures {
  let t = textureCache.get(theme);
  if (!t) {
    t = {
      floor: floorTexture(theme, 1),
      wall: stoneTexture(theme.wallStone, theme.mortar, 11, 2.5, 2),
      face: stoneTexture(theme.face, theme.mortar, 10, 2, 3),
      rim: stoneTexture(theme.rim, theme.mortar, 16, 1.8, 4),
      rock: rockTexture(theme),
    };
    textureCache.set(theme, t);
  }
  return t;
}

/** マスの大きさ（絵の px）。画面の1マスに合わせるが、大きすぎる絵にならないよう上限を付ける */
export function terrainTile(screenTile: number): number {
  return Math.max(24, Math.min(64, Math.round(screenTile)));
}

/** 階の床と壁を、1つの大きな絵に描く */
export function buildTerrain(map: GameMap, theme: MapTheme, tile: number): Terrain {
  const T = tile;
  const canvas = document.createElement('canvas');
  canvas.width = map.width * T;
  canvas.height = map.height * T;
  const ctx = canvas.getContext('2d')!;
  const tex = texturesFor(theme);
  // 模様は 1マス = 模様の4分の1 の大きさで敷く
  const pattern = (c: HTMLCanvasElement, scaleY = 1) => {
    const p = ctx.createPattern(c, 'repeat')!;
    p.setTransform(new DOMMatrix().scale((T * 4) / TEXTURE, ((T * 4) / TEXTURE) * scaleY));
    return p;
  };
  const floorP = pattern(tex.floor);
  const wallP = pattern(tex.wall);
  const faceP = pattern(tex.face, 0.6);
  const rimP = pattern(tex.rim);
  const wall = (x: number, y: number) => map.get(x, y) === Tile.Wall;
  const face = Math.round(T * 0.42);
  const band = Math.max(3, Math.round(T * 0.2));
  const torches: Torch[] = [];

  // 床
  ctx.fillStyle = floorP;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (!wall(x, y)) ctx.fillRect(x * T, y * T, T, T);

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const sx = x * T;
      const sy = y * T;
      if (!wall(x, y)) {
        if (map.get(x, y) === Tile.Stairs) stairs(ctx, sx, sy, T, theme);
        // 壁のそばの床に、壁の影を落とす。上の壁の影は濃く長く
        if (wall(x, y - 1)) shade(ctx, sx, sy, T, T * 0.45, 'down', 0.5);
        if (wall(x - 1, y)) shade(ctx, sx, sy, T * 0.25, T, 'right', 0.3);
        if (wall(x + 1, y)) shade(ctx, sx + T * 0.75, sy, T * 0.25, T, 'left', 0.3);
        continue;
      }
      // 壁の上の面
      ctx.fillStyle = wallP;
      ctx.fillRect(sx, sy, T, T);
      const openS = !wall(x, y + 1);
      const top = openS ? T - face : T;
      // 床と接するふちに、明るい石を並べる
      ctx.fillStyle = rimP;
      if (!wall(x, y - 1)) ctx.fillRect(sx, sy, T, band);
      if (!wall(x - 1, y)) ctx.fillRect(sx, sy, band, top);
      if (!wall(x + 1, y)) ctx.fillRect(sx + T - band, sy, band, top);
      if (openS) ctx.fillRect(sx, sy + top - band, T, band);
      // ふちの外側に暗い線を引いて、段差を見せる
      ctx.fillStyle = 'rgba(20, 12, 6, 0.55)';
      if (!wall(x, y - 1)) ctx.fillRect(sx, sy, T, 1);
      if (!wall(x - 1, y)) ctx.fillRect(sx, sy, 1, top);
      if (!wall(x + 1, y)) ctx.fillRect(sx + T - 1, sy, 1, top);
      // まわりがすべて壁の奥の壁は、少し暗くして厚みを出す
      let inner = true;
      for (let dy = -1; dy <= 1 && inner; dy++) for (let dx = -1; dx <= 1; dx++) if (!wall(x + dx, y + dy)) inner = false;
      if (inner) {
        ctx.fillStyle = INNER_SHADE;
        ctx.fillRect(sx, sy, T, T);
      }
      if (openS) {
        // 手前の切り立った面。下へいくほど暗くする
        ctx.fillStyle = faceP;
        ctx.fillRect(sx, sy + top, T, face);
        const g = ctx.createLinearGradient(0, sy + top, 0, sy + T);
        g.addColorStop(0, 'rgba(255, 235, 200, 0.12)');
        g.addColorStop(1, 'rgba(10, 6, 3, 0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(sx, sy + top, T, face);
        // 床に面した壁に、ときどきたいまつを掛ける。近くには並べない
        if (hash(x, y, 99) < theme.torches && torches.every((t) => Math.abs(t.x - x) + Math.abs(t.y - y) >= 5)) {
          torches.push({ x, y, seed: hash(x, y, 5) * 100 });
        }
      }
    }
  }
  return { map, theme, tile: T, canvas, torches, rock: tex.rock };
}

/** 下り階段。床に開いた穴に、奥へ下りていく石の段を描く */
function stairs(ctx: CanvasRenderingContext2D, x: number, y: number, T: number, theme: MapTheme): void {
  const m = T * 0.1;
  const w = T - m * 2;
  const h = T - m * 2;
  // 穴の奥は暗い
  ctx.fillStyle = '#120c07';
  ctx.fillRect(x + m, y + m, w, h);
  // 段は手前ほど明るく、広い
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    const inset = (1 - t) * w * 0.18;
    const sy = y + m + h * (i / steps) + h * 0.06;
    ctx.fillStyle = theme.rim;
    ctx.globalAlpha = 0.25 + t * 0.6;
    ctx.fillRect(x + m + inset, sy, w - inset * 2, h / steps - h * 0.06);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(10, 6, 3, 0.5)';
    ctx.fillRect(x + m + inset, sy + h / steps - h * 0.09, w - inset * 2, h * 0.03);
  }
  // ふちを明るい石で囲む
  ctx.strokeStyle = theme.rim;
  ctx.lineWidth = Math.max(2, T * 0.06);
  ctx.strokeRect(x + m, y + m, w, h);
}

/** 影。from の向きから薄くなっていく */
function shade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  to: 'down' | 'right' | 'left',
  alpha: number,
): void {
  const g =
    to === 'down'
      ? ctx.createLinearGradient(0, y, 0, y + h)
      : to === 'right'
        ? ctx.createLinearGradient(x, 0, x + w, 0)
        : ctx.createLinearGradient(x + w, 0, x, 0);
  g.addColorStop(0, `rgba(10, 6, 3, ${alpha})`);
  g.addColorStop(1, 'rgba(10, 6, 3, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
