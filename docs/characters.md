# キャラクター台帳

<!-- このファイルは scripts/characters.ts が作る。直接書き換えず、src/game/characters.ts を直して `npm run characters` を動かす -->

魔物・相棒・これから出すキャラクターの、背景と絵の決まりの一覧。背景はゲームのつよさの画面に出る。
絵の方向（神獣・魔獣）の決まりは docs/art-guide.md 2章。

- 直すところ：src/game/characters.ts（名前・方向・攻撃の動き方・背景・見た目・絵の進み具合）
- 直したら：`npm run characters` でこのファイルを作り直す（作り直し忘れは `npm test` で見つかる）
- 絵を頼むとき：下の指示文をそのまま貼り、方向の見本の絵を添える。できた絵は `monster_<ID>.png` の名前で送る

## 一覧

| ID | 名前 | 方向 | 動き方 | 背景 | 絵 |
|---|---|---|---|---|---|
| izutsuchi | イヅツチ | 神獣 | 飛びかかる | 雷雲から生まれ落ちた小さな猫、初代の召喚士とともに歩む相棒 | 前の絵柄（ちびキャラ） |
| todoroki | トドロキ（未実装） | 神獣 | 飛びかかる | 幾度もの転生を経て雷そのものとなった大猫、召喚士の行く手を守る守護神 | 見本あり（ゲームには未反映） |
| chuppi | チュッピ | 神獣 | 噛みつく | 地下水の音を聞き分ける小さな鼠、迷宮の抜け道を誰よりも知る | 前の絵柄（ちびキャラ） |
| berogg | ベロッグ | 神獣 | 飛びかかる | 苔むした泉の番をする蛙、長い舌で近づく者を確かめる | 前の絵柄（ちびキャラ） |
| patari | パタリ | 魔獣 | 急降下する | 闇に溶けて群れ飛ぶ蝙蝠、羽音だけを残して血の匂いを追う | 前の絵柄（ちびキャラ） |
| pokotake | ポコタケ | 神獣 | のしかかる | 洞窟の奥で淡く光る茸、その胞子は夢と現の境をぼかす | 前の絵柄（ちびキャラ） |
| shururu | シュルル | 魔獣 | 突き刺す | 岩の隙間に潜む毒蛇、音もなく近づき牙を突き立てる | 前の絵柄（ちびキャラ） |
| garuf | ガルフ | 魔獣 | 突進する | 風を切って疾走する黒狼、闇夜に紛れ獲物を狙う | 前の絵柄（ちびキャラ） |
| kaburamu | カブラム | 魔獣 | 突き刺す | 鋼の殻をまとう大蠍、迷宮の通路を縄張りとして譲らない | 前の絵柄（ちびキャラ） |
| moyari | モヤリ | 魔獣 | 漂って触れる | 迷宮で果てた者の未練が霧となったもの、壁をすり抜け生者を誘う | 前の絵柄（ちびキャラ） |
| hidamari | ヒダマリ | 神獣 | 噛みつく | 地の底に陽だまりを運ぶ火蜥蜴、古の召喚士はその炎を借りたという | 前の絵柄（ちびキャラ） |
| goromu | ゴロム | 神獣 | のしかかる | 古の祭壇を守り続ける石の巨人、主を失ってなお務めを忘れない | 前の絵柄（ちびキャラ） |
| nemuriga | ネムリガ | 神獣 | 漂って触れる | 月明かりの鱗粉をまとう蛾、その羽ばたきは深い眠りを招く | 前の絵柄（ちびキャラ） |
| kuimushi | クイムシ | 魔獣 | 噛みつく | 魔力を喰らって肥える芋虫、召喚士の力を好んでかじる | 前の絵柄（ちびキャラ） |
| amigumo | アミグモ | 魔獣 | 飛びかかる | 通路に見えない糸を張る蜘蛛、かかった獲物は二度と逃さない | 前の絵柄（ちびキャラ） |
| chisui | チスイ | 魔獣 | 突き刺す | 暗がりから忍び寄る吸血の羽虫、奪った血で己の傷を癒す | 前の絵柄（ちびキャラ） |
| tsubumaru | ツブマル | 神獣 | のしかかる | 崩れた遺跡の石を背負う大蝸牛、千年かけて迷宮を巡る | 前の絵柄（ちびキャラ） |
| fuwakura | フワクラ | 神獣 | 漂って触れる | 地底湖に漂う光のくらげ、裂かれても静かに元の姿へ戻る | 前の絵柄（ちびキャラ） |
| nurarika | ヌラリカ | 魔獣 | 薙ぎ払う | 冷たい水底に潜む大烏賊、触手を伸ばして獲物を引きずり込む | 前の絵柄（ちびキャラ） |
| kirigani | キリガニ | 魔獣 | 薙ぎ払う | 氷の甲羅を持つ大蟹、二つの鋏は凍てつく岩さえ断ち切る | 前の絵柄（ちびキャラ） |
| dosuino | ドスイノ | 魔獣 | 突進する | 怒りのままに突き進む大猪、その牙は鉄の扉さえ貫く | 前の絵柄（ちびキャラ） |
| tsuraragu | ツララグマ | 魔獣 | 薙ぎ払う | 氷穴の最奥に君臨する白熊、背の氷柱は挑んだ者たちの墓標 | 前の絵柄（ちびキャラ） |
| hinoko | ヒノコ | 神獣 | 飛びかかる | 炉の最後の火の粉から孵った雛、暗がりで迷う者を温める | 新しい絵柄で反映済み |
| pukuri | プクリ | 神獣 | のしかかる | 地下の泉を漂う小さな魚、身を守るときは丸くふくらむ | 新しい絵柄で反映済み |
| birisu | ビリス | 神獣 | 飛びかかる | 尾に雷をためるリス、まばたきの間に二度噛みつく | 新しい絵柄で反映済み |
| tsuchimogu | ツチモグ | 神獣 | のしかかる | 迷宮の壁に穴を掘るもぐら、地の下の抜け道を誰より知る | 新しい絵柄で反映済み |
| watage | ワタゲ | 神獣 | 漂って触れる | 風に漂う綿毛の精、その種を吸った者は眠りに落ちる | 新しい絵柄で反映済み |
| hotari | ホタリ | 神獣 | 漂って触れる | 深い道を照らすほたる、迷った者のまわりに集まる | 新しい絵柄で反映済み |
| yoruneko | ヨルネコ | 魔獣 | 飛びかかる | 夜を歩く黒猫、その妖しい瞳は見た者の心を乱す | 新しい絵柄で反映済み |
| tsunousa | ツノウサ | 神獣 | 突進する | 野に住む角のうさぎ、追いつめられると小さな角で突く | 新しい絵柄で反映済み |
| homurajishi | ホムラジシ | 魔獣 | 飛びかかる | 火山の門を守る獅子、燃えるたてがみは侵す者を灰にする | 新しい絵柄で反映済み |
| kujiran | クジラン | 神獣 | のしかかる | 地底湖を泳ぐ年老いたくじら、水の塊を吐いて敵を退ける | 新しい絵柄で反映済み |
| raijuu | ライジュウ | 魔獣 | 突進する | 雷雲とともに駆ける獣、稲妻と一緒に地に落ちてくる | 新しい絵柄で反映済み |
| iwagame | イワガメ | 神獣 | のしかかる | 千年眠り続ける亀、岩の甲羅はどんな一撃もはね返す | 新しい絵柄で反映済み |
| kamaitachi | カマイタチ | 魔獣 | 薙ぎ払う | つむじ風に乗るいたち、風を感じる前に二度斬りつける | 新しい絵柄で反映済み |
| shirojika | シロジカ | 神獣 | 突進する | 光の差す所を歩く白い鹿、角の光は魔法をはね返す | 新しい絵柄で反映済み |
| karabone | カラボネ | 魔獣 | 薙ぎ払う | 廃墟を守り続ける騎士の骨、忘れられた命令に今も従う | 新しい絵柄で反映済み |
| gouriki | ゴウリキ | 魔獣 | のしかかる | 恐ろしい力を持つ大猿、動きは鈍いがその拳は石を砕く | 新しい絵柄で反映済み |
| hiirodori | ヒイロドリ | 神獣 | 急降下する | 己の灰から何度でもよみがえる緋色の鳥、再生のしるし | 新しい絵柄で反映済み |
| mizuchi | ミズチ | 神獣 | 薙ぎ払う | 泉の蛙と古いくじらから生まれた水の竜、深い淵を治める | 新しい絵柄で反映済み |
| narukami | ナルカミ | 神獣 | 突進する | 小さなリスの雷を受け継いだ狼、その遠吠えは嵐を呼ぶ | 新しい絵柄で反映済み |
| kodama | コダマ | 神獣 | のしかかる | 苔と茸から生まれた古い森の精、木のように傷を癒す | 新しい絵柄で反映済み |
| tsumuji | ツムジ | 神獣 | 薙ぎ払う | 蛾と鎌いたちから生まれたつむじ風の精、遠くから風で斬る | 新しい絵柄で反映済み |
| kourin | コウリン | 神獣 | 漂って触れる | ほたると光のくらげから生まれた光の精、奪った命で傷を癒す | 新しい絵柄で反映済み |
| nue | ヌエ | 魔獣 | 飛びかかる | 黒猫と蛇から生まれた夜のあやかし、その声は凶事を告げる | 新しい絵柄で反映済み |
| yumebaku | ユメバク | 神獣 | のしかかる | 鼠と大猪から生まれた獏、悪い夢を食べて敵を眠らせる | 新しい絵柄で反映済み |

