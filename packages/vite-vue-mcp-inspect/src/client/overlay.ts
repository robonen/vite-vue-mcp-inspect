import { devtools } from '@vue/devtools-kit'
import { createRPCClient } from 'vite-dev-rpc'
import { createHotContext } from 'vite-hot-client'
import { createAppHandlers, createComponentHandlers, createPiniaHandlers, createReactivityHandlers, createRouterHandlers } from '../tools/handlers.ts'

const base = (import.meta as any).env?.BASE_URL ?? '/'
const hot = createHotContext('', base)

devtools.init()

console.log('[vue-mcp] overlay mounted')

// ── RPC client ───────────────────────────────────────────────────────────

const getRpc = () => _rpc

const _rpc = createRPCClient<any, any>(
  'vite-vue-mcp-inspect',
  hot,
  {
    ...createComponentHandlers(getRpc),
    ...createPiniaHandlers(getRpc),
    ...createRouterHandlers(getRpc),
    ...createAppHandlers(getRpc),
    ...createReactivityHandlers(getRpc),
  },
  { timeout: -1 },
)
