// あきらめる前の確かめ（docs/test-plan.md F-89）。押す前に出す失う数と、本当に失う数が同じ
import { describe, expect, it } from 'vitest';
import { createItem } from '../../src/game/items';
import { giveUpLoss, loadoutOf, newProfile, returnToBase } from '../../src/game/profile';
import { GameState } from '../../src/game/state';

describe('F-89 あきらめる前に、失うものを数で出す', () => {
  it('道具は持っていった道具の半分（聖なる袋は数えない）、ルーンはダンジョンで拾った分。拠点のルーンは減らない', () => {
    for (const [count, home, found] of [
      [5, 3001, 120],
      [4, 0, 0],
      [0, 10, 35],
    ]) {
      const profile = newProfile();
      profile.bag = [...Array.from({ length: count }, () => createItem('herb')), createItem('holyPouch')];
      profile.runes = home;
      const g = new GameState(7, loadoutOf(profile), 'first');
      g.runes = found;
      const before = giveUpLoss(profile, g);
      expect(before.items).toBe(Math.floor(count / 2));
      expect(before.runes).toBe(found);
      g.giveUp();
      const losses = returnToBase(profile, g);
      expect(losses.items.length).toBe(before.items);
      expect(losses.runesLost).toBe(found);
      // 拠点のルーンはそのまま。拾ったルーンは持ち帰らない
      expect(profile.runes).toBe(home);
    }
  });
});
