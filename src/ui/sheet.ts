/** 1行ぶんの中身。button を省くと、ボタンのない行になる */
export interface SheetRow {
  icon: string;
  name: string;
  sub: string;
  dim?: boolean;
  button?: { label: string; disabled?: boolean; onClick: () => void };
}

/** カード・魔法などの一覧を下側に出す。閉じられない一覧は、選ぶまで開いたままにする */
export class Sheet {
  private readonly root = document.getElementById('sheet')!;
  private readonly title = document.getElementById('sheet-title')!;
  private readonly body = document.getElementById('sheet-body')!;
  private readonly closeButton = document.getElementById('sheet-close')!;
  private readonly onOpen: () => void;
  private closable = true;

  /** onOpen は開くたびに呼ぶ。押しっぱなしのパッドを離すのに使う */
  constructor(onOpen: () => void) {
    this.onOpen = onOpen;
    this.closeButton.addEventListener('click', () => this.close());
    // 一覧の外側をタップしても閉じる
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root && this.closable) this.close();
    });
  }

  open(title: string, rows: SheetRow[], options: { note?: string; footer?: HTMLElement; closable?: boolean } = {}): void {
    this.title.textContent = title;
    this.closable = options.closable ?? true;
    this.closeButton.hidden = !this.closable;
    const children: HTMLElement[] = [];
    if (options.note) {
      const note = document.createElement('p');
      note.className = 'sheet-note';
      note.textContent = options.note;
      children.push(note);
    }
    for (const row of rows) children.push(renderRow(row));
    if (options.footer) children.push(options.footer);
    this.body.replaceChildren(...children);
    this.root.hidden = false;
    this.onOpen();
  }

  close(): void {
    this.root.hidden = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }
}

function renderRow(row: SheetRow): HTMLElement {
  const el = document.createElement('div');
  el.className = row.dim ? 'sheet-row dim' : 'sheet-row';
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = row.icon;
  const text = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = row.name;
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = row.sub;
  text.append(name, sub);
  el.append(icon, text);
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
