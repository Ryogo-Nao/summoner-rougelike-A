/**
 * キャラクターの台帳（docs/characters.md の元）。魔物・相棒・これから出すキャラクターの、背景と絵の決まりを1か所で持つ。
 * 強さなどゲームの数値は monsters.ts・cards.ts にある。ここは物語と見た目だけ。
 *
 * 変えたら `npm run characters` で docs/characters.md（一覧と、絵を頼む指示文）を作り直す。
 * このファイルは何も import しない（scripts/characters.ts から Node でそのまま読むため）
 */

/** 絵の方向（docs/art-guide.md 2.1）。divine は神獣、dark は魔獣 */
export type ArtPole = 'divine' | 'dark';

/** 絵の進み具合。none は絵がない（絵文字）、old は前の絵柄（ちびキャラ）の絵、draft は新しい方向の見本の絵があるがゲームに入れていない、done は新しい方向の絵がゲームに入っている */
export type ArtStatus = 'none' | 'old' | 'draft' | 'done';

export interface CharacterInfo {
  /** 魔物の id（monsters.ts）。絵のファイル名にも使う */
  id: string;
  name: string;
  pole: ArtPole;
  /** 背景。つよさの画面に出す。「〇〇な□□、〜する」のように読点で区切った2つの句、36字まで */
  lore: string;
  /** 背景の英語（絵を頼むときに使う） */
  loreEn: string;
  /** 見た目（日本語）と、絵を頼むときの英語 */
  look: string;
  lookEn: string;
  art: ArtStatus;
  /** まだゲームにいないキャラクター（進化先など） */
  planned?: boolean;
  note?: string;
}

export const POLE_LABEL: Record<ArtPole, string> = { divine: '神獣', dark: '魔獣' };
export const ART_STATUS_LABEL: Record<ArtStatus, string> = {
  none: '絵なし（絵文字）',
  old: '前の絵柄（ちびキャラ）',
  draft: '見本あり（ゲームには未反映）',
  done: '新しい絵柄で反映済み',
};

