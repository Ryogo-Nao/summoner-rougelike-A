import { HAND_LIMIT, SUMMON_LIMIT, isPartner, type Card } from '../game/cards';
import { BAG_LIMIT, ITEMS, type Item } from '../game/items';
import type { Ally } from '../game/cards';
import { SPELLS, type GameState, type SpellId } from '../game/state';
import { Sheet, wideButton, type SheetRow } from './sheet';

/** 一覧から行動したあとに呼ぶ（再描画、力つきたかの確認など） */
type AfterAction = () => void;

const STATUS_LABEL: Record<Card['status'], string> = {
  ready: '待機',
  summoned: '召喚中',
  dying: '瀕死',
};

export const cardIcon = (card: Card) => (isPartner(card) ? '⚡🐈' : card.species.emoji);

function cardSub(card: Card): string {
  return `Lv${card.level}　HP${card.hp}/${card.maxHp}　MP${card.species.cost}　${STATUS_LABEL[card.status]}`;
}

/** カード画面（requirements.md 10.3）。待機は「召喚」、召喚中は「戻す」。召喚できないカードは薄く出す */
export function openCardSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const act = (f: () => void) => () => {
    sheet.close();
    f();
    after();
  };
  const rows: SheetRow[] = state.cards.map((card) => {
    if (card.status === 'summoned') {
      return {
        icon: cardIcon(card),
        name: card.species.name,
        sub: cardSub(card),
        button: { label: '戻す', onClick: act(() => state.recall(card)) },
      };
    }
    const problem = state.summonProblem(card);
    return {
      icon: cardIcon(card),
      name: card.species.name,
      sub: cardSub(card),
      dim: problem !== null,
      button: { label: '召喚', disabled: problem !== null, onClick: act(() => state.summon(card)) },
    };
  });
  sheet.open(`カード ${state.cards.length}/${HAND_LIMIT}`, rows, {
    note: `召喚 ${state.allies.length}/${SUMMON_LIMIT}　MP ${state.player.mp}`,
  });
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
      power: '20ターン攻撃力×1.5',
      guard: '20ターン受けるダメージ×0.6',
    };
    return {
      icon: SPELL_ICONS[id],
      name: spell.label,
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

const SPELL_ICONS: Record<SpellId, string> = { fire: '🔥', thunder: '⚡', power: '💪', guard: '🧱' };

/** バッグの一覧。選ぶと、そのアイテムでできること（使う・投げる・置く）を出す */
export function openBagSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const p = state.player;
  const rows: SheetRow[] = state.bag.map((item) => ({
    icon: ITEMS[item.kind].emoji,
    name: state.isEquipped(item) ? `${ITEMS[item.kind].name}（装備中）` : ITEMS[item.kind].name,
    sub: ITEMS[item.kind].desc,
    button: { label: '選ぶ', onClick: () => openItemSheet(state, sheet, item, after) },
  }));
  const buffs = [p.powerTurns > 0 ? `力${p.powerTurns}T` : '', p.guardTurns > 0 ? `守り${p.guardTurns}T` : '']
    .filter((b) => b)
    .join('　');
  sheet.open(`バッグ ${state.bag.length}/${BAG_LIMIT}`, rows, {
    note: `攻撃力${state.attackPower()}　防御力${state.defensePower()}${buffs ? `　${buffs}` : ''}`,
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
  const label = state.useLabel(item);
  if (label) {
    const problem = state.useProblem(item);
    buttons.append(wideButton(problem ?? label, problem !== null, act(() => state.useItem(item))));
  }
  buttons.append(wideButton('投げる（向いている方向）', false, act(() => state.throwItem(item))));
  const dropProblem = state.dropProblem();
  buttons.append(wideButton(dropProblem ?? '置く', dropProblem !== null, act(() => state.dropItem(item))));
  buttons.append(wideButton('戻る', false, () => openBagSheet(state, sheet, after)));
  sheet.open(`${def.emoji} ${def.name}`, [], { note: def.desc, footer: buttons });
}

/** 「攻撃力 5 → 9 ↑4」。上がるなら緑、下がるなら赤で出す */
function statChange({ stat, before, after }: { stat: string; before: number; after: number }): HTMLElement {
  const el = document.createElement('p');
  el.className = 'stat-change';
  el.textContent = `${stat} ${before} → ${after} `;
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
export function openMenuSheet(state: GameState, sheet: Sheet, onChange: () => void): void {
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
          openMenuSheet(state, sheet, onChange);
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
          openMenuSheet(state, sheet, onChange);
        },
      },
    },
  ];
  sheet.open('メニュー', rows, { note: '攻撃は［攻撃］ボタンで\n隣の仲間をタップすると入れ替わるか押すかを選べる' });
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

/** 手元がいっぱいのときに新しいカードを手に入れたら、保管庫へ送る1枚を選ぶまで閉じない */
export function openSwapSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const pending = state.pendingCard;
  if (!pending) return;
  const rows: SheetRow[] = [...state.cards, pending].map((card, index) => ({
    icon: cardIcon(card),
    name: card === pending ? `${card.species.name}（新）` : card.species.name,
    sub: cardSub(card),
    button: {
      label: '預ける',
      onClick: () => {
        sheet.close();
        state.sendToStorage(index);
        after();
      },
    },
  }));
  sheet.open('カードがいっぱい', rows, {
    note: '保管庫へ送る1枚を選ぶ',
    closable: false,
  });
}
