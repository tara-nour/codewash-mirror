import { defineConfig } from 'vitest/config'

// Test configuration is kept separate from vite.config.js so that the build
// and the test run can evolve independently.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Only source code is measured. Config files and the Electron shell are
      // excluded so the percentage reflects the code under test.
      include: ['src/**/*.{js,jsx}'],
      // Thresholds are pinned to what the suite already reaches, so coverage
      // can only go up. Raise them with every batch of tests.
      // Lowering one is debt: record it in docs/DEBT.md with the reason.
      thresholds: {
        lines: 5,
        functions: 4.7,
        branches: 1.5,
        statements: 4.7,
      },
    },
  },
})
