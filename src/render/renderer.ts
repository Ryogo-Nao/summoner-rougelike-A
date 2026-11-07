import type { ActorView, GameState, Popup, Scene, SceneAction } from '../game/state';
import { ITEMS } from '../game/items';
import { DIR_VECTORS, type Dir } from '../game/dir';
import { Tile } from '../game/map';
import { characterInfo, type Motion } from '../game/characters';
import { artImage, itemArt } from './art';
import {
  CAST_ACTIONS,
  Flash,
  Particles,
  Rings,
  SLASH_FROM,
  SLASH_TO,
  Shake,
  castPose,
  hopPose,
  motionPose,
  type EffectPhase,
  type Pose,
} from './effects';
import { SpellFx } from './spells';
import { buildTerrain, terrainTile, type Terrain } from './terrain';

/**
 * 場面を再生している途中の様子（段の分け方は effects.ts）。t はその段の中の進み具合で 0〜1
 */
export interface Playback {
  scene: Scene;
  phase: EffectPhase;
  t: number;
}

/** 踏み込む深さ（マスの何割か）。魔法などで使う。投げる・撃つときは軽く構えるだけ */
const LUNGE_DEPTH = 0.4;
const TOSS_DEPTH = 0.18;
/** 主人公の攻撃の動き方（武器を振る） */
const PLAYER_MOTION: Motion = 'swipe';
/** 攻撃を受けた側が押される量（マスの何割か） */
const KNOCKBACK = 0.14;
/** たおれた者が消えていく動き。当たる段のこの時刻から薄くなり、沈んで小さくなる */
const FADE_FROM = 0.35;
const SMOKE = ['#e8e2d6', '#c9c1b4', '#a79f93'];
/** 構える段で踏み込まない場面 */
const NO_LUNGE: ReadonlySet<SceneAction> = new Set(['item']);
/** 当たったときの火花の色。こちらが与えたダメージは白と金、受けたダメージは赤 */
const SPARK_DEAL = ['#ffffff', '#ffe58a', '#ffd84a'];
const SPARK_HURT = ['#ffffff', '#ff9aa6', '#ff5a6e'];
/** 主人公がダメージを受けたときの画面の揺れ（マスの何割か、ミリ秒） */
const HURT_SHAKE = 0.07;
const HURT_SHAKE_MS = 200;

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

/**
 * 絵文字を描くときの色。iPhone では絵文字も今の塗りの色（グラデーションなど）で塗られてしまい、
 * 消えて見えることがあるので、絵文字を描く前に必ずこの色にする
 */
const EMOJI_FILL = '#ffffff';

/** 色は style.css の色の決まりと合わせる。床と壁の色は、ダンジョンごとの見た目（MapTheme）で決める */
const COLORS = {
  /** 見たことはあるが今は見えていないマスに重ねる色 */
  memory: 'rgba(10, 6, 3, 0.4)',
  /** まだ見ていないマス。床と壁の形が、うっすら分かるくらいに暗くする */
  unexplored: 'rgba(10, 6, 3, 0.7)',
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
  /** 向いている方向の矢印と、正面のマスの枠 */
  facing: '#ffd84a',
  facingEdge: '#3d2f22',
  facingTile: 'rgba(255, 216, 74, 0.13)',
  facingTileEdge: 'rgba(255, 216, 74, 0.8)',
  /** 見通しのマス目の線と、8方向にまっすぐ並ぶマスの色 */
  lookGrid: 'rgba(255, 244, 208, 0.42)',
  lookLine: 'rgba(120, 200, 255, 0.16)',
};

/** 見通しで、通路にいるときに線を引く範囲（自分からのマス数） */
const LOOK_REACH = 4;

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

