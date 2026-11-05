import { HAND_LIMIT, PERSONALITIES, type Card } from '../game/cards';
import { SPECIES } from '../game/monsters';
import { ALWAYS_SOLD, buy, canSell, sell } from '../game/shop';
import { DUNGEONS, dungeonById, isUnlocked } from '../game/dungeons';
import { BAG_LIMIT, ITEMS, itemName, sortItems, buyPrice, sellPrice, type ItemKind, type Item } from '../game/items';
import { WAREHOUSE_LIMIT, generationName, saveProfile, type Profile } from '../game/profile';
import { PLAYER_BASE, SPELLS, guardRate, powerRate, rankedName, type SpellId } from '../game/state';
import { SPELL_ICONS, cardIcon } from './screens';
import { renderRow, wideButton, type SheetRow } from './sheet';
import { statusView } from './status';
import { artElement, faceElement } from '../render/art';

/** 拠点のトップと、そこから移る3つの画面 */
type View = 'hub' | 'prep' | 'shop' | 'records';
/** 冒険の準備のタブ */
type Tab = 'cards' | 'items';
/** 道具を置く場所 */
type Place = 'bag' | 'warehouse';

const VIEW_TITLE: Record<View, string> = { hub: '🏠 拠点', prep: '冒険の準備', shop: '商店', records: '記録' };

/**
 * 拠点画面（requirements.md 10.4）。トップで目的を選ぶ。
 * 冒険の準備：連れていく仲間を選び、バッグと倉庫の間でアイテムを出し入れして出発する。商店：売り買い。記録：つよさと戦績。
 * 変えるたびに保存する
 */
export class BaseScreen {
  private readonly root = document.getElementById('base')!;
  private readonly body = document.getElementById('base-body')!;
  private readonly depart = document.getElementById('base-depart')!;
  private readonly tabs = [...document.querySelectorAll<HTMLButtonElement>('#base-tabs button')];
  private readonly tabBar = document.getElementById('base-tabs')!;
  private readonly back = document.getElementById('base-back')!;
  private readonly title = document.getElementById('base-title')!;
  private view: View = 'hub';
  private tab: Tab = 'cards';
  /** 持ち物のタブで、バッグを見ているか倉庫を見ているか */
  private itemPlace: Place = 'bag';
  /** 持ち物の並べ方 */
  private itemSort: ItemSortKey = 'kind';
  private profile: Profile | null = null;
  /** つよさを見ているカード。null なら一覧を出す */
  private viewing: Card | null = null;
  /** 中を見ている袋（バッグか倉庫にある）。null なら一覧を出す */
  private pouch: Item | null = null;
  /** ダンジョンを選んでいるところ */
  private choosing = false;
  /** 商店で、買う画面か売る画面か。売る画面で選んでいる道具 */
  private shopMode: 'buy' | 'sell' = 'buy';
  private sellFrom: Place = 'bag';
  /** 売る数（まとめた道具の key ごと） */
  private sellCount = new Map<string, number>();
  /** 商店で最後にしたこと（「薬草を買った」など） */
  private shopNote = '';
  /** 買う数（品ごと）と、買った物の送り先 */
  private buyCount = new Map<ItemKind, number>();
  private buyTo: Place = 'bag';
  /** 打ち込んだ数が多すぎた行。その行に「n個まで…」を赤で出す */
  private countError: string | null = null;
  /** 最後に押した並べ替えのボタンと、その向き（desc なら降順） */
  private cardSort: { key: CardSortKey; desc: boolean } | null = null;
  /** つよさ・袋の中・ダンジョンの一覧を開く前の、一覧のスクロールの位置。戻ったときにそこへ戻す */
  private listScroll = 0;
  private readonly onDepart: (dungeonId: string) => void;

