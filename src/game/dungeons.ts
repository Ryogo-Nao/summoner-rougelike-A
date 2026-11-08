import { ARROW_DROP, ITEMS, STAR_ITEMS, createItem, createRune, type Item, type ItemKind } from './items';
import type { Rng } from './rng';

/** 落ちているアイテム1行ぶん。floors を省くと全階に出る（同じアイテムを階ごとに分けて書いてもよい） */
export interface ItemEntry {
  kind: ItemKind;
  weight: number;
  floors?: [number, number];
}

/**
 * 出てくる魔物1行ぶん。level を省くとダンジョンの monsterLevel。
 * 深い階ほどレベルを上げて、弱い魔物も手ごわい敵として出せる（同じ魔物を階ごとに分けて書いてよい）
 */
export interface MonsterEntry {
  species: string;
  floors: [number, number];
  level?: number;
}

/**
 * ダンジョン（requirements.md 7章）。階数、階段での仲間の回復、
 * 落ちているアイテムの出やすさ、出てくる魔物をダンジョンごとに持つ
 */
/**
 * マップの見た目（requirements.md 10.1）。床と壁の石の色、明かりの色と暗さ、たいまつの多さ。
 * ダンジョンごとに変えて、雰囲気を分ける
 */
export interface MapTheme {
  /** 床の土と、床に埋まった小石 */
  floor: string;
  pebble: string;
  /** 壁の上の面の石と、石のすき間 */
  wallStone: string;
  mortar: string;
  /** 壁の手前の側面 */
  face: string;
  /** 床と接する壁のふちの石 */
  rim: string;
  /** まだ見ていないところ */
  outside: string;
  /** 主人公とたいまつの明かりの色（r, g, b） */
  light: [number, number, number];
  /** 明かりから遠いところの暗さ（0〜1） */
  dark: number;
  /** 床に面した壁に、たいまつを置く割合（0〜1） */
  torches: number;
}

export interface Dungeon {
  id: string;
  name: string;
  /** ダンジョンを選ぶ画面に出す説明 */
  desc: string;
  /** 挑むのに踏破が必要なダンジョンの id。省くと最初から挑める */
  requires?: string;
  floors: number;
  /** 階段を降りたときに仲間が回復する割合。0 なら回復しない */
  allyStairsHeal: number;
  /** 1階に落ちているアイテムの数 */
  itemsPerFloor: [number, number];
  /** 出てくる魔物の基本のレベル。難しいダンジョンほど上げる（2つ目以降は2ずつなど） */
  monsterLevel: number;
  items: ItemEntry[];
  monsters: MonsterEntry[];
  /**
   * モンスターハウス（balance.md 7.2）。fromFloor 階から、chance の確率でその階のどこかの部屋が
   * モンスターハウスになる。魔物とアイテムの数は、ふつうの分とは別に足す
   */
  monsterHouse: { chance: number; fromFloor: number; monsters: [number, number]; items: [number, number] };
  theme: MapTheme;
  /**
   * 落ちているルーン（balance.md 9章）。1階に piles 個の山を置き、1つの額は amount の幅。
   * 深い階ほど、1階ごとに perFloor の割合で増える
   */
  runes: { piles: [number, number]; amount: [number, number]; perFloor: number };
}

/** 星（9種類）を、それぞれ同じ重みで並べる。重みは、そのダンジョンの印と同じくらいにする */
const stars = (weight: number): ItemEntry[] => STAR_ITEMS.map((kind) => ({ kind, weight }));

