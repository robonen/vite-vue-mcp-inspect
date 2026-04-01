import { defineConfig } from 'oxlint'
import { compose, base, typescript, node, imports, vue, vitest } from '@robonen/oxlint'

export default defineConfig(compose(base, typescript, node, imports, vue, vitest, {
  rules: {
    // Plugin is a dev-tool that intentionally writes to the terminal
    'eslint/no-console': 'off',
  },
}))
