// 拠点の一覧（F-61〜F-66）と、文字を打つ欄の大きさ（N-07）
import { expect, test } from '@playwright/test';
import { collectErrors, nav, openWithProfile, profileWith } from './helpers';

const names = (page: import('@playwright/test').Page) => page.locator('#base-body .paged-list .sheet-row .name').allInnerTexts();

test('F-61 仲間の一覧は10件ずつのページ', async ({ page }) => {
  await openWithProfile(page, profileWith(24));
  await nav(page, '仲間');
  expect((await names(page)).length).toBe(10);
  await expect(page.locator('.pager-at')).toHaveText(/1 \/ 3/);
  await page.locator('.pager button', { hasText: '次へ' }).click();
  await expect(page.locator('.pager-at')).toHaveText(/2 \/ 3/);
  await page.locator('.pager button', { hasText: '次へ' }).click();
  expect((await names(page)).length).toBe(5);
  await expect(page.locator('.pager button', { hasText: '次へ' })).toBeDisabled();
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
  await expect(page.locator('.paged-list')).toContainText('見つからない');
  // 道具：倉庫で「いん」と打つと印が出る
  await nav(page, '冒険');
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
  await nav(page, '冒険');
  await expect(page.locator('.party-count')).toHaveText('4 / 5');
  await page.locator('.party-faces .face.tap').nth(1).click();
  await expect(page.locator('.party-count')).toHaveText('3 / 5');
  await expect(page.locator('.party-faces .face.empty')).toHaveCount(2);
});

test('F-64 配合の画面で仲間を押すと、つよさが出て、戻れる', async ({ page }) => {
  await openWithProfile(page, profileWith(4));
  await nav(page, '配合');
  await page.locator('#base-body .sheet-row.ally .name').first().click();
  await expect(page.locator('.status-view')).toBeVisible();
  await expect(page.locator('#base-depart')).toHaveText('戻る');
  await page.locator('#base-depart').click();
  await expect(page.locator('.status-view')).toHaveCount(0);
  await expect(page.locator('#base-depart')).toBeHidden();
});

test('F-65・F-66 商店で買える。一覧は種類順', async ({ page }) => {
  await openWithProfile(page, profileWith(1));
  await nav(page, '商店');
  const rows = await page.locator('#base-body .sheet-row .name').allInnerTexts();
  expect(rows.length).toBeGreaterThan(2);
  // 薬草（草）はパン（食べ物）のあと、装備より前
  const herb = rows.findIndex((t) => t.startsWith('薬草'));
  const bread = rows.findIndex((t) => t.startsWith('パン'));
  expect(bread).toBeLessThan(herb);
  const runes = await page.locator('#base-runes').innerText();
  await page.locator('#base-body .sheet-row', { hasText: '薬草' }).locator('button', { hasText: '＋' }).click();
  await page.locator('#base-depart').click();
  await expect(page.locator('#base-runes')).not.toHaveText(runes);
  // 持ち物は種類順
  await nav(page, '冒険');
  await page.locator('#base-tabs button', { hasText: '持ち物' }).click();
  const bag = await page.locator('#base-body .paged-list .sheet-row .name').allInnerTexts();
  expect(bag[0]).toMatch(/^パン/);
});
