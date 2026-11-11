// 拠点の一覧（F-61〜F-66）と、文字を打つ欄の大きさ（N-07）
import { expect, test } from '@playwright/test';
import { collectErrors, nav, openPrep, openWithProfile, profileWith } from './helpers';

const names = (page: import('@playwright/test').Page) => page.locator('#base-body .search-list .name').allInnerTexts();

test('F-61 仲間の一覧はページに分けずスクロールする。冒険の準備の仲間は 390×664 で5行見える', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await openWithProfile(page, profileWith(24));
  await nav(page, '仲間');
  expect((await names(page)).length).toBe(25);
  await expect(page.locator('.pager')).toHaveCount(0);
  await openPrep(page);
  expect((await names(page)).length).toBe(25);
  const seen = await page.evaluate(() => {
    const body = document.getElementById('base-body')!.getBoundingClientRect();
    return [...document.querySelectorAll('.line-row')].filter((r) => {
      const b = r.getBoundingClientRect();
      return b.top >= body.top && b.bottom <= body.bottom;
    }).length;
  });
  expect(seen).toBeGreaterThanOrEqual(5);
});

test('F-62 検索：ひらがな・ニックネーム・道具の種類で探せる', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithProfile(page, profileWith(24));
  await nav(page, '仲間');
  const box = page.locator('.list-search input');
  await box.fill('がるふ');
  expect(await names(page)).toEqual(['ガルフ']);
  await box.fill('ポチ');
  expect(await names(page)).toEqual(['ポチ']);
  await box.fill('たろう');
  expect(await names(page)).toEqual(['たろう']);
  await box.fill('ずずず');
  await expect(page.locator('.search-list')).toContainText('見つからない');
  // 道具：倉庫で「いん」と打つと印が出る
  await openPrep(page);
  await page.locator('#base-tabs button', { hasText: '持ち物' }).click();
  await page.locator('.place-tabs button', { hasText: '倉庫' }).click();
  await page.locator('.list-search input').fill('いん');
  const found = await names(page);
  expect(found.length).toBe(2);
  for (const n of found) expect(n).toMatch(/の印/);
  await page.locator('.list-search input').fill('ほし');
  for (const n of await names(page)) expect(n).toMatch(/星/);
  expect(errors).toEqual([]);
});

test('N-07 検索の欄の字は16px 以上', async ({ page }) => {
  await openWithProfile(page, profileWith(3));
  await nav(page, '仲間');
  const size = await page.locator('.list-search input').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(16);
});

test('F-63 冒険の準備で、上の顔を押すと連れていく仲間から外れる', async ({ page }) => {
  await openWithProfile(page, profileWith(5, { hand: [1, 2, 3, 4] }));
  await openPrep(page);
  await expect(page.locator('.party-count')).toHaveText('4 / 5');
  await page.locator('.party-faces .face.tap').nth(1).click();
  await expect(page.locator('.party-count')).toHaveText('3 / 5');
  await expect(page.locator('.party-faces .face.empty')).toHaveCount(2);
});

test('F-64 配合の画面で仲間を押すと、つよさが出て、戻れる', async ({ page }) => {
  await openWithProfile(page, profileWith(4));
  // 配合は仲間のタブの中
  await nav(page, '仲間');
  await page.locator('#base-body .ally-modes button', { hasText: '配合' }).click();
  await expect(page.locator('#base-title')).toHaveText('配合');
  await expect(page.locator('#base-nav button.on')).toHaveText(/仲間/);
  await page.locator('#base-body .line-row.ally .name').first().click();
  await expect(page.locator('.status-view')).toBeVisible();
  await expect(page.locator('#base-depart')).toHaveText('戻る');
  await page.locator('#base-depart').click();
  await expect(page.locator('.status-view')).toHaveCount(0);
  await expect(page.locator('#base-depart')).toBeHidden();
});

test('F-97 配合の確かめに、生まれる子の性格の確率は出さない', async ({ page }) => {
  await openWithProfile(page, profileWith(4));
  await nav(page, '仲間');
  await page.locator('#base-body .ally-modes button', { hasText: '配合' }).click();
  // 右の丸い印（aria-label が「選ぶ」）で親を2体選ぶ
  const pick = page.locator('#base-body .line-row.ally').getByRole('button', { name: '選ぶ', exact: true });
  await pick.first().click();
  await pick.first().click();
  await expect(page.locator('#base-body', { hasText: '足し算' })).toBeVisible();
  await expect(page.locator('#base-body').getByText('伸び', { exact: true })).toBeVisible();
  await expect(page.locator('#base-body').getByText('性格', { exact: true })).toHaveCount(0);
  await expect(page.locator('#base-body')).not.toContainText('％');
});

