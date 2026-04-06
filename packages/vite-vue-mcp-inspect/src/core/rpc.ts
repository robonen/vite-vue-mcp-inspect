import { createBirpc } from 'birpc'
import type { BrowserRpcFunctions, VueMcpContext } from './types.ts'

export function createVueMcpContext(): VueMcpContext {
  return {
    rpc: null,
  }
}

const RPC_EVENT = 'vite-vue-mcp-inspect:rpc'

/**
 * Create a birpc instance that communicates over Vite's built-in HMR
 * WebSocket (`server.hot` / `import.meta.hot`) using a custom event.
 * No separate WS port is needed.
 */
export function createHotRpc(hot: {
  send: (event: string, data?: any) => void
  on: (event: string, handler: (data: any, ...extra: any[]) => void) => void
}) {
  return createBirpc<BrowserRpcFunctions, Record<string, never>>({}, {
    post: data => hot.send(RPC_EVENT, data),
    on: fn => hot.on(RPC_EVENT, data => fn(data)),
    // Vite's HMR channel already handles JSON serialisation, so we
    // pass objects through as-is to avoid double-encoding.
    serialize: v => v,
    deserialize: v => v,
  })
}