/** 最初のダンジョン（balance.md 6.2、4章） */
const FIRST: Dungeon = {
  id: 'first',
  name: 'はじまりの洞窟',
  desc: '全10階　魔物はLv1\n仲間と出会う\n最初のダンジョン',
  floors: 10,
  allyStairsHeal: 0.25,
  runes: { piles: [1, 2], amount: [5, 15], perFloor: 0.15 },
  // 茶色の岩の洞窟。たいまつが多め
  theme: {
    floor: '#5b4733',
    pebble: '#7a6249',
    wallStone: '#7a6550',
    mortar: '#3a2c1f',
    face: '#5e4a38',
    rim: '#c4ad86',
    outside: '#2a2119',
    light: [255, 178, 96],
    dark: 0.42,
    torches: 0.12,
  },
  itemsPerFloor: [4, 6],
  monsterLevel: 1,
  monsterHouse: { chance: 0.08, fromFloor: 3, monsters: [6, 9], items: [4, 7] },
  items: [
    { kind: 'herb', weight: 20 },
    { kind: 'bigHerb', weight: 6, floors: [4, 10] },
    { kind: 'water', weight: 12 },
    { kind: 'antidote', weight: 6 },
    { kind: 'kitsuke', weight: 6 },
    { kind: 'bread', weight: 4 },
    { kind: 'bigBread', weight: 1.5 },
    { kind: 'blank', weight: 4 },
    { kind: 'arrow', weight: 6 },
    { kind: 'ironArrow', weight: 2 },
    { kind: 'sealReveal', weight: 2 },
    { kind: 'sealRevive', weight: 1.5 },
    { kind: 'sealSummon', weight: 1.5 },
    { kind: 'sealPoison', weight: 1.5 },
    { kind: 'sealConfuse', weight: 1.5 },
    { kind: 'sealEscape', weight: 1 },
    { kind: 'sealPin', weight: 1 },
    { kind: 'sealSleep', weight: 1 },
    { kind: 'sealDoom', weight: 0.5 },
    ...stars(1.5),
    { kind: 'pot', weight: 1 },
    // 袋はめったに出ない
    { kind: 'pouch', weight: 0.5 },
    { kind: 'finePouch', weight: 0.2 },
    { kind: 'holyPouch', weight: 0.15 },
    { kind: 'club', weight: 4 },
    { kind: 'bronzeSword', weight: 3 },
    { kind: 'ironSword', weight: 1.5 },
    { kind: 'woodShield', weight: 4 },
    { kind: 'leatherShield', weight: 3 },
    { kind: 'ironShield', weight: 1.5 },
    // 魔導書はめったに出ない。9種あわせて、ほかのアイテムに対して4〜5％（4種だったころと同じくらい）
    { kind: 'tomeFire', weight: 0.6 },
    { kind: 'tomeIce', weight: 0.6 },
    { kind: 'tomeWind', weight: 0.6 },
    { kind: 'tomeThunder', weight: 0.6 },
    { kind: 'tomeEarth', weight: 0.6 },
    { kind: 'tomePower', weight: 0.6 },
    { kind: 'tomeGuard', weight: 0.6 },
    { kind: 'tomeMagic', weight: 0.6 },
    { kind: 'tomeWard', weight: 0.6 },
  ],
  monsters: [
    { species: 'chuppi', floors: [1, 3] },
    { species: 'berogg', floors: [1, 4] },
    { species: 'patari', floors: [2, 5] },
    { species: 'pokotake', floors: [3, 7] },
    { species: 'shururu', floors: [3, 6] },
    { species: 'garuf', floors: [4, 8] },
    { species: 'kaburamu', floors: [5, 9] },
    { species: 'moyari', floors: [6, 10] },
    { species: 'hidamari', floors: [7, 10] },
    { species: 'goromu', floors: [8, 10] },
  ],
};

/**
 * 2つ目のダンジョン（案）。難しさは中くらい（balance.md 7.4）。
 * B1F から中くらいの魔物（シュルル・ポコタケ）が出て、強い魔物は B3F から。
 * レベルは入口のLv3から、深い階のLv10まで上がる。階段での仲間の回復は少なめ。上薬草と強い装備が出やすい
 */
