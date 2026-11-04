import type { ActorView, GameState, Popup, Scene } from '../game/state';
import { ITEMS } from '../game/items';
import { Tile } from '../game/map';
import { artImage } from './art';
import { buildTerrain, terrainTile, type Terrain } from './terrain';

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

/** 1マス歩くのにかける時間（ミリ秒）と、歩くときに跳ねる高さ（マスの何割か） */
const STEP_MS = 120;
const HOP = 0.12;
/** 立っているときの息づかい（伸び縮みの大きさと、1回の長さ） */
const BREATH = 0.035;
const BREATH_MS = 1400;

/** 歩いている途中の様子。from から to へ start から STEP_MS かけて動く */
interface Step {
  from: { x: number; y: number };
  to: { x: number; y: number };
  start: number;
}

/** 画面に映すマス数（要件 10.1） */
const VIEW_TILES = 11;
const HALF = Math.floor(VIEW_TILES / 2);

/** 色は style.css の色の決まりと合わせる。床と壁の色は、ダンジョンごとの見た目（MapTheme）で決める */
const COLORS = {
  /** 見たことはあるが今は見えていないマスに重ねる色 */
  memory: 'rgba(10, 6, 3, 0.4)',
  /** ミニマップは床の色と見分けがつくよう、背景を暗く、床をはっきりした色にする */
  miniBg: 'rgba(46, 36, 27, 0.72)',
  miniBorder: 'rgba(255, 255, 255, 0.25)',
  miniFloor: '#6f9dff',
  miniStairs: '#ffd84a',
  miniPlayer: '#3dff6e',
  miniMonster: '#ff7a8a',
  hpBar: '#ff7a8a',
  allyHpBar: '#6fe8b0',
  miniAlly: '#2f9e64',
  /** 足もとの影。味方（主人公と仲間）は緑、敵は赤 */
  allyShadow: 'rgba(40, 200, 120, 0.6)',
  enemyShadow: 'rgba(235, 70, 95, 0.6)',
  miniItem: '#5ff0ff',
  hpBarBg: 'rgba(61, 47, 34, 0.55)',
  hpBarEdge: '#3d2f22',
  /** 拡大したミニマップの後ろに敷く色 */
  expandedBg: 'rgba(46, 36, 27, 0.85)',
};

