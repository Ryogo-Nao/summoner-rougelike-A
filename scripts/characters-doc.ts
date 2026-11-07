// キャラクターの台帳（src/game/characters.ts）から、docs/characters.md を作る。
// 一覧の表と、キャラクターごとの「絵を頼む指示文」（方向ごとの共通の文＋見た目＋背景）を並べる
import { ART_STATUS_LABEL, CHARACTERS, MOTION_LABEL, POLE_LABEL, type ArtPole, type CharacterInfo } from '../src/game/characters.ts';

/** 方向ごとの見本の絵（Gemini などに添える） */
const REFERENCE: Record<ArtPole, string> = {
  divine: 'design/art-direction/ref_divine_todoroki.webp',
  dark: 'design/art-direction/ref_dark_softened.webp',
};

/** 方向ごとの共通の指示文（docs/art-guide.md 2.1）。{subject}・{story}・{colors} を差し込む。色は方向で決めず、キャラクターごとに持つ */
const TEMPLATE: Record<ArtPole, string> = {
  divine: [
    'Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.',
    'Subject: {subject}',
    'Background story: {story}',
    'Color scheme: {colors}',
    'Noble, dignified posture. Ornamental details that suit the creature.',
    '3/4 front view facing down-left, looking at the viewer, full body, centered, single character.',
    'Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.',
    'Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.',
    'No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.',
  ].join('\n'),
  dark: [
    'Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.',
    'Subject: {subject}',
    'Background story: {story}',
    'Color scheme: {colors}',
    'Intimidating posture.',
    '3/4 front view facing down-left, looking at the viewer, full body, centered, single character.',
    'Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.',
    'Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.',
    'No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.',
  ].join('\n'),
};

/** そのキャラクターの絵を頼む指示文（英語） */
export function promptOf(c: CharacterInfo): string {
  let colors = c.colorsEn;
  // 緑の色のキャラクターは、背景の緑と一緒に抜けないよう、緑を暗く・くすませてもらう
  if (/green|olive|lime|teal|moss/i.test(c.colorsEn)) colors += ". Keep the creature's greens clearly darker and more muted than the pure green background";
  return TEMPLATE[c.pole].replace('{subject}', c.lookEn).replace('{story}', c.loreEn).replace('{colors}', `${colors}.`);
}

export function renderCharactersDoc(): string {
  const lines: string[] = [
    '# キャラクター台帳',
    '',
    '<!-- このファイルは scripts/characters.ts が作る。直接書き換えず、src/game/characters.ts を直して `npm run characters` を動かす -->',
    '',
    '魔物・相棒・これから出すキャラクターの、背景と絵の決まりの一覧。背景はゲームのつよさの画面に出る。',
    '絵の方向（神獣・魔獣）の決まりは docs/art-guide.md 2章。',
    '',
    '- 直すところ：src/game/characters.ts（名前・方向・攻撃の動き方・背景・見た目・絵の進み具合）',
    '- 直したら：`npm run characters` でこのファイルを作り直す（作り直し忘れは `npm test` で見つかる）',
    '- 絵を頼むとき：下の指示文をそのまま貼り、方向の見本の絵を添える。できた絵は `monster_<ID>.png` の名前で送る',
    '',
    '## 一覧',
    '',
    '| ID | 名前 | 方向 | 動き方 | 背景 | 絵 |',
    '|---|---|---|---|---|---|',
  ];
  for (const c of CHARACTERS) {
    lines.push(
      `| ${c.id} | ${c.name}${c.planned ? '（未実装）' : ''} | ${POLE_LABEL[c.pole]} | ${MOTION_LABEL[c.motion]} | ${c.lore} | ${ART_STATUS_LABEL[c.art]} |`,
    );
  }
  const counts = (['divine', 'dark'] as ArtPole[]).map((p) => `${POLE_LABEL[p]} ${CHARACTERS.filter((c) => c.pole === p).length}体`);
  lines.push('', `全${CHARACTERS.length}体（${counts.join('、')}）`, '');
  lines.push('## 方向ごとの見本の絵', '', '| 方向 | 添える絵 |', '|---|---|');
  for (const p of ['divine', 'dark'] as ArtPole[]) lines.push(`| ${POLE_LABEL[p]} | ${REFERENCE[p]} |`);
  lines.push('', '## キャラクターごとの指示文', '');
  for (const c of CHARACTERS) {
    lines.push(`### ${c.name}（${c.id}）　${POLE_LABEL[c.pole]}`, '');
    lines.push(`- 背景：${c.lore}`);
    lines.push(`- 見た目：${c.look}`);
    lines.push(`- 色：${c.colors}`);
    lines.push(`- 攻撃の動き方：${MOTION_LABEL[c.motion]}`);
    lines.push(`- 絵：${ART_STATUS_LABEL[c.art]}`);
    lines.push(`- 添える見本：${REFERENCE[c.pole]}`);
    if (c.note) lines.push(`- メモ：${c.note}`);
    lines.push('', '```', promptOf(c), '```', '');
  }
  return lines.join('\n');
}
