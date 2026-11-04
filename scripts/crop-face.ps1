param([string]$In, [string]$Out, [int]$X, [int]$Y, [int]$W, [int]$Size = 128)
# 全身の絵（256×256）から顔のところを正方形に切り出して、アイコンの絵にする
# 使い方: powershell -File scripts/crop-face.ps1 -In public/art/player.png -Out public/art/face_player.png -X 55 -Y 30 -W 150
# X・Y は絵の外（マイナスや 256 をこえる所）でもよい。はみ出したところは透明になる
# 両目のまん中が横の中心、目の高さが上から 45% に来るように X・Y を決めると、顔の向きがそろう（docs/art-guide.md 5）
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$icon = New-Object System.Drawing.Bitmap $Size, $Size
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
# 絵全体を拡大して、切り出す所がアイコンにちょうど入る位置に置く
$scale = $Size / $W
$g.DrawImage($src, [float](-$X * $scale), [float](-$Y * $scale), [float]($src.Width * $scale), [float]($src.Height * $scale))
$g.Dispose()
$src.Dispose()
$icon.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()
"saved $Out"