全46体（神獣 27体、魔獣 19体）

## 方向ごとの見本の絵

| 方向 | 添える絵 |
|---|---|
| 神獣 | design/art-direction/ref_divine_todoroki.webp |
| 魔獣 | design/art-direction/ref_dark_softened.webp |

## キャラクターごとの指示文

### イヅツチ（izutsuchi）　神獣

- 背景：雷雲から生まれ落ちた小さな猫、初代の召喚士とともに歩む相棒
- 見た目：しなやかな若い雷の猫。やわらかな毛、稲妻の形のしっぽの先、首もとに小さな金の稲妻の飾り。明るく鋭い金の目
- 色：白と空色の毛、金の飾り
- 攻撃の動き方：飛びかかる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small, sleek young thunder cat with soft fur, a lightning-bolt shaped tail tip and a small gold lightning charm at the neck. Bright, alert golden eyes.
Background story: A small cat born from a thundercloud, the loyal partner who walks beside the first summoner.
Color scheme: white and sky-blue fur with a gold charm.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### トドロキ（todoroki）　神獣

- 背景：幾度もの転生を経て雷そのものとなった大猫、召喚士の行く手を守る守護神
- 見た目：イヅツチの進化した姿。大きくしなやかな体、流れるたてがみ、額と胸に兜と紋章、毛に稲妻の模様。静かで鋭い金の目
- 色：白・空色・深い青の毛に、豊かな金の飾り
- 攻撃の動き方：飛びかかる
- 絵：見本あり（ゲームには未反映）
- 添える見本：design/art-direction/ref_divine_todoroki.webp
- メモ：イヅツチの転生が10回をこえると進化する（まだ作っていない）。見本は design/art-direction/ref_divine_todoroki.webp。背景は案

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: The evolved form of Izutsuchi: a large, elegant sacred thunder cat with a long body, flowing mane, ornamental armor on the forehead and chest with a lightning crest, and lightning patterns in the fur. Calm, sharp golden eyes.
Background story: A great cat that became thunder itself after countless rebirths, a guardian deity who protects the summoner’s path.
Color scheme: white, sky-blue and deep royal-blue fur with rich gold ornaments.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### チュッピ（chuppi）　神獣

