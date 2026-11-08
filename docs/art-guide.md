# 絵の決まりと、生成AIへの指示文 v0.1

ゲームの絵文字を、生成AIで作った絵に差し替えるための決まり。全部の絵で同じ決まりを使い、絵柄をそろえる。

## 1. 使うAI

| 用途 | おすすめ | 理由 |
|---|---|---|
| 魔物・主人公・イヅツチ | **Google Gemini の画像生成**（Nano Banana など） | 前に作った絵を見せて「同じ絵柄で」と頼むと、絵柄がそろいやすい。日本語の指示も通る |
| 同上（背景を透明にしたいとき） | **ChatGPT の画像生成** | 背景が透明なPNGで出せる。会話しながら直せる |
| アイテム・状態異常・ボタンのアイコン | **Recraft** | 絵柄をそろえたまま、アイコンをたくさん作れる |

- 料金と商用利用の条件は変わることがある。使う前に、各サービスの規約を確かめる
- 背景が透明にならなかったときは、背景を消すツール（各サービスの機能や remove.bg など）で消す

## 2. 世界観
- 召喚士が、仲間の魔物と一緒にダンジョンに潜る。魔物は、封印すると仲間になる
- 雰囲気は**神話的で、少し不思議**。魔物ごとの背景（2.1）によって、**神獣**（神々しく頼もしい）と**魔獣**（少し怖く、凄みがある）の2つに描き分ける（2026-11-07 に決めた。前は「明るく、かわいらしく、こわくしない」だった）
- グロテスクな表現（血・傷口・内臓など）はしない
- **色はキャラクターの個性として、1体ずつ決める**（docs/characters.md の「色」）。神獣・魔獣の方向や、ゲーム全体で色をしばらない（2026-11-07 に決めた。前は「明るい寒色が中心、差し色に金」だった）
- 他の作品のキャラクターに似せない。指示の中に、他の作品の名前やキャラクター名を入れない

### 2.1 絵の2つの方向と、魔物ごとの背景
魔物ひとつひとつに背景（ひとことの物語）を付け、その背景から絵の方向を決める。背景はゲームのつよさの画面にも出す（src/game/monsters.ts の lore）。

| 方向 | 合う魔物 | 雰囲気と形 | 見本（線と塗りの見本。色はまねない） |
|---|---|---|---|
| **神獣**（案4） | 守り神、古いもの、神秘的なもの、召喚士を助けるもの | 神々しく頼もしい。流れる毛並み、兜・紋章などの飾り。静かで鋭い目。凛とした立ち姿 | design/art-direction/ref_divine_todoroki.webp |
| **魔獣**（案3を案4に寄せたもの） | 狩るもの、毒や闇を使うもの、強敵・ボス | 少し怖く、凄みがある。にらむ目、牙と爪、深い影。威圧感はあるが、グロテスクにはしない | design/art-direction/ref_dark_softened.webp |

- どちらも、下の「3. 絵の決まり」の輪郭線・塗り・背景の色などは同じ。神獣と魔獣が並んでも、同じゲームの絵に見えるようにする
- 色は方向で決めない。見本の絵は線と塗りの見本として添え、色はキャラクターごとの「色」で頼む
- 緑の多いキャラクターは、背景の緑と一緒に抜けないよう、緑を背景より暗く・くすませてもらう（指示文に自動で入る）。抜くときに中の緑が消えたら、scripts/key-art.ps1 に -Icon を付けて、囲まれた緑を残す
- 頭身：ちびキャラにはしない。弱い魔物は小さく丸めに、強い魔物ほど体が大きく、目つきが鋭くなる
- 今の20体の絵は、前の決まり（ちびキャラ）のまま。描き直すときに、この方向で作る

**魔物ごとの背景・方向・見た目と、絵を頼む指示文は docs/characters.md（キャラクター台帳）にまとめた。**
元は src/game/characters.ts の表で、直したら `npm run characters` で作り直す。方向ごとの共通の指示文は scripts/characters-doc.ts にある。

