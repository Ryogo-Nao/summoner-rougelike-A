param([string]$In, [string]$Out, [int]$X, [int]$Y, [int]$W, [int]$Size = 128)
# 全身の絵（256×256）から顔のところを正方形に切り出して、アイコンの絵にする
# 使い方: powershell -File scripts/crop-face.ps1 -In public/art/player.png -Out public/art/face_player.png -X 55 -Y 30 -W 150
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$icon = New-Object System.Drawing.Bitmap $Size, $Size
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $Size, $Size), $X, $Y, $W, $W, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$src.Dispose()
$icon.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose()
"saved $Out"
