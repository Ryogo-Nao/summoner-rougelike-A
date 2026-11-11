// 転生の伸び（docs/test-plan.md F-102、requirements.md 9.3）
import { describe, expect, it } from 'vitest';
import { IZUTSUCHI, cardStats, growthRate } from '../../src/game/cards';
import { SPECIES } from '../../src/game/monsters';

describe('F-102 イヅツチの転生の伸びは 1.5 → 1.75 → 2.0 → 2.25 → 2.5倍で止まり、配合は +5％ずつのまま', () => {
  it('転生回数ごとの伸び', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map((n) => growthRate(n, true))).toEqual([1, 1.5, 1.75, 2, 2.25, 2.5, 2.5, 2.5]);
  });

  it('配合の伸びは変わらない（1回 +5％、10回の1.5倍で止まる）', () => {
    expect([0, 1, 5, 10, 12].map((n) => growthRate(n))).toEqual([1, 1.05, 1.25, 1.5, 1.5]);
  });

  it('イヅツチの能力は転生の伸びで、ほかの仲間は配合の伸びで決まる（Lv1は同じ）', () => {
    expect(cardStats(IZUTSUCHI, 1, 'sunao', undefined, 3)).toEqual(cardStats(IZUTSUCHI, 1));
    const base = cardStats(IZUTSUCHI, 30).atk;
    const lv1 = cardStats(IZUTSUCHI, 1).atk;
    const reborn = cardStats(IZUTSUCHI, 30, 'sunao', undefined, 1).atk;
    // Lv1から伸びた分がおよそ1.5倍（四捨五入の分だけずれる）
    expect(Math.abs(reborn - lv1 - (base - lv1) * 1.5)).toBeLessThanOrEqual(1);
    const other = SPECIES.find((s) => s.id !== IZUTSUCHI.id && !s.speed?.includes('slow') && !s.erratic)!;
    const o0 = cardStats(other, 30).atk;
    const o1 = cardStats(other, 1).atk;
    expect(Math.abs(cardStats(other, 30, 'sunao', undefined, 1).atk - o1 - (o0 - o1) * 1.05)).toBeLessThanOrEqual(1);
  });
});
