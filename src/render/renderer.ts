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
  /** ミニマップは床の色と見分けがつくよう、背景を暗く、床をはっきりした色にする */
  miniBg: 'rgba(0, 0, 0, 0.72)',
  miniBorder: 'rgba(255, 255, 255, 0.25)',
  miniFloor: '#6f9dff',
  miniStairs: '#ffd84a',
  miniPlayer: '#ff4d3d',
  /** 拡大したミニマップの後ろに敷く色 */
  expandedBg: 'rgba(0, 0, 0, 0.82)',
};

/** ミニマップの1マスの大きさ（px） */
const MINI_TILE = 2;
/** ミニマップをタップしやすいよう、当たり判定を周りに広げる幅（px） */
const MINI_HIT_MARGIN = 12;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private tileSize = 32;
  private viewW = 0;
  private viewH = 0;
  /** true のとき、ミニマップを画面いっぱいに広げて表示する */
  minimapExpanded = false;
  private minimapRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D が使えません');
    this.ctx = ctx;
  }

  /**
   * 横は VIEW_TILES マスがちょうど収まる幅にし、縦は maxHeight いっぱいまで使う。
   * 縦に入りきらないマスは上下の端で切れて見える
   */
  resize(maxWidth: number, maxHeight: number): void {
    this.tileSize = Math.max(1, Math.floor(Math.max(0, maxWidth) / VIEW_TILES));
    this.viewW = this.tileSize * VIEW_TILES;
    this.viewH = Math.max(this.tileSize, Math.floor(maxHeight));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${this.viewW}px`;
    this.canvas.style.height = `${this.viewH}px`;
    this.canvas.width = Math.round(this.viewW * dpr);
    this.canvas.height = Math.round(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(state: GameState): void {
    const { ctx, tileSize: ts, viewW, viewH } = this;
    const { map, player } = state;
    // 主人公のマスの左上。横は中央の列、縦は画面の真ん中
    const px0 = HALF * ts;
    const py0 = Math.floor(viewH / 2 - ts / 2);
    const rowsAbove = Math.ceil(py0 / ts);
    const rowsBelow = Math.ceil((viewH - py0 - ts) / ts);

    ctx.fillStyle = COLORS.outside;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    for (let dy = -rowsAbove; dy <= rowsBelow; dy++) {
      for (let dx = -HALF; dx <= HALF; dx++) {
        const mx = player.pos.x + dx;
        const my = player.pos.y + dy;
        if (!state.isExplored(mx, my)) continue;
        const sx = px0 + dx * ts;
        const sy = py0 + dy * ts;
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

    const cx = px0 + ts / 2;
    const cy = py0 + ts / 2;
    ctx.fillText('🧙', cx, cy + 1);
    this.drawFacing(cx, cy, player.facing);

    if (this.minimapExpanded) {
      ctx.fillStyle = COLORS.expandedBg;
      ctx.fillRect(0, 0, viewW, viewH);
      const tile = Math.max(1, Math.floor(Math.min((viewW - 16) / map.width, (viewH - 16) / map.height)));
      const w = map.width * tile;
      const h = map.height * tile;
      this.drawMinimap(state, tile, Math.floor((viewW - w) / 2), Math.floor((viewH - h) / 2));
    } else {
      const w = map.width * MINI_TILE;
      this.drawMinimap(state, MINI_TILE, viewW - w - 4, 4);
    }
  }

  /** 画面上の点（CSS px、キャンバスの左上が原点）が小さいミニマップの上にあるか */
  hitsMinimap(x: number, y: number): boolean {
    const r = this.minimapRect;
    const m = MINI_HIT_MARGIN;
    return x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
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

  /** 歩いたところだけのミニマップを、1マス tile px で (left, top) から描く */
  private drawMinimap(state: GameState, tile: number, left: number, top: number): void {
    const { ctx } = this;
    const { map, player } = state;
    const w = map.width * tile;
    const h = map.height * tile;
    if (!this.minimapExpanded) this.minimapRect = { x: left, y: top, w, h };

    ctx.fillStyle = COLORS.miniBg;
    ctx.fillRect(left - 2, top - 2, w + 4, h + 4);
    ctx.strokeStyle = COLORS.miniBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(left - 2.5, top - 2.5, w + 5, h + 5);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!state.isExplored(x, y)) continue;
        const t = map.get(x, y);
        if (t === Tile.Wall) continue;
        ctx.fillStyle = t === Tile.Stairs ? COLORS.miniStairs : COLORS.miniFloor;
        ctx.fillRect(left + x * tile, top + y * tile, tile, tile);
      }
    }
    // 自分の印は、小さい地図では見落とさないよう1マスより大きくする
    const grow = tile <= 2 ? 1 : 0;
    ctx.fillStyle = COLORS.miniPlayer;
    ctx.fillRect(left + player.pos.x * tile - grow, top + player.pos.y * tile - grow, tile + grow * 2, tile + grow * 2);
  }
}