const POPUP_COLORS: Record<Popup['kind'], string> = {
  damage: '#ffffff',
  hurt: '#ff7a8a',
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
  /** 歩いている途中のもの（ActorView.key ごと） */
  private steps = new Map<string, Step>();
  /** 今の階の床と壁の絵。階やダンジョンが変わったら作り直す */
  private terrain: Terrain | null = null;
  /** 絵を左右反転しているか。上下を向いたときは前の向きのまま */
  private flipped = new Map<string, boolean>();

  /** 歩いている途中のものがあるか。あれば描き続ける */
  moving(now = performance.now()): boolean {
    for (const s of this.steps.values()) if (now - s.start < STEP_MS) return true;
    return false;
  }

  /** key のものが今どこに見えているか（歩いている途中なら、マスの間） */
  private stepAt(key: string, pos: { x: number; y: number }, now: number, snap: boolean): { x: number; y: number; t: number } {
    const s = this.steps.get(key);
    const moved = !s || s.to.x !== pos.x || s.to.y !== pos.y;
    if (moved) {
      const from = s && !snap ? this.lerpStep(s, now) : pos;
      // 階段やワープなど、2マスより遠くへ動いたときは歩かせない
      const far = Math.abs(from.x - pos.x) > 2 || Math.abs(from.y - pos.y) > 2;
      this.steps.set(key, { from: far ? { ...pos } : from, to: { ...pos }, start: now });
    }
    const step = this.steps.get(key)!;
    const t = Math.min(1, (now - step.start) / STEP_MS);
    const at = this.lerpStep(step, now);
    return { ...at, t: step.from.x === step.to.x && step.from.y === step.to.y ? 1 : t };
  }

  private lerpStep(s: Step, now: number): { x: number; y: number } {
    const t = Math.min(1, (now - s.start) / STEP_MS);
    const e = 1 - (1 - t) * (1 - t);
    return { x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e };
  }

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
    const now = performance.now();
    const actors = play ? play.scene.actors : state.actorViews();
    // 攻撃の場面では、マスの上にぴったり置く。ふだんは前のマスから歩いてくる
    const shown = new Map(actors.map((a) => [a.key, this.stepAt(a.key, a.pos, now, play !== undefined)]));
    for (const key of [...this.steps.keys()]) if (!shown.has(key)) this.steps.delete(key);
    // 画面は、見えている主人公の位置を真ん中にする（歩くと画面もなめらかに動く）
    const cam = shown.get('player') ?? { ...player.pos, t: 1 };
    // 主人公のマスの左上。横は中央の列、縦は画面の真ん中
    const px0 = HALF * ts;
    const py0 = Math.floor(viewH / 2 - ts / 2);
    const rowsAbove = Math.ceil(py0 / ts) + 1;
    const rowsBelow = Math.ceil((viewH - py0 - ts) / ts) + 1;
    const baseX = Math.round(cam.x);
    const baseY = Math.round(cam.y);

    const theme = state.dungeon.theme;
    ctx.fillStyle = theme.outside;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    // 床と壁は、階ごとに描いておいた絵の、見えているところだけを写す
    const tilePx = terrainTile(ts * (window.devicePixelRatio || 1));
    const terrain = this.terrain;
    if (!terrain || terrain.map !== map || terrain.theme !== theme || terrain.tile !== tilePx) {
      this.terrain = buildTerrain(map, theme, tilePx);
    }
    const T = this.terrain!.tile;
    const x0 = Math.max(0, baseX - HALF - 1);
    const x1 = Math.min(map.width - 1, baseX + HALF + 1);
    const y0 = Math.max(0, baseY - rowsAbove);
    const y1 = Math.min(map.height - 1, baseY + rowsBelow);
    if (x0 <= x1 && y0 <= y1) {
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const dx0 = Math.round(px0 + (x0 - cam.x) * ts);
      const dy0 = Math.round(py0 + (y0 - cam.y) * ts);
      ctx.drawImage(this.terrain!.canvas, x0 * T, y0 * T, w * T, h * T, dx0, dy0, w * ts, h * ts);
    }
    // まだ見ていないマスは隠し、見たことはあるが今は見えていないマスは暗くする
    for (let dy = -rowsAbove; dy <= rowsBelow; dy++) {
      for (let dx = -HALF - 1; dx <= HALF + 1; dx++) {
        const mx = baseX + dx;
        const my = baseY + dy;
        const sx = Math.round(px0 + (mx - cam.x) * ts);
        const sy = Math.round(py0 + (my - cam.y) * ts);
        if (!state.isExplored(mx, my)) {
          ctx.fillStyle = theme.outside;
          ctx.fillRect(sx, sy, ts, ts);
          continue;
        }
        if (!state.isVisible(mx, my)) {
          ctx.fillStyle = COLORS.memory;
          ctx.fillRect(sx, sy, ts, ts);
        }
      }
    }

    const toScreen = (pos: { x: number; y: number }) => ({
      x: px0 + (pos.x - cam.x) * ts,
      y: py0 + (pos.y - cam.y) * ts,
    });

    this.drawLighting(state, toScreen(cam), toScreen, now);

    // 落ちているアイテムは、見たことのあるマスなら出す
    ctx.font = `${Math.floor(ts * 0.62)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    for (const f of state.floorItems) {
      if (!state.isExplored(f.pos.x, f.pos.y)) continue;
      const { x: sx, y: sy } = toScreen(f.pos);
      if (sx < -ts || sx > viewW || sy < -ts || sy > viewH) continue;
      ctx.fillText(ITEMS[f.item.kind].emoji, sx + ts / 2, sy + ts / 2 + 1);
    }
    ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    const popups = play ? (play.phase === 'hit' ? play.scene.popups : []) : state.popups;
    // 攻撃を受けたマス。点滅させる
    const hurt = new Set(
      popups.filter((p) => p.kind === 'damage' || p.kind === 'hurt').map((p) => `${p.pos.x},${p.pos.y}`),
    );
    actors.forEach((actor, i) => {
      const at = shown.get(actor.key)!;
      let { x: sx, y: sy } = toScreen(at);
      // 歩いている間は小さく跳ねる
      sy -= Math.sin(at.t * Math.PI) * HOP * ts;
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
      this.drawActor(actor, sx, sy, now);
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

  private drawActor(actor: ActorView, sx: number, sy: number, now: number): void {
    const { ctx, tileSize: ts } = this;
    // 絵は左下を向いている。右を向いたら反転する。上下を向いたときは前の向きのまま
    if (actor.facing >= 1 && actor.facing <= 3) this.flipped.set(actor.key, true);
    else if (actor.facing >= 5) this.flipped.set(actor.key, false);
    const flip = this.flipped.get(actor.key) ?? false;
    // 立っている間は、息をするように少し伸び縮みする。ひとりずつ少しずらす
    let phase = 0;
    for (const c of actor.key) phase += c.charCodeAt(0);
    const breath = Math.sin((now / BREATH_MS) * Math.PI * 2 + phase) * BREATH;
    // 足もとの影で、味方と敵を見分けやすくする。アイテムには付けない
    ctx.save();
    ctx.fillStyle = actor.enemy ? COLORS.enemyShadow : COLORS.allyShadow;
    ctx.beginPath();
    // HPの棒（マスの下端）に重ならないよう、棒より上で終わらせる
    ctx.ellipse(sx + ts / 2, sy + ts * 0.75, ts * 0.42, ts * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const img = artImage(actor.art);
    // 足もと（影の真ん中あたり）を軸に、伸び縮みと反転をする
    const footX = sx + ts / 2;
    const footY = sy + ts * 0.8;
    ctx.save();
    ctx.translate(footX, footY);
    ctx.scale((flip ? -1 : 1) * (1 - breath / 2), 1 + breath);
    if (img) {
      // 絵はマスより少し大きく描く
      const size = ts * 1.08;
      ctx.drawImage(img, -size / 2, -size, size, size);
    } else ctx.fillText(actor.emoji, 0, -ts * 0.3 + 1);
    ctx.restore();
    if (actor.isPartner && !img) {
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

  /**
   * 明かり。主人公のまわりは明るく、離れるほど暗くする（真っ暗にはしない）。
   * たいまつは炎をゆらし、まわりを暖かく照らす
   */
  private drawLighting(
    state: GameState,
    me: { x: number; y: number },
    toScreen: (pos: { x: number; y: number }) => { x: number; y: number },
    now: number,
  ): void {
    const { ctx, tileSize: ts, viewW, viewH } = this;
    const theme = state.dungeon.theme;
    const [r, g, b] = theme.light;
    const cx = me.x + ts / 2;
    const cy = me.y + ts / 2;
    const dark = ctx.createRadialGradient(cx, cy, ts * 2.2, cx, cy, ts * 6.5);
    dark.addColorStop(0, 'rgba(8, 5, 2, 0)');
    dark.addColorStop(1, `rgba(8, 5, 2, ${theme.dark})`);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x: number, y: number, radius: number, alpha: number) => {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gr.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gr.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    glow(cx, cy, ts * 3.2, 0.1);
    const torches = (this.terrain?.torches ?? []).filter((t) => {
      if (!state.isExplored(t.x, t.y)) return false;
      const p = toScreen(t);
      return p.x > -ts * 3 && p.x < viewW + ts * 3 && p.y > -ts * 3 && p.y < viewH + ts * 3;
    });
    const flicker = (t: { seed: number }) => 1 + Math.sin(now / 90 + t.seed) * 0.07 + Math.sin(now / 37 + t.seed * 2) * 0.04;
    for (const t of torches) {
      const p = toScreen(t);
      glow(p.x + ts / 2, p.y + ts * 0.75, ts * 2.6 * flicker(t), 0.2);
    }
    ctx.restore();

    for (const t of torches) {
      const p = toScreen(t);
      const x = p.x + ts / 2;
      const y = p.y + ts * 0.74;
      const f = flicker(t);
      // 金具
      ctx.fillStyle = '#2b2016';
      ctx.fillRect(x - ts * 0.04, y, ts * 0.08, ts * 0.16);
      ctx.fillStyle = '#7a5a2e';
      ctx.fillRect(x - ts * 0.1, y - ts * 0.02, ts * 0.2, ts * 0.06);
      // 炎
      const fh = ts * 0.26 * f;
      const flame = ctx.createRadialGradient(x, y - fh * 0.35, 0, x, y - fh * 0.35, fh * 0.7);
      flame.addColorStop(0, 'rgba(255, 250, 210, 1)');
      flame.addColorStop(0.35, 'rgba(255, 196, 80, 0.95)');
      flame.addColorStop(1, 'rgba(230, 90, 20, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(x, y - fh * 0.4, ts * 0.09 * f, fh * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** マスの下端に、残りHPの割合を細い棒で出す */
  private drawHpBar(sx: number, sy: number, ratio: number, color: string): void {
    const { ctx, tileSize: ts } = this;
    const h = Math.max(3, Math.floor(ts * 0.1));
    // 影の色と混ざらないよう、黒いふちを付ける
    ctx.fillStyle = COLORS.hpBarEdge;
    ctx.fillRect(sx + 2, sy + ts - h - 2, ts - 4, h + 2);
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
    ctx.fillStyle = '#ffcf5a';
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
      // 千里の印を使った階では、見えていない敵の場所もわかる
      if (state.revealed || state.isVisible(m.pos.x, m.pos.y)) ctx.fillRect(left + m.pos.x * tile, top + m.pos.y * tile, tile, tile);
    }
    ctx.fillStyle = COLORS.miniAlly;
    for (const a of state.allies) ctx.fillRect(left + a.pos.x * tile, top + a.pos.y * tile, tile, tile);
    // 自分の印は、小さい地図では見落とさないよう1マスより大きくする
    const grow = tile <= 2 ? 1 : 0;
    ctx.fillStyle = COLORS.miniPlayer;
    ctx.fillRect(left + player.pos.x * tile - grow, top + player.pos.y * tile - grow, tile + grow * 2, tile + grow * 2);
  }
}
