// 弱みのある魔物の強み（docs/test-plan.md F-93、balance.md 4.6）
import { describe, expect, it } from 'vitest';
import { DRAWBACK_GROWTH, cardStats, hasDrawback } from '../../src/game/cards';
import { createItem } from '../../src/game/items';
import { MIGHTY_RATE, SPECIES, mightyAtk, sturdyDamage } from '../../src/game/monsters';
import { emptyState, placeMonster, sturdy } from '../helpers';

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

  it('イワガメには、矢も物理として2/3になる（F-100）', () => {
    // 同じ種（seed）・同じ防御で、同じ土の属性のツチモグとイワガメに矢を撃ち、受けたダメージを比べる
    const shot = (seed: number, id: string) => {
      const g = emptyState(seed);
      g.allies = [];
      sturdy(g);
      const placed = placeMonster(g, id, 2);
      if (!placed) return null;
      placed.m.hp = 9999;
      placed.m.def = 10;
      g.player.facing = placed.dir;
      const arrows = createItem('arrow', 5);
      g.bag.push(arrows);
      g.throwItem(arrows);
      return 9999 - placed.m.hp;
    };
    let checked = 0;
    for (let seed = 1; seed < 60 && checked < 5; seed++) {
      const plain = shot(seed, 'tsuchimogu');
      const armored = shot(seed, 'iwagame');
      if (!plain || !armored) continue;
      expect(armored, `seed ${seed}`).toBe(Math.max(1, Math.round(plain * (2 / 3))));
      checked++;
    }
    expect(checked).toBe(5);
  });

  it('イワガメは物理（通常攻撃）で受けるダメージだけ2/3、魔法や投げたものはそのまま', () => {
    expect(sturdyDamage(sp('iwagame'), 9, true)).toBe(6);
    expect(sturdyDamage(sp('iwagame'), 1, true)).toBe(1);
    expect(sturdyDamage(sp('iwagame'), 9)).toBe(9);
    expect(sturdyDamage(sp('tsubumaru'), 10, true)).toBe(5);
  });

  it('弱みのある魔物はどれも強みを持つ', () => {
    for (const s of SPECIES.filter(hasDrawback)) {
      expect(s.mighty || s.sturdy || s.armored || s.special !== undefined || s.twoHits || s.reach || s.regen, s.id).toBeTruthy();
    }
    expect(SPECIES.filter(hasDrawback).map((s) => s.id).sort()).toEqual(['goromu', 'gouriki', 'iwagame', 'kujiran', 'patari', 'tsubumaru', 'watage']);
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
