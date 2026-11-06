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
| 背景 | 真緑（#00FF00）の一色。透明にはこちらで抜く。地面の影も描かない（影はゲームが描く） |
| 効果 | キャラクターのまわりに、キラキラ・粒・光・オーラを描かない（小さくするとにじむため） |
| 構図 | 正方形（1:1）。1枚に1体だけ。全身。真ん中に置き、上下左右に少し余白を残す。足もとは下から10％くらい |
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
Square 1:1 image. Plain solid pure green background (#00FF00), completely flat, nothing else in the background.
No sparkles, no particles, no glow or aura around the character. No ground shadow, no text, no watermark, no border.
```

**日本語**（Gemini などで日本語のほうが通るとき）
```
かわいいちびキャラのファンタジー生物のゲームアート。オリジナルのデザイン。
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

## 6. 魔物と主人公の説明

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

- 寒色の決まりがあるが、ヒダマリ（火）とポコタケ（キノコ）は暖色を使ってよい。輪郭線と塗り方をそろえれば、絵柄は保てる
- 絵が入っているもの：主人公、イヅツチと、6の表の魔物すべて（この絵柄で決まり）

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

## 8. UIの素材（枠・ボタンの板・紙の地）と道具のアイコン
Gemini で作った素材を使っている（2026-11-05）。CSS だけでは木目・革・金属の質感が出ないため、絵の素材にする。

| 素材 | ファイル | 使い方 |
|---|---|---|
| 紙の地 | src/ui-art/paper.jpg（512） | 拠点の背景に並べる |
| 枠（木と革に真ちゅうの金具） | src/ui-art/frame.jpg（512） | 拠点の一覧の枠。border-image で四隅を残し辺を伸ばす（slice 125、表示は 24px） |
| 選んでいるタブ（明るい紙に金の縁） | src/ui-art/tab-on.png | slice 30 |
| 木の板 | src/ui-art/plank.png | 選んでいないタブ、一覧の行のボタン。slice 30 |
| 決めるボタン（彫った木に金の縁と鋲） | src/ui-art/action.png | ［ダンジョンに向かう］［購入］など。slice 34 44 |
| 小さい四角の板 | src/ui-art/square.png | ［－］［＋］。slice 20 |
| 拠点トップ：魔法陣の台 | src/ui-art/stage.png | 額縁の中、主人公の後ろ（黒い地から丸く切り抜いた） |
| 拠点トップ：主人公の額縁 | src/ui-art/medallion.png | 金の唐草に空色の宝石。中の緑も抜いた（-Inner） |
| 拠点トップ：羽の付いた名札 | src/ui-art/wingplate.png | slice 40 95（左右は羽ごと） |
| 拠点トップ：仲間の枠 | src/ui-art/slot.png | 金の枠。顔の上に重ねて、顔のふちを隠す。中の緑も抜いた |
| 拠点トップ：メニューの札 | src/ui-art/menu.png | 木の縁に真ちゅうの金具。slice 56（表示は 18px） |
| 知らせ：NEW のリボン | src/ui-art/ribbon.png | 札とタブの右上の角に掛ける |
| 拠点の背景：村の一枚絵 | src/ui-art/village.jpg（768×1376） | 縦長。画面いっぱいに敷く（cover）。真ん中の広場に主人公を重ねる |
| 拠点トップ：冒険の準備の看板・［GO!］ | src/ui-art/signboard.png（鎖ごと 704×487、板は下の 302）・go.png（羽の付いた玉） | 看板は伸ばさず、下の端にそろえて出す。見える鎖の長さは高さに合わせて変える。文字は絵ではなく、上に重ねる。［GO!］のまわりの緑がかった光は抜き、光は CSS で付ける |
| 下のタブ：帯・枠 | src/ui-art/tabbar.png・tab-off.png（選んでいない）・tab-sel.png（選んでいる） | 帯は slice 40 30 20 |
| 見出し：名前の札 | src/ui-art/topplate.png | 紺の板に金の縁。slice 26 |
| 見出し：ルーンの札 | src/ui-art/runeplate.png | 左右がひし形の金の飾り。札の大きさに合わせて伸ばす |
| メニュー・タブのアイコン・矢印（金の2つ重ねの山形）・ルーンの宝石 | public/art/ui_hub_*.png・ui_tab_*.png・ui_chevron.png・ui_rune.png | 冒険・配合・商店のタブは、トップのメニューのアイコンを使い回す |
| 道具のアイコン | public/art/item_<種類>.png（160） | 一覧の行と、マップに落ちている道具。src/render/art.ts の ITEM_ART に種類を足す |

- 板は、届いた絵から角を丸く切り抜いて作る（まわりの地を透明にする）。素材の絵の半分の大きさにして軽くしている
- 道具のアイコンは 3×3 の9個を1枚で作ってもらい、1つずつ切り出して scripts/key-art.ps1 -Icon で背景を抜く
  - -Icon は、絵の中の緑（薬草の葉など）を消さないための指定。それでも葉が消えるとき（薬草・上薬草・毒消し草）は、背景の色に近い所だけを外側から抜く
  - 名前の文字が絵に入っていたら、文字の行を外して切り出す。右下の透かしは、背景の色で塗ってから抜く
- 今ある道具は、ルーンも含めてすべて絵がある（34種）。道具を足したら、同じ頼み方で絵を作り、ITEM_ART に足す
- 届いた絵に区切りの罫線があるときは、罫線も外して切り出す
- つるの葉など、絵の中に緑があるときは、地の色との近さで抜く（緑みの強さで抜くと葉も薄くなる）。抜いた所のそばは、緑のにじみを弱める
- 鎖の輪や歯車の穴のように、絵に囲まれた緑は外側からの塗りつぶしでは抜けない。囲まれたはっきりした緑も抜く（uikey の -Inner、key-art の -Inner）
- 何個かを1枚にまとめた絵は、マス目で決め打ちして切ると、マスからはみ出した絵（盾の上の端・剣の先・紋章の右の端など）が切れる。まん中から、つながっている絵の範囲を調べて切り出す。名前の文字は白なので、絵とみなさない
- 一覧の行の丸い台に出す道具の絵は、四角い絵の角が丸からはみ出さないよう、台より小さく出す

### 8.1 拠点のトップの字体
日本語の字体は丸ごと入れると重いので、拠点のトップに出る文字だけを Google Fonts から切り出して src/fonts/ に置く（4つで約13KB）。どれも SIL Open Font License。

| ファイル | 字体 | 使うところ |
|---|---|---|
| hub-fantasy.woff2 | しっぽり明朝 B1（ExtraBold） | 看板の「冒険の準備」 |
| hub-display.woff2 | Dela Gothic One | ［GO!］ |
| hub-antique.woff2 | Zen Antique | ［商店］［記録］［配合］（色は明るい黄色から金） |
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
| ⑤ 大きなボタン | src/ui-art/btn-main.png | 金の縁に空色の宝石の面。slice 40 76。［ダンジョンに向かう］［購入する］など。［戻る］は④の暗い紺 |
| ⑥ 小さなボタン | src/ui-art/btn-small.png | 紺の板に金の縁。slice 22。行の［出発］［倉庫へ送る］、［－］［＋］ |
| ⑦ 選ぶ印 | src/ui-art/check-on.png・check-off.png | 金の丸に緑のチェック、空の金の丸 |
| 顔と道具の枠 | src/ui-art/slot.png | 拠点のトップの仲間の枠と同じ金の四角い枠 |

## 9. 確かめること
- [ ] 背景が透明（または消せる）
- [ ] 1枚に1体だけ。全身が入っている
- [ ] 輪郭線が紺色で、太さがほかの絵とそろっている
- [ ] 明るい寒色が中心（ヒダマリ・ポコタケは暖色でよい）
- [ ] 小さく（48×48くらい）しても、何の魔物か分かる
- [ ] 文字・透かし・サインが入っていない
- [ ] 他の作品のキャラクターに似ていない
