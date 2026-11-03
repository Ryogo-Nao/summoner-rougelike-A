import { HAND_LIMIT, type Card } from '../game/cards';
import { BAG_LIMIT, ITEMS, sortItems, type Item } from '../game/items';
import { WAREHOUSE_LIMIT, saveProfile, type Profile } from '../game/profile';
import { MAX_FLOOR, SPELLS, guardRate, powerRate, rankedName, type SpellId } from '../game/state';
import { SPELL_ICONS, cardIcon, cardSub } from './screens';
import { renderRow, wideButton, type SheetRow } from './sheet';
import { statusView } from './status';

type Tab = 'cards' | 'bag' | 'warehouse' | 'spells';

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
  /** つよさを見ているカード。null なら一覧を出す */
  private viewing: Card | null = null;

  /** onDepart は［出発］を押したときに呼ぶ */
  constructor(onDepart: () => void) {
    this.depart.addEventListener('click', () => {
      if (this.profile && this.handCards().length > 0) onDepart();
    });
    for (const button of this.tabs) {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab as Tab;
        this.viewing = null;
        this.render();
      });
    }
  }

  /** message は、戻ってきたときに知らせること（失ったものなど） */
  open(profile: Profile, message?: string): void {
    this.profile = profile;
    this.message = message ?? '';
    this.viewing = null;
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
    if (this.viewing) {
      // 仲間のつよさ。［戻る］でカードの一覧へ
      children.push(
        statusView(this.viewing),
        wideButton('戻る', false, () => {
          this.viewing = null;
          this.render();
        }),
      );
    } else {
      if (this.message) children.push(note(this.message, 'base-message'));
      if (this.tab === 'cards') children.push(...this.cardRows(p));
      if (this.tab === 'bag') children.push(...this.bagRows(p));
      if (this.tab === 'warehouse') children.push(...this.warehouseRows(p));
      if (this.tab === 'spells') children.push(...this.spellRows(p));
    }
    this.body.replaceChildren(...children);
    this.body.scrollTop = 0;
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
        onSelect: () => {
          this.viewing = card;
          this.render();
        },
      };
    });
    return [
      note(`持っていくカード ${hand}/${HAND_LIMIT}\n残したカードは保管庫で待つ\nカードを押すとつよさを見る`),
      ...rows.map(renderRow),
    ];
  }

  /** バッグ（持っていくアイテム）。倉庫へしまえる */
  private bagRows(p: Profile): HTMLElement[] {
    return [
      note(`バッグ ${p.bag.length}/${BAG_LIMIT}（持っていく）　倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}`),
      this.sortButtons((by) => (p.bag = sortItems(p.bag, by))),
      ...p.bag.map((item) =>
        this.itemRow(item, '倉庫へ', p.warehouse.length >= WAREHOUSE_LIMIT, () => move(item, p.bag, p.warehouse)),
      ),
    ];
  }

  /** 倉庫。バッグへ出せる */
  private warehouseRows(p: Profile): HTMLElement[] {
    return [
      note(`倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}　バッグ ${p.bag.length}/${BAG_LIMIT}`),
      this.sortButtons((by) => (p.warehouse = sortItems(p.warehouse, by))),
      ...p.warehouse.map((item) =>
        this.itemRow(item, 'バッグへ', p.bag.length >= BAG_LIMIT, () => move(item, p.warehouse, p.bag)),
      ),
    ];
  }

  private itemRow(item: Item, label: string, disabled: boolean, onClick: () => void): HTMLElement {
    return renderRow({
      icon: ITEMS[item.kind].emoji,
      name: ITEMS[item.kind].name,
      sub: ITEMS[item.kind].desc,
      button: { label, disabled, onClick: () => this.change(onClick) },
    });
  }

  private sortButtons(sort: (by: 'kind' | 'name') => void): HTMLElement {
    const pair = document.createElement('div');
    pair.className = 'sheet-pair base-sort';
    pair.append(
      wideButton('種類順に並べる', false, () => this.change(() => sort('kind'))),
      wideButton('名前順に並べる', false, () => this.change(() => sort('name'))),
    );
    return pair;
  }

  private spellRows(p: Profile): HTMLElement[] {
    const rows: SheetRow[] = [
      { icon: '🔥', name: SPELLS.fire.name, sub: `MP${SPELLS.fire.mp}　最初から使える` },
      { icon: '⚡', name: SPELLS.thunder.name, sub: `MP${SPELLS.thunder.mp}　イヅツチを召喚している間だけ` },
      { icon: '☄️', name: SPELLS.bigFire.name, sub: `MP${SPELLS.bigFire.mp}　ヒダマリを召喚している間だけ` },
      ...(['power', 'guard'] as SpellId[]).map((id) => {
        const rank = p.ranks[id] ?? 0;
        const effect = id === 'power' ? `攻撃力×${powerRate(rank)}` : `受けるダメージ×${guardRate(rank)}`;
        return {
          icon: SPELL_ICONS[id],
          name: rankedName(SPELLS[id].name, rank),
          sub: p.learned.includes(id) ? `MP${SPELLS[id].mp}　${effect}\n魔導書を読むとランクが上がる（最大+5）` : '魔導書を読むと覚える',
          dim: !p.learned.includes(id),
        };
      }),
    ];
    return [note('覚えている魔法'), ...rows.map(renderRow)];
  }
}

function move(item: Item, from: Item[], to: Item[]): void {
  from.splice(from.indexOf(item), 1);
  to.push(item);
}

function note(text: string, className = 'sheet-note'): HTMLElement {
  const el = document.createElement('p');
  el.className = className === 'sheet-note' ? 'sheet-note' : `sheet-note ${className}`;
  el.textContent = text;
  return el;
}
