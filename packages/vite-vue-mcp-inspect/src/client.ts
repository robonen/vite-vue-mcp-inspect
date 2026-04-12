import { devtools } from '@vue/devtools-kit'
import { createBirpc } from 'birpc'
import { createComponentHandlers, createPiniaHandlers, createRouterHandlers, createAppHandlers, createReactivityHandlers, createProvideInjectHandlers, createI18nHandlers } from './tools/handlers'
import { PLUGIN_NAME } from './constants'
import { RPC_EVENT } from './core/rpc'

devtools.init()

console.log(`[${PLUGIN_NAME}] overlay mounted`)

// ── RPC client over Vite HMR WebSocket ───────────────────────────────────

const hot = (import.meta as any).hot

if (hot) {
  hot.send(`${PLUGIN_NAME}:connect`)

  const handlers = {
    ...createComponentHandlers(),
    ...createPiniaHandlers(),
    ...createRouterHandlers(),
    ...createAppHandlers(),
    ...createReactivityHandlers(),
    ...createProvideInjectHandlers(),
    ...createI18nHandlers(),
  }

  createBirpc(handlers, {
    post: (data: any) => hot.send(RPC_EVENT, data),
    on: (fn: any) => hot.on(RPC_EVENT, (data: any) => fn(data)),
    serialize: (v: any) => v,
    deserialize: (v: any) => v,
  })

  console.log(`[${PLUGIN_NAME}] RPC connected via Vite HMR`)
}
else {
  console.warn(`[${PLUGIN_NAME}] import.meta.hot not available — RPC disabled`)
}
