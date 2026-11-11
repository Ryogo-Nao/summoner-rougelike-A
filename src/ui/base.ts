import { elementText } from '../game/elements';
import { HAND_LIMIT, PERSONALITIES, SUMMON_LIMIT, cardName, growthRate, isPartner, type Card } from '../game/cards';
import {
  FUSION_BOOK,
  FUSION_COST,
  FUSION_MIN_LEVEL,
  REBIRTH_BOOK,
  bookCount,
  canBeParent,
  canFuseNow,
  costProblem,
  fuse,
  otherSpecies,
  inheritedBonus,
  nextFusions,
  rebirth,
} from '../game/fusion';
import type { ConfirmDialog } from './dialog';
import { SPECIES } from '../game/monsters';
import { buy, canSell, sell } from '../game/shop';
import { DUNGEONS, dungeonById, isUnlocked } from '../game/dungeons';
import { BAG_LIMIT, ITEMS, itemCategory, itemDesc, itemEffect, itemName, kindEffect, sortItems, buyPrice, sellPrice, type ItemKind, type Item } from '../game/items';
import { WAREHOUSE_LIMIT, generationName, saveProfile, type Profile } from '../game/profile';
import { ATTACK_SPELLS, BUFF_SPELLS, PLAYER_BASE, SPELLS, SPELL_MAX_RANK } from '../game/state';
import { HOW_TO_PLAY, SPELL_ART, SPELL_ICONS, cardIcon, settingRows, spellEffect } from './screens';
import type { Settings } from './settings';
import { countStepper, lineList, listTools, renderLine, renderRow, selectButton, wideButton, type SheetRow } from './sheet';
import { statusView } from './status';
import { artElement, faceElement, itemArt } from '../render/art';
import { iconImage, setRichText } from './icons';

/** 拠点の画面。下のタブで行き来する */
type View = 'hub' | 'prep' | 'allies' | 'fusion' | 'shop' | 'other';
/** 冒険の準備のタブ */
type Tab = 'cards' | 'items';
/** その他の画面で、記録を見ているか設定を見ているか */
type OtherMode = 'records' | 'settings';
/** 道具を置く場所 */
type Place = 'bag' | 'warehouse';

/** 見出し（左上の札）。どの画面も画面の名前。「初代 召喚士」はトップのまん中の名札に出す */
const VIEW_TITLE: Record<View, string> = {
  hub: '拠点',
  prep: '冒険の準備',
  allies: '仲間',
  fusion: '配合',
  shop: '商店',
  other: 'その他',
};

/** 紺と金の共通の部品（docs/art-guide.md 8.2）で出す画面。ほかの画面も、そろえたら足していく */
const NAVY_VIEWS: View[] = ['prep', 'allies', 'fusion', 'shop', 'other'];

/** 下のタブ。icon は public/art/<icon>.png */
const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'hub', label: '拠点', icon: 'ui_tab_home' },
  { view: 'prep', label: '冒険', icon: 'ui_hub_adventure' },
  // 配合は仲間のタブの中（上の［一覧］［配合］［転生］で切り替える）。下のタブは5つ
  { view: 'allies', label: '仲間', icon: 'ui_tab_allies' },
  { view: 'shop', label: '商店', icon: 'ui_hub_shop' },
  { view: 'other', label: 'その他', icon: 'ui_tab_other' },
];

/**
 * 拠点画面（requirements.md 10.4）。下のタブで、トップ・冒険・仲間・配合・商店・その他を行き来する。
 * 冒険：連れていく仲間を選び、バッグと倉庫の間でアイテムを出し入れして出発する。仲間：つよさと名前。
 * 商店：売り買い。その他：記録と設定。変えるたびに保存する
 */
export class BaseScreen {
  private readonly root = document.getElementById('base')!;
  private readonly body = document.getElementById('base-body')!;
  private readonly depart = document.getElementById('base-depart')!;
  private readonly tabs = [...document.querySelectorAll<HTMLButtonElement>('#base-tabs button[data-tab]')];
  private readonly tabBar = document.getElementById('base-tabs')!;
  private readonly title = document.getElementById('base-title')!;
  /** 下のタブのボタン（画面ごと） */
  private readonly navButtons = new Map<View, HTMLButtonElement>();
  private view: View = 'hub';
  private tab: Tab = 'cards';
  private otherMode: OtherMode = 'records';
  /** 持ち物のタブで、バッグを見ているか倉庫を見ているか */
  private itemPlace: Place = 'bag';
  /** 持ち物の並べ方 */
  private itemSort: ItemSortKey = 'kind';
  private profile: Profile | null = null;
  /** つよさを見ているカード。null なら一覧を出す */
  private viewing: Card | null = null;
  /** 中を見ている袋（バッグか倉庫にある）。null なら一覧を出す */
  private pouch: Item | null = null;
  /**
   * 冒険で挑むダンジョン。冒険はダンジョンを選ぶところから始め（null）、選ぶと仲間と持ち物の準備へ進む。
   * 拠点にいる間は覚えておき、ダンジョンから戻ったら選び直す
   */
  private dungeonId: string | null = null;
  /** ダンジョンの一覧で押した、詳しく見ているダンジョン（［準備する］で dungeonId になる） */
  private dungeonView: string | null = null;
  /** 商店で、買う画面か売る画面か。売る画面で選んでいる道具 */
  private shopMode: 'buy' | 'sell' = 'buy';
  private sellFrom: Place = 'bag';
  /** 売る数（まとめた道具の key ごと） */
  private sellCount = new Map<string, number>();
  /** 商店で最後にしたこと（「薬草を買った」など） */
  private shopNote = '';
  /** 買う数（棚の1つずつ。キーは棚の並びの位置。どれも0か1）と、買った物の送り先 */
  private buyCount = new Map<number, number>();
  private buyTo: Place = 'bag';
  /** 打ち込んだ数が多すぎた行。その行に「n個まで…」を赤で出す */
  private countError: string | null = null;
  /** 最後に押した並べ替えのボタンと、その向き（desc なら降順） */
  private cardSort: { key: CardSortKey; desc: boolean } | null = null;
  /** つよさ・袋の中・ダンジョンの一覧を開く前の、一覧のスクロールの位置。戻ったときにそこへ戻す */
  private listScroll = 0;
  private readonly onDepart: (dungeonId: string) => void;
  private readonly dialog: ConfirmDialog;
  private readonly settings: Settings;
  private readonly onSettings: () => void;
  /** 配合の画面で、配合か転生か。選んでいる親（転生では合わせる魔物）と、子の種族（0・1 は親1・親2、2 は別の種族） */
  private fusionMode: 'fusion' | 'rebirth' = 'fusion';
  private parents: Card[] = [];
  private childFrom = 0;
  /** 商店で、下のボタンを押したときにすること（まとめて買う・売る） */
  private shopAction: { label: string; disabled: boolean; delta: number; run: () => void } | null = null;
  /** 配合の画面で最後にしたこと（「ガルフ+1が生まれた」など） */
  private fusionNote = '';
  /** 説明を見ている道具（持ち物・袋・商店の行を押したとき）。商店の品は item がない */
  private itemView: { kind: ItemKind; item?: Item } | null = null;
  /** 一覧ごと（仲間・連れていく仲間・バッグ・倉庫）の、検索の文字 */
  private lists = new Map<string, { query: string }>();

