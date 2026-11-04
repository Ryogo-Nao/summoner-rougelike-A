import { HAND_LIMIT, PERSONALITIES, STAT_LABEL, SUMMON_LIMIT, isPartner, type Card } from '../game/cards';
import { BAG_LIMIT, ITEMS, PLUS_LIMIT, SHORTCUT_LABELS, itemName, type Item } from '../game/items';
import { ORDER_LABEL, type Ally, type AllyOrder } from '../game/cards';
import { SPELLS, guardRate, powerRate, type GameState, type SpellId } from '../game/state';
import { Sheet, wideButton, type SheetRow } from './sheet';
import type { Settings } from './settings';
import { statusView } from './status';

/** 一覧から行動したあとに呼ぶ（再描画、力つきたかの確認など） */
type AfterAction = () => void;

const STATUS_LABEL: Record<Card['status'], string> = {
  ready: '待機',
  summoned: '召喚中',
  dying: '瀕死',
};

export const cardIcon = (card: Card) => (isPartner(card) ? '⚡🐈' : card.species.emoji);

export function cardSub(card: Card, status = true): string {
  const line2 = [`MP${card.species.cost}`, ...(status ? [STATUS_LABEL[card.status]] : []), PERSONALITIES[card.personality].name];
  return `Lv${card.level}　HP${card.hp}/${card.maxHp}　攻撃${card.atk}　防御${card.def}\n${line2.join('　')}`;
}

/** 性格の説明。上がる能力と下がる能力 */
export function personalityText(card: Card): string {
  const { name, up, down } = PERSONALITIES[card.personality];
  const stats = up && down ? `（${STAT_LABEL[up]}↑ ${STAT_LABEL[down]}↓）` : '';
  return `性格：${name}${stats}`;
}

/** カード画面（requirements.md 10.3）。待機は「召喚」、召喚中は「戻す」。召喚できないカードは薄く出す */
export function openCardSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const act = (f: () => void) => () => {
    sheet.close();
    f();
    after();
  };
  const back = () => openCardSheet(state, sheet, after);
  const rows: SheetRow[] = state.cards.map((card) => {
    const onSelect = () => openStatusSheet(state, sheet, card, back);
    if (card.status === 'summoned') {
      return {
        icon: cardIcon(card),
        name: card.species.name,
        sub: cardSub(card),
        button: { label: '戻す', onClick: act(() => state.recall(card)) },
        onSelect,
      };
    }
    const problem = state.summonProblem(card);
    return {
      icon: cardIcon(card),
      name: card.species.name,
      sub: cardSub(card),
      dim: problem !== null,
      button: { label: '召喚', disabled: problem !== null, onClick: act(() => state.summon(card)) },
      onSelect,
    };
  });
  sheet.open(`カード ${state.cards.length}/${HAND_LIMIT}`, rows, {
    note: `召喚 ${state.allies.length}/${SUMMON_LIMIT}　MP ${state.player.mp}\nカードを押すとつよさを見る`,
  });
}

/** 仲間のつよさ。back は［戻る］で開き直す一覧 */
export function openStatusSheet(state: GameState, sheet: Sheet, card: Card, back: () => void): void {
  const ally = state.allies.find((a) => a.card === card);
  const footer = document.createElement('div');
  footer.append(statusView(card, { ally, inDungeon: true }), wideButton('戻る', false, back));
  sheet.open('つよさ', [], { footer });
}

/** 魔法の一覧。選ぶと、向いている方向（雷はまわり）に使う */
export function openMagicSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const p = state.player;
  const rows: SheetRow[] = state.availableSpells().map((id) => {
    const spell = SPELLS[id];
    const enough = p.mp >= spell.mp;
    const effect: Record<SpellId, string> = {
      fire: `正面の敵に${10 + p.level * 2}`,
      thunder: `周りの敵に${6 + p.level}`,
      power: `20ターン攻撃力×${powerRate(state.rankOf('power'))}`,
      guard: `20ターン受けるダメージ×${guardRate(state.rankOf('guard'))}`,
      bigFire: `前方3マス幅の敵に${20 + p.level * 2}`,
    };
    return {
      icon: SPELL_ICONS[id],
      name: state.rankOf(id) > 0 ? `${spell.label}+${state.rankOf(id)}` : spell.label,
      sub: `MP${spell.mp}　${effect[id]}`,
      dim: !enough,
      button: {
        label: '使う',
        disabled: !enough,
        onClick: () => {
          sheet.close();
          state.cast(id);
          after();
        },
      },
    };
  });
  sheet.open('魔法', rows, { note: `MP ${p.mp}/${p.maxMp}` });
}

