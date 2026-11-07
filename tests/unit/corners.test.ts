// 1.2 壁の角越しの攻撃（docs/test-plan.md F-28）。
// 矢・火・雷（いかずち）は角の向こうへ飛ぶ。隣への攻撃・投げた道具・舌は、これまでどおり角で止まる
import { describe, expect, it } from 'vitest';
import { createItem } from '../../src/game/items';
import { GameMap, Tile } from '../../src/game/map';
import { createMonster } from '../../src/game/monsters';
import type { GameState } from '../../src/game/state';
import { emptyState, species, sturdy } from '../helpers';

/** 右下（向き3）の斜めの魔物との間に、角を作る。both なら両隣とも壁（すき間）にする */
function corner(seed: number, id = 'dosuino', dist = 1, both = false) {
  for (let s = seed; s < seed + 200; s++) {
    const g = emptyState(s);
    const p = g.player.pos;
    let open = true;
    for (let dy = -1; dy <= dist + 1; dy++) for (let dx = -1; dx <= dist + 1; dx++) if (!g.map.isWalkable(p.x + dx, p.y + dy)) open = false;
    if (!open) continue;
    g.allies = [];
    sturdy(g);
    g.map.set(p.x + 1, p.y, Tile.Wall);
    if (both) g.map.set(p.x, p.y + 1, Tile.Wall);
    const m = createMonster(species(id), { x: p.x + dist, y: p.y + dist }, 1);
    m.hp = m.maxHp = 9999;
    m.lastSeen = { ...p };
    g.monsters.push(m);
    g.player.facing = 3;
    return { g, m, at: { ...m.pos } };
  }
  throw new Error('場所がない');
}

const lastCell = (g: GameState, action: string) => {
  const s = g.takeScenes().find((x) => x.action === action)!;
  return s.cells[s.cells.length - 1];
};

describe('F-28 壁の角越しの攻撃', () => {
  it('飛ぶ攻撃は、片方が壁の角を越えられる。両方とも壁のすき間は越えられない', () => {
    // (0,1) から右上（向き1）の (1,0) へ。左上 (0,0) だけが壁の角
    const map = new GameMap(3, 3, [Tile.Wall, Tile.Floor, Tile.Floor, Tile.Floor, Tile.Floor, Tile.Floor, Tile.Floor, Tile.Floor, Tile.Floor]);
    expect(map.canStep({ x: 0, y: 1 }, 1)).toBe(false);
    expect(map.canFly({ x: 0, y: 1 }, 1)).toBe(true);
    // 右下 (1,1) も壁にすると、両隣とも壁のすき間
    map.set(1, 1, Tile.Wall);
    expect(map.canFly({ x: 0, y: 1 }, 1)).toBe(false);
  });

  it('隣への攻撃は、角越しには当たらない（これまでどおり）', () => {
    const { g, m } = corner(1);
    g.attack();
    // 主人公の攻撃の場面（最初の場面）で、魔物にダメージが出ない。そのあと魔物は回りこんでくることがある
    const s = g.takeScenes()[0];
    expect(s.actors[s.attacker].isPlayer).toBe(true);
    expect(s.popups.filter((p) => p.kind === 'damage')).toEqual([]);
    expect(m.hp).toBe(9999);
  });

  it('矢は角の向こうの魔物まで飛ぶ', () => {
    const { g, at } = corner(1);
    const arrows = createItem('arrow', 5);
    g.bag.push(arrows);
    g.throwItem(arrows);
    expect(lastCell(g, 'shoot')).toEqual(at);
  });

  it('ヒボシは角の向こうの魔物に当たる', () => {
    const { g, m } = corner(1);
    g.player.mp = g.player.maxMp = 99;
    g.cast('fire');
    expect(m.hp).toBeLessThan(9999);
  });

  it('両隣とも壁のすき間は、矢も火も通らない', () => {
    const { g, m } = corner(1, 'dosuino', 1, true);
    g.player.mp = g.player.maxMp = 99;
    g.cast('fire');
    expect(m.hp).toBe(9999);
    const arrows = createItem('arrow', 5);
    g.bag.push(arrows);
    g.throwItem(arrows);
    expect(g.takeScenes().find((x) => x.action === 'shoot')!.cells).toEqual([]);
  });

  it('投げた道具は、角で止まる（これまでどおり）', () => {
    const { g } = corner(1);
    const herb = createItem('herb');
    g.bag.push(herb);
    g.throwItem(herb);
    expect(g.takeScenes().find((x) => x.action === 'throw')!.cells).toEqual([]);
  });

  it('火を吐く魔物は、角の向こうの主人公にも火を吐く', () => {
    let breathed = 0;
    for (let i = 0; i < 40 && breathed === 0; i++) {
      const { g } = corner(10 + i * 7, 'hidamari', 2);
      g.wait();
      if (g.takeScenes().some((s) => s.action === 'breath')) breathed++;
    }
    expect(breathed).toBeGreaterThan(0);
  });
});
