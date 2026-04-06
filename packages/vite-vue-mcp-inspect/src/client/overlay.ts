import { devtools } from '@vue/devtools-kit'
import { createBirpc } from 'birpc'
import { createComponentHandlers, createPiniaHandlers, createRouterHandlers, createAppHandlers, createReactivityHandlers } from '../tools/handlers.ts'

devtools.init()

console.log('[vite-vue-mcp-inspect] overlay mounted')

// ── RPC client over Vite HMR WebSocket ───────────────────────────────────

const hot = (import.meta as any).hot

if (hot) {
  const handlers = {
    ...createComponentHandlers(),
    ...createPiniaHandlers(),
    ...createRouterHandlers(),
    ...createAppHandlers(),
    ...createReactivityHandlers(),
  }

  createBirpc(handlers, {
    post: (data: any) => hot.send('vite-vue-mcp-inspect:rpc', data),
    on: (fn: any) => hot.on('vite-vue-mcp-inspect:rpc', (data: any) => fn(data)),
    serialize: (v: any) => v,
    deserialize: (v: any) => v,
  })

  console.log('[vite-vue-mcp-inspect] RPC connected via Vite HMR')
}
else {
  console.warn('[vite-vue-mcp-inspect] import.meta.hot not available — RPC disabled')
}