export const SPELL_ICONS: Record<SpellId, string> = { fire: '🔥', thunder: '⚡', power: '💪', guard: '🧱', bigFire: '☄️' };

/** バッグの一覧。選ぶと、そのアイテムでできること（使う・投げる・置く）を出す */
export function openBagSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const p = state.player;
  const rows: SheetRow[] = state.bag.map((item) => ({
    icon: ITEMS[item.kind].emoji,
    name: state.isEquipped(item) ? `${itemName(item)}（装備中）` : itemName(item),
    sub: ITEMS[item.kind].desc,
    button: { label: '選ぶ', onClick: () => openItemSheet(state, sheet, item, after) },
  }));
  const buffs = [p.powerTurns > 0 ? `力${p.powerTurns}T` : '', p.guardTurns > 0 ? `守り${p.guardTurns}T` : '']
    .filter((b) => b)
    .join('　');
  const sort = document.createElement('div');
  sort.className = 'sheet-pair';
  sort.append(
    wideButton('種類順に並べる', false, () => {
      state.sortBag('kind');
      openBagSheet(state, sheet, after);
    }),
    wideButton('名前順に並べる', false, () => {
      state.sortBag('name');
      openBagSheet(state, sheet, after);
    }),
  );
  sheet.open(`バッグ ${state.bag.length}/${BAG_LIMIT}`, rows, {
    note: `攻撃力${state.attackPower()}　防御力${state.defensePower()}${buffs ? `　${buffs}` : ''}`,
    header: sort,
  });
}

/**
 * 足もとのアイテム。足踏みしたときに開く。詳しい説明を見て、使う・投げる・拾う・バッグのアイテムと入れ替えるを選ぶ。
 * どれも1ターン。足踏みすることもできる
 */
export function openFloorSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const item = state.itemUnderfoot();
  if (!item) return;
  const def = ITEMS[item.kind];
  const act = (f: () => void) => () => {
    sheet.close();
    f();
    after();
  };
  const buttons = document.createElement('div');
  const preview = state.equipPreview(item);
  if (preview) buttons.append(statChange(preview, '装備すると'));
  const use = useButton(state, sheet, item, after, () => openFloorSheet(state, sheet, after));
  if (use) buttons.append(use);
  // 矢は撃つのと投げるのが同じなので、投げるは出さない
  if (!def.arrow) buttons.append(wideButton('投げる（向いている方向）', false, act(() => state.throwItem(item))));
  const full = !state.canPickUp(item);
  buttons.append(wideButton(full ? 'バッグがいっぱいで拾えない' : '拾う', full, act(() => state.pickUpHere())));
  buttons.append(
    wideButton('バッグの道具と入れ替える', state.bag.length === 0, () => openFloorSwapSheet(state, sheet, after)),
  );
  buttons.append(wideButton('足踏みする', false, act(() => state.wait())));
  sheet.open(`足元：${def.emoji} ${itemName(item)}`, [], { note: def.desc, footer: buttons });
}

/**
 * 登録した道具を使う（［攻撃］の長押し）。選ぶものがある道具は、選ぶ画面を出す。
 * 使えないときは、その理由をログに出す（ターンは使わない）
 */
export function useShortcut(state: GameState, sheet: Sheet, slot: number, after: AfterAction): void {
  const item = state.shortcutItem(slot);
  if (!item) return;
  const problem = state.useProblem(item);
  if (problem) {
    state.addLog(problem);
    after();
    return;
  }
  startUse(state, sheet, item, after, () => sheet.close());
}

