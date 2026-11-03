import { HAND_LIMIT, SUMMON_LIMIT, isPartner, type Card } from '../game/cards';
import { SPELLS, type GameState } from '../game/state';
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
  return `Lv${card.level}　HP ${card.hp}/${card.maxHp}　コスト${card.species.cost}　${STATUS_LABEL[card.status]}`;
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
  const footer = wideButton(
    `白紙カードを投げる（残り${state.blankCards}枚）`,
    state.blankCards <= 0,
    act(() => state.throwBlankCard()),
  );
  sheet.open(`カード ${state.cards.length}/${HAND_LIMIT}`, rows, {
    note: `召喚中 ${state.allies.length}/${SUMMON_LIMIT}体　MP ${state.player.mp}　白紙カードは向いている方向に飛ぶ`,
    footer,
  });
}

/** 魔法の一覧。選ぶと、向いている方向（雷はまわり）に使う */
export function openMagicSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const p = state.player;
  const rows: SheetRow[] = state.availableSpells().map((id) => {
    const spell = SPELLS[id];
    const enough = p.mp >= spell.mp;
    const effect =
      id === 'fire'
        ? `向いている方向の最初の敵に${10 + p.level * 2}のダメージ`
        : `まわり8マスの敵すべてに${6 + p.level}のダメージ`;
    return {
      icon: id === 'fire' ? '🔥' : '⚡',
      name: spell.name,
      sub: `MP${spell.mp}　${effect}`,
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

/** メニュー。設定を切り替えると、その場で一覧を開き直して今の状態を見せる */
export function openMenuSheet(state: GameState, sheet: Sheet, onChange: () => void): void {
  const rows: SheetRow[] = [
    {
      icon: '↻',
      name: '1回目のタップで振り向く',
      sub: state.turnFirst
        ? 'オン：違う方向を押すと、まず振り向く（ターンは使わない）。もう一度押すと進む'
        : 'オフ：押した方向へすぐ進む',
      button: {
        label: state.turnFirst ? 'オン' : 'オフ',
        onClick: () => {
          state.turnFirst = !state.turnFirst;
          onChange();
          openMenuSheet(state, sheet, onChange);
        },
      },
    },
  ];
  sheet.open('メニュー', rows, { note: '魔物のいる方向を押しても、向きを変えるだけで攻撃はしない。攻撃は［攻撃］ボタンで。' });
}

/** 手元がいっぱいのときに新しいカードを手に入れたら、保管庫へ送る1枚を選ぶまで閉じない */
export function openSwapSheet(state: GameState, sheet: Sheet, after: AfterAction): void {
  const pending = state.pendingCard;
  if (!pending) return;
  const rows: SheetRow[] = [...state.cards, pending].map((card, index) => ({
    icon: cardIcon(card),
    name: card === pending ? `${card.species.name}（新しいカード）` : card.species.name,
    sub: cardSub(card),
    button: {
      label: '保管庫へ',
      onClick: () => {
        sheet.close();
        state.sendToStorage(index);
        after();
      },
    },
  }));
  sheet.open('カードがいっぱいです', rows, {
    note: `持てるのは${HAND_LIMIT}枚まで。保管庫へ送るカードを1枚選んでください。保管庫のカードは、次にダンジョンに入るときに選び直せます。`,
    closable: false,
  });
}