- 背景は「〇〇な□□、〜する」のように、読点で区切った2つの句にする（36字まで。つよさの画面で2行に収まる）
- 新しい魔物を足すときは、先に台帳に背景を書き、そこから方向を決めてから絵を頼む

## 3. 絵の決まり（すべての絵で共通）

| 項目 | 決まり |
|---|---|
| 絵柄 | ちびキャラ（頭が大きめ、2〜2.5頭身）。丸みのある形。ゲームのキャラクターアート |
| 向き | 正面から少し斜め（3/4ビュー）。こちらを見ている。魔物は左下を向く |
| 輪郭線 | 太めでやさしい線。色は黒ではなく濃い紺（#2B3A67） |
| 塗り | アニメ塗り（はっきりした影が1〜2段）。強いグラデーションや細かい描き込みはしない |
| 光 | 左上から当たる、やわらかい光 |
| 背景 | 真緑（#00FF00）の一色。透明にはこちらで抜く。地面の影も描かない（影はゲームが描く） |
| 効果 | キャラクターのまわりに、キラキラ・粒・光・オーラを描かない（小さくするとにじむため） |
| 構図 | 正方形（1:1）。1枚に1体だけ。全身。真ん中に置き、上下左右に少し余白を残す。足もとは下から10％くらい |
| サイズ | キャラクター：1024×1024 で作り、512×512 に縮める。アイテム：512×512 で作り、256×256 に縮める |
| 文字 | 入れない（名前、サイン、透かしも入れない） |
| ファイル名 | `monster_chuppi.png`、`item_herb.png` のように、英語の名前（下の表のID）で付ける |

### 色の見本（前の絵柄・ちびキャラのときの色。今はキャラクターごとに決める）
| 名前 | 色 | 使いどころ |
|---|---|---|
| 空色 | #7CC8FF | 主な色 |
| 水色 | #5FE3E0 | 魔法の光、水 |
| ミント | #8FF0C4 | 自然、回復 |
| 薄紫 | #B9B4FF | 不思議なもの、ゴースト |
| 氷の白 | #F4FBFF | ハイライト |
| 金色 | #FFCF5A | 差し色、宝物、雷 |
| サンゴ | #FF7A8A | 危険、火、毒（少しだけ） |
| 紺 | #2B3A67 | 輪郭線 |

新しい方向（神獣・魔獣）では、この見本にしばられない。キャラクターの色は docs/characters.md に1体ずつ書く。輪郭線の濃い紺（#2B3A67）だけは、絵柄をそろえるために残す。

## 4. 共通の指示文（そのまま貼る）
どの絵にも、最初にこの文を入れる。英語のほうが、絵柄が安定しやすい。

**英語**
```
Cute chibi fantasy creature game art, original character design.
Big head, round soft shapes, 2 to 2.5 heads tall.
3/4 front view facing slightly down-left, looking at the viewer, full body, centered, single character.
Thick soft outline in dark navy (#2B3A67), clean anime cel shading with 1-2 shadow tones, soft light from the top left.
Bright cool color palette: sky blue, aqua, mint, pale lavender, with small gold accents.
Cheerful, friendly, slightly magical mood. Not scary.
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else in the background.
No sparkles, no particles, no glow or aura around the character. No ground shadow, no text, no watermark, no border.
```

**日本語**（Gemini などで日本語のほうが通るとき）
```
ちびキャラのファンタジー生物のゲームアート。オリジナルのデザイン。
頭が大きく、丸くてやわらかい形。2〜2.5頭身。
正面から少し斜め（3/4ビュー）、少し左下を向き、こちらを見ている。全身、真ん中に1体だけ。
濃い紺色（#2B3A67）の太めでやさしい輪郭線。影が1〜2段のアニメ塗り。左上からやわらかい光。
空色・水色・ミント・薄紫を中心にした明るい寒色。少しだけ金色の差し色。
明るく親しみやすく、少し不思議な雰囲気。こわくしない。
正方形（1:1）。背景は真緑（#00FF00）の一色だけで、ほかには何も描かない。
キャラクターのまわりに、キラキラ・粒・光・オーラを描かない。地面の影、文字、透かし、枠は入れない。
```