/** 使い始める。印・錬金釜は選ぶ画面を出し、それ以外はすぐ使う */
function startUse(state: GameState, sheet: Sheet, item: Item, after: AfterAction, back: () => void): void {
  const seal = ITEMS[item.kind].seal;
  if (item.kind === 'pot') {
    openPotSheet(state, sheet, item, after, back);
  } else if (seal === 'revive' || seal === 'summon') {
    openSealTargetSheet(state, sheet, item, after, back);
  } else {
    sheet.close();
    state.useItem(item);
    after();
  }
}

/** 袋の中。出すとバッグへ、［道具をしまう］でバッグの道具を入れる。どちらも1ターン */
function openPouchSheet(state: GameState, sheet: Sheet, pouch: Item, after: AfterAction): void {
  const contents = pouch.contents ?? [];
  const full = state.bag.length >= BAG_LIMIT;
  const rows: SheetRow[] = contents.map((item) => ({
    icon: ITEMS[item.kind].emoji,
    name: itemName(item),
    sub: ITEMS[item.kind].desc,
    button: {
      label: '出す',
      disabled: full,
      onClick: () => {
        sheet.close();
        state.takeFromPouch(pouch, item);
        after();
      },
    },
  }));
  const footer = document.createElement('div');
  footer.className = 'sheet-pair';
  const room = contents.length < (pouch.capacity ?? 0);
  footer.append(
    wideButton(room ? '道具をしまう' : 'いっぱい', !room || state.pouchable(pouch).length === 0, () =>
      openPouchPutSheet(state, sheet, pouch, after),
    ),
    wideButton('戻る', false, () => openItemSheet(state, sheet, pouch, after)),
  );
  const lines = [
    contents.length === 0 ? '中は空' : full ? 'バッグがいっぱいで出せない' : '',
    ITEMS[pouch.kind].pouch?.holy ? '力つきても中の道具は失わない' : '',
  ];
  sheet.open(`${ITEMS[pouch.kind].emoji} ${itemName(pouch)}`, rows, {
    note: lines.filter(Boolean).join('\n'),
    footer,
  });
}

/** 袋にしまう道具を選ぶ */
function openPouchPutSheet(state: GameState, sheet: Sheet, pouch: Item, after: AfterAction): void {
  const rows: SheetRow[] = state.pouchable(pouch).map((item) => ({
    icon: ITEMS[item.kind].emoji,
    name: state.isEquipped(item) ? `${itemName(item)}（装備中）` : itemName(item),
    sub: ITEMS[item.kind].desc,
    button: {
      label: 'しまう',
      onClick: () => {
        sheet.close();
        state.putInPouch(pouch, item);
        after();
      },
    },
  }));
  sheet.open(`${itemName(pouch)}にしまう`, rows, {
    note: '袋は袋にしまえない',
    footer: wideButton('戻る', false, () => openPouchSheet(state, sheet, pouch, after)),
  });
}

/** 道具を［攻撃］の長押しの枠に登録する。種類で登録するので、なくなっても同じ種類を使う */
function openRegisterSheet(state: GameState, sheet: Sheet, item: Item, after: AfterAction): void {
  const kind = item.kind;
  const rows: SheetRow[] = SHORTCUT_LABELS.map((label, slot) => {
    const there = state.shortcuts[slot];
    const mine = there === kind;
    return {
      icon: there ? ITEMS[there].emoji : '',
      name: label,
      sub: there ? ITEMS[there].name : '空き',
      button: {
        label: mine ? '外す' : '登録',
        onClick: () => {
          state.setShortcut(slot, mine ? null : kind);
          openRegisterSheet(state, sheet, item, after);
        },
      },
    };
  });
  sheet.open(`${ITEMS[kind].emoji} ${ITEMS[kind].name}を登録`, rows, {
    note: '［攻撃］を長押しして\n登録した枠の方へ指を滑らせると使える',
    footer: wideButton('戻る', false, () => openItemSheet(state, sheet, item, after)),
  });
}

/**
 * ［使う］などのボタン。選ぶものがある道具は、選ぶ画面を出す
 * （復活の印・召喚の印は仲間、錬金釜は装備）。back は選ぶ画面の［戻る］で開き直す画面
 */