- 背景：地下水の音を聞き分ける小さな鼠、迷宮の抜け道を誰よりも知る
- 見た目：すばしこい小さな鼠。音をとらえる大きな丸い耳、細く長いしっぽ、片耳に小さな輪。賢そうな目
- 色：砂色と灰茶の毛、桃色の耳と鼻、金の耳輪
- 攻撃の動き方：噛みつく
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small, quick mouse with large rounded ears that catch every sound, a long thin tail and a tiny ring on one ear. Clever, attentive eyes.
Background story: A tiny mouse that can tell apart the sounds of underground water, and knows the hidden paths of the labyrinth better than anyone.
Color scheme: sandy beige and soft gray-brown fur, pink ears and nose, a gold earring.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ベロッグ（berogg）　神獣

- 背景：苔むした泉の番をする蛙、長い舌で近づく者を確かめる
- 見た目：どっしりした蛙。背中に苔と小さなシダ、長い舌を少し出す。額に小さな飾り
- 色：苔の緑と黄緑の肌、クリーム色の腹、金の飾り
- 攻撃の動き方：飛びかかる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A sturdy frog with moss and tiny ferns growing on its back like a shrine roof, a long tongue curled out, and a small ornament on its forehead. Watchful eyes.
Background story: A frog that guards a moss-covered spring, testing anyone who approaches with its long tongue.
Color scheme: moss-green and olive skin with a cream belly and a small gold ornament. Keep the creature's greens clearly darker and more muted than the pure green background.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### パタリ（patari）　魔獣

- 背景：闇に溶けて群れ飛ぶ蝙蝠、羽音だけを残して血の匂いを追う
- 見た目：やせた蝙蝠。ぎざぎざの大きな翼、とがった耳、小さな牙、細く光る目。影のような毛
- 色：黒に近い紫と青灰の毛、小さな赤い目
- 攻撃の動き方：急降下する
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A lean bat with large ragged wings, sharp pointed ears, tiny fangs and narrow glowing eyes, wrapped in shadowy fur.
Background story: A bat that flies in swarms, melting into the darkness and following the scent of blood, leaving only the sound of its wings.
Color scheme: near-black purple and slate-gray fur with small red eyes.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ポコタケ（pokotake）　神獣

- 背景：洞窟の奥で淡く光る茸、その胞子は夢と現の境をぼかす
- 見た目：歩く茸。淡く光る広いかさに輪の模様、根のような小さな足。おだやかで眠たげな顔
- 色：淡い藤色のかさに白い柄、青緑にかすかに光る輪
- 攻撃の動き方：のしかかる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A walking mushroom with a wide, softly luminous cap patterned with rings, small root-like legs and a calm, sleepy face.
Background story: A mushroom glowing faintly deep in the cave, whose spores blur the line between dream and reality.
Color scheme: pale lilac cap, white stem and faintly glowing teal rings. Keep the creature's greens clearly darker and more muted than the pure green background.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### シュルル（shururu）　魔獣