## 5. 作る順番
1. **イヅツチを最初に作る**。これを「絵柄の見本」にする。気に入るまで何回か作り直す
2. 2体目からは、イヅツチの絵を添えて「添付の絵と同じ絵柄、同じ線、同じ塗りで描いて」と頼む
3. 1体できるごとに、下の「確かめること」を見る
4. できた絵を送ってもらえれば、私がゲームに入れる
   - `scripts/key-art.ps1` で緑の背景を抜き、余白をそろえた 256×256 の PNG にして `public/art/` に置く
   - `src/render/art.ts` の `ART_IDS` に id を足す。絵がないものは絵文字のまま出る
   - 顔のアイコンは `scripts/crop-face.ps1` で全身の絵から切り出し、`face_<id>.png` にする。`FACE_IDS` に id を足す。切り出すときは、両目のまん中を横の中心に、目の高さを上から 45% にそろえる（幅は両目の間の約3倍）。こうすると、どの顔も丸い枠の中で同じ所に目が来る

### 2体目からの指示文
**英語**
```
Use exactly the same art style, line weight, shading and color palette as the attached reference image.
[共通の指示文]
Subject: [魔物の説明（下の表の英語）]
```
**日本語**
```
添付の絵とまったく同じ絵柄・線の太さ・塗り方・色合いで描いてください。
[共通の指示文]
描くもの：[魔物の説明（下の表の日本語）]
```

## 6. 魔物と主人公の説明（前の絵柄・ちびキャラ用）
いまゲームに入っている絵を作ったときの説明。新しい方向（神獣・魔獣）の説明と指示文は docs/characters.md。

