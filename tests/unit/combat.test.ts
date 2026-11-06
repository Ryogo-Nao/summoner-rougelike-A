// 1.2 戦い・1.3 状態異常と特技（docs/test-plan.md F-10〜F-27）
import { describe, expect, it } from 'vitest';
import { monsterStats } from '../../src/game/cards';
import { allyExpForLevel, rollDamage } from '../../src/game/combat';
import { SPECIES } from '../../src/game/monsters';
import { Rng } from '../../src/game/rng';
import { countTrials, emptyState, logsSince, placeMonster, sturdy } from '../helpers';

describe('F-10〜F-13 ダメージ・経験値・能力', () => {
  it('ダメージは最低1。攻撃が高いほど大きい（平均で）', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 2000; i++) expect(rollDamage(rng, rng.int(1, 50), rng.int(0, 80))).toBeGreaterThanOrEqual(1);
    const avg = (atk: number) => {
      let sum = 0;
      for (let i = 0; i < 500; i++) sum += rollDamage(rng, atk, 5);
      return sum / 500;
    };
    expect(avg(20)).toBeGreaterThan(avg(10));
  });

  it('主人公の攻撃で魔物のHPが減り、たおすと経験値が入る', () => {
    const g = emptyState(11);
    const placed = placeMonster(g, 'chuppi')!;
    g.player.facing = placed.dir;
    const hp = placed.m.hp;
    for (let i = 0; i < 10 && placed.m.hp === hp; i++) g.attack();
    expect(placed.m.hp).toBeLessThan(hp);
    placed.m.hp = 1;
    for (let i = 0; i < 10 && g.monsters.includes(placed.m); i++) g.attack();
    expect(g.monsters.includes(placed.m)).toBe(false);
    expect(g.player.exp).toBeGreaterThan(0);
  });

  it('仲間の経験値の表は、レベルが上がるほど大きい', () => {
    for (let lv = 2; lv < 99; lv++) expect(allyExpForLevel(lv + 1)).toBeGreaterThan(allyExpForLevel(lv));
  });

  it('魔物の Lv1 の能力は、表の値そのまま', () => {
    for (const s of SPECIES) expect(monsterStats(s, 1)).toEqual({ maxHp: s.hp, atk: s.atk, def: s.def });
  });
});

describe('F-14・F-15 攻撃の回数と速さ', () => {
  for (const id of ['garuf', 'kirigani']) {
    it(`${id} は1ターンに2回攻撃する`, () => {
      const { hits, tries } = countTrials(20, (seed) => {
        const g = emptyState(seed);
        sturdy(g);
        const placed = placeMonster(g, id);
        if (!placed) return null;
        const name = placed.m.species.name;
        const lines = logsSince(g, () => g.wait()).filter((t) => t.startsWith(`${name}の攻撃`) || t === 'あなたはかわした');
        return lines.length === 2;
      });
      expect(hits).toBe(tries);
    });
  }

  it('鈍足（ツブマル）は2ターンに1回しか動かない', () => {
    const g = emptyState(21);
    const placed = placeMonster(g, 'tsubumaru', 4) ?? placeMonster(g, 'tsubumaru', 3)!;
    let moves = 0;
    for (let i = 0; i < 6; i++) {
      const before = { ...placed.m.pos };
      g.wait();
      if (before.x !== placed.m.pos.x || before.y !== placed.m.pos.y) moves++;
    }
    expect(moves).toBeLessThanOrEqual(3);
  });
});

describe('F-20〜F-23 状態異常', () => {
  it('混乱：主人公の移動は押した方向へ正しく進む', () => {
    const g = emptyState(31);
    g.player.ailments.confused = 50;
    for (let i = 0; i < 30; i++) {
      const at = { ...g.player.pos };
      const dir = ([0, 2, 4, 6] as const).find((d) => g.map.canStep(at, d) && !g.allyAt(at.x, at.y));
      if (dir === undefined) break;
      g.tryMove(dir);
      const v = [
        [0, -1],
        [1, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
      ][dir];
      expect(g.player.pos).toEqual({ x: at.x + v[0], y: at.y + v[1] });
    }
  });

  it('混乱：魔物は主人公へ近づき、隣では空振りすることがある', () => {
    let approached = 0;
    let swings = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const far = emptyState(seed);
      const p = placeMonster(far, 'chuppi', 3);
      if (p) {
        p.m.ailments.confused = 5;
        const d0 = Math.abs(p.m.pos.x - far.player.pos.x) + Math.abs(p.m.pos.y - far.player.pos.y);
        far.wait();
        const d1 = Math.abs(p.m.pos.x - far.player.pos.x) + Math.abs(p.m.pos.y - far.player.pos.y);
        if (d1 < d0) approached++;
      }
      const near = emptyState(seed);
      sturdy(near);
      const q = placeMonster(near, 'chuppi', 1)!;
      q.m.ailments.confused = 5;
      if (logsSince(near, () => near.wait()).some((t) => t.includes('空振り'))) swings++;
    }
    expect(approached).toBeGreaterThan(30);
    expect(swings).toBeGreaterThan(20);
  });

  it('毒：HPが減り、自然回復しない', () => {
    const g = emptyState(41);
    g.player.ailments.poisoned = 30;
    g.player.hp = 20;
    let last = g.player.hp;
    for (let i = 0; i < 9; i++) {
      g.wait();
      expect(g.player.hp).toBeLessThanOrEqual(last);
      last = g.player.hp;
    }
    expect(g.player.hp).toBeLessThan(20);
  });

  it('昏睡の魔物は、攻撃されると起きる', () => {
    const g = emptyState(42);
    const placed = placeMonster(g, 'goromu')!;
    placed.m.ailments.asleep = 99;
    g.player.facing = placed.dir;
    const hp = placed.m.hp;
    for (let i = 0; i < 10 && placed.m.hp === hp; i++) g.attack();
    expect(placed.m.ailments.asleep).toBe(0);
  });
});

