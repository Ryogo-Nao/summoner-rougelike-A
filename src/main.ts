import { clearRun, loadProfile, loadRunData, loadoutOf, outcomeOf, returnToBase, saveRun } from './game/profile';
import { randomSeed } from './game/rng';
import type { Dir } from './game/dir';
import { GameState, sickMark, type RunData } from './game/state';
import { DUNGEONS } from './game/dungeons';
import { Renderer, type Playback } from './render/renderer';
import { faceElement, onArtLoaded, preloadArt } from './render/art';
import { ConfirmDialog } from './ui/dialog';
import { setupPad } from './ui/pad';
import { setupQuick } from './ui/quick';
import { ITEMS } from './game/items';
import { ORDER_LABEL } from './game/cards';
import { useShortcut, cardIcon, openAllySheet, openBagSheet, openFloorSheet, openOrderSheet, openCardSheet, openMagicSheet, openMenuSheet, openSwapSheet } from './ui/screens';
import { BaseScreen } from './ui/base';
import { loadSettings, saveSettings } from './ui/settings';
import { Sheet } from './ui/sheet';

// ?seed=数字 を付けると同じダンジョンを再現できる（デバッグ用）
const seedParam = Number(new URLSearchParams(location.search).get('seed'));
const nextSeed = () => (Number.isInteger(seedParam) && seedParam > 0 ? seedParam : randomSeed());

const profile = loadProfile();
const settings = loadSettings();
const dialog = new ConfirmDialog(() => pad.release());
const sheet = new Sheet(() => pad.release());
const base = new BaseScreen((dungeonId) => startRun(dungeonId));

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const renderer = new Renderer(canvas);

/** 遊んでいるダンジョン。拠点にいる間は、前のダンジョン（または仮の状態）が入っている */
let state = resumeRun() ?? new GameState(nextSeed(), loadoutOf(profile));
/** ダンジョンが終わったときの知らせ（踏破・力つきた）。拠点へ戻るまで出し続ける */
let ending: string | null = null;
useState(state);

/** 途中で閉じたダンジョンがあれば、続きから再開する。読めない保存データは消す */
function resumeRun(): GameState | null {
  const data = loadRunData();
  if (!data) return null;
  try {
    return GameState.fromData(data as RunData);
  } catch {
    clearRun();
    return null;
  }
}

function useState(next: GameState): void {
  state = next;
  state.turnFirst = settings.turnFirst;
  state.allyMove = settings.allyMove;
  // 開発中だけ、ブラウザのコンソールから状態を触れるようにする
  if (import.meta.env.DEV) Object.assign(window, { game: state, renderer, profile });
}

/** 拠点で選んだカードとアイテムを持って、ダンジョンに入る */
function startRun(dungeonId: string): void {
  useState(new GameState(nextSeed(), loadoutOf(profile), dungeonId));
  state.addLog(`${state.dungeon.name}に入った`);
  ending = null;
  saveRun(state);
  base.close();
  layout();
  showFloorTitle();
}

/**
 * ダンジョンが終わったとき（踏破・力つきた）。持ち帰るものを拠点に移し、知らせる。
 * 力つきたときは、そのダンジョンで手に入れたカードとバッグの半分を失う
 */
function endRun(): void {
  const outcome = outcomeOf(state);
  const name = state.dungeon.name;
  const title =
    outcome === 'cleared'
      ? `${name}を踏破した！`
      : outcome === 'escaped'
        ? `B${state.floor}Fから${name}を離脱した`
        : state.gaveUp
          ? `B${state.floor}Fで${name}をあきらめた`
          : `B${state.floor}Fで力つきた…`;
  const firstClear = outcome === 'cleared' && !profile.cleared.includes(state.dungeon.id);
  const losses = returnToBase(profile, state);
  // 初めて踏破したら、次に挑めるようになったダンジョンを知らせる
  const opened = firstClear
    ? DUNGEONS.filter((d) => d.requires === state.dungeon.id).map((d) => `\n${d.name}に挑めるようになった`).join('')
    : '';
  const lost = state.dead
    ? losses.cards.length + losses.items.length > 0
      ? `\n失ったもの：カード${losses.cards.length}枚　アイテム${losses.items.length}個`
      : '\n失ったものはない'
    : '';
  const downgraded = losses.downgraded > 0 ? `\n聖なる袋${losses.downgraded}つがふつうの袋に戻った` : '';
  ending = title + lost + downgraded + opened;
  showEnding();
}

