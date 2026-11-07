// 1.5 仲間（docs/test-plan.md F-40〜F-44）と、商店（F-65）
import { describe, expect, it } from 'vitest';
import { IZUTSUCHI, PERSONALITY_IDS, cardStats, createCard } from '../../src/game/cards';
import { RECIPES, personalityOdds } from '../../src/game/fusion';
import { buyPrice } from '../../src/game/items';
import { DIR_VECTORS } from '../../src/game/dir';
import { SPECIES, createMonster } from '../../src/game/monsters';
import { loadoutOf, newProfile } from '../../src/game/profile';
import { buy, sell } from '../../src/game/shop';
import { GameState } from '../../src/game/state';
import { species } from '../helpers';

const withParty = (ids: string[], seed = 1) => {
  const profile = newProfile();
  for (const id of ids) {
    const c = createCard(species(id), false, 'sunao', 5);
    profile.cards.push(c);
    profile.hand.push(c.id);
  }
  const g = new GameState(seed, loadoutOf(profile));
  g.monsters = [];
  return g;
};

describe('F-40・F-41 召喚', () => {
  it('連れていく仲間の最初の3体が、召喚した状態で入る', () => {
    const g = withParty(['chuppi', 'garuf', 'berogg', 'moyari']);
    expect(g.allies.length).toBe(3);
    expect(g.cards.length).toBe(5);
    expect(g.allies[0].card.species.id).toBe(IZUTSUCHI.id);
    for (const a of g.allies) expect(g.map.isWalkable(a.pos.x, a.pos.y)).toBe(true);
  });

  it('戻すと、もう一度召喚できる', () => {
    const g = withParty(['chuppi']);
    const card = g.allies[1].card;
    g.recall(card);
    expect(g.allies.some((a) => a.card === card)).toBe(false);
    expect(g.summonProblem(card)).toBeNull();
    g.player.mp = g.player.maxMp;
    g.summon(card);
    expect(g.allies.some((a) => a.card === card)).toBe(true);
  });
});

describe('F-42 仲間の能力', () => {
  it('レベルが上がって能力が下がることはない（全種族・全性格）', () => {
    for (const s of [...SPECIES, IZUTSUCHI]) {
      for (const pid of PERSONALITY_IDS) {
        let prev = cardStats(s, 1, pid);
        for (let lv = 2; lv <= 40; lv++) {
          const now = cardStats(s, lv, pid);
          expect(now.maxHp, `${s.id} ${pid} Lv${lv}`).toBeGreaterThanOrEqual(prev.maxHp);
          expect(now.atk).toBeGreaterThanOrEqual(prev.atk);
          expect(now.def).toBeGreaterThanOrEqual(prev.def);
          prev = now;
        }
      }
    }
  });
});

describe('F-43・F-44 配合', () => {
  it('組み合わせ表の魔物はあり、子は親より強い', () => {
    const power = (id: string) => {
      const s = species(id);
      return s.hp + s.atk * 3 + s.def * 2;
    };
    for (const [a, b, child] of RECIPES) {
      expect(power(child), `${a}+${b}→${child}`).toBeGreaterThan(power(a));
      expect(power(child), `${a}+${b}→${child}`).toBeGreaterThan(power(b));
    }
  });

  it('子の性格の確率は、合計100％', () => {
    for (const a of PERSONALITY_IDS)
      for (const b of PERSONALITY_IDS) {
        const odds = personalityOdds(a, b);
        const sum = Object.values(odds).reduce((x, y) => x + y, 0);
        expect(sum).toBeCloseTo(1, 6);
      }
  });
});

describe('F-65 商店', () => {
  it('買うとルーンが減り、持ち物が増える。足りなければ買えない', () => {
    const p = newProfile();
    p.runes = buyPrice('herb') + 1;
    const bag = p.bag.length;
    expect(buy(p, 'herb', 'bag')).toBe(true);
    expect(p.runes).toBe(1);
    expect(p.bag.length).toBe(bag + 1);
    expect(buy(p, 'herb', 'bag')).toBe(false);
    expect(p.runes).toBe(1);
  });

  it('売るとルーンが増え、持ち物から消える', () => {
    const p = newProfile();
    const item = p.bag.find((i) => i.kind === 'herb')!;
    const got = sell(p, [item]);
    expect(got).toBeGreaterThan(0);
    expect(p.runes).toBe(got);
    expect(p.bag.includes(item)).toBe(false);
  });
});

describe('F-46 仲間は、眠っている・はりつけの魔物を攻撃しない', () => {
  const setup = (ailment: 'asleep' | 'pinned' | null) => {
    const g = withParty(['garuf'], 3);
    g.allies = g.allies.slice(0, 1);
    const ally = g.allies[0];
    g.player.hp = g.player.maxHp = 9999;
    // 仲間の隣の空いた床に魔物を置く
    for (const v of DIR_VECTORS) {
      const at = { x: ally.pos.x + v.x, y: ally.pos.y + v.y };
      const busy = (at.x === g.player.pos.x && at.y === g.player.pos.y) || g.allies.some((a) => a.pos.x === at.x && a.pos.y === at.y);
      if (!g.map.isWalkable(at.x, at.y) || busy) continue;
      const m = createMonster(species('chuppi'), at, 1);
      m.hp = m.maxHp = 999;
      if (ailment) m.ailments[ailment] = 99;
      g.monsters.push(m);
      return { g, m, ally };
    }
    throw new Error('置けない');
  };

  for (const ailment of ['asleep', 'pinned'] as const) {
    it(`${ailment} の魔物が隣にいても、仲間は攻撃しない`, () => {
      const { g, m, ally } = setup(ailment);
      for (let i = 0; i < 5; i++) {
        g.wait();
        const hits = g.takeScenes().filter((s) => s.actors[s.attacker]?.key === `a${ally.card.id}` && s.action === 'attack');
        expect(hits).toEqual([]);
      }
      expect(m.hp).toBe(999);
    });
  }

  it('起きている魔物が隣にいれば、仲間は攻撃する', () => {
    const { g, m } = setup(null);
    for (let i = 0; i < 5; i++) g.wait();
    expect(m.hp).toBeLessThan(999);
  });
});