export const CHARACTERS: readonly CharacterInfo[] = [
  {
    id: 'izutsuchi',
    name: 'イヅツチ',
    pole: 'divine',
    lore: '雷雲から生まれ落ちた小さな猫、初代の召喚士とともに歩む相棒',
    loreEn: 'A small cat born from a thundercloud, the loyal partner who walks beside the first summoner.',
    look: 'しなやかな若い雷の猫。白と空色のやわらかな毛、稲妻の形のしっぽの先、首もとに小さな金の稲妻の飾り。明るく鋭い金の目',
    lookEn:
      'A small, sleek young thunder cat with soft white and sky-blue fur, a lightning-bolt shaped tail tip and a small gold lightning charm at the neck. Bright, alert golden eyes.',
    art: 'old',
  },
  {
    id: 'todoroki',
    name: 'トドロキ',
    pole: 'divine',
    lore: '幾度もの転生を経て雷そのものとなった大猫、召喚士の行く手を守る守護神',
    loreEn: 'A great cat that became thunder itself after countless rebirths, a guardian deity who protects the summoner’s path.',
    look: 'イヅツチの進化した姿。大きくしなやかな体、流れるたてがみ、額と胸に金の兜と紋章、毛に金と青の稲妻の模様。静かで鋭い金の目',
    lookEn:
      'The evolved form of Izutsuchi: a large, elegant sacred thunder cat with a long body, flowing white and sky-blue mane, gold ornamental armor on the forehead and chest with a lightning crest, gold-and-blue lightning patterns in the fur. Calm, sharp golden eyes.',
    art: 'draft',
    planned: true,
    note: 'イヅツチの転生が10回をこえると進化する（まだ作っていない）。見本は design/art-direction/ref_divine_todoroki.webp。背景は案',
  },
  {
    id: 'chuppi',
    name: 'チュッピ',
    pole: 'divine',
    lore: '地下水の音を聞き分ける小さな鼠、迷宮の抜け道を誰よりも知る',
    loreEn: 'A tiny mouse that can tell apart the sounds of underground water, and knows the hidden paths of the labyrinth better than anyone.',
    look: 'すばしこい小さな鼠。音をとらえる大きな丸い耳、細く長いしっぽ、片耳に小さな金の輪。賢そうな目',
    lookEn: 'A small, quick mouse with large rounded ears that catch every sound, a long thin tail and a tiny gold ring on one ear. Clever, attentive eyes.',
    art: 'old',
  },
  {
    id: 'berogg',
    name: 'ベロッグ',
    pole: 'divine',
    lore: '苔むした泉の番をする蛙、長い舌で近づく者を確かめる',
    loreEn: 'A frog that guards a moss-covered spring, testing anyone who approaches with its long tongue.',
    look: 'どっしりした蛙。苔色の肌、背中に苔と小さなシダ、長い舌を少し出す。額に小さな金の飾り',
    lookEn:
      'A sturdy frog with moss-green skin, moss and tiny ferns growing on its back like a shrine roof, a long tongue curled out, and a small gold ornament on its forehead. Watchful eyes.',
    art: 'old',
  },
  {
    id: 'patari',
    name: 'パタリ',
    pole: 'dark',
    lore: '闇に溶けて群れ飛ぶ蝙蝠、羽音だけを残して血の匂いを追う',
    loreEn: 'A bat that flies in swarms, melting into the darkness and following the scent of blood, leaving only the sound of its wings.',
    look: 'やせた蝙蝠。ぎざぎざの大きな翼、とがった耳、小さな牙、細く光る目。影のような青灰の毛',
    lookEn: 'A lean bat with large ragged wings, sharp pointed ears, tiny fangs and narrow glowing eyes, wrapped in shadowy slate fur.',
    art: 'old',
  },
  {
    id: 'pokotake',
    name: 'ポコタケ',
    pole: 'divine',
    lore: '洞窟の奥で淡く光る茸、その胞子は夢と現の境をぼかす',
    loreEn: 'A mushroom glowing faintly deep in the cave, whose spores blur the line between dream and reality.',
    look: '歩く茸。淡く光る広いかさに金の輪の模様、根のような小さな足。おだやかで眠たげな顔',
    lookEn: 'A walking mushroom with a wide, softly luminous cap patterned with gold rings, small root-like legs and a calm, sleepy face.',
    art: 'old',
  },
  {
    id: 'shururu',
    name: 'シュルル',
    pole: 'dark',
    lore: '岩の隙間に潜む毒蛇、音もなく近づき牙を突き立てる',
    loreEn: 'A venomous snake lurking in cracks in the rock, approaching without a sound to sink its fangs in.',
    look: 'とぐろを巻く細身の蛇。青灰のうろこと淡い空色の腹、鎌首をもたげ、長い牙に毒のしずく。細めた金の目',
    lookEn: 'A slender coiled serpent with slate-blue scales and a pale-blue belly, head raised, long fangs with a single drop of venom, narrowed golden eyes.',
    art: 'old',
  },
  {
    id: 'garuf',
    name: 'ガルフ',
    pole: 'dark',
    lore: '風を切って疾走する黒狼、闇夜に紛れ獲物を狙う',
    loreEn: 'A black wolf that races through the wind, hiding in the night to hunt its prey.',
    look: 'しなやかな黒い狼。今にも駆け出しそうな構え、風になびく毛とたてがみ、鋭い牙、射抜くような金の目',
    lookEn: 'A lean black-blue wolf in a ready-to-sprint stance, wind-swept fur and mane, sharp fangs and piercing golden eyes.',
    art: 'old',
  },
  {
    id: 'kaburamu',
    name: 'カブラム',
    pole: 'dark',
    lore: '鋼の殻をまとう大蠍、迷宮の通路を縄張りとして譲らない',
    loreEn: 'A giant scorpion clad in a steel shell, holding the passages of the labyrinth as its territory.',
    look: '大きな蠍。鋼のような重い甲羅、大きなはさみ、振り上げた鋭い針。傷だらけの殻',
    lookEn: 'A large scorpion with heavy steel-like armored plates, big crushing claws, a raised sharp stinger and a scratched, battle-worn shell.',
    art: 'old',
  },
  {
    id: 'moyari',
    name: 'モヤリ',
    pole: 'dark',
    lore: '迷宮で果てた者の未練が霧となったもの、壁をすり抜け生者を誘う',
    loreEn: 'The lingering regret of those who perished in the labyrinth, turned into mist; it slips through walls to lure the living.',
    look: '霧の亡霊。うつろで悲しげな顔、細く長くたなびく腕、淡く光る目。下半身は霧に溶けている',
    lookEn: 'A ghostly mist creature with a hollow, sorrowful face, long trailing wisp-like arms and pale glowing eyes, its lower body fading into fog.',
    art: 'old',
  },
  {
    id: 'hidamari',
    name: 'ヒダマリ',
    pole: 'divine',
    lore: '地の底に陽だまりを運ぶ火蜥蜴、古の召喚士はその炎を借りたという',
    loreEn: 'A fire lizard that carries a patch of sunlight into the depths; summoners of old are said to have borrowed its flame.',
    look: '優美な蜥蜴。夕焼け色と金のうろこ、しっぽの先に小さく静かな炎、頭に太陽の形の金の冠。賢く落ち着いた目',
    lookEn:
      'A graceful lizard with warm sunset-orange and gold scales, a small steady flame on its tail tip, a sun-shaped gold crest on its head and wise, calm eyes.',
    art: 'old',
  },
  {
    id: 'goromu',
    name: 'ゴロム',
    pole: 'divine',
    lore: '古の祭壇を守り続ける石の巨人、主を失ってなお務めを忘れない',
    loreEn: 'A stone giant that still guards an ancient altar, never forgetting its duty even after losing its master.',
    look: '石を積んだ大きな巨人。古い文字が刻まれ金が埋め込まれた石、肩に苔。どっしりとしたやさしい目',
    lookEn: 'A massive golem of stacked carved stones engraved with ancient runes inlaid with gold, moss on its shoulders, and steady, gentle eyes.',
    art: 'old',
  },
  {
    id: 'nemuriga',
    name: 'ネムリガ',
    pole: 'divine',
    lore: '月明かりの鱗粉をまとう蛾、その羽ばたきは深い眠りを招く',
    loreEn: 'A moth clothed in moonlit scales; the beating of its wings invites a deep sleep.',
    look: '大きく優美な蛾。三日月と目玉の模様の広い羽、ふわふわの体、羽毛のような触角。夢見るような半眼',
    lookEn:
      'A large, elegant moth with broad wings patterned with crescent moons and eye-like circles in pale lavender, night blue and gold, a soft fluffy body, feathery antennae and dreamy half-closed eyes.',
    art: 'none',
  },
  {
    id: 'kuimushi',
    name: 'クイムシ',
    pole: 'dark',
    lore: '魔力を喰らって肥える芋虫、召喚士の力を好んでかじる',
    loreEn: 'A caterpillar that grows fat by devouring magic, and loves to gnaw on a summoner’s power.',
    look: 'ぶよぶよに太った節のある芋虫。小さな歯の並んだ大きな丸い口、皮の下に透ける魔法の文字の模様。欲深そうな細い目',
    lookEn:
      'A bloated, segmented caterpillar with a huge round mouth lined with small teeth, faint magic-rune patterns showing through its skin, and greedy narrowed eyes.',
    art: 'none',
  },
  {
    id: 'amigumo',
    name: 'アミグモ',
    pole: 'dark',
    lore: '通路に見えない糸を張る蜘蛛、かかった獲物は二度と逃さない',
    loreEn: 'A spider that stretches invisible threads across the passages; prey that gets caught never escapes.',
    look: '節の長い脚の蜘蛛。網の模様のある丸い腹、いくつも光る目、後ろに細い糸を引く',
    lookEn: 'A spider with long jointed legs, a round abdomen marked with a web pattern, several gleaming eyes and a thin silk thread trailing behind.',
    art: 'none',
  },
  {
    id: 'chisui',
    name: 'チスイ',
    pole: 'dark',
    lore: '暗がりから忍び寄る吸血の羽虫、奪った血で己の傷を癒す',
    loreEn: 'A blood-sucking insect that creeps up from the shadows, healing its own wounds with the blood it steals.',
    look: '大きな蚊のような羽虫。針のように長い口、透けた細い羽、暗い赤みの腹、鋭い赤い目',
    lookEn: 'A large mosquito-like insect with a long needle-like proboscis, thin translucent wings, a slim body with a dark red-tinted abdomen and sharp red eyes.',
    art: 'none',
  },
  {
    id: 'tsubumaru',
    name: 'ツブマル',
    pole: 'divine',
    lore: '崩れた遺跡の石を背負う大蝸牛、千年かけて迷宮を巡る',
    loreEn: 'A giant snail carrying stones from a collapsed ruin, wandering the labyrinth over a thousand years.',
    look: '大きな蝸牛。古い遺跡の石と折れた小さな柱でできた渦巻きの殻、色あせた金の彫り。落ち着いた辛抱強い顔',
    lookEn:
      'A huge snail whose spiral shell is built from ancient ruin stones and a small broken pillar, with faded gold carvings, and a calm, patient face.',
    art: 'none',
  },
  {
    id: 'fuwakura',
    name: 'フワクラ',
    pole: 'divine',
    lore: '地底湖に漂う光のくらげ、裂かれても静かに元の姿へ戻る',
    loreEn: 'A jellyfish of light drifting in an underground lake; even when torn, it quietly returns to its original form.',
    look: '浮かぶ透明なくらげ。すりガラスのようなかさに金の輪の模様、リボンのような長い触手。おだやかな顔',
    lookEn:
      'A floating translucent jellyfish with a bell like frosted glass marked with a gold ring pattern, long ribbon-like tentacles, and a serene expression.',
    art: 'none',
  },
  {
    id: 'nurarika',
    name: 'ヌラリカ',
    pole: 'dark',
    lore: '冷たい水底に潜む大烏賊、触手を伸ばして獲物を引きずり込む',
    loreEn: 'A giant squid lurking at the bottom of cold waters, stretching its tentacles to drag its prey down.',
    look: 'ぬめる長い体の大烏賊。前へ長く伸ばした2本の触手、吸盤のある腕、大きく冷たい目',
    lookEn: 'A giant squid with a long, slick body, two very long tentacles reaching forward, many curling arms with suckers and large, cold eyes.',
    art: 'none',
  },
  {
    id: 'kirigani',
    name: 'キリガニ',
    pole: 'dark',
    lore: '氷の甲羅を持つ大蟹、二つの鋏は凍てつく岩さえ断ち切る',
    loreEn: 'A giant crab with an icy shell; its two pincers can cut through even frozen rock.',
    look: '重い大蟹。霜でひび割れたふちの、ぎざぎざの氷色の甲羅。高く振り上げた、のこぎり刃の大きなはさみ2つ。威嚇する目',
    lookEn:
      'A heavy crab with a jagged, ice-blue armored shell with frost-cracked edges, two huge serrated pincers raised high, and small menacing eyes on stalks.',
    art: 'none',
  },
  {
    id: 'dosuino',
    name: 'ドスイノ',
    pole: 'dark',
    lore: '怒りのままに突き進む大猪、その牙は鉄の扉さえ貫く',
    loreEn: 'A giant boar that charges forward driven by rage; its tusks pierce even iron doors.',
    look: '筋肉の盛り上がった大猪。逆立つ暗いたてがみ、太く曲がった牙、傷のある皮。頭を低くして突進の構え、怒った目',
    lookEn:
      'A huge muscular boar with a bristling dark mane, massive curved tusks and a scarred hide, head lowered and ready to charge, with furious eyes.',
    art: 'none',
  },
  {
    id: 'tsuraragu',
    name: 'ツララグマ',
    pole: 'dark',
    lore: '氷穴の最奥に君臨する白熊、背の氷柱は挑んだ者たちの墓標',
    loreEn: 'A white bear that reigns in the deepest part of the ice cave; the icicles on its back are gravestones of those who challenged it.',
    look: 'そびえる白熊。背と肩に生えた鋭いつらら、太い爪、冷たく射抜く目、頭に古びて欠けた氷の冠',
    lookEn:
      'A towering white bear with sharp icicles growing along its back and shoulders, heavy claws, cold piercing eyes and an old, broken crown of ice on its head.',
    art: 'none',
  },
];

/** 台帳の1件。ないときは、名前だけの仮の情報を返す（台帳の書き忘れでゲームを止めない。テストで見つける） */
export function characterInfo(id: string): CharacterInfo {
  return (
    CHARACTERS.find((c) => c.id === id) ?? { id, name: id, pole: 'divine', lore: '', loreEn: '', look: '', lookEn: '', art: 'none' }
  );
}
