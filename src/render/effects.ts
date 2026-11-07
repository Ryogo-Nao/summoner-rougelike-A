/**
 * 演出のしくみ（docs/effects.md）。
 * 場面（Scene）を「構える → 飛ぶ → 当たる」の3つの段に分けて、それぞれの長さを決める。
 * 粒（火の粉・破片など）と、画面の揺れもここで持つ。絵は作らず、コードで描く
 */

import type { Motion } from '../game/characters';
import type { Scene, SceneAction } from '../game/state';

/**
 * 場面の段。windup は構える・踏み込むところ、travel は投げた物や魔法が飛ぶところ、
 * impact は当たるところ（受けた側が点滅し、数字が出る）
 */
export type EffectPhase = 'windup' | 'travel' | 'impact';

/** 段ごとの長さ（ミリ秒） */
export interface EffectTiming {
  windup: number;
  travel: number;
  impact: number;
}

/** 演出の速さ（設定）。min は動きをなくし、数字だけを短く出す */
export type EffectSpeed = 'normal' | 'fast' | 'min';

export const EFFECT_SPEED_LABEL: Record<EffectSpeed, string> = { normal: 'ふつう', fast: '速い', min: '最小' };

/** 踏み込む長さ、当たったところを見せる長さ。何も当たらなければ当たる段は短くする */
const WINDUP_MS = 170;
const IMPACT_MS = 280;
const IMPACT_EMPTY_MS = 60;
/** 投げる・撃つときに構える長さと、飛ぶ物が1マス進む長さ */
const TOSS_MS = 110;
const TRAVEL_PER_TILE_MS = 40;
const TRAVEL_MIN_MS = 80;
/** たおれた者がいる場面は、消えていくところまで見せる */
const IMPACT_DEFEAT_MS = 480;
/** 同じ者が続けて攻撃する2回目（2回攻撃）は、構えを短くする */
const REPEAT_WINDUP = 0.6;
/** 速さ「最小」で数字を見せる長さ */
const MIN_IMPACT_MS = 160;
/** 1回の行動で見せる場面の合計の長さの上限。こえるときは全体を速める */
export const TURN_CAP_MS = 2600;

/** 主人公が魔法陣を出して唱える魔法 */
export const CAST_ACTIONS: ReadonlySet<SceneAction> = new Set([
  'fire',
  'ice',
  'wind',
  'thunder',
  'earth',
  'bigFire',
  'power',
  'guard',
  'magic',
  'ward',
]);

/**
 * 魔法と星の段の長さ（ミリ秒）。cast は唱える（魔法陣）、travel は火が飛ぶ・炎が広がる、
 * impact は爆発・雷・守りの光などを見せる最低の長さ
 */
const SPELL_TIMING: Partial<Record<SceneAction, { cast: number; travel: number; impact: number }>> = {
  fire: { cast: 220, travel: 0, impact: 300 },
  ice: { cast: 220, travel: 0, impact: 320 },
  wind: { cast: 200, travel: 0, impact: 360 },
  earth: { cast: 300, travel: 360, impact: 420 },
  bigFire: { cast: 280, travel: 380, impact: 380 },
  thunder: { cast: 300, travel: 0, impact: 400 },
  power: { cast: 240, travel: 0, impact: 460 },
  guard: { cast: 240, travel: 0, impact: 460 },
  magic: { cast: 240, travel: 0, impact: 460 },
  ward: { cast: 240, travel: 0, impact: 460 },
  burst: { cast: 150, travel: 0, impact: 400 },
};

/**
 * 舌・触手、火を吐く、いかずちの段の長さ（ミリ秒）。windup は構える、travel は舌が伸びる・火が届く・稲妻が走る。
 * 舌は当たる段の初めに縮んで戻る
 */
