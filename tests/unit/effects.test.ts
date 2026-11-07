// 1.8 演出（docs/test-plan.md F-74）。場面に、何をしたか（演出の種類）と、かかるマスが入っているか。
// 段の長さ（src/render/effects.ts）も確かめる。見た目は手とブラウザで確かめる
import { describe, expect, it } from 'vitest';
import { createItem } from '../../src/game/items';
import type { Scene } from '../../src/game/state';
import { phaseAt, scaledTiming, timingOf, totalOf } from '../../src/render/effects';
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
