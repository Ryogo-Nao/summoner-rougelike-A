// 2.1・2.2 主人公の魔法と魔導書（docs/test-plan.md F-86）。
// ヒボシは最初から使える。ほかは魔導書で覚え、ずっと使える。＋値は +2 までで、そのダンジョンの間だけ
import { beforeEach, describe, expect, it } from 'vitest';
import type { Dir, Pos } from '../../src/game/dir';
import { createItem } from '../../src/game/items';
import { createMonster, type Monster } from '../../src/game/monsters';
import { loadoutOf, newProfile, returnToBase } from '../../src/game/profile';
import { GameState, SPELL_MAX_RANK, rankRate, type RunData } from '../../src/game/state';
import { emptyState, species } from '../helpers';

beforeEach(() => localStorage.clear());

/** 主人公が部屋にいて、主人公から見て (dx, dy) のマスがどれも床の状態。魔法を何度でも使えるようにする */
function openState(cells: Pos[], facing: Dir = 0): GameState | null {
  for (let seed = 1; seed < 200; seed++) {
    const g = emptyState(seed);
    g.allies = [];
    const p = g.player.pos;
    if (!g.map.roomAt(p.x, p.y) || !cells.every((c) => g.map.isWalkable(p.x + c.x, p.y + c.y))) continue;
    g.player.facing = facing;
    g.player.mp = g.player.maxMp = 999;
    return g;
  }
  return null;
}

/** 主人公から見て (dx, dy) に、倒れない魔物を置く */
function put(g: GameState, d: Pos, id = 'chuppi'): Monster {
  const m = createMonster(species(id), { x: g.player.pos.x + d.x, y: g.player.pos.y + d.y }, 1);
  m.hp = m.maxHp = 9999;
  g.monsters.push(m);
  return m;
}

const hit = (m: Monster) => m.hp < 9999;

