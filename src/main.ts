import { GameMap } from './game/map';
import { GameState } from './game/state';
import { Renderer } from './render/renderer';
import { setupPad } from './ui/pad';

// ダンジョン生成ができるまでの仮マップ
const TEST_MAP = [
  '##########################',
  '#........#######.........#',
  '#........#######.........#',
  '#.................#####..#',
  '#........#######..#####..#',
  '#........#######.........#',
  '####.######################',
  '####.######################',
  '####.######.......#########',
  '####...............########',
  '###########.....>..########',
  '###########.......#########',
  '##########################',
];

const state = new GameState(GameMap.fromStrings(TEST_MAP), { x: 3, y: 2 });
state.addLog('ダンジョンに入った。');

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

setupPad(document.getElementById('pad')!, {
  onMove(dir) {
    state.tryMove(dir);
    redraw();
  },
  onWait() {
    state.wait();
    redraw();
  },
});

/** 仲間の枠の上下に最低限空ける隙間（px） */
const ALLIES_MIN_GAP = 6;

/** マップは幅いっぱいを基本にし、高さが足りないときだけ縮める */
function layout(): void {
  const field = document.getElementById('field')!;
  const allies = document.getElementById('allies')!;
  const maxHeight = field.clientHeight - allies.offsetHeight - ALLIES_MIN_GAP * 2;
  renderer.resize(Math.min(field.clientWidth, maxHeight));
  redraw();
}

window.addEventListener('resize', layout);
layout();
