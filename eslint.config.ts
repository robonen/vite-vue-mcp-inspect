import { base, compose, imports, node, typescript, vitest, vue } from '@robonen/eslint'

export default compose(base, typescript, node, imports, vue, vitest, {
  rules: {
    // Plugin is a dev-tool that intentionally writes to the terminal
    'no-console': 'off',
  },
})