function showEnding(): void {
  if (!ending) return;
  const message = ending;
  dialog.open(message, '拠点へ', 'ログを見る', () => base.open(profile), () => openLogHistory());
}

/** 小さな要素を作る */
function el(tag: string, className = '', text = '', children: HTMLElement[] = []): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  e.append(...children);
  return e;
}

function setGauge(selector: string, textId: string, value: number, max: number, text: string): void {
  const bar = document.querySelector<HTMLElement>(`${selector} i`)!;
  bar.style.width = `${Math.max(0, Math.min(1, value / max)) * 100}%`;
  document.getElementById(textId)!.textContent = text;
}

function setDanger(selector: string, on: boolean): void {
  document.querySelector(selector)!.parentElement!.classList.toggle('danger', on);
}

/** 攻撃の場面の再生中は、その時点のHPとログを出す */
interface HudMoment {
  hp: number;
  logSerial: number;
}

function updateHud(moment?: HudMoment): void {
  const p = state.player;
  const hp = moment?.hp ?? p.hp;
  document.getElementById('floor')!.textContent = `B${state.floor}F`;
  document.getElementById('level')!.textContent = `Lv${p.level}`;
  document.getElementById('turn')!.textContent = `${state.turn}T`;
  // かかっている状態異常と魔法を、残りターンつきで出す
  const effects = [
    p.ailments.confused > 0 ? `🌀${p.ailments.confused}` : '',
    p.ailments.poisoned > 0 ? `☠️${p.ailments.poisoned}` : '',
    p.ailments.pinned > 0 ? `📌${p.ailments.pinned}` : '',
    p.ailments.asleep > 0 ? `💤${p.ailments.asleep}` : '',
    p.powerTurns > 0 ? `💪${p.powerTurns}` : '',
    p.guardTurns > 0 ? `🧱${p.guardTurns}` : '',
  ];
  document.getElementById('effects')!.textContent = effects.filter(Boolean).join(' ');
  setGauge('.gauge.hp', 'hp-text', hp, p.maxHp, `${hp}/${p.maxHp}`);
  // HPが1割以下のときと、満腹度が0のときは、その段を赤く点滅させる
  setDanger('.gauge.hp', hp <= p.maxHp * 0.1);
  setDanger('.gauge.food', p.food <= 0);
  setGauge('.gauge.mp', 'mp-text', p.mp, p.maxMp, `${p.mp}/${p.maxMp}`);
  setGauge('.gauge.food', 'food-text', p.food, p.maxFood, `${p.food}%`);

  // 仲間の枠には、召喚している仲間の顔・レベル・HPを出す。空いている枠は、押すと召喚できることを示す
  document.querySelectorAll<HTMLElement>('.ally-slot').forEach((slot, i) => {
    const a = state.allies[i];
    slot.classList.toggle('filled', a !== undefined);
    if (!a) {
      slot.replaceChildren(el('span', 'face empty', '＋'), el('span', 'slot-name', '召喚'));
      return;
    }
    const card = a.card;
    const face = el('span', 'face');
    face.append(faceElement(card.species.id, cardIcon(card)), el('span', 'lv', `Lv${card.level}`));
    const sick = sickMark(a.ailments);
    if (sick) face.append(el('span', 'sick', sick));
    const bar = el('span', 'slot-hp');
    const fill = el('i');
    const ratio = card.hp / card.maxHp;
    fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    bar.classList.toggle('low', ratio <= 0.25);
    bar.append(fill);
    // ついてくる以外の指示を出しているときは、指示も出す
    const order = a.order !== 'follow' ? ORDER_LABEL[a.order] : `${card.hp}/${card.maxHp}`;
    slot.replaceChildren(face, el('span', 'slot-info', '', [el('span', 'slot-name', order), bar]));
  });

  const log = document.getElementById('log')!;
  log.replaceChildren(
    ...state.log
      .filter((entry) => !moment || entry.serial <= moment.logSerial)
      .slice(-3)
      .map((entry) => {
      const el = document.createElement('p');
      el.textContent = entry.text;
      return el;
    }),
  );
}

function redraw(): void {
  renderer.draw(state);
  updateHud();
}

