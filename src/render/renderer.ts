import type { GameState } from '../game/state';
import { Tile } from '../game/map';

/** 画面に映すマス数（要件 10.1） */
const VIEW_TILES = 11;
const HALF = Math.floor(VIEW_TILES / 2);

const COLORS = {
  wall: '#3a3450',
  wallEdge: '#4b4466',
  floor: '#24212f',
  outside: '#0c0b12',
  /** 見たことはあるが今は見えていないマスに重ねる色 */
  memory: 'rgba(8, 7, 14, 0.55)',
  miniBg: 'rgba(8, 7, 14, 0.55)',
  miniFloor: 'rgba(200, 192, 230, 0.55)',
  miniStairs: '#f0d27a',
  miniPlayer: '#ff6b5e',
};

/** ミニマップの1マスの大きさ（px） */
const MINI_TILE = 2;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private tileSize = 32;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D が使えません');
    this.ctx = ctx;
  }

  /** 一辺 maxSize 以内で、マス目がちょうど収まる最大の正方形にする */
  resize(maxSize: number): void {
    const size = Math.max(0, maxSize);
    this.tileSize = Math.floor(size / VIEW_TILES);
    const px = this.tileSize * VIEW_TILES;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${px}px`;
    this.canvas.style.height = `${px}px`;
    this.canvas.width = Math.round(px * dpr);
    this.canvas.height = Math.round(px * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(state: GameState): void {
    const { ctx, tileSize: ts } = this;
    const { map, player } = state;
    const originX = player.pos.x - HALF;
    const originY = player.pos.y - HALF;

    ctx.fillStyle = COLORS.outside;
    ctx.fillRect(0, 0, ts * VIEW_TILES, ts * VIEW_TILES);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    for (let vy = 0; vy < VIEW_TILES; vy++) {
      for (let vx = 0; vx < VIEW_TILES; vx++) {
        const mx = originX + vx;
        const my = originY + vy;
        if (!state.isExplored(mx, my)) continue;
        const sx = vx * ts;
        const sy = vy * ts;
        const tile = map.get(mx, my);
        if (tile === Tile.Wall) {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(sx, sy, ts, ts);
          ctx.fillStyle = COLORS.wallEdge;
          ctx.fillRect(sx, sy, ts, 2);
        } else {
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(sx, sy, ts, ts);
          if (tile === Tile.Stairs) {
            ctx.fillText('🪜', sx + ts / 2, sy + ts / 2 + 1);
          }
        }
        if (!state.isVisible(mx, my)) {
          ctx.fillStyle = COLORS.memory;
          ctx.fillRect(sx, sy, ts, ts);
        }
      }
    }

    // 主人公は常に中央
    const cx = HALF * ts + ts / 2;
    const cy = HALF * ts + ts / 2;
    ctx.fillText('🧙', cx, cy + 1);
    this.drawFacing(cx, cy, player.facing);

    this.drawMinimap(state);
  }

  /** 向いている方向に小さな印を出す */
  private drawFacing(cx: number, cy: number, facing: number): void {
    const { ctx, tileSize: ts } = this;
    const angle = (facing * Math.PI) / 4 - Math.PI / 2;
    const r = ts * 0.46;
    ctx.fillStyle = '#f0d27a';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, Math.max(2, ts * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }

  /** 右上に、歩いたところだけのミニマップを重ねる */
  private drawMinimap(state: GameState): void {
    const { ctx } = this;
    const { map, player } = state;
    const w = map.width * MINI_TILE;
    const h = map.height * MINI_TILE;
    const left = this.tileSize * VIEW_TILES - w - 4;
    const top = 4;

    ctx.fillStyle = COLORS.miniBg;
    ctx.fillRect(left - 2, top - 2, w + 4, h + 4);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!state.isExplored(x, y)) continue;
        const tile = map.get(x, y);
        if (tile === Tile.Wall) continue;
        ctx.fillStyle = tile === Tile.Stairs ? COLORS.miniStairs : COLORS.miniFloor;
        ctx.fillRect(left + x * MINI_TILE, top + y * MINI_TILE, MINI_TILE, MINI_TILE);
      }
    }
    ctx.fillStyle = COLORS.miniPlayer;
    ctx.fillRect(left + player.pos.x * MINI_TILE - 1, top + player.pos.y * MINI_TILE - 1, MINI_TILE + 2, MINI_TILE + 2);
  }
}