- 背景：岩の隙間に潜む毒蛇、音もなく近づき牙を突き立てる
- 見た目：とぐろを巻く細身の蛇。つややかなうろこ、鎌首をもたげ、長い牙に毒のしずく。細めた金の目
- 色：深い緑とくすんだ紫のうろこ、黄色の目
- 攻撃の動き方：突き刺す
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A slender coiled serpent with glossy scales, head raised, long fangs with a single drop of venom, narrowed golden eyes.
Background story: A venomous snake lurking in cracks in the rock, approaching without a sound to sink its fangs in.
Color scheme: deep forest-green and dusky purple scales with yellow eyes. Keep the creature's greens clearly darker and more muted than the pure green background.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ガルフ（garuf）　魔獣

- 背景：風を切って疾走する黒狼、闇夜に紛れ獲物を狙う
- 見た目：しなやかな黒い狼。今にも駆け出しそうな構え、風になびく毛とたてがみ、鋭い牙、射抜くような目
- 色：漆黒と濃紺の毛、金の目
- 攻撃の動き方：突進する
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A lean black wolf in a ready-to-sprint stance, wind-swept fur and mane, sharp fangs and piercing eyes.
Background story: A black wolf that races through the wind, hiding in the night to hunt its prey.
Color scheme: jet-black and midnight-navy fur with golden eyes.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### カブラム（kaburamu）　魔獣

- 背景：鋼の殻をまとう大蠍、迷宮の通路を縄張りとして譲らない
- 見た目：大きな蠍。鋼のような重い甲羅、大きなはさみ、振り上げた鋭い針。傷だらけの殻
- 色：鉛色と錆びた赤茶の甲羅
- 攻撃の動き方：突き刺す
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A large scorpion with heavy steel-like armored plates, big crushing claws, a raised sharp stinger and a scratched, battle-worn shell.
Background story: A giant scorpion clad in a steel shell, holding the passages of the labyrinth as its territory.
Color scheme: gunmetal-gray and rusty red-brown armor.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### モヤリ（moyari）　魔獣

- 背景：迷宮で果てた者の未練が霧となったもの、壁をすり抜け生者を誘う
- 見た目：霧の亡霊。うつろで悲しげな顔、細く長くたなびく腕、淡く光る目。下半身は霧に溶けている
- 色：青白い霧と薄紫、淡い緑の目
- 攻撃の動き方：漂って触れる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A ghostly mist creature with a hollow, sorrowful face, long trailing wisp-like arms and pale glowing eyes, its lower body fading into fog.
Background story: The lingering regret of those who perished in the labyrinth, turned into mist; it slips through walls to lure the living.
Color scheme: pale ghostly blue-white and lavender mist with pale green eyes. Keep the creature's greens clearly darker and more muted than the pure green background.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ヒダマリ（hidamari）　神獣

- 背景：地の底に陽だまりを運ぶ火蜥蜴、古の召喚士はその炎を借りたという
- 見た目：優美な蜥蜴。つややかなうろこ、しっぽの先に小さく静かな炎、頭に太陽の形の冠。賢く落ち着いた目
- 色：夕焼け色と金のうろこ、橙の炎
- 攻撃の動き方：噛みつく
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A graceful lizard with gleaming scales, a small steady flame on its tail tip, a sun-shaped crest on its head and wise, calm eyes.
Background story: A fire lizard that carries a patch of sunlight into the depths; summoners of old are said to have borrowed its flame.
Color scheme: sunset-orange and gold scales with a warm orange flame.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ゴロム（goromu）　神獣

- 背景：古の祭壇を守り続ける石の巨人、主を失ってなお務めを忘れない
- 見た目：石を積んだ大きな巨人。古い文字が刻まれた石、肩に苔。どっしりとしたやさしい目
- 色：灰色と砂岩色の石、苔の緑、金を埋めた文字
- 攻撃の動き方：のしかかる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A massive golem of stacked carved stones engraved with ancient runes, moss on its shoulders, and steady, gentle eyes.
Background story: A stone giant that still guards an ancient altar, never forgetting its duty even after losing its master.
Color scheme: gray and sandstone stones, moss green, runes inlaid with gold. Keep the creature's greens clearly darker and more muted than the pure green background.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ネムリガ（nemuriga）　神獣

- 背景：月明かりの鱗粉をまとう蛾、その羽ばたきは深い眠りを招く
- 見た目：大きく優美な蛾。三日月と目玉の模様の広い羽、ふわふわの体、羽毛のような触角。夢見るような半眼
- 色：薄紫と夜空の紺の羽に、銀と金の模様
- 攻撃の動き方：漂って触れる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A large, elegant moth with broad wings patterned with crescent moons and eye-like circles, a soft fluffy body, feathery antennae and dreamy half-closed eyes.
Background story: A moth clothed in moonlit scales; the beating of its wings invites a deep sleep.
Color scheme: pale lavender and night-sky navy wings with silver and gold patterns.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### クイムシ（kuimushi）　魔獣

