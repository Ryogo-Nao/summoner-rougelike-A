import { NICKNAME_LIMIT, ORDER_LABEL, PERSONALITIES, STAT_LABEL, cardName, growthRate, isPartner, nicknameLength, type Ally, type Card } from '../game/cards';
import { allyExpToNext } from '../game/combat';
import { elementText } from '../game/elements';
import { characterInfo } from '../game/characters';
import type { Species } from '../game/monsters';
import { artElement } from '../render/art';

/** 速さの呼び名（balance.md 3.3） */
const SPEED_LABEL: Record<Species['speed'], string> = { normal: '普通', fast: '倍速', slow: '鈍足' };

const STATUS_LABEL: Record<Card['status'], string> = { ready: '待機', summoned: '召喚中', dying: '瀕死' };

/** 魔物の特技と、動きの特徴 */
function traits(species: Species, partner: boolean): string {
  const list: string[] = [];
  if (partner) list.push('いかずち（2マス先に雷）\n召喚中は雷の魔法を使える');
  if (species.twoHits) list.push('1ターンに2回攻撃');
  if (species.reach) list.push(`${species.reachName ?? '舌'}で${species.reach}マス先まで攻撃`);
  if (species.erratic) list.push('ふらふらと飛ぶ');
  if (species.phasing) list.push('壁をすり抜ける');
  if (species.special === 'spore') list.push('胞子で混乱させる');
  if (species.special === 'venom') list.push('攻撃で毒にする');
  if (species.special === 'breath') list.push('火を吐く\n召喚中は大火球を使える');
  if (species.special === 'sleep') list.push('鱗粉で眠らせる');
  if (species.special === 'pin') list.push('糸ではりつけにする');
  if (species.special === 'manaBite') list.push('かじってMPを減らす');
  if (species.special === 'drain') list.push('与えたダメージの半分を吸い取る');
  if (species.regen) list.push('毎ターンHPが少し戻る');
  return list.length > 0 ? list.join('\n') : 'なし';
}

/**
 * 仲間のつよさ（requirements.md 6.3）。レベル・HP・攻撃・防御・経験値・性格・特技などを並べる。
 * 上の絵の枠は、あとで魔物の絵に差し替える
 */
export function statusView(
  card: Card,
  { ally, inDungeon = false, onRename }: { ally?: Ally; inDungeon?: boolean; onRename?: (name: string) => void } = {},
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'status-view';

  const portrait = document.createElement('div');
  portrait.className = 'status-portrait';
  portrait.append(artElement(card.species.id, card.species.emoji, 'status-art'));

  const title = nameTitle(card, onRename);
  // 魔物の背景。名前の下に、細い金の線ではさんで出す
  const lore = document.createElement('p');
  lore.className = 'status-lore';
  // 背景はキャラクターの台帳（characters.ts）から。読点のところで改行して、句の途中で折り返さないようにする
  lore.textContent = characterInfo(card.species.id).lore.replace('、', '、\n');

  const { name, up, down } = PERSONALITIES[card.personality];
  const next = allyExpToNext(card.exp);
  const rows: [string, string][] = [
    ['種族', card.species.name],
    ['属性', elementText(card.species.element)],
    ['レベル', `Lv${card.level}`],
    ...(card.fusions
      ? ([[isPartner(card) ? '転生' : '配合', `${card.fusions}回　伸び×${growthRate(card.fusions).toFixed(2)}`]] as [string, string][])
      : []),
    // 拠点ではHPは減らないので、最大HPだけを出す
    ['HP', inDungeon ? `${card.hp}/${card.maxHp}` : `${card.maxHp}`],
    ['攻撃力', `${card.atk}`],
    ['防御力', `${card.def}`],
    ['魔攻', `${card.matk}`],
    ['魔防', `${card.mdef}`],
    ['経験値', next === null ? `${Math.floor(card.exp)}（最大レベル）` : `${Math.floor(card.exp)}（次のLvまで${Math.ceil(next)}）`],
    ['性格', up && down ? `${name}（${STAT_LABEL[up]}↑ ${STAT_LABEL[down]}↓）` : name],
    ['召喚MP', `${card.species.cost}`],
    ['速さ', SPEED_LABEL[card.species.speed]],
    ['特技', traits(card.species, isPartner(card))],
    ['状態', STATUS_LABEL[card.status]],
  ];
  if (ally) {
    const a = ally.ailments;
    const sick = [
      a.confused > 0 ? `🌀混乱 残り${a.confused}` : '',
      a.poisoned > 0 ? `☠️毒 残り${a.poisoned}` : '',
      a.pinned > 0 ? `📌はりつけ 残り${a.pinned}` : '',
      a.asleep > 0 ? `💤昏睡 残り${a.asleep}` : '',
      a.raged > 0 ? `💢激昂 残り${a.raged}` : '',
      a.fortified > 0 ? `🏰要塞 残り${a.fortified}` : '',
    ]
      .filter(Boolean)
      .join('　');
    rows.push(['指示', ORDER_LABEL[ally.order]]);
    if (sick) rows.push(['状態異常', sick]);
  }
  if (isPartner(card)) rows.push(['入手', '最初からの相棒']);
  else if (inDungeon) rows.push(['入手', card.obtainedHere ? 'このダンジョンで仲間にした' : '持ってきた']);

  const table = document.createElement('dl');
  table.className = 'status-table';
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    table.append(dt, dd);
  }
  root.append(portrait, title, lore, table);
  return root;
}

/**
 * 絵の下の名前。onRename があれば、横の［✎］で名前を打ち込める欄に変わる（8文字まで）。
 * 8文字をこえると数を赤にして［決める］を押せなくする。空にして決めると種族の名前に戻る
 */
function nameTitle(card: Card, onRename?: (name: string) => void): HTMLElement {
  const title = document.createElement('div');
  title.className = 'status-title';
  const name = document.createElement('span');
  name.textContent = cardName(card);
  title.append(name);
  if (!onRename) return title;
  const edit = document.createElement('button');
  edit.className = 'rename';
  edit.setAttribute('aria-label', 'ニックネームを変える');
  edit.textContent = '✎';
  edit.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = card.nickname ?? '';
    input.placeholder = card.species.name;
    input.setAttribute('aria-label', 'ニックネーム');
    input.enterKeyHint = 'done';
    const count = document.createElement('span');
    count.className = 'nickname-count';
    const ok = document.createElement('button');
    ok.className = 'rename-ok';
    ok.textContent = '決める';
    const update = () => {
      const n = nicknameLength(input.value);
      count.textContent = `${n}/${NICKNAME_LIMIT}`;
      count.classList.toggle('over', n > NICKNAME_LIMIT);
      ok.disabled = n > NICKNAME_LIMIT;
    };
    input.addEventListener('input', update);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !ok.disabled) ok.click();
    });
    ok.addEventListener('click', () => {
      if (nicknameLength(input.value) > NICKNAME_LIMIT) return;
      onRename(input.value.trim());
    });
    update();
    title.classList.add('editing');
    title.replaceChildren(input, count, ok);
    input.focus();
  });
  title.append(edit);
  return title;
}
