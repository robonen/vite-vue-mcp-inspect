import { devtools } from '@vue/devtools-kit'
import { createBirpc } from 'birpc'
import { createAppHandlers, createComponentHandlers, createI18nHandlers, createPiniaHandlers, createProvideInjectHandlers, createReactivityHandlers, createRouterHandlers } from './tools/handlers'
import { PLUGIN_NAME } from './constants'
import { RPC_EVENT } from './core/rpc'

devtools.init()

console.log(`[${PLUGIN_NAME}] overlay mounted`)

// ── RPC client over Vite HMR WebSocket ───────────────────────────────────

const hot = import.meta.hot

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
    post: data => hot.send(RPC_EVENT, data),
    on: fn => hot.on(RPC_EVENT, data => fn(data)),
    serialize: v => v,
    deserialize: v => v,
  })

  console.log(`[${PLUGIN_NAME}] RPC connected via Vite HMR`)
}
else {
  console.warn(`[${PLUGIN_NAME}] import.meta.hot not available — RPC disabled`)
}