const FOREST: Dungeon = {
  id: 'forest',
  name: 'ささやきの森',
  desc: '全15階　魔物はLv3〜10\n階段での仲間の回復が少ない',
  requires: 'first',
  floors: 15,
  allyStairsHeal: 0.15,
  runes: { piles: [1, 3], amount: [10, 25], perFloor: 0.15 },
  // 苔むした緑の石の森。たいまつは少なく、明かりは白っぽい
  theme: {
    floor: '#4a5434',
    pebble: '#68744a',
    wallStone: '#6f7d58',
    mortar: '#2c3520',
    face: '#4d573a',
    rim: '#b3c28c',
    outside: '#1f2618',
    light: [255, 236, 170],
    dark: 0.38,
    torches: 0.05,
  },
  itemsPerFloor: [4, 6],
  monsterLevel: 3,
  monsterHouse: { chance: 0.15, fromFloor: 3, monsters: [6, 10], items: [5, 8] },
  items: [
    { kind: 'herb', weight: 18 },
    { kind: 'bigHerb', weight: 8, floors: [3, 15] },
    { kind: 'water', weight: 12 },
    { kind: 'antidote', weight: 7 },
    { kind: 'kitsuke', weight: 7 },
    { kind: 'bread', weight: 4 },
    { kind: 'bigBread', weight: 2 },
    { kind: 'blank', weight: 4 },
    { kind: 'arrow', weight: 5 },
    { kind: 'ironArrow', weight: 3 },
    { kind: 'sealReveal', weight: 2 },
    { kind: 'sealRevive', weight: 1.5 },
    { kind: 'sealSummon', weight: 1.5 },
    { kind: 'sealPoison', weight: 1.5 },
    { kind: 'sealConfuse', weight: 1.5 },
    { kind: 'sealEscape', weight: 1.5 },
    { kind: 'sealPin', weight: 1.5 },
    { kind: 'sealSleep', weight: 1.5 },
    { kind: 'sealDoom', weight: 0.5 },
    ...stars(1.5),
    { kind: 'pot', weight: 1.5 },
    { kind: 'pouch', weight: 0.6 },
    { kind: 'finePouch', weight: 0.3 },
    { kind: 'holyPouch', weight: 0.2 },
    { kind: 'club', weight: 2 },
    { kind: 'bronzeSword', weight: 3 },
    { kind: 'ironSword', weight: 2.5 },
    { kind: 'woodShield', weight: 2 },
    { kind: 'leatherShield', weight: 3 },
    { kind: 'ironShield', weight: 2.5 },
    // 属性の装備は、そのダンジョンに合った属性が落ちている（balance.md 6.7）
    { kind: 'windSword', weight: 0.8 },
    { kind: 'windShield', weight: 0.8 },
    { kind: 'earthSword', weight: 0.8 },
    { kind: 'earthShield', weight: 0.8 },
    { kind: 'windStaff', weight: 0.5 },
    { kind: 'earthStaff', weight: 0.5 },
    { kind: 'tomeFire', weight: 0.6 },
    { kind: 'tomeIce', weight: 0.6 },
    { kind: 'tomeWind', weight: 0.6 },
    { kind: 'tomeThunder', weight: 0.6 },
    { kind: 'tomeEarth', weight: 0.6 },
    { kind: 'tomePower', weight: 0.6 },
    { kind: 'tomeGuard', weight: 0.6 },
    { kind: 'tomeMagic', weight: 0.6 },
    { kind: 'tomeWard', weight: 0.6 },
    // 配合の書は B6F から、まれに拾える（転生の書は森では出ない）
    { kind: 'fusionBook', weight: 1, floors: [6, 15] },
  ],
  monsters: [
    // 浅い階：中くらいの魔物がLv3で出る。ガルフは B3F から
    { species: 'shururu', floors: [1, 5], level: 3 },
    { species: 'pokotake', floors: [1, 5], level: 3 },
    { species: 'berogg', floors: [1, 4], level: 3 },
    { species: 'garuf', floors: [3, 5], level: 3 },
    { species: 'nemuriga', floors: [1, 5], level: 3 },
    { species: 'kuimushi', floors: [1, 5], level: 3 },
    { species: 'amigumo', floors: [2, 5], level: 3 },
    // 中ほど：カブラムとモヤリが出てくる
    { species: 'shururu', floors: [6, 10], level: 6 },
    { species: 'pokotake', floors: [6, 10], level: 6 },
    { species: 'garuf', floors: [6, 10], level: 6 },
    { species: 'kaburamu', floors: [6, 10], level: 6 },
    { species: 'moyari', floors: [8, 10], level: 7 },
    { species: 'nemuriga', floors: [6, 10], level: 6 },
    { species: 'amigumo', floors: [6, 10], level: 6 },
    { species: 'chisui', floors: [6, 10], level: 6 },
    { species: 'tsubumaru', floors: [7, 10], level: 6 },
    // 深い階：強い魔物が中心。パタリは深い階だけ、レベルを上げて出す
    { species: 'garuf', floors: [11, 15], level: 9 },
    { species: 'kaburamu', floors: [11, 15], level: 9 },
    { species: 'moyari', floors: [11, 15], level: 9 },
    { species: 'shururu', floors: [11, 15], level: 9 },
    { species: 'hidamari', floors: [12, 15], level: 10 },
    { species: 'patari', floors: [11, 15], level: 10 },
    { species: 'chisui', floors: [11, 15], level: 9 },
    { species: 'tsubumaru', floors: [11, 15], level: 9 },
    { species: 'fuwakura', floors: [11, 15], level: 9 },
    { species: 'nurarika', floors: [12, 15], level: 10 },
  ],
};

