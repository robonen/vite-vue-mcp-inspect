import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/__tests__/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/__tests__/browser/**/*.test.ts'],
          environment: 'node',
          globalSetup: ['src/__tests__/browser/setup.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