| ID | 名前 | 日本語の説明 | 英語の説明 |
|---|---|---|---|
| player | 主人公（召喚士） | 若い召喚士。大きなとんがり帽子とケープ。先に光る宝石が付いた杖を持つ。空色と白の服、金色の飾り | A young summoner with a big pointed hat and a short cape, holding a staff topped with a glowing crystal. Sky blue and white clothes with gold trim. |
| izutsuchi | イヅツチ（相棒） | 雷をまとう小さな猫。ふわふわの毛、しっぽの先が稲妻の形。首もとに小さな稲妻の飾り。元気で頼もしい | A small fluffy cat wrapped in light electricity, tail tip shaped like a lightning bolt, a small lightning charm at the neck. Energetic and loyal. |
| chuppi | チュッピ | 小さなネズミ。大きな丸い耳、ふわふわの体、くりっとした目。すばしっこそう | A tiny mouse with big round ears, a fluffy body and bright round eyes. Quick and curious. |
| berogg | ベロッグ | カエル。長い舌を少し出している。大きな目、つるっとした体。ミント色 | A frog with a long tongue slightly sticking out, big eyes and a smooth mint green body. |
| patari | パタリ | 小さなコウモリ。大きな耳と小さな翼。ふらふら飛んでいる | A small bat with big ears and little wings, fluttering a bit clumsily in the air. |
| pokotake | ポコタケ | 歩くキノコ。ぷっくりしたかさに水玉。かさから胞子がふわっと出ている | A walking mushroom with a puffy polka-dot cap, little feet, and soft spores drifting from the cap. |
| shururu | シュルル | 小さなヘビ。とぐろを巻いている。うろこに薄紫の模様。牙は小さく、かわいく | A small coiled snake with pale lavender patterns on its scales and tiny cute fangs. |
| garuf | ガルフ | 子オオカミ。ふさふさのたてがみ。素早そうな脚。凛々しい顔 | A young wolf with a fluffy mane, quick-looking legs and a brave face. |
| kaburamu | カブラム | サソリ。かたい甲羅のような殻、大きなはさみ。しっぽの針は丸く、こわくない | A scorpion with a hard shell-like armor and big claws. The tail stinger is rounded and not scary. |
| moyari | モヤリ | 小さなおばけ。ふわふわの霧のような体で、少し透けている。薄紫の光 | A small ghost with a fluffy mist-like body, slightly see-through, glowing pale lavender. |
| hidamari | ヒダマリ | トカゲ。口からほんの少し火の粉。しっぽの先に小さな炎。あたたかい日なたのような色 | A lizard with a few sparks of fire at its mouth and a tiny flame on its tail tip. Warm sunny colors. |
| goromu | ゴロム | 石のゴーレム。丸い石を積んだ体、苔が少し生えている。どっしりしていて、やさしい目 | A stone golem made of stacked round stones with a little moss. Heavy and sturdy, with kind eyes. |
| nemuriga | ネムリガ（まだ絵がない） | ふわふわの蛾。大きな羽に眠そうな目の模様。羽から光る鱗粉がこぼれる。薄紫と夜空色 | A fluffy moth with big wings marked with sleepy eye patterns, glowing scale dust drifting from the wings. Pale lavender and night blue. |
| kuimushi | クイムシ（まだ絵がない） | まるまるとしたイモムシ。大きな口で、いつも何かをもぐもぐしている。黄緑色 | A chubby caterpillar with a big mouth, always munching on something. Yellow green. |
| amigumo | アミグモ（まだ絵がない） | 小さなクモ。丸いおしりに網の模様。足は短く、かわいい。おしりから細い糸 | A small spider with a round body marked with a web pattern, short cute legs, and a thin silk thread trailing behind. |
| chisui | チスイ（まだ絵がない） | 小さな蚊。細長い口、透けた羽。赤い目がきらり。こわくない | A small mosquito with a long thin proboscis, see-through wings and glinting red eyes. Not scary. |
| tsubumaru | ツブマル（まだ絵がない） | カタツムリ。ぶあつい渦巻きの殻、ゆっくり進む。殻に小さな石がついている | A snail with a thick spiral shell dotted with small pebbles, moving slowly. |
| fuwakura | フワクラ（まだ絵がない） | ふわふわ浮かぶクラゲ。透けたかさに、やわらかく光る触手。水色 | A floating jellyfish with a see-through bell and softly glowing tentacles. Light aqua. |
| nurarika | ヌラリカ（まだ絵がない） | イカ。長い触手を2本前に伸ばしている。つるっとした体、大きな目。藍色 | A squid reaching forward with two long tentacles, a smooth body and big eyes. Indigo. |
| kirigani | キリガニ（まだ絵がない） | カニ。大きなはさみを2つ振り上げている。氷のような青い甲羅 | A crab raising two big claws, with an icy blue shell. |
| dosuino | ドスイノ（まだ絵がない） | 大きなイノシシ。太い牙、鼻息があらい。前のめりで突進しそう | A big boar with thick tusks, snorting and leaning forward as if about to charge. |
| tsuraragu | ツララグマ（まだ絵がない） | 白いクマ。背中と肩につららが生えている。大きく、どっしり。目はやさしい | A large white bear with icicles growing on its back and shoulders. Big and sturdy, with gentle eyes. |

- 寒色の決まりがあるが、ヒダマリ（火）とポコタケ（キノコ）は暖色を使ってよい。輪郭線と塗り方をそろえれば、絵柄は保てる
- 絵が入っているもの：主人公、イヅツチと、6の表のチュッピ〜ゴロム（この絵柄で決まり）。ネムリガ〜ツララグマの10体はまだ絵がなく、絵文字で出る。絵ができたら public/art/monster_<ID>.png と face_<ID>.png を置き、src/render/art.ts の ART_IDS と FACE_IDS に足す

