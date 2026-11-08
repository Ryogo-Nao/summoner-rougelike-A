// 弱みのある魔物の強み（docs/test-plan.md F-93、balance.md 4.6）
import { describe, expect, it } from 'vitest';
import { DRAWBACK_GROWTH, cardStats, hasDrawback } from '../../src/game/cards';
import { MIGHTY_RATE, SPECIES, mightyAtk, sturdyDamage } from '../../src/game/monsters';

const sp = (id: string) => SPECIES.find((s) => s.id === id)!;

describe('F-93 弱み（鈍足・ふらふら）のある魔物には強みがあり、仲間になると弱みが外れて伸びが1.2倍', () => {
  it('ゴロムは攻撃力1.5倍、ツブマルは受けるダメージ半分、パタリは与えたダメージの半分を吸い取る', () => {
    expect(mightyAtk(sp('goromu'), 20)).toBe(20 * MIGHTY_RATE);
    expect(mightyAtk(sp('garuf'), 20)).toBe(20);
    expect(sturdyDamage(sp('tsubumaru'), 10)).toBe(5);
    expect(sturdyDamage(sp('tsubumaru'), 1)).toBe(1);
    expect(sturdyDamage(sp('kirigani'), 10)).toBe(10);
    expect(sp('patari').special).toBe('drain');
  });

  it('弱みのある魔物はどれも強みを持つ', () => {
    for (const s of SPECIES.filter(hasDrawback)) {
      expect(s.mighty || s.sturdy || s.special !== undefined || s.twoHits || s.reach || s.regen, s.id).toBeTruthy();
    }
    expect(SPECIES.filter(hasDrawback).map((s) => s.id).sort()).toEqual(['goromu', 'patari', 'tsubumaru']);
  });

  it('仲間になると、弱みのある種族は能力の伸びが1.2倍（Lv1は同じ）', () => {
    const goromu = sp('goromu');
    const plain = { ...goromu, speed: 'normal' as const, mighty: undefined };
    expect(cardStats(goromu, 1)).toEqual(cardStats(plain, 1));
    const lv20 = cardStats(goromu, 20);
    const lv20plain = cardStats(plain, 20);
    expect(lv20.maxHp).toBeGreaterThan(lv20plain.maxHp);
    // 伸びた分だけが 1.2 倍になる
    const gain = (s: { maxHp: number }) => s.maxHp - cardStats(plain, 1).maxHp;
    expect(gain(lv20) / gain(lv20plain)).toBeCloseTo(DRAWBACK_GROWTH, 1);
  });
});
