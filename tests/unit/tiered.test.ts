// 強い魔物と弱い魔物の出し分け、毒消し草・キツケソウの出る条件（docs/test-plan.md F-95）
import { describe, expect, it } from 'vitest';
import { DUNGEONS, monstersForFloor, pickMonster, randomItem, strongShare } from '../../src/game/dungeons';
import { Rng } from '../../src/game/rng';

const d = (id: string) => DUNGEONS.find((x) => x.id === id)!;
const TIERED = ['valley', 'mine', 'abyss'];

describe('F-95 階ごとの強い魔物の割合と、毒消し草・キツケソウ', () => {
  it('強い魔物の割合は B1〜5F が0、B6〜10F が4割、B11〜15F が8割、B16F から全部', () => {
    expect([1, 5, 6, 10, 11, 15, 16, 30].map(strongShare)).toEqual([0, 0, 0.4, 0.4, 0.8, 0.8, 1, 1]);
    expect(TIERED.every((id) => d(id).tiered)).toBe(true);
  });

  it('谷・坑道・大穴は、B1〜5F に弱い魔物だけ、B6〜15F に両方、B16F から強い魔物だけを置く', () => {
    for (const id of TIERED) {
      for (let f = 1; f <= d(id).floors; f++) {
        const kinds = monstersForFloor(d(id), f);
        const strong = kinds.some((k) => k.strong);
        const weak = kinds.some((k) => !k.strong);
        if (f <= 5) expect([strong, weak], `${id} B${f}F`).toEqual([false, true]);
        else if (f <= 15) expect([strong, weak], `${id} B${f}F`).toEqual([true, true]);
        else expect([strong, weak], `${id} B${f}F`).toEqual([true, false]);
      }
    }
  });

  it('同じ魔物が、あるダンジョンでは強い魔物、別のダンジョンでは弱い魔物にはならない', () => {
    const entries = TIERED.flatMap((id) => d(id).monsters);
    const strong = new Set(entries.filter((e) => e.strong).map((e) => e.species));
    const weak = new Set(entries.filter((e) => !e.strong).map((e) => e.species));
    expect([...strong].filter((s) => weak.has(s))).toEqual([]);
  });

  it('選ばれる魔物は、その階の割合どおりに強い魔物になる', () => {
    const rng = new Rng(7);
    const share = (id: string, f: number) => {
      const strong = new Set(monstersForFloor(d(id), f).filter((k) => k.strong).map((k) => k.species));
      let n = 0;
      for (let i = 0; i < 2000; i++) if (strong.has(pickMonster(d(id), f, rng).species)) n++;
      return n / 2000;
    };
    expect(share('valley', 3)).toBe(0);
    expect(share('mine', 8)).toBeCloseTo(0.4, 1);
    expect(share('abyss', 12)).toBeCloseTo(0.8, 1);
    expect(share('abyss', 20)).toBe(1);
  });

  it('毒にする魔物がいなければ毒消し草、混乱させる魔物がいなければキツケソウを落とさない', () => {
    const rng = new Rng(3);
    const kinds = (id: string) => {
      const set = new Set<string>();
      for (let i = 0; i < 4000; i++) set.add(randomItem(d(id), 3, rng).kind);
      return set;
    };
    // 谷には毒・混乱の魔物がいない。大穴にはヨルネコ（混乱）だけ。最初のダンジョンにはどちらもいる
    const valley = kinds('valley');
    expect([valley.has('antidote'), valley.has('kitsuke')]).toEqual([false, false]);
    const abyss = kinds('abyss');
    expect([abyss.has('antidote'), abyss.has('kitsuke')]).toEqual([false, true]);
    const first = kinds('first');
    expect([first.has('antidote'), first.has('kitsuke')]).toEqual([true, true]);
  });
});
