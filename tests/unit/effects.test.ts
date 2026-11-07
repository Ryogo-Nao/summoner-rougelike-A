// 1.8 演出（docs/test-plan.md F-74・F-77）。場面に、何をしたか（演出の種類）と、かかるマスが入っているか。
// 段の長さ（src/render/effects.ts）も確かめる。見た目は手とブラウザで確かめる
import { describe, expect, it } from 'vitest';
import { CHARACTERS, MOTION_LABEL, type Motion } from '../../src/game/characters';
import { createItem } from '../../src/game/items';
import type { Scene } from '../../src/game/state';
import { isRepeat, motionPose, phaseAt, scaledTiming, timingOf, totalOf } from '../../src/render/effects';
import { emptyState, placeMonster, sturdy } from '../helpers';

const same = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x === b.x && a.y === b.y;

describe('F-74 場面の種類とかかるマス', () => {
  it('攻撃は attack で、正面の1マス。主人公が踏み込む', () => {
    const g = emptyState(31);
    const placed = placeMonster(g, 'chuppi')!;
    g.player.facing = placed.dir;
    g.attack();
    const s = g.takeScenes()[0];
    expect(s.action).toBe('attack');
    expect(s.cells).toEqual([placed.m.pos]);
    expect(s.actors[s.attacker].isPlayer).toBe(true);
  });

  it('火の魔法は fire で、最初の魔物までのまっすぐのマス', () => {
    const g = emptyState(32);
    const placed = placeMonster(g, 'chuppi', 3)!;
    g.player.facing = placed.dir;
    g.player.mp = g.player.maxMp;
    const at = { ...placed.m.pos };
    g.cast('fire');
    const s = g.takeScenes()[0];
    expect(s.action).toBe('fire');
    expect(s.cells.length).toBe(3);
    expect(same(s.cells[2], at)).toBe(true);
  });

  it('力・守りの魔法は power・guard で、主人公と仲間のマス。数字はその場面で出る', () => {
    for (const spell of ['power', 'guard'] as const) {
      const g = emptyState(33);
      g.learned.add(spell);
      g.player.mp = g.player.maxMp;
      g.cast(spell);
      const s = g.takeScenes()[0];
      expect(s.action).toBe(spell);
      expect(s.cells.length).toBe(1 + g.allies.length);
      expect(s.cells.some((c) => same(c, g.player.pos))).toBe(true);
      expect(s.popups.length).toBe(1 + g.allies.length);
    }
  });

  it('投げると throw で、道すじの最後が当たった魔物のマス。投げた道具の種類が入る', () => {
    const g = emptyState(34);
    const placed = placeMonster(g, 'chuppi', 2)!;
    g.player.facing = placed.dir;
    const herb = createItem('herb');
    g.bag.push(herb);
    // 投げたあと、魔物はそのターンのうちに動くので、投げる前の場所と比べる
    const at = { ...placed.m.pos };
    g.throwItem(herb);
    const s = g.takeScenes()[0];
    expect(s.action).toBe('throw');
    expect(s.item).toBe('herb');
    expect(s.cells.length).toBe(2);
    expect(same(s.cells[1], at)).toBe(true);
  });

  it('炸裂の星を食べると burst で、正面の1マス', () => {
    const g = emptyState(35);
    const star = createItem('starBurst');
    g.bag.push(star);
    g.useItem(star);
    const s = g.takeScenes().find((x: Scene) => x.action === 'burst');
    expect(s).toBeDefined();
    expect(s!.cells.length).toBe(1);
  });

  it('魔物の舌・触手は reach、隣への攻撃は attack', () => {
    const g = emptyState(36);
    sturdy(g);
    const far = placeMonster(g, 'nurarika', 2)!;
    let reach: Scene | undefined;
    for (let i = 0; i < 20 && !reach; i++) {
      g.wait();
      reach = g.takeScenes().find((x) => x.action === 'reach');
      if (!g.monsters.includes(far.m)) break;
      if (Math.abs(far.m.pos.x - g.player.pos.x) + Math.abs(far.m.pos.y - g.player.pos.y) === 1) break;
    }
    if (reach) {
      expect(reach.cells.length).toBe(2);
      expect(same(reach.cells[1], g.player.pos)).toBe(true);
    }
    const g2 = emptyState(37);
    sturdy(g2);
    placeMonster(g2, 'chuppi');
    g2.wait();
    const s = g2.takeScenes();
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.action === 'attack')).toBe(true);
  });
});

