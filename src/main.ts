import { randomSeed } from './game/rng';
import { GameState } from './game/state';
import { Renderer, type Playback } from './render/renderer';
import { ConfirmDialog } from './ui/dialog';
import { setupPad } from './ui/pad';
import { cardIcon, openBagSheet, openCardSheet, openMagicSheet, openMenuSheet, openSwapSheet } from './ui/screens';
import { loadSettings, saveSettings } from './ui/settings';
import { Sheet } from './ui/sheet';

// ?seed=数字 を付けると同じダンジョンを再現できる（デバッグ用）
const seedParam = Number(new URLSearchParams(location.search).get('seed'));
const seed = Number.isInteger(seedParam) && seedParam > 0 ? seedParam : randomSeed();

const state = new GameState(seed);
state.addLog('ダンジョンに入った');
state.turnFirst = loadSettings().turnFirst;
const dialog = new ConfirmDialog(() => pad.release());
const sheet = new Sheet(() => pad.release());

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const renderer = new Renderer(canvas);
// 開発中だけ、ブラウザのコンソールから状態を触れるようにする
if (import.meta.env.DEV) Object.assign(window, { game: state, renderer });

function setGauge(selector: string, textId: string, value: number, max: number, text: string): void {
  const bar = document.querySelector<HTMLElement>(`${selector} i`)!;
  bar.style.width = `${Math.max(0, Math.min(1, value / max)) * 100}%`;
  document.getElementById(textId)!.textContent = text;
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
  setGauge('.gauge.hp', 'hp-text', hp, p.maxHp, `${hp}/${p.maxHp}`);
  setGauge('.gauge.mp', 'mp-text', p.mp, p.maxMp, `${p.mp}/${p.maxMp}`);
  setGauge('.gauge.food', 'food-text', p.food, p.maxFood, `${p.food}%`);

  // 仲間の枠には、召喚している仲間とそのHPを出す。空いている枠は、押すと召喚できることを示す
  document.querySelectorAll<HTMLElement>('.ally-slot').forEach((slot, i) => {
    const a = state.allies[i];
    slot.textContent = a ? `${cardIcon(a.card)} ${a.card.hp}/${a.card.maxHp}` : '召喚';
    slot.classList.toggle('filled', a !== undefined);
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
    if (state.cleared) {
      dialog.open('踏破した！', 'もう一度', '閉じる', () => location.reload());
    }
  });
}

// ミニマップをタップすると拡大し、拡大中はマップのどこをタップしても元に戻す。
// 拡大したままでも歩ける
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  if (renderer.minimapExpanded) {
    renderer.minimapExpanded = false;
  } else if (renderer.hitsMinimap(e.clientX - rect.left, e.clientY - rect.top)) {
    renderer.minimapExpanded = true;
  } else {
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
    if (!(e.target instanceof Element && e.target.closest('#dialog, #log-history, #sheet'))) e.preventDefault();
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
document.getElementById('log-close')!.addEventListener('click', () => {
  logHistory.hidden = true;
});
// 一覧の外側をタップしても閉じる
logHistory.addEventListener('click', (e) => {
  if (e.target === logHistory) logHistory.hidden = true;
});

/** 攻撃を見せている間、ダイアログやログの一覧が開いている間、踏破・力つきた後は、入力を受け付けない */
const acceptsInput = () =>
  !playing && !dialog.isOpen() && !sheet.isOpen() && logHistory.hidden && !state.cleared && !state.dead;

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
    if (state.dead) {
      dialog.open(`B${state.floor}Fで力つきた…`, 'もう一度', '閉じる', () => location.reload());
      return;
    }
    next?.();
  });
}

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

onButton('btn-attack', () => {
  state.attack();
  afterAction();
});
onButton('btn-card', () => openCardSheet(state, sheet, afterAction));
onButton('btn-magic', () => openMagicSheet(state, sheet, afterAction));
onButton('btn-bag', () => openBagSheet(state, sheet, afterAction));
onButton('btn-menu', () =>
  openMenuSheet(state, sheet, () => saveSettings({ turnFirst: state.turnFirst })),
);
// 仲間の枠をタップしてもカード画面を開く。指示（ついてくる・待機など）はあとで足す
document.querySelectorAll<HTMLElement>('.ally-slot').forEach((slot) => {
  slot.addEventListener('pointerdown', () => {
    if (acceptsInput()) openCardSheet(state, sheet, afterAction);
  });
});

const pad = setupPad(document.getElementById('pad')!, {
  onMove(dir) {
    if (!acceptsInput()) return;
    const moved = state.tryMove(dir);
    afterAction(() => {
      if (moved === 'moved' && state.isOnStairs) askDescend();
    });
  },
  onWait() {
    if (!acceptsInput()) return;
    // 階段の上で足踏みすると、降りるかどうかをもう一度聞く
    if (state.isOnStairs) {
      askDescend();
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