describe('F-24〜F-27 新しい魔物の特技', () => {
  const special = (id: string, check: (g: ReturnType<typeof emptyState>, lines: string[]) => boolean) =>
    countTrials(150, (seed) => {
      const g = emptyState(seed);
      sturdy(g);
      if (!placeMonster(g, id)) return null;
      const lines = logsSince(g, () => g.wait());
      return check(g, lines);
    });

  it('ネムリガの鱗粉で眠る（およそ3割）', () => {
    const { hits, tries } = special('nemuriga', (g) => g.player.ailments.asleep > 0);
    expect(hits / tries).toBeGreaterThan(0.15);
    expect(hits / tries).toBeLessThan(0.45);
  });

  it('アミグモの糸ではりつけ（3〜5ターン）', () => {
    const { hits } = special('amigumo', (g) => g.player.ailments.pinned >= 3 && g.player.ailments.pinned <= 5);
    expect(hits).toBeGreaterThan(15);
  });

  it('クイムシにかじられるとMPが減り、満腹度は減らない', () => {
    let mpLost = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const g = emptyState(seed);
      sturdy(g);
      if (!placeMonster(g, 'kuimushi')) continue;
      const mp = g.player.mp;
      const food = g.player.food;
      g.wait();
      if (g.player.mp < mp) {
        mpLost++;
        expect(mp - g.player.mp).toBe(Math.max(1, Math.round(g.player.maxMp * 0.01)));
      }
      expect(g.player.food).toBeGreaterThanOrEqual(food - 1);
    }
    expect(mpLost).toBeGreaterThan(15);
  });

  it('チスイは与えたダメージの半分を吸い取る', () => {
    const { hits, tries } = countTrials(40, (seed) => {
      const g = emptyState(seed);
      sturdy(g);
      const placed = placeMonster(g, 'chisui');
      if (!placed) return null;
      placed.m.hp = 1;
      const lines = logsSince(g, () => g.wait());
      const hit = lines.map((t) => /^チスイの攻撃 → あなたに(\d+)ダメージ/.exec(t)).find(Boolean);
      if (!hit) return null; // 外れた
      const dealt = Number(hit[1]);
      return placed.m.hp === 1 + Math.floor(dealt / 2) && lines.some((t) => /チスイはHPを\d+吸い取った/.test(t));
    });
    expect(tries).toBeGreaterThan(10);
    expect(hits).toBe(tries);
    // HPが満タンなら吸い取らない（ログも出ない）
    const g = emptyState(5);
    sturdy(g);
    placeMonster(g, 'chisui');
    expect(logsSince(g, () => g.wait()).some((t) => t.includes('吸い取った'))).toBe(false);
  });

  it('フワクラは毎ターンHPが戻り、毒のあいだは戻らない', () => {
    const g = emptyState(7);
    const placed = placeMonster(g, 'fuwakura', 5) ?? placeMonster(g, 'fuwakura', 4)!;
    placed.m.hp = 5;
    g.wait();
    expect(placed.m.hp).toBeGreaterThan(5);
    placed.m.hp = 5;
    placed.m.ailments.poisoned = 30;
    g.wait();
    expect(placed.m.hp).toBeLessThanOrEqual(5);
  });

  it('ヌラリカの触手は2マス先から届く', () => {
    const { hits } = countTrials(60, (seed) => {
      const g = emptyState(seed);
      sturdy(g);
      if (!placeMonster(g, 'nurarika', 2)) return null;
      return logsSince(g, () => g.wait()).some((t) => t.startsWith('ヌラリカの触手の攻撃'));
    });
    expect(hits).toBeGreaterThan(20);
  });
});