  /** onDepart は、ダンジョンを選んで［出発］を押したときに呼ぶ */
  constructor(onDepart: (dungeonId: string) => void) {
    this.onDepart = onDepart;
    // 下のボタン。一覧では［ダンジョンに向かう］、つよさ・袋の中・ダンジョンの一覧では［戻る］
    this.depart.addEventListener('click', () => {
      if (!this.profile) return;
      if (this.viewing) this.leave(() => (this.viewing = null));
      else if (this.pouch) this.leave(() => (this.pouch = null));
      else if (this.choosing) this.leave(() => (this.choosing = false));
      else this.enter(() => (this.choosing = true));
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
    this.back.addEventListener('click', () => this.go('hub'));
  }

  /** トップや、トップから移る画面へ。中で開いていたもの（つよさ・袋・ダンジョンの一覧）は閉じる */
  private go(view: View): void {
    this.view = view;
    this.viewing = null;
    this.pouch = null;
    this.choosing = false;
    this.clearShop();
    this.render();
  }

  /** 戻ってきたときの知らせ（失ったものなど）は、終わりの知らせの窓で出すので、拠点には出さない */
  open(profile: Profile): void {
    this.profile = profile;
    this.root.hidden = false;
    this.go('hub');
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
    const prep = this.view === 'prep';
    this.title.textContent = VIEW_TITLE[this.view];
    this.back.hidden = this.view === 'hub';
    this.tabBar.hidden = !prep;
    this.depart.hidden = !prep;
    this.body.classList.toggle('hub', this.view === 'hub');
    const children: HTMLElement[] = [];
    if (this.view === 'hub') {
      children.push(...this.hubRows(p));
    } else if (this.view === 'shop') {
      children.push(...this.shopRows(p));
    } else if (this.view === 'records') {
      children.push(...this.statusRows(p));
    } else if (this.choosing) {
      children.push(...this.dungeonRows(p));
    } else if (this.viewing) {
      // 仲間のつよさ。下の［戻る］でカードの一覧へ
      children.push(statusView(this.viewing));
    } else if (this.pouch) {
      children.push(...this.pouchRows(p, this.pouch));
    } else {
      if (this.tab === 'cards') children.push(...this.cardRows(p));
      else children.push(...this.itemListRows(p));
    }
    document.getElementById('base-runes')!.textContent = `💠 ${p.runes}ルーン`;
    this.body.replaceChildren(...children);
    this.body.scrollTop = keepScroll ? scroll : 0;
    const inside = this.viewing !== null || this.pouch !== null || this.choosing;
    this.depart.textContent = inside ? '戻る' : 'ダンジョンに向かう';
    this.depart.classList.toggle('back', inside);
  }

  /**
   * 拠点のトップ（requirements.md 10.4）。主人公の札（何代目か、連れていく仲間）と、
   * ［冒険の準備］［商店］［記録］の3つのメニュー
   */
  private hubRows(p: Profile): HTMLElement[] {
    const hero = document.createElement('div');
    hero.className = 'hub-hero';
    const party = document.createElement('div');
    party.className = 'hub-party';
    const hand = this.handCards();
    for (let i = 0; i < HAND_LIMIT; i++) {
      const card = hand[i];
      const face = document.createElement('span');
      face.className = card ? 'face' : 'face empty';
      if (card) face.append(faceElement(card.species.id, cardIcon(card)));
      else face.textContent = '＋';
      party.append(face);
    }
    const corners = ['tl', 'tr', 'bl', 'br'].map((c) => {
      const el = document.createElement('span');
      el.className = `hub-corner ${c}`;
      return el;
    });
    const stage = document.createElement('div');
    stage.className = 'hub-stage';
    stage.append(artElement('player', '🧙', 'hub-art'));
    hero.append(...corners, stage, note(`${generationName(p.generation)} 召喚士`, 'hub-name'), party);
    const item = (view: View, icon: string, name: string, desc: string, main = false): HTMLElement => {
      const b = document.createElement('button');
      b.className = main ? 'hub-item main' : 'hub-item';
      const ic = document.createElement('span');
      ic.className = 'hub-icon';
      ic.textContent = icon;
      const text = document.createElement('span');
      text.className = 'hub-text';
      const t = document.createElement('span');
      t.className = 'hub-title';
      t.textContent = name;
      const d = document.createElement('span');
      d.className = 'hub-desc';
      d.textContent = desc;
      text.append(t, d);
      const go = document.createElement('span');
      go.className = 'hub-go';
      go.textContent = '›';
      b.append(ic, text, go);
      b.addEventListener('click', () => this.go(view));
      return b;
    };
    return [
      hero,
      item('prep', '⚔️', '冒険の準備', '仲間・持ち物・ダンジョン選択', true),
      item('shop', '⚖️', '商店', '道具の売買'),
      item('records', '📜', '記録', 'つよさ・軌跡'),
    ];
  }

  /** ダンジョンを選ぶ。踏破していないダンジョンの次は、鍵がかかっている */
  private dungeonRows(p: Profile): HTMLElement[] {
    const rows: SheetRow[] = DUNGEONS.map((d) => {
      const open = isUnlocked(d, p.cleared);
      const done = p.cleared.includes(d.id);
      return {
        icon: open ? (done ? '🏆' : '🚪') : '🔒',
        name: d.name,
        sub: open ? (done ? `踏破済み\n${d.desc}` : d.desc) : `${dungeonById(d.requires ?? '').name}を踏破すると挑める`,
        dim: !open,
        button: { label: '出発', disabled: !open, onClick: () => this.onDepart(d.id) },
      };
    });
    return [note('挑むダンジョンを選ぶ'), ...rows.map(renderRow)];
  }

  /**
   * 仲間のタブ。上に並べ替えのボタンと、連れていく仲間の顔（5つの枠）を固定して出す。
   * 行の右の丸い印を押すと、連れていく・残すを切り替える。行の大きさは変えない
   */
  private cardRows(p: Profile): HTMLElement[] {
    const hand = this.handCards();
    const head = document.createElement('div');
    head.className = 'base-sort';
    // 並べ替えのボタン。1回目は昇順（↑）、同じボタンをもう一度押すと降順（↓）
    const sorts = document.createElement('div');
    sorts.className = 'sort-keys';
    for (const key of CARD_SORT_KEYS) {
      const on = this.cardSort?.key === key;
      const b = wideButton(`${CARD_SORT_LABEL[key]}${on ? (this.cardSort!.desc ? ' ↓' : ' ↑') : ''}`, false, () => {
        const desc = on ? !this.cardSort!.desc : false;
        this.cardSort = { key, desc };
        this.change(() => (p.cards = sortCards(p.cards, key, desc)));
      });
      if (on) b.classList.add('on');
      sorts.append(b);
    }
    const party = document.createElement('div');
    party.className = 'party-band';
    const label = document.createElement('div');
    label.className = 'party-label';
    label.textContent = '連れていく仲間';
    const count = document.createElement('div');
    count.className = 'party-count';
    count.textContent = `${hand.length} / ${HAND_LIMIT}`;
    const text = document.createElement('div');
    text.append(label, count);
    const faces = document.createElement('div');
    faces.className = 'party-faces';
    for (let i = 0; i < HAND_LIMIT; i++) {
      const card = hand[i];
      const face = document.createElement('span');
      face.className = card ? 'face' : 'face empty';
      if (card) face.append(faceElement(card.species.id, cardIcon(card)));
      else face.textContent = '＋';
      faces.append(face);
    }
    party.append(text, faces);
    head.append(sorts, party);
    const rows = p.cards.map((card) => {
      const taking = p.hand.includes(card.id);
      const row = renderRow({
        icon: cardIcon(card),
        art: card.species.id,
        name: card.species.name,
        sub: `Lv${card.level}　HP${card.hp}/${card.maxHp}　MP${card.species.cost}\n攻撃${card.atk}　防御${card.def}　${PERSONALITIES[card.personality].name}`,
        className: taking ? 'ally taking' : 'ally',
        onSelect: () => this.enter(() => (this.viewing = card)),
      });
      const check = document.createElement('button');
      check.className = taking ? 'check on' : 'check';
      check.setAttribute('aria-label', taking ? '残す' : '連れていく');
      check.disabled = !taking && hand.length >= HAND_LIMIT;
      check.addEventListener('click', () =>
        this.change(() => {
          if (taking) p.hand = p.hand.filter((id) => id !== card.id);
          else p.hand.push(card.id);
        }),
      );
      row.append(check);
      return row;
    });
    return [head, ...rows];
  }

  /**
   * 持ち物（バッグと倉庫）。上で［バッグ］［倉庫］を切り替え、並べ替えは1つのボタンから選ぶ。
   * 同じ道具は1行にまとめて数を出す（＋の違う装備、入る数の違う袋、中身のある袋は分ける）。
   * バッグは［倉庫へ送る］、倉庫は［バッグへ入れる］で1つずつ動かす
   */
  private itemListRows(p: Profile): HTMLElement[] {
    const bag = this.itemPlace === 'bag';
    const from = bag ? p.bag : p.warehouse;
    const to = bag ? p.warehouse : p.bag;
    const full = bag ? p.warehouse.length >= WAREHOUSE_LIMIT : p.bag.length >= BAG_LIMIT;
    const head = document.createElement('div');
    head.className = 'base-sort';
    head.append(
      placeTabs(
        this.itemPlace,
        { bag: `🎒 バッグ ${p.bag.length}/${BAG_LIMIT}`, warehouse: `📦 倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}` },
        (place) => {
          this.itemPlace = place;
          this.render();
        },
      ),
      this.sortSelect((by) => {
        if (bag) p.bag = sortStock(p.bag, by);
        else p.warehouse = sortStock(p.warehouse, by);
      }),
    );
    // 選んでいる並べ方で出す（あとから入れた道具も、その並びに入る）
    const rows = groupItems(sortStock(from, this.itemSort)).map((g) => {
      const first = g.items[0];
      // 矢は本数を足して出す
      const name = ITEMS[first.kind].arrow
        ? `${ITEMS[first.kind].name}（${g.items.reduce((n, i) => n + (i.count ?? 0), 0)}本）`
        : `${g.name}${g.items.length > 1 ? ` ×${g.items.length}` : ''}`;
      return this.itemRow(first, bag ? '倉庫へ送る' : 'バッグへ入れる', full, () => move(first, from, to), name);
    });
    return [head, ...(rows.length > 0 ? rows : [note(bag ? 'バッグは空' : '倉庫は空')])];
  }

  private itemRow(item: Item, label: string, disabled: boolean, onClick: () => void, name = itemName(item)): HTMLElement {
    const pouch = ITEMS[item.kind].pouch !== undefined;
    // 袋は押すと中を見られる
    return renderRow({
      icon: ITEMS[item.kind].emoji,
      name,
      sub: ITEMS[item.kind].desc,
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
    ];
  }

  /** 並べ替えのボタン。押すと種類順・名前順・個数順から選べる（iPhone では下に選ぶ輪が出る） */
  private sortSelect(sort: (by: ItemSortKey) => void): HTMLElement {
    const box = document.createElement('label');
    box.className = 'sort-select';
    const text = document.createElement('span');
    text.textContent = `⇅ ソート：${ITEM_SORT_LABEL[this.itemSort]}`;
    const select = document.createElement('select');
    for (const key of ITEM_SORT_KEYS) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = ITEM_SORT_LABEL[key];
      o.selected = key === this.itemSort;
      select.append(o);
    }
    select.addEventListener('change', () => {
      this.itemSort = select.value as ItemSortKey;
      this.change(() => sort(this.itemSort));
    });
    box.append(text, select);
    return box;
  }

  /**
   * 商店（requirements.md 10.4.1）。買う：品を［－］数［＋］で選び、送り先（バッグか倉庫）を決めてまとめて買う。
   * 薬草とパンはいくつでも、ほかの品は棚にある数まで。売る：バッグと倉庫の道具を同じように選んでまとめて売る
   */
  private shopRows(p: Profile): HTMLElement[] {
    const head = document.createElement('div');
    head.className = 'base-sort';
    const modes = document.createElement('div');
    modes.className = 'sort-keys shop-modes';
    for (const [mode, label] of [['buy', '買う'], ['sell', '売る']] as const) {
      const b = wideButton(label, false, () => {
        this.shopMode = mode;
        this.clearShop();
        this.render();
      });
      if (this.shopMode === mode) b.classList.add('on');
      modes.append(b);
    }
    head.append(modes);
    const done = this.shopNote ? [note(this.shopNote, 'base-section')] : [];
    return [head, ...done, ...(this.shopMode === 'buy' ? this.buyRows(p, head) : this.sellRows(p, head))];
  }

  /** 選んでいる数と、知らせを消す */
  private clearShop(): void {
    this.buyCount.clear();
    this.sellCount.clear();
    this.countError = null;
    this.shopNote = '';
  }

  /** 買う品の一覧。それぞれ、ルーン・送り先の空き・棚の数から、あと何個まで買えるかを出す */
  private buyRows(p: Profile, head: HTMLElement): HTMLElement[] {
    const to = this.buyTo === 'bag' ? p.bag : p.warehouse;
    const room = (this.buyTo === 'bag' ? BAG_LIMIT : WAREHOUSE_LIMIT) - to.length;
    const kinds = [...ALWAYS_SOLD, ...new Set(p.shopStock)];
    const picked = kinds.filter((k) => (this.buyCount.get(k) ?? 0) > 0);
    const count = picked.reduce((n, k) => n + this.buyCount.get(k)!, 0);
    const total = picked.reduce((n, k) => n + buyPrice(k) * this.buyCount.get(k)!, 0);
    head.append(
      placeTabs(
        this.buyTo,
        { bag: `🎒 バッグへ送る ${p.bag.length}/${BAG_LIMIT}`, warehouse: `📦 倉庫へ送る ${p.warehouse.length}/${WAREHOUSE_LIMIT}` },
        (place) => {
          this.buyTo = place;
          this.buyCount.clear();
          this.countError = null;
          this.render(true);
        },
      ),
    );
    const buyButton = wideButton(count > 0 ? `${count}個を買う 💠${total}` : '買う数を選ぶ', count === 0, () =>
      this.change(() => {
        for (const k of picked) for (let i = 0; i < this.buyCount.get(k)!; i++) buy(p, k, this.buyTo);
        this.shopNote = `${count}個を買って ${this.buyTo === 'bag' ? 'バッグ' : '倉庫'}へ送った`;
        this.buyCount.clear();
        this.countError = null;
      }),
    );
    buyButton.classList.add('main');
    head.append(buyButton);
    return kinds.map((kind) => {
      const n = this.buyCount.get(kind) ?? 0;
      // ほかの品で選んだ分を引いて、この品をあと何個まで買えるか
      const otherRunes = total - buyPrice(kind) * n;
      const otherCount = count - n;
      const shelf = ALWAYS_SOLD.includes(kind) ? Infinity : p.shopStock.filter((k) => k === kind).length;
      const max = Math.max(0, Math.min(shelf, Math.floor((p.runes - otherRunes) / buyPrice(kind)), room - otherCount));
      const why = p.runes - otherRunes < buyPrice(kind) ? 'ルーンが足りない' : room - otherCount <= 0 ? `${this.buyTo === 'bag' ? 'バッグ' : '倉庫'}がいっぱい` : '';
      const key = `buy:${kind}`;
      const row = renderRow({
        icon: ITEMS[kind].emoji,
        name: `${ITEMS[kind].name}　💠${buyPrice(kind)}`,
        sub: ITEMS[kind].desc,
        dim: max === 0 && n === 0,
        className: n > 0 ? 'chosen' : undefined,
      });
      countLine(row, max > 0 || n > 0 ? `${max}個まで購入できます` : why, this.countError === key);
      if (max > 0 || n > 0) row.append(this.stepper(key, n, max, (v) => this.buyCount.set(kind, v)));
      return row;
    });
  }

  /** 売る道具の一覧。バッグと倉庫を切り替え、同じ道具はまとめる */
  private sellRows(p: Profile, head: HTMLElement): HTMLElement[] {
    const from = this.sellFrom === 'bag' ? p.bag : p.warehouse;
    const groups = groupItems(from, true);
    const picked = groups.flatMap((g) => g.items.slice(0, this.sellCount.get(g.key) ?? 0));
    const total = picked.reduce((n, i) => n + sellPrice(i), 0);
    const places = placeTabs(
      this.sellFrom,
      { bag: `🎒 バッグ ${p.bag.length}`, warehouse: `📦 倉庫 ${p.warehouse.length}` },
      (place) => {
        this.sellFrom = place;
        this.sellCount.clear();
        this.countError = null;
        this.render();
      },
    );
    const sellButton = wideButton(
      picked.length > 0 ? `${picked.length}個を売る 💠${total}` : '売る数を選ぶ',
      picked.length === 0,
      () =>
        this.change(() => {
          const got = sell(p, picked);
          this.sellCount.clear();
          this.countError = null;
          this.shopNote = `${picked.length}個を売って ${got}ルーンを得た`;
        }),
    );
    sellButton.classList.add('main');
    head.append(places, sellButton);
    const sellRow = (g: ItemGroup): HTMLElement => {
      const first = g.items[0];
      const ok = canSell(first);
      const n = this.sellCount.get(g.key) ?? 0;
      const max = g.items.length;
      const why = ITEMS[first.kind].pouch && (first.contents?.length ?? 0) > 0 ? '中の道具を出すと売れる' : '売れない';
      const key = `sell:${g.key}`;
      const row = renderRow({
        icon: ITEMS[first.kind].emoji,
        name: `${g.name}${max > 1 ? `　×${max}` : ''}`,
        sub: ok ? `${first.count !== undefined ? '1束' : '1つ'} 💠${sellPrice(first)}` : why,
        dim: !ok,
        className: n > 0 ? 'chosen' : undefined,
      });
      if (ok) countLine(row, `${max}個まで売却できます`, this.countError === key);
      if (ok) row.append(this.stepper(key, n, max, (v) => this.sellCount.set(g.key, v)));
      return row;
    };
    return groups.length > 0 ? groups.map(sellRow) : [note(this.sellFrom === 'bag' ? 'バッグは空' : '倉庫は空')];
  }

  /**
   * 数を選ぶ［－］数［＋］。数を押すと、じかに打ち込める。
   * 打ち込んだ数が max をこえたら、数は変えずに「n個まで…」を赤で出す
   */
  private stepper(key: string, value: number, max: number, set: (v: number) => void): HTMLElement {
    const apply = (v: number) => {
      this.countError = null;
      set(Math.max(0, Math.min(max, v)));
      this.render(true);
    };
    const box = document.createElement('div');
    box.className = 'stepper';
    const minus = document.createElement('button');
    minus.textContent = '－';
    minus.disabled = value <= 0;
    minus.addEventListener('click', () => apply(value - 1));
    const num = document.createElement('button');
    num.className = 'stepper-num';
    num.textContent = `${value}`;
    num.addEventListener('click', () => {
      const input = document.createElement('input');
      input.className = 'stepper-num';
      input.type = 'text';
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      input.value = value > 0 ? `${value}` : '';
      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        const text = input.value.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
        const v = text === '' ? 0 : Number(text);
        if (!Number.isInteger(v) || v < 0) this.render(true);
        else if (v > max) {
          this.countError = key;
          this.render(true);
        } else apply(v);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
      input.addEventListener('blur', commit);
      num.replaceWith(input);
      input.focus();
      input.select();
    });
    const plus = document.createElement('button');
    plus.textContent = '＋';
    plus.disabled = value >= max;
    plus.addEventListener('click', () => apply(value + 1));
    box.append(minus, num, plus);
    return box;
  }

  /**
   * 主人公のつよさ（requirements.md 10.4.2）。ダンジョンに入るときの能力、覚えている魔法、
   * これまでの軌跡（累計とダンジョンごとの記録）
   */
  private statusRows(p: Profile): HTMLElement[] {
    const portrait = document.createElement('div');
    portrait.className = 'status-portrait';
    portrait.append(artElement('player', '🧙', 'status-art'));
    const title = note(`${generationName(p.generation)} 召喚士`, 'status-title');
    const b = PLAYER_BASE;
    const r = p.records;
    const dungeonRows = DUNGEONS.filter((d) => r.dungeons[d.id] || isUnlocked(d, p.cleared)).map((d) => {
      const rec = r.dungeons[d.id];
      return renderRow({
        icon: p.cleared.includes(d.id) ? '🏆' : '🚪',
        name: d.name,
        sub: rec
          ? `挑戦${rec.tries}回　踏破${rec.cleared}　離脱${rec.escaped}\n力つきた${rec.failed}　あきらめた${rec.gaveUp}\n最高到達 B${rec.bestFloor}F／全${d.floors}階`
          : 'まだ挑んでいない',
      });
    });
    const runs = Object.values(r.dungeons).reduce((n, d) => n + d.tries, 0);
    return [
      portrait,
      title,
      note('ダンジョンに入るときの能力', 'base-section'),
      table([
        ['レベル', '1'],
        ['HP', `${b.hp}`],
        ['MP', `${b.mp}`],
        ['攻撃力', `${b.atk}`],
        ['防御力', `${b.def}`],
        ['満腹度', `${b.food}`],
      ]),
      note('覚えている魔法', 'base-section'),
      ...this.spellRows(p),
      note('軌跡', 'base-section'),
      table([
        ['潜った回数', `${runs}回`],
        ['たおした魔物', `${r.kills}体`],
        ['仲間にした数', `${r.cards}体`],
        ['拾った道具', `${r.items}個`],
        ['拾ったルーン', `${r.runes}`],
      ]),
      ...dungeonRows,
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
            sub: `MP${SPELLS[id].mp}　${effect}\n魔導書を読むとランクが上がる　最大+5`,
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

/** ［バッグ］［倉庫］の切り替えのタブ。選んでいる方は濃い茶に金の下線、ほかは薄いベージュ */
function placeTabs(current: Place, labels: Record<Place, string>, onPick: (place: Place) => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'place-tabs';
  for (const place of ['bag', 'warehouse'] as const) {
    const b = document.createElement('button');
    b.textContent = labels[place];
    if (place === current) b.classList.add('on');
    b.addEventListener('click', () => onPick(place));
    box.append(b);
  }
  return box;
}

type ItemSortKey = 'kind' | 'name' | 'count';
const ITEM_SORT_KEYS: ItemSortKey[] = ['kind', 'name', 'count'];
const ITEM_SORT_LABEL: Record<ItemSortKey, string> = { kind: '種類順', name: '名前順', count: '個数順' };

/** 道具を並べ替える。個数順は、同じ道具の多い順（同じ数なら種類順） */
function sortStock(items: Item[], by: ItemSortKey): Item[] {
  if (by !== 'count') return sortItems(items, by);
  return groupItems(sortItems(items, 'kind'))
    .sort((a, b) => b.items.length - a.items.length)
    .flatMap((g) => g.items);
}

/** 説明の下に「n個まで…」を出す。打ち込んだ数が多すぎたとき（error）は赤にする */
function countLine(row: HTMLElement, text: string, error: boolean): void {
  const el = document.createElement('div');
  el.className = error ? 'sub count-error' : 'sub';
  el.textContent = text;
  row.querySelector('.sub')!.after(el);
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