/**
 * 3つ目のダンジョン。難しさは、出てくる魔物の種類で決める（balance.md 7.4）。
 * B1F から単体で強い魔物（ガルフ・カブラム・モヤリなど）だけが出るが、入口ではレベルが低く（Lv5〜6）、
 * 深くなるにつれて上がる（B16F〜でLv15〜16）。階段での仲間の回復はさらに少ない
 */
const ICE: Dungeon = {
  id: 'ice',
  name: 'しずくの氷穴',
  desc: '全20階　魔物はLv5〜16\n強い魔物ばかりが出る',
  requires: 'forest',
  floors: 20,
  allyStairsHeal: 0.1,
  runes: { piles: [2, 3], amount: [15, 35], perFloor: 0.15 },
  // 青白い氷の岩の洞穴。たいまつはまれで、明かりは青みがかる
  theme: {
    floor: '#3e4a57',
    pebble: '#5c6b7a',
    wallStone: '#6d8093',
    mortar: '#26303b',
    face: '#4a5a6b',
    rim: '#bcd3e6',
    outside: '#1a222b',
    light: [190, 220, 255],
    dark: 0.4,
    torches: 0.04,
  },
  itemsPerFloor: [5, 7],
  monsterLevel: 5,
  monsterHouse: { chance: 0.15, fromFloor: 4, monsters: [7, 10], items: [6, 9] },
  items: [
    { kind: 'herb', weight: 16 },
    { kind: 'bigHerb', weight: 10 },
    { kind: 'water', weight: 12 },
    { kind: 'antidote', weight: 7 },
    { kind: 'kitsuke', weight: 7 },
    { kind: 'bread', weight: 4 },
    { kind: 'bigBread', weight: 2.5 },
    { kind: 'blank', weight: 4.5 },
    { kind: 'arrow', weight: 4 },
    { kind: 'ironArrow', weight: 4 },
    { kind: 'sealReveal', weight: 2 },
    { kind: 'sealRevive', weight: 2 },
    { kind: 'sealSummon', weight: 1.5 },
    { kind: 'sealPoison', weight: 1.5 },
    { kind: 'sealConfuse', weight: 1.5 },
    { kind: 'sealEscape', weight: 1.5 },
    { kind: 'sealPin', weight: 2 },
    { kind: 'sealSleep', weight: 2 },
    { kind: 'sealDoom', weight: 0.8 },
    ...stars(1.5),
    { kind: 'pot', weight: 2 },
    { kind: 'pouch', weight: 0.6 },
    { kind: 'finePouch', weight: 0.4 },
    { kind: 'holyPouch', weight: 0.25 },
    { kind: 'club', weight: 1 },
    { kind: 'bronzeSword', weight: 2 },
    { kind: 'ironSword', weight: 3.5 },
    { kind: 'woodShield', weight: 1 },
    { kind: 'leatherShield', weight: 2 },
    { kind: 'ironShield', weight: 3.5 },
    { kind: 'iceSword', weight: 1.2 },
    { kind: 'iceShield', weight: 1.2 },
    { kind: 'iceStaff', weight: 0.8 },
    { kind: 'tomeFire', weight: 0.75 },
    { kind: 'tomeIce', weight: 0.75 },
    { kind: 'tomeWind', weight: 0.75 },
    { kind: 'tomeThunder', weight: 0.75 },
    { kind: 'tomeEarth', weight: 0.75 },
    { kind: 'tomePower', weight: 0.75 },
    { kind: 'tomeGuard', weight: 0.75 },
    { kind: 'tomeMagic', weight: 0.75 },
    { kind: 'tomeWard', weight: 0.75 },
    // 配合の書・転生の書は、深い階でまれに拾える（配合の書は印や装備よりは出にくい）
    { kind: 'fusionBook', weight: 1, floors: [6, 20] },
    { kind: 'rebirthBook', weight: 0.5, floors: [6, 20] },
  ],
  monsters: [
    // 浅い階：強い魔物がLv5〜6で出る。弱い魔物は出さない
    { species: 'garuf', floors: [1, 5], level: 5 },
    { species: 'kaburamu', floors: [1, 5], level: 5 },
    { species: 'shururu', floors: [1, 5], level: 6 },
    { species: 'moyari', floors: [3, 5], level: 6 },
    { species: 'nurarika', floors: [1, 5], level: 5 },
    { species: 'chisui', floors: [1, 5], level: 6 },
    { species: 'kirigani', floors: [3, 5], level: 5 },
    // 中ほど：ヒダマリとゴロムも出てくる
    { species: 'garuf', floors: [6, 10], level: 8 },
    { species: 'kaburamu', floors: [6, 10], level: 8 },
    { species: 'moyari', floors: [6, 10], level: 9 },
    { species: 'hidamari', floors: [6, 10], level: 9 },
    { species: 'goromu', floors: [7, 10], level: 8 },
    { species: 'nurarika', floors: [6, 10], level: 9 },
    { species: 'kirigani', floors: [6, 10], level: 8 },
    { species: 'fuwakura', floors: [6, 10], level: 8 },
    { species: 'dosuino', floors: [6, 10], level: 8 },
    // 深い階：同じ魔物が、深いほど高いレベルで出る。ツララグマは B13F から
    { species: 'garuf', floors: [11, 15], level: 12 },
    { species: 'kaburamu', floors: [11, 15], level: 12 },
    { species: 'moyari', floors: [11, 15], level: 12 },
    { species: 'hidamari', floors: [11, 15], level: 12 },
    { species: 'goromu', floors: [11, 15], level: 12 },
    { species: 'nurarika', floors: [11, 15], level: 12 },
    { species: 'kirigani', floors: [11, 15], level: 12 },
    { species: 'fuwakura', floors: [11, 15], level: 12 },
    { species: 'dosuino', floors: [11, 15], level: 12 },
    { species: 'tsuraragu', floors: [13, 15], level: 11 },
    { species: 'garuf', floors: [16, 20], level: 15 },
    { species: 'kaburamu', floors: [16, 20], level: 15 },
    { species: 'moyari', floors: [16, 20], level: 15 },
    { species: 'hidamari', floors: [16, 20], level: 16 },
    { species: 'goromu', floors: [16, 20], level: 16 },
    { species: 'nurarika', floors: [16, 20], level: 15 },
    { species: 'kirigani', floors: [16, 20], level: 15 },
    { species: 'fuwakura', floors: [16, 20], level: 15 },
    { species: 'dosuino', floors: [16, 20], level: 15 },
    { species: 'tsuraragu', floors: [16, 20], level: 16 },
  ],
};

