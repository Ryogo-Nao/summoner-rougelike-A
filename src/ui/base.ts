import { HAND_LIMIT, swapInList, type Card } from '../game/cards';
import { SPECIES } from '../game/monsters';
import { ALWAYS_SOLD, buy, buyProblem, canSell, sell } from '../game/shop';
import { DUNGEONS, dungeonById, isUnlocked } from '../game/dungeons';
import { BAG_LIMIT, ITEMS, itemName, sortItems, buyPrice, sellPrice, type ItemKind, type Item } from '../game/items';
import { WAREHOUSE_LIMIT, saveProfile, type Profile } from '../game/profile';
import { PLAYER_BASE, SPELLS, guardRate, powerRate, rankedName, type SpellId } from '../game/state';
import { SPELL_ICONS, cardIcon, cardSub, reorderRows } from './screens';
import { renderRow, wideButton, type SheetRow } from './sheet';
import { statusView } from './status';
import { artElement } from '../render/art';

type Tab = 'cards' | 'bag' | 'warehouse' | 'status' | 'shop';

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
  /** カードの並べ替え中か。picked は入れ替える1枚目 */
  private reordering = false;
  /** 商店で、買う画面か売る画面か。売る画面で選んでいる道具 */
  private shopMode: 'buy' | 'sell' = 'buy';
  private sellFrom: 'bag' | 'warehouse' = 'bag';
  /** 売る数（まとめた道具の key ごと） */
  private sellCount = new Map<string, number>();
  /** 商店で最後にしたこと（「薬草を買った」など） */
  private shopNote = '';
  private picked: Card | null = null;
  /** 最後に押した並べ替えのボタンと、その向き（desc なら降順）。手で入れ替えたら消す */
  private cardSort: { key: CardSortKey; desc: boolean } | null = null;
  /** つよさ・袋の中・ダンジョンの一覧を開く前の、一覧のスクロールの位置。戻ったときにそこへ戻す */
  private listScroll = 0;
  private readonly onDepart: (dungeonId: string) => void;

  /** onDepart は、ダンジョンを選んで［出発］を押したときに呼ぶ */
  constructor(onDepart: (dungeonId: string) => void) {
    this.onDepart = onDepart;
    this.depart.addEventListener('click', () => {
      if (!this.profile || this.handCards().length === 0) return;
      if (this.choosing) this.leave(() => (this.choosing = false));
      else this.enter(() => (this.choosing = true));
    });
    for (const button of this.tabs) {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab as Tab;
        this.sellCount.clear();
        this.shopNote = '';
        this.viewing = null;
        this.pouch = null;
        this.choosing = false;
        this.render();
      });
    }
  }

  /** 戻ってきたときの知らせ（失ったものなど）は、終わりの知らせの窓で出すので、拠点には出さない */
  open(profile: Profile): void {
    this.profile = profile;
    this.viewing = null;
    this.pouch = null;
    this.choosing = false;
    this.root.hidden = false;
    this.render();
  }

  /** 一覧からつよさなどの画面へ移る。一覧のスクロールの位置を覚えておく */
  private enter(f: () => void): void {
    this.listScroll = this.body.scrollTop;
    f();
    this.render();
  }

  /** つよさなどの画面から一覧へ戻る。覚えておいたスクロールの位置へ戻す */
  private leave(f: () => void): void {
    f();
    this.render();
    this.body.scrollTop = this.listScroll;
  }

  close(): void {
    this.root.hidden = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }


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
        wideButton('戻る', false, () => this.leave(() => (this.viewing = null))),
      );
    } else if (this.pouch) {
      children.push(...this.pouchRows(p, this.pouch));
    } else {
      if (this.tab === 'cards') children.push(...this.cardRows(p));
      if (this.tab === 'bag') children.push(...this.bagRows(p));
      if (this.tab === 'warehouse') children.push(...this.warehouseRows(p));
      if (this.tab === 'status') children.push(...this.statusRows(p));
      if (this.tab === 'shop') children.push(...this.shopRows(p));
    }
    document.getElementById('base-runes')!.textContent = `💠 ${p.runes}ルーン`;
    this.body.replaceChildren(...children);
    this.body.scrollTop = keepScroll ? scroll : 0;
    const hand = this.handCards().length;
    this.depart.textContent = hand === 0 ? 'カードを1枚以上選ぶ' : this.choosing ? '準備に戻る' : 'ダンジョンに向かう';
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
    const toggle = document.createElement('div');
    toggle.className = 'base-sort';
    // 並べ替えのボタン。1回目は昇順（↑）、同じボタンをもう一度押すと降順（↓）
    const sorts = document.createElement('div');
    sorts.className = 'sort-keys';
    for (const key of CARD_SORT_KEYS) {
      const on = this.cardSort?.key === key;
      const b = wideButton(`${CARD_SORT_LABEL[key]}${on ? (this.cardSort!.desc ? ' ↓' : ' ↑') : ''}`, this.reordering, () => {
        const desc = on ? !this.cardSort!.desc : false;
        this.cardSort = { key, desc };
        this.change(() => (p.cards = sortCards(p.cards, key, desc)));
      });
      if (on) b.classList.add('on');
      sorts.append(b);
    }
    toggle.append(
      sorts,
      wideButton(this.reordering ? '入れ替えを終える' : '手で入れ替える', p.cards.length < 2, () => {
        this.reordering = !this.reordering;
        this.picked = null;
        this.render(true);
      }),
    );
    if (this.reordering) {
      const rows = reorderRows(p.cards, this.picked, (card) => {
        if (!this.picked) this.picked = card;
        else {
          if (this.picked !== card) {
            swapInList(p.cards, this.picked, card);
            this.cardSort = null;
          }
          this.picked = null;
        }
        this.change(() => {});
      });
      return [
        note('入れ替えるカードを2枚続けて押す\n連れていくときも この順に並ぶ'),
        toggle,
        ...rows.map(renderRow),
      ];
    }
    const rows: SheetRow[] = p.cards.map((card) => {
      const taking = p.hand.includes(card.id);
      return {
        icon: cardIcon(card),
        art: card.species.id,
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
        onSelect: () => this.enter(() => (this.viewing = card)),
      };
    });
    return [
      note(`連れていく仲間 ${hand}/${HAND_LIMIT}（緑のカード）`),
      toggle,
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
    const rows = groupItems(p.warehouse).map((g) => {
      const first = g.items[0];
      // 矢は本数を足して出す
      const name = ITEMS[first.kind].arrow
        ? `${ITEMS[first.kind].name}（${g.items.reduce((n, i) => n + (i.count ?? 0), 0)}本）`
        : `${g.name}${g.items.length > 1 ? ` ×${g.items.length}` : ''}`;
      return this.itemRow(first, 'バッグへ', p.bag.length >= BAG_LIMIT, () => move(first, p.warehouse, p.bag), name);
    });
    return [
      note(`倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}　バッグ ${p.bag.length}/${BAG_LIMIT}`),
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
      onSelect: pouch ? () => this.enter(() => (this.pouch = item)) : undefined,
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
      wideButton('戻る', false, () => this.leave(() => (this.pouch = null))),
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

  /**
   * 商店（requirements.md 10.5）。買う：薬草とパンはいつでも、ほかの品は戻るたびに入れ替わる。
   * 売る：バッグと倉庫の道具を押して選び、まとめて売る（売り値は買い値の3分の1）
   */
  private shopRows(p: Profile): HTMLElement[] {
    const head = document.createElement('div');
    head.className = 'base-sort';
    const modes = document.createElement('div');
    modes.className = 'sort-keys shop-modes';
    for (const [mode, label] of [['buy', '買う'], ['sell', '売る']] as const) {
      const b = wideButton(label, false, () => {
        this.shopMode = mode;
        this.sellCount.clear();
        this.shopNote = '';
        this.render();
      });
      if (this.shopMode === mode) b.classList.add('on');
      modes.append(b);
    }
    head.append(modes);
    const done = this.shopNote ? [note(this.shopNote, 'base-section')] : [];
    if (this.shopMode === 'buy') {
      const row = (kind: ItemKind, left?: string): HTMLElement => {
        const problem = buyProblem(p, kind);
        return renderRow({
          icon: ITEMS[kind].emoji,
          name: `${ITEMS[kind].name}　💠${buyPrice(kind)}`,
          sub: left ? `${ITEMS[kind].desc}\n${left}` : ITEMS[kind].desc,
          dim: problem !== null,
          button: {
            label: '買う',
            disabled: problem !== null,
            onClick: () =>
              this.change(() => {
                const where = buy(p, kind);
                this.shopNote = where ? `${ITEMS[kind].name}を買った（${where === 'bag' ? 'バッグ' : '倉庫'}へ）` : '';
              }),
          },
        });
      };
      return [
        head,
        ...done,
        note('いつでも買える', 'base-section'),
        ...ALWAYS_SOLD.map((k) => row(k)),
        note('今日の品（ダンジョンから戻ると入れ替わる）', 'base-section'),
        ...(p.shopStock.length > 0 ? p.shopStock.map((k) => row(k, '残り1つ')) : [note('売り切れ')]),
        note('買った物はバッグへ入る（いっぱいなら倉庫へ）'),
      ];
    }
    // 売る：バッグと倉庫を切り替え、同じ道具はまとめて、売る数を［－］［＋］で選ぶ
    const from = this.sellFrom === 'bag' ? p.bag : p.warehouse;
    const groups = groupItems(from, true);
    const picked = groups.flatMap((g) => g.items.slice(0, this.sellCount.get(g.key) ?? 0));
    const total = picked.reduce((n, i) => n + sellPrice(i), 0);
    const places = document.createElement('div');
    places.className = 'sort-keys shop-modes';
    for (const [place, label, list] of [
      ['bag', 'バッグから売る', p.bag],
      ['warehouse', '倉庫から売る', p.warehouse],
    ] as const) {
      const b = wideButton(`${label}（${list.length}）`, false, () => {
        this.sellFrom = place;
        this.sellCount.clear();
        this.render();
      });
      if (this.sellFrom === place) b.classList.add('on');
      places.append(b);
    }
    const sellButton = wideButton(
      picked.length > 0 ? `${picked.length}個を売る（💠${total}）` : '売る数を選ぶ',
      picked.length === 0,
      () =>
        this.change(() => {
          const got = sell(p, picked);
          this.sellCount.clear();
          this.shopNote = `${picked.length}個を売って ${got}ルーンを得た`;
        }),
    );
    sellButton.classList.add('main');
    head.append(places, sellButton);
    const sellRow = (g: ItemGroup): HTMLElement => {
      const first = g.items[0];
      const ok = canSell(first);
      const n = this.sellCount.get(g.key) ?? 0;
      const set = (v: number) => {
        this.sellCount.set(g.key, Math.max(0, Math.min(g.items.length, v)));
        this.render(true);
      };
      const why = ITEMS[first.kind].pouch && (first.contents?.length ?? 0) > 0 ? '中の道具を出すと売れる' : '売れない';
      const count = g.items.length > 1 ? `　×${g.items.length}` : '';
      const row = renderRow({
        icon: ITEMS[first.kind].emoji,
        name: `${g.name}${count}`,
        sub: ok ? `${first.count !== undefined ? '1束' : '1つ'} 💠${sellPrice(first)}` : why,
        dim: !ok,
        className: n > 0 ? 'chosen' : undefined,
      });
      if (ok) row.append(stepper(n, g.items.length, set));
      return row;
    };
    return [
      head,
      ...done,
      ...(groups.length > 0 ? groups.map(sellRow) : [note(this.sellFrom === 'bag' ? 'バッグは空' : '倉庫は空')]),
    ];
  }

  /**
   * 主人公のつよさ（requirements.md 10.4.2）。ダンジョンに入るときの能力、覚えている魔法、
   * ダンジョンごとの戦績、これまでの累積
   */
  private statusRows(p: Profile): HTMLElement[] {
    const portrait = document.createElement('div');
    portrait.className = 'status-portrait';
    portrait.append(artElement('player', '🧙', 'status-art'));
    const title = note('召喚士', 'status-title');
    const b = PLAYER_BASE;
    const r = p.records;
    const dungeonRows = DUNGEONS.filter((d) => r.dungeons[d.id] || isUnlocked(d, p.cleared)).map((d) => {
      const rec = r.dungeons[d.id];
      return renderRow({
        icon: p.cleared.includes(d.id) ? '🏆' : '🚪',
        name: d.name,
        sub: rec
          ? `挑戦${rec.tries}回　踏破${rec.cleared}　離脱${rec.escaped}\n力つきた${rec.failed}　あきらめた${rec.gaveUp}\n最高到達 B${rec.bestFloor}F（全${d.floors}階）`
          : 'まだ挑んでいない',
      });
    });
    const runs = Object.values(r.dungeons).reduce((n, d) => n + d.tries, 0);
    return [
      portrait,
      title,
      note('ダンジョンに入るときの能力', 'base-section'),
      table([
        ['レベル', '1（ダンジョンの中で上がる）'],
        ['HP', `${b.hp}`],
        ['MP', `${b.mp}`],
        ['攻撃力', `${b.atk}`],
        ['防御力', `${b.def}`],
        ['満腹度', `${b.food}`],
      ]),
      note('覚えている魔法', 'base-section'),
      ...this.spellRows(p),
      note('戦績', 'base-section'),
      ...dungeonRows,
      note('累積', 'base-section'),
      table([
        ['潜った回数', `${runs}回`],
        ['歩いたターン', `${r.turns}`],
        ['たおした魔物', `${r.kills}体`],
        ['手に入れたカード', `${r.cards}枚`],
        ['拾った道具', `${r.items}個`],
        ['拾ったルーン', `${r.runes}`],
        ['最高レベル', `Lv${r.bestLevel}`],
        ['仲間の数', `${p.cards.length}体`],
        ['持っているルーン', `${p.runes}`],
      ]),
    ];
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
    return rows.map(renderRow);
  }
}

/** 同じ道具をまとめたもの。key で見分ける */
interface ItemGroup {
  key: string;
  name: string;
  items: Item[];
}

/**
 * 同じ道具をまとめる（倉庫の一覧と、商店で売るとき）。＋の違う装備、入る数の違う袋、中身のある袋は分ける。
 * splitArrows なら、矢は1束ずつ本数（売り値）が違うので、束ごとに分ける
 */
function groupItems(items: Item[], splitArrows = false): ItemGroup[] {
  const groups = new Map<string, ItemGroup>();
  for (const item of items) {
    const key =
      item.contents?.length || (splitArrows && item.count !== undefined)
        ? `#${item.id}`
        : `${item.kind}:${item.plus ?? 0}:${item.capacity ?? 0}`;
    const g = groups.get(key);
    if (g) g.items.push(item);
    else groups.set(key, { key, name: itemName(item), items: [item] });
  }
  return [...groups.values()];
}

/** 売る数を選ぶ［－］数［＋］。0〜max */
function stepper(value: number, max: number, onChange: (v: number) => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'stepper';
  const minus = document.createElement('button');
  minus.textContent = '－';
  minus.disabled = value <= 0;
  minus.addEventListener('click', () => onChange(value - 1));
  const num = document.createElement('span');
  num.textContent = `${value}`;
  const plus = document.createElement('button');
  plus.textContent = '＋';
  plus.disabled = value >= max;
  plus.addEventListener('click', () => onChange(value + 1));
  box.append(minus, num, plus);
  return box;
}

/** 名前と値を2列に並べた表 */
function table(rows: [string, string][]): HTMLElement {
  const dl = document.createElement('dl');
  dl.className = 'status-table base-table';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  return dl;
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

type CardSortKey = 'level' | 'obtained' | 'name' | 'kind';
const CARD_SORT_KEYS: CardSortKey[] = ['level', 'obtained', 'name', 'kind'];
const CARD_SORT_LABEL: Record<CardSortKey, string> = { level: 'レベル', obtained: '入手', name: '名前', kind: '種類' };

/**
 * カードを並べ替える（昇順。desc なら逆にする）。
 * 入手順はカードの番号（手に入れた順に増える）、種類順は魔物の図鑑の順。同じなら入手順にする
 */
function sortCards(cards: Card[], key: CardSortKey, desc: boolean): Card[] {
  const kind = (c: Card) => {
    const i = SPECIES.findIndex((s) => s.id === c.species.id);
    // 相棒は図鑑にいないので、いちばん前にする
    return i < 0 ? -1 : i;
  };
  const by: Record<CardSortKey, (a: Card, b: Card) => number> = {
    level: (a, b) => a.level - b.level,
    obtained: () => 0,
    name: (a, b) => a.species.name.localeCompare(b.species.name, 'ja'),
    kind: (a, b) => kind(a) - kind(b),
  };
  const sign = desc ? -1 : 1;
  return [...cards].sort((a, b) => sign * (by[key](a, b) || a.id - b.id));
}