- 背景：魔力を喰らって肥える芋虫、召喚士の力を好んでかじる
- 見た目：ぶよぶよに太った節のある芋虫。小さな歯の並んだ大きな丸い口、皮の下に透ける魔法の文字の模様。欲深そうな細い目
- 色：毒々しい黄緑と紫の体、淡く光る青の文字
- 攻撃の動き方：噛みつく
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A bloated, segmented caterpillar with a huge round mouth lined with small teeth, faint magic-rune patterns showing through its skin, and greedy narrowed eyes.
Background story: A caterpillar that grows fat by devouring magic, and loves to gnaw on a summoner’s power.
Color scheme: sickly yellow-green and purple body with faint blue glowing runes. Keep the creature's greens clearly darker and more muted than the pure green background.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### アミグモ（amigumo）　魔獣

- 背景：通路に見えない糸を張る蜘蛛、かかった獲物は二度と逃さない
- 見た目：節の長い脚の蜘蛛。網の模様のある丸い腹、いくつも光る目、後ろに細い糸を引く
- 色：黒い体と白い縞の脚、腹に赤い網の模様
- 攻撃の動き方：飛びかかる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A spider with long jointed legs, a round abdomen marked with a web pattern, several gleaming eyes and a thin silk thread trailing behind.
Background story: A spider that stretches invisible threads across the passages; prey that gets caught never escapes.
Color scheme: black body and white-banded legs, a red web pattern on the abdomen.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### チスイ（chisui）　魔獣

- 背景：暗がりから忍び寄る吸血の羽虫、奪った血で己の傷を癒す
- 見た目：大きな蚊のような羽虫。針のように長い口、透けた細い羽、ふくらんだ腹、鋭い目
- 色：黒と暗い赤の体、灰色に透ける羽、赤い目
- 攻撃の動き方：突き刺す
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A large mosquito-like insect with a long needle-like proboscis, thin translucent wings, a slim body with a swollen abdomen and sharp eyes.
Background story: A blood-sucking insect that creeps up from the shadows, healing its own wounds with the blood it steals.
Color scheme: black and dark crimson body, gray translucent wings and red eyes.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ツブマル（tsubumaru）　神獣

- 背景：崩れた遺跡の石を背負う大蝸牛、千年かけて迷宮を巡る
- 見た目：大きな蝸牛。古い遺跡の石と折れた小さな柱でできた渦巻きの殻、色あせた彫り。落ち着いた辛抱強い顔
- 色：苔の緑と古い石の灰色の殻、湿った茶色の体
- 攻撃の動き方：のしかかる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A huge snail whose spiral shell is built from ancient ruin stones and a small broken pillar, with faded carvings, and a calm, patient face.
Background story: A giant snail carrying stones from a collapsed ruin, wandering the labyrinth over a thousand years.
Color scheme: moss-green and weathered stone-gray shell with a damp brown body. Keep the creature's greens clearly darker and more muted than the pure green background.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### フワクラ（fuwakura）　神獣

- 背景：地底湖に漂う光のくらげ、裂かれても静かに元の姿へ戻る
- 見た目：浮かぶ透明なくらげ。すりガラスのようなかさに輪の模様、リボンのような長い触手。おだやかな顔
- 色：透明な水色と乳白色、触手の先は桃色、金の輪
- 攻撃の動き方：漂って触れる
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A floating translucent jellyfish with a bell like frosted glass marked with a ring pattern, long ribbon-like tentacles, and a serene expression.
Background story: A jellyfish of light drifting in an underground lake; even when torn, it quietly returns to its original form.
Color scheme: translucent aqua and milky white with pink-tipped tentacles and a gold ring pattern.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ヌラリカ（nurarika）　魔獣

- 背景：冷たい水底に潜む大烏賊、触手を伸ばして獲物を引きずり込む
- 見た目：ぬめる長い体の大烏賊。前へ長く伸ばした2本の触手、吸盤のある腕、大きく冷たい目
- 色：深い藍と紫の体、白い吸盤
- 攻撃の動き方：薙ぎ払う
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A giant squid with a long, slick body, two very long tentacles reaching forward, many curling arms with suckers and large, cold eyes.
Background story: A giant squid lurking at the bottom of cold waters, stretching its tentacles to drag its prey down.
Color scheme: deep indigo and violet body with white suckers.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### キリガニ（kirigani）　魔獣

- 背景：氷の甲羅を持つ大蟹、二つの鋏は凍てつく岩さえ断ち切る
- 見た目：重い大蟹。霜でひび割れたふちの、ぎざぎざの氷の甲羅。高く振り上げた、のこぎり刃の大きなはさみ2つ。威嚇する目
- 色：氷の青白と濃い青の甲羅に白い霜
- 攻撃の動き方：薙ぎ払う
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A heavy crab with a jagged armored shell of ice with frost-cracked edges, two huge serrated pincers raised high, and small menacing eyes on stalks.
Background story: A giant crab with an icy shell; its two pincers can cut through even frozen rock.
Color scheme: icy pale-blue and deep-blue shell with white frost.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ドスイノ（dosuino）　魔獣

