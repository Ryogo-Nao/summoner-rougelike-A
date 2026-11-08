/**
 * 文の中の絵文字を、描いてもらった小さな絵（public/art/icon_*.png・ui_rune.png。docs/art-guide.md 7.1）に置き換える。
 * 道具の説明や属性の名前（「🔥火」）などのデータは絵文字のまま持ち、画面に出すときにだけ絵にする
 */

/** 絵文字と、その絵（public/art/<id>.png） */
export const EMOJI_ICON: Record<string, string> = {
  // 属性
  '🔥': 'icon_el_fire',
  '💧': 'icon_el_water',
  '⚡': 'icon_el_thunder',
  '🪨': 'icon_el_earth',
  '🌪': 'icon_el_wind',
  '🌟': 'icon_el_light',
  '🌑': 'icon_el_dark',
  // ルーン（お金）
  '💠': 'ui_rune',
  // 状態異常と、強化（強化は魔法と同じ絵）
  '🌀': 'icon_st_confused',
  '☠': 'icon_st_poisoned',
  '📌': 'icon_st_pinned',
  '💤': 'icon_st_asleep',
  '💢': 'icon_st_raged',
  '🏰': 'icon_st_fortified',
  '🔮': 'icon_st_mana',
  '💪': 'icon_sp_power',
  '🧱': 'icon_sp_guard',
  '✨': 'icon_sp_magic',
  '💎': 'icon_sp_ward',
  // バッグと倉庫
  '🎒': 'icon_ui_bag',
  '📦': 'icon_ui_warehouse',
};

/** 置き換える絵文字を見つける（後ろに付く異体字セレクタ U+FE0F も一緒に） */
const PATTERN = new RegExp(`(${Object.keys(EMOJI_ICON).join('|')})\\uFE0F?`, 'gu');

/** 小さな絵 */
export function iconImage(id: string, className = 'inline-icon'): HTMLImageElement {
  const img = document.createElement('img');
  img.className = className;
  img.src = `art/${id}.png`;
  img.alt = '';
  img.draggable = false;
  return img;
}

/** text を el の中身にする。知っている絵文字は絵にする（改行などはそのまま） */
export function setRichText(el: HTMLElement, text: string): void {
  const parts: (string | Node)[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const img = iconImage(EMOJI_ICON[m[1]]);
    img.alt = m[0];
    parts.push(img);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  el.replaceChildren(...parts);
}

/** 文の中の絵文字の絵の id を、出てくる順に（マップに描くときに使う） */
export function iconIds(text: string): string[] {
  return [...text.matchAll(PATTERN)].map((m) => EMOJI_ICON[m[1]]);
}
