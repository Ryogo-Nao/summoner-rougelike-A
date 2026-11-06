// 1.4 道具（docs/test-plan.md F-30〜F-35）
import { describe, expect, it } from 'vitest';
import { BAG_LIMIT, ITEMS, STAR_ITEMS, createItem, type ItemKind } from '../../src/game/items';
import { emptyState, logsSince, placeMonster, stairsOf } from '../helpers';

describe('F-30 薬草', () => {
  it('回復し、回復の数字とログが、魔物の攻撃より先の場面で出る', () => {
    const g = emptyState(12);
    placeMonster(g, 'chuppi');
    g.player.hp = 5;
    const herb = createItem('herb');
    g.bag.push(herb);
    g.useItem(herb);
    const scenes = g.takeScenes();
    expect(g.player.hp).toBeGreaterThan(5);
    expect(scenes.length).toBeGreaterThanOrEqual(1);
    const first = scenes[0];
    expect(first.attacker).toBe(-1);
    expect(first.popups.some((p) => p.text.startsWith('+'))).toBe(true);
    expect(first.hpBefore).toBe(5);
    expect(first.hpAfter).toBeGreaterThan(5);
    const firstLogs = g.log.filter((e) => e.serial > first.logBefore && e.serial <= first.logAfter).map((e) => e.text);
    expect(firstLogs.some((t) => t.startsWith('薬草を使った'))).toBe(true);
    expect(firstLogs.some((t) => t.includes('の攻撃'))).toBe(false);
  });
});

describe('F-31 星', () => {
  const eat = (kind: ItemKind, setup?: (g: ReturnType<typeof emptyState>) => void) => {
    const g = emptyState(13);
    setup?.(g);
    g.player.food = 50;
    const star = createItem(kind);
    g.bag.push(star);
    g.useItem(star);
    return g;
  };

  it('どの星も、食べると満腹度が5増え、なくなる', () => {
    for (const kind of STAR_ITEMS) {
      const g = eat(kind);
      expect(g.player.food, kind).toBeGreaterThanOrEqual(54);
      expect(g.bag.some((i) => i.kind === kind)).toBe(false);
    }
  });

  it('食べたときの効き目', () => {
    expect(eat('starSleep').player.ailments.asleep).toBeGreaterThan(0);
    expect(eat('starConfuse').player.ailments.confused).toBeGreaterThan(0);
    expect(eat('starPoison').player.ailments.poisoned).toBeGreaterThan(0);
    expect(eat('starRage').player.ailments.raged).toBe(10);
    expect(eat('starFort').player.ailments.fortified).toBe(10);
    const healed = eat('starHeal', (g) => {
      g.player.ailments.poisoned = 10;
      g.player.ailments.confused = 3;
    });
    expect(healed.player.ailments.poisoned + healed.player.ailments.confused).toBe(0);
    const mana = eat('starMana', (g) => (g.player.mp = 0));
    expect(mana.player.manaTurns).toBeGreaterThan(0);
    const holy = eat('starHoly');
    const stairs = stairsOf(holy.map)!;
    expect(holy.map.roomAt(holy.player.pos.x, holy.player.pos.y)).toBe(holy.map.roomAt(stairs.x, stairs.y));
  });

  it('炸裂の星を食べると、前の魔物に50ダメージ', () => {
    const g = emptyState(14);
    const placed = placeMonster(g, 'goromu', 1, 10)!;
    g.player.facing = placed.dir;
    const hp = placed.m.hp;
    const star = createItem('starBurst');
    g.bag.push(star);
    g.useItem(star);
    expect(hp - placed.m.hp).toBe(50);
  });

  it('投げて当てると、相手に効く', () => {
    const throwAt = (kind: ItemKind) => {
      const g = emptyState(15);
      const placed = placeMonster(g, 'goromu', 2, 10)!;
      g.player.facing = placed.dir;
      const star = createItem(kind);
      g.bag.push(star);
      const hp = placed.m.hp;
      g.throwItem(star);
      return { m: placed.m, hp };
    };
    expect(throwAt('starSleep').m.ailments.asleep).toBeGreaterThan(0);
    expect(throwAt('starPoison').m.ailments.poisoned).toBeGreaterThan(0);
    expect(throwAt('starRage').m.ailments.raged).toBeGreaterThan(0);
    const burst = throwAt('starBurst');
    expect(burst.hp - burst.m.hp).toBe(20);
  });
});

describe('F-32 満腹度', () => {
  it('満腹度が0になると、毎ターンHPが減る', () => {
    const g = emptyState(16);
    g.player.food = 0;
    const hp = g.player.hp;
    g.wait();
    g.wait();
    expect(g.player.hp).toBe(hp - 2);
  });

  it('10ターンごとに満腹度が1減る', () => {
    const g = emptyState(17);
    const food = g.player.food;
    for (let i = 0; i < 20; i++) g.wait();
    expect(g.player.food).toBe(food - 2);
  });
});

describe('F-33 バッグの並び', () => {
  it('はじめは種類順、名前順を選ぶと名前順', () => {
    const g = emptyState(18);
    g.bag = (['ironSword', 'starSleep', 'herb', 'bread', 'sealSummon'] as ItemKind[]).map((k) => createItem(k));
    const order = Object.keys(ITEMS);
    const kinds = g.sorted(g.bag).map((i) => order.indexOf(i.kind));
    expect(kinds).toEqual([...kinds].sort((a, b) => a - b));
    g.sortBag('name');
    const kana = g.sorted(g.bag).map((i) => ITEMS[i.kind].kana);
    expect(kana).toEqual([...kana].sort((a, b) => a.localeCompare(b, 'ja')));
  });
});

describe('F-34 拾う', () => {
  const setup = (full: boolean) => {
    const g = emptyState(19);
    const dir = ([0, 2, 4, 6] as const).find((d) => g.map.canStep(g.player.pos, d))!;
    const v = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ][dir / 2];
    const at = { x: g.player.pos.x + v[0], y: g.player.pos.y + v[1] };
    if (full) while (g.bag.length < BAG_LIMIT) g.bag.push(createItem('herb'));
    const item = createItem('water');
    g.floorItems.push({ item, pos: at });
    g.tryMove(dir);
    return { g, item };
  };
  it('道具の上に進むと拾う', () => {
    const { g, item } = setup(false);
    expect(g.bag.includes(item)).toBe(true);
  });
  it('バッグがいっぱいなら拾わない', () => {
    const { g, item } = setup(true);
    expect(g.bag.includes(item)).toBe(false);
    expect(g.bag.length).toBe(BAG_LIMIT);
  });
});

describe('F-35 道具の表', () => {
  it('すべての道具に、名前・読み・説明・値打ちがある', () => {
    for (const [kind, d] of Object.entries(ITEMS)) {
      expect(d.name, kind).toBeTruthy();
      expect(d.kana, kind).toMatch(/^[ぁ-んー]+$/);
      expect(d.desc, kind).toBeTruthy();
      expect(d.desc, kind).not.toMatch(/undefined|NaN|\[object/);
      expect(typeof d.value, kind).toBe('number');
    }
  });

  it('ログに undefined などが出ない（いろいろな道具を使う）', () => {
    const g = emptyState(20);
    const lines = logsSince(g, () => {
      for (const kind of ['herb', 'bigHerb', 'water', 'bread', 'antidote', 'kitsuke', ...STAR_ITEMS] as ItemKind[]) {
        const item = createItem(kind);
        g.bag.push(item);
        g.useItem(item);
      }
    });
    for (const t of lines) expect(t).not.toMatch(/undefined|NaN|\[object/);
  });
});