## 7. アイテムとアイコン（Recraft）
Recraft では、最初に絵柄（スタイル）を1つ作り、すべてのアイコンをその絵柄で作る。

**道具は種類ごとに代表の絵を1枚だけ使う**（2026-11-06 から）。道具を足すたびに絵を作らなくてよいようにする。装備（武器・盾）は見た目のかっこよさが大事なので、1つずつ絵を作る。
どの絵を使うかは src/render/art.ts の artKind が、道具の決まり（items.ts）から決める。

| 種類 | 使う絵 | その種類の道具 |
|---|---|---|
| 草（回復・治す） | item_herb（薬草） | 薬草・上薬草・毒消し草・キツケソウ |
| 食べ物 | item_bread（パン） | パン・大きなパン |
| 矢 | item_arrow（ふつうの矢） | ふつうの矢・鉄の矢 |
| 印 | item_sealSummon（召喚の印） | 9種類の印 |
| 星 | item_star（金の星に空色の芯。Gemini で作った） | 9種類の星 |
| 魔導書 | item_tomeGuard（守りの魔導書） | 力の魔導書・守りの魔導書 |
| 袋 | item_holyPouch（聖なる袋） | ふつうの袋・高級な袋・聖なる袋 |
| 1つずつ | それぞれの絵 | 武器・盾、魔力の水・白紙カード・ルーン・錬金釜・配合の書・転生の書 |

下の表の bigBread・bigHerb・antidote・kitsuke・ironArrow・tomePower・pouch・finePouch と、召喚の印のほかの印の絵は、使わなくなったので消した（指示文は残す）。

**共通の指示文（英語）**
```
Cute fantasy game item icon, original design. Single object, centered, slightly tilted 3/4 view.
Thick soft outline in dark navy (#2B3A67), clean cel shading, soft light from the top left.
Bright cool palette (sky blue, aqua, mint, pale lavender) with small gold accents.
Transparent background, no text, no shadow, no border.
```

| ID | 名前 | 英語の説明 |
|---|---|---|
| bread | パン | a round loaf of bread |
| bigBread | 大きなパン | a long big baguette |
| herb | 薬草 | a bundle of green healing leaves tied with a string |
| bigHerb | 上薬草 | a bundle of glowing four-leaf healing herbs with sparkles |
| antidote | 毒消し草 | a leafy green herb with a small white flower |
| kitsuke | キツケソウ | a bright yellow flower that looks refreshing |
| water | 魔力の水 | a small round glass bottle with glowing blue magic water |
| blank | 白紙カード | a blank magic card with a gold frame |
| arrow | ふつうの矢 | a bundle of three wooden arrows with white feathers |
| ironArrow | 鉄の矢 | a bundle of three arrows with iron tips |
| seal | ○○の印 | a rolled magic scroll with a ribbon（今は召喚の印の絵を、すべての印で使う） |
| star | ○○の星 | a plump rounded gold star like a soft candy, with a small sky-blue gem core（星9種類で1枚） |
| tomePower | 力の魔導書 | a thick red magic book with a fist emblem |
| tomeGuard | 守りの魔導書 | a thick blue magic book with a shield emblem |
| pot | 錬金釜 | a small round alchemy cauldron with bubbling liquid |
| pouch | ふつうの袋 | a small cloth pouch tied with a string |
| finePouch | 高級な袋 | a fancy leather bag with gold buckles |
| holyPouch | 聖なる袋 | a white pouch with a glowing gold holy emblem |
| club | こん棒 | a wooden club |
| bronzeSword | 銅の剣 | a short bronze sword |
| ironSword | 鉄の剣 | a steel sword with a blue hilt |
| woodShield | 木の盾 | a round wooden shield |
| leatherShield | 革の盾 | a leather shield with metal rivets |
| ironShield | 鉄の盾 | a sturdy iron shield with a blue emblem |