function useButton(state: GameState, sheet: Sheet, item: Item, after: AfterAction, back: () => void): HTMLElement | null {
  const label = state.useLabel(item);
  if (!label) return null;
  const problem = state.useProblem(item);
  return wideButton(problem ?? label, problem !== null, () => startUse(state, sheet, item, after, back));
}

/** 復活の印・召喚の印を使う仲間を選ぶ */
function openSealTargetSheet(state: GameState, sheet: Sheet, item: Item, after: AfterAction, back: () => void): void {
  const revive = ITEMS[item.kind].seal === 'revive';
  const cards = revive ? state.reviveTargets() : state.summonTargets();
  const rows: SheetRow[] = cards.map((card) => ({
    icon: cardIcon(card),
    name: card.species.name,
    sub: cardSub(card),
    button: {
      label: revive ? '復活させる' : '召喚する',
      onClick: () => {
        sheet.close();
        state.useItem(item, card);
        after();
      },
    },
  }));
  sheet.open(`${ITEMS[item.kind].name}を使う仲間`, rows, {
    note: revive ? 'HP半分で戻る' : 'MPを使わずに召喚する',
    footer: wideButton('戻る', false, back),
  });
}

/** 錬金釜。強くする装備を選び、次に合わせる同じ名前の装備を選ぶ */
function openPotSheet(state: GameState, sheet: Sheet, pot: Item, after: AfterAction, back: () => void, base?: Item): void {
  const label = (i: Item) => (state.isEquipped(i) ? `${itemName(i)}（装備中）` : itemName(i));
  if (!base) {
    const rows: SheetRow[] = state.potBases().map((item) => ({
      icon: ITEMS[item.kind].emoji,
      name: label(item),
      sub: ITEMS[item.kind].desc,
      button: { label: '選ぶ', onClick: () => openPotSheet(state, sheet, pot, after, back, item) },
    }));
    sheet.open('錬金釜：1つ目の装備', rows, {
      note: '同じ名前の装備を2つ合わせる\n大きいほうの＋に＋1（最大+10）',
      footer: wideButton('戻る', false, back),
    });
    return;
  }
  const rows: SheetRow[] = state.potPartners(base).map((other) => {
    const plus = Math.min(PLUS_LIMIT, Math.max(base.plus ?? 0, other.plus ?? 0) + 1);
    return {
      icon: ITEMS[other.kind].emoji,
      name: label(other),
      sub: `合わせると ${ITEMS[base.kind].name}+${plus}`,
      button: {
        label: '合わせる',
        onClick: () => {
          sheet.close();
          state.alchemy(pot, base, other);
          after();
        },
      },
    };
  });
  sheet.open(`錬金釜：${itemName(base)}と合わせる`, rows, {
    note: '合わせた装備は1つになる\n装備しているほうが残る',
    footer: wideButton('戻る', false, () => openPotSheet(state, sheet, pot, after, back)),
  });
}

/** 足もとのアイテムと入れ替える、バッグのアイテムを選ぶ */
function openFloorSwapSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const floor = state.itemUnderfoot();
  if (!floor) return;
  const rows: SheetRow[] = state.bag.map((item) => ({
    icon: ITEMS[item.kind].emoji,
    name: state.isEquipped(item) ? `${itemName(item)}（装備中）` : itemName(item),
    sub: ITEMS[item.kind].desc,
    button: {
      label: '入れ替える',
      onClick: () => {
        sheet.close();
        state.swapWithFloor(item);
        after();
      },
    },
  }));
  const back = wideButton('戻る', false, () => openFloorSheet(state, sheet, after));
  sheet.open(`${ITEMS[floor.kind].emoji} ${itemName(floor)}と入れ替える`, rows, {
    note: '選んだ道具を足元に置いて拾う',
    footer: back,
  });
}