const RANGED_TIMING: Partial<Record<SceneAction, EffectTiming>> = {
  reach: { windup: 120, travel: 150, impact: 300 },
  breath: { windup: 170, travel: 280, impact: 300 },
  lightning: { windup: 170, travel: 130, impact: 320 },
};
/** 封印した・レベルが上がった場面は、光の柱を見せきるまで当たる段を短くしない */
const GLORY_IMPACT_MS = 560;
/** ヒボシ・イテホシが1マス進む長さと、いちばん短い飛ぶ長さ */
const FIRE_PER_TILE_MS = 45;
const FIRE_TRAVEL_MIN_MS = 120;
/** 投げた炸裂の星が当たって爆発するときの、当たる段の長さ */
const BLAST_IMPACT_MS = 400;

/** 速さ「ふつう」のときの、場面の段の長さ */
export function timingOf(scene: Scene): EffectTiming {
  const impact = scene.defeated.length > 0 ? IMPACT_DEFEAT_MS : scene.popups.length > 0 ? IMPACT_MS : IMPACT_EMPTY_MS;
  // 封印とレベルアップは、光の柱を見せる
  const glory = scene.popups.some((p) => p.text === '封印' || p.text === 'Lv UP');
  const ranged = RANGED_TIMING[scene.action];
  if (ranged) return { ...ranged, impact: Math.max(impact, ranged.impact, glory ? GLORY_IMPACT_MS : 0) };
  const spell = SPELL_TIMING[scene.action];
  if (spell) {
    const travel =
      scene.action === 'fire' || scene.action === 'ice'
        ? Math.max(FIRE_TRAVEL_MIN_MS, scene.cells.length * FIRE_PER_TILE_MS)
        : spell.travel;
    return { windup: spell.cast, travel, impact: Math.max(impact, spell.impact) };
  }
  switch (scene.action) {
    case 'throw':
    case 'shoot': {
      const travel = Math.max(TRAVEL_MIN_MS, scene.cells.length * TRAVEL_PER_TILE_MS);
      // 投げた炸裂の星が当たったときは、爆発を見せる
      const blast = scene.item === 'starBurst' && scene.popups.some((p) => p.kind === 'damage');
      return {
        windup: TOSS_MS,
        travel,
        impact: Math.max(impact, blast ? BLAST_IMPACT_MS : 0, glory ? GLORY_IMPACT_MS : 0),
      };
    }
    case 'item':
      // 誰も踏み込まない。すぐに文字を出す
      return { windup: 0, travel: 0, impact };
    default:
      return { windup: scene.attacker < 0 ? 0 : WINDUP_MS, travel: 0, impact: Math.max(impact, glory ? GLORY_IMPACT_MS : 0) };
  }
}

/** 設定の速さに合わせた長さ。repeat は、前の場面と同じ者が同じ相手へ続けて攻撃する場面 */
export function scaledTiming(scene: Scene, speed: EffectSpeed, repeat = false): EffectTiming {
  const t = timingOf(scene);
  if (speed === 'min') return { windup: 0, travel: 0, impact: scene.popups.length > 0 ? MIN_IMPACT_MS : 0 };
  const k = speed === 'fast' ? 0.5 : 1;
  return { windup: t.windup * k * (repeat ? REPEAT_WINDUP : 1), travel: t.travel * k, impact: t.impact * k };
}

/** 場面 b が、場面 a と同じ者による、同じ相手への続けての攻撃か（2回攻撃の2回目） */
export function isRepeat(a: Scene | undefined, b: Scene): boolean {
  if (!a || a.action !== 'attack' || b.action !== 'attack' || a.attacker < 0 || b.attacker < 0) return false;
  return (
    a.actors[a.attacker].key === b.actors[b.attacker].key && a.toward.x === b.toward.x && a.toward.y === b.toward.y
  );
}

/**
 * 構える段で、攻撃する者の絵をどう動かすか（1枚の絵の動き）。
 * forward は相手の方へ進む量、lift は上へ浮く量（どちらもマスの何割か）、lean は前へ傾ける角度（ラジアン、前のめりが正）、
 * wobble は向きによらない揺れの角度、sx・sy は横・縦の伸び縮み
 */
