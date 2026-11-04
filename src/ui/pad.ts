import type { Dir } from '../game/dir';

export interface PadHandlers {
  /** repeat は押し続けて2歩目以降のとき（ダッシュ）。false を返すと、指を離すまで止まる */
  onMove(dir: Dir, repeat: boolean): boolean | void;
  onWait(): void;
}

/** 押し続けたときにダッシュを始めるまでの時間と、1歩の間隔（ミリ秒） */
const REPEAT_DELAY = 280;
const REPEAT_INTERVAL = 70;

export interface Pad {
  /** 押している状態を解除し、連続移動を止める。指を離すまで次の入力は受け付けない */
  release(): void;
}

/**
 * バーチャルパッド。押した瞬間に1回動き、押し続けるとダッシュする（止まるところは main が決める）。
 * 指を滑らせると、指の下のボタンに切り替わる。
 */
export function setupPad(pad: HTMLElement, handlers: PadHandlers): Pad {
  let current: HTMLElement | null = null;
  let timer: number | undefined;

  const fire = (button: HTMLElement, repeat: boolean): boolean => {
    const d = button.dataset.dir;
    if (d === 'wait') handlers.onWait();
    else if (d !== undefined) return handlers.onMove(Number(d) as Dir, repeat) !== false;
    return true;
  };

  const stopRepeat = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const press = (button: HTMLElement | null) => {
    if (button === current) return;
    current?.classList.remove('pressed');
    stopRepeat();
    current = button;
    if (!button) return;
    button.classList.add('pressed');
    fire(button, false);
    // 足踏みは連続させない。動いた結果ダイアログが開いて release() されたときも続けない
    if (button.dataset.dir === 'wait' || current !== button) return;
    const repeat = () => {
      const keepGoing = fire(button, true);
      if (keepGoing && current === button) timer = window.setTimeout(repeat, REPEAT_INTERVAL);
    };
    timer = window.setTimeout(repeat, REPEAT_DELAY);
  };

  const buttonAt = (x: number, y: number): HTMLElement | null => {
    const el = document.elementFromPoint(x, y);
    return el instanceof HTMLElement && el.parentElement === pad && el.dataset.dir ? el : null;
  };

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    press(buttonAt(e.clientX, e.clientY));
  });
  pad.addEventListener('pointermove', (e) => {
    if (current) press(buttonAt(e.clientX, e.clientY));
  });
  const release = () => press(null);
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  // ダイアログが前に出たときなど、指を離した知らせが来ないことがある
  pad.addEventListener('lostpointercapture', release);
  return { release };
}
