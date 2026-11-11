// 画面のテストで使う道具
import { expect, type Page } from '@playwright/test';

const SPECIES = [
  'chuppi', 'berogg', 'patari', 'pokotake', 'shururu', 'garuf', 'kaburamu', 'moyari', 'hidamari', 'goromu',
  'nemuriga', 'kuimushi', 'amigumo', 'chisui', 'tsubumaru', 'fuwakura', 'nurarika', 'kirigani', 'dosuino', 'tsuraragu',
];

const card = (id: number, species: string, level: number, nickname?: string) => ({
  id,
  species,
  level,
  exp: 0,
  hp: 9999,
  maxHp: 1,
  atk: 1,
  def: 1,
  personality: 'sunao',
  bonus: { maxHp: 0, atk: 0, def: 0 },
  status: 'ready',
  obtainedHere: false,
  ...(nickname ? { nickname } : {}),
});

/**
 * 拠点のデータ。仲間は イヅツチ ＋ count 体（Lv はばらばら、2体にニックネーム）、
 * 倉庫には道具をいろいろ入れる。踏破済みにして、すべてのダンジョンを選べるようにする
 */
export function profileWith(count: number, extra: Record<string, unknown> = {}) {
  const cards = [card(1, 'izutsuchi', 1)];
  for (let i = 0; i < count; i++) {
    const nickname = i === 3 ? 'ポチ' : i === 7 ? 'たろう' : undefined;
    cards.push(card(2 + i, SPECIES[i % SPECIES.length], 10 + (i % 8), nickname));
  }
  const kinds = ['ironSword', 'starSleep', 'herb', 'bread', 'sealSummon', 'tomeGuard', 'starHeal', 'sealConfuse', 'club', 'bigHerb', 'water', 'arrow'];
  let itemId = 1000;
  return {
    version: 1,
    cards,
    hand: [1],
    bag: ['bread', 'herb', 'herb', 'blank'].map((kind) => ({ id: itemId++, kind })),
    warehouse: kinds.map((kind) => ({ id: itemId++, kind })),
    learned: [],
    cleared: ['first', 'forest'],
    runes: 5000,
    ...extra,
  };
}

/** ページを開く前に、拠点のデータを入れておく（ダンジョンの途中のデータは消す） */
export async function openWithProfile(page: Page, profile: unknown): Promise<void> {
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('summoner-profile', JSON.stringify(data));
  }, profile);
  await page.goto('/');
  await expect(page.locator('#base')).toBeVisible();
}

/** コンソールのエラーと、ページの中で起きた例外を集める */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** 下のタブ（拠点・冒険・仲間・配合・商店・その他）を押す */
export async function nav(page: Page, label: string): Promise<void> {
  await page.locator('#base-nav button', { hasText: label }).click();
}

/** 横にはみ出しているものがないか。はみ出している要素を返す */
export async function overflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > width + 1) out.push(`ページ全体 ${document.documentElement.scrollWidth}px`);
    for (const el of document.querySelectorAll<HTMLElement>('#base *, #app *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || getComputedStyle(el).visibility === 'hidden') continue;
      if (el.closest('[hidden]')) continue;
      if (r.right > width + 1 || r.left < -1) out.push(`${el.tagName}.${el.className} ${Math.round(r.left)}〜${Math.round(r.right)}`);
    }
    return out.slice(0, 5);
  });
}

/** 見えている文字に、undefined・NaN などがないか */
export async function brokenText(page: Page): Promise<string[]> {
  const text = await page.locator('body').innerText();
  return ['undefined', 'NaN', '[object Object]', 'null'].filter((w) => text.includes(w));
}

/** ダンジョンを選んで出発する（index は上から何番目のダンジョンか） */
/** 冒険を開き、ダンジョンを選んで［準備する］を押し、仲間と持ち物の準備へ進む（冒険はダンジョンを選ぶところから始まる） */
export async function openPrep(page: Page, index = 0): Promise<void> {
  await nav(page, '冒険');
  // 一覧でダンジョンを押すと詳しい画面が出て、［準備する］で準備へ
  await page.locator('#base-body .line-row.dungeon').nth(index).click();
  await page.locator('#base-body button', { hasText: '準備する' }).click();
  await expect(page.locator('#base-tabs')).toBeVisible();
}

export async function startDungeon(page: Page, index = 0): Promise<void> {
  await openPrep(page, index);
  await page.locator('#base-depart').click();
  await expect(page.locator('#base')).toBeHidden();
  // 階の名前の画面を消す
  await page.locator('#floor-title').dispatchEvent('pointerdown');
  await expect(page.locator('#floor')).toHaveText('B1F');
}

/** 右側のボタンを押す（pointerdown で受けるボタン） */
export async function press(page: Page, selector: string): Promise<void> {
  const box = (await page.locator(selector).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}
