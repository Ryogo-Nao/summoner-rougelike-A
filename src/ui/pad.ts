import type { Dir } from '../game/dir';

export interface PadHandlers {
  onMove(dir: Dir): void;
  onWait(): void;
}

/** 押し続けたときに連続で動き出すまでの時間と、その間隔（ミリ秒） */
const REPEAT_DELAY = 280;
const REPEAT_INTERVAL = 110;

/**
 * バーチャルパッド。押した瞬間に1回動き、押し続けると連続で動く。
 * 指を滑らせると、指の下のボタンに切り替わる。
 */
export function setupPad(pad: HTMLElement, handlers: PadHandlers): void {
  let current: HTMLElement | null = null;
  let timer: number | undefined;

  const fire = (button: HTMLElement) => {
    const d = button.dataset.dir;
    if (d === 'wait') handlers.onWait();
    else if (d !== undefined) handlers.onMove(Number(d) as Dir);
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
    fire(button);
    // 足踏みは連続させない
    if (button.dataset.dir === 'wait') return;
    const repeat = () => {
      fire(button);
      timer = window.setTimeout(repeat, REPEAT_INTERVAL);
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
}