/** from から to への向きの、長さ1のベクトル（8方向。同じマスなら 0） */
function unitToward(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

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
  /** true のとき「見通し」。今いる部屋のマス目に線を引き、自分から8方向にまっすぐ並ぶマスに色を付ける */
  lookMode = false;
  private minimapRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  /** 歩いている途中のもの（ActorView.key ごと） */
  private steps = new Map<string, Step>();
  /** 今の階の床と壁の絵。階やダンジョンが変わったら作り直す */
  private terrain: Terrain | null = null;
  private rockSource: HTMLCanvasElement | null = null;
  private rockPattern: CanvasPattern | null = null;
  /** 絵を左右反転しているか。上下を向いたときは前の向きのまま */
  private flipped = new Map<string, boolean>();
  /** 火花などの粒と、画面の揺れ */
  private readonly particles = new Particles();
  private readonly shake = new Shake();
  /** 広がる輪と、画面全体の光り。魔法と星の演出（spells.ts）が使う */
  private readonly rings = new Rings();
  private readonly flash = new Flash();
  private readonly spells = new SpellFx(this.particles, this.rings, this.flash, this.shake);
  /** 当たる段の始まりの演出（火花・揺れ）を出し終えた場面 */
  private impacted = new WeakSet<Scene>();
  /** 前に描いた時刻。粒を動かす */
  private lastDraw = 0;

  /** 歩いている途中のもの、飛んでいる粒、画面の揺れがあるか。あれば毎フレーム描き続ける */
  moving(now = performance.now()): boolean {
    if (this.particles.alive || this.shake.active(now) || this.rings.alive(now) || this.flash.active(now)) return true;
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
    // 粒は前に描いてからの時間だけ動かす（間があきすぎたときは止まっていたことにする）
    this.particles.update(Math.min(100, Math.max(0, now - this.lastDraw)));
    this.lastDraw = now;
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

    // 画面の揺れ。ミニマップは揺らさない
    const quake = this.shake.offset(now, ts);
    ctx.save();
    ctx.translate(quake.x, quake.y);
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
    // マップの外は、壁の奥と同じ岩で埋める。岩の模様はマップの左上にそろえ、壁とつながるようにする
    if (this.rockSource !== this.terrain!.rock) {
      this.rockSource = this.terrain!.rock;
      this.rockPattern = ctx.createPattern(this.terrain!.rock, 'repeat');
    }
    const rock = this.rockPattern!;
    const rs = (ts * 4) / this.terrain!.rock.width;
    rock.setTransform(new DOMMatrix().translate(px0 - cam.x * ts, py0 - cam.y * ts).scale(rs));
    ctx.fillStyle = rock;
    ctx.fillRect(0, 0, viewW, viewH);
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
          ctx.fillStyle = COLORS.unexplored;
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
    if (this.lookMode) this.drawLookGrid(state, toScreen);
    const me = actors.find((a) => a.isPlayer);
    if (me) this.drawFacingTile(toScreen({ x: cam.x, y: cam.y }), me.facing);

    // 投げた物・矢が飛んでいる間は、落ちる先に置かれた物をまだ出さない
    const flying = play && (play.scene.action === 'throw' || play.scene.action === 'shoot') && play.phase !== 'impact';
    const landing = flying ? play.scene.cells[play.scene.cells.length - 1] : undefined;
    // 落ちているアイテムは、見たことのあるマスなら出す
    ctx.fillStyle = EMOJI_FILL;
    ctx.font = `${Math.floor(ts * 0.62)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    for (const f of state.floorItems) {
      if (!state.isExplored(f.pos.x, f.pos.y)) continue;
      if (landing && f.pos.x === landing.x && f.pos.y === landing.y && f.item.kind === play!.scene.item) continue;
      const { x: sx, y: sy } = toScreen(f.pos);
      if (sx < -ts || sx > viewW || sy < -ts || sy > viewH) continue;
      // 絵があれば絵で、なければ絵文字で出す
      const id = itemArt(f.item.kind);
      const img = id ? artImage(id) : null;
      if (img) ctx.drawImage(img, sx + ts * 0.14, sy + ts * 0.14, ts * 0.72, ts * 0.72);
      else ctx.fillText(ITEMS[f.item.kind].emoji, sx + ts / 2, sy + ts / 2 + 1);
    }
    ctx.font = `${Math.floor(ts * 0.78)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

    const impact = play?.phase === 'impact';
    if (play && impact && !this.impacted.has(play.scene)) {
      this.impacted.add(play.scene);
      this.startImpact(play.scene, now);
    }
    const popups = play ? (impact ? play.scene.popups : []) : state.popups;
    // 攻撃を受けたマス。点滅させる
    const hurt = new Set(
      popups.filter((p) => p.kind === 'damage' || p.kind === 'hurt').map((p) => `${p.pos.x},${p.pos.y}`),
    );
    const attackerPos = play && play.scene.attacker >= 0 ? play.scene.actors[play.scene.attacker].pos : undefined;
    // 魔法陣は役者より下に描く
    if (play) this.spells.ground(ctx, play, toScreen, ts, now);
    actors.forEach((actor, i) => {
      const at = shown.get(actor.key)!;
      let { x: sx, y: sy } = toScreen(at);
      // 歩いている間は小さく跳ねる
      sy -= Math.sin(at.t * Math.PI) * HOP * ts;
      let pose: Pose | undefined;
      let alpha = 1;
      if (play?.phase === 'windup' && i === play.scene.attacker && !NO_LUNGE.has(play.scene.action)) {
        const { x: ux, y: uy } = unitToward(actor.pos, play.scene.toward);
        if (play.scene.action === 'attack' || CAST_ACTIONS.has(play.scene.action) || play.scene.action === 'burst') {
          // 隣への攻撃は種族ごとの動き方（キャラクターの台帳）で、魔法は唱える姿で、炸裂の星はぴょんと跳ねて動く
          pose =
            play.scene.action === 'attack'
              ? motionPose(actor.isPlayer ? PLAYER_MOTION : characterInfo(actor.art).motion, play.t)
              : play.scene.action === 'burst'
                ? hopPose(play.t)
                : castPose(play.t);
          sx += ux * pose.forward * ts;
          sy += uy * pose.forward * ts - pose.lift * ts;
        } else {
          // 舌・火を吐く・いかずち・投げるなどは、相手の方へ踏み込んで、元の位置に戻る
          const tossing = play.scene.action === 'throw' || play.scene.action === 'shoot';
          const depth = Math.sin(play.t * Math.PI) * (tossing ? TOSS_DEPTH : LUNGE_DEPTH) * ts;
          sx += ux * depth;
          sy += uy * depth;
        }
      }
      if (impact && hurt.has(`${actor.pos.x},${actor.pos.y}`)) {
        // 受けた側は、攻撃してきた方から押されて戻り、細かく揺れて点滅する
        const t = play!.t;
        if (attackerPos) {
          const { x: kx, y: ky } = unitToward(attackerPos, actor.pos);
          const push = KNOCKBACK * ts * Math.max(0, 1 - t * 2.5) ** 2;
          sx += kx * push;
          sy += ky * push;
        }
        if (t < FADE_FROM || !play!.scene.defeated.includes(actor.key)) {
          if (Math.floor(t * 6) % 2 === 1) return;
          sx += Math.sin(t * Math.PI * 8) * ts * 0.06;
        }
      }
      if (impact && play!.scene.defeated.includes(actor.key) && play!.t >= FADE_FROM) {
        // たおれた者は、沈みながら小さく薄くなって消える
        const f = (play!.t - FADE_FROM) / (1 - FADE_FROM);
        alpha = 1 - f;
        sy += f * ts * 0.18;
        pose = { forward: 0, lift: 0, lean: 0, wobble: f * 0.3, sx: 1 - f * 0.4, sy: 1 - f * 0.55 };
      }
      if (alpha <= 0) return;
      this.drawActor(actor, sx, sy, now, pose, alpha, play && i === play.scene.attacker ? play.scene.toward : undefined);
    });

    if (play?.phase === 'windup' && play.scene.action === 'attack') this.drawSlash(play, toScreen);
    if (play?.phase === 'travel') this.drawFlying(play, toScreen);
    if (play) this.spells.top(ctx, play, toScreen, ts, now);
    this.rings.draw(ctx, toScreen, ts, now);
    this.particles.draw(ctx, (p) => toScreen(p), ts);
    this.flash.draw(ctx, viewW, viewH, now);
    this.drawPopups(popups, toScreen, impact ? play!.t : 1);
    ctx.restore();

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

  /**
   * 当たる段の始まり。ダメージを受けたマスに火花を散らし、主人公が受けたときは画面を揺らす
   */
  private startImpact(scene: Scene, now: number): void {
    this.spells.impact(scene, now);
    const me = scene.actors.find((a) => a.isPlayer)?.pos;
    for (const p of scene.popups) {
      if (p.kind !== 'damage' && p.kind !== 'hurt') continue;
      this.particles.burst({
        x: p.pos.x + 0.5,
        y: p.pos.y + 0.45,
        count: 10,
        color: p.kind === 'damage' ? SPARK_DEAL : SPARK_HURT,
        speed: [1.6, 3.4],
        size: [0.035, 0.07],
        life: [180, 320],
        glow: true,
      });
      if (p.kind === 'hurt' && me && p.pos.x === me.x && p.pos.y === me.y) this.shake.kick(HURT_SHAKE, HURT_SHAKE_MS, now);
    }
    // たおれた者からは、消えていくときに煙が立ちのぼる
    for (const key of scene.defeated) {
      const a = scene.actors.find((x) => x.key === key);
      if (!a) continue;
      this.particles.burst({
        x: a.pos.x + 0.5,
        y: a.pos.y + 0.55,
        count: 14,
        color: SMOKE,
        speed: [0.3, 1.1],
        size: [0.06, 0.12],
        life: [380, 620],
        gravity: -1.2,
        delay: 120,
      });
    }
  }

  /**
   * 薙ぎ払う動き（主人公と、爪・はさみ・触手の魔物）で、相手のマスに斬った跡の弧を出す
   */
  private drawSlash(play: Playback, toScreen: (pos: { x: number; y: number }) => { x: number; y: number }): void {
    const { scene, t } = play;
    const actor = scene.actors[scene.attacker];
    if (!actor || t < SLASH_FROM || t > SLASH_TO) return;
    const motion = actor.isPlayer ? PLAYER_MOTION : characterInfo(actor.art).motion;
    if (motion !== 'swipe') return;
    const { ctx, tileSize: ts } = this;
    const k = (t - SLASH_FROM) / (SLASH_TO - SLASH_FROM);
    const { x, y } = toScreen(scene.toward);
    const { x: ux, y: uy } = unitToward(actor.pos, scene.toward);
    // 弧は、攻撃してくる向きに直角に、上から下へ振り下ろす
    const base = Math.atan2(uy, ux);
    const from = base - Math.PI * 0.55;
    const sweep = Math.PI * 1.1 * Math.min(1, k * 1.8);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 250, 220, 0.95)';
    ctx.lineWidth = Math.max(2, ts * 0.08);
    ctx.beginPath();
    ctx.arc(x + ts / 2 - ux * ts * 0.25, y + ts * 0.45 - uy * ts * 0.25, ts * 0.42, from, from + sweep);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 飛ぶ段。投げた物・矢を、投げた者のマスから道すじの最後のマスまで動かす。
   * 投げた物は回り、矢は飛ぶ向きを向く（矢の絵は右上を向いている）
   */
  private drawFlying(play: Playback, toScreen: (pos: { x: number; y: number }) => { x: number; y: number }): void {
    const { scene, t } = play;
    if (scene.action !== 'throw' && scene.action !== 'shoot') return;
    const from = scene.actors[scene.attacker]?.pos;
    const to = scene.cells[scene.cells.length - 1];
    if (!from || !to || !scene.item) return;
    const { ctx, tileSize: ts } = this;
    const a = toScreen(from);
    const b = toScreen(to);
    const x = a.x + (b.x - a.x) * t + ts / 2;
    // 投げた物は少し山なりに飛ぶ
    const arc = scene.action === 'throw' ? Math.sin(t * Math.PI) * ts * 0.25 : 0;
    const y = a.y + (b.y - a.y) * t + ts * 0.45 - arc;
    const angle =
      scene.action === 'shoot' ? Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 4 : t * Math.PI * 3;
    const id = itemArt(scene.item);
    const img = id ? artImage(id) : null;
    const size = ts * 0.62;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
    else {
      ctx.fillStyle = EMOJI_FILL;
      ctx.font = `${Math.floor(ts * 0.5)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(ITEMS[scene.item].emoji, 0, 1);
    }
    ctx.restore();
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

  /**
   * pose は攻撃・たおれるときの動き（傾き・伸び縮み）、alpha は薄さ、toward は攻撃する相手のマス（前へ傾ける向きを決める）
   */
  private drawActor(
    actor: ActorView,
    sx: number,
    sy: number,
    now: number,
    pose?: Pose,
    alpha = 1,
    toward?: { x: number; y: number },
  ): void {
    const { ctx, tileSize: ts } = this;
    // 絵は左下を向いている。右を向いたら反転する。上下を向いたときは前の向きのまま
    if (actor.facing >= 1 && actor.facing <= 3) this.flipped.set(actor.key, true);
    else if (actor.facing >= 5) this.flipped.set(actor.key, false);
    const flip = this.flipped.get(actor.key) ?? false;
    // 前へ傾ける向き。相手が右なら時計回り、左なら反時計回り。真上・真下なら絵の向いている側へ
    const dx = toward ? Math.sign(toward.x - actor.pos.x) : 0;
    const side = dx !== 0 ? dx : flip ? 1 : -1;
    const rot = pose ? pose.lean * side + pose.wobble : 0;
    ctx.globalAlpha = alpha;
    // 立っている間は、息をするように少し伸び縮みする。ひとりずつ少しずらす
    let phase = 0;
    for (const c of actor.key) phase += c.charCodeAt(0);
    const breath = Math.sin((now / BREATH_MS) * Math.PI * 2 + phase) * BREATH;
    // 飛び上がっている間も、影とHPの棒は地面に残す。影は高く上がるほど小さくする
    const lift = (pose?.lift ?? 0) * ts;
    const ground = sy + lift;
    const shrink = 1 - Math.min(0.5, pose?.lift ?? 0);
    // 足もとの影で、味方と敵を見分けやすくする。アイテムには付けない
    ctx.save();
    ctx.fillStyle = actor.enemy ? COLORS.enemyShadow : COLORS.allyShadow;
    ctx.beginPath();
    // HPの棒（マスの下端）に重ならないよう、棒より上で終わらせる
    ctx.ellipse(sx + ts / 2, ground + ts * 0.75, ts * 0.42 * shrink, ts * 0.12 * shrink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = EMOJI_FILL;
    const img = artImage(actor.art);
    // 足もと（影の真ん中あたり）を軸に、伸び縮みと反転をする
    const footX = sx + ts / 2;
    const footY = sy + ts * 0.8;
    ctx.save();
    ctx.translate(footX, footY);
    ctx.rotate(rot);
    ctx.scale((flip ? -1 : 1) * (1 - breath / 2) * (pose?.sx ?? 1), (1 + breath) * (pose?.sy ?? 1));
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
    if (actor.hp) this.drawHpBar(sx, ground, actor.hp.ratio, actor.hp.ally ? COLORS.allyHpBar : COLORS.hpBar);
    if (actor.isPlayer) this.drawFacingArrow(sx + ts / 2, ground + ts / 2, actor.facing);
    ctx.globalAlpha = 1;
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

  /** 主人公の向いている方向に、マスのふちから外へ向けた金の矢印を出す */
  private drawFacingArrow(cx: number, cy: number, facing: number): void {
    const { ctx, tileSize: ts } = this;
    const angle = (facing * Math.PI) / 4 - Math.PI / 2;
    // 斜めはマスの角まで遠いので、少し外に出す
    const r = ts * (facing % 2 === 1 ? 0.58 : 0.5);
    const size = Math.max(5, ts * 0.17);
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.8);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.7, size * 0.8);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, ts * 0.05);
    ctx.strokeStyle = COLORS.facingEdge;
    ctx.stroke();
    ctx.fillStyle = COLORS.facing;
    ctx.fill();
    ctx.restore();
  }

  /** 主人公の正面のマスを、金の枠でうっすら強調する。me は主人公が見えている位置（マスの左上） */
  private drawFacingTile(me: { x: number; y: number }, facing: Dir): void {
    const { ctx, tileSize: ts } = this;
    const v = DIR_VECTORS[facing];
    const x = me.x + v.x * ts;
    const y = me.y + v.y * ts;
    const inset = Math.max(2, ts * 0.06);
    ctx.save();
    ctx.fillStyle = COLORS.facingTile;
    ctx.strokeStyle = COLORS.facingTileEdge;
    ctx.lineWidth = Math.max(1.5, ts * 0.05);
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, ts - inset * 2, ts - inset * 2, ts * 0.14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 見通し。今いる部屋の床のマスに線を引く（通路にいるときは、見えている近くの床）。
   * 自分から縦・横・斜めにまっすぐ並ぶマスには色を付け、矢や魔法が届く列と距離を数えやすくする
   */
  private drawLookGrid(state: GameState, toScreen: (pos: { x: number; y: number }) => { x: number; y: number }): void {
    const { ctx, tileSize: ts } = this;
    const { map, player } = state;
    const p = player.pos;
    const room = map.roomAt(p.x, p.y);
    const cells: { x: number; y: number }[] = [];
    if (room) {
      for (let y = room.y - 1; y <= room.y + room.h; y++)
        for (let x = room.x - 1; x <= room.x + room.w; x++) if (map.roomAt(x, y) === room && map.isWalkable(x, y)) cells.push({ x, y });
    } else {
      for (let y = p.y - LOOK_REACH; y <= p.y + LOOK_REACH; y++)
        for (let x = p.x - LOOK_REACH; x <= p.x + LOOK_REACH; x++) if (map.isWalkable(x, y) && state.isVisible(x, y)) cells.push({ x, y });
    }
    ctx.save();
    ctx.lineWidth = 1;
    for (const c of cells) {
      const { x, y } = toScreen(c);
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      const onLine = (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy));
      if (onLine) {
        ctx.fillStyle = COLORS.lookLine;
        ctx.fillRect(x, y, ts, ts);
      }
      ctx.strokeStyle = COLORS.lookGrid;
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, ts - 1, ts - 1);
    }
    ctx.restore();
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
