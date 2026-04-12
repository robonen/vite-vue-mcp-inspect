import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/vite.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    hash: false,
    platform: 'node',
    deps: {
      onlyBundle: false,
      alwaysBundle: ['@robonen/stdlib'],
      neverBundle: ['vite'],
    },
  },
  {
    entry: { client: 'src/client.ts' },
    format: ['esm'],
    dts: false,
    clean: false,
    hash: false,
    minify: true,
    platform: 'browser',
  },
])
