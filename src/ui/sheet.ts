import { artElement, faceElement, hasArt } from '../render/art';

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
  /** 1行の形（lines で開いた一覧）のとき、名前の横に小さく出す（Lv・×2・値段など） */
  tag?: string;
}

/**
 * 一覧の1行（UIレビュー①②）。飾りの札にせず、1枚の紙の上を細い線で区切った行にする。
 * 左に顔か絵、まん中に名前（大きく太く）と tag（Lv・×2・値段）、その下に説明（小さく1行）。どの行も同じ高さになる。
 * 右に button か right（丸い印・［－］数［＋］など）。行を押すと onSelect
 */
export interface LineRow {
  icon: string;
  /** 道具の絵（item_〜）や魔物の絵の id */
  art?: string;
  /** 魔物の顔の id（種族）。art より先に使う */
  face?: string;
  name: string;
  tag?: string;
  /** tag を赤で出す（打ち込んだ数が多すぎたときの「n個まで」） */
  tagError?: boolean;
  /** 説明。行の高さをそろえるため、いつも1行（入りきらなければ「…」） */
  sub?: string;
  /** 選んでいる行（連れていく・親にする・買う数を選んだ）。淡い金にして左に金の線 */
  on?: boolean;
  dim?: boolean;
  className?: string;
  button?: { label: string; disabled?: boolean; onClick: () => void };
  right?: HTMLElement;
  onSelect?: () => void;
}

export function renderLine(row: LineRow): HTMLElement {
  const el = document.createElement('div');
  el.className = ['line-row', row.on ? 'taking' : '', row.dim ? 'dim' : '', row.className ?? ''].filter(Boolean).join(' ');
  const face = document.createElement('span');
  face.className = 'line-face';
  if (row.face) face.append(faceElement(row.face, row.icon));
  else if (row.art && hasArt(row.art)) {
    face.append(artElement(row.art, row.icon, row.art.startsWith('item_') ? 'art item-art' : 'art'));
    if (row.art.startsWith('item_')) face.classList.add('item');
  } else {
    face.classList.add('emoji');
    face.textContent = row.icon;
  }
  const top = document.createElement('div');
  top.className = 'line-top';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = row.name;
  top.append(name);
  if (row.tag) {
    const tag = document.createElement('span');
    tag.className = row.tagError ? 'line-tag error' : 'line-tag';
    tag.textContent = row.tag;
    top.append(tag);
  }
  const text = document.createElement('div');
  text.className = 'line-text';
  text.append(top);
  if (row.sub) {
    const sub = document.createElement('div');
    sub.className = 'sub';
    // 行の中では改行せず、区切りは空白にする
    sub.textContent = row.sub.replace(/\n/g, '　');
    text.append(sub);
  }
  el.append(face, text);
  if (row.right) el.append(row.right);
  else if (row.button) {
    const b = document.createElement('button');
    b.textContent = row.button.label;
    b.disabled = row.button.disabled ?? false;
    b.addEventListener('click', row.button.onClick);
    el.append(b);
  } else if (row.onSelect) {
    // ボタンのない行は、押すと開くことを「›」で示す
    const go = document.createElement('span');
    go.className = 'line-go';
    go.textContent = '›';
    el.append(go);
  }
  const select = row.onSelect;
  if (select) {
    el.classList.add('tappable');
    el.addEventListener('click', (e) => {
      if (!(e.target instanceof Element && e.target.closest('button, input'))) select();
    });
  }
  return el;
}

/** 1行の形の行をまとめる1枚の紙 */
export function lineList(rows: HTMLElement[]): HTMLElement {
  const box = document.createElement('div');
  box.className = 'line-list';
  box.append(...rows);
  return box;
}

/** 検索の欄と並べ替えのボタンを1行に並べる */
export function listTools(...parts: HTMLElement[]): HTMLElement {
  const box = document.createElement('div');
  box.className = 'list-tools';
  box.append(...parts);
  return box;
}

/**
 * 「⇅ 種類順 ▾」の形の並べ替えのボタン。押すと options から選べる（iPhone では下に選ぶ輪が出る）。
 * current が -1 のときは、どれも選んでいない（「⇅ 並べ替え」と出し、選ぶと onPick）
 */
export function selectButton(text: string, options: string[], current: number, onPick: (index: number) => void): HTMLElement {
  const box = document.createElement('label');
  box.className = 'sort-select';
  const label = document.createElement('span');
  label.textContent = `⇅ ${text}`;
  const select = document.createElement('select');
  select.setAttribute('aria-label', '並べ替え');
  if (current < 0) {
    const none = document.createElement('option');
    none.textContent = '並べ替え';
    none.disabled = true;
    none.selected = true;
    select.append(none);
  }
  options.forEach((t, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = t;
    o.selected = i === current;
    select.append(o);
  });
  select.addEventListener('change', () => onPick(Number(select.value)));
  box.append(label, select);
  return box;
}

/** カード・魔法などの一覧を下側に出す。閉じられない一覧は、選ぶまで開いたままにする */
export class Sheet {
  private readonly root = document.getElementById('sheet')!;
  private readonly title = document.getElementById('sheet-title')!;
  private readonly body = document.getElementById('sheet-body')!;
  private readonly closeButton = document.getElementById('sheet-close')!;
  /** 左上の「‹」。押すと一つ前の一覧へ戻る（ボタンの格付けの「控えめ」） */
  private readonly backButton = document.getElementById('sheet-back')!;
  private back: (() => void) | null = null;
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
    this.backButton.addEventListener('click', () => this.back?.());
    // 一覧の外側をタップしても閉じる
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root && this.closable) this.close();
    });
  }

  /** header は一覧の上に固定して出す（スクロールしても見える。並べ替えのボタンなど） */
  open(
    title: SheetTitle,
    rows: SheetRow[],
    options: {
      note?: string;
      header?: HTMLElement;
      footer?: HTMLElement;
      closable?: boolean;
      lines?: boolean;
      /** 左上に「‹」を出し、押すとこれを呼ぶ（一つ前の一覧を開き直す） */
      back?: () => void;
    } = {},
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
    this.back = options.back ?? null;
    this.backButton.hidden = !options.back;
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
    // lines なら1行の形（1枚の紙を細い線で区切る）。そうでなければ札の形
    if (options.lines && rows.length > 0) children.push(lineList(rows.map(renderLine)));
    else for (const row of rows) children.push(renderRow(row));
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