- 背景：怒りのままに突き進む大猪、その牙は鉄の扉さえ貫く
- 見た目：筋肉の盛り上がった大猪。逆立つたてがみ、太く曲がった牙、傷のある皮。頭を低くして突進の構え、怒った目
- 色：こげ茶と黒の毛、象牙色の牙
- 攻撃の動き方：突進する
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A huge muscular boar with a bristling mane, massive curved tusks and a scarred hide, head lowered and ready to charge, with furious eyes.
Background story: A giant boar that charges forward driven by rage; its tusks pierce even iron doors.
Color scheme: dark brown and black bristles with ivory tusks.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ツララグマ（tsuraragu）　魔獣

- 背景：氷穴の最奥に君臨する白熊、背の氷柱は挑んだ者たちの墓標
- 見た目：そびえる白熊。背と肩に生えた鋭いつらら、太い爪、冷たく射抜く目、頭に古びて欠けた氷の冠
- 色：白い毛、透き通る氷の青のつららと冠
- 攻撃の動き方：薙ぎ払う
- 絵：前の絵柄（ちびキャラ）
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A towering white bear with sharp icicles growing along its back and shoulders, heavy claws, cold piercing eyes and an old, broken crown of ice on its head.
Background story: A white bear that reigns in the deepest part of the ice cave; the icicles on its back are gravestones of those who challenged it.
Color scheme: white fur with clear icy-blue icicles and crown.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ヒノコ（hinoko）　神獣

- 背景：炉の最後の火の粉から孵った雛、暗がりで迷う者を温める
- 見た目：火の粉のような羽をまとう丸いひよこ。小さなくちばし
- 色：橙と赤の羽、黄色い胸、金の目
- 攻撃の動き方：飛びかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small round fire chick with fluffy feathers that flicker like embers and a tiny beak.
Background story: A chick hatched from the last ember of a hearth; it warms travelers lost in the dark.
Color scheme: warm orange and red feathers, yellow belly, small gold eyes.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### プクリ（pukuri）　神獣

- 背景：地下の泉を漂う小さな魚、身を守るときは丸くふくらむ
- 見た目：宙に浮かぶ丸いふぐ。ふくらんだ頬と短いひれ
- 色：水色と白の体、青い斑点、薄い黄色のひれ
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small round puffer fish floating in the air, cheeks puffed, short fins.
Background story: A little fish that drifts in underground springs; it puffs up to protect itself.
Color scheme: pale aqua and white body, blue spots, light yellow fins.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ビリス（birisu）　神獣

- 背景：尾に雷をためるリス、まばたきの間に二度噛みつく
- 見た目：電気の毛並みの大きな尾を持つリス
- 色：黄色とクリームの毛、尾に紺の縞
- 攻撃の動き方：飛びかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small squirrel with a big fluffy tail crackling with static, shaped into the fur.
Background story: A squirrel that stores lightning in its tail; it bites twice before you blink.
Color scheme: yellow and cream fur, dark blue stripes on the tail.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ツチモグ（tsuchimogu）　神獣

- 背景：迷宮の壁に穴を掘るもぐら、地の下の抜け道を誰より知る
- 見た目：大きな掘る爪と桃色の鼻の、丸いもぐら
- 色：茶色の毛、桃色の鼻と手
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small round mole with big digging claws and a pink nose.
Background story: A mole that digs tunnels through the labyrinth walls; it knows every hidden path below.
Color scheme: brown velvet fur, pink nose and paws.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ワタゲ（watage）　神獣

- 背景：風に漂う綿毛の精、その種を吸った者は眠りに落ちる
- 見た目：小さな目の、丸くふわふわの綿毛
- 色：白い綿毛、薄い青の影、黄色の芯
- 攻撃の動き方：漂って触れる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small round fluffy dandelion-seed creature with tiny eyes, drifting.
Background story: A fluff spirit drifting on the wind; those who breathe its seeds fall asleep.
Color scheme: soft white fluff, pale blue shading, a small yellow center.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ホタリ（hotari）　神獣

- 背景：深い道を照らすほたる、迷った者のまわりに集まる
- 見た目：尾がやわらかく光る丸いほたる
- 色：紺の体、薄い黄色に光る尾
- 攻撃の動き方：漂って触れる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small round firefly with a softly glowing tail and short wings.
Background story: A firefly that lights the deep paths; it gathers around those who are lost.
Color scheme: dark blue body, pale yellow glowing tail.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ヨルネコ（yoruneko）　魔獣

- 背景：夜を歩く黒猫、その妖しい瞳は見た者の心を乱す
- 見た目：妖しく光る目と長い尾の黒猫
- 色：黒い毛、紫の影、琥珀色の目
- 攻撃の動き方：飛びかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small black cat with glowing hypnotic eyes and a long tail.
Background story: A black cat that walks the night; its strange eyes confuse those who meet them.
Color scheme: black fur, purple shading, amber eyes.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ツノウサ（tsunousa）　神獣

