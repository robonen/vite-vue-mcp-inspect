import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/tools/**/server.test.ts', 'src/__tests__/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/tools/**/browser.test.ts', 'src/__tests__/browser/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['src/__tests__/browser/setup.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
