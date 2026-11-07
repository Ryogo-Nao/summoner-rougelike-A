/**
 * 演出のしくみ（docs/effects.md）。
 * 場面（Scene）を「構える → 飛ぶ → 当たる」の3つの段に分けて、それぞれの長さを決める。
 * 粒（火の粉・破片など）と、画面の揺れもここで持つ。絵は作らず、コードで描く
 */

import type { Scene } from '../game/state';

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
/** 速さ「最小」で数字を見せる長さ */
const MIN_IMPACT_MS = 160;
/** 1回の行動で見せる場面の合計の長さの上限。こえるときは全体を速める */
export const TURN_CAP_MS = 2600;

/** 速さ「ふつう」のときの、場面の段の長さ */
export function timingOf(scene: Scene): EffectTiming {
  const impact = scene.popups.length > 0 ? IMPACT_MS : IMPACT_EMPTY_MS;
  switch (scene.action) {
    case 'throw':
    case 'shoot':
      return { windup: TOSS_MS, travel: Math.max(TRAVEL_MIN_MS, scene.cells.length * TRAVEL_PER_TILE_MS), impact };
    case 'item':
    case 'power':
    case 'guard':
      // 誰も踏み込まない。すぐに文字を出す
      return { windup: 0, travel: 0, impact };
    default:
      return { windup: scene.attacker < 0 ? 0 : WINDUP_MS, travel: 0, impact };
  }
}

/** 設定の速さに合わせた長さ */
export function scaledTiming(scene: Scene, speed: EffectSpeed): EffectTiming {
  const t = timingOf(scene);
  if (speed === 'min') return { windup: 0, travel: 0, impact: scene.popups.length > 0 ? MIN_IMPACT_MS : 0 };
  const k = speed === 'fast' ? 0.5 : 1;
  return { windup: t.windup * k, travel: t.travel * k, impact: t.impact * k };
}

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
  /** 大きさ（マスの何割か）、色、生きる長さと今の年（ミリ秒） */
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
        age: 0,
        glow: b.glow ?? false,
      });
    }
  }

  update(dt: number): void {
    const s = dt / 1000;
    for (const p of this.list) {
      p.age += dt;
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
