// 1.6 保存と再開（F-50〜F-52）と、非機能（N-04〜N-06）
import { beforeEach, describe, expect, it } from 'vitest';
import { createCard } from '../../src/game/cards';
import { createItem } from '../../src/game/items';
import { loadProfile, loadRunData, newProfile, saveProfile, saveRun } from '../../src/game/profile';
import { GameState, cardFromData, type RunData } from '../../src/game/state';
import { DIRS, species } from '../helpers';

/** 種から決まる、いつも同じ操作の並び */
function play(g: GameState, steps: number, seed: number): void {
  let r = seed;
  const next = () => (r = (r * 1103515245 + 12345) % 2147483648);
  for (let i = 0; i < steps && !g.dead; i++) {
    const n = next() % 10;
    if (n < 7) g.tryMove(DIRS[next() % 8]);
    else if (n < 9) g.attack();
    else g.wait();
    if (g.isOnStairs && g.floor < g.dungeon.floors) g.descend();
  }
}

const snapshot = (g: GameState) => JSON.stringify(g.toData());
/** カードと道具の通し番号は、作った順に全体で増えるので、比べるときは消す */
const shape = (g: GameState) => snapshot(g).replace(/"id":\d+/g, '"id":0');

beforeEach(() => localStorage.clear());

describe('F-50 ダンジョンの途中の保存', () => {
  it('保存して読み込むと同じ状態になり、その後も同じように進む', () => {
    const g = new GameState(77);
    g.turnFirst = false;
    play(g, 60, 1);
    const data = JSON.parse(snapshot(g)) as RunData;
    const g2 = GameState.fromData(data);
    g2.turnFirst = false;
    expect(snapshot(g2) === snapshot(g)).toBe(true);
    play(g, 60, 2);
    play(g2, 60, 2);
    expect(shape(g2) === shape(g)).toBe(true);
  });

  it('localStorage を通しても同じ', () => {
    const g = new GameState(78);
    play(g, 30, 3);
    saveRun(g);
    const g2 = GameState.fromData(loadRunData() as RunData);
    expect(snapshot(g2) === snapshot(g)).toBe(true);
  });
});

describe('F-51・F-52 拠点のデータ', () => {
  it('保存して読み込むと、同じ中身になる', () => {
    const p = newProfile();
    const c = createCard(species('garuf'), false, 'ganbari', 12);
    c.nickname = 'ポチ';
    p.cards.push(c);
    p.warehouse.push(createItem('starHeal'), createItem('ironSword'));
    p.runes = 1234;
    saveProfile(p);
    const q = loadProfile();
    expect(q.runes).toBe(1234);
    expect(q.cards.map((x) => [x.species.id, x.level, x.nickname, x.personality])).toEqual(
      p.cards.map((x) => [x.species.id, x.level, x.nickname, x.personality]),
    );
    expect(q.warehouse.map((i) => i.kind)).toEqual(['starHeal', 'ironSword']);
  });

  it('壊れたデータでも止まらず、新しいデータで始まる', () => {
    for (const bad of ['{bad json', 'null', '{"version":1}', '{"version":1,"cards":[{"species":"nobody"}]}']) {
      localStorage.setItem('summoner-profile', bad);
      const p = loadProfile();
      expect(p.cards.length, bad).toBeGreaterThanOrEqual(1);
    }
    localStorage.setItem('summoner-run', '{bad json');
    expect(loadRunData()).toBeNull();
  });
});

describe('N-04〜N-06', () => {
  it('N-04 同じ種なら、同じ操作で同じ結果になる', () => {
    const a = new GameState(99);
    const b = new GameState(99);
    play(a, 200, 5);
    play(b, 200, 5);
    expect(shape(a) === shape(b)).toBe(true);
    expect(shape(new GameState(100)) === shape(new GameState(99))).toBe(false);
  });

  it('N-05 保存できない環境でも、止まらず遊べる', () => {
    const broken = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };
    const saved = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { value: broken, configurable: true, writable: true });
    try {
      const p = loadProfile();
      expect(() => saveProfile(p)).not.toThrow();
      const g = new GameState(1);
      expect(() => saveRun(g)).not.toThrow();
      expect(loadRunData()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: saved, configurable: true, writable: true });
    }
  });

  it('N-06 前の版のカード（性格・補正・配合回数がない）を読み込める', () => {
    const old = { id: 5, species: 'garuf', level: 8, exp: 300, hp: 30, maxHp: 30, atk: 9, def: 4, status: 'ready', obtainedHere: false };
    const card = cardFromData(old as never);
    expect(card.personality).toBe('sunao');
    expect(card.maxHp).toBeGreaterThanOrEqual(30);
    expect(Number.isFinite(card.atk)).toBe(true);
  });
});
