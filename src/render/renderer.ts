import type { ActorView, GameState, Popup, Scene } from '../game/state';
import { ITEMS } from '../game/items';
import { Tile } from '../game/map';

/**
 * 攻撃の場面を再生している途中の様子。
 * lunge は攻撃する側が踏み込んで戻るところ、hit は攻撃を受けた側が点滅して数字が出るところ。t は 0〜1
 */
export interface Playback {
  scene: Scene;
  phase: 'lunge' | 'hit';
  t: number;
}

/** 踏み込む深さ（マスの何割か） */
const LUNGE_DEPTH = 0.4;

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
  miniMonster: '#ff5fd2',
  hpBar: '#e5534b',
  allyHpBar: '#4fd18b',
  miniAlly: '#4fd18b',
  miniItem: '#5ff0ff',
  hpBarBg: 'rgba(0, 0, 0, 0.7)',
  /** 拡大したミニマップの後ろに敷く色 */
  expandedBg: 'rgba(0, 0, 0, 0.82)',
};

const POPUP_COLORS: Record<Popup['kind'], string> = {
  damage: '#ffffff',
  hurt: '#ff6b5e',
  miss: '#b8b2cc',
  info: '#ffd84a',
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

  draw(state: GameState, play?: Playback): void {
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

    const toScreen = (pos: { x: number; y: number }) => ({
      x: px0 + (pos.x - player.pos.x) * ts,
      y: py0 + (pos.y - player.pos.y) * ts,
    });

    // 落ちているアイテムは、見たことのあるマスなら出す
    ctx.font = `${Math.floor(ts * 0.62)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    for (const f of state.floorItems) {
      if (!state.isExplored(f.pos.x, f.pos.y)) continue;
      const { x: sx, y: sy } = toScreen(f.pos);
      if (sx < -ts || sx > viewW || sy < -ts || sy > viewH) continue;
      ctx.fillText(ITEMS[f.item.kind].emoji, sx + ts / 2, sy + ts / 2 + 1);
    }
    ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    const actors = play ? play.scene.actors : state.actorViews();
    const popups = play ? (play.phase === 'hit' ? play.scene.popups : []) : state.popups;
    // 攻撃を受けたマス。点滅させる
    const hurt = new Set(
      popups.filter((p) => p.kind === 'damage' || p.kind === 'hurt').map((p) => `${p.pos.x},${p.pos.y}`),
    );
    actors.forEach((actor, i) => {
      let { x: sx, y: sy } = toScreen(actor.pos);
      if (play?.phase === 'lunge' && i === play.scene.attacker) {
        // 相手の方へ踏み込んで、元の位置に戻る
        const depth = Math.sin(play.t * Math.PI) * LUNGE_DEPTH * ts;
        const dx = Math.sign(play.scene.toward.x - actor.pos.x);
        const dy = Math.sign(play.scene.toward.y - actor.pos.y);
        const len = Math.hypot(dx, dy) || 1;
        sx += (dx / len) * depth;
        sy += (dy / len) * depth;
      }
      if (play?.phase === 'hit' && hurt.has(`${actor.pos.x},${actor.pos.y}`)) {
        // 受けた側は細かく揺れて点滅する
        if (Math.floor(play.t * 6) % 2 === 1) return;
        sx += Math.sin(play.t * Math.PI * 8) * ts * 0.06;
      }
      this.drawActor(actor, sx, sy);
    });

    this.drawPopups(popups, toScreen, play?.phase === 'hit' ? play.t : 1);

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

  /** 画面上の点（CSS px、キャンバスの左上が原点）にあるマス。draw と同じく、主人公を中央に置いた位置で求める */
  tileAt(state: GameState, x: number, y: number): { x: number; y: number } {
    const ts = this.tileSize;
    const px0 = HALF * ts;
    const py0 = Math.floor(this.viewH / 2 - ts / 2);
    return {
      x: state.player.pos.x + Math.floor((x - px0) / ts),
      y: state.player.pos.y + Math.floor((y - py0) / ts),
    };
  }

  /** 画面上の点（CSS px、キャンバスの左上が原点）が小さいミニマップの上にあるか */
  hitsMinimap(x: number, y: number): boolean {
    const r = this.minimapRect;
    const m = MINI_HIT_MARGIN;
    return x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
  }

  private drawActor(actor: ActorView, sx: number, sy: number): void {
    const { ctx, tileSize: ts } = this;
    ctx.fillText(actor.emoji, sx + ts / 2, sy + ts / 2 + 1);
    if (actor.isPartner) {
      ctx.font = `${Math.floor(ts * 0.36)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText('⚡', sx + ts * 0.2, sy + ts * 0.2);
      ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    }
    if (actor.sick) {
      // 状態異常の印は右上に小さく出す
      ctx.font = `${Math.floor(ts * 0.32)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(actor.sick, sx + ts * 0.8, sy + ts * 0.18);
      ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    }
    if (actor.hp) this.drawHpBar(sx, sy, actor.hp.ratio, actor.hp.ally ? COLORS.allyHpBar : COLORS.hpBar);
    if (actor.isPlayer) this.drawFacing(sx + ts / 2, sy + ts / 2, actor.facing);
  }

  /** マスの下端に、残りHPの割合を細い棒で出す */
  private drawHpBar(sx: number, sy: number, ratio: number, color: string): void {
    const { ctx, tileSize: ts } = this;
    const h = Math.max(3, Math.floor(ts * 0.1));
    ctx.fillStyle = COLORS.hpBarBg;
    ctx.fillRect(sx + 3, sy + ts - h - 1, ts - 6, h);
    ctx.fillStyle = color;
    ctx.fillRect(sx + 3, sy + ts - h - 1, Math.max(1, (ts - 6) * ratio), h);
  }

  /**
   * ダメージなどの数字を、そのマスの上に出す。同じマスに重なるときは上にずらす。
   * rise（0〜1）が小さいうちは、下から浮き上がってくる途中
   */
  private drawPopups(
    popups: Popup[],
    toScreen: (pos: { x: number; y: number }) => { x: number; y: number },
    rise: number,
  ): void {
    const { ctx, tileSize: ts } = this;
    const stack = new Map<string, number>();
    ctx.font = `bold ${Math.floor(ts * 0.42)}px -apple-system, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    const lift = (1 - Math.min(1, rise * 2.5)) * ts * 0.3;
    for (const popup of popups) {
      const key = `${popup.pos.x},${popup.pos.y}`;
      const n = stack.get(key) ?? 0;
      stack.set(key, n + 1);
      const { x, y } = toScreen(popup.pos);
      const ty = y + ts * 0.12 - n * ts * 0.4 + lift;
      ctx.fillStyle = POPUP_COLORS[popup.kind];
      ctx.strokeText(popup.text, x + ts / 2, ty);
      ctx.fillText(popup.text, x + ts / 2, ty);
    }
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
    ctx.fillStyle = COLORS.miniItem;
    for (const f of state.floorItems) {
      if (state.isExplored(f.pos.x, f.pos.y)) ctx.fillRect(left + f.pos.x * tile, top + f.pos.y * tile, tile, tile);
    }
    ctx.fillStyle = COLORS.miniMonster;
    for (const m of state.monsters) {
      if (state.isVisible(m.pos.x, m.pos.y)) ctx.fillRect(left + m.pos.x * tile, top + m.pos.y * tile, tile, tile);
    }
    ctx.fillStyle = COLORS.miniAlly;
    for (const a of state.allies) ctx.fillRect(left + a.pos.x * tile, top + a.pos.y * tile, tile, tile);
    // 自分の印は、小さい地図では見落とさないよう1マスより大きくする
    const grow = tile <= 2 ? 1 : 0;
    ctx.fillStyle = COLORS.miniPlayer;
    ctx.fillRect(left + player.pos.x * tile - grow, top + player.pos.y * tile - grow, tile + grow * 2, tile + grow * 2);
  }
}