describe('F-74 演出の段の長さ', () => {
  const g = emptyState(38);
  const placed = placeMonster(g, 'chuppi', 3)!;
  g.player.facing = placed.dir;
  const arrow = createItem('arrow', 5);
  g.bag.push(arrow);
  g.throwItem(arrow);
  const shot = g.takeScenes()[0];

  it('矢は 構える → 飛ぶ → 当たる の順。飛ぶ長さはマスの数で決まる', () => {
    expect(shot.action).toBe('shoot');
    const t = timingOf(shot);
    expect(t.windup).toBeGreaterThan(0);
    expect(t.travel).toBeGreaterThanOrEqual(shot.cells.length * 40);
    expect(phaseAt(t, 0).phase).toBe('windup');
    expect(phaseAt(t, t.windup + 1).phase).toBe('travel');
    expect(phaseAt(t, t.windup + t.travel + 1).phase).toBe('impact');
    expect(phaseAt(t, totalOf(t) + 50)).toEqual({ phase: 'impact', t: 1 });
  });

  it('速いは半分の長さ。最小は動きがなく、数字のある場面だけ短く出す', () => {
    const t = timingOf(shot);
    expect(totalOf(scaledTiming(shot, 'fast'))).toBeCloseTo(totalOf(t) / 2);
    const min = scaledTiming(shot, 'min');
    expect(min.windup + min.travel).toBe(0);
    expect(min.impact).toBe(shot.popups.length > 0 ? 160 : 0);
  });
});

describe('F-77 攻撃の動き方・たおれる・2回攻撃', () => {
  it('どの動き方も、始めと終わりは元の姿（構える段のあとに位置がずれない）', () => {
    for (const motion of Object.keys(MOTION_LABEL) as Motion[]) {
      for (const t of [0, 1]) {
        const p = motionPose(motion, t);
        expect(p, `${motion} t=${t}`).toEqual({ forward: 0, lift: 0, lean: 0, wobble: 0, sx: 1, sy: 1 });
      }
      // 途中で相手の方へ進む
      const peak = Math.max(...[0.4, 0.5, 0.55, 0.6, 0.65].map((t) => motionPose(motion, t).forward));
      expect(peak, motion).toBeGreaterThan(0.25);
    }
  });

  it('台帳のどのキャラクターにも、ある動き方が決まっている', () => {
    for (const c of CHARACTERS) expect(MOTION_LABEL[c.motion], c.id).toBeDefined();
  });

  it('魔物をたおした場面には、その魔物が defeated に入り、消えるところまで当たる段が長い', () => {
    const g = emptyState(39);
    const placed = placeMonster(g, 'chuppi')!;
    g.player.facing = placed.dir;
    placed.m.hp = 1;
    let s: Scene | undefined;
    for (let i = 0; i < 10 && !s; i++) {
      g.attack();
      s = g.takeScenes().find((x) => x.defeated.length > 0);
    }
    expect(s).toBeDefined();
    expect(s!.defeated).toEqual([s!.actors.find((a) => a.enemy)!.key]);
    expect(timingOf(s!).impact).toBeGreaterThan(400);
  });

  it('2回攻撃の2回目は、構えが短い', () => {
    const g = emptyState(40);
    sturdy(g);
    placeMonster(g, 'kirigani');
    g.wait();
    const hits = g.takeScenes().filter((x) => x.action === 'attack');
    expect(hits.length).toBe(2);
    expect(isRepeat(undefined, hits[0])).toBe(false);
    expect(isRepeat(hits[0], hits[1])).toBe(true);
    expect(scaledTiming(hits[1], 'normal', true).windup).toBeLessThan(scaledTiming(hits[0], 'normal').windup);
  });
});
