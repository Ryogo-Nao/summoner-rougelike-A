import { NICKNAME_LIMIT, ORDER_LABEL, PERSONALITIES, STAT_LABEL, cardName, growthRate, isPartner, nicknameLength, type Ally, type Card } from '../game/cards';
import { allyExpToNext } from '../game/combat';
import { elementText } from '../game/elements';
import { characterInfo } from '../game/characters';
import type { Species } from '../game/monsters';
import { artElement } from '../render/art';
import { setRichText } from './icons';

/** 速さの呼び名（balance.md 3.3） */
const SPEED_LABEL: Record<Species['speed'], string> = { normal: '普通', fast: '倍速', slow: '鈍足' };

const STATUS_LABEL: Record<Card['status'], string> = { ready: '待機', summoned: '召喚中', dying: '瀕死' };

/** 魔物の特技と、動きの特徴 */
function traits(species: Species, partner: boolean): string {
  const list: string[] = [];
  if (partner) list.push('いかずち（2マス先に雷）');
  if (species.twoHits) list.push('1ターンに2回攻撃');
  if (species.reach) list.push(`${species.reachName ?? '舌'}で${species.reach}マス先まで攻撃`);
  // ふらふら・鈍足は敵のときだけの弱み。仲間には出さない（balance.md 4.6）
  if (species.mighty) list.push('攻撃力が1.5倍');
  if (species.sturdy) list.push('受けるダメージが半分');
  if (species.armored) list.push('物理で受けるダメージが2/3');
  if (species.phasing) list.push('壁をすり抜ける');
  if (species.special === 'spore') list.push(`${species.specialName ?? '胞子'}で混乱させる`);
  if (species.special === 'venom') list.push('攻撃で毒にする');
  if (species.special === 'breath')
    list.push(species.element === 'fire' ? '火を吐く\n召喚中は大火球を使える' : `${species.specialName ?? '火'}を吐く`);
  if (species.special === 'sleep') list.push(`${species.specialName ?? '鱗粉'}で眠らせる`);
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
  // 能力値は2列に並べる。拠点ではHPは減らないので、最大HPだけを出す
  const stats: [string, string][] = [
    ['HP', inDungeon ? `${card.hp}/${card.maxHp}` : `${card.maxHp}`],
    ['召喚MP', `${card.species.cost}`],
    ['攻撃力', `${card.atk}`],
    ['防御力', `${card.def}`],
    ['魔攻', `${card.matk}`],
    ['魔防', `${card.mdef}`],
  ];
  const basics: [string, string][] = [
    ['経験値', next === null ? `${Math.floor(card.exp)}（最大レベル）` : `${Math.floor(card.exp)}（次のLvまで${Math.ceil(next)}）`],
    ...(card.fusions
      ? ([[isPartner(card) ? '転生' : '配合', `${card.fusions}回　伸び×${growthRate(card.fusions, isPartner(card)).toFixed(2)}`]] as [string, string][])
      : []),
    ['速さ', SPEED_LABEL[card.species.speed === 'slow' ? 'normal' : card.species.speed]],
  ];
  const rows: [string, string][] = [
    ['性格', up && down ? `${name}（${STAT_LABEL[up]}↑ ${STAT_LABEL[down]}↓）` : name],
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
  else if (inDungeon) rows.push(['入手', card.obtainedHere ? 'このダンジョンで仲間にした' : '連れてきた']);

  // 上に小さな絵と、名前・Lv・種族・属性。その下に背景、能力値（2列）、育ち、性格と特技のまとまり
  const head = document.createElement('div');
  head.className = 'status-head';
  const headText = document.createElement('div');
  headText.className = 'status-head-text';
  const meta = document.createElement('p');
  meta.className = 'status-meta';
  setRichText(meta, `Lv${card.level}　${card.species.name}　${elementText(card.species.element)}`);
  headText.append(title, meta);
  head.append(portrait, headText);
  root.append(
    head,
    lore,
    section('能力値', stats, true),
    section('育ち', basics),
    section('性格と特技', rows),
  );
  return root;
}

/** 見出しの付いた表。two なら2列に並べる */
function section(heading: string, rows: [string, string][], two = false): HTMLElement {
  const box = document.createElement('section');
  box.className = 'status-section';
  const h = document.createElement('h3');
  h.textContent = heading;
  const table = document.createElement('dl');
  table.className = two ? 'status-table two' : 'status-table';
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    setRichText(dd, value);
    table.append(dt, dd);
  }
  box.append(h, table);
  return box;
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