状態異常のアイコン（小さく表示するので、形をはっきり）
| ID | 状態 | 英語の説明 |
|---|---|---|
| confused | 混乱 | a swirl symbol with small stars |
| poisoned | 毒 | a purple bubbling drop with a skull-free poison mark |
| pinned | はりつけ | a pin stuck into a small glowing seal |
| asleep | 昏睡 | a sleepy "Zzz" cloud（文字が出ないときは、月と雲） |

## 8. UIの素材（枠・ボタンの板・紙の地）と道具のアイコン
Gemini で作った素材を使っている（2026-11-05）。CSS だけでは木目・革・金属の質感が出ないため、絵の素材にする。
最初に作った木と革の部品（紙の地・木と革の枠・木の板・明るい紙のタブ・彫った木のボタン・四角い板）は、8.2 の紺と金の部品に替えて消した（2026-11-06）。

| 素材 | ファイル | 使い方 |
|---|---|---|
| 拠点トップ：魔法陣の台 | src/ui-art/stage.png | 額縁の中、主人公の後ろ（黒い地から丸く切り抜いた） |
| 拠点トップ：主人公の額縁 | src/ui-art/medallion.png | 金の唐草に空色の宝石。中の緑も抜いた（-Inner） |
| 拠点トップ：羽の付いた名札 | src/ui-art/wingplate.png | slice 40 95（左右は羽ごと） |
| 拠点トップ：仲間の枠 | src/ui-art/slot.png | 金の枠。顔の上に重ねて、顔のふちを隠す。中の緑も抜いた |
| 拠点トップ：メニューの札 | src/ui-art/menu.png | 木の縁に真ちゅうの金具。slice 56（表示は 18px） |
| 知らせ：NEW のリボン | src/ui-art/ribbon.png | 札とタブの右上の角に掛ける |
| 拠点の背景：村の一枚絵 | src/ui-art/village.jpg（768×1376） | 縦長。画面いっぱいに敷く（cover）。真ん中の広場に主人公を重ねる |
| 拠点トップ：冒険の準備の看板 | src/ui-art/signboard.png（鎖ごと 704×487、板は下の 302）。羽の付いた［GO!］の玉（go.png）は 2026-11-08 にやめた | 看板は伸ばさず、下の端にそろえて出す。見える鎖の長さは高さに合わせて変える。文字は絵ではなく、上に重ねる。［GO!］のまわりの緑がかった光は抜き、光は CSS で付ける |
| 下のタブ：帯・枠 | src/ui-art/tabbar.png・tab-off.png（選んでいない）・tab-sel.png（選んでいる） | 帯は slice 40 30 20 |
| 見出し：名前の札 | src/ui-art/topplate.png | 紺の板に金の縁。slice 26 |
| 見出し：ルーンの札 | src/ui-art/runeplate.png | 左右がひし形の金の飾り。札の大きさに合わせて伸ばす |
| メニュー・タブのアイコン・矢印（金の2つ重ねの山形）・ルーンの宝石 | public/art/ui_hub_*.png・ui_tab_*.png・ui_chevron.png・ui_rune.png | 冒険・配合・商店のタブは、トップのメニューのアイコンを使い回す |
| 道具のアイコン | public/art/item_<名前>.png（160） | 一覧の行と、マップに落ちている道具。種類ごとに代表の1枚（7章）。src/render/art.ts の ITEM_ART に名前を足す |

- 板は、届いた絵から角を丸く切り抜いて作る（まわりの地を透明にする）。素材の絵の半分の大きさにして軽くしている
- 道具のアイコンは 3×3 の9個を1枚で作ってもらい、1つずつ切り出して scripts/key-art.ps1 -Icon で背景を抜く
  - -Icon は、絵の中の緑（薬草の葉など）を消さないための指定。それでも葉が消えるとき（薬草・上薬草・毒消し草）は、背景の色に近い所だけを外側から抜く
  - 名前の文字が絵に入っていたら、文字の行を外して切り出す。右下の透かしは、背景の色で塗ってから抜く
