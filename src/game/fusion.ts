import { PERSONALITY_IDS, createCard, isPartner, refreshStats, type Card, type PersonalityId, type Stats } from './cards';
import type { ItemKind } from './items';
import type { Species } from './monsters';
import type { Profile } from './profile';

/**
 * 配合と転生（requirements.md 9.2・9.3）。拠点の［配合］から使う。
 * 配合：仲間2体（親）を合わせて、Lv1 の子を1体生む。親はいなくなる。
 * 転生：相棒のイヅツチに、ほかの魔物1体を合わせる。イヅツチは Lv1 に戻って強くなり、魔物はいなくなる
 */

/** 配合・転生に払うルーン（いつも同じ） */
export const FUSION_COST = 1000;

/** 親（転生に合わせる魔物）になれるレベル */
export const FUSION_MIN_LEVEL = 10;

/** 子が親の性格になる確率（親1・親2それぞれ）。残りはほかの性格で同じだけ分ける */
export const PARENT_PERSONALITY_RATE = 0.35;

/** 子にずっと残す足し算は、親2体の今の能力を足した値のこの割合 */
export const INHERIT_RATE = 0.05;

/** 配合の書・転生の書 */
export const FUSION_BOOK: ItemKind = 'fusionBook';
export const REBIRTH_BOOK: ItemKind = 'rebirthBook';

/** 親になれるか。イヅツチは親にできない（転生を使う） */
export const canBeParent = (card: Card) => !isPartner(card) && card.level >= FUSION_MIN_LEVEL;

/** 子の性格の確率。親2体が同じ性格なら、その性格が 70％ */
export function personalityOdds(a: PersonalityId, b: PersonalityId): Record<PersonalityId, number> {
  const odds = Object.fromEntries(PERSONALITY_IDS.map((id) => [id, 0])) as Record<PersonalityId, number>;
  odds[a] += PARENT_PERSONALITY_RATE;
  odds[b] += PARENT_PERSONALITY_RATE;
  const others = PERSONALITY_IDS.filter((id) => id !== a && id !== b);
  for (const id of others) odds[id] = (1 - PARENT_PERSONALITY_RATE * 2) / others.length;
  return odds;
}

function rollPersonality(a: PersonalityId, b: PersonalityId, random: () => number): PersonalityId {
  const odds = personalityOdds(a, b);
  let r = random();
  for (const id of PERSONALITY_IDS) {
    r -= odds[id];
    if (r < 0) return id;
  }
  return a;
}

/** 子にずっと残す足し算。親2体の今の最大HP・攻撃・防御を、それぞれ足した値の 5％ */
export function inheritedBonus(a: Card, b: Card): Stats {
  const part = (s: keyof Stats) => Math.round((a[s] + b[s]) * INHERIT_RATE);
  return { maxHp: part('maxHp'), atk: part('atk'), def: part('def') };
}

/** 子の配合回数。親2体のうち大きい方 +1 */
export const nextFusions = (a: Card, b: Card) => Math.max(a.fusions ?? 0, b.fusions ?? 0) + 1;

/** バッグと倉庫にある、その書の数 */
export const bookCount = (p: Profile, kind: ItemKind) =>
  [...p.bag, ...p.warehouse].filter((i) => i.kind === kind).length;

/** 書を1つ使う。倉庫にあれば倉庫から、なければバッグから */
function useBook(p: Profile, kind: ItemKind): void {
  const fromWarehouse = p.warehouse.findIndex((i) => i.kind === kind);
  if (fromWarehouse >= 0) p.warehouse.splice(fromWarehouse, 1);
  else p.bag.splice(p.bag.findIndex((i) => i.kind === kind), 1);
}

/** 書とルーンが足りるか。足りなければ、その理由 */
export function costProblem(p: Profile, book: ItemKind): string | null {
  if (bookCount(p, book) === 0) return book === FUSION_BOOK ? '配合の書がない' : '転生の書がない';
  if (p.runes < FUSION_COST) return 'ルーンが足りない';
  return null;
}

/** 配合できる組み合わせ（Lv10 以上の仲間2体・配合の書・ルーン）がそろっているか。拠点の「NEW」に使う */
export const canFuseNow = (p: Profile) => p.cards.filter(canBeParent).length >= 2 && costProblem(p, FUSION_BOOK) === null;

/** 仲間の一覧と連れていく仲間から、いなくなった魔物を除く */
function remove(p: Profile, gone: Card[]): void {
  p.cards = p.cards.filter((c) => !gone.includes(c));
  p.hand = p.hand.filter((id) => !gone.some((c) => c.id === id));
}

/**
 * 配合する。子は species の種族で Lv1 から。親1のいた場所に入り、連れていく仲間には入れない。
 * 親の種族を選んだときは、その親のニックネームを引き継ぐ
 */
export function fuse(p: Profile, a: Card, b: Card, species: Species, random: () => number = Math.random): Card {
  useBook(p, FUSION_BOOK);
  p.runes -= FUSION_COST;
  const child = createCard(species, false, rollPersonality(a.personality, b.personality, random), 1);
  child.bonus = inheritedBonus(a, b);
  child.fusions = nextFusions(a, b);
  const parent = species === a.species ? a : species === b.species ? b : null;
  if (parent?.nickname) child.nickname = parent.nickname;
  refreshStats(child);
  child.hp = child.maxHp;
  const at = p.cards.indexOf(a);
  remove(p, [a, b]);
  p.cards.splice(Math.min(at, p.cards.length), 0, child);
  return child;
}

/** 転生する。イヅツチは Lv1 に戻り、足し算と性格が変わって、転生回数が +1。合わせた魔物はいなくなる */
export function rebirth(p: Profile, partner: Card, material: Card, random: () => number = Math.random): void {
  useBook(p, REBIRTH_BOOK);
  p.runes -= FUSION_COST;
  partner.bonus = inheritedBonus(partner, material);
  partner.personality = rollPersonality(partner.personality, material.personality, random);
  partner.fusions = (partner.fusions ?? 0) + 1;
  partner.level = 1;
  partner.exp = 0;
  partner.status = 'ready';
  refreshStats(partner);
  partner.hp = partner.maxHp;
  remove(p, [material]);
}