/** アイテム1つでできること。白紙カードは投げるだけ。投げるのは向いている方向 */
function openItemSheet(state: GameState, sheet: Sheet, item: Item, after: AfterAction): void {
  const def = ITEMS[item.kind];
  const act = (f: () => void) => () => {
    sheet.close();
    f();
    after();
  };
  const buttons = document.createElement('div');
  const preview = state.equipPreview(item);
  if (preview) buttons.append(statChange(preview));
  const use = useButton(state, sheet, item, after, () => openItemSheet(state, sheet, item, after));
  if (use) buttons.append(use);
  if (def.pouch) buttons.append(wideButton('中を見る', false, () => openPouchSheet(state, sheet, item, after)));
  if (!def.arrow) buttons.append(wideButton('投げる（向いている方向）', false, act(() => state.throwItem(item))));
  if (state.canRegister(item)) {
    const slot = state.shortcuts.indexOf(item.kind);
    const label = slot >= 0 ? `登録する（${SHORTCUT_LABELS[slot]}に登録中）` : '登録する';
    buttons.append(wideButton(label, false, () => openRegisterSheet(state, sheet, item, after)));
  }
  const underfoot = state.itemUnderfoot();
  if (underfoot) {
    // 足もとに道具があれば、置く代わりに入れ替える
    const name = itemName(underfoot);
    buttons.append(wideButton(`足元の${name}と入れ替える`, false, act(() => state.swapWithFloor(item))));
  } else {
    const dropProblem = state.dropProblem();
    buttons.append(wideButton(dropProblem ?? '置く', dropProblem !== null, act(() => state.dropItem(item))));
  }
  buttons.append(wideButton('戻る', false, () => openBagSheet(state, sheet, after)));
  sheet.open(`${def.emoji} ${itemName(item)}`, [], { note: def.desc, footer: buttons });
}

/** 「攻撃力 5 → 9 ↑4」。上がるなら緑、下がるなら赤で出す */
function statChange(
  { stat, before, after }: { stat: string; before: number; after: number },
  lead = '',
): HTMLElement {
  const el = document.createElement('p');
  el.className = 'stat-change';
  el.textContent = `${lead ? `${lead}　` : ''}${stat} ${before} → ${after} `;
  const diff = document.createElement('span');
  if (after > before) {
    diff.className = 'up';
    diff.textContent = `↑${after - before}`;
  } else if (after < before) {
    diff.className = 'down';
    diff.textContent = `↓${before - after}`;
  } else {
    diff.textContent = '変化なし';
  }
  el.append(diff);
  return el;
}

/** メニュー。設定を切り替えると、その場で一覧を開き直して今の状態を見せる */
export function openMenuSheet(state: GameState, sheet: Sheet, settings: Settings, onChange: () => void): void {
  const reopen = () => openMenuSheet(state, sheet, settings, onChange);
  const rows: SheetRow[] = [
    {
      icon: '↻',
      name: 'タップで振り向く',
      sub: state.turnFirst
        ? '1回目で向く\n2回目で進む'
        : 'すぐ進む',
      button: {
        label: state.turnFirst ? 'オン' : 'オフ',
        onClick: () => {
          state.turnFirst = !state.turnFirst;
          onChange();
          reopen();
        },
      },
    },
    {
      icon: '🔁',
      name: '仲間のいるマスへ進む',
      sub: state.allyMove === 'swap' ? '仲間と入れ替わる' : '仲間を1マス押し出す\n押せないときは入れ替わる',
      button: {
        label: state.allyMove === 'swap' ? '入れ替わる' : '押す',
        onClick: () => {
          state.allyMove = state.allyMove === 'swap' ? 'push' : 'swap';
          onChange();
          reopen();
        },
      },
    },
    {
      icon: '🎮',
      name: 'パッドの位置',
      sub: settings.padSide === 'left' ? '左にパッド\n右にボタン' : '右にパッド\n左にボタン',
      button: {
        label: settings.padSide === 'left' ? '左' : '右',
        onClick: () => {
          settings.padSide = settings.padSide === 'left' ? 'right' : 'left';
          onChange();
          reopen();
        },
      },
    },
  ];
  sheet.open('メニュー', rows, {
    note: '攻撃は［攻撃］ボタンで\n方向を押し続けるとダッシュ\n隣の仲間をタップすると入れ替わるか押すかを選べる',
  });
}

const ORDER_DESC: Record<AllyOrder, string> = {
  follow: '主人公のそばで戦う',
  wait: 'その場から動かない',
  charge: '見えている敵へ向かっていく',
  flee: '敵から離れる',
};