- 背景：野に住む角のうさぎ、追いつめられると小さな角で突く
- 見た目：額に短い角が1本ある、耳の長い丸いうさぎ
- 色：クリーム色の毛、桃色の耳、象牙色の角
- 攻撃の動き方：突進する
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small round rabbit with a single short horn on its forehead and long ears.
Background story: A horned rabbit of the meadow; it charges with its little horn when cornered.
Color scheme: cream white fur, pink inner ears, ivory horn.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ホムラジシ（homurajishi）　魔獣

- 背景：火山の門を守る獅子、燃えるたてがみは侵す者を灰にする
- 見た目：たてがみが炎でできた大きな獅子。鋭い牙と爪
- 色：深紅の体、橙と黄の炎のたてがみ、黒い爪
- 攻撃の動き方：飛びかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A large powerful lion whose mane is made of roaring flames, sharp fangs and claws.
Background story: A lion that guards the volcano gate; its burning mane turns intruders to ash.
Color scheme: dark crimson body, orange and yellow flame mane, black claws.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### クジラン（kujiran）　神獣

- 背景：地底湖を泳ぐ年老いたくじら、水の塊を吐いて敵を退ける
- 見た目：宙を泳ぐ大きなおだやかなくじら。頭に潮吹き
- 色：深い青の背、クリーム色の腹、水色の模様
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A huge gentle whale floating as if swimming in the air, a water spout on its head.
Background story: An old whale swimming in the underground lake; it spouts water to drive off foes.
Color scheme: deep blue back, pale cream belly, light aqua patterns.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ライジュウ（raijuu）　魔獣

- 背景：雷雲とともに駆ける獣、稲妻と一緒に地に落ちてくる
- 見た目：稲妻の模様の大きなしなやかな獣。鋭い爪
- 色：紺と紫の毛、明るい黄色の稲妻の模様
- 攻撃の動き方：突進する
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A large sleek thunder beast like a big wild cat, lightning-shaped markings, sharp claws.
Background story: A beast that runs with the thunderclouds; it falls to earth with the lightning.
Color scheme: dark navy and violet fur, bright yellow lightning markings.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### イワガメ（iwagame）　神獣

- 背景：千年眠り続ける亀、岩の甲羅はどんな一撃もはね返す
- 見た目：岩と水晶の甲羅の大きな亀。太い足
- 色：灰茶の岩の甲羅、琥珀の水晶、砂色の肌
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A large tortoise with a shell made of rough rock and crystals, thick legs.
Background story: A tortoise that has slept a thousand years; its stone shell turns away any blow.
Color scheme: grey-brown rock shell, amber crystals, sandy skin.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### カマイタチ（kamaitachi）　魔獣

- 背景：つむじ風に乗るいたち、風を感じる前に二度斬りつける
- 見た目：前足に鎌の刃を持つしなやかないたち
- 色：銀灰の毛、白い腹、鋼の刃
- 攻撃の動き方：薙ぎ払う
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A sleek weasel with sickle-shaped blades on its front legs, wind swirling at its tail.
Background story: A weasel that rides the whirlwind; it slashes twice before you feel the wind.
Color scheme: silver grey fur, white belly, steel blades.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### シロジカ（shirojika）　神獣

- 背景：光の差す所を歩く白い鹿、角の光は魔法をはね返す
- 見た目：光る枝のような角の背の高い白い鹿
- 色：真っ白な毛、金の角、薄紫の影
- 攻撃の動き方：突進する
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A tall white deer with shining branch-like antlers and a calm face.
Background story: A white deer that walks where the light falls; the light of its antlers repels magic.
Color scheme: pure white fur, gold antlers, pale lavender shading.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### カラボネ（karabone）　魔獣

- 背景：廃墟を守り続ける騎士の骨、忘れられた命令に今も従う
- 見た目：欠けた鎧に錆びた剣と盾の骨の騎士
- 色：象牙色の骨、黒い鉄の鎧、色あせた紫の外套
- 攻撃の動き方：薙ぎ払う
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A skeleton knight in broken armor holding a rusty sword and shield.
Background story: A knight's bones that still guard the ruins, faithful to an order long forgotten.
Color scheme: ivory bones, dark iron armor, faded purple cloak.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ゴウリキ（gouriki）　魔獣

- 背景：恐ろしい力を持つ大猿、動きは鈍いがその拳は石を砕く
- 見た目：大きな拳の、筋骨たくましい大猿
- 色：濃い灰の毛、黄褐色の顔と胸、茶の手甲
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A huge muscular ape with big fists and a scarred face, hunched powerful body.
Background story: An ape of terrible strength; slow to move, but its fists shatter stone.
Color scheme: dark grey fur, tan face and chest, brown wristbands.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ヒイロドリ（hiirodori）　神獣

- 背景：己の灰から何度でもよみがえる緋色の鳥、再生のしるし
- 見た目：長くなびく尾羽と冠羽の火の鳥。翼を広げる
- 色：緋色と朱の羽、金の先、薄い黄色の胸
- 攻撃の動き方：急降下する
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A graceful firebird with long flowing tail feathers and a crest, wings spread.
Background story: A scarlet bird that rises again from its own ashes, a sign of rebirth.
Color scheme: scarlet and vermilion feathers, gold tips, pale yellow chest.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ミズチ（mizuchi）　神獣

