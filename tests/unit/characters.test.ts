// F-45 キャラクターの台帳（src/game/characters.ts）と docs/characters.md
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderCharactersDoc } from '../../scripts/characters-doc.ts';
import { IZUTSUCHI } from '../../src/game/cards';
import { CHARACTERS } from '../../src/game/characters';
import { SPECIES } from '../../src/game/monsters';

describe('F-45 キャラクターの台帳', () => {
  it('ゲームにいる魔物と相棒が、すべて台帳にあり、名前が同じ', () => {
    for (const s of [...SPECIES, IZUTSUCHI]) {
      const c = CHARACTERS.find((x) => x.id === s.id);
      expect(c, `${s.id} が台帳にない`).toBeDefined();
      expect(c!.name).toBe(s.name);
      expect(c!.planned ?? false).toBe(false);
    }
  });

  it('台帳の id は重ならない。未実装でないものは、ゲームにいる', () => {
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const inGame = new Set([...SPECIES, IZUTSUCHI].map((s) => s.id));
    for (const c of CHARACTERS) if (!c.planned) expect(inGame.has(c.id), c.id).toBe(true);
  });

  it('背景は読点で区切った2つの句で、36字まで。英語・見た目も書いてある', () => {
    for (const c of CHARACTERS) {
      expect(c.lore, c.id).toMatch(/^[^、]+、[^、]+$/);
      expect(c.lore.length, c.id).toBeLessThanOrEqual(36);
      expect(c.loreEn.length, c.id).toBeGreaterThan(20);
      expect(c.look.length, c.id).toBeGreaterThan(10);
      expect(c.lookEn.length, c.id).toBeGreaterThan(20);
    }
  });

  it('docs/characters.md が台帳と同じ（直したら npm run characters）', () => {
    const doc = readFileSync('docs/characters.md', 'utf8').replace(/\r\n/g, '\n');
    expect(doc === renderCharactersDoc(), 'docs/characters.md が古い。npm run characters を動かす').toBe(true);
  });
});
