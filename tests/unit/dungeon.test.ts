// 1.1 ダンジョンと移動（docs/test-plan.md F-01〜F-07）
import { describe, expect, it } from 'vitest';
import { DIR_VECTORS } from '../../src/game/dir';
import { DUNGEONS, monstersForFloor } from '../../src/game/dungeons';
import { ITEMS } from '../../src/game/items';
import { SPECIES } from '../../src/game/monsters';
import { loadoutOf, newProfile } from '../../src/game/profile';
import { GameState } from '../../src/game/state';
import { DIRS, emptyState, placeMonster, reachable, stairsOf } from '../helpers';

describe('F-01・F-02 マップ', () => {
  for (const d of DUNGEONS) {
    it(`${d.name}：どの階も、スタートから階段まで行けて、床はすべてつながっている`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const g = new GameState(seed, undefined, d.id);
        for (let floor = 1; floor <= Math.min(d.floors, 6); floor++) {
          const stairs = stairsOf(g.map);
          expect(stairs, `seed ${seed} B${floor}F に階段がない`).not.toBeNull();
          const start = g.player.pos;
          expect(g.map.isWalkable(start.x, start.y)).toBe(true);
          expect(start.x === stairs!.x && start.y === stairs!.y).toBe(false);
          const seen = reachable(g.map, start);
          expect(seen.has(stairs!.y * g.map.width + stairs!.x), `seed ${seed} B${floor}F 階段に行けない`).toBe(true);
          let floorTiles = 0;
          for (let y = 0; y < g.map.height; y++) for (let x = 0; x < g.map.width; x++) if (g.map.isWalkable(x, y)) floorTiles++;
          expect(seen.size, `seed ${seed} B${floor}F つながっていない床がある`).toBe(floorTiles);
          // 魔物と道具が床の上にある
          for (const m of g.monsters) expect(g.map.isWalkable(m.pos.x, m.pos.y)).toBe(true);
          for (const f of g.floorItems) expect(g.map.isWalkable(f.pos.x, f.pos.y)).toBe(true);
          if (floor < d.floors) g.descend();
        }
      }
    });
  }
});

describe('F-03・F-04 移動', () => {
  it('8方向に1歩ずつ進み、壁には入れない', () => {
    const g = emptyState(3);
    for (let i = 0; i < 40; i++) {
      const at = { ...g.player.pos };
      const dir = DIRS[i % 8];
      const can = g.map.canStep(at, dir) && !g.allyAt(at.x + DIR_VECTORS[dir].x, at.y + DIR_VECTORS[dir].y);
      const turn = g.turn;
      const r = g.tryMove(dir);
      if (can) {
        expect(r).toBe('moved');
        expect(g.player.pos).toEqual({ x: at.x + DIR_VECTORS[dir].x, y: at.y + DIR_VECTORS[dir].y });
        expect(g.turn).toBe(turn + 1);
      } else {
        expect(r).toBe('none');
        expect(g.player.pos).toEqual(at);
      }
    }
  });

  it('魔物のいるマスへは進まない（向くだけ）', () => {
    const g = emptyState(4);
    const placed = placeMonster(g, 'chuppi')!;
    const at = { ...g.player.pos };
    expect(g.tryMove(placed.dir)).toBe('none');
    expect(g.player.pos).toEqual(at);
    expect(g.player.facing).toBe(placed.dir);
  });

  it('仲間のいるマスへ進むと入れ替わる', () => {
    const profile = newProfile();
    const g = new GameState(5, loadoutOf(profile));
    g.monsters = [];
    g.turnFirst = false;
    const a = g.allies[0];
    expect(a).toBeDefined();
    const p = { ...g.player.pos };
    const dx = Math.sign(a.pos.x - p.x);
    const dy = Math.sign(a.pos.y - p.y);
    const dir = DIRS.find((d) => DIR_VECTORS[d].x === dx && DIR_VECTORS[d].y === dy)!;
    if (!g.map.canStep(p, dir)) return;
    const allyPos = { ...a.pos };
    expect(g.tryMove(dir)).toBe('moved');
    expect(g.player.pos).toEqual(allyPos);
    expect(a.pos).toEqual(p);
  });
});

describe('F-05 階段', () => {
  it('階段を降りると次の階へ。最後の階で踏破になる', () => {
    const g = emptyState(6);
    const last = g.dungeon.floors;
    for (let f = 1; f < last; f++) {
      g.descend();
      expect(g.floor).toBe(f + 1);
    }
    expect(g.cleared).toBe(false);
    g.descend();
    expect(g.cleared).toBe(true);
  });
});

describe('F-06・F-07 ダンジョンの表', () => {
  const speciesIds = new Set(SPECIES.map((s) => s.id));
  for (const d of DUNGEONS) {
    it(`${d.name}：魔物・道具の表に、ない魔物・道具がない。出る階が範囲の中`, () => {
      for (const e of d.monsters) {
        expect(speciesIds.has(e.species), e.species).toBe(true);
        expect(e.floors[0]).toBeGreaterThanOrEqual(1);
        expect(e.floors[1]).toBeLessThanOrEqual(d.floors);
        expect(e.floors[0]).toBeLessThanOrEqual(e.floors[1]);
      }
      for (const e of d.items) {
        expect(e.kind in ITEMS, e.kind).toBe(true);
        expect(e.weight).toBeGreaterThan(0);
        if (e.floors) expect(e.floors[1]).toBeLessThanOrEqual(d.floors);
      }
      for (let f = 1; f <= d.floors; f++) expect(monstersForFloor(d, f).length, `B${f}F に魔物がいない`).toBeGreaterThan(0);
      expect(d.monsterHouse.fromFloor).toBeLessThanOrEqual(d.floors);
      expect(d.monsterHouse.chance).toBeGreaterThanOrEqual(0);
      expect(d.monsterHouse.chance).toBeLessThanOrEqual(1);
      if (d.requires) expect(DUNGEONS.some((x) => x.id === d.requires)).toBe(true);
    });
  }
});
