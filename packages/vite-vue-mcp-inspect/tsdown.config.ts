import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    hash: false,
    platform: 'node',
    deps: {
      onlyBundle: false,
      neverBundle: ['vite'],
    },
  },
  {
    entry: { overlay: 'src/client/overlay.ts' },
    format: ['esm'],
    dts: false,
    clean: false,
    hash: false,
    minify: true,
    platform: 'browser',
  },
])
