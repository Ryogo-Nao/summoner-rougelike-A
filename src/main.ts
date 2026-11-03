import { randomSeed } from './game/rng';
import { GameState } from './game/state';
import { Renderer } from './render/renderer';
import { ConfirmDialog } from './ui/dialog';
import { setupPad } from './ui/pad';

// ?seed=数字 を付けると同じダンジョンを再現できる（デバッグ用）
const seedParam = Number(new URLSearchParams(location.search).get('seed'));
const seed = Number.isInteger(seedParam) && seedParam > 0 ? seedParam : randomSeed();

const state = new GameState(seed);
state.addLog('ダンジョンに入った。');
const dialog = new ConfirmDialog(() => pad.release());
// 開発中だけ、ブラウザのコンソールから状態を触れるようにする
if (import.meta.env.DEV) Object.assign(window, { game: state });

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const renderer = new Renderer(canvas);

function setGauge(selector: string, textId: string, value: number, max: number, text: string): void {
  const bar = document.querySelector<HTMLElement>(`${selector} i`)!;
  bar.style.width = `${Math.max(0, Math.min(1, value / max)) * 100}%`;
  document.getElementById(textId)!.textContent = text;
}

function updateHud(): void {
  const p = state.player;
  document.getElementById('floor')!.textContent = `B${state.floor}F`;
  document.getElementById('level')!.textContent = `Lv${p.level}`;
  document.getElementById('turn')!.textContent = `${state.turn}T`;
  setGauge('.gauge.hp', 'hp-text', p.hp, p.maxHp, `${p.hp}/${p.maxHp}`);
  setGauge('.gauge.mp', 'mp-text', p.mp, p.maxMp, `${p.mp}/${p.maxMp}`);
  setGauge('.gauge.food', 'food-text', p.food, p.maxFood, `${p.food}%`);

  const log = document.getElementById('log')!;
  log.replaceChildren(
    ...state.log.slice(-3).map((entry) => {
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

function askDescend(): void {
  dialog.open('階段がある。降りますか？', '降りる', 'そのまま', () => {
    state.descend();
    redraw();
    if (state.cleared) {
      dialog.open('ダンジョンを踏破した！', 'もう一度', '閉じる', () => location.reload());
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
    if (!(e.target instanceof Element && e.target.closest('#dialog, #log-history'))) e.preventDefault();
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
      head.textContent = `${entry.turn}ターン目`;
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
  if (!dialog.isOpen()) openLogHistory();
});
document.getElementById('log-close')!.addEventListener('click', () => {
  logHistory.hidden = true;
});
// 一覧の外側をタップしても閉じる
logHistory.addEventListener('click', (e) => {
  if (e.target === logHistory) logHistory.hidden = true;
});

/** ダイアログやログの一覧が開いている間や、踏破・力つきた後は、入力を受け付けない */
const acceptsInput = () => !dialog.isOpen() && logHistory.hidden && !state.cleared && !state.dead;

/** 行動のあとに、力つきていたら知らせる */
function afterAction(): void {
  redraw();
  if (state.dead) {
    dialog.open(`B${state.floor}Fで力つきてしまった…`, 'もう一度', '閉じる', () => location.reload());
  }
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

const pad = setupPad(document.getElementById('pad')!, {
  onMove(dir) {
    if (!acceptsInput()) return;
    const moved = state.tryMove(dir);
    afterAction();
    if (moved === 'moved' && !state.dead && state.isOnStairs) askDescend();
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
