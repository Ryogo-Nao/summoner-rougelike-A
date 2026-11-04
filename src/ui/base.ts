import { HAND_LIMIT, type Card } from '../game/cards';
import { DUNGEONS, dungeonById, isUnlocked } from '../game/dungeons';
import { BAG_LIMIT, ITEMS, itemName, sortItems, type Item } from '../game/items';
import { WAREHOUSE_LIMIT, saveProfile, type Profile } from '../game/profile';
import { SPELLS, guardRate, powerRate, rankedName, type SpellId } from '../game/state';
import { SPELL_ICONS, cardIcon, cardSub } from './screens';
import { renderRow, wideButton, type SheetRow } from './sheet';
import { statusView } from './status';

type Tab = 'cards' | 'bag' | 'warehouse' | 'spells';

/**
 * 拠点画面（requirements.md 10.4）。連れていく仲間を選び、バッグと倉庫の間でアイテムを出し入れして出発する。
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
  /** 中を見ている袋（バッグか倉庫にある）。null なら一覧を出す */
  private pouch: Item | null = null;
  /** ダンジョンを選んでいるところ */
  private choosing = false;
  private readonly onDepart: (dungeonId: string) => void;

  /** onDepart は、ダンジョンを選んで［出発］を押したときに呼ぶ */
  constructor(onDepart: (dungeonId: string) => void) {
    this.onDepart = onDepart;
    this.depart.addEventListener('click', () => {
      if (!this.profile || this.handCards().length === 0) return;
      this.choosing = !this.choosing;
      this.viewing = null;
      this.pouch = null;
      this.render();
    });
    for (const button of this.tabs) {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab as Tab;
        this.viewing = null;
        this.pouch = null;
        this.choosing = false;
        this.render();
      });
    }
  }

  /** message は、戻ってきたときに知らせること（失ったものなど） */
  open(profile: Profile, message?: string): void {
    this.profile = profile;
    this.message = message ?? '';
    this.viewing = null;
    this.pouch = null;
    this.choosing = false;
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

  /** 中身を変えて保存する。一覧のスクロールの位置はそのままにする */
  private change(f: () => void): void {
    f();
    saveProfile(this.profile!);
    this.render(true);
  }

  /** keepScroll なら一覧のスクロールの位置を保つ。画面を切り替えたときは一番上に戻す */
  private render(keepScroll = false): void {
    const p = this.profile!;
    const scroll = this.body.scrollTop;
    for (const b of this.tabs) b.classList.toggle('active', b.dataset.tab === this.tab);
    const children: HTMLElement[] = [];
    if (this.choosing) {
      children.push(...this.dungeonRows(p));
    } else if (this.viewing) {
      // 仲間のつよさ。［戻る］でカードの一覧へ
      children.push(
        statusView(this.viewing),
        wideButton('戻る', false, () => {
          this.viewing = null;
          this.render();
        }),
      );
    } else if (this.pouch) {
      children.push(...this.pouchRows(p, this.pouch));
    } else {
      if (this.message) children.push(note(this.message, 'base-message'));
      if (this.tab === 'cards') children.push(...this.cardRows(p));
      if (this.tab === 'bag') children.push(...this.bagRows(p));
      if (this.tab === 'warehouse') children.push(...this.warehouseRows(p));
      if (this.tab === 'spells') children.push(...this.spellRows(p));
    }
    this.body.replaceChildren(...children);
    this.body.scrollTop = keepScroll ? scroll : 0;
    const hand = this.handCards().length;
    this.depart.textContent = hand === 0 ? 'カードを1枚以上選ぶ' : this.choosing ? '準備に戻る' : 'ダンジョンを選ぶ';
    (this.depart as HTMLButtonElement).disabled = hand === 0;
  }

  /** ダンジョンを選ぶ。踏破していないダンジョンの次は、鍵がかかっている */
  private dungeonRows(p: Profile): HTMLElement[] {
    const rows: SheetRow[] = DUNGEONS.map((d) => {
      const open = isUnlocked(d, p.cleared);
      const done = p.cleared.includes(d.id) ? '（踏破済み）' : '';
      return {
        icon: open ? (done ? '🏆' : '🚪') : '🔒',
        name: `${d.name}${done}`,
        sub: open ? d.desc : `${dungeonById(d.requires ?? '').name}を踏破すると挑める`,
        dim: !open,
        button: { label: '出発', disabled: !open, onClick: () => this.onDepart(d.id) },
      };
    });
    return [note('挑むダンジョンを選ぶ'), ...rows.map(renderRow)];
  }

  private cardRows(p: Profile): HTMLElement[] {
    const hand = this.handCards().length;
    const rows: SheetRow[] = p.cards.map((card) => {
      const taking = p.hand.includes(card.id);
      return {
        icon: cardIcon(card),
        name: card.species.name,
        sub: cardSub(card, false),
        className: taking ? 'taking' : undefined,
        button: taking
          ? { label: '残す', onClick: () => this.change(() => (p.hand = p.hand.filter((id) => id !== card.id))) }
          : {
              label: '連れていく',
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
      note(`連れていく仲間 ${hand}/${HAND_LIMIT}（緑のカード）\n残した仲間は保管庫で待つ\nカードを押すとつよさを見る`),
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
  /**
   * 倉庫。同じ道具は1行にまとめて数を出す（＋の違う装備、入る数の違う袋、中身のある袋は分ける）。
   * ［バッグへ］で1つずつ出す
   */
  private warehouseRows(p: Profile): HTMLElement[] {
    const groups = new Map<string, Item[]>();
    for (const item of p.warehouse) {
      const key = item.contents?.length ? `#${item.id}` : `${item.kind}:${item.plus ?? 0}:${item.capacity ?? 0}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    const rows = [...groups.values()].map((items) => {
      const first = items[0];
      const def = ITEMS[first.kind];
      // 矢は本数を足して出す
      const name = def.arrow
        ? `${def.name}（${items.reduce((n, i) => n + (i.count ?? 0), 0)}本）`
        : `${itemName(first)}${items.length > 1 ? ` ×${items.length}` : ''}`;
      return this.itemRow(first, 'バッグへ', p.bag.length >= BAG_LIMIT, () => move(first, p.warehouse, p.bag), name);
    });
    return [
      note(`倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}　バッグ ${p.bag.length}/${BAG_LIMIT}\n同じ道具はまとめて出す`),
      this.sortButtons((by) => (p.warehouse = sortItems(p.warehouse, by))),
      ...rows,
    ];
  }

  private itemRow(item: Item, label: string, disabled: boolean, onClick: () => void, name = itemName(item)): HTMLElement {
    const pouch = ITEMS[item.kind].pouch !== undefined;
    return renderRow({
      icon: ITEMS[item.kind].emoji,
      name,
      sub: pouch ? `${ITEMS[item.kind].desc}\n押すと中を見る` : ITEMS[item.kind].desc,
      button: { label, disabled, onClick: () => this.change(onClick) },
      onSelect: pouch
        ? () => {
            this.pouch = item;
            this.render();
          }
        : undefined,
    });
  }

  /** 袋の中。［出す］でバッグへ、バッグの道具は［しまう］で袋へ */
  private pouchRows(p: Profile, pouch: Item): HTMLElement[] {
    const contents = pouch.contents ?? [];
    const room = contents.length < (pouch.capacity ?? 0);
    const holy = ITEMS[pouch.kind].pouch?.holy ? '\n力つきても中の道具は失わない' : '';
    return [
      note(`${ITEMS[pouch.kind].emoji} ${itemName(pouch)}${holy}`, 'base-section'),
      ...contents.map((item) =>
        this.itemRow(item, 'バッグへ', p.bag.length >= BAG_LIMIT, () => {
          pouch.contents = contents.filter((i) => i !== item);
          p.bag.push(item);
        }),
      ),
      note('バッグからしまう', 'base-section'),
      ...p.bag
        .filter((i) => i !== pouch && !ITEMS[i.kind].pouch)
        .map((item) => this.itemRow(item, 'しまう', !room, () => move(item, p.bag, contents))),
      wideButton('戻る', false, () => {
        this.pouch = null;
        this.render();
      }),
    ];
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
    // 覚えている魔法だけを出す。仲間を召喚している間だけ使える魔法と、まだ読んでいない魔導書の魔法は出さない
    const rows: SheetRow[] = [
      { icon: SPELL_ICONS.fire, name: SPELLS.fire.name, sub: `MP${SPELLS.fire.mp}　最初から使える` },
      ...(['power', 'guard'] as SpellId[])
        .filter((id) => p.learned.includes(id))
        .map((id) => {
          const rank = p.ranks[id] ?? 0;
          const effect = id === 'power' ? `攻撃力×${powerRate(rank)}` : `受けるダメージ×${guardRate(rank)}`;
          return {
            icon: SPELL_ICONS[id],
            name: rankedName(SPELLS[id].name, rank),
            sub: `MP${SPELLS[id].mp}　${effect}\n魔導書を読むとランクが上がる（最大+5）`,
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
