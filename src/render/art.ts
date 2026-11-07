/**
 * 生成AIで作った絵（docs/art-guide.md）。public/art に置いた PNG を読み込む。
 * 絵がまだないものは、今までどおり絵文字で出す
 */

import { ITEMS, type ItemKind } from '../game/items';

/**
 * 道具の絵（docs/art-guide.md 7章）。道具は種類ごとに代表の絵を1枚使い、装備（武器・盾）だけは1つずつ絵を持つ。
 * 種類は道具の決まり（items.ts）から決めるので、同じ種類の道具を足しても、絵を足さなくてよい
 */
function artKind(kind: ItemKind): string {
  const d = ITEMS[kind];
  if (d.slot) return kind;
  if (d.seal) return 'sealSummon';
  if (d.star) return 'star';
  if (d.pouch) return 'holyPouch';
  if (d.spell) return 'tomeGuard';
  if (d.heal || d.cure) return 'herb';
  if (d.arrow) return 'arrow';
  if (d.food) return 'bread';
  return kind;
}

/** 絵のファイルがあるもの（ファイル名は item_<名前>.png） */
const ITEM_ART = new Set([
  'herb', 'bread', 'arrow', 'sealSummon', 'star', 'tomeGuard', 'holyPouch',
  'water', 'blank', 'rune', 'pot', 'fusionBook', 'rebirthBook',
  'club', 'bronzeSword', 'ironSword', 'woodShield', 'leatherShield', 'ironShield',
]);

/** 道具の絵の id（artElement・artImage に渡す）。絵がなければ undefined */
export function itemArt(kind: string): string | undefined {
  const art = kind in ITEMS ? artKind(kind as ItemKind) : kind;
  return ITEM_ART.has(art) ? `item_${art}` : undefined;
}

const ART_IDS = new Set([
  'player', 'izutsuchi', 'chuppi', 'berogg', 'pokotake', 'shururu', 'garuf', 'kaburamu', 'moyari', 'hidamari', 'patari', 'goromu',
  'nemuriga', 'kuimushi', 'amigumo', 'chisui', 'tsubumaru', 'fuwakura', 'nurarika', 'kirigani', 'dosuino', 'tsuraragu',
  ...[...ITEM_ART].map((k) => `item_${k}`),
]);

const fileOf = (id: string) =>
  id === 'player' ? 'art/player.png' : id.startsWith('item_') ? `art/${id}.png` : `art/monster_${id}.png`;

/** 顔のアイコンの絵があるもの（全身の絵から scripts/crop-face.ps1 で切り出す） */
const FACE_IDS = new Set([
  'player', 'izutsuchi', 'chuppi', 'berogg', 'pokotake', 'shururu', 'garuf', 'kaburamu', 'moyari', 'hidamari', 'patari', 'goromu',
  'nemuriga', 'kuimushi', 'amigumo', 'chisui', 'tsubumaru', 'fuwakura', 'nurarika', 'kirigani', 'dosuino', 'tsuraragu',
]);

/** 丸い枠に入れる顔。絵がなければ fallback の絵文字を文字で出す */
export function faceElement(id: string, fallback: string): HTMLElement {
  if (!FACE_IDS.has(id)) {
    const span = document.createElement('span');
    span.className = 'face-emoji';
    span.textContent = fallback;
    return span;
  }
  const img = document.createElement('img');
  img.src = `art/face_${id}.png`;
  img.alt = '';
  img.draggable = false;
  return img;
}

const images = new Map<string, HTMLImageElement>();
const listeners: (() => void)[] = [];

/** 絵を読み込み終えたときに呼ぶ。マップを描き直すのに使う */
export function onArtLoaded(fn: () => void): void {
  listeners.push(fn);
}

/** 絵があるか */
export const hasArt = (id: string) => ART_IDS.has(id);

/** 読み込み済みの絵。まだなら読み込みを始めて null を返す */
export function artImage(id: string): HTMLImageElement | null {
  if (!ART_IDS.has(id)) return null;
  let img = images.get(id);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.onload = () => listeners.forEach((fn) => fn());
    img.src = fileOf(id);
    images.set(id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** 一覧などに置く絵。絵がなければ fallback の絵文字を文字で出す */
export function artElement(id: string, fallback: string, className = 'art'): HTMLElement {
  if (!ART_IDS.has(id)) {
    const span = document.createElement('span');
    span.textContent = fallback;
    return span;
  }
  const img = document.createElement('img');
  img.className = className;
  img.src = fileOf(id);
  img.alt = '';
  img.draggable = false;
  return img;
}

/** 最初に全部読み込んでおく */
export function preloadArt(): void {
  for (const id of ART_IDS) artImage(id);
}