- 背景：泉の蛙と古いくじらから生まれた水の竜、深い淵を治める
- 見た目：ひれと小さな角の、長くとぐろを巻く水の竜
- 色：青緑のうろこ、白い腹、金の角とひげ
- 攻撃の動き方：薙ぎ払う
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A long serpentine water dragon with fins and small horns, coiled body, flowing whiskers.
Background story: A water dragon born from a spring frog and an ancient whale; it rules the deep pools.
Color scheme: teal blue scales, white belly, gold horns and whiskers. Keep the creature's greens clearly darker and more muted than the pure green background.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ナルカミ（narukami）　神獣

- 背景：小さなリスの雷を受け継いだ狼、その遠吠えは嵐を呼ぶ
- 見た目：雷をまとうたてがみと金の額飾りの気高い狼
- 色：銀白と薄い青の毛、金の飾りと稲妻のたてがみ
- 攻撃の動き方：突進する
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A noble wolf wearing thunder, a mane of crackling electric fur and a gold forehead crest.
Background story: A wolf that inherited the thunder of a small squirrel; its howl calls the storm.
Color scheme: silver white and pale blue fur, gold crest and lightning-shaped mane.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### コダマ（kodama）　神獣

- 背景：苔と茸から生まれた古い森の精、木のように傷を癒す
- 見た目：頭に茸が生えた、優しい顔の古い切り株の精
- 色：茶色の樹皮、クリーム色の顔、赤と白の茸
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small forest spirit made of an old tree stump with a gentle face and mushrooms on its head.
Background story: A spirit of the old forest born from moss and mushrooms; it heals itself as trees do.
Color scheme: brown bark, cream face, red and white mushroom caps.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ツムジ（tsumuji）　神獣

- 背景：蛾と鎌いたちから生まれたつむじ風の精、遠くから風で斬る
- 見た目：鳥のような顔と羽の、つむじ風の形の精
- 色：白と薄い水色の渦、銀の羽
- 攻撃の動き方：薙ぎ払う
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A wind spirit shaped like a small whirlwind with a bird-like face and feathered wings.
Background story: A whirlwind spirit born from a moth and a sickle weasel; it cuts from afar with wind blades.
Color scheme: white and pale cyan swirls, silver feathers.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### コウリン（kourin）　神獣

- 背景：ほたると光のくらげから生まれた光の精、奪った命で傷を癒す
- 見た目：頭上に金の光の輪と4枚の小さな羽の、丸い精
- 色：白と薄い金、やわらかな薄紫
- 攻撃の動き方：漂って触れる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A small angelic spirit creature with a gold halo above its head and four small feathered wings.
Background story: A spirit of light born from a firefly and a glowing jellyfish; it heals itself with the life it takes.
Color scheme: white and pale gold, soft lavender accents.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```

### ヌエ（nue）　魔獣

- 背景：黒猫と蛇から生まれた夜のあやかし、その声は凶事を告げる
- 見た目：猿の顔、狸のような体、虎縞の脚、尾は蛇のあやかし
- 色：濃い茶と黒の毛、黄色の虎縞、灰色がかった蛇の尾
- 攻撃の動き方：飛びかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_dark_softened.webp

```
Dark mythical beast fantasy game art, original character design, menacing but not gory. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A mythical chimera with a monkey face, a tanuki-like body, tiger-striped legs and a snake for a tail.
Background story: A creature of the night born from a black cat and a snake; its cry brings ill omens.
Color scheme: dark brown and black fur, yellow tiger stripes, olive-grey snake tail. Keep the creature's greens clearly darker and more muted than the pure green background.
Intimidating posture.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), anime cel shading with deep shadows and a subtle rim light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no blood, no ground shadow, no text, no watermark, no border.
```

### ユメバク（yumebaku）　神獣

- 背景：鼠と大猪から生まれた獏、悪い夢を食べて敵を眠らせる
- 見た目：短い鼻と眠たげな目の、星の模様の獏
- 色：黒と白の体、薄紫の星の模様
- 攻撃の動き方：のしかかる
- 絵：新しい絵柄で反映済み
- 添える見本：design/art-direction/ref_divine_todoroki.webp

```
Majestic mythical beast fantasy game art, original character design. Same line work and shading style as the attached reference image, but a different creature with its own colors.
Subject: A tapir-like dream eater with a short trunk, sleepy half-closed eyes and star-shaped markings.
Background story: A creature born from a mouse and a wild boar; it eats nightmares and lulls foes to sleep.
Color scheme: black and white body, pale lavender star markings.
Noble, dignified posture. Ornamental details that suit the creature.
3/4 front view facing down-left, looking at the viewer, full body, centered, single character.
Dark navy outline (#2B3A67), refined anime cel shading with 2 shadow tones, light from the top left.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else.
No sparkles, no floating particles, no glow or aura, no ground shadow, no text, no watermark, no border.
```
