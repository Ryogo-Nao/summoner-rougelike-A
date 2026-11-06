import { defineConfig } from 'vitest/config';

// ゲームの決まりのテスト（tests/unit）と、性能のテスト（tests/perf）。docs/test-plan.md
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/perf/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 60_000,
  },
});
