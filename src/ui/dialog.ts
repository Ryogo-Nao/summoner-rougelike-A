import { setRichText } from './icons';

export type DialogTone = 'plain' | 'confirm';

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
   * confirm は確かめ（階段を降りる・あきらめる・配合する・転生する）。どの確かめもダンジョンの詳しい画面と同じで、
   * 左の［はい］（取り消せない操作）は主役の空色、右の［いいえ］（やめる）は赤（2026-11-11）
   */
  open(message: string, yesLabel: string, noLabel: string, onYes: () => void, onNo?: () => void, tone: DialogTone = 'plain'): void {
    setRichText(this.text, message);
    this.no.classList.toggle('danger', tone === 'confirm');
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
