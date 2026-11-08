// ダンジョンの画面（F-53・F-67・F-70〜F-72）と、描画の速さ（P-08）
import { expect, test } from '@playwright/test';
import { brokenText, collectErrors, openWithProfile, overflow, press, profileWith, startDungeon } from './helpers';

const turn = async (page: import('@playwright/test').Page) => Number((await page.locator('#turn').innerText()).replace('T', ''));

/** 方向のボタンを押して、進めるまで方向を変えて試す */
async function walk(page: import('@playwright/test').Page, times: number): Promise<void> {
  const dirs = ['0', '2', '4', '6', '1', '3', '5', '7'];
  for (let i = 0; i < times; i++) {
    const before = await turn(page);
    for (const d of dirs) {
      const button = page.locator(`#pad [data-dir="${d}"]`);
      if ((await button.count()) === 0) continue;
      // 1回目は振り向くだけ（設定「1回目のタップで振り向く」）なので、2回押す
      for (let k = 0; k < 2; k++) {
        await press(page, `#pad [data-dir="${d}"]`);
        await page.waitForTimeout(120);
      }
      if ((await turn(page)) > before) break;
    }
  }
}

test('F-67・F-70・F-71・F-72 ダンジョンに入り、動く・攻撃する・バッグを開く', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithProfile(page, profileWith(3, { hand: [1, 2, 3] }));
  await startDungeon(page);
  expect(await overflow(page)).toEqual([]);
  const t0 = await turn(page);
  await walk(page, 3);
  expect(await turn(page)).toBeGreaterThan(t0);
  const t1 = await turn(page);
  await press(page, '#btn-attack');
  await expect.poll(() => turn(page)).toBeGreaterThan(t1);
  // バッグ：種類順に並ぶ（パン → 薬草 → 白紙カード）
  // 攻撃の場面を見せているあいだは押せないので、開くまで押し直す
  await expect(async () => {
    await press(page, '#btn-bag');
    await expect(page.locator('#sheet')).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  const rows = await page.locator('#sheet-body .line-row .name').allInnerTexts();
  expect(rows[0]).toMatch(/^パン/);
  expect(rows[1]).toMatch(/^薬草/);
  expect(await brokenText(page)).toEqual([]);
  await page.locator('#sheet-close').click();
  await expect(page.locator('#sheet')).toBeHidden();
  expect(errors).toEqual([]);
});

test('F-53 ダンジョンの途中で読み込み直すと、続きから遊べる', async ({ page }) => {
  await openWithProfile(page, profileWith(1));
  await startDungeon(page);
  await walk(page, 4);
  const before = await turn(page);
  expect(before).toBeGreaterThan(0);
  const floor = await page.locator('#floor').innerText();
  await page.reload();
  await expect(page.locator('#base')).toBeHidden();
  await expect(page.locator('#floor')).toHaveText(floor);
  expect(await turn(page)).toBe(before);
});

test('P-08 ダンジョンの描画で、止まるフレーム（50ms 以上）が5％未満', async ({ page }) => {
  await openWithProfile(page, profileWith(3, { hand: [1, 2, 3] }));
  await startDungeon(page, 2);
  // 2秒ほど、フレームの間隔を測る
  const result = await page.evaluate(async () => {
    const frames: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        frames.push(now - last);
        last = now;
        if (frames.length < 120) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    frames.shift();
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    return { avg, worst: Math.max(...frames), janky: frames.filter((f) => f >= 50).length / frames.length };
  });
  console.log(
    `[性能] フレームの間隔 平均 ${result.avg.toFixed(1)}ms、いちばん長い ${result.worst.toFixed(1)}ms、止まったフレーム ${(result.janky * 100).toFixed(1)}％`,
  );
  // テストのブラウザは画面に出さないので、間隔そのものは機械によって変わる。止まったフレームの割合で見る
  expect(result.janky).toBeLessThan(0.05);
});

test('F-75 メニューの「演出の速さ」は ふつう・速い・最小 を横に並べて選べ、保存される', async ({ page }) => {
  await openWithProfile(page, profileWith(1));
  await startDungeon(page);
  await expect(async () => {
    await press(page, '#btn-menu');
    await expect(page.locator('#sheet')).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  const option = (label: string) => page.locator('#sheet-body .setting-row', { hasText: '演出の速さ' }).locator('button', { hasText: label });
  await expect(option('ふつう')).toHaveAttribute('aria-pressed', 'true');
  for (const next of ['最小', 'ふつう', '速い']) {
    await option(next).click();
    await expect(option(next)).toHaveAttribute('aria-pressed', 'true');
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('summoner-settings') ?? '{}').effectSpeed);
  expect(saved).toBe('fast');
});

test('F-79 ［見通し］を押すとオンになり、もう一度押すとオフになる。ターンは進まない', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithProfile(page, profileWith(1));
  await startDungeon(page);
  const look = page.locator('#btn-look');
  await expect(look).toBeVisible();
  const box = await look.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(32);
  const t0 = await turn(page);
  await press(page, '#btn-look');
  await expect(look).toHaveClass(/on/);
  await expect(look).toHaveAttribute('aria-pressed', 'true');
  await press(page, '#btn-look');
  await expect(look).not.toHaveClass(/on/);
  expect(await turn(page)).toBe(t0);
  expect(errors).toEqual([]);
});

test('F-83 メニューの「正面のマスの枠」のスイッチを押すと オン → オフ に変わり、保存される', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithProfile(page, profileWith(1));
  await startDungeon(page);
  await expect(async () => {
    await press(page, '#btn-menu');
    await expect(page.locator('#sheet')).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  const button = () => page.locator('#sheet-body .setting-row', { hasText: '正面のマスの枠' }).locator('button.switch');
  await expect(button()).toHaveAttribute('aria-checked', 'true');
  await button().click();
  await expect(button()).toHaveAttribute('aria-checked', 'false');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('summoner-settings') ?? '{}').facingTile);
  expect(saved).toBe(false);
  expect(errors).toEqual([]);
});
