param([string]$In, [string]$Out, [int]$Size = 256, [switch]$Icon)
# 緑の背景を透明にして、余白をそろえた正方形の PNG にする（docs/art-guide.md 5）
# 使い方: powershell -File scripts/key-art.ps1 -In 届いた絵.jpg -Out public/art/monster_chuppi.png
# -Icon は道具のアイコン用。絵の中の緑（薬草の葉など）を残し、上下もまん中にそろえる
Add-Type -AssemblyName System.Drawing
if (-not ('Keyer' -as [type])) {
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class Keyer {
  public static string Run(string inPath, string outPath, int size, bool icon) {
    Bitmap src0 = new Bitmap(inPath);
    int W = src0.Width, H = src0.Height;
    Bitmap src = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(src)) g.DrawImage(src0, 0, 0, W, H);
    src0.Dispose();
    Rectangle rect = new Rectangle(0, 0, W, H);
    BitmapData bd = src.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    byte[] p = new byte[W * H * 4];
    Marshal.Copy(bd.Scan0, p, 0, p.Length);
    // BGRA
    Func<int, int> gk = i => p[i + 1] - Math.Max(p[i + 2], p[i]);
    double br = 0, bg = 0, bb = 0;
    int[][] corners = { new[] { 4, 4 }, new[] { W - 5, 4 }, new[] { 4, H - 5 }, new[] { W - 5, H - 5 } };
    foreach (var c in corners) { int i = (c[1] * W + c[0]) * 4; br += p[i + 2]; bg += p[i + 1]; bb += p[i]; }
    br /= 4; bg /= 4; bb /= 4;
    double kbg = bg - Math.Max(br, bb);
    bool[] mask = new bool[W * H];
    Stack<int> st = new Stack<int>();
    Action<int> push = n => { if (!mask[n] && gk(n * 4) > kbg * 0.45) { mask[n] = true; st.Push(n); } };
    for (int i = 0; i < W; i++) { push(i); push((H - 1) * W + i); }
    for (int j = 0; j < H; j++) { push(j * W); push(j * W + W - 1); }
    while (st.Count > 0) {
      int n = st.Pop(); int cx = n % W, cy = n / W;
      if (cx > 0) push(n - 1); if (cx < W - 1) push(n + 1);
      if (cy > 0) push(n - W); if (cy < H - 1) push(n + W);
    }
    // 囲まれていても、はっきりした緑は背景
    if (!icon) for (int n = 0; n < W * H; n++) if (gk(n * 4) > kbg * 0.7) mask[n] = true;
    bool[] near = new bool[W * H];
    const int R = 3;
    for (int n = 0; n < W * H; n++) {
      if (!mask[n]) continue;
      int cx = n % W, cy = n / W;
      for (int dy = -R; dy <= R; dy++) for (int dx = -R; dx <= R; dx++) {
        int xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) near[yy * W + xx] = true;
      }
    }
    int minX = W, minY = H, maxX = 0, maxY = 0;
    for (int n = 0; n < W * H; n++) {
      int i = n * 4;
      double a = 1;
      if (mask[n]) a = 0;
      else if (near[n]) {
        // 背景のすぐ近くは、緑の混ざり具合から透明度を出し、背景の色を抜く
        a = Math.Min(1, Math.Max(0, (kbg - gk(i)) / kbg));
        if (a < 0.08) a = 0;
        if (a > 0 && a < 1) {
          p[i + 2] = Clamp((p[i + 2] - (1 - a) * br) / a);
          p[i + 1] = Clamp((p[i + 1] - (1 - a) * bg) / a);
          p[i] = Clamp((p[i] - (1 - a) * bb) / a);
        }
        int m = Math.Max(p[i + 2], p[i]);
        if (p[i + 1] > m + 10) p[i + 1] = (byte)Math.Min(255, m + 10);
      }
      p[i + 3] = (byte)Math.Round(a * 255);
      if (a == 0) { p[i] = 0; p[i + 1] = 0; p[i + 2] = 0; }
      if (a > 0.3) {
        int cx = n % W, cy = n / W;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      }
    }
    Marshal.Copy(p, 0, bd.Scan0, p.Length);
    src.UnlockBits(bd);
    // 横は真ん中、足もとは下から4%にそろえ、大きいほうの辺を92%にする
    int bw = maxX - minX + 1, bh = maxY - minY + 1;
    double scale = size / (Math.Max(bw, bh) / 0.92);
    int fw = (int)Math.Round(bw * scale), fh = (int)Math.Round(bh * scale);
    Bitmap outB = new Bitmap(size, size, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(outB)) {
      g.Clear(Color.Transparent);
      g.CompositingMode = CompositingMode.SourceOver;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      g.SmoothingMode = SmoothingMode.HighQuality;
      using (ImageAttributes ia = new ImageAttributes()) {
        ia.SetWrapMode(WrapMode.TileFlipXY);
        int top = icon ? (size - fh) / 2 : (int)Math.Round(size * 0.96) - fh;
        g.DrawImage(src, new Rectangle((size - fw) / 2, top, fw, fh), minX, minY, bw, bh, GraphicsUnit.Pixel, ia);
      }
    }
    outB.Save(outPath, ImageFormat.Png);
    outB.Dispose(); src.Dispose();
    return outPath + " kbg=" + (int)kbg + " box=" + minX + "," + minY + "," + bw + "," + bh;
  }
  static byte Clamp(double v) { return (byte)Math.Max(0, Math.Min(255, Math.Round(v))); }
}
'@
}
[Keyer]::Run($In, $Out, $Size, [bool]$Icon)
