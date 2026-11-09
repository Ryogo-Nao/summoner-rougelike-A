// 1.5 仲間（docs/test-plan.md F-40〜F-44）と、商店（F-65）
import { describe, expect, it } from 'vitest';
import { IZUTSUCHI, PERSONALITIES, PERSONALITY_IDS, cardStats, createCard } from '../../src/game/cards';
import { RECIPES, personalityOdds } from '../../src/game/fusion';
import { buyPrice, type ItemKind } from '../../src/game/items';
import { DIR_VECTORS, distance } from '../../src/game/dir';
import { SPECIES, createMonster } from '../../src/game/monsters';
import { loadProfile, loadoutOf, newProfile, saveProfile } from '../../src/game/profile';
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
          expect(now.matk).toBeGreaterThanOrEqual(prev.matk);
          expect(now.mdef).toBeGreaterThanOrEqual(prev.mdef);
          prev = now;
        }
      }
    }
  });
});

describe('F-42 性格（魔攻・魔防の性格は 2026-11-10）', () => {
  it('性格は10種類で、魔攻・魔防も上げ下げする', () => {
    expect(PERSONALITY_IDS.length).toBe(10);
    const ups = new Set(Object.values(PERSONALITIES).map((x) => x.up));
    const downs = new Set(Object.values(PERSONALITIES).map((x) => x.down));
    for (const s of ['matk', 'mdef'] as const) expect([ups.has(s), downs.has(s)], s).toEqual([true, true]);
    const s = species('kujiran');
    expect(cardStats(s, 20, 'kashikoi').matk).toBeGreaterThan(cardStats(s, 20, 'sunao').matk);
    expect(cardStats(s, 20, 'yancha').mdef).toBeLessThan(cardStats(s, 20, 'sunao').mdef);
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

  it('棚には薬草とパンが2つずつ、ほかの品は1つずつ並ぶ。棚にある数より多くは買えない', () => {
    const p = newProfile();
    const count = (k: string) => p.shopStock.filter((s) => s === k).length;
    expect(count('herb')).toBe(2);
    expect(count('bread')).toBe(2);
    for (const k of new Set(p.shopStock)) if (k !== 'herb' && k !== 'bread') expect(count(k), k).toBe(1);
    p.runes = 10000;
    expect(buy(p, 'herb', 'bag')).toBe(true);
    expect(buy(p, 'herb', 'bag')).toBe(true);
    expect(buy(p, 'herb', 'bag')).toBe(false);
    expect(count('herb')).toBe(0);
  });

  it('前の保存データ（薬草とパンが棚になかったころ）は、読むときに一度だけ足す', () => {
    const old = newProfile();
    old.shopStock = ['club'] as ItemKind[];
    saveProfile(old);
    // 前の保存データには staples がない
    const raw = JSON.parse(localStorage.getItem('summoner-profile')!) as Record<string, unknown>;
    delete raw.staples;
    localStorage.setItem('summoner-profile', JSON.stringify(raw));
    const loaded = loadProfile();
    expect(loaded.shopStock.filter((k) => k === 'herb')).toHaveLength(2);
    expect(loaded.shopStock).toContain('club');
    saveProfile(loaded);
    expect(loadProfile().shopStock.filter((k) => k === 'herb')).toHaveLength(2);
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

describe('F-47 魔物の狙いと、突撃・離れた攻撃への仲間の動き', () => {
  /** 横に7マス以上、縦に3マス以上ある部屋で、主人公・仲間1体・魔物を好きな場所に置く */
  const arena = (seed: number) => {
    for (let s = seed; s < seed + 300; s++) {
      const g = withParty(['garuf'], s);
      const room = g.map.roomAt(g.player.pos.x, g.player.pos.y);
      if (!room || room.w < 7 || room.h < 3) continue;
      // 相棒（イヅツチ）は2マス先へいかずちを飛ばすので、ガルフだけにする
      g.allies = g.allies.filter((a) => a.card.species.id === 'garuf');
      g.player.hp = g.player.maxHp = 99999;
      const ally = g.allies[0];
      ally.card.hp = ally.card.maxHp = 99999;
      const at = (dx: number, dy = 1) => ({ x: room.x + dx, y: room.y + dy });
      return { g, ally, at };
    }
    throw new Error('部屋がない');
  };
  const put = (g: GameState, id: string, pos: { x: number; y: number }) => {
    const m = createMonster(species(id), pos, 1);
    m.hp = m.maxHp = 99999;
    m.lastSeen = { ...g.player.pos };
    g.monsters.push(m);
    return m;
  };

  it('主人公にも仲間にも隣にいる魔物は、だいたい 3:1 で主人公を攻撃する', () => {
    let player = 0;
    let ally = 0;
    for (let i = 0; i < 200; i++) {
      const { g, ally: a, at } = arena(100 + i);
      g.player.pos = at(2);
      a.pos = at(4);
      a.order = 'wait';
      put(g, 'chuppi', at(3));
      g.wait();
      const hit = g.takeScenes().find((s) => s.actors[s.attacker]?.enemy);
      if (!hit) continue;
      const target = hit.toward;
      if (target.x === g.player.pos.x && target.y === g.player.pos.y) player++;
      else ally++;
    }
    const rate = player / (player + ally);
    expect(player + ally).toBeGreaterThan(100);
    expect(rate).toBeGreaterThan(0.62);
    expect(rate).toBeLessThan(0.88);
  });

  it('突撃の仲間は、魔物の2マス手前で止まって待つ（隣には入らない）', () => {
    const { g, ally, at } = arena(1);
    g.player.pos = at(0);
    ally.pos = at(2);
    ally.order = 'charge';
    const m = put(g, 'tsubumaru', at(4));
    m.lastSeen = null;
    const before = { ...ally.pos };
    g.wait();
    expect(ally.pos).toEqual(before);
  });

  it('突撃の仲間は、遠くの魔物には近づいていく', () => {
    const { g, ally, at } = arena(1);
    g.player.pos = at(0);
    ally.pos = at(1);
    ally.order = 'charge';
    const m = put(g, 'tsubumaru', at(6));
    m.lastSeen = null;
    g.wait();
    expect(ally.pos.x).toBeGreaterThan(at(1).x);
  });

  it('舌・触手で離れたところから攻撃された仲間は、その魔物へ近づく', () => {
    let approached = 0;
    let tried = 0;
    for (let i = 0; i < 60; i++) {
      const { g, ally, at } = arena(400 + i);
      g.player.pos = at(0);
      ally.pos = at(3);
      ally.order = 'wait';
      const m = put(g, 'nurarika', at(5));
      m.lastSeen = null;
      g.wait();
      const hitAlly = g.takeScenes().some((s) => s.action === 'reach' && s.toward.x === ally.pos.x && s.toward.y === ally.pos.y);
      if (!hitAlly) continue;
      tried++;
      ally.order = 'follow';
      // 仲間は魔物より先に動くので、魔物が動く前の場所と比べる
      const target = { ...m.pos };
      const before = distance(ally.pos, target);
      g.wait();
      if (distance(ally.pos, target) < before || !g.monsters.includes(m)) approached++;
    }
    expect(tried).toBeGreaterThan(5);
    expect(approached).toBe(tried);
  });
});
