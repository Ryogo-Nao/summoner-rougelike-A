"""ホーム画面のアイコン（public/icon-*.png）を作る。外部のライブラリは使わない。

暗い紫の地に、金色の魔法陣（輪と五芒星）を描く。作り直すときは:
    python scripts/make-icons.py
"""
import math
import struct
import zlib
from pathlib import Path

BG = (20, 18, 28)
GLOW = (52, 40, 86)
GOLD = (240, 196, 92)
SAMPLES = 3  # 1ピクセルを 3×3 に分けて、ふちをなめらかにする


def star_points(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def inside(poly, x, y):
    hit = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def color_at(x, y, size, pad):
    """0〜1 の座標で色を返す。pad はマスク用アイコンの余白（中身を小さくする）"""
    u = (x - 0.5) / (1 - 2 * pad)
    v = (y - 0.5) / (1 - 2 * pad)
    d = math.hypot(u, v)
    if 0.40 <= d <= 0.45:
        return GOLD
    if inside(STAR, u, v):
        return GOLD
    if d < 0.40:
        t = d / 0.40
        return tuple(round(g * (1 - t) + b * t) for g, b in zip(GLOW, BG))
    return BG


STAR = star_points(0, 0.02, 0.33, 0.13)


def render(size, pad):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            acc = [0, 0, 0]
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    c = color_at((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size, size, pad)
                    for i in range(3):
                        acc[i] += c[i]
            row += bytes(round(a / SAMPLES**2) for a in acc)
        rows.append(bytes(row))
    return b''.join(rows)


def png(size, pixels):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(pixels, 9)) + chunk(b'IEND', b'')


out = Path(__file__).resolve().parent.parent / 'public'
out.mkdir(exist_ok=True)
# maskable は、丸や角丸に切り抜かれても欠けないよう、中身を小さくする
for name, size, pad in [('icon-180.png', 180, 0.04), ('icon-192.png', 192, 0.04), ('icon-512.png', 512, 0.04), ('icon-maskable-512.png', 512, 0.12)]:
    (out / name).write_bytes(png(size, render(size, pad)))
    print(name)
