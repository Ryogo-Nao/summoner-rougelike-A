// 2. 性能のテスト（docs/test-plan.md P-01〜P-06）。目安は少し余裕をもたせ、結果の数字はログに出す
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createCard } from '../../src/game/cards';
import { generateFloor } from '../../src/game/dungeon';
import { ITEMS, createItem, type ItemKind } from '../../src/game/items';
import { SPECIES, createMonster } from '../../src/game/monsters';
import { newProfile } from '../../src/game/profile';
import { Rng } from '../../src/game/rng';
import { GameState, cardToData, type RunData } from '../../src/game/state';
import { DIRS } from '../helpers';

/** fn を n 回動かした平均（ミリ秒）。最初の数回は温める */
function average(n: number, fn: (i: number) => void): number {
  for (let i = 0; i < 5; i++) fn(i);
  const start = performance.now();
  for (let i = 0; i < n; i++) fn(i);
  return (performance.now() - start) / n;
}

const report = (label: string, value: string) => console.log(`[性能] ${label}: ${value}`);

/** GitHub の機械は手元より遅いので、時間の目安を3倍にゆるめる（大きさの目安は同じ） */
const SLOW = process.env.CI ? 3 : 1;

/** 魔物を count 体置いた、しずくの氷穴の階 */
function crowded(count: number): GameState {
  const g = new GameState(5, undefined, 'ice');
  g.player.maxHp = g.player.hp = 1e9;
  const rng = new Rng(9);
  const strong = SPECIES.slice(5);
  g.monsters = [];
  let tries = 0;
  while (g.monsters.length < count && tries++ < 10000) {
    const x = rng.int(1, g.map.width - 2);
    const y = rng.int(1, g.map.height - 2);
    if (!g.map.isWalkable(x, y)) continue;
    if (g.monsters.some((m) => m.pos.x === x && m.pos.y === y)) continue;
    if (x === g.player.pos.x && y === g.player.pos.y) continue;
    g.monsters.push(createMonster(rng.pick(strong), { x, y }, 10));
  }
  return g;
}

describe('性能', () => {
  it('P-01 1ターンの計算（魔物20体）が平均 2ms 以下', () => {
    const g = crowded(20);
    const ms = average(300, () => g.wait());
    report('1ターン（魔物20体）', `${ms.toFixed(3)}ms`);
    expect(ms).toBeLessThan(2 * SLOW);
  });

  it('P-02 1階のマップを作る時間が平均 20ms 以下', () => {
    const ms = average(200, (i) => generateFloor(new Rng(i + 1)));
    const whole = average(50, (i) => new GameState(i + 1, undefined, 'ice'));
    report('マップ作り', `${ms.toFixed(3)}ms（魔物・道具を置くまでで ${whole.toFixed(3)}ms）`);
    expect(ms).toBeLessThan(20 * SLOW);
    expect(whole).toBeLessThan(20 * SLOW);
  });

  it('P-03・P-04 ダンジョンの途中の保存・読み込みが速く、データが小さい', () => {
    const g = crowded(30);
    for (let i = 0; i < 300; i++) g.tryMove(DIRS[i % 8]);
    let text = '';
    const save = average(100, () => (text = JSON.stringify(g.toData())));
    const load = average(100, () => GameState.fromData(JSON.parse(text) as RunData));
    report('保存', `${save.toFixed(3)}ms、読み込み ${load.toFixed(3)}ms、大きさ ${(text.length / 1024).toFixed(1)}KB`);
    expect(save).toBeLessThan(20 * SLOW);
    expect(load).toBeLessThan(20 * SLOW);
    expect(text.length).toBeLessThan(300 * 1024);
  });

  it('P-04 拠点のデータ（仲間100体・道具300個）が 300KB 以下', () => {
    const p = newProfile();
    for (let i = 0; i < 100; i++) p.cards.push(createCard(SPECIES[i % SPECIES.length], false, 'sunao', 1 + (i % 30)));
    const kinds = Object.keys(ITEMS) as ItemKind[];
    for (let i = 0; i < 300; i++) p.warehouse.push(createItem(kinds[i % kinds.length]));
    const text = JSON.stringify({ version: 1, ...p, cards: p.cards.map(cardToData) });
    report('拠点のデータ', `${(text.length / 1024).toFixed(1)}KB`);
    expect(text.length).toBeLessThan(300 * 1024);
  });

  it('P-05 3000ターンでたらめに遊んでも止まらず、ログは100行を超えない', () => {
    const rng = new Rng(2024);
    let g = new GameState(1);
    let runs = 1;
    const start = performance.now();
    for (let t = 0; t < 3000; t++) {
      if (g.dead || g.cleared || g.escaped) {
        g = new GameState(1 + runs, undefined, ['first', 'forest', 'ice'][runs % 3]);
        runs++;
      }
      const n = rng.int(0, 99);
      if (n < 60) g.tryMove(rng.pick(DIRS));
      else if (n < 80) g.attack();
      else if (n < 88) g.wait();
      else if (n < 95 && g.bag.length > 0) {
        const item = rng.pick(g.bag);
        if (g.useLabel(item) && !g.useProblem(item) && !ITEMS[item.kind].seal) g.useItem(item);
        else g.throwItem(item);
      } else if (g.isOnStairs) g.descend();
      g.takeScenes();
      expect(g.log.length).toBeLessThanOrEqual(100);
      expect(Number.isFinite(g.player.hp)).toBe(true);
    }
    report('3000ターン', `${(performance.now() - start).toFixed(0)}ms、ダンジョン ${runs} 回`);
  });

  const dist = 'dist/assets';
  it.skipIf(!existsSync(dist))('P-06 公開するJSは gzip で 100KB 以下（npm run build のあと）', () => {
    const files = readdirSync(dist).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
    let js = 0;
    for (const f of files) {
      const size = gzipSync(readFileSync(join(dist, f))).length;
      report(`ファイル ${f}`, `gzip ${(size / 1024).toFixed(1)}KB`);
      if (f.endsWith('.js')) js += size;
    }
    expect(js).toBeLessThan(100 * 1024);
  });
});
