import { setRichText } from './icons';

export type DialogTone = 'plain' | 'danger' | 'stop';

/** はい／いいえの確認ダイアログ。開いている間は isOpen() が true */
export class ConfirmDialog {
  private readonly root = document.getElementById('dialog')!;
  private readonly text = document.getElementById('dialog-text')!;
  private readonly yes = document.getElementById('dialog-yes')!;
  private readonly no = document.getElementById('dialog-no')!;
  private onYes: (() => void) | null = null;
  private onNo: (() => void) | null = null;
  private readonly onOpen: () => void;

  /** onOpen はダイアログを開くたびに呼ぶ。押しっぱなしのパッドを離すのに使う */
  constructor(onOpen: () => void = () => {}) {
    this.onOpen = onOpen;
    this.yes.addEventListener('click', () => {
      const handler = this.onYes;
      this.close();
      handler?.();
    });
    this.no.addEventListener('click', () => {
      const handler = this.onNo;
      this.close();
      handler?.();
    });
  }

  /**
   * onNo を省くと、いいえは閉じるだけ。tone はボタンの色。
   * danger は取り消せない操作（あきらめる・配合する・別れる）。［はい］を注意の赤にし、［いいえ］を主役の色にする。
   * stop はダンジョンの詳しい画面と同じ：［はい］は主役のまま、［いいえ］（やめる）を赤にする（階段を降りる）
   */
  open(message: string, yesLabel: string, noLabel: string, onYes: () => void, onNo?: () => void, tone: DialogTone = 'plain'): void {
    setRichText(this.text, message);
    this.yes.classList.toggle('danger', tone === 'danger');
    this.no.classList.toggle('main', tone === 'danger');
    this.no.classList.toggle('danger', tone === 'stop');
    this.yes.textContent = yesLabel;
    this.no.textContent = noLabel;
    this.onYes = onYes;
    this.onNo = onNo ?? null;
    this.root.hidden = false;
    this.onOpen();
  }

  close(): void {
    this.root.hidden = true;
    this.onYes = null;
    this.onNo = null;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }
}
