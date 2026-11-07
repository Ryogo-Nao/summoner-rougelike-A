import { artElement, hasArt } from '../render/art';

/**
 * 一覧の見出し。文字だけか、文字の前に絵を付けたもの。
 * art は絵の id（魔物の種族、item_〜）で、絵がなければ icon の絵文字を出す
 */
export type SheetTitle = string | { art?: string; icon: string; text: string };

/** 見出しの文字（スクロールの位置を覚えるときの名前にも使う） */
const titleText = (title: SheetTitle) => (typeof title === 'string' ? title : title.text);

/** 1行ぶんの中身。button を省くと、ボタンのない行になる */
export interface SheetRow {
  icon: string;
  /** 絵の id。絵があれば icon の代わりに出す */
  art?: string;
  name: string;
  sub: string;
  dim?: boolean;
  button?: { label: string; disabled?: boolean; onClick: () => void };
  /** 行（ボタン以外）を押したとき。つよさを見るなど */
  onSelect?: () => void;
  /** 行に足す見た目（例：taking は連れていくカードを緑で目立たせる） */
  className?: string;
}

/** カード・魔法などの一覧を下側に出す。閉じられない一覧は、選ぶまで開いたままにする */
export class Sheet {
  private readonly root = document.getElementById('sheet')!;
  private readonly title = document.getElementById('sheet-title')!;
  private readonly body = document.getElementById('sheet-body')!;
  private readonly closeButton = document.getElementById('sheet-close')!;
  private readonly onOpen: () => void;
  private closable = true;
  /** 今開いている一覧の見出しの文字 */
  private current = '';
  /**
   * 一覧ごとのスクロールの位置（見出しで見分ける）。つよさなどを見て同じ一覧へ戻ったときに、もとの位置へ戻す。
   * 閉じたら忘れる
   */
  private readonly scrolls = new Map<string, number>();

  /** onOpen は開くたびに呼ぶ。押しっぱなしのパッドを離すのに使う */
  constructor(onOpen: () => void) {
    this.onOpen = onOpen;
    this.closeButton.addEventListener('click', () => this.close());
    // 一覧の外側をタップしても閉じる
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root && this.closable) this.close();
    });
  }

  /** header は一覧の上に固定して出す（スクロールしても見える。並べ替えのボタンなど） */
  open(
    title: SheetTitle,
    rows: SheetRow[],
    options: { note?: string; header?: HTMLElement; footer?: HTMLElement; closable?: boolean } = {},
  ): void {
    if (!this.root.hidden) this.scrolls.set(this.current, this.body.scrollTop);
    this.current = titleText(title);
    if (typeof title === 'string') {
      this.title.textContent = title;
    } else {
      // 絵があれば絵を、なければ絵文字を、見出しの文字の前に出す
      const icon =
        title.art && hasArt(title.art)
          ? artElement(title.art, title.icon, title.art.startsWith('item_') ? 'art title-art item-art' : 'art title-art')
          : Object.assign(document.createElement('span'), { textContent: title.icon, className: 'title-emoji' });
      this.title.replaceChildren(icon, document.createTextNode(title.text));
    }
    this.closable = options.closable ?? true;
    this.closeButton.hidden = !this.closable;
    const children: HTMLElement[] = [];
    if (options.note) {
      const note = document.createElement('p');
      note.className = 'sheet-note';
      note.textContent = options.note;
      children.push(note);
    }
    if (options.header) {
      options.header.classList.add('sheet-sticky');
      children.push(options.header);
    }
    for (const row of rows) children.push(renderRow(row));
    if (options.footer) children.push(options.footer);
    this.body.replaceChildren(...children);
    this.root.hidden = false;
    this.body.scrollTop = this.scrolls.get(this.current) ?? 0;
    this.onOpen();
  }

  close(): void {
    this.root.hidden = true;
    this.scrolls.clear();
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }
}

export function renderRow(row: SheetRow): HTMLElement {
  const el = document.createElement('div');
  el.className = ['sheet-row', row.dim ? 'dim' : '', row.className ?? ''].filter(Boolean).join(' ');
  const icon = document.createElement('span');
  icon.className = 'icon';
  // 道具の絵は四角いので、丸い台からはみ出さないよう小さく出す
  if (row.art && hasArt(row.art)) icon.append(artElement(row.art, row.icon, row.art.startsWith('item_') ? 'art item-art' : 'art'));
  else icon.textContent = row.icon;
  const text = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = row.name;
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = row.sub;
  text.append(name, sub);
  el.append(icon, text);
  const select = row.onSelect;
  if (select) {
    el.classList.add('tappable');
    el.addEventListener('click', (e) => {
      if (!(e.target instanceof Element && e.target.closest('button'))) select();
    });
  }
  if (row.button) {
    const b = document.createElement('button');
    b.textContent = row.button.label;
    b.disabled = row.button.disabled ?? false;
    b.addEventListener('click', row.button.onClick);
    el.append(b);
  }
  return el;
}

/** 一覧のいちばん下に置く、横いっぱいのボタン */
export function wideButton(label: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'sheet-wide';
  b.textContent = label;
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}
