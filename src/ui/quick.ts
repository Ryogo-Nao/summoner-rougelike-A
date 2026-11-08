import { artElement, hasArt } from '../render/art';

/** 扇に出す1枠ぶん */
export interface QuickSlot {
  /** 絵文字。空いている枠は空 */
  emoji: string;
  /** 道具の絵の id（item_〜）。絵があれば絵文字の代わりに出す */
  art?: string;
  /** 数（例：×3、42本）。空いている枠は空 */
  label: string;
  /** 押せるか（登録していて、バッグにある） */
  enabled: boolean;
}

export interface QuickHandlers {
  /** 押してよいときだけ true（攻撃の再生中などは false） */
  canStart(): boolean;
  /** 短く押して離したとき（通常攻撃） */
  onTap(): void;
  /** 扇を出すときに、今の枠の中身を返す */
  slots(): QuickSlot[];
  /** 扇の枠の上で指を離したとき */
  onPick(slot: number): void;
}

/** 長押しで扇を出すまでの時間（ミリ秒） */
const HOLD_DELAY = 300;
/** 扇の枠の半径（px、style.css の .quick-slot と合わせる） */
const SLOT_RADIUS = 30;
/** 扇の枠の、ボタンの上端の中央からの位置（左上・上・右上） */
const SLOT_OFFSETS = [
  { x: -72, y: -62 },
  { x: 0, y: -92 },
  { x: 72, y: -62 },
];

/**
 * ［攻撃］ボタン。短く押して離すと攻撃、長押しすると上に登録した道具の扇を出し、
 * 指を滑らせて離した枠の道具を使う（requirements.md 10.2）
 */
export function setupQuick(button: HTMLElement, handlers: QuickHandlers): void {
  const fan = document.createElement('div');
  fan.id = 'quick-fan';
  fan.hidden = true;
  document.body.append(fan);
  let timer: number | undefined;
  let pointer: number | null = null;
  let open = false;
  let hover: number | null = null;

  const slotEls = () => [...fan.querySelectorAll<HTMLElement>('.quick-slot')];

  const showFan = () => {
    open = true;
    const r = button.getBoundingClientRect();
    // 扇ごと横にずらして、画面の端からはみ出さないようにする
    const reach = Math.max(...SLOT_OFFSETS.map((o) => Math.abs(o.x))) + SLOT_RADIUS + 4;
    const cx = Math.min(window.innerWidth - reach, Math.max(reach, r.left + r.width / 2));
    const top = r.top;
    fan.replaceChildren(
      ...handlers.slots().map((slot, i) => {
        const el = document.createElement('div');
        el.className = slot.enabled ? 'quick-slot' : 'quick-slot off';
        el.dataset.slot = String(i);
        const icon = document.createElement('span');
        if (slot.art && hasArt(slot.art)) icon.append(artElement(slot.art, slot.emoji, 'art item-art'));
        else icon.textContent = slot.emoji || '—';
        const label = document.createElement('small');
        label.textContent = slot.label;
        el.append(icon, label);
        el.style.left = `${cx + SLOT_OFFSETS[i].x}px`;
        el.style.top = `${top + SLOT_OFFSETS[i].y}px`;
        return el;
      }),
    );
    fan.hidden = false;
    // 扇を出している間は、まわり（マップ・ログ）を少し暗くする
    document.body.classList.add('fan-open');
  };

  const close = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pointer = null;
    open = false;
    hover = null;
    fan.hidden = true;
    document.body.classList.remove('fan-open');
    button.classList.remove('pressed');
  };

  /** 指の下の枠。押せない枠や、枠の外なら null */
  const slotAt = (x: number, y: number): number | null => {
    for (const el of slotEls()) {
      const r = el.getBoundingClientRect();
      // 指で狙いやすいよう、枠より少し広く取る
      const m = 14;
      if (x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m) {
        return el.classList.contains('off') ? null : Number(el.dataset.slot);
      }
    }
    return null;
  };

  button.addEventListener('pointerdown', (e) => {
    if (!handlers.canStart()) return;
    pointer = e.pointerId;
    button.setPointerCapture(e.pointerId);
    button.classList.add('pressed');
    timer = window.setTimeout(showFan, HOLD_DELAY);
  });
  button.addEventListener('pointermove', (e) => {
    if (!open || e.pointerId !== pointer) return;
    hover = slotAt(e.clientX, e.clientY);
    slotEls().forEach((el) => el.classList.toggle('hover', Number(el.dataset.slot) === hover));
  });
  button.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointer) return;
    const wasOpen = open;
    const picked = open ? slotAt(e.clientX, e.clientY) : null;
    close();
    if (!wasOpen) handlers.onTap();
    else if (picked !== null) handlers.onPick(picked);
  });
  button.addEventListener('pointercancel', close);
}
