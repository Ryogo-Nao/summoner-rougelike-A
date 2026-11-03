import { HAND_LIMIT, type Card } from '../game/cards';
import { BAG_LIMIT, ITEMS, type Item } from '../game/items';
import { WAREHOUSE_LIMIT, saveProfile, type Profile } from '../game/profile';
import { MAX_FLOOR, SPELLS, type SpellId } from '../game/state';
import { cardIcon, cardSub } from './screens';
import { renderRow, type SheetRow } from './sheet';

type Tab = 'cards' | 'items' | 'spells';

/**
 * 拠点画面（requirements.md 10.4）。持っていくカードを選び、バッグと倉庫の間でアイテムを出し入れして出発する。
 * 変えるたびに保存する
 */
export class BaseScreen {
  private readonly root = document.getElementById('base')!;
  private readonly body = document.getElementById('base-body')!;
  private readonly depart = document.getElementById('base-depart')!;
  private readonly tabs = [...document.querySelectorAll<HTMLButtonElement>('#base-tabs button')];
  private tab: Tab = 'cards';
  private profile: Profile | null = null;

  /** onDepart は［出発］を押したときに呼ぶ */
  constructor(onDepart: () => void) {
    this.depart.addEventListener('click', () => {
      if (this.profile && this.handCards().length > 0) onDepart();
    });
    for (const button of this.tabs) {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab as Tab;
        this.render();
      });
    }
  }

  /** message は、戻ってきたときに知らせること（失ったものなど） */
  open(profile: Profile, message?: string): void {
    this.profile = profile;
    this.message = message ?? '';
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  private message = '';

  private handCards(): Card[] {
    const p = this.profile!;
    return p.cards.filter((c) => p.hand.includes(c.id));
  }

  private change(f: () => void): void {
    f();
    saveProfile(this.profile!);
    this.render();
  }

  private render(): void {
    const p = this.profile!;
    for (const b of this.tabs) b.classList.toggle('active', b.dataset.tab === this.tab);
    const children: HTMLElement[] = [];
    if (this.message) children.push(note(this.message, 'base-message'));
    if (this.tab === 'cards') children.push(...this.cardRows(p));
    if (this.tab === 'items') children.push(...this.itemRows(p));
    if (this.tab === 'spells') children.push(...this.spellRows(p));
    this.body.replaceChildren(...children);
    const hand = this.handCards().length;
    this.depart.textContent = hand > 0 ? `ダンジョンへ出発（全${MAX_FLOOR}階）` : 'カードを1枚以上選ぶ';
    (this.depart as HTMLButtonElement).disabled = hand === 0;
  }

  private cardRows(p: Profile): HTMLElement[] {
    const hand = this.handCards().length;
    const rows: SheetRow[] = p.cards.map((card) => {
      const taking = p.hand.includes(card.id);
      return {
        icon: cardIcon(card),
        name: taking ? `${card.species.name}（持っていく）` : card.species.name,
        sub: cardSub(card, false),
        button: taking
          ? { label: '残す', onClick: () => this.change(() => (p.hand = p.hand.filter((id) => id !== card.id))) }
          : {
              label: '持っていく',
              disabled: hand >= HAND_LIMIT,
              onClick: () => this.change(() => p.hand.push(card.id)),
            },
      };
    });
    return [
      note(`持っていくカード ${hand}/${HAND_LIMIT}\n残したカードは保管庫で待つ`),
      ...rows.map(renderRow),
    ];
  }

  private itemRows(p: Profile): HTMLElement[] {
    const row = (item: Item, label: string, disabled: boolean, onClick: () => void): HTMLElement =>
      renderRow({
        icon: ITEMS[item.kind].emoji,
        name: ITEMS[item.kind].name,
        sub: ITEMS[item.kind].desc,
        button: { label, disabled, onClick: () => this.change(onClick) },
      });
    const move = (item: Item, from: Item[], to: Item[]) => {
      from.splice(from.indexOf(item), 1);
      to.push(item);
    };
    return [
      note(`バッグ ${p.bag.length}/${BAG_LIMIT}（持っていく）`, 'base-section'),
      ...p.bag.map((item) => row(item, '倉庫へ', p.warehouse.length >= WAREHOUSE_LIMIT, () => move(item, p.bag, p.warehouse))),
      note(`倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}`, 'base-section'),
      ...p.warehouse.map((item) => row(item, 'バッグへ', p.bag.length >= BAG_LIMIT, () => move(item, p.warehouse, p.bag))),
    ];
  }

  private spellRows(p: Profile): HTMLElement[] {
    const rows: SheetRow[] = [
      { icon: '🔥', name: SPELLS.fire.name, sub: `MP${SPELLS.fire.mp}　最初から使える` },
      { icon: '⚡', name: SPELLS.thunder.name, sub: `MP${SPELLS.thunder.mp}　イヅツチを召喚している間だけ` },
      ...(['power', 'guard'] as SpellId[]).map((id) => ({
        icon: id === 'power' ? '💪' : '🧱',
        name: SPELLS[id].name,
        sub: p.learned.includes(id) ? `MP${SPELLS[id].mp}　覚えている` : '魔導書を読むと覚える',
        dim: !p.learned.includes(id),
      })),
    ];
    return [note('覚えている魔法'), ...rows.map(renderRow)];
  }
}

function note(text: string, className = 'sheet-note'): HTMLElement {
  const el = document.createElement('p');
  el.className = className === 'sheet-note' ? 'sheet-note' : `sheet-note ${className}`;
  el.textContent = text;
  return el;
}
