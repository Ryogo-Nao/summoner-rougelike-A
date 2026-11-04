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
- 雰囲気は**明るく、かわいらしく、少し不思議**。こわい・グロテスクな表現はしない
- 色は**明るい寒色**が中心（空色・水色・ミント・薄紫）。差し色に金色
- 他の作品のキャラクターに似せない。指示の中に、他の作品の名前やキャラクター名を入れない

## 3. 絵の決まり（すべての絵で共通）

| 項目 | 決まり |
|---|---|
| 絵柄 | ちびキャラ（頭が大きめ、2〜2.5頭身）。丸みのある形。ゲームのキャラクターアート |
| 向き | 正面から少し斜め（3/4ビュー）。こちらを見ている。魔物は左下を向く |
| 輪郭線 | 太めでやさしい線。色は黒ではなく濃い紺（#2B3A67） |
| 塗り | アニメ塗り（はっきりした影が1〜2段）。強いグラデーションや細かい描き込みはしない |
| 光 | 左上から当たる、やわらかい光 |
| 背景 | なし（透明）。地面の影も描かない（影はゲームが描く） |
| 構図 | 1枚に1体だけ。全身。真ん中に置き、上下左右に少し余白を残す。足もとは下から10％くらい |
| サイズ | キャラクター：1024×1024 で作り、512×512 に縮める。アイテム：512×512 で作り、256×256 に縮める |
| 文字 | 入れない（名前、サイン、透かしも入れない） |
| ファイル名 | `monster_chuppi.png`、`item_herb.png` のように、英語の名前（下の表のID）で付ける |

### 色の見本
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

魔物は、もとの色（カエルは緑、など）を残してよい。ただし全体を明るく、少し寒色に寄せる。

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
Transparent background, no ground shadow, no text, no watermark, no border.
```

**日本語**（Gemini などで日本語のほうが通るとき）
```
かわいいちびキャラのファンタジー生物のゲームアート。オリジナルのデザイン。
頭が大きく、丸くてやわらかい形。2〜2.5頭身。
正面から少し斜め（3/4ビュー）、少し左下を向き、こちらを見ている。全身、真ん中に1体だけ。
濃い紺色（#2B3A67）の太めでやさしい輪郭線。影が1〜2段のアニメ塗り。左上からやわらかい光。
空色・水色・ミント・薄紫を中心にした明るい寒色。少しだけ金色の差し色。
明るく親しみやすく、少し不思議な雰囲気。こわくしない。
背景は透明。地面の影、文字、透かし、枠は入れない。
```

## 5. 作る順番
1. **イヅツチを最初に作る**。これを「絵柄の見本」にする。気に入るまで何回か作り直す
2. 2体目からは、イヅツチの絵を添えて「添付の絵と同じ絵柄、同じ線、同じ塗りで描いて」と頼む
3. 1体できるごとに、下の「確かめること」を見る
4. できた絵を送ってもらえれば、私がゲームに入れる（大きさの調整、表示の確認）

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

## 6. 魔物と主人公の説明

| ID | 名前 | 日本語の説明 | 英語の説明 |
|---|---|---|---|
| player | 主人公（召喚士） | 若い召喚士。大きなとんがり帽子とケープ。先に光る宝石が付いた杖を持つ。空色と白の服、金色の飾り | A young summoner with a big pointed hat and a short cape, holding a staff topped with a glowing crystal. Sky blue and white clothes with gold trim. |
| izutsuchi | イヅツチ（相棒） | 雷をまとう小さな猫。ふわふわの毛、しっぽの先が稲妻の形。体のまわりに小さな金色の火花。元気で頼もしい | A small fluffy cat wrapped in light electricity, tail tip shaped like a lightning bolt, tiny gold sparks around the body. Energetic and loyal. |
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

- 寒色の決まりがあるが、ヒダマリ（火）とポコタケ（キノコ）は暖色を使ってよい。輪郭線と塗り方をそろえれば、絵柄は保てる

## 7. アイテムとアイコン（Recraft）
Recraft では、最初に絵柄（スタイル）を1つ作り、すべてのアイコンをその絵柄で作る。

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
| seal | ○○の印 | a rolled magic scroll with a ribbon（印ごとにリボンと紋章の色を変える） |
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

## 8. 確かめること
- [ ] 背景が透明（または消せる）
- [ ] 1枚に1体だけ。全身が入っている
- [ ] 輪郭線が紺色で、太さがほかの絵とそろっている
- [ ] 明るい寒色が中心（ヒダマリ・ポコタケは暖色でよい）
- [ ] 小さく（48×48くらい）しても、何の魔物か分かる
- [ ] 文字・透かし・サインが入っていない
- [ ] 他の作品のキャラクターに似ていない