/** 仲間の枠をタップしたとき。指示を選ぶ（ターンは使わない）。カードに戻すこともできる（1ターン） */
export function openOrderSheet(state: GameState, sheet: Sheet, ally: Ally, after: AfterAction): void {
  const card = ally.card;
  const rows: SheetRow[] = (Object.keys(ORDER_LABEL) as AllyOrder[]).map((order) => ({
    icon: ally.order === order ? '▶' : '',
    name: ORDER_LABEL[order],
    sub: ORDER_DESC[order],
    button: {
      label: ally.order === order ? '指示中' : '選ぶ',
      disabled: ally.order === order,
      onClick: () => {
        state.setOrder(ally, order);
        sheet.close();
        after();
      },
    },
  }));
  const footer = document.createElement('div');
  footer.className = 'sheet-pair';
  footer.append(
    wideButton('つよさ', false, () =>
      openStatusSheet(state, sheet, card, () => openOrderSheet(state, sheet, ally, after)),
    ),
    wideButton('カードに戻す', false, () => {
      sheet.close();
      state.recall(card);
      after();
    }),
  );
  sheet.open(`${cardIcon(card)} ${card.species.name}`, rows, {
    note: `Lv${card.level}　HP${card.hp}/${card.maxHp}　攻撃${card.atk}　防御${card.def}\n${personalityText(card)}`,
    footer,
  });
}

/** マップで隣の仲間をタップしたとき。入れ替わるか押すかを選ぶ。どちらも1ターンかかる */
export function openAllySheet(state: GameState, sheet: Sheet, ally: Ally, after: AfterAction): void {
  const act = (f: () => void) => () => {
    sheet.close();
    f();
    after();
  };
  const buttons = document.createElement('div');
  buttons.append(wideButton('入れ替わる', false, act(() => state.moveThroughAlly(ally, 'swap'))));
  const canPush = state.canPush(ally);
  buttons.append(
    wideButton(canPush ? '押す' : '押せない', !canPush, act(() => state.moveThroughAlly(ally, 'push'))),
  );
  sheet.open(`${cardIcon(ally.card)} ${ally.card.species.name}`, [], {
    note: `HP${ally.card.hp}/${ally.card.maxHp}`,
    footer: buttons,
  });
}

/**
 * 手元がいっぱいのときに新しいカードを手に入れたら、外す1枚を選ぶまで閉じない。
 * ダンジョンに持ってきたカードは拠点へ預けられる。ここで手に入れたカードは預けられず、別れるしかない
 */
export function openSwapSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const pending = state.pendingCard;
  if (!pending) return;
  const rows: SheetRow[] = [...state.cards, pending].map((card, index) => {
    const name = card === pending ? `${card.species.name}（新）` : card.species.name;
    const store = state.canStore(card);
    return {
      icon: cardIcon(card),
      name: store ? `${name}（持ってきた）` : name,
      sub: cardSub(card),
      button: store
        ? {
            label: '預ける',
            onClick: () => {
              sheet.close();
              state.sendToStorage(index);
              after();
            },
          }
        : { label: '別れる', onClick: () => openPartSheet(state, sheet, card, index, after) },
    };
  });
  sheet.open('カードがいっぱい', rows, {
    note: '外す1枚を選ぶ\n持ってきたカードは拠点へ預けられる\nここで手に入れたカードとは別れる',
    closable: false,
  });
}

/** 別れる前にもう一度聞く。別れたカードは戻らない */
function openPartSheet(state: GameState, sheet: Sheet, card: Card, index: number, after: AfterAction): void {
  const buttons = document.createElement('div');
  buttons.className = 'sheet-pair';
  buttons.append(
    wideButton('別れる', false, () => {
      sheet.close();
      state.partWith(index);
      after();
    }),
    wideButton('戻る', false, () => openSwapSheet(state, sheet, after)),
  );
  sheet.open(`${cardIcon(card)} ${card.species.name}と別れる？`, [], {
    note: `${cardSub(card)}\n別れたカードは戻らない`,
    footer: buttons,
    closable: false,
  });
}
