import { ORDER_LABEL, PERSONALITIES, STAT_LABEL, isPartner, type Ally, type Card } from '../game/cards';
import { expToNext } from '../game/combat';
import type { Species } from '../game/monsters';

/** 速さの呼び名（balance.md 3.3） */
const SPEED_LABEL: Record<Species['speed'], string> = { normal: '普通', fast: '倍速', slow: '鈍足' };

const STATUS_LABEL: Record<Card['status'], string> = { ready: '待機', summoned: '召喚中', dying: '瀕死' };

/** 魔物の特技と、動きの特徴 */
function traits(species: Species, partner: boolean): string {
  const list: string[] = [];
  if (partner) list.push('いかずち（2マス先に雷）\n召喚中は雷の魔法を使える');
  if (species.reach) list.push(`舌で${species.reach}マス先まで攻撃`);
  if (species.erratic) list.push('ふらふらと飛ぶ');
  if (species.phasing) list.push('壁をすり抜ける');
  if (species.special === 'spore') list.push('胞子で混乱させる');
  if (species.special === 'venom') list.push('攻撃で毒にする');
  if (species.special === 'breath') list.push('火を吐く\n召喚中は大火球を使える');
  return list.length > 0 ? list.join('\n') : 'なし';
}

/**
 * 仲間のつよさ（requirements.md 6.3）。レベル・HP・攻撃・防御・経験値・性格・特技などを並べる。
 * 上の絵の枠は、あとで魔物の絵に差し替える
 */
export function statusView(card: Card, { ally, inDungeon = false }: { ally?: Ally; inDungeon?: boolean } = {}): HTMLElement {
  const root = document.createElement('div');
  root.className = 'status-view';

  const portrait = document.createElement('div');
  portrait.className = 'status-portrait';
  portrait.textContent = card.species.emoji;

  const title = document.createElement('div');
  title.className = 'status-title';
  title.textContent = `${card.species.name}　Lv${card.level}`;

  const { name, up, down } = PERSONALITIES[card.personality];
  const next = expToNext(card.exp);
  const rows: [string, string][] = [
    ['HP', `${card.hp}/${card.maxHp}`],
    ['攻撃力', `${card.atk}`],
    ['防御力', `${card.def}`],
    ['経験値', next === null ? `${Math.floor(card.exp)}（最大レベル）` : `${Math.floor(card.exp)}（次のLvまで${Math.ceil(next)}）`],
    ['性格', up && down ? `${name}（${STAT_LABEL[up]}↑ ${STAT_LABEL[down]}↓）` : name],
    ['召喚MP', `${card.species.cost}`],
    ['速さ', SPEED_LABEL[card.species.speed]],
    ['特技', traits(card.species, isPartner(card))],
    ['状態', STATUS_LABEL[card.status]],
  ];
  if (ally) {
    const sick = [ally.ailments.confused > 0 ? `混乱${ally.ailments.confused}` : '', ally.ailments.poisoned > 0 ? `毒${ally.ailments.poisoned}` : '']
      .filter(Boolean)
      .join('　');
    rows.push(['指示', ORDER_LABEL[ally.order]]);
    if (sick) rows.push(['状態異常', sick]);
  }
  if (isPartner(card)) rows.push(['入手', '最初からの相棒']);
  else if (inDungeon) rows.push(['入手', card.obtainedHere ? 'このダンジョンで手に入れた' : '持ってきた']);

  const table = document.createElement('dl');
  table.className = 'status-table';
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    table.append(dt, dd);
  }
  root.append(portrait, title, table);
  return root;
}
