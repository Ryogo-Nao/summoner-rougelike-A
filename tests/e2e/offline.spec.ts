// N-03 一度開いたあとは、通信なしでも開ける（Service Worker）。Chrome だけで確かめる
import { expect, test } from '@playwright/test';

test('N-03 通信なしでも開ける', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service Worker は Chrome で確かめる');
  await page.goto('/');
  await expect(page.locator('#base')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // 2回目の読み込みから Service Worker が受け持つ
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#base')).toBeVisible();
  await expect(page.locator('#base-title')).toContainText('召喚士');
  await context.setOffline(false);
});