test('F-65・F-66 商店で買える。一覧は種類順', async ({ page }) => {
  await openWithProfile(page, profileWith(1));
  await nav(page, '商店');
  const rows = await page.locator('#base-body .line-row .name').allInnerTexts();
  expect(rows.length).toBeGreaterThan(2);
  // 薬草（草）はパン（食べ物）のあと、装備より前
  const herb = rows.findIndex((t) => t.startsWith('薬草'));
  const bread = rows.findIndex((t) => t.startsWith('パン'));
  expect(bread).toBeLessThan(herb);
  // 薬草は2つ並び、1行ずつ1つまで
  const herbs = page.locator('#base-body .line-row', { hasText: '薬草' });
  await expect(herbs).toHaveCount(2);
  const runes = await page.locator('#base-runes').innerText();
  await herbs.first().locator('button', { hasText: '＋' }).click();
  await expect(herbs.first().locator('button', { hasText: '＋' })).toBeDisabled();
  await page.locator('#base-depart').click();
  await expect(page.locator('#base-runes')).not.toHaveText(runes);
  // 持ち物は種類順
  await openPrep(page);
  await page.locator('#base-tabs button', { hasText: '持ち物' }).click();
  const bag = await page.locator('#base-body .search-list .name').allInnerTexts();
  expect(bag[0]).toMatch(/^パン/);
});

test('F-88 道具の行はどれも同じ高さ。行を押すと説明が出て、戻れる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await openWithProfile(page, profileWith(1));
  await openPrep(page);
  await page.locator('#base-tabs button', { hasText: '持ち物' }).click();
  await page.locator('.place-tabs button', { hasText: '倉庫' }).click();
  const heights = () =>
    page.evaluate(() => [...new Set([...document.querySelectorAll('.line-row')].map((r) => Math.round(r.getBoundingClientRect().height)))]);
  expect(await heights()).toHaveLength(1);
  await page.locator('#base-body .line-row', { hasText: '薬草' }).first().locator('.name').click();
  await expect(page.locator('.item-detail')).toContainText('投げると');
  await expect(page.locator('#base-depart')).toHaveText('戻る');
  await page.locator('#base-depart').click();
  await expect(page.locator('.item-detail')).toHaveCount(0);
  // 商店も同じ高さ。値段の横に残りの数
  await nav(page, '商店');
  expect(await heights()).toHaveLength(1);
});

test('F-90 冒険はダンジョンを選ぶところから。選ぶと仲間の準備へ進み、「‹」で選び直せる。仲間の画面でも連れていく仲間を切り替えられる', async ({ page }) => {
  await openWithProfile(page, profileWith(3, { hand: [1] }));
  await expect(page.locator('#base-title')).toHaveText('拠点');
  await expect(page.locator('.hub-sign-go')).toHaveCount(0);
  await nav(page, '冒険');
  await expect(page.locator('#base-tabs')).toBeHidden();
  await expect(page.locator('#base-depart')).toBeHidden();
  // 一覧は名前・踏破したか・階の数。押すと詳しい画面が出て、［やめる］で一覧、［準備する］で準備へ
  const forest = page.locator('#base-body .line-row.dungeon', { hasText: 'ささやきの森' });
  await expect(forest).toContainText('全15階');
  await expect(forest).toContainText('踏破済み');
  await forest.click();
  await expect(page.locator('.dungeon-detail')).toContainText('魔物はLv3');
  await page.locator('.dungeon-detail button', { hasText: 'やめる' }).click();
  await expect(page.locator('.dungeon-detail')).toHaveCount(0);
  await forest.click();
  await page.locator('.dungeon-detail button', { hasText: '準備する' }).click();
  await expect(page.locator('#base-tabs')).toBeVisible();
  await expect(page.locator('#base-depart')).toHaveText('ささやきの森へ出発');
  // ほかのタブへ移って戻っても、選んだダンジョンは覚えている
  await nav(page, '商店');
  await nav(page, '冒険');
  await expect(page.locator('#base-depart')).toHaveText('ささやきの森へ出発');
  await page.locator('#base-back').click();
  await expect(page.locator('#base-tabs')).toBeHidden();
  // 仲間の画面の丸い印で、連れていく・残すを切り替える
  await nav(page, '仲間');
  await expect(page.locator('#base-body .allies-count')).toContainText('連れていく 1/5');
  await page.locator('#base-body button.check:not(.on)').first().click();
  await expect(page.locator('#base-body .allies-count')).toContainText('連れていく 2/5');
});