  /**
   * onDepart は、ダンジョンを選んで［出発］を押したときに呼ぶ。dialog は配合の前に確かめるのに使う。
   * settings はその他の画面で切り替え、切り替えたら onSettings を呼ぶ
   */
  constructor(onDepart: (dungeonId: string) => void, dialog: ConfirmDialog, settings: Settings, onSettings: () => void) {
    this.onDepart = onDepart;
    this.dialog = dialog;
    this.settings = settings;
    this.onSettings = onSettings;
    // 下のボタン。冒険の準備では［〇〇へ出発］、つよさ・袋の中・道具の説明では［戻る］。商店では［n個を買う］［n個を売る］
    this.depart.addEventListener('click', () => {
      if (!this.profile) return;
      if (this.itemView) this.leave(() => (this.itemView = null));
      else if (this.view === 'shop') this.shopAction?.run();
      else if (this.viewing) this.leave(() => (this.viewing = null));
      else if (this.pouch) this.leave(() => (this.pouch = null));
      else if (this.dungeonId) this.onDepart(this.dungeonId);
    });
    // 冒険の準備の「‹」：ダンジョンを選び直す
    document.getElementById('base-back')!.addEventListener('click', () => {
      this.dungeonId = null;
      this.dungeonView = null;
      this.viewing = null;
      this.itemView = null;
      this.pouch = null;
      this.render();
    });
    for (const button of this.tabs) {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab as Tab;
        this.viewing = null;
        this.itemView = null;
        this.pouch = null;
        this.render();
      });
    }
    // 下のタブ。木の帯に、四角い枠に入ったアイコンと名前を並べる
    const nav = document.getElementById('base-nav')!;
    for (const tab of NAV) {
      const b = document.createElement('button');
      const frame = document.createElement('span');
      frame.className = 'tab-frame';
      frame.append(uiImage(tab.icon));
      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.label;
      b.append(frame, label);
      b.addEventListener('click', () => this.go(tab.view));
      nav.append(b);
      this.navButtons.set(tab.view, b);
    }
  }

  /**
   * 下のタブやトップのメニューから、画面を移る。中で開いていたもの（つよさ・袋・ダンジョンの一覧）は閉じる。
   * 開いた画面の知らせ（赤い丸・NEW）は消す
   */
  private go(view: View, otherMode?: OtherMode): void {
    const p = this.profile!;
    this.view = view;
    if (otherMode) this.otherMode = otherMode;
    if (view === 'allies') p.notices.allies = false;
    if (view === 'shop') p.notices.shop = false;
    if (view === 'fusion') p.notices.fusionSeen = canFuseNow(p);
    saveProfile(p);
    this.viewing = null;
    this.itemView = null;
    this.pouch = null;
    this.clearShop();
    this.parents = [];
    this.fusionNote = '';
    this.lists.clear();
    this.render();
  }

  /** 戻ってきたときの知らせ（失ったものなど）は、終わりの知らせの窓で出すので、拠点には出さない */
  open(profile: Profile): void {
    this.profile = profile;
    this.dungeonId = null;
    this.dungeonView = null;
    this.root.hidden = false;
    setBarColor(BAR_BASE);
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
    setBarColor(BAR_DUNGEON);
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }


  /** 連れていく仲間を、選んだ順に。最初の3体は、召喚した状態でダンジョンに入る */
  private handCards(): Card[] {
    const p = this.profile!;
    return p.hand.map((id) => p.cards.find((c) => c.id === id)).filter((c): c is Card => c !== undefined);
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
    // 配合できなくなったら、次にそろったときにまた「NEW」を出す
    if (p.notices.fusionSeen && !canFuseNow(p)) {
      p.notices.fusionSeen = false;
      saveProfile(p);
    }
    const scroll = this.body.scrollTop;
    for (const b of this.tabs) b.classList.toggle('active', b.dataset.tab === this.tab);
    for (const [view, b] of this.navButtons) {
      // 配合は仲間のタブの中なので、配合の画面でも［仲間］を選んでいる見た目にし、配合の「NEW」も［仲間］に付ける
      b.classList.toggle('on', view === this.view || (view === 'allies' && this.view === 'fusion'));
      b.querySelector('.badge')?.remove();
      const mark = view === 'allies' ? (this.badgeOf(p, 'fusion') ?? this.badgeOf(p, 'allies')) : this.badgeOf(p, view);
      if (mark) b.append(mark);
    }
    // 冒険は、ダンジョンを選んでから（choosing）仲間と持ち物の準備（prep）へ
    const choosing = this.view === 'prep' && this.dungeonId === null;
    const prep = this.view === 'prep' && !choosing;
    const inside = this.viewing !== null || this.pouch !== null || this.itemView !== null;
    this.title.textContent = VIEW_TITLE[this.view];
    this.tabBar.hidden = !prep;
    // 下のボタン：冒険の準備では［〇〇へ出発］か［戻る］、商店では［n個を買う］［n個を売る］、ほかの画面ではつよさ・説明を見ているときの［戻る］
    this.depart.hidden = !prep && this.view !== 'shop' && !inside;
    this.root.classList.toggle('on-hub', this.view === 'hub');
    this.body.classList.toggle('hub', this.view === 'hub');
    this.body.classList.toggle('navy', NAVY_VIEWS.includes(this.view));
    this.body.classList.toggle('shop', this.view === 'shop');
    const children: HTMLElement[] = [];
    if (this.view === 'hub') {
      children.push(...this.hubRows(p));
    } else if (this.itemView) {
      children.push(this.itemDetail(this.itemView.kind, this.itemView.item));
    } else if (this.view === 'shop') {
      children.push(...this.shopRows(p));
    } else if (this.view === 'other') {
      children.push(...this.otherRows(p));
    } else if (this.viewing) {
      // 仲間のつよさ。ニックネームを付けられる。下の［戻る］で元の一覧（仲間・冒険の準備・配合）へ
      const card = this.viewing;
      children.push(
        statusView(card, {
          onRename: (name) => this.change(() => (card.nickname = name || undefined)),
        }),
      );
    } else if (this.view === 'fusion') {
      children.push(...this.fusionRows(p));
    } else if (choosing && this.dungeonView) {
      children.push(this.dungeonDetail(p, this.dungeonView));
    } else if (choosing) {
      children.push(...this.dungeonRows(p));
    } else if (this.pouch) {
      children.push(...this.pouchRows(p, this.pouch));
    } else if (this.view === 'allies') {
      children.push(...this.alliesRows(p));
    } else {
      if (this.tab === 'cards') children.push(...this.cardRows(p));
      else children.push(...this.itemListRows(p));
    }
    // 商店で数を選んでいるときは、買った（売った）あとのルーンも「5000 → 4980」と出す
    const delta = this.view === 'shop' && !this.itemView ? (this.shopAction?.delta ?? 0) : 0;
    document
      .getElementById('base-runes')!
      .replaceChildren(uiImage('ui_rune', 'rune-gem'), delta !== 0 ? `${p.runes} → ${p.runes + delta}` : `${p.runes}`);
    this.body.replaceChildren(...children);
    this.body.scrollTop = keepScroll ? scroll : 0;
    this.depart.textContent = inside ? '戻る' : this.dungeonId ? `${dungeonById(this.dungeonId).name}へ出発` : '';
    this.depart.classList.toggle('back', inside);
    (this.depart as HTMLButtonElement).disabled = false;
    if (this.view === 'shop' && this.shopAction && !this.itemView) {
      setRichText(this.depart, this.shopAction.label);
      (this.depart as HTMLButtonElement).disabled = this.shopAction.disabled;
    }
  }

  /**
   * 拠点のトップ（requirements.md 10.4）。村の広場に、主人公と名札、連れていく仲間（顔の下に Lv）を出す。
   * その下に［冒険の準備］の看板と、［商店］［記録］［配合］の札を置く。仲間の枠を押すと、冒険の準備の仲間へ
   */
  private hubRows(p: Profile): HTMLElement[] {
    const hero = document.createElement('div');
    hero.className = 'hub-hero';
    const party = document.createElement('div');
    party.className = 'hub-party';
    const hand = this.handCards();
    for (let i = 0; i < HAND_LIMIT; i++) {
      const card = hand[i];
      const slot = document.createElement('button');
      slot.className = card ? 'hub-slot' : 'hub-slot empty';
      // 4体目からは控え（ダンジョンでは、最初の3体だけを召喚した状態で入る）
      if (i >= SUMMON_LIMIT) slot.classList.add('reserve');
      const face = document.createElement('span');
      face.className = 'hub-face';
      if (card) face.append(faceElement(card.species.id, cardIcon(card)));
      else face.textContent = '＋';
      const lv = document.createElement('span');
      lv.className = 'hub-lv';
      lv.textContent = card ? `Lv${card.level}` : '';
      slot.append(face, lv);
      slot.addEventListener('click', () => this.go('allies'));
      party.append(slot);
    }
    // 魔法陣の台の上に主人公を立たせる
    const stage = document.createElement('div');
    stage.className = 'hub-stage';
    stage.append(artElement('player', '🧙', 'hub-art'));
    hero.append(stage, note(`${generationName(p.generation)} 召喚士`, 'hub-name'), party);
    // 鎖で吊るした［冒険の準備］の看板と、［商店］［記録］［配合］の札は、文字ごと1枚の絵（docs/art-guide.md 8.1）。
    // 「NEW」「！」の印と押せる範囲だけを上に重ねる
    const sign = document.createElement('button');
    sign.className = 'hub-sign';
    sign.setAttribute('aria-label', '冒険の準備');
    sign.append(uiImage('ui_sign_adventure', 'hub-sign-art'));
    sign.addEventListener('click', () => this.go('prep'));
    /** 札の絵は public/art/ui_card_<name>.png */
    const item = (view: View, art: string, name: string, otherMode?: OtherMode): HTMLElement => {
      const b = document.createElement('button');
      b.className = 'hub-item';
      b.setAttribute('aria-label', name);
      b.append(uiImage(`ui_card_${art}`, 'hub-card-art'));
      const mark = this.badgeOf(p, view);
      if (mark) b.append(mark);
      b.addEventListener('click', () => this.go(view, otherMode));
      return b;
    };
    // 2×2 に並べ、右上は空けておく（あとで別の札を置く）
    const spare = document.createElement('span');
    spare.className = 'hub-item-spare';
    const menus = document.createElement('div');
    menus.className = 'hub-menus';
    menus.append(item('shop', 'shop', '商店'), spare, item('other', 'records', '記録', 'records'), item('fusion', 'fusion', '配合'));
    // 主人公・仲間と、鎖で吊るした看板は1つのかたまり。かたまりの上・札との間・札の下の余白を同じにする
    const upper = document.createElement('div');
    upper.className = 'hub-upper';
    upper.append(hero, sign);
    return [upper, menus];
  }

  /** 下のタブとトップのメニューに付ける知らせ。配合できるようになったら「NEW」、仲間が加わった・品が入れ替わったら赤い丸 */
  private badgeOf(p: Profile, view: View): HTMLElement | null {
    if (view === 'fusion' && canFuseNow(p) && !p.notices.fusionSeen) return badge('new');
    if ((view === 'allies' && p.notices.allies) || (view === 'shop' && p.notices.shop)) return badge('dot');
    return null;
  }

  /** 仲間の画面。全員の一覧（連れていく仲間は色を変える）。行を押すと、つよさを見て名前を変えられる */
  private alliesRows(p: Profile): HTMLElement[] {
    const head = document.createElement('div');
    head.className = 'base-sort';
    const list = this.searchList('allies', p.cards, cardSearchText, '種族・ニックネーム', (card) => {
      const taking = p.hand.includes(card.id);
      return allyRow(card, {
        on: taking,
        label: taking ? '残す' : '連れていく',
        disabled: !taking && p.hand.length >= HAND_LIMIT,
        onToggle: () =>
          this.change(() => {
            if (taking) p.hand = p.hand.filter((id) => id !== card.id);
            else p.hand.push(card.id);
          }),
        onSelect: () => this.enter(() => (this.viewing = card)),
      });
    });
    head.append(
      this.allyModes(p, 'list'),
      listTools(list.search, this.cardSortSelect(p)),
      note(`仲間 ${p.cards.length}体　連れていく ${p.hand.length}/${HAND_LIMIT}`, 'allies-count'),
    );
    return [head, list.list];
  }

  /**
   * 一覧と、上に置く検索の欄（requirements.md 10.4）。ページには分けず、すべて出してスクロールする。
   * 検索は search を head に、list を本文に置く。打つたびに一覧だけを描き直す（欄から指が離れないように）。
   * 検索の文字はひらがなとカタカナを区別しない
   */
  private searchList<T>(
    id: string,
    items: T[],
    text: (item: T) => string,
    placeholder: string,
    row: (item: T) => HTMLElement,
  ): { search: HTMLElement; list: HTMLElement } {
    let state = this.lists.get(id);
    if (!state) {
      state = { query: '' };
      this.lists.set(id, state);
    }
    const st = state;
    const list = document.createElement('div');
    list.className = 'search-list line-list';
    const draw = () => {
      const q = searchKey(st.query);
      const hits = q ? items.filter((item) => searchKey(text(item)).includes(q)) : items;
      const shown = hits.map(row);
      list.classList.toggle('empty', shown.length === 0);
      list.replaceChildren(...(shown.length > 0 ? shown : [note(q ? '見つからない' : 'まだいない')]));
    };
    const box = document.createElement('label');
    box.className = 'list-search';
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = placeholder;
    // 虫めがねの絵は欄の左に敷く（絵はページから見た場所で読む）
    input.style.backgroundImage = 'url(art/icon_ui_search.png)';
    input.value = st.query;
    input.enterKeyHint = 'search';
    input.addEventListener('input', () => {
      st.query = input.value;
      draw();
      this.body.scrollTop = 0;
    });
    // 決定を押したらキーボードを閉じる
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    box.append(input);
    draw();
    return { search: box, list };
  }

  /** その他（記録と設定）。上で［記録］［設定］を切り替える。設定はダンジョンのメニューと同じもの */
  private otherRows(p: Profile): HTMLElement[] {
    const head = document.createElement('div');
    head.className = 'base-sort';
    const modes = document.createElement('div');
    modes.className = 'sort-keys shop-modes';
    for (const [mode, label] of [['records', '記録'], ['settings', '設定']] as const) {
      const b = wideButton(label, false, () => {
        this.otherMode = mode;
        this.render();
      });
      if (this.otherMode === mode) b.classList.add('on');
      modes.append(b);
    }
    head.append(modes);
    if (this.otherMode === 'records') return [head, ...this.statusRows(p)];
    const rows = settingRows(this.settings, () => {
      this.onSettings();
      this.render(true);
    });
    return [head, lineList(rows), note('遊び方', 'base-section'), note(HOW_TO_PLAY)];
  }

  /**
   * 冒険の始め：挑むダンジョンを選ぶ（H-05）。一覧は名前・踏破したか・階の数だけ。押すと詳しい画面へ。
   * 印は、踏破済み🏆・挑める⚔️・まだ挑めない🔒。踏破していないダンジョンの次は、鍵がかかっている
   */
  private dungeonRows(p: Profile): HTMLElement[] {
    const rows = DUNGEONS.map((d) => {
      const open = isUnlocked(d, p.cleared);
      const done = p.cleared.includes(d.id);
      return renderLine({
        icon: open ? (done ? '🏆' : '⚔️') : '🔒',
        art: open ? (done ? 'icon_ui_cleared' : 'icon_ui_open') : 'icon_ui_locked',
        name: d.name,
        tag: `全${d.floors}階`,
        sub: open ? (done ? '踏破済み' : '未踏破') : `${dungeonById(d.requires ?? '').name}を踏破すると挑める`,
        dim: !open,
        className: 'dungeon',
        onSelect: open ? () => this.enter(() => (this.dungeonView = d.id)) : undefined,
      });
    });
    return [note('挑むダンジョンを選ぶ', 'base-section'), lineList(rows)];
  }

  /** ダンジョンの詳しい画面。説明と記録を出し、［準備する］で仲間と持ち物の準備へ、［戻る］で一覧へ */
  private dungeonDetail(p: Profile, id: string): HTMLElement {
    const d = dungeonById(id);
    const done = p.cleared.includes(d.id);
    const rec = p.records.dungeons[d.id];
    const box = document.createElement('div');
    box.className = 'item-detail dungeon-detail';
    const art = document.createElement('span');
    art.className = 'item-detail-art';
    art.append(iconImage(done ? 'icon_ui_cleared' : 'icon_ui_open', 'detail-icon'));
    const name = document.createElement('p');
    name.className = 'item-detail-name';
    name.textContent = d.name;
    const desc = document.createElement('p');
    desc.className = 'item-detail-desc';
    desc.textContent = `${done ? '踏破済み' : '未踏破'}\n${d.desc}`;
    box.append(art, name, desc);
    if (rec) {
      const record = document.createElement('p');
      record.className = 'item-detail-desc dungeon-record';
      record.textContent = `挑戦${rec.tries}回　踏破${rec.cleared}回　最高 B${rec.bestFloor}F`;
      box.append(record);
    }
    // 確かめの窓と同じ並び：左に［準備する］（主役）、右に［やめる］
    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    const go = document.createElement('button');
    go.textContent = '準備する';
    go.addEventListener('click', () => {
      this.dungeonId = d.id;
      this.dungeonView = null;
      this.render();
    });
    // ［やめる］も［準備する］と同じ楕円の宝石で、色は赤（注意）
    const cancel = document.createElement('button');
    cancel.className = 'danger';
    cancel.textContent = 'やめる';
    cancel.addEventListener('click', () => this.leave(() => (this.dungeonView = null)));
    buttons.append(go, cancel);
    box.append(buttons);
    return box;
  }

  /**
   * 仲間のタブ（H-02）。上に、連れていく仲間の数と顔（5つの枠）の1行と、検索・並べ替えの1行を固定して出す。
   * 一覧は飾りのない細い行（名前・Lv・HP・属性）。右の丸い印を押すと、連れていく・残すを切り替える。上の顔を押しても残せる
   */
  private cardRows(p: Profile): HTMLElement[] {
    const hand = this.handCards();
    const head = document.createElement('div');
    head.className = 'base-sort';
    const party = document.createElement('div');
    party.className = 'party-band slim';
    const label = document.createElement('span');
    label.className = 'party-label';
    label.textContent = '連れていく';
    const count = document.createElement('span');
    count.className = 'party-count';
    count.textContent = `${hand.length} / ${HAND_LIMIT}`;
    const text = document.createElement('div');
    text.className = 'party-head';
    text.append(label, count);
    const faces = document.createElement('div');
    faces.className = 'party-faces';
    for (let i = 0; i < HAND_LIMIT; i++) {
      const card = hand[i];
      const face = document.createElement('span');
      face.className = card ? 'face' : 'face empty';
      if (i >= SUMMON_LIMIT) face.classList.add('reserve');
      if (card) {
        face.append(faceElement(card.species.id, cardIcon(card)));
        face.classList.add('tap');
        face.setAttribute('role', 'button');
        face.setAttribute('aria-label', `${cardName(card)}を残す`);
        face.addEventListener('click', () => this.change(() => (p.hand = p.hand.filter((id) => id !== card.id))));
      } else face.textContent = '＋';
      faces.append(face);
    }
    party.append(text, faces);
    const list = this.searchList('cards', p.cards, cardSearchText, '種族・ニックネーム', (card) => {
      const taking = p.hand.includes(card.id);
      return allyRow(card, {
        on: taking,
        label: taking ? '残す' : '連れていく',
        disabled: !taking && hand.length >= HAND_LIMIT,
        onToggle: () =>
          this.change(() => {
            if (taking) p.hand = p.hand.filter((id) => id !== card.id);
            else p.hand.push(card.id);
          }),
        onSelect: () => this.enter(() => (this.viewing = card)),
      });
    });
    head.append(party, listTools(list.search, this.cardSortSelect(p)));
    return [head, list.list];
  }

  /**
   * 仲間のタブの上の切り替え［一覧］［配合］［転生］。配合できるようになったら［配合］に「NEW」を付ける
   */
  private allyModes(p: Profile, current: 'list' | 'fusion' | 'rebirth'): HTMLElement {
    const modes = document.createElement('div');
    modes.className = 'sort-keys shop-modes ally-modes';
    for (const [mode, label] of [['list', '一覧'], ['fusion', '配合'], ['rebirth', '転生']] as const) {
      const b = wideButton(label, false, () => {
        if (mode === current) return;
        if (mode === 'list') {
          this.go('allies');
          return;
        }
        this.fusionMode = mode;
        if (this.view === 'fusion') {
          this.parents = [];
          this.childFrom = 0;
          this.fusionNote = '';
          this.render();
        } else this.go('fusion');
      });
      if (mode === current) b.classList.add('on');
      if (mode === 'fusion') {
        const mark = this.badgeOf(p, 'fusion');
        if (mark) b.append(mark);
      }
      modes.append(b);
    }
    return modes;
  }

  /**
   * 仲間の並べ替えのボタン。「⇅ レベル↓ ▾」のように今の並べ方を出し、押すと選ぶ輪が出る（iPhone）。
   * 並べ替えると仲間の並びそのものが変わる。まだ並べ替えていないときは「⇅ 並べ替え」
   */
  private cardSortSelect(p: Profile): HTMLElement {
    const current = CARD_SORTS.findIndex((o) => o.key === this.cardSort?.key && o.desc === this.cardSort?.desc);
    return selectButton(
      current >= 0 ? CARD_SORTS[current].short : '並べ替え',
      CARD_SORTS.map((o) => o.label),
      current,
      (i) => {
        const { key, desc } = CARD_SORTS[i];
        this.cardSort = { key, desc };
        this.change(() => (p.cards = sortCards(p.cards, key, desc)));
      },
    );
  }

  /**
   * 配合（requirements.md 9.2・9.3）。上で［配合］［転生］を切り替える。
   * 配合：Lv10 以上の仲間を2体選び、子の種族を決めて合わせる。転生：イヅツチに Lv10 以上の魔物1体を合わせる。
   * 選ぶと、生まれる子（転生後のイヅツチ）の見込みと［配合する］を上に出す。合わせる前にもう一度聞く
   */
  private fusionRows(p: Profile): HTMLElement[] {
    const rebirthMode = this.fusionMode === 'rebirth';
    const book = rebirthMode ? REBIRTH_BOOK : FUSION_BOOK;
    const partner = p.cards.find(isPartner);
    const need = rebirthMode ? 1 : 2;
    // いなくなった仲間を選んだままにしない
    this.parents = this.parents.filter((c) => p.cards.includes(c) && canBeParent(c));
    const head = document.createElement('div');
    head.className = 'base-sort';
    const modes = this.allyModes(p, this.fusionMode);
    // 1回に使う数と、持っている数。書とルーンは絵で出す
    const cost = note('', 'fusion-cost');
    cost.append(
      '必要 ',
      chip(inlineArt(itemArt(book), ITEMS[book].emoji), `${ITEMS[book].name} 1（持っている ${bookCount(p, book)}）`),
      '　',
      chip(uiImage('ui_rune', 'inline-art'), `${FUSION_COST}（持っている ${p.runes}）`),
    );
    head.append(modes, cost);
    const out: HTMLElement[] = [head];
    if (this.fusionNote) out.push(note(this.fusionNote, 'done-note'));

    // 生まれる子の見込みと、合わせるボタン
    const ready = this.parents.length === need && (!rebirthMode || partner);
    if (ready) {
      const [a, b] = rebirthMode ? [partner!, this.parents[0]] : this.parents;
      out.push(this.fusionPreview(p, a, b, rebirthMode));
    } else {
      out.push(
        note(
          rebirthMode
            ? `イヅツチに合わせる魔物を1体選ぶ　Lv${FUSION_MIN_LEVEL}以上`
            : `親にする仲間を2体選ぶ　Lv${FUSION_MIN_LEVEL}以上`,
          'fusion-hint',
        ),
      );
    }
    // 配合で決めるのに要るもの：性格（子の性格の確率）と、配合・転生の回数（伸び）
    const fusionSub = (card: Card) =>
      `${PERSONALITIES[card.personality].name}　${rebirthMode && isPartner(card) ? '転生' : '配合'}${card.fusions ?? 0}回　${elementText(card.species.element)}`;
    if (rebirthMode && partner) {
      out.push(lineList([allyRow(partner, { on: true, sub: fusionSub(partner), onSelect: () => this.enter(() => (this.viewing = partner)) })]));
    }
    const choices = p.cards.filter(canBeParent);
    if (choices.length === 0) out.push(note(`Lv${FUSION_MIN_LEVEL}以上の仲間がいない`));
    else
      out.push(
        lineList(
          choices.map((card) => {
            const on = this.parents.includes(card);
            return allyRow(card, {
              on,
              label: on ? 'やめる' : '選ぶ',
              disabled: !on && this.parents.length >= need,
              sub: fusionSub(card),
              onToggle: () => {
                this.parents = on ? this.parents.filter((c) => c !== card) : [...this.parents, card];
                this.childFrom = 0;
                this.fusionNote = '';
                this.render(true);
              },
              onSelect: () => this.enter(() => (this.viewing = card)),
            });
          }),
        ),
      );
    return out;
  }

  /** 生まれる子（転生後のイヅツチ）の見込み。種族を選ぶボタン、足し算・伸び・性格の確率と、合わせるボタン */
  private fusionPreview(p: Profile, a: Card, b: Card, rebirthMode: boolean): HTMLElement {
    const box = document.createElement('div');
    box.className = 'fusion-preview';
    const fusions = rebirthMode ? (a.fusions ?? 0) + 1 : nextFusions(a, b);
    // 別の種族（組み合わせの表にある親の組だけ）。まだ生んだことのない種族は「？？？」と出す
    const other = rebirthMode ? null : otherSpecies(a.species, b.species);
    if (this.childFrom === 2 && !other) this.childFrom = 0;
    const fromOther = this.childFrom === 2 && other !== null;
    const unknown = fromOther && !p.bred.includes(other.id);
    const species = rebirthMode ? a.species : fromOther ? other : [a, b][this.childFrom].species;
    if (!rebirthMode) {
      // 子の種族：親1・親2・別の種族
      const pick = document.createElement('div');
      pick.className = 'sort-keys three';
      [a, b].forEach((parent, i) => {
        const btn = wideButton(parent.species.name, false, () => {
          this.childFrom = i;
          this.render(true);
        });
        if (this.childFrom === i) btn.classList.add('on');
        pick.append(btn);
      });
      const otherLabel = other ? (p.bred.includes(other.id) ? other.name : '？？？') : 'なし';
      const otherButton = wideButton(otherLabel, other === null, () => {
        this.childFrom = 2;
        this.render(true);
      });
      if (fromOther) otherButton.classList.add('on');
      pick.append(otherButton);
      box.append(note('生まれる子の種族', 'fusion-label'), pick);
    }
    const bonus = inheritedBonus(a, b);
    const nickname = rebirthMode ? a.nickname : fromOther ? undefined : [a, b][this.childFrom].nickname;
    const name = `${unknown ? '？？？' : nickname || species.name}+${fusions}`;
    box.append(
      renderRow({
        icon: unknown ? '？' : species.emoji,
        art: unknown ? undefined : species.id,
        name,
        sub: `Lv1　${rebirthMode ? '転生' : '配合'}${fusions}回`,
      }),
      table([
        [
          '足し算',
          [`HP+${bonus.maxHp}`, `攻撃+${bonus.atk}`, `防御+${bonus.def}`, `魔攻+${bonus.matk}`, `魔防+${bonus.mdef}`].map((t) => chip(t)),
        ],
        ['伸び', `×${growthRate(fusions).toFixed(2)}`],
      ]),
    );
    const problem = costProblem(p, rebirthMode ? REBIRTH_BOOK : FUSION_BOOK);
    const label = rebirthMode ? '転生する' : '配合する';
    const go = wideButton(problem ?? label, problem !== null, () => {
      const message = rebirthMode
        ? `${cardName(a)}はLv1に戻ります\n${cardName(b)}はいなくなります\n転生しますか？`
        : `${cardName(a)}と${cardName(b)}はいなくなります\n配合しますか？`;
      this.dialog.open(message, label, 'やめる', () =>
        this.change(() => {
          if (rebirthMode) {
            rebirth(p, a, b);
            this.fusionNote = `${cardName(a)}に転生した　性格：${PERSONALITIES[a.personality].name}`;
          } else {
            const child = fuse(p, a, b, species);
            this.fusionNote = `${cardName(child)}が生まれた　性格：${PERSONALITIES[child.personality].name}`;
          }
          this.parents = [];
          this.childFrom = 0;
        }),
        undefined,
        'confirm',
      );
    });
    go.classList.add('main');
    box.append(go);
    return box;
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
    const sort = this.sortSelect((by) => {
      if (bag) p.bag = sortStock(p.bag, by);
      else p.warehouse = sortStock(p.warehouse, by);
    });
    head.append(
      placeTabs(
        this.itemPlace,
        { bag: `🎒 バッグ ${p.bag.length}/${BAG_LIMIT}`, warehouse: `📦 倉庫 ${p.warehouse.length}/${WAREHOUSE_LIMIT}` },
        (place) => {
          this.itemPlace = place;
          this.render();
        },
      ),
    );
    // 選んでいる並べ方で出す（あとから入れた道具も、その並びに入る）
    const groups = groupItems(sortStock(from, this.itemSort));
    if (groups.length === 0) {
      head.append(listTools(sort));
      return [head, note(bag ? 'バッグは空' : '倉庫は空')];
    }
    const list = this.searchList(
      this.itemPlace,
      groups,
      (g) => `${g.name} ${ITEMS[g.items[0].kind].kana} ${itemCategory(g.items[0].kind)}`,
      '名前・種類',
      (g) => {
        const first = g.items[0];
        // 矢は本数を足して出す
        const tag = ITEMS[first.kind].arrow
          ? `${g.items.reduce((n, i) => n + (i.count ?? 0), 0)}本`
          : g.items.length > 1
            ? `×${g.items.length}`
            : undefined;
        const name = ITEMS[first.kind].arrow ? ITEMS[first.kind].name : g.name;
        return this.itemRow(first, bag ? '倉庫へ送る' : 'バッグへ入れる', full, () => move(first, from, to), name, tag);
      },
    );
    head.append(listTools(list.search, sort));
    return [head, list.list];
  }

  private itemRow(item: Item, label: string, disabled: boolean, onClick: () => void, name = itemName(item), tag?: string): HTMLElement {
    const pouch = ITEMS[item.kind].pouch !== undefined && this.pouch !== item;
    // 押すと説明を見られる。袋は中を見られる
    return renderLine({
      icon: ITEMS[item.kind].emoji,
      art: itemArt(item.kind),
      name,
      tag,
      sub: itemEffect(item),
      button: { label, disabled, onClick: () => this.change(onClick) },
      onSelect: () => this.enter(() => (pouch ? (this.pouch = item) : (this.itemView = { kind: item.kind, item }))),
    });
  }

  /** 道具の説明。絵と名前、使い方まで書いた説明。下の［戻る］で一覧へ */
  private itemDetail(kind: ItemKind, item?: Item): HTMLElement {
    const box = document.createElement('div');
    box.className = 'item-detail';
    const art = document.createElement('span');
    art.className = 'item-detail-art';
    art.append(inlineArt(itemArt(kind), ITEMS[kind].emoji));
    const name = document.createElement('p');
    name.className = 'item-detail-name';
    name.textContent = item ? itemName(item) : ITEMS[kind].name;
    const desc = document.createElement('p');
    desc.className = 'item-detail-desc';
    setRichText(desc, item ? itemDesc(item) : ITEMS[kind].desc);
    box.append(art, name, desc);
    return box;
  }

  /** 袋の中。［出す］でバッグへ、バッグの道具は［しまう］で袋へ */
  private pouchRows(p: Profile, pouch: Item): HTMLElement[] {
    const contents = pouch.contents ?? [];
    const room = contents.length < (pouch.capacity ?? 0);
    const holy = ITEMS[pouch.kind].pouch?.holy ? '\n力つきても中の道具は失わない' : '';
    const inside = sortItems(contents, 'kind').map((item) =>
      this.itemRow(item, 'バッグへ', p.bag.length >= BAG_LIMIT, () => {
        pouch.contents = contents.filter((i) => i !== item);
        p.bag.push(item);
      }),
    );
    // バッグの道具は、持ち物と同じく同じ道具を1行にまとめる（［しまう］は1つずつ）
    const outside = groupItems(sortItems(p.bag, 'kind').filter((i) => i !== pouch && !ITEMS[i.kind].pouch)).map((g) =>
      this.itemRow(g.items[0], 'しまう', !room, () => move(g.items[0], p.bag, contents), g.name, g.items.length > 1 ? `×${g.items.length}` : undefined),
    );
    return [
      withArt(note(`${itemName(pouch)}${holy}`, 'base-section'), inlineArt(itemArt(pouch.kind), ITEMS[pouch.kind].emoji)),
      inside.length > 0 ? lineList(inside) : note('袋は空'),
      note('バッグからしまう', 'base-section'),
      outside.length > 0 ? lineList(outside) : note('しまえる道具がない'),
    ];
  }

  /** 並べ替えのボタン。押すと種類順・名前順・個数順から選べる（iPhone では下に選ぶ輪が出る） */
  private sortSelect(sort: (by: ItemSortKey) => void): HTMLElement {
    return selectButton(
      ITEM_SORT_LABEL[this.itemSort],
      ITEM_SORT_KEYS.map((key) => ITEM_SORT_LABEL[key]),
      ITEM_SORT_KEYS.indexOf(this.itemSort),
      (i) => {
        this.itemSort = ITEM_SORT_KEYS[i];
        this.change(() => sort(this.itemSort));
      },
    );
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
    const done = this.shopNote ? [note(this.shopNote, 'done-note')] : [];
    const rows = this.shopMode === 'buy' ? this.buyRows(p, head) : this.sellRows(p, head);
    const list = rows.length > 0 && rows.every((r) => r.classList.contains('line-row')) ? [lineList(rows)] : rows;
    return [head, ...done, ...list];
  }

  /** 選んでいる数と、知らせを消す */
  private clearShop(): void {
    this.buyCount.clear();
    this.sellCount.clear();
    this.countError = null;
    this.shopNote = '';
  }

  /**
   * 買う品の一覧。棚の品を1つずつ1行に出す（薬草とパンは2つずつ並ぶので2行）。どの行も［＋］は1までで、
   * ルーン・送り先の空き・ほかの行で選んだ分から、買えない行は暗くする
   */
  private buyRows(p: Profile, head: HTMLElement): HTMLElement[] {
    const to = this.buyTo === 'bag' ? p.bag : p.warehouse;
    const room = (this.buyTo === 'bag' ? BAG_LIMIT : WAREHOUSE_LIMIT) - to.length;
    // 棚の1つずつに番号（棚の並びの位置）を付け、種類順（道具の表の順）に並べる
    const order = Object.keys(ITEMS);
    const shelf = p.shopStock
      .map((kind, slot) => ({ kind, slot }))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.slot - b.slot);
    const picked = shelf.filter((s) => (this.buyCount.get(s.slot) ?? 0) > 0);
    const count = picked.length;
    const total = picked.reduce((n, s) => n + buyPrice(s.kind), 0);
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
    // 下のボタンでまとめて買う
    this.shopAction = {
      label: count > 0 ? `${count}個を買う　💠${total}` : '買う品を選ぶ',
      disabled: count === 0,
      delta: -total,
      run: () =>
        this.change(() => {
          for (const s of picked) buy(p, s.kind, this.buyTo);
          this.shopNote = `${count}個を買って ${this.buyTo === 'bag' ? 'バッグ' : '倉庫'}へ送った`;
          this.buyCount.clear();
          this.countError = null;
        }),
    };
    if (shelf.length === 0) return [note('棚は空（ダンジョンから戻ると並べ直す）')];
    return shelf.map(({ kind, slot }) => {
      const n = this.buyCount.get(slot) ?? 0;
      // ほかの行で選んだ分を引いて、この行を買えるか（どの行も1つまで）
      const otherRunes = total - buyPrice(kind) * n;
      const otherCount = count - n;
      const max = Math.max(0, Math.min(1, Math.floor((p.runes - otherRunes) / buyPrice(kind)), room - otherCount));
      const key = `buy:${slot}`;
      // 買えない品（ルーンが足りない・送り先がいっぱい）は、行を暗くして［＋］を押せなくする
      const blocked = max === 0 && n === 0;
      const error = this.countError === key;
      return renderLine({
        icon: ITEMS[kind].emoji,
        art: itemArt(kind),
        name: ITEMS[kind].name,
        tag: `💠${buyPrice(kind)}${error ? ` ${max}個まで` : ''}`,
        tagError: error,
        sub: kindEffect(kind),
        on: n > 0,
        className: blocked ? 'blocked' : undefined,
        right: this.stepper(key, n, max, (v) => this.buyCount.set(slot, v)),
        onSelect: () => this.enter(() => (this.itemView = { kind })),
      });
    });
  }

  /** 売る道具の一覧。バッグと倉庫を切り替え、同じ道具はまとめる */
  private sellRows(p: Profile, head: HTMLElement): HTMLElement[] {
    const from = this.sellFrom === 'bag' ? p.bag : p.warehouse;
    const groups = groupItems(sortItems(from, 'kind'), true);
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
    // 下のボタンでまとめて売る
    this.shopAction = {
      label: picked.length > 0 ? `${picked.length}個を売る　💠${total}` : '売る品を選ぶ',
      disabled: picked.length === 0,
      delta: total,
      run: () =>
        this.change(() => {
          const got = sell(p, picked);
          this.sellCount.clear();
          this.countError = null;
          this.shopNote = `${picked.length}個を売って 💠${got} を得た`;
        }),
    };
    head.append(places);
    const sellRow = (g: ItemGroup): HTMLElement => {
      const first = g.items[0];
      const ok = canSell(first);
      const n = this.sellCount.get(g.key) ?? 0;
      const max = g.items.length;
      const why = ITEMS[first.kind].pouch && (first.contents?.length ?? 0) > 0 ? '中の道具を出すと売れる' : '売れない';
      const key = `sell:${g.key}`;
      // 売れる数は「×3」で分かる。打ち込んだ数が多すぎたときは「3個まで」を赤で出す
      const error = this.countError === key;
      return renderLine({
        icon: ITEMS[first.kind].emoji,
        art: itemArt(first.kind),
        name: g.name,
        tag: error ? `${max}個まで` : max > 1 ? `×${max}` : undefined,
        tagError: error,
        sub: ok ? `${first.count !== undefined ? '1束' : '1つ'} 💠${sellPrice(first)}` : why,
        on: n > 0,
        className: !ok ? 'blocked' : undefined,
        button: ok ? undefined : { label: '売れない', disabled: true, onClick: () => {} },
        right: ok ? this.stepper(key, n, max, (v) => this.sellCount.set(g.key, v)) : undefined,
        onSelect: () => this.enter(() => (this.itemView = { kind: first.kind, item: first })),
      });
    };
    return groups.length > 0 ? groups.map(sellRow) : [note(this.sellFrom === 'bag' ? 'バッグは空' : '倉庫は空')];
  }

  /**
   * 数を選ぶ［－］数［＋］。数を押すと、じかに打ち込める。
   * 打ち込んだ数が max をこえたら、数は変えずに「n個まで…」を赤で出す
   */
  private stepper(key: string, value: number, max: number, set: (v: number) => void): HTMLElement {
    return countStepper(
      value,
      max,
      (v) => {
        this.countError = null;
        set(v);
        this.render(true);
      },
      () => {
        this.countError = key;
        this.render(true);
      },
    );
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
        icon: p.cleared.includes(d.id) ? '🏆' : '⚔️',
        art: p.cleared.includes(d.id) ? 'icon_ui_cleared' : 'icon_ui_open',
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
        ['魔攻', `${b.matk}`],
        ['魔防', `${b.mdef}`],
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
    // 覚えている魔法だけを出す。仲間を召喚している間だけ使える魔法と、まだ読んでいない魔導書の魔法は出さない。
    // ＋値はダンジョンの間だけなので、拠点ではいつも無印
    const rows: SheetRow[] = [
      { icon: SPELL_ICONS.fire, name: SPELLS.fire.name, sub: `${spellEffect('fire', 0)}　最初から使える` },
      ...[...ATTACK_SPELLS, ...BUFF_SPELLS]
        .filter((id) => p.learned.includes(id))
        .map((id) => ({ icon: SPELL_ICONS[id], art: SPELL_ART[id], name: SPELLS[id].name, sub: spellEffect(id, 0) })),
    ];
    return [
      note(`魔導書を読むと覚え、もう一度読むと+${SPELL_MAX_RANK}まで強くなる。強さはそのダンジョンの間だけ`),
      ...rows.map(renderRow),
    ];
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
    setRichText(b, labels[place]);
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

/**
 * 仲間の1行（1行の形）。名前と Lv を大きく、その下に sub（なければ HP と属性）を小さく出す。
 * onToggle があれば右に丸い印を置き、印を押すと onToggle。行を押すと onSelect（つよさ）
 */
function allyRow(
  card: Card,
  opts: { on: boolean; label?: string; disabled?: boolean; onToggle?: () => void; onSelect?: () => void; sub?: string },
): HTMLElement {
  let right: HTMLElement | undefined;
  if (opts.onToggle) {
    const check = document.createElement('button');
    check.className = opts.on ? 'check on' : 'check';
    check.setAttribute('aria-label', opts.label ?? '');
    check.disabled = opts.disabled ?? false;
    check.addEventListener('click', opts.onToggle);
    right = check;
  }
  return renderLine({
    icon: cardIcon(card),
    face: card.species.id,
    name: cardName(card),
    tag: `Lv${card.level}`,
    sub: opts.sub ?? `HP${card.maxHp}　${elementText(card.species.element)}`,
    on: opts.on,
    className: 'ally',
    right,
    onSelect: opts.onSelect,
  });
}

/** 検索で比べる形。全角・半角をそろえ、ひらがなはカタカナに、英字は小文字にする */
function searchKey(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** 仲間を探すときの文字。種族の名前とニックネーム */
const cardSearchText = (card: Card) => `${card.species.name} ${card.nickname ?? ''}`;

/** Safari の上のバーの色。拠点は村の絵の空の色、ダンジョンは上の帯の紺 */
const BAR_BASE = '#a3defb';
const BAR_DUNGEON = '#1a2747';

function setBarColor(color: string): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

/** 知らせの印。'new' は角に掛けた「NEW」のリボン（絵）、'dot' は赤い丸の「！」 */
function badge(kind: 'new' | 'dot'): HTMLElement {
  const el = document.createElement('span');
  el.className = `badge ${kind}`;
  if (kind === 'dot') el.textContent = '！';
  else el.setAttribute('aria-label', 'NEW');
  return el;
}

/** 文の中に置く小さな絵。絵がなければ絵文字 */
function inlineArt(id: string | undefined, emoji: string): HTMLElement {
  return id ? artElement(id, emoji, 'inline-art') : Object.assign(document.createElement('span'), { textContent: emoji });
}

/** 文の頭に絵を足す */
function withArt(el: HTMLElement, art: HTMLElement): HTMLElement {
  el.prepend(art, ' ');
  return el;
}

/** UIの絵（public/art/<name>.png） */
function uiImage(name: string, className = ''): HTMLImageElement {
  const img = document.createElement('img');
  img.src = `art/${name}.png`;
  img.alt = '';
  img.draggable = false;
  if (className) img.className = className;
  return img;
}

/** 名前と値を2列に並べた表 */
function table(rows: [string, string | HTMLElement[]][]): HTMLElement {
  const dl = document.createElement('dl');
  dl.className = 'status-table base-table';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    if (typeof v === 'string') setRichText(dd, v);
    else dd.append(...v);
    dl.append(dt, dd);
  }
  return dl;
}

/** 途中で折り返さない言葉のかたまり（「防御+1」「がんばりや 7.5％」など）。行が足りなければ、かたまりごと次の行へ送る */
function chip(...parts: (string | Node)[]): HTMLElement {
  const el = document.createElement('span');
  el.className = 'chip';
  el.append(...parts);
  return el;
}

function move(item: Item, from: Item[], to: Item[]): void {
  from.splice(from.indexOf(item), 1);
  to.push(item);
}

function note(text: string, className = 'sheet-note'): HTMLElement {
  const el = document.createElement('p');
  el.className = className === 'sheet-note' ? 'sheet-note' : `sheet-note ${className}`;
  setRichText(el, text);
  return el;
}

type CardSortKey = 'level' | 'obtained' | 'name' | 'kind';
/** 仲間の並べ方。short はボタンに、label は選ぶ輪に出す */
const CARD_SORTS: { key: CardSortKey; desc: boolean; short: string; label: string }[] = [
  { key: 'level', desc: true, short: 'レベル↓', label: 'レベルの高い順' },
  { key: 'level', desc: false, short: 'レベル↑', label: 'レベルの低い順' },
  { key: 'obtained', desc: true, short: '入手↓', label: '新しく仲間にした順' },
  { key: 'obtained', desc: false, short: '入手↑', label: '前に仲間にした順' },
  { key: 'name', desc: false, short: '名前↑', label: '名前（あ→ん）' },
  { key: 'name', desc: true, short: '名前↓', label: '名前（ん→あ）' },
  { key: 'kind', desc: false, short: '種類↑', label: '種類（図鑑の順）' },
  { key: 'kind', desc: true, short: '種類↓', label: '種類（図鑑の逆）' },
];

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
    name: (a, b) => cardName(a).localeCompare(cardName(b), 'ja'),
    kind: (a, b) => kind(a) - kind(b),
  };
  const sign = desc ? -1 : 1;
  return [...cards].sort((a, b) => sign * (by[key](a, b) || a.id - b.id));
}
