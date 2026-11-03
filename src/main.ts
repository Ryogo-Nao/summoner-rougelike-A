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
const dialog = new ConfirmDialog();
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
    ...state.log.slice(-3).map((m) => {
      const el = document.createElement('p');
      el.textContent = m;
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
    if (!(e.target instanceof Element && e.target.closest('#dialog'))) e.preventDefault();
  },
  { passive: false },
);

/** ダイアログが開いている間や踏破後は、パッドの入力を受け付けない */
const acceptsInput = () => !dialog.isOpen() && !state.cleared;

setupPad(document.getElementById('pad')!, {
  onMove(dir) {
    if (!acceptsInput()) return;
    const moved = state.tryMove(dir);
    redraw();
    if (moved && state.isOnStairs) askDescend();
  },
  onWait() {
    if (!acceptsInput()) return;
    // 階段の上で足踏みすると、降りるかどうかをもう一度聞く
    if (state.isOnStairs) {
      askDescend();
      return;
    }
    state.wait();
    redraw();
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