export interface Pose {
  forward: number;
  lift: number;
  lean: number;
  wobble: number;
  sx: number;
  sy: number;
}

const REST: Pose = { forward: 0, lift: 0, lean: 0, wobble: 0, sx: 1, sy: 1 };
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/**
 * 区切り（0〜1 の時刻）ごとの形を、なめらかにつないだ動き。
 * keys は [時刻, 形] を時刻の順に並べたもの。最初と最後は REST（元の姿）
 */
function keyed(t: number, keys: [number, Partial<Pose>][]): Pose {
  const all: [number, Pose][] = [[0, REST], ...keys.map(([k, p]) => [k, { ...REST, ...p }] as [number, Pose]), [1, REST]];
  for (let i = 1; i < all.length; i++) {
    const [t1, p1] = all[i];
    const [t0, p0] = all[i - 1];
    if (t > t1) continue;
    const e = easeInOut(clamp01((t - t0) / (t1 - t0 || 1)));
    const mix = (k: keyof Pose) => p0[k] + (p1[k] - p0[k]) * e;
    return { forward: mix('forward'), lift: mix('lift'), lean: mix('lean'), wobble: mix('wobble'), sx: mix('sx'), sy: mix('sy') };
  }
  return REST;
}

/** 動き方ごとの形。t は構える段の進み具合（0〜1）。どれも 0.5〜0.6 ごろにいちばん相手に近づき、当たる段の前に元へ戻る */
export function motionPose(motion: Motion, t: number): Pose {
  switch (motion) {
    case 'bite':
      // 少し引いて、前のめりに噛みつく
      return keyed(t, [
        [0.32, { forward: -0.12, lean: -0.1, sx: 0.96, sy: 1.04 }],
        [0.55, { forward: 0.45, lean: 0.26, sx: 1.12, sy: 0.9 }],
      ]);
    case 'charge':
      // 低く構えてためてから、深く突っ込む
      return keyed(t, [
        [0.4, { forward: -0.22, lean: -0.12, sx: 1.12, sy: 0.84 }],
        [0.6, { forward: 0.62, lean: 0.2, sx: 1.16, sy: 0.88 }],
        [0.75, { forward: 0.5, lean: 0.08 }],
      ]);
    case 'pounce':
      // かがんで、山なりに飛びかかり、着地でつぶれる
      return keyed(t, [
        [0.25, { sx: 1.12, sy: 0.84 }],
        [0.45, { forward: 0.3, lift: 0.36, lean: 0.12, sx: 0.94, sy: 1.1 }],
        [0.62, { forward: 0.55, lift: 0.04, lean: 0.18 }],
        [0.72, { forward: 0.5, sx: 1.14, sy: 0.86 }],
      ]);
    case 'swoop':
      // 舞い上がってから、斜めに急降下する
      return keyed(t, [
        [0.38, { forward: -0.08, lift: 0.38, lean: -0.1, sx: 1.06, sy: 0.96 }],
        [0.6, { forward: 0.52, lift: 0, lean: 0.38 }],
      ]);
    case 'slam':
      // 伸び上がって、前へ倒れこむようにのしかかる
      return keyed(t, [
        [0.42, { forward: -0.05, lift: 0.22, lean: -0.12, sx: 0.92, sy: 1.12 }],
        [0.58, { forward: 0.36, lift: 0, lean: 0.14, sx: 1.22, sy: 0.78 }],
        [0.72, { forward: 0.3, sx: 1.08, sy: 0.94 }],
      ]);
    case 'float':
      // ふわりと漂って寄り、揺れながら触れる
      return keyed(t, [
        [0.3, { forward: 0.1, lift: 0.1, wobble: -0.16 }],
        [0.58, { forward: 0.38, lift: 0.06, wobble: 0.16, sx: 1.06, sy: 0.96 }],
        [0.8, { forward: 0.12, lift: 0.04, wobble: -0.06 }],
      ]);
    case 'sting':
      // 引いてためて、すばやく突き刺す
      return keyed(t, [
        [0.45, { forward: -0.16, lean: -0.14, sx: 0.94, sy: 1.06 }],
        [0.56, { forward: 0.56, lean: 0.1, sx: 1.16, sy: 0.9 }],
        [0.7, { forward: 0.5 }],
      ]);
    case 'swipe':
      // 体を引いて振りかぶり、前へ薙ぎ払う
      return keyed(t, [
        [0.38, { forward: -0.06, lean: -0.38, sx: 0.98, sy: 1.04 }],
        [0.58, { forward: 0.32, lean: 0.4, sx: 1.08, sy: 0.96 }],
      ]);
  }
}

