// 6.7 属性の装備（docs/test-plan.md F-87）。属性の剣・盾・杖。杖は持っている間その魔法を使え、同じ属性の魔法を強くする
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../src/game/dungeons';
import { ITEMS, STAFF_RATE, createItem, equipBonus, equipMagic, type ItemKind } from '../../src/game/items';
import { rollStock } from '../../src/game/shop';
import { emptyState, logsSince, placeMonster } from '../helpers';

const ELEMENTS = ['fire', 'ice', 'thunder', 'earth', 'wind', 'light', 'dark'];
const LIGHT_DARK = ['lightSword', 'darkSword', 'lightShield', 'darkShield'];

/** 決まった並びの乱数（同じ種からいつも同じ） */
const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
};

describe('F-87 属性の装備', () => {
  it('属性の剣と盾は7属性ずつ。光と闇は+6、ほかは+5。杖は5本で、魔攻+3・攻撃力+1', () => {
    for (const e of ELEMENTS) {
      const sword = ITEMS[`${e}Sword` as ItemKind];
      const shield = ITEMS[`${e}Shield` as ItemKind];
      const rare = e === 'light' || e === 'dark';
      expect(sword.slot, e).toBe('weapon');
      expect(shield.slot, e).toBe('shield');
      expect(sword.bonus).toBe(rare ? 6 : 5);
      expect(shield.bonus).toBe(rare ? 6 : 5);
      expect(sword.element).toBe(e === 'ice' ? 'water' : e);
      expect(shield.element).toBe(sword.element);
    }
    const staffs = (Object.keys(ITEMS) as ItemKind[]).filter((k) => ITEMS[k].staff);
    expect(staffs.sort()).toEqual(['earthStaff', 'fireStaff', 'iceStaff', 'thunderStaff', 'windStaff']);
    for (const k of staffs) {
      expect(ITEMS[k].slot).toBe('weapon');
      expect(ITEMS[k].bonus).toBe(1);
      expect(ITEMS[k].magic).toBe(3);
    }
  });

  it('杖を持っている間は、覚えていない魔法も使える。外すと使えない', () => {
    const g = emptyState(1);
    const staff = createItem('iceStaff');
    g.bag.push(staff);
    expect(g.availableSpells()).not.toContain('ice');
    g.useItem(staff);
    expect(g.player.weapon).toBe(staff);
    expect(g.availableSpells()).toContain('ice');
    expect(g.knows('ice')).toBe(false);
    g.useItem(staff);
    expect(g.player.weapon).toBeNull();
    expect(g.availableSpells()).not.toContain('ice');
  });

  it('杖は魔攻を上げ、同じ属性の魔法の威力を ×1.25。錬金釜の＋は魔攻に足す', () => {
    const g = emptyState(1);
    g.player.matk = 60;
    g.learned.add('ice');
    expect(g.spellPower('ice')).toBe(90);
    const staff = createItem('iceStaff');
    g.bag.push(staff);
    g.player.weapon = staff;
    expect(g.magicPower()).toBe(63);
    // 魔攻63 × 1.5 × 1.25
    expect(g.spellPower('ice')).toBe(Math.round(63 * 1.5 * STAFF_RATE));
    // 属性のちがう魔法は、魔攻が上がるだけ
    expect(g.spellPower('fire')).toBe(126);
    staff.plus = 2;
    expect(equipMagic(staff)).toBe(5);
    expect(equipBonus(staff)).toBe(1);
    expect(g.magicPower()).toBe(65);
    // 剣の＋は、これまでどおり攻撃力に足す
    const sword = createItem('fireSword');
    sword.plus = 2;
    expect(equipBonus(sword)).toBe(7);
    expect(equipMagic(sword)).toBe(0);
  });

  it('炎の剣で殴ると、風の魔物によく効く', () => {
    let hits = 0;
    for (let seed = 1; seed < 40 && hits < 2; seed++) {
      const g = emptyState(seed);
      g.allies = [];
      const placed = placeMonster(g, 'patari');
      if (!placed) continue;
      placed.m.hp = placed.m.maxHp = 9999;
      const sword = createItem('fireSword');
      g.bag.push(sword);
      g.player.weapon = sword;
      g.player.facing = placed.dir;
      expect(g.weaponElement()).toBe('fire');
      const line = logsSince(g, () => g.attack()).find((t) => t.startsWith('あなたの攻撃 → パタリに'));
      if (!line) continue;
      expect(line.endsWith('（よく効いた）')).toBe(true);
      hits++;
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('落ちているのは、森は疾風・大地、氷穴は氷。はじまりの洞窟と、光・闇の装備はどこにも出ない', () => {
    const elemental = (id: string) =>
      DUNGEONS.find((d) => d.id === id)!.items.map((e) => e.kind).filter((k) => ITEMS[k].element || ITEMS[k].staff);
    expect(elemental('first')).toEqual([]);
    expect(elemental('forest').sort()).toEqual(['earthShield', 'earthStaff', 'earthSword', 'windShield', 'windStaff', 'windSword']);
    expect(elemental('ice').sort()).toEqual(['iceShield', 'iceStaff', 'iceSword']);
  });

  it('商店：炎の装備は森に、雷の装備は氷穴に挑めるようになってから並ぶ。光・闇はまだ並ばない', () => {
    const seen = (cleared: string[]) => {
      const kinds = new Set<ItemKind>();
      const random = seeded(cleared.length + 1);
      for (let i = 0; i < 3000; i++) for (const k of rollStock(cleared, random)) kinds.add(k);
      return kinds;
    };
    const none = seen([]);
    expect(['fireSword', 'fireStaff', 'thunderSword', 'thunderStaff'].some((k) => none.has(k as ItemKind))).toBe(false);
    const forest = seen(['first']);
    expect(forest.has('fireSword')).toBe(true);
    expect(forest.has('fireStaff')).toBe(true);
    expect(forest.has('thunderSword')).toBe(false);
    const ice = seen(['first', 'forest']);
    expect(ice.has('thunderShield')).toBe(true);
    expect(ice.has('thunderStaff')).toBe(true);
    for (const k of LIGHT_DARK) expect(ice.has(k as ItemKind), k).toBe(false);
  });
});
