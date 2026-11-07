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
  bigFire: '255, 100, 40',
  thunder: '255, 236, 120',
  power: '255, 110, 80',
  guard: '120, 190, 255',
};
const FIRE = ['#fff6d0', '#ffd84a', '#ff9a3a', '#ff5a2a'];
const SMOKE = ['#e8e2d6', '#c9c1b4', '#a79f93'];
const SPARK = ['#ffffff', '#fff3a0', '#ffe14a'];
const POWER = ['#ffd84a', '#ff9a5a', '#ff6a5a'];
const GUARD = ['#ffffff', '#bfe4ff', '#7cc4ff'];

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
    if (scene.action === 'power' && play.phase === 'impact') {
      for (const c of scene.cells) {
        const p = toScreen(c);
        this.aura(ctx, p.x + ts / 2, p.y + ts * 0.5, ts, play.t, now);
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
    if (scene.action === 'guard' && phase === 'impact') {
      for (const c of scene.cells) {
        const p = center(c);
        this.shield(ctx, p.x, p.y, ts, t);
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

  /** 空から落ちる稲妻。ぎざぎざの線を、太い光と細い白の芯で描く */
  private bolt(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, seed: number): void {
    const top = y - ts * 4;
    const points: [number, number][] = [[x + (hash(seed) - 0.5) * ts, top]];
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      points.push([x + (hash(seed + i) - 0.5) * ts * 0.7 * (1 - k * 0.6), top + (y - top) * k]);
    }
    points.push([x, y]);
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

  /** 守りの魔法の盾。光の泡が包み、六角の線が締まって消える */
  private shield(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number): void {
    const appear = clamp01(t * 4);
    const alpha = appear * (t > 0.6 ? (1 - t) / 0.4 : 1);
    const r = ts * (0.58 + 0.12 * (1 - appear));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r);
    g.addColorStop(0, 'rgba(120, 190, 255, 0)');
    g.addColorStop(0.85, `rgba(140, 205, 255, ${0.35 * alpha})`);
    g.addColorStop(1, `rgba(220, 240, 255, ${0.7 * alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(200, 232, 255, ${0.9 * alpha})`;
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

  /** 力の魔法の光。足もとから赤金の光が立ちのぼる */
  private aura(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number, now: number): void {
    const alpha = clamp01(t * 4) * (t > 0.55 ? (1 - t) / 0.45 : 1);
    const h = ts * (0.6 + 0.4 * t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x, y + ts * 0.35, x, y + ts * 0.35 - h);
    g.addColorStop(0, `rgba(255, 120, 70, ${0.55 * alpha})`);
    g.addColorStop(1, 'rgba(255, 220, 90, 0)');
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
    switch (scene.action) {
      case 'fire':
        if (hits.length > 0) for (const h of hits) this.explode(h, 0.8, now);
        else if (last) this.particles.burst({ x: last.x + 0.5, y: last.y + 0.5, count: 8, color: FIRE, speed: [0.5, 1.4], size: [0.03, 0.06], life: [160, 280], glow: true });
        if (hits.length > 0) this.shake.kick(0.05, 160, now);
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
        for (const c of scene.cells) {
          this.rings.add({ x: c.x + 0.5, y: c.y + 0.8, duration: 420, radius: 0.7, color: 'rgba(255, 160, 80, 1)', flat: true }, now);
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.7, count: 12, color: POWER, speed: [0.1, 0.5], size: [0.03, 0.06], life: [380, 560], gravity: -2.2, glow: true });
        }
        break;
      case 'guard':
        for (const c of scene.cells) {
          this.particles.burst({ x: c.x + 0.5, y: c.y + 0.5, count: 10, color: GUARD, speed: [0.5, 1.2], size: [0.025, 0.05], life: [300, 480], glow: true, delay: 120 });
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

  /** 爆発。火の粉が飛び散り、輪が広がり、少し遅れて煙が立つ */
  private explode(at: { x: number; y: number }, size: number, now: number): void {
    const x = at.x + 0.5;
    const y = at.y + 0.5;
    this.particles.burst({ x, y, count: Math.round(22 * size), color: FIRE, speed: [1.5 * size, 4.2 * size], size: [0.05, 0.11], life: [240, 460], glow: true });
    this.particles.burst({ x, y, count: Math.round(10 * size), color: SMOKE, speed: [0.3, 1], size: [0.08, 0.14], life: [420, 700], gravity: -1, delay: 120 });
    this.rings.add({ x, y, duration: 320, radius: 0.9 * size, color: 'rgba(255, 200, 120, 1)', flat: false }, now);
  }
}
