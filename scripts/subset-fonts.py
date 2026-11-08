"""拠点のトップの字体（src/fonts/*.woff2）を、使う文字だけ切り出して Google Fonts から取ってくる。外部のライブラリは使わない。

拠点のトップに新しい言葉（称号など）を出すときは、下の TEXT に字を足して、もう一度取ってくる:
    python scripts/subset-fonts.py
字体はどれも SIL Open Font License で、ゲームに入れて配ってよい
"""
import re
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'src' / 'fonts'
# 新しい形式（woff2）で返してもらうため、今のブラウザを名乗る
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

DIGITS = '0123456789'
# 名前（ファイル名）: (字体, 太さ, 切り出す文字)
FONTS = {
    # 看板の「冒険の準備」：重厚な明朝
    'hub-fantasy': ('Shippori Mincho B1', 800, '冒険の準備'),
    # ［商店］［記録］［配合］：羊皮紙に合うアンティークの明朝
    'hub-antique': ('Zen Antique', 400, '商店記録配合'),
    # 見出し・名札・ルーン・Lv・下のタブ：丸くない太いゴシック
    'hub-ui': (
        'Zen Kaku Gothic New',
        900,
        '初代召喚士目' + DIGITS + 'ルーン冒険の準備仲間配合商店その他拠点記録Lv＋！ ',
    ),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (family, weight, text) in FONTS.items():
        chars = ''.join(sorted(set(text)))
        query = urllib.parse.urlencode({'family': f'{family}:wght@{weight}', 'text': chars})
        css = fetch(f'https://fonts.googleapis.com/css2?{query}').decode('utf-8')
        urls = re.findall(r'url\((https://[^)]+)\)', css)
        if len(urls) != 1:
            raise SystemExit(f'{name}: 字体のファイルが1つではない（{len(urls)}）')
        data = fetch(urls[0])
        (OUT / f'{name}.woff2').write_bytes(data)
        print(f'{name}.woff2  {family} {weight}  {len(chars)}文字  {len(data) // 1024}KB')


if __name__ == '__main__':
    main()