/** 攻撃の場面1つの長さ（ミリ秒）。踏み込み、受けた側の点滅と数字。何も当たらなければ点滅は短くする */
const LUNGE_MS = 170;
const HIT_MS = 280;
const HIT_EMPTY_MS = 60;
let playing = false;
// 絵を読み込み終えたら描き直す。場面の再生中は、終わったあとに描き直される
preloadArt();
// 歩く動きと、立っているときの息づかいのために、マップを描き続ける。
// 電池を使いすぎないよう、ふだんは1秒に20回、歩いている間だけ毎回描く
let lastFrame = 0;
const IDLE_FRAME_MS = 50;
function animate(now: number): void {
  const visible = !document.hidden && !base.isOpen() && floorTitle.hidden;
  if (!playing && visible && (renderer.moving(now) || now - lastFrame >= IDLE_FRAME_MS)) {
    lastFrame = now;
    renderer.draw(state);
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
onArtLoaded(() => {
  if (!playing) renderer.draw(state);
});

/** この行動で起きた攻撃を、起きた順に1つずつ見せる。見せ終わったら done を呼ぶ */
function playScenes(done: () => void): void {
  const scenes = state.takeScenes();
  if (scenes.length === 0) {
    done();
    return;
  }
  playing = true;
  let index = 0;
  let phase: Playback['phase'] = 'lunge';
  let start = performance.now();
  const frame = (now: number) => {
    const scene = scenes[index];
    const duration = phase === 'lunge' ? LUNGE_MS : scene.popups.length > 0 ? HIT_MS : HIT_EMPTY_MS;
    const t = Math.min(1, (now - start) / duration);
    renderer.draw(state, { scene, phase, t });
    updateHud(
      phase === 'lunge'
        ? { hp: scene.hpBefore, logSerial: scene.logBefore }
        : { hp: scene.hpAfter, logSerial: scene.logAfter },
    );
    if (t >= 1) {
      start = now;
      if (phase === 'lunge') {
        phase = 'hit';
      } else {
        index++;
        phase = 'lunge';
        if (index >= scenes.length) {
          playing = false;
          done();
          return;
        }
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function askDescend(): void {
  dialog.open('階段を降りる？', '降りる', 'やめる', () => {
    state.descend();
    redraw();
    if (state.cleared) endRun();
    else {
      saveRun(state);
      showFloorTitle();
    }
  });
}

const floorTitle = document.getElementById('floor-title')!;
/** 階の画面を出している時間（ミリ秒、style.css の floor-title と合わせる） */
const FLOOR_TITLE_TIME = 1600;
let floorTitleTimer: number | undefined;

/** 階に入ったときに、ダンジョンの名前と階を出す。タップすると早く消える */
function showFloorTitle(): void {
  document.getElementById('floor-title-name')!.textContent = state.dungeon.name;
  document.getElementById('floor-title-floor')!.textContent = `B${state.floor}F`;
  pad.release();
  floorTitle.hidden = true;
  // アニメーションを最初からやり直す
  void floorTitle.offsetWidth;
  floorTitle.hidden = false;
  window.clearTimeout(floorTitleTimer);
  floorTitleTimer = window.setTimeout(hideFloorTitle, FLOOR_TITLE_TIME);
}

function hideFloorTitle(): void {
  window.clearTimeout(floorTitleTimer);
  floorTitle.hidden = true;
}
floorTitle.addEventListener('pointerdown', hideFloorTitle);

// ミニマップをタップすると拡大し、拡大中はマップのどこをタップしても元に戻す。
// 拡大したままでも歩ける。隣の仲間をタップすると、入れ替わるか押すかを選べる
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (renderer.minimapExpanded) {
    renderer.minimapExpanded = false;
  } else if (renderer.hitsMinimap(x, y)) {
    renderer.minimapExpanded = true;
  } else {
    const at = renderer.tileAt(state, x, y);
    const ally = state.allyAt(at.x, at.y);
    if (ally && state.canReachAlly(ally) && acceptsInput()) {
      // 仲間のマスへ進むので、階段の上なら降りるかを聞く
      openAllySheet(state, sheet, ally, () => afterAction(() => state.isOnStairs && askDescend()));
    }
    return;
  }
  redraw();
});

// iOS は CSS だけでは長押しのルーペが消えないので、タッチの既定動作を止める。
// そのため画面上のボタンでは click が来ない。ボタンには pointer イベントを使うこと
// （確認ダイアログは除外しているので click のまま使える）
document.addEventListener(
  'touchstart',
  (e) => {
    // 確認ダイアログとログの一覧は、click やスクロールを使うので止めない
    if (!(e.target instanceof Element && e.target.closest('#dialog, #log-history, #sheet, #base'))) e.preventDefault();
  },
  { passive: false },
);

const logHistory = document.getElementById('log-history')!;
const logList = document.getElementById('log-history-list')!;

/** ログの一覧を開く。ターンが変わるところに見出しを入れ、いちばん新しい行が見えるところから始める */
function openLogHistory(): void {
  pad.release();
  const rows: HTMLElement[] = [];
  let lastTurn = -1;
  for (const entry of state.log) {
    if (entry.turn !== lastTurn) {
      const head = document.createElement('p');
      head.className = 'turn';
      head.textContent = `${entry.turn}T`;
      rows.push(head);
      lastTurn = entry.turn;
    }
    const line = document.createElement('p');
    line.textContent = entry.text;
    rows.push(line);
  }
  logList.replaceChildren(...rows);
  logHistory.hidden = false;
  logList.scrollTop = logList.scrollHeight;
}

document.getElementById('log')!.addEventListener('pointerdown', () => {
  if (!dialog.isOpen() && !sheet.isOpen()) openLogHistory();
});
/** ログの一覧を閉じる。ダンジョンが終わっていれば、もう一度その知らせを出す */
function closeLogHistory(): void {
  logHistory.hidden = true;
  showEnding();
}

document.getElementById('log-close')!.addEventListener('click', closeLogHistory);
// 一覧の外側をタップしても閉じる
logHistory.addEventListener('click', (e) => {
  if (e.target === logHistory) closeLogHistory();
});

/** 攻撃を見せている間、ダイアログやログの一覧が開いている間、踏破・力つきた後は、入力を受け付けない */
const acceptsInput = () =>
  !playing &&
  floorTitle.hidden &&
  !base.isOpen() &&
  !dialog.isOpen() &&
  !sheet.isOpen() &&
  logHistory.hidden &&
  !state.cleared &&
  !state.escaped &&
  !state.dead &&
  !state.helpless;

/**
 * 行動のあとに、起きた攻撃を順に見せる。そのあと、カードがあふれていれば保管庫へ送るカードを選ばせ、
 * 力つきていたら知らせる。どちらもなければ next を呼ぶ
 */
function afterAction(next?: () => void): void {
  playScenes(() => {
    redraw();
    if (state.pendingCard) {
      openSwapSheet(state, sheet, () => afterAction());
      return;
    }
    if (state.dead || state.escaped) {
      endRun();
      return;
    }
    // 毎ターン自動で保存し、閉じても続きから遊べるようにする
    saveRun(state);
    // はりつけ・昏睡で動けない間は、自動で足踏みしてターンを進める
    if (state.helpless) {
      window.setTimeout(() => {
        if (!state.helpless || dialog.isOpen() || sheet.isOpen()) return;
        state.wait();
        afterAction(next);
      }, HELPLESS_DELAY);
      return;
    }
    next?.();
  });
}

/** 動けないときに、1ターン進めるまでの間（ミリ秒） */
const HELPLESS_DELAY = 300;

/** 右側のボタン。touchstart を止めているので click ではなく pointerdown で受ける */
function onButton(id: string, handler: () => void): void {
  const button = document.getElementById(id)!;
  button.addEventListener('pointerdown', () => {
    button.classList.add('pressed');
    if (acceptsInput()) handler();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    button.addEventListener(type, () => button.classList.remove('pressed'));
  }
}

// ［攻撃］：短く押すと攻撃、長押しで登録した道具の扇を出す
setupQuick(document.getElementById('btn-attack')!, {
  canStart: acceptsInput,
  onTap() {
    if (!acceptsInput()) return;
    state.attack();
    afterAction();
  },
  slots: () =>
    state.shortcuts.map((kind) => {
      if (!kind) return { emoji: '', label: '', enabled: false };
      const n = state.countInBag(kind);
      const label = ITEMS[kind].arrow ? `${n}本` : `×${n}`;
      return { emoji: ITEMS[kind].emoji, label, enabled: n > 0 };
    }),
  onPick(slot) {
    if (acceptsInput()) useShortcut(state, sheet, slot, afterAction);
  },
});
onButton('btn-card', () => openCardSheet(state, sheet, afterAction));
onButton('btn-magic', () => openMagicSheet(state, sheet, afterAction));
onButton('btn-bag', () => openBagSheet(state, sheet, afterAction));
onButton('btn-menu', () =>
  openMenuSheet(
    state,
    sheet,
    settings,
    () => {
      settings.turnFirst = state.turnFirst;
      settings.allyMove = state.allyMove;
      saveSettings(settings);
      applyPadSide();
    },
    // あきらめると、力つきたときと同じく、ここで手に入れたカードとバッグの半分を失う
    () =>
      dialog.open('ダンジョンをあきらめる？\n力つきたときと同じく\nここで手に入れたカードと\nバッグの道具の半分を失う', 'あきらめる', 'やめる', () => {
        state.giveUp();
        afterAction();
      }),
  ),
);

/** 設定に合わせて、パッドを左右どちらかに置く */
function applyPadSide(): void {
  document.getElementById('controls')!.classList.toggle('pad-right', settings.padSide === 'right');
}
applyPadSide();

/** ダッシュで進んでいる向き。通路の曲がり角では、押している向きと違うことがある */
let dashDir: Dir | null = null;
// 仲間の枠をタップすると、仲間がいれば指示を、空いていればカード画面（召喚）を開く
document.querySelectorAll<HTMLElement>('.ally-slot').forEach((slot, i) => {
  slot.addEventListener('pointerdown', () => {
    if (!acceptsInput()) return;
    const ally = state.allies[i];
    if (ally) openOrderSheet(state, sheet, ally, afterAction);
    else openCardSheet(state, sheet, afterAction);
  });
});

const pad = setupPad(document.getElementById('pad')!, {
  onMove(dir, repeat) {
    if (!acceptsInput()) return;
    if (!repeat) {
      dashDir = dir;
      const moved = state.tryMove(dir);
      afterAction(() => {
        if (moved === 'moved' && state.isOnStairs) askDescend();
      });
      return;
    }
    // 押し続けているとき（ダッシュ）。止まるところに来たら、指を離すまで止まる
    const next = dashDir === null ? null : state.dashDirection(dashDir);
    if (next === null) return false;
    const before = state.dashSnapshot();
    if (state.dash(next) !== 'moved') return false;
    dashDir = next;
    const stop = state.dashShouldStop(before);
    afterAction(() => {
      if (state.isOnStairs) askDescend();
    });
    return !stop;
  },
  onWait() {
    if (!acceptsInput()) return;
    // 階段の上で足踏みすると、降りるかどうかをもう一度聞く
    if (state.isOnStairs) {
      askDescend();
      return;
    }
    // 足もとに道具があれば、拾うか入れ替えるかを選ぶ
    if (state.itemUnderfoot()) {
      openFloorSheet(state, sheet, afterAction);
      return;
    }
    state.wait();
    afterAction();
  },
});

/** 仲間の枠の上下に空ける隙間（px） */
const ALLIES_GAP = 8;

const field = document.getElementById('field')!;
const allies = document.getElementById('allies')!;

/** マップは幅いっぱいにし、縦は仲間の枠の下に残った高さをすべて使う */
function layout(): void {
  const maxHeight = field.clientHeight - allies.offsetHeight - ALLIES_GAP * 2;
  renderer.resize(field.clientWidth, maxHeight);
  redraw();
}

// iOS Safari はツールバーの出し入れで表示領域が変わり、resize イベントが来ないことがあるので、
// 領域そのものの大きさの変化を監視する
new ResizeObserver(layout).observe(field);
window.addEventListener('resize', layout);
window.visualViewport?.addEventListener('resize', layout);
layout();
// 途中のダンジョンがなければ、拠点から始める
if (!loadRunData()) base.open(profile);
// はりつけ・昏睡のまま閉じていたら、続きのターンを自動で進める
else if (state.helpless) afterAction();

// 公開したものだけ、オフラインでも遊べるようにする（開発中は毎回新しいファイルを読むので使わない）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // 登録できなくても、通信できる間は遊べる
  });
}