- 道具の絵は種類ごとに1枚（7章）。今ある道具は、すべて絵がある。新しい種類の道具や装備を足したら、同じ頼み方で絵を作り、ITEM_ART に足す
- 届いた絵に区切りの罫線があるときは、罫線も外して切り出す
- つるの葉など、絵の中に緑があるときは、地の色との近さで抜く（緑みの強さで抜くと葉も薄くなる）。抜いた所のそばは、緑のにじみを弱める
- 鎖の輪や歯車の穴のように、絵に囲まれた緑は外側からの塗りつぶしでは抜けない。囲まれたはっきりした緑も抜く（uikey の -Inner、key-art の -Inner）
- 何個かを1枚にまとめた絵は、マス目で決め打ちして切ると、マスからはみ出した絵（盾の上の端・剣の先・紋章の右の端など）が切れる。まん中から、つながっている絵の範囲を調べて切り出す。名前の文字は白なので、絵とみなさない
- 一覧の行の丸い台に出す道具の絵は、四角い絵の角が丸からはみ出さないよう、台より小さく出す

### 8.1 拠点のトップの字体と、文字の絵
変わらない名前（看板の「冒険の準備」と、札の［商店］［記録］［配合］）は、字体ではなく描いてもらった文字の絵にする（2026-11-08。どの字体でも出せない飾りの字にするため）。中身が変わる文字（名札の「初代 召喚士」・ニックネーム・ルーン・Lv）は字体のまま。

| ファイル | 中身 | 使うところ |
|---|---|---|
| public/art/ui_label_adventure.png | 「冒険の準備」。重い明朝、上が明るい黄色・下が深い金、濃い茶と金の縁取り | 看板 |
| public/art/ui_label_shop.png・ui_label_records.png・ui_label_fusion.png | 「商店」「記録」「配合」。アンティークの明朝、上がクリーム色・下が橙がかった金、濃い茶の縁取り | 札 |

- 作り方：Gemini に、文字だけを緑一色（#00FF00）の背景に描いてもらう（1語ずつか、同じ雰囲気でまとめて1枚）。緑を抜いて透明にし、文字ごとに切り出して、高さ132px（画面では約44px の3倍）の PNG にする。字の形が崩れていないか（「険」「備」「録」「配」など）を確かめ、崩れていたら描き直してもらう
- 絵が出ないときと読み上げのために、alt に名前を入れる

日本語の字体は丸ごと入れると重いので、拠点に出る文字だけを Google Fonts から切り出して src/fonts/ に置く。SIL Open Font License。

| ファイル | 字体 | 使うところ |
|---|---|---|
| hub-ui.woff2 | Zen Kaku Gothic New（Black） | 見出しの名前とルーン・名札・Lv・下のタブ・知らせの「！」 |

- 丸ゴシックは安っぽく見えるので使わない。札の字は暗くせず、明るい黄色から金にする

- 拠点のトップに新しい言葉（称号・ほかの代の名前など）を出すときは、scripts/subset-fonts.py の文字に足して `python scripts/subset-fonts.py` で取り直す。足し忘れた字は、端末の字で出る
- 仲間のニックネームのように自由に打ち込める文字には使わない

### 8.2 紺と金の共通の部品
拠点のトップから移る画面に、同じ部品を使う。base.ts の NAVY_VIEWS に入れた画面（今は拠点のトップ以外のすべて：冒険の準備・仲間・配合・商店・その他）に当たる。

