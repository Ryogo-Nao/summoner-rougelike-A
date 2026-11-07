/**
 * 魔法と星の演出（docs/effects.md 3章）。絵は作らず、光・粒・形をコードで描く。
 * ground は役者より下（魔法陣）、top は役者より上（火の玉・炎・雷・盾）、impact は当たる段の始まりに一度だけ呼ぶ
 */

import type { Scene } from '../game/state';
import { CAST_ACTIONS, type Flash, type Particles, type Rings, type Shake } from './effects';
import type { Playback } from './renderer';

type ToScreen = (pos: { x: number; y: number }) => { x: number; y: number };

/** 魔法ごとの色（r, g, b） */
const SPELL_RGB: Record<string, string> = {
  fire: '255, 150, 50',
  ice: '140, 210, 255',
  wind: '150, 240, 170',
  earth: '255, 210, 120',
  bigFire: '255, 100, 40',
  thunder: '255, 236, 120',
  power: '255, 110, 80',
  guard: '120, 190, 255',
  magic: '190, 120, 255',
  ward: '110, 230, 210',
};
const FIRE = ['#fff6d0', '#ffd84a', '#ff9a3a', '#ff5a2a'];
const SMOKE = ['#e8e2d6', '#c9c1b4', '#a79f93'];
const SPARK = ['#ffffff', '#fff3a0', '#ffe14a'];
const ICE = ['#ffffff', '#d8f2ff', '#9fd8ff', '#6fb8f0'];
const WIND = ['#ffffff', '#d8ffe0', '#9ff0b4'];
const STAR = ['#ffffff', '#fff3b0', '#ffd84a', '#ffb347'];
const DUST = ['#d8c8a8', '#b8a07a', '#8f7a5a'];
const POWER = ['#ffd84a', '#ff9a5a', '#ff6a5a'];
const GUARD = ['#ffffff', '#bfe4ff', '#7cc4ff'];
const MAGIC = ['#ffffff', '#e4c4ff', '#b47cff'];
const WARD = ['#ffffff', '#c8fff2', '#64dcc8'];

/** 力の魔法・魔攻の魔法の光（下の色・上の色）と、守りの魔法・魔防の魔法の壁の色（r, g, b の内・中・ふち） */
const AURA_RGB: Record<string, [string, string]> = { power: ['255, 120, 70', '255, 220, 90'], magic: ['170, 100, 255', '235, 200, 255'] };
const SHIELD_RGB: Record<string, [string, string, string]> = {
  guard: ['120, 190, 255', '140, 205, 255', '220, 240, 255'],
  ward: ['90, 220, 200', '120, 235, 215', '215, 255, 245'],
};

const HEAL = ['#ffffff', '#b8ffd8', '#5fe8a0'];
const GOLD = ['#ffffff', '#fff3b0', '#ffd84a'];

/**
 * 状態異常・状態の変化（Popup の kind が status）の文字ごとの、粒の色と動き。
 * rise は上へ昇る（泡・光）、fall は下へ落ちる、burst はまわりへ散る
 */
const STATUS_FX: Record<string, { color: string[]; move: 'rise' | 'fall' | 'burst'; ring?: string }> = {
  混乱: { color: ['#fff6a0', '#ffd84a', '#ffffff'], move: 'burst', ring: 'rgba(255, 230, 120, 1)' },
  毒: { color: ['#d6a0ff', '#a060e0', '#7a3fc0'], move: 'rise' },
  眠り: { color: ['#d8ecff', '#a8d0ff', '#ffffff'], move: 'rise' },
  はりつけ: { color: ['#ffffff', '#e8e8f0', '#c8c8d8'], move: 'burst', ring: 'rgba(240, 240, 255, 1)' },
  激昂: { color: ['#ffb070', '#ff6a4a', '#ffd84a'], move: 'rise', ring: 'rgba(255, 120, 80, 1)' },
  要塞: { color: ['#d8e8ff', '#9ab8e0', '#ffffff'], move: 'burst', ring: 'rgba(170, 200, 240, 1)' },
  治った: { color: HEAL, move: 'rise' },
};
/** MP が減ったとき（クイムシ）。青い粒が下へこぼれる */
const MP_LOSS = { color: ['#a8c8ff', '#6f9dff', '#ffffff'], move: 'fall' as const };