/** 魔法を唱える姿。杖を掲げるように、少しのけぞって伸び上がる */
export function castPose(t: number): Pose {
  return keyed(t, [
    [0.35, { lift: 0.04, lean: -0.12, sx: 0.95, sy: 1.08 }],
    [0.8, { lift: 0.06, lean: -0.06, sx: 0.97, sy: 1.06 }],
  ]);
}

/** 炸裂の星を食べる姿。ぴょんと跳ねる */
export function hopPose(t: number): Pose {
  return keyed(t, [
    [0.25, { sx: 1.1, sy: 0.88 }],
    [0.6, { lift: 0.14, sx: 0.95, sy: 1.08 }],
  ]);
}

/** 薙ぎ払う動きで、相手のマスに斬った跡を出す時刻（構える段の進み具合） */
export const SLASH_FROM = 0.46;
export const SLASH_TO = 0.86;

export const totalOf = (t: EffectTiming) => t.windup + t.travel + t.impact;

/** 場面が始まってから elapsed ミリ秒たったときの段と、その段の中の進み具合（0〜1） */
export function phaseAt(t: EffectTiming, elapsed: number): { phase: EffectPhase; t: number } {
  if (elapsed < t.windup) return { phase: 'windup', t: elapsed / t.windup };
  if (elapsed < t.windup + t.travel) return { phase: 'travel', t: (elapsed - t.windup) / t.travel };
  return { phase: 'impact', t: t.impact > 0 ? Math.min(1, (elapsed - t.windup - t.travel) / t.impact) : 1 };
}

/** 粒1つ。位置と速さはマス単位（カメラが動いてもマップの上に残る） */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 下向きの重さ（マス/秒²） */
  gravity: number;
  /** 大きさ（マスの何割か）、色、生きる長さと今の年（ミリ秒）。年が負の間は、まだ出ていない */
  size: number;
  color: string;
  life: number;
  age: number;
  /** true なら重ねるほど明るくなる（光・火） */
  glow: boolean;
}


/** 一度に出せる粒の数。iPhone で重くならないよう上限を決める */
const MAX_PARTICLES = 240;

export interface Burst {
  /** 出す場所（マスの左上が整数。まん中は +0.5） */
  x: number;
  y: number;
  count: number;
  color: string | string[];
  /** 飛び出す速さ（マス/秒）の範囲 */
  speed: [number, number];
  size: [number, number];
  life: [number, number];
  gravity?: number;
  glow?: boolean;
  /** 出るまで待つ時間（ミリ秒） */
  delay?: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** 粒の集まり。毎フレーム update で動かし、draw で描く */
export class Particles {
  private list: Particle[] = [];

  get alive(): boolean {
    return this.list.length > 0;
  }