/** 同じレベルで出る魔物をまとめて書く（新しいダンジョン用） */
const band = (species: string[], floors: [number, number], level: number): MonsterEntry[] =>
  species.map((id) => ({ species: id, floors, level }));

/** 新しいダンジョンに共通の、草・食べ物・矢・印・袋・魔導書の重み。装備と書はダンジョンごとに足す */
const commonItems = (deep: number): ItemEntry[] => [
  { kind: 'herb', weight: 15 },
  { kind: 'bigHerb', weight: 10 },
  { kind: 'water', weight: 12 },
  { kind: 'antidote', weight: 7 },
  { kind: 'kitsuke', weight: 7 },
  { kind: 'bread', weight: 4 },
  { kind: 'bigBread', weight: 2.5 },
  { kind: 'blank', weight: 4.5 },
  { kind: 'arrow', weight: 4 },
  { kind: 'ironArrow', weight: 4 },
  { kind: 'sealReveal', weight: 2 },
  { kind: 'sealRevive', weight: 2 },
  { kind: 'sealSummon', weight: 1.5 },
  { kind: 'sealPoison', weight: 1.5 },
  { kind: 'sealConfuse', weight: 1.5 },
  { kind: 'sealEscape', weight: 1.5 },
  { kind: 'sealPin', weight: 2 },
  { kind: 'sealSleep', weight: 2 },
  { kind: 'sealDoom', weight: 0.8 },
  ...stars(1.5),
  { kind: 'pot', weight: 2 },
  { kind: 'pouch', weight: 0.6 },
  { kind: 'finePouch', weight: 0.4 },
  { kind: 'holyPouch', weight: 0.3 },
  { kind: 'bronzeSword', weight: 1.5 },
  { kind: 'ironSword', weight: 3.5 },
  { kind: 'leatherShield', weight: 1.5 },
  { kind: 'ironShield', weight: 3.5 },
  ...(['tomeFire', 'tomeIce', 'tomeWind', 'tomeThunder', 'tomeEarth', 'tomePower', 'tomeGuard', 'tomeMagic', 'tomeWard'] as ItemKind[]).map(
    (kind) => ({ kind, weight: 0.75 }),
  ),
  { kind: 'fusionBook', weight: 1, floors: [6, deep] },
  { kind: 'rebirthBook', weight: 0.5, floors: [6, deep] },
];

