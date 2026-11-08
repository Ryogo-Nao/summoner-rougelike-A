// 拠点の画面（F-60）と、見た目の決まり（N-01・N-02・N-08・N-10）、起動の速さ（P-07）
import { expect, test } from '@playwright/test';
import { brokenText, collectErrors, nav, openPrep, openWithProfile, overflow, profileWith } from './helpers';

const TABS: [string, string][] = [
  ['冒険', '冒険の準備'],
  ['仲間', '仲間'],
  ['配合', '配合'],
  ['商店', '商店'],
  ['その他', 'その他'],
  ['拠点', '拠点'],
];

test('P-07 ページを開いてから拠点が出るまで3秒以内', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await expect(page.locator('#base')).toBeVisible();
  await expect(page.locator('#base-title')).toContainText('拠点');
  const ms = Date.now() - start;
  console.log(`[性能] 拠点が出るまで ${ms}ms`);
  expect(ms).toBeLessThan(3000);
});

test('F-60・N-02・N-10 下のタブで画面を移れて、エラーや壊れた文字が出ない', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithProfile(page, profileWith(12));
  for (const [label, title] of TABS) {
    await nav(page, label);
    await expect(page.locator('#base-title')).toContainText(title);
    expect(await brokenText(page), label).toEqual([]);
  }
  // 冒険の準備の持ち物、商店の売る、その他の設定も開く
  await openPrep(page);
  await page.locator('#base-tabs button', { hasText: '持ち物' }).click();
  await nav(page, '商店');
  await page.locator('#base-body button', { hasText: '売る' }).click();
  await nav(page, 'その他');
  await page.locator('#base-body button', { hasText: '設定' }).click();
  expect(await brokenText(page)).toEqual([]);
  expect(errors).toEqual([]);
});

for (const width of [375, 390, 430]) {
  test(`N-01 幅 ${width}px で、どの画面も横にはみ出さない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openWithProfile(page, profileWith(12));
    for (const [label] of TABS) {
      await nav(page, label);
      expect(await overflow(page), `${label}（${width}px）`).toEqual([]);
    }
    await openPrep(page);
    await page.locator('#base-tabs button', { hasText: '持ち物' }).click();
    expect(await overflow(page), `持ち物（${width}px）`).toEqual([]);
  });
}

test('N-08 下のタブと主なボタンは 32px 以上', async ({ page }) => {
  await openWithProfile(page, profileWith(3));
  const sizes = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#base-nav button, #base-depart, #base-body button')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent?.trim() ?? b.className, w: Math.round(r.width), h: Math.round(r.height) };
      }),
  );
  const small = sizes.filter((s) => s.w < 32 || s.h < 32);
  expect(small).toEqual([]);
});
