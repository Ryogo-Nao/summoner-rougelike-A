// 3.7 属性（docs/test-plan.md F-85）。強い相手へ ×1.5、効きにくい相手と同じ属性へ ×2/3
import { describe, expect, it } from 'vitest';
import { IZUTSUCHI } from '../../src/game/cards';
import { STRONG_RATE, WEAK_RATE, elementRate, type Element } from '../../src/game/elements';
import { ITEMS, createItem } from '../../src/game/items';
import { emptyState, logsSince, placeMonster, species, sturdy } from '../helpers';

describe('F-85 属性', () => {
  it('強い・弱いの表', () => {
    const strong: [Element, Element][] = [
      ['fire', 'wind'],
      ['water', 'fire'],
      ['thunder', 'water'],
      ['earth', 'thunder'],
      ['wind', 'earth'],
      ['light', 'dark'],
      ['dark', 'light'],
    ];
    for (const [a, t] of strong) {
      expect(elementRate(a, t), `${a}→${t}`).toBe(STRONG_RATE);
      // 光と闇はおたがいに強いので、逆向きも ×1.5。それ以外の逆向きは ×2/3
      if (!(a === 'light' || a === 'dark')) expect(elementRate(t, a), `${t}→${a}`).toBe(WEAK_RATE);
    }
    for (const e of ['fire', 'water', 'thunder', 'earth', 'wind', 'light', 'dark'] as Element[]) {
      expect(elementRate(e, e), `${e}→${e}`).toBe(WEAK_RATE);
      expect(elementRate(e, 'none')).toBe(1);
      expect(elementRate('none', e)).toBe(1);
    }
    expect(elementRate('fire', 'earth')).toBe(1);
    expect(elementRate('light', 'fire')).toBe(1);
    // 雷と風は、どちらからも ×1（風の弱点は火だけ）
    expect(elementRate('thunder', 'wind')).toBe(1);
    expect(elementRate('wind', 'thunder')).toBe(1);
  });

  it('魔物の属性。シュルル・クイムシ・ドスイノは無、イヅツチは雷', () => {
    for (const id of ['chuppi', 'shururu', 'kuimushi', 'dosuino']) expect(species(id).element, id).toBe('none');
    expect(species('hidamari').element).toBe('fire');
    expect(species('tsuraragu').element).toBe('water');
    expect(species('fuwakura').element).toBe('light');
    expect(IZUTSUCHI.element).toBe('thunder');
  });

  it('ヒボシ（火）は、風の魔物によく効き、水の魔物には効きにくい。数字にもログにも出す', () => {
    const cases = [
      { id: 'nemuriga', min: 16, max: 20, note: '（よく効いた）', effect: 'strong' },
      { id: 'nurarika', min: 7, max: 9, note: '（効きにくい）', effect: 'weak' },
      { id: 'chuppi', min: 11, max: 13, note: '', effect: undefined },
    ];
    for (const c of cases) {
      let checked = 0;
      for (let seed = 1; seed < 20 && checked < 3; seed++) {
        const g = emptyState(seed);
        g.allies = [];
        const placed = placeMonster(g, c.id);
        if (!placed) continue;
        placed.m.hp = placed.m.maxHp = 9999;
        placed.m.mdef = 0;
        g.player.facing = placed.dir;
        g.player.mp = g.player.maxMp = 99;
        const line = logsSince(g, () => g.cast('fire')).find((t) => t.startsWith('あなたのヒボシ'))!;
        const dmg = 9999 - placed.m.hp;
        // 威力12 × 倍率 × 乱数(0.88〜1.12)
        expect(dmg, c.id).toBeGreaterThanOrEqual(c.min);
        expect(dmg, c.id).toBeLessThanOrEqual(c.max);
        expect(line).toBe(`あなたのヒボシ → ${placed.m.species.name}に${dmg}ダメージ${c.note}`);
        const popup = g.takeScenes().flatMap((s) => s.popups).find((p) => p.kind === 'damage')!;
        expect(popup.effect).toBe(c.effect);
        checked++;
      }
      expect(checked, c.id).toBeGreaterThan(0);
    }
  });

  it('盾の属性で受ける。水の盾なら、火の魔物の攻撃は効きにくい', () => {
    const shield = ITEMS.woodShield;
    shield.element = 'water';
    try {
      let hits = 0;
      for (let seed = 1; seed < 40 && hits < 3; seed++) {
        const g = emptyState(seed);
        g.allies = [];
        sturdy(g);
        const placed = placeMonster(g, 'hidamari');
        if (!placed) continue;
        const item = createItem('woodShield');
        g.bag.push(item);
        g.player.shield = item;
        expect(g.playerElement()).toBe('water');
        const line = logsSince(g, () => g.wait()).find((t) => t.startsWith('ヒダマリの攻撃 → あなたに'));
        if (!line) continue;
        expect(line.endsWith('（効きにくい）')).toBe(true);
        hits++;
      }
      expect(hits).toBeGreaterThan(0);
    } finally {
      delete shield.element;
    }
  });
});