/**
 * 4つ目のダンジョン（難しさ4。しずくの氷穴を6とする。balance.md 7.5）。2026-11-08 に足した魔物が出る。
 * 浅い階は新しい弱い魔物が中心で、カマイタチが B4F から。深くなるとイワガメ・ホムラジシ・シロジカも出る。
 * モンスターハウスが多い（B2F から 30％）。炎と疾風の装備が落ちている
 */
const VALLEY: Dungeon = {
  id: 'valley',
  name: 'ほたる火の谷',
  desc: '全15階　魔物はLv4〜12\nモンスターハウスが多い',
  requires: 'forest',
  floors: 15,
  allyStairsHeal: 0.15,
  runes: { piles: [2, 3], amount: [12, 28], perFloor: 0.15 },
  // 夕暮れの谷。琥珀色の土と、ほたるの淡い黄緑の明かり
  theme: {
    floor: '#5a4a32',
    pebble: '#7d6a48',
    wallStone: '#7b6a4e',
    mortar: '#382c1c',
    face: '#5c4c36',
    rim: '#d8c48e',
    outside: '#241d14',
    light: [240, 236, 160],
    dark: 0.4,
    torches: 0.06,
  },
  itemsPerFloor: [4, 6],
  monsterLevel: 4,
  monsterHouse: { chance: 0.3, fromFloor: 2, monsters: [6, 10], items: [5, 8] },
  items: [
    ...commonItems(15),
    { kind: 'fireSword', weight: 0.8 },
    { kind: 'fireShield', weight: 0.8 },
    { kind: 'fireStaff', weight: 0.5 },
    { kind: 'windSword', weight: 0.8 },
    { kind: 'windShield', weight: 0.8 },
    { kind: 'windStaff', weight: 0.5 },
  ],
  monsters: [
    // 浅い階：新しい弱い魔物がLv4。カマイタチは B4F から
    ...band(['tsunousa', 'watage', 'hinoko', 'hotari', 'tsuchimogu', 'pukuri'], [1, 5], 4),
    ...band(['kamaitachi'], [4, 5], 4),
    // 中ほど：イワガメは B8F、ホムラジシは B9F から
    ...band(['tsunousa', 'watage', 'hinoko', 'hotari', 'tsuchimogu', 'kamaitachi'], [6, 10], 7),
    ...band(['iwagame'], [8, 10], 7),
    ...band(['homurajishi'], [9, 10], 7),
    // 深い階：強い魔物が中心。弱い魔物はレベルを上げて出す。シロジカは B12F から
    ...band(['kamaitachi', 'iwagame', 'homurajishi'], [11, 15], 11),
    ...band(['shirojika'], [12, 15], 11),
    ...band(['tsunousa', 'hinoko', 'watage', 'hotari'], [11, 15], 12),
  ],
};

