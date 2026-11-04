import type { Rng } from './rng';

/** 通常攻撃の命中率（balance.md 3.2） */
export const HIT_RATE = 0.9;

/** ダメージ = 攻撃力 × 16 ÷ (16 + 防御力) × 乱数(0.88〜1.12)。四捨五入、最低1（balance.md 3.1） */
export function rollDamage(rng: Rng, atk: number, def: number): number {
  const base = (atk * 16) / (16 + def);
  const spread = 0.88 + rng.next() * 0.24;
  return Math.max(1, Math.round(base * spread));
}

/** 次のレベルに必要な累計経験値（balance.md 1.3）。index 0 が Lv2 */
const EXP_TABLE = [10, 30, 60, 100, 150, 220, 300, 400, 520, 660];

/** 仲間が次のレベルに必要な累計経験値は、主人公の何倍か（balance.md 4.2） */
export const ALLY_EXP_RATE = 2;

/** 仲間の累計経験値 exp のときのレベル */
export const allyLevelForExp = (exp: number) => levelForExp(exp / ALLY_EXP_RATE);

/** 仲間が次のレベルまでに必要な経験値。いちばん上のレベルなら null */
export function allyExpToNext(exp: number): number | null {
  const next = expToNext(exp / ALLY_EXP_RATE);
  return next === null ? null : next * ALLY_EXP_RATE;
}

/** 仲間がそのレベルになったばかりのときの累計経験値 */
export function allyExpForLevel(level: number): number {
  return level <= 1 ? 0 : (EXP_TABLE[Math.min(level, EXP_TABLE.length + 1) - 2] ?? 0) * ALLY_EXP_RATE;
}

/** 次のレベルまでに必要な経験値。いちばん上のレベルなら null */
export function expToNext(exp: number): number | null {
  const need = EXP_TABLE.find((n) => exp < n);
  return need === undefined ? null : need - exp;
}

/** 累計経験値 exp のときのレベル */
export function levelForExp(exp: number): number {
  let level = 1;
  for (const need of EXP_TABLE) {
    if (exp >= need) level++;
    else break;
  }
  return level;
}
