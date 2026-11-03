/** はい／いいえの確認ダイアログ。開いている間は isOpen() が true */
export class ConfirmDialog {
  private readonly root = document.getElementById('dialog')!;
  private readonly text = document.getElementById('dialog-text')!;
  private readonly yes = document.getElementById('dialog-yes')!;
  private readonly no = document.getElementById('dialog-no')!;
  private onYes: (() => void) | null = null;

  constructor() {
    this.yes.addEventListener('click', () => {
      const handler = this.onYes;
      this.close();
      handler?.();
    });
    this.no.addEventListener('click', () => this.close());
  }

  open(message: string, yesLabel: string, noLabel: string, onYes: () => void): void {
    this.text.textContent = message;
    this.yes.textContent = yesLabel;
    this.no.textContent = noLabel;
    this.onYes = onYes;
    this.root.hidden = false;
  }

  close(): void {
    this.root.hidden = true;
    this.onYes = null;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }
}