| 部品 | ファイル | 使い方 |
|---|---|---|
| ① 画面の枠 | src/ui-art/panel.png | 紺の地に四隅の金の唐草。slice 64（表示は 22px） |
| ② 行の札 | src/ui-art/menu.png | 拠点のトップの札と同じ。選んでいる行は金の光で縁取る |
| ③ 見出しの帯 | src/ui-art/ribbon-head.png | 紺のリボン。slice 20 80（左右は尾ごと） |
| ④ タブ | src/ui-art/tab2-on.png・tab2-off.png | 選んでいる方は明るい紺に光る金、ほかは暗い紺。slice 24。並べ替え・［バッグ］［倉庫］も同じ |
| ⑤ 大きなボタン | src/ui-art/btn-main.png | 金の縁に空色の宝石の面。slice 40 76。［ダンジョンに向かう］［買う］など。［戻る］は④の暗い紺 |
| ⑥ 小さなボタン | src/ui-art/btn-small.png | 紺の板に金の縁。slice 22。行の［出発］［倉庫へ送る］、［－］［＋］ |
| ⑦ 選ぶ印 | src/ui-art/check-on.png・check-off.png | 金の丸に緑のチェック、空の金の丸 |
| 顔と道具の枠 | src/ui-art/slot.png | 拠点のトップの仲間の枠と同じ金の四角い枠 |

**ボタンの4段階**（2026-11-08、UIレビュー⑥⑦）。ボタンは役目で4つに分け、見た目で区別する。

| 段階 | 見た目 | 使う場面 |
|---|---|---|
| 主役 | ⑤ btn-main.png（空色の宝石）。class は main | 1つの画面に1つだけ。出発・買う・装備・使う・食べる・配合する（の前のボタン）など。押せないときは主役にしない |
| ふつう | ⑥ btn-small.png（紺に金の縁） | 一覧の中の横いっぱいのボタン（投げる・置く・登録する など）、行の小さなボタン |
| 控えめ | 文字だけ（金の「‹」） | 一覧の左上の［‹］で一つ前の一覧へ戻る。下の大きな［戻る］は置かない |
| 注意 | ⑤ btn-main.png を赤くしたもの（hue-rotate）。class は danger | 取り消せない操作：あきらめる・配合する・転生する・別れる。そのときは［やめる］を主役にする |

- ④ タブ（tab2）は「選ぶもの」だけに使い、ボタンには使わない（選ばれていないタブと押せるボタンが同じに見えないように）
- 字：明朝は題名・名前・階の名前など大きく出す言葉だけ。ボタン・数字・説明はゴシックの太め（style.css の --gothic）。字は12px以上（顔の Lv・指示の小さな札・知らせの「！」は除く）
- 下のタブは、今いるタブを金の字と金の枠にし、ほかのアイコンは少しくすませる

### 8.3 ダンジョンの中
新しい絵は使わず、8.2 の部品を当てる（style.css の「ダンジョンの中：紺と金」）。一覧（#sheet-body）の行・タブ・ボタンは、拠点と同じ規則がそのまま当たる。

| ところ | 使う部品 |
|---|---|
| 階の札 | topplate.png（拠点の見出しと同じ） |
| パッド・［魔法］［仲間］［バッグ］［メニュー］ | ⑥ btn-small.png |
| ［攻撃］・確かめの［はい］・道具の画面の［使う］［装備］など主役 | ⑤ btn-main.png |
| 確かめの［あきらめる］・［別れる］ | ⑤ を赤くしたもの（注意） |
| 一覧・これまでのログ・確かめの窓 | ① panel.png |
| 横いっぱいのボタン | ⑥ btn-small.png（ふつう） |
| ［閉じる］・［いいえ］ | ④ tab2-off.png |
| 一覧の左上の［‹］ | 金の字だけ（控えめ） |

## 9. 確かめること
- [ ] 背景が透明（または消せる）
- [ ] 1枚に1体だけ。全身が入っている
- [ ] 輪郭線が紺色で、太さがほかの絵とそろっている
- [ ] 明るい寒色が中心（ヒダマリ・ポコタケは暖色でよい）
- [ ] 小さく（48×48くらい）しても、何の魔物か分かる
- [ ] 文字・透かし・サインが入っていない
- [ ] 他の作品のキャラクターに似ていない
