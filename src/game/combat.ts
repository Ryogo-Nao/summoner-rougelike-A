import type { Rng } from './rng';

/** 通常攻撃の命中率（balance.md 3.2） */
export const HIT_RATE = 0.9;

/** ダメージ = 攻撃力 × 16 ÷ (16 + 防御力) × 乱数(0.88〜1.12)。四捨五入、最低1（balance.md 3.1） */
export function rollDamage(rng: Rng, atk: number, def: number): number {
  const base = (atk * 16) / (16 + def);
  const spread = 0.88 + rng.next() * 0.24;
  return Math.max(1, Math.round(base * spread));
}

/** いちばん上のレベル。主人公も仲間も、ここまで上がる（balance.md 1.3） */
export const MAX_LEVEL = 99;

/** 1つ上のレベルまでに要る経験値の上限。ここに届いたら、その先はずっとこの値 */
export const EXP_STEP_CAP = 7000;

/** Lv1→2 から Lv10→11 までの、1つ上のレベルまでに要る経験値のもと（balance.md 1.3） */
const FIRST_STEPS = [10, 20, 30, 40, 50, 70, 80, 100, 120, 140];

/** Lv11 から先は、1つ上がるたびに要る経験値のもとがこの倍になる */
const STEP_GROWTH = 1.12;

/** level から1つ上のレベルまでに要る経験値のもと */
function baseStep(level: number): number {
  return level <= FIRST_STEPS.length ? FIRST_STEPS[level - 1] : FIRST_STEPS.at(-1)! * STEP_GROWTH ** (level - FIRST_STEPS.length);
}

/**
 * レベルごとの累計経験値の表。index 0 が Lv2。
 * 1つ上までに要る経験値は「もと × rate」で、EXP_STEP_CAP に届いたらそこで止める
 */
function expTable(rate: number): number[] {
  const table: number[] = [];
  let total = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    total += Math.min(EXP_STEP_CAP, Math.round(baseStep(level) * rate));
    table.push(total);
  }
  return table;
}

/** 主人公が次のレベルに必要な経験値は、もとの何倍か（balance.md 1.3） */
export const PLAYER_EXP_RATE = 1.2;

/** 仲間が次のレベルに必要な経験値は、もとの何倍か（balance.md 4.2） */
export const ALLY_EXP_RATE = 2;

const PLAYER_TABLE = expTable(PLAYER_EXP_RATE);
const ALLY_TABLE = expTable(ALLY_EXP_RATE);

/** 累計経験値 exp のときのレベル */
function levelIn(table: number[], exp: number): number {
  let level = 1;
  for (const need of table) {
    if (exp >= need) level++;
    else break;
  }
  return level;
}

/** 主人公の累計経験値 exp のときのレベル */
export const playerLevelForExp = (exp: number) => levelIn(PLAYER_TABLE, exp);

/** 仲間の累計経験値 exp のときのレベル */
export const allyLevelForExp = (exp: number) => levelIn(ALLY_TABLE, exp);

/** 仲間が次のレベルまでに必要な経験値。いちばん上のレベルなら null */
export function allyExpToNext(exp: number): number | null {
  const need = ALLY_TABLE.find((n) => exp < n);
  return need === undefined ? null : need - exp;
}

/** 仲間がそのレベルになったばかりのときの累計経験値 */
export function allyExpForLevel(level: number): number {
  return level <= 1 ? 0 : ALLY_TABLE[Math.min(level, MAX_LEVEL) - 2];
}