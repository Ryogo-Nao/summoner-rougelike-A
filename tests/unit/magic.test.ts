// 3.6 魔攻・魔防（docs/test-plan.md F-84）。
// 攻撃の魔法・火を吐く・いかずちは、魔攻と魔防で決まる。隣への攻撃は、これまでどおり攻撃力と防御力
import { describe, expect, it } from 'vitest';
import { IZUTSUCHI, cardStats, createCard } from '../../src/game/cards';
import { SPECIES } from '../../src/game/monsters';
import { GameState, PLAYER_BASE, cardFromData, cardToData, type RunData } from '../../src/game/state';
import { emptyState, logsSince, placeMonster, sturdy } from '../helpers';

/** ヒボシを1回撃って、目の前の魔物に与えたダメージ */
function fireDamage(seed: number, mdef: number): number | null {
  const g = emptyState(seed);
  g.allies = [];
  const placed = placeMonster(g, 'goromu');
  if (!placed) return null;
  placed.m.hp = placed.m.maxHp = 9999;
  placed.m.mdef = mdef;
  g.player.facing = placed.dir;
  g.player.mp = g.player.maxMp = 99;
  g.cast('fire');
  return 9999 - placed.m.hp;
}

describe('F-84 魔攻・魔防', () => {
  it('主人公は Lv1 で魔攻6・魔防3。魔物と仲間も魔攻・魔防を持つ', () => {
    const g = emptyState(1);
    expect(PLAYER_BASE.matk).toBe(6);
    expect(g.player.matk).toBe(6);
    expect(g.player.mdef).toBe(3);
    for (const s of [...SPECIES, IZUTSUCHI]) {
      expect(s.matk, s.id).toBeGreaterThan(0);
      expect(s.mdef, s.id).toBeGreaterThan(0);
      const lv10 = cardStats(s, 10);
      expect(lv10.matk).toBeGreaterThanOrEqual(cardStats(s, 1).matk);
      expect(lv10.mdef).toBeGreaterThanOrEqual(cardStats(s, 1).mdef);
    }
  });

  it('ヒボシの威力は 魔攻×2。魔防が高い魔物ほど、受けるダメージが減る', () => {
    const g = emptyState(1);
    expect(g.spellPower('fire')).toBe(12);
    expect(g.spellPower('bigFire')).toBe(22);
    expect(g.spellPower('thunder')).toBe(6);
    for (let seed = 1; seed < 6; seed++) {
      const low = fireDamage(seed, 0);
      const high = fireDamage(seed, 16);
      if (low === null || high === null) continue;
      // 12 × 16 ÷ 16 × 乱数 ＝ 11〜13、12 × 16 ÷ 32 × 乱数 ＝ 5〜7
      expect(low).toBeGreaterThanOrEqual(11);
      expect(low).toBeLessThanOrEqual(13);
      expect(high).toBeGreaterThanOrEqual(5);
      expect(high).toBeLessThanOrEqual(7);
    }
  });

  it('マリョクボシで魔法の威力が上がる。チカラボシでは上がらない', () => {
    const g = emptyState(1);
    g.allies = [];
    g.player.mp = g.player.maxMp = 99;
    g.learned.add('power');
    g.learned.add('magic');
    g.cast('power');
    expect(g.spellPower('fire')).toBe(12);
    g.cast('magic');
    expect(g.player.magicTurns).toBeGreaterThan(0);
    expect(g.magicPower()).toBe(9);
    expect(g.spellPower('fire')).toBe(18);
  });

  it('火を吐く火は、マモリホシでは減らず、マヨケボシで減る', () => {
    /** 2マス先のヒダマリが火を吐いたときのダメージ。吐かなければ null */
    const breath = (seed: number, spell: 'guard' | 'ward' | null): number | null => {
      const g = emptyState(seed);
      g.allies = [];
      sturdy(g);
      g.player.mdef = 0;
      const placed = placeMonster(g, 'hidamari', 2);
      if (!placed) return null;
      placed.m.matk = 100;
      g.player.mp = g.player.maxMp = 99;
      if (spell) {
        g.learned.add(spell);
        g.cast(spell);
        g.takeScenes();
      }
      if (distance2(g, placed.m.pos) !== 2) return null;
      // HPは毎ターン自然に戻るので、ダメージはログから読む
      const hit = logsSince(g, () => g.wait())
        .map((t) => /^ヒダマリの火 → あなたに(\d+)ダメージ$/.exec(t))
        .find((m) => m !== null);
      return hit ? Number(hit[1]) : null;
    };
    const distance2 = (g: GameState, at: { x: number; y: number }) =>
      Math.max(Math.abs(g.player.pos.x - at.x), Math.abs(g.player.pos.y - at.y));
    const seen = { none: 0, guard: 0, ward: 0 };
    for (let seed = 1; seed < 400 && (seen.none < 2 || seen.guard < 2 || seen.ward < 2); seed++) {
      const none = breath(seed, null);
      // 魔攻100 × 16 ÷ 16 × 乱数 ＝ 88〜112
      if (none !== null) {
        seen.none++;
        expect(none).toBeGreaterThanOrEqual(88);
        expect(none).toBeLessThanOrEqual(112);
      }
      const guard = breath(seed, 'guard');
      if (guard !== null) {
        seen.guard++;
        expect(guard).toBeGreaterThanOrEqual(88);
      }
      // マヨケボシで ÷1.5 ＝ 59〜75
      const ward = breath(seed, 'ward');
      if (ward !== null) {
        seen.ward++;
        expect(ward).toBeLessThanOrEqual(75);
      }
    }
    expect(seen.none).toBeGreaterThan(0);
    expect(seen.guard).toBeGreaterThan(0);
    expect(seen.ward).toBeGreaterThan(0);
  });

  it('魔攻・魔防を足す前の保存データも読める（魔攻・魔防はレベルから求める）', () => {
    const card = createCard(SPECIES[0], false, 'sunao', 5);
    const old = cardToData(card) as unknown as Record<string, unknown>;
    delete old.matk;
    delete old.mdef;
    old.bonus = { maxHp: 1, atk: 0, def: 0 };
    const back = cardFromData(old as never);
    expect(back.matk).toBe(cardStats(SPECIES[0], 5).matk);
    expect(back.bonus.matk).toBe(0);

    const g = emptyState(3);
    const data = JSON.parse(JSON.stringify(g.toData())) as RunData;
    const player = data.player as unknown as Record<string, unknown>;
    player.level = 4;
    delete player.matk;
    delete player.mdef;
    delete player.magicTurns;
    const g2 = GameState.fromData(data);
    expect(g2.player.matk).toBe(9);
    expect(g2.player.mdef).toBe(6);
    expect(g2.player.magicTurns).toBe(0);
  });
});