/**
 * 5つ目のダンジョン（難しさ6。しずくの氷穴と同じくらい）。B1F から新しい強い魔物だけが出る。
 * 階段での仲間の回復は少ない。大地と光の装備が落ちている（光の装備はここで初めて手に入る）
 */
const MINE: Dungeon = {
  id: 'mine',
  name: 'いかずちの坑道',
  desc: '全22階　魔物はLv5〜17\n強い魔物ばかりが出る',
  requires: 'valley',
  floors: 22,
  allyStairsHeal: 0.1,
  runes: { piles: [2, 3], amount: [18, 40], perFloor: 0.15 },
  // 雷の走る古い坑道。黒い岩に、黄色い明かり
  theme: {
    floor: '#3a3a40',
    pebble: '#57575f',
    wallStone: '#5d5d68',
    mortar: '#22222a',
    face: '#45454f',
    rim: '#c8c27a',
    outside: '#16161c',
    light: [255, 236, 140],
    dark: 0.44,
    torches: 0.05,
  },
  itemsPerFloor: [5, 7],
  monsterLevel: 5,
  monsterHouse: { chance: 0.15, fromFloor: 4, monsters: [7, 10], items: [6, 9] },
  items: [
    ...commonItems(22),
    { kind: 'earthSword', weight: 1 },
    { kind: 'earthShield', weight: 1 },
    { kind: 'earthStaff', weight: 0.6 },
    { kind: 'lightSword', weight: 0.8, floors: [6, 22] },
    { kind: 'lightShield', weight: 0.8, floors: [6, 22] },
  ],
  monsters: [
    // 浅い階：強い魔物がLv5。弱い魔物は出さない。クジランは B3F から
    ...band(['raijuu', 'kamaitachi', 'karabone', 'shirojika'], [1, 5], 5),
    ...band(['kujiran'], [3, 5], 5),
    // 中ほど：ホムラジシとイワガメも出る。ビリス・ヨルネコはレベルを上げて出す
    ...band(['raijuu', 'kamaitachi', 'karabone', 'shirojika', 'kujiran', 'iwagame'], [6, 11], 8),
    ...band(['homurajishi'], [8, 11], 9),
    ...band(['birisu', 'yoruneko'], [6, 11], 10),
    // 深い階：ゴウリキは B14F から
    ...band(['raijuu', 'kamaitachi', 'karabone', 'shirojika', 'kujiran', 'iwagame', 'homurajishi'], [12, 17], 12),
    ...band(['gouriki'], [14, 17], 12),
    ...band(['birisu', 'yoruneko', 'pukuri'], [12, 17], 13),
    ...band(['raijuu', 'kamaitachi', 'karabone', 'shirojika', 'kujiran', 'iwagame', 'homurajishi', 'gouriki'], [18, 22], 16),
    ...band(['raijuu', 'karabone'], [21, 22], 17),
  ],
};

/**
 * 6つ目のダンジョン（難しさ7）。B1F から強い魔物と、とても強い魔物（ゴウリキなど）が出る。全30階と長く、
 * 階段での仲間の回復はほとんどない。闇の装備が落ちている（ここで初めて手に入る）
 */