describe('F-86 主人公の魔法と魔導書', () => {
  it('ヒボシは目の前の魔物だけ。2マス先には届かない', () => {
    const cells = [{ x: 0, y: -1 }, { x: 0, y: -2 }];
    const g = openState(cells)!;
    const far = put(g, cells[1]);
    g.cast('fire');
    expect(hit(far)).toBe(false);
    const g2 = openState(cells)!;
    const near = put(g2, cells[0]);
    g2.cast('fire');
    expect(hit(near)).toBe(true);
    expect(g2.takeScenes().find((x) => x.action === 'fire')!.cells).toEqual([near.pos]);
  });

  it('イテホシは、まっすぐ3マスの魔物すべてに当たる（突き抜ける）。4マス先には届かない', () => {
    const line = [1, 2, 3, 4].map((i) => ({ x: 0, y: -i }));
    const g = openState(line)!;
    const [a, b, c] = [put(g, line[0]), put(g, line[2]), put(g, line[3])];
    g.cast('ice');
    expect(g.learned.has('ice')).toBe(false);
    // 覚えていなければ使えない
    expect(hit(a)).toBe(false);
    g.learned.add('ice');
    g.player.facing = 0;
    g.cast('ice');
    expect(hit(a)).toBe(true);
    expect(hit(b)).toBe(true);
    expect(hit(c)).toBe(false);
    const s = g.takeScenes().find((x) => x.action === 'ice')!;
    expect(s.cells.length).toBe(3);
  });

  it('ホシキリは目の前の横3マス（左斜め前・前・右斜め前）。横には当たらない', () => {
    const g = openState([{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }])!;
    g.learned.add('wind');
    const front = [put(g, { x: -1, y: -1 }), put(g, { x: 0, y: -1 }), put(g, { x: 1, y: -1 })];
    const side = put(g, { x: 1, y: 0 });
    g.cast('wind');
    for (const m of front) expect(hit(m)).toBe(true);
    expect(hit(side)).toBe(false);
  });

  it('ホシナリはまわり8マス、ホシヨビは見えている魔物すべて', () => {
    const g = openState([{ x: 1, y: 0 }, { x: 2, y: 0 }])!;
    g.learned.add('thunder');
    g.learned.add('earth');
    const near = put(g, { x: 1, y: 0 });
    const two = put(g, { x: 2, y: 0 });
    g.cast('thunder');
    expect(hit(near)).toBe(true);
    expect(hit(two)).toBe(false);
    near.hp = 9999;
    // 見えないところ（ほかの部屋・通路の奥）の魔物には当たらない
    const p = g.player.pos;
    let hidden: Monster | null = null;
    for (let y = 0; y < g.map.height && !hidden; y++) {
      for (let x = 0; x < g.map.width && !hidden; x++) {
        if (g.map.isWalkable(x, y) && !g.isVisible(x, y)) hidden = put(g, { x: x - p.x, y: y - p.y });
      }
    }
    g.cast('earth');
    expect(g.isVisible(two.pos.x, two.pos.y)).toBe(true);
    expect(hit(near)).toBe(true);
    expect(hit(two)).toBe(true);
    expect(hidden).not.toBeNull();
    expect(hit(hidden!)).toBe(false);
  });

  it('倍率は ヒボシ ＞ イテホシ ＝ ホシキリ ＞ ホシナリ ＞ ホシヨビ。＋値で 1.5→1.75→2 と同じ割合で上がる', () => {
    const g = emptyState(1);
    g.player.matk = 60;
    expect([g.spellPower('fire'), g.spellPower('ice'), g.spellPower('wind'), g.spellPower('thunder'), g.spellPower('earth')]).toEqual([
      120, 90, 90, 60, 45,
    ]);
    expect([0, 1, 2].map(rankRate)).toEqual([1.5, 1.75, 2]);
    g.ranks.fire = 2;
    g.ranks.ice = 1;
    expect(g.spellPower('fire')).toBe(160);
    expect(g.spellPower('ice')).toBe(105);
    // チカラボシ+2 は攻撃力×2
    g.learned.add('power');
    g.ranks.power = 2;
    const atk = g.attackPower();
    g.player.mp = 99;
    g.cast('power');
    expect(g.attackPower()).toBe(atk * 2);
  });

  it('魔導書：読むと覚え、もう一度読むと +1、+2 まで。火の魔導書はヒボシを強くする', () => {
    const g = emptyState(2);
    const read = (kind: 'tomeIce' | 'tomeFire') => {
      const t = createItem(kind);
      g.bag.push(t);
      const problem = g.useProblem(t);
      if (problem === null) g.useItem(t);
      return problem;
    };
    expect(read('tomeIce')).toBeNull();
    expect(g.learned.has('ice')).toBe(true);
    expect(g.rankOf('ice')).toBe(0);
    expect(g.availableSpells()).toContain('ice');
    read('tomeIce');
    read('tomeIce');
    expect(g.rankOf('ice')).toBe(SPELL_MAX_RANK);
    expect(g.spellName('ice')).toBe('イテホシ+2');
    expect(read('tomeIce')).toBe('イテホシ+2はこれ以上強くならない');
    expect(read('tomeFire')).toBeNull();
    expect(g.rankOf('fire')).toBe(1);
    expect(g.learned.has('fire')).toBe(false);
  });

  it('拠点に戻ると、覚えた魔法は残り、＋値は無印に戻る。あきらめたときは、入る前に戻す（覚えた魔法も残らない）', () => {
    const profile = newProfile();
    const g = new GameState(5, loadoutOf(profile), 'first');
    g.learned.add('ice');
    g.ranks.ice = 2;
    g.ranks.fire = 1;
    g.escaped = true;
    returnToBase(profile, g);
    expect(profile.learned).toContain('ice');
    expect('ranks' in profile).toBe(false);
    const g2 = new GameState(6, loadoutOf(profile), 'first');
    expect(g2.knows('ice')).toBe(true);
    expect(g2.rankOf('ice')).toBe(0);
    expect(g2.rankOf('fire')).toBe(0);

    g2.learned.add('earth');
    g2.gaveUp = true;
    returnToBase(profile, g2);
    expect(profile.learned).toEqual(['ice']);
  });

  it('＋値の上限が5だったころの保存データは、+2までにする', () => {
    const g = emptyState(3);
    const data = JSON.parse(JSON.stringify(g.toData())) as RunData;
    data.learned = ['power'];
    data.ranks = { power: 5, fire: 1 };
    const g2 = GameState.fromData(data);
    expect(g2.rankOf('power')).toBe(2);
    expect(g2.rankOf('fire')).toBe(1);
  });
});
