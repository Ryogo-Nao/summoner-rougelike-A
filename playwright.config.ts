import { defineConfig, devices } from '@playwright/test';

// 画面のテスト（tests/e2e）。ビルドしたものを手元のサーバーで開く。docs/test-plan.md
const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    // iPhone と同じ大きさ・同じ仕組み（WebKit＝Safari）
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    // Service Worker（通信なしで開ける）は Chrome で確かめる
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
  ],
});
