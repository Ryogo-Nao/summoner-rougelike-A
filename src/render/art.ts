/**
 * 生成AIで作った絵（docs/art-guide.md）。public/art に置いた PNG を読み込む。
 * 絵がまだないものは、今までどおり絵文字で出す
 */

/** 絵のファイルがあるもの。player は主人公、ほかは魔物の id（ファイル名は monster_<id>.png） */
const ART_IDS = new Set(['player', 'izutsuchi']);

const fileOf = (id: string) => (id === 'player' ? 'art/player.png' : `art/monster_${id}.png`);

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