  /** 1点から、まわりへ飛び散らせる */
  burst(b: Burst): void {
    for (let i = 0; i < b.count && this.list.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(...b.speed);
      const colors = Array.isArray(b.color) ? b.color : [b.color];
      this.list.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: b.gravity ?? 0,
        size: rand(...b.size),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: rand(...b.life),
        age: -(b.delay ?? 0),
        glow: b.glow ?? false,
      });
    }
  }

  update(dt: number): void {
    const s = dt / 1000;
    for (const p of this.list) {
      p.age += dt;
      if (p.age < 0) continue;
      p.vy += p.gravity * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  /** toScreen はマスの位置から画面の位置（マスの左上）への変換、ts はマスの大きさ（px） */
  draw(ctx: CanvasRenderingContext2D, toScreen: (pos: { x: number; y: number }) => { x: number; y: number }, ts: number): void {
    if (this.list.length === 0) return;
    ctx.save();
    for (const p of this.list) {
      if (p.age < 0) continue;
      const { x, y } = toScreen(p);
      const fade = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.5, p.size * ts * (0.4 + 0.6 * fade)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** 広がって消える輪（爆発の衝撃・力の魔法など）。位置と半径はマス単位 */
interface Ring {
  x: number;
  y: number;
  start: number;
  duration: number;
  radius: number;
  color: string;
  /** 縦につぶして、地面に描いたように見せる */
  flat: boolean;
}

/** 広がる輪の集まり */
export class Rings {
  private list: Ring[] = [];

  add(ring: Omit<Ring, 'start'>, now: number): void {
    this.list.push({ ...ring, start: now });
  }

  alive(now: number): boolean {
    this.list = this.list.filter((r) => now - r.start < r.duration);
    return this.list.length > 0;
  }

  draw(ctx: CanvasRenderingContext2D, toScreen: (pos: { x: number; y: number }) => { x: number; y: number }, ts: number, now: number): void {
    if (!this.alive(now)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.list) {
      const t = (now - r.start) / r.duration;
      const { x, y } = toScreen(r);
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1.5, ts * 0.09 * (1 - t));
      ctx.beginPath();
      const rad = r.radius * ts * (0.25 + 0.75 * easeInOut(t));
      ctx.ellipse(x, y, rad, r.flat ? rad * 0.45 : rad, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** 画面全体の光り（雷・爆発）。色と強さが、長さの間に0へ減っていく */
export class Flash {
  private color = '255,255,255';
  private strength = 0;
  private start = 0;
  private duration = 0;

  kick(color: string, strength: number, duration: number, now: number): void {
    this.color = color;
    this.strength = strength;
    this.start = now;
    this.duration = duration;
  }

  active(now: number): boolean {
    return now - this.start < this.duration;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
    if (!this.active(now)) return;
    const t = (now - this.start) / this.duration;
    ctx.fillStyle = `rgba(${this.color}, ${this.strength * (1 - t) * (1 - t)})`;
    // 画面が揺れていても端が残らないよう、少し広く塗る
    ctx.fillRect(-w * 0.1, -h * 0.1, w * 1.2, h * 1.2);
  }
}

/** 画面の揺れ。大きさ（マスの何割か）が、長さの間に0へ減っていく */
export class Shake {
  private amount = 0;
  private start = 0;
  private duration = 0;

  /** 揺らす。今の揺れより弱ければ何もしない */
  kick(amount: number, duration: number, now: number): void {
    if (this.offsetAmount(now) > amount) return;
    this.amount = amount;
    this.start = now;
    this.duration = duration;
  }

  private offsetAmount(now: number): number {
    const t = (now - this.start) / this.duration;
    return t >= 1 || this.duration === 0 ? 0 : this.amount * (1 - t);
  }

  active(now: number): boolean {
    return this.offsetAmount(now) > 0;
  }

  /** 今ずらす量（px） */
  offset(now: number, ts: number): { x: number; y: number } {
    const a = this.offsetAmount(now) * ts;
    if (a === 0) return { x: 0, y: 0 };
    return { x: Math.sin(now / 17) * a, y: Math.cos(now / 23) * a };
  }
}