const ABYSS: Dungeon = {
  id: 'abyss',
  name: 'とこやみの大穴',
  desc: '全30階　魔物はLv6〜22\n階段での仲間の回復がほとんどない',
  requires: 'mine',
  floors: 30,
  allyStairsHeal: 0.05,
  runes: { piles: [2, 4], amount: [22, 50], perFloor: 0.15 },
  // 底の見えない闇。紫がかった黒い石に、冷たい紫の明かり
  theme: {
    floor: '#302a3a',
    pebble: '#4a4258',
    wallStone: '#4f465e',
    mortar: '#1c1724',
    face: '#3a3346',
    rim: '#a99ac8',
    outside: '#120f18',
    light: [210, 190, 255],
    dark: 0.48,
    torches: 0.03,
  },
  itemsPerFloor: [5, 7],
  monsterLevel: 6,
  monsterHouse: { chance: 0.2, fromFloor: 5, monsters: [7, 11], items: [6, 9] },
  items: [
    ...commonItems(30),
    { kind: 'darkSword', weight: 0.8, floors: [8, 30] },
    { kind: 'darkShield', weight: 0.8, floors: [8, 30] },
    { kind: 'lightSword', weight: 0.5 },
    { kind: 'lightShield', weight: 0.5 },
    { kind: 'thunderSword', weight: 0.6 },
    { kind: 'fireSword', weight: 0.6 },
  ],
  monsters: [
    // 浅い階：強い魔物がLv6。ゴウリキ・ホムラジシも B1F から
    ...band(['gouriki', 'homurajishi', 'raijuu', 'karabone', 'iwagame', 'kamaitachi'], [1, 6], 6),
    ...band(['kujiran', 'shirojika'], [3, 6], 7),
    // 中ほど：前のダンジョンのとても強い魔物（ゴロム・ツララグマ）も出る
    ...band(['gouriki', 'homurajishi', 'raijuu', 'karabone', 'iwagame', 'kamaitachi', 'kujiran', 'shirojika'], [7, 12], 10),
    ...band(['goromu', 'moyari'], [9, 12], 10),
    ...band(['gouriki', 'homurajishi', 'raijuu', 'karabone', 'iwagame', 'kujiran', 'shirojika', 'goromu', 'moyari'], [13, 18], 13),
    ...band(['tsuraragu', 'nurarika'], [13, 18], 14),
    ...band(['yoruneko', 'birisu', 'tsunousa'], [13, 18], 15),
    // 深い階：レベルがさらに上がる
    ...band(['gouriki', 'homurajishi', 'raijuu', 'karabone', 'iwagame', 'kujiran', 'shirojika', 'goromu', 'tsuraragu'], [19, 24], 17),
    ...band(['yoruneko', 'watage', 'hotari'], [19, 24], 18),
    ...band(['gouriki', 'homurajishi', 'raijuu', 'karabone', 'iwagame', 'kujiran', 'shirojika', 'goromu', 'tsuraragu', 'moyari'], [25, 30], 21),
    ...band(['gouriki', 'homurajishi', 'raijuu'], [28, 30], 22),
  ],
};

export const DUNGEONS: Dungeon[] = [FIRST, FOREST, ICE, VALLEY, MINE, ABYSS];

/** 挑めるか。前のダンジョンを踏破していなければ挑めない */
export function isUnlocked(dungeon: Dungeon, cleared: string[]): boolean {
  return !dungeon.requires || cleared.includes(dungeon.requires);
}

export function dungeonById(id: string): Dungeon {
  return DUNGEONS.find((d) => d.id === id) ?? FIRST;
}

const onFloor = (floors: [number, number] | undefined, floor: number) =>
  !floors || (floor >= floors[0] && floor <= floors[1]);

/** その階に落ちているアイテムを1つ作る。矢は何本かまとめて落ちている */
export function randomItem(dungeon: Dungeon, floor: number, rng: Rng): Item {
  const entries = dungeon.items.filter((e) => onFloor(e.floors, floor));
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let r = rng.next() * total;
  let kind = entries[0].kind;
  for (const e of entries) {
    r -= e.weight;
    if (r < 0) {
      kind = e.kind;
      break;
    }
  }
  const def = ITEMS[kind];
  if (def.arrow) return createItem(kind, rng.int(...ARROW_DROP));
  if (def.pouch) return createItem(kind, rng.int(...def.pouch.capacity));
  return createItem(kind);
}

/** その階に落ちているルーンの山1つ */
export function randomRune(dungeon: Dungeon, floor: number, rng: Rng): Item {
  const { amount, perFloor } = dungeon.runes;
  return createRune(Math.round(rng.int(...amount) * (1 + (floor - 1) * perFloor)));
}

/** その階に出る魔物と、そのレベル */
export function monstersForFloor(dungeon: Dungeon, floor: number): { species: string; level: number }[] {
  return dungeon.monsters
    .filter((e) => onFloor(e.floors, floor))
    .map((e) => ({ species: e.species, level: e.level ?? dungeon.monsterLevel }));
}