/** 舌・触手の色。触手はヌラリカ、ほかは舌 */
const TENTACLE = new Set(['nurarika']);

/** 白紙カードで封印した場面か */
export function isSeal(scene: Scene): boolean {
  return scene.item === 'blank' && scene.popups.some((p) => p.text === '封印');
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** 決まった種からの 0〜1 の数（毎フレーム同じ形の稲妻を描くため） */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export class SpellFx {
  constructor(
    private readonly particles: Particles,
    private readonly rings: Rings,
    private readonly flash: Flash,
    private readonly shake: Shake,
  ) {}

  /** 唱える段の、主人公の足もとの魔法陣。力の魔法の光は、絵を隠さないよう役者の後ろに描く */
  ground(ctx: CanvasRenderingContext2D, play: Playback, toScreen: ToScreen, ts: number, now: number): void {
    const { scene } = play;
    const aura = AURA_RGB[scene.action];
    if (aura && play.phase === 'impact') {
      for (const c of scene.cells) {
        const p = toScreen(c);
        this.aura(ctx, p.x + ts / 2, p.y + ts * 0.5, ts, play.t, now, aura);
      }
    }
    if (!CAST_ACTIONS.has(scene.action) || play.phase !== 'windup') return;
    const caster = scene.actors[scene.attacker];
    if (!caster) return;
    const { x, y } = toScreen(caster.pos);
    // 出てきて、少し回って、薄れる
    const t = play.t;
    const alpha = Math.min(1, t * 4) * (t > 0.8 ? (1 - t) / 0.2 : 1);
    this.circle(ctx, x + ts / 2, y + ts * 0.78, ts * (0.45 + 0.15 * clamp01(t * 3)), SPELL_RGB[scene.action], alpha, now / 900);
  }

  /** 魔法陣。縦につぶした円に、二重の輪と六芒星 */
  private circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rgb: string, alpha: number, spin: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.scale(1, 0.45);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
    glow.addColorStop(0, `rgba(${rgb}, ${0.35 * alpha})`);
    glow.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, ${0.95 * alpha})`;
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(spin);
    for (const start of [0, Math.PI / 3]) {
      ctx.beginPath();
      for (let k = 0; k <= 3; k++) {
        const a = start + (k * Math.PI * 2) / 3;
        const px = Math.cos(a) * r * 0.78;
        const py = Math.sin(a) * r * 0.78;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 役者より上に描くもの */
  top(ctx: CanvasRenderingContext2D, play: Playback, toScreen: ToScreen, ts: number, now: number): void {
    const { scene, phase, t } = play;
    const center = (c: { x: number; y: number }) => {
      const p = toScreen(c);
      return { x: p.x + ts / 2, y: p.y + ts * 0.5 };
    };
    const caster = scene.actors[scene.attacker];
    if (scene.action === 'fire' && phase === 'travel' && caster) {
      // 火の玉が、主人公から最後のマスへまっすぐ飛ぶ。通ったあとに火の粉を残す
      const a = center(caster.pos);
      const last = scene.cells[scene.cells.length - 1] ?? caster.pos;
      const b = center(last);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      this.orb(ctx, x, y, ts * 0.3, now);
      const pos = { x: caster.pos.x + (last.x - caster.pos.x) * t + 0.5, y: caster.pos.y + (last.y - caster.pos.y) * t + 0.5 };
      this.particles.burst({ ...pos, count: 2, color: FIRE, speed: [0.2, 0.7], size: [0.03, 0.06], life: [180, 300], glow: true });
    }
    if (scene.action === 'ice' && phase === 'travel' && caster) {
      // 氷のつぶてが、主人公から3マス先（壁の手前）までまっすぐ飛ぶ。魔物は突き抜ける
      const a = center(caster.pos);
      const last = scene.cells[scene.cells.length - 1] ?? caster.pos;
      const b = center(last);
      this.shard(ctx, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, ts * 0.3, Math.atan2(b.y - a.y, b.x - a.x));
      const pos = { x: caster.pos.x + (last.x - caster.pos.x) * t + 0.5, y: caster.pos.y + (last.y - caster.pos.y) * t + 0.5 };
      this.particles.burst({ ...pos, count: 2, color: ICE, speed: [0.1, 0.5], size: [0.025, 0.05], life: [200, 320], glow: true });
    }
    if (scene.action === 'wind' && phase === 'impact' && t < 0.5 && caster) {
      // 目の前の横3マスを、風の刃が弧を描いて切る
      this.slash(ctx, center(caster.pos), scene.toward, caster.pos, ts, t / 0.5);
    }
    if (scene.action === 'earth' && phase === 'travel' && caster) {
      // 空から星が、魔物のいるマスへ斜めに降ってくる。マスごとに少しずつずらす
      for (const [i, c] of scene.cells.entries()) {
        const k = clamp01(t * 1.3 - (i % 4) * 0.1);
        if (k <= 0) continue;
        const p = center(c);
        const sx = p.x + ts * 2.2 * (1 - k);
        const sy = p.y - ts * 5 * (1 - k);
        this.star(ctx, sx, sy, ts * 0.22, now + i * 120, { x: ts * 2.2, y: -ts * 5 });
      }
    }
    if (scene.action === 'bigFire' && caster && (phase === 'travel' || (phase === 'impact' && t < 0.5))) {
      // 炎の壁が、前へ1列ずつ広がっていく。広がり終えたら、当たる段の前半で消えていく
      const front = phase === 'travel' ? t * 5.5 : 5.5;
      const fade = phase === 'impact' ? 1 - t * 2 : 1;
      for (const c of scene.cells) {
        const d = Math.max(Math.abs(c.x - caster.pos.x), Math.abs(c.y - caster.pos.y));
        if (d > front) continue;
        const heat = clamp01(1 - (front - d) / 3) * fade;
        if (heat <= 0) continue;
        const p = center(c);
        this.flame(ctx, p.x, p.y + ts * 0.15, ts * (0.32 + 0.18 * heat), heat, now + (c.x * 31 + c.y * 17) * 40);
        if (Math.random() < 0.25 * heat) {
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.5, count: 1, color: FIRE, speed: [0.3, 0.8], size: [0.03, 0.06], life: [200, 360], gravity: -1.5, glow: true });
        }
      }
    }
    if (scene.action === 'thunder' && phase === 'impact' && t < 0.45 && caster) {
      // 雷は、空から魔物のいるマスへ落ちる。誰もいなければ主人公のまわりに落ちる
      const hits = scene.popups.filter((p) => p.kind === 'damage').map((p) => p.pos);
      const targets = hits.length > 0 ? hits : scene.cells.filter((_, i) => i % 2 === 0);
      const flick = Math.floor(now / 50);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - t / 0.45;
      for (const [i, c] of targets.entries()) {
        const p = center(c);
        this.bolt(ctx, p.x, p.y + ts * 0.3, ts, flick * 7 + i * 13 + c.x * 3 + c.y);
      }
      ctx.restore();
    }
    if (scene.action === 'reach' && caster && (phase === 'travel' || (phase === 'impact' && t < 0.4))) {
      // 舌・触手が相手まで伸び、当たったら縮んで戻る
      const reach = phase === 'travel' ? t : 1 - t / 0.4;
      const target = scene.cells[scene.cells.length - 1] ?? scene.toward;
      // 体のまん中ではなく、相手側に少し寄った口もとから出す
      const a = center(caster.pos);
      const b = center(target);
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mouth = { x: a.x + ((b.x - a.x) / len) * ts * 0.3, y: a.y + ((b.y - a.y) / len) * ts * 0.3 + ts * 0.08 };
      this.tongue(ctx, mouth, b, reach, ts, TENTACLE.has(caster.art), now);
    }
    if (scene.action === 'breath' && caster && (phase === 'travel' || (phase === 'impact' && t < 0.35))) {
      // 口もとから相手へ、火が吹きつける
      const a = center(caster.pos);
      const target = scene.cells[scene.cells.length - 1] ?? scene.toward;
      const b = center(target);
      const reachK = phase === 'travel' ? t : 1;
      const fade = phase === 'impact' ? 1 - t / 0.35 : 1;
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const k = (i / steps) * reachK;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        this.flame(ctx, x, y + ts * 0.1, ts * (0.14 + 0.16 * (i / steps)), fade * (0.6 + 0.4 * (i / steps)), now + i * 90);
      }
      if (phase === 'travel') {
        const len = Math.hypot(target.x - caster.pos.x, target.y - caster.pos.y) || 1;
        const vx = ((target.x - caster.pos.x) / len) * 5;
        const vy = ((target.y - caster.pos.y) / len) * 5;
        this.particles.burst({ x: caster.pos.x + 0.5 + vx * 0.04, y: caster.pos.y + 0.5 + vy * 0.04, count: 2, color: FIRE, speed: [0.2, 0.6], size: [0.03, 0.06], life: [160, 260], glow: true });
      }
    }
    if (scene.action === 'lightning' && caster && (phase === 'travel' || (phase === 'impact' && t < 0.3))) {
      // 相棒から相手へ、稲妻が横に走る
      const target = scene.cells[scene.cells.length - 1] ?? scene.toward;
      const a = center(caster.pos);
      const b = center(target);
      const k = phase === 'travel' ? t : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = phase === 'impact' ? 1 - t / 0.3 : 1;
      this.boltBetween(ctx, a.x, a.y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, ts, Math.floor(now / 50) * 7 + 3);
      ctx.restore();
    }
    if (phase === 'impact' && t < 0.85) {
      // 封印とレベルアップは、そのマスに光の柱が立つ
      for (const p of scene.popups) {
        if (p.text !== '封印' && p.text !== 'Lv UP') continue;
        const c = center(p.pos);
        this.pillar(ctx, c.x, c.y, ts, t / 0.85, p.text === '封印');
      }
    }
    const shield = SHIELD_RGB[scene.action];
    if (shield && phase === 'impact') {
      for (const c of scene.cells) {
        const p = center(c);
        this.shield(ctx, p.x, p.y, ts, t, shield);
      }
    }
  }

  /** 火の玉。白い芯と、橙のふち */
  private orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number): void {
    const wob = 1 + Math.sin(now / 40) * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6 * wob);
    g.addColorStop(0, 'rgba(255, 252, 230, 1)');
    g.addColorStop(0.3, 'rgba(255, 210, 90, 0.95)');
    g.addColorStop(0.65, 'rgba(255, 110, 30, 0.6)');
    g.addColorStop(1, 'rgba(255, 60, 10, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6 * wob, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 氷のつぶて。飛ぶ向きに細長いひし形を、白い芯と水色のふちで描く */
  private shard(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, 'rgba(220, 245, 255, 0.8)');
    g.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(190, 235, 255, 0.95)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(r * 1.3, 0);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r * 0.9, 0);
    ctx.lineTo(0, -r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 風の刃。主人公のまわりに、向いている方向を中心とした弧（左斜め前から右斜め前まで）を、
   * k（0〜1）に合わせて振り抜き、振り終わりにかけて薄れる
   */
  private slash(
    ctx: CanvasRenderingContext2D,
    c: { x: number; y: number },
    toward: { x: number; y: number },
    from: { x: number; y: number },
    ts: number,
    k: number,
  ): void {
    const mid = Math.atan2(toward.y - from.y, toward.x - from.x);
    const span = Math.PI * 0.75;
    const start = mid - span / 2;
    const end = start + span * clamp01(k * 1.6);
    const tail = Math.max(start, end - span * 0.6);
    const alpha = k < 0.6 ? 1 : (1 - k) / 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [w, color] of [
      [ts * 0.26, `rgba(140, 240, 170, ${0.3 * alpha})`],
      [ts * 0.11, `rgba(200, 255, 215, ${0.85 * alpha})`],
      [ts * 0.04, `rgba(255, 255, 255, ${alpha})`],
    ] as [number, string][]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, w);
      ctx.beginPath();
      ctx.arc(c.x, c.y, ts * 1.05, tail, end);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 降ってくる星。光る五芒星と、来た方向へのびる尾 */
  private star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number, back: { x: number; y: number }): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const len = Math.hypot(back.x, back.y) || 1;
    const tx = x + (back.x / len) * r * 6;
    const ty = y + (back.y / len) * r * 6;
    const tailG = ctx.createLinearGradient(x, y, tx, ty);
    tailG.addColorStop(0, 'rgba(255, 230, 140, 0.8)');
    tailG.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.strokeStyle = tailG;
    ctx.lineWidth = r * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    g.addColorStop(0, 'rgba(255, 250, 220, 0.9)');
    g.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y);
    ctx.rotate(now / 160);
    ctx.fillStyle = 'rgba(255, 245, 190, 1)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** ゆらめく炎1つ。heat（0〜1）が小さいほど薄く低い */
  private flame(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, heat: number, now: number): void {
    const f = 1 + Math.sin(now / 70) * 0.1 + Math.sin(now / 31) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = heat;
    // 柱に見えないよう、低く横に広い炎にする
    const h = r * 0.95 * f;
    const g = ctx.createRadialGradient(x, y - h * 0.3, 0, x, y - h * 0.3, r * 1.1);
    g.addColorStop(0, 'rgba(255, 246, 200, 0.95)');
    g.addColorStop(0.35, 'rgba(255, 170, 60, 0.85)');
    g.addColorStop(1, 'rgba(230, 60, 20, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.3, r * 1.05, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 空から落ちる稲妻 */
  private bolt(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, seed: number): void {
    this.boltBetween(ctx, x + (hash(seed) - 0.5) * ts, y - ts * 4, x, y, ts, seed);
  }

  /** (x0, y0) から (x1, y1) へ走る稲妻。ぎざぎざの線を、太い光と細い白の芯で描く */
  private boltBetween(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, ts: number, seed: number): void {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    // 進む向きに直角な向きへ、ぎざぎざにずらす
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    const points: [number, number][] = [[x0, y0]];
    const steps = Math.max(3, Math.round(len / (ts * 0.5)));
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      const off = (hash(seed + i) - 0.5) * ts * 0.6;
      points.push([x0 + (x1 - x0) * k + nx * off, y0 + (y1 - y0) * k + ny * off]);
    }
    points.push([x1, y1]);
    const line = (width: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.stroke();
    };
    line(Math.max(4, ts * 0.22), 'rgba(255, 230, 100, 0.35)');
    line(Math.max(2, ts * 0.09), 'rgba(255, 245, 170, 0.9)');
    line(Math.max(1, ts * 0.035), 'rgba(255, 255, 255, 1)');
  }

  /**
   * 舌・触手。from（口もと）から to へ、reach（0〜1）の長さまで伸ばす。
   * 舌は桃色の太い線に丸い先、触手は紫の太い線を波打たせ、吸盤の点を付ける
   */
  private tongue(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    reach: number,
    ts: number,
    tentacle: boolean,
    now: number,
  ): void {
    if (reach <= 0) return;
    const ex = from.x + (to.x - from.x) * reach;
    const ey = from.y + (to.y - from.y) * reach;
    const len = Math.hypot(ex - from.x, ey - from.y) || 1;
    const nx = -(ey - from.y) / len;
    const ny = (ex - from.x) / len;
    const steps = 10;
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const wave = tentacle ? Math.sin(k * Math.PI * 2.5 - now / 60) * ts * 0.08 * Math.sin(k * Math.PI) : 0;
      pts.push([from.x + (ex - from.x) * k + nx * wave, from.y + (ey - from.y) * k + ny * wave]);
    }
    const stroke = (width: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    };
    ctx.save();
    stroke(Math.max(4, ts * 0.17), '#2b3a67');
    stroke(Math.max(2.5, ts * 0.12), tentacle ? '#5a4fa8' : '#ff8fa8');
    if (tentacle) {
      ctx.fillStyle = '#c8b8ff';
      for (let i = 2; i < steps; i += 2) {
        ctx.beginPath();
        ctx.arc(pts[i][0], pts[i][1], Math.max(1, ts * 0.025), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#ff6f8f';
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(2.5, ts * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 封印・レベルアップの光の柱。封印は白金、レベルアップは金。下から伸びて、細くなって消える */
  private pillar(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number, seal: boolean): void {
    const grow = clamp01(t * 3);
    const alpha = t < 0.6 ? 1 : (1 - t) / 0.4;
    const w = ts * (seal ? 0.5 : 0.42) * (1 - t * 0.5);
    const h = ts * 2.2 * grow;
    const base = y + ts * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x, base, x, base - h);
    const rgb = seal ? '235, 240, 255' : '255, 220, 110';
    g.addColorStop(0, `rgba(${rgb}, ${0.7 * alpha})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, base - h, w, h);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
    ctx.fillRect(x - w * 0.12, base - h, w * 0.24, h);
    ctx.restore();
  }

  /** 守りの魔法の盾。光の泡が包み、六角の線が締まって消える */
  private shield(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number, rgb: [string, string, string]): void {
    const appear = clamp01(t * 4);
    const alpha = appear * (t > 0.6 ? (1 - t) / 0.4 : 1);
    const r = ts * (0.58 + 0.12 * (1 - appear));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r);
    g.addColorStop(0, `rgba(${rgb[0]}, 0)`);
    g.addColorStop(0.85, `rgba(${rgb[1]}, ${0.35 * alpha})`);
    g.addColorStop(1, `rgba(${rgb[2]}, ${0.7 * alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb[2]}, ${0.9 * alpha})`;
    ctx.lineWidth = Math.max(1.2, ts * 0.04);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 6;
      const px = x + Math.cos(a) * r * 0.8;
      const py = y + Math.sin(a) * r * 0.8;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** 力の魔法（赤金）・魔攻の魔法（紫）の光。足もとから光が立ちのぼる */
  private aura(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number, now: number, rgb: [string, string]): void {
    const alpha = clamp01(t * 4) * (t > 0.55 ? (1 - t) / 0.45 : 1);
    const h = ts * (0.6 + 0.4 * t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x, y + ts * 0.35, x, y + ts * 0.35 - h);
    g.addColorStop(0, `rgba(${rgb[0]}, ${0.55 * alpha})`);
    g.addColorStop(1, `rgba(${rgb[1]}, 0)`);
    ctx.fillStyle = g;
    const w = ts * (0.42 + Math.sin(now / 60) * 0.03);
    ctx.beginPath();
    ctx.ellipse(x, y + ts * 0.35 - h / 2, w, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 当たる段の始まり。爆発・雷・力・守りの粒と輪、画面の光りと揺れを出す */
  impact(scene: Scene, now: number): void {
    const hits = scene.popups.filter((p) => p.kind === 'damage').map((p) => p.pos);
    const last = scene.cells[scene.cells.length - 1];
    this.popupEffects(scene, now);
    switch (scene.action) {
      case 'breath':
        // 火が当たったところで、小さく燃え上がる
        for (const p of scene.popups) {
          if (p.kind === 'damage' || p.kind === 'hurt') this.particles.burst({ x: p.pos.x + 0.5, y: p.pos.y + 0.55, count: 12, color: FIRE, speed: [0.8, 2.2], size: [0.04, 0.08], life: [220, 380], gravity: -1.5, glow: true });
        }
        break;
      case 'lightning':
        for (const h of hits) this.particles.burst({ x: h.x + 0.5, y: h.y + 0.5, count: 14, color: SPARK, speed: [1.5, 3.4], size: [0.03, 0.06], life: [160, 300], glow: true });
        if (hits.length > 0) this.flash.kick('255, 250, 210', 0.18, 120, now);
        break;
      case 'fire':
        if (hits.length > 0) for (const h of hits) this.explode(h, 0.8, now);
        else if (last) this.particles.burst({ x: last.x + 0.5, y: last.y + 0.5, count: 8, color: FIRE, speed: [0.5, 1.4], size: [0.03, 0.06], life: [160, 280], glow: true });
        if (hits.length > 0) this.shake.kick(0.05, 160, now);
        break;
      case 'ice':
        // 当たったマスで氷が砕ける
        for (const h of hits) {
          this.particles.burst({ x: h.x + 0.5, y: h.y + 0.5, count: 16, color: ICE, speed: [1.2, 3], size: [0.03, 0.07], life: [220, 400], glow: true });
          this.rings.add({ x: h.x + 0.5, y: h.y + 0.5, duration: 300, radius: 0.7, color: 'rgba(170, 225, 255, 1)', flat: false }, now);
        }
        if (hits.length > 0) this.shake.kick(0.05, 160, now);
        else if (last) this.particles.burst({ x: last.x + 0.5, y: last.y + 0.5, count: 8, color: ICE, speed: [0.4, 1.2], size: [0.03, 0.06], life: [160, 280], glow: true });
        break;
      case 'wind':
        for (const c of scene.cells) {
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.5, count: 6, color: WIND, speed: [0.8, 2], size: [0.025, 0.05], life: [200, 340], glow: true, delay: 60 });
        }
        for (const h of hits) this.particles.burst({ x: h.x + 0.5, y: h.y + 0.5, count: 12, color: WIND, speed: [1.5, 3.2], size: [0.03, 0.06], life: [200, 340], glow: true, delay: 80 });
        if (hits.length > 0) this.shake.kick(0.05, 160, now);
        break;
      case 'earth':
        // 星が落ちたマスで、光が弾けて土ぼこりが立つ
        for (const c of scene.cells) {
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.6, count: 14, color: STAR, speed: [1.2, 3], size: [0.03, 0.07], life: [220, 420], glow: true });
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.7, count: 8, color: DUST, speed: [0.3, 1], size: [0.06, 0.12], life: [380, 620], gravity: -0.8, delay: 80 });
          this.rings.add({ x: c.x + 0.5, y: c.y + 0.75, duration: 360, radius: 0.8, color: 'rgba(255, 220, 130, 1)', flat: true }, now);
        }
        this.flash.kick('255, 235, 170', 0.25, 200, now);
        this.shake.kick(0.12, 280, now);
        break;
      case 'bigFire':
        for (const h of hits) this.explode(h, 1, now);
        this.flash.kick('255, 140, 60', 0.22, 220, now);
        this.shake.kick(0.1, 260, now);
        break;
      case 'thunder': {
        this.flash.kick('255, 255, 230', 0.5, 160, now);
        this.shake.kick(0.1, 240, now);
        const caster = scene.actors[scene.attacker];
        if (caster) this.rings.add({ x: caster.pos.x + 0.5, y: caster.pos.y + 0.75, duration: 380, radius: 1.6, color: 'rgba(255, 240, 150, 1)', flat: true }, now);
        for (const h of hits) {
          this.particles.burst({ x: h.x + 0.5, y: h.y + 0.6, count: 16, color: SPARK, speed: [1.5, 3.6], size: [0.03, 0.06], life: [160, 320], glow: true });
        }
        break;
      }
      case 'power':
      case 'magic': {
        const magic = scene.action === 'magic';
        for (const c of scene.cells) {
          this.rings.add({ x: c.x + 0.5, y: c.y + 0.8, duration: 420, radius: 0.7, color: magic ? 'rgba(190, 130, 255, 1)' : 'rgba(255, 160, 80, 1)', flat: true }, now);
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.7, count: 12, color: magic ? MAGIC : POWER, speed: [0.1, 0.5], size: [0.03, 0.06], life: [380, 560], gravity: -2.2, glow: true });
        }
        break;
      }
      case 'guard':
      case 'ward':
        for (const c of scene.cells) {
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.5, count: 10, color: scene.action === 'ward' ? WARD : GUARD, speed: [0.5, 1.2], size: [0.025, 0.05], life: [300, 480], glow: true, delay: 120 });
        }
        break;
      case 'burst':
        if (scene.cells[0]) this.explode(scene.cells[0], 1.3, now);
        this.flash.kick('255, 200, 120', 0.3, 200, now);
        this.shake.kick(0.14, 300, now);
        break;
      case 'throw':
        if (scene.item === 'starBurst' && hits.length > 0) {
          for (const h of hits) this.explode(h, 1.2, now);
          this.flash.kick('255, 200, 120', 0.25, 180, now);
          this.shake.kick(0.12, 260, now);
        }
        break;
    }
  }

  /**
   * 文字（Popup）ごとの小さな演出。回復は緑の光が昇り、状態異常は色ごとの粒と輪、
   * 封印・レベルアップは光の粒が散る（柱は top で描く）
   */
  private popupEffects(scene: Scene, now: number): void {
    for (const p of scene.popups) {
      const x = p.pos.x + 0.5;
      const y = p.pos.y + 0.5;
      if (p.kind === 'info' && p.text.startsWith('+')) {
        this.particles.burst({ x, y: y + 0.2, count: 12, color: HEAL, speed: [0.1, 0.5], size: [0.03, 0.06], life: [420, 640], gravity: -1.8, glow: true });
        this.rings.add({ x, y: y + 0.3, duration: 420, radius: 0.6, color: 'rgba(120, 240, 170, 1)', flat: true }, now);
      } else if (p.text === '封印' || p.text === 'Lv UP') {
        this.particles.burst({ x, y, count: 18, color: p.text === '封印' ? ['#ffffff', '#e8f0ff', '#ffe596'] : GOLD, speed: [0.6, 2], size: [0.03, 0.06], life: [400, 700], gravity: -1, glow: true, delay: 80 });
        this.rings.add({ x, y: y + 0.3, duration: 480, radius: 0.9, color: 'rgba(255, 230, 140, 1)', flat: true }, now);
      } else if (p.kind === 'status') {
        const fx = STATUS_FX[p.text] ?? MP_LOSS;
        const gravity = fx.move === 'rise' ? -1.6 : fx.move === 'fall' ? 2.4 : 0;
        const speed: [number, number] = fx.move === 'burst' ? [1, 2.2] : [0.15, 0.6];
        this.particles.burst({ x, y, count: 12, color: fx.color, speed, size: [0.03, 0.065], life: [380, 620], gravity, glow: true, delay: 60 });
        const ring = 'ring' in fx ? fx.ring : undefined;
        if (ring) this.rings.add({ x, y: y + 0.2, duration: 420, radius: 0.65, color: ring, flat: true }, now);
      }
    }
  }

  /** 爆発。火の粉が飛び散り、輪が広がり、少し遅れて煙が立つ */
  private explode(at: { x: number; y: number }, size: number, now: number): void {
    const x = at.x + 0.5;
    const y = at.y + 0.5;
    this.particles.burst({ x, y, count: Math.round(22 * size), color: FIRE, speed: [1.5 * size, 4.2 * size], size: [0.05, 0.11], life: [240, 460], glow: true });
    this.particles.burst({ x, y, count: Math.round(10 * size), color: SMOKE, speed: [0.3, 1], size: [0.08, 0.14], life: [420, 700], gravity: -1, delay: 120 });
    this.rings.add({ x, y, duration: 320, radius: 0.9 * size, color: 'rgba(255, 200, 120, 1)', flat: false }, now);
  }
}
