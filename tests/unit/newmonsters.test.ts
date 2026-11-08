// 2026-11-08 に足した24種の魔物と3つのダンジョン（docs/test-plan.md F-94）
import { describe, expect, it } from 'vitest';
import { DUNGEONS, isUnlocked } from '../../src/game/dungeons';
import { RECIPES } from '../../src/game/fusion';
import { FUSION_ONLY, SPECIES } from '../../src/game/monsters';
import { CHARACTERS } from '../../src/game/characters';
import type { Element } from '../../src/game/elements';

const NEW = ['hinoko', 'pukuri', 'birisu', 'tsuchimogu', 'watage', 'hotari', 'yoruneko', 'tsunousa',
  'homurajishi', 'kujiran', 'raijuu', 'iwagame', 'kamaitachi', 'shirojika', 'karabone', 'gouriki', ...FUSION_ONLY];
const sp = (id: string) => SPECIES.find((s) => s.id === id)!;
const wild = new Set(DUNGEONS.flatMap((d) => d.monsters.map((m) => m.species)));

describe('F-94 新しい24種の魔物と3つのダンジョン', () => {
  it('24種あり、8つの属性に3体ずつ。どれも背景（台帳）がある。倍速の魔物はいない', () => {
    expect(NEW).toHaveLength(24);
    const byElement = new Map<Element, number>();
    for (const id of NEW) byElement.set(sp(id).element, (byElement.get(sp(id).element) ?? 0) + 1);
    expect([...byElement.values()]).toEqual(Array(8).fill(3));
    for (const id of NEW) expect(CHARACTERS.some((c) => c.id === id), id).toBe(true);
    expect(SPECIES.filter((s) => s.speed === 'fast')).toEqual([]);
  });

  it('配合でしか生まれない8種は、どのダンジョンにも出ず、組み合わせが1つずつある', () => {
    expect(FUSION_ONLY).toHaveLength(8);
    for (const id of FUSION_ONLY) {
      expect(wild.has(id), id).toBe(false);
      expect(RECIPES.filter((r) => r[2] === id), id).toHaveLength(1);
    }
  });

  it('配合の親は、どちらも野生で出会える魔物', () => {
    for (const [a, b, child] of RECIPES.filter((r) => FUSION_ONLY.includes(r[2]))) {
      expect(wild.has(a), `${child}: ${a}`).toBe(true);
      expect(wild.has(b), `${child}: ${b}`).toBe(true);
    }
  });

  it('野生の新しい16種は、新しいダンジョンのどこかに出る', () => {
    for (const id of NEW.filter((id) => !FUSION_ONLY.includes(id))) expect(wild.has(id), id).toBe(true);
  });

  it('ほたる火の谷（15階）は森の次、いかずちの坑道（22階）は谷の次、とこやみの大穴（30階）は坑道の次', () => {
    const d = (id: string) => DUNGEONS.find((x) => x.id === id)!;
    expect([d('valley').floors, d('mine').floors, d('abyss').floors]).toEqual([15, 22, 30]);
    expect(isUnlocked(d('valley'), ['first'])).toBe(false);
    expect(isUnlocked(d('valley'), ['first', 'forest'])).toBe(true);
    expect(isUnlocked(d('mine'), ['first', 'forest', 'valley'])).toBe(true);
    expect(isUnlocked(d('abyss'), ['first', 'forest', 'valley'])).toBe(false);
    // どの階にも魔物がいる
    for (const id of ['valley', 'mine', 'abyss']) {
      for (let f = 1; f <= d(id).floors; f++) {
        expect(d(id).monsters.some((m) => f >= m.floors[0] && f <= m.floors[1]), `${id} B${f}F`).toBe(true);
      }
    }
  });
});
