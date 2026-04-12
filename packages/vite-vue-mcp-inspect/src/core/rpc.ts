import { createBirpc } from 'birpc'
import type { BrowserRpcFunctions, VueMcpContext } from './types'
import { PLUGIN_NAME } from '../constants'

export function createVueMcpContext(): VueMcpContext {
  return {
    rpc: null,
  }
}

export const RPC_EVENT = `${PLUGIN_NAME}:rpc`
const CONNECT_EVENT = `${PLUGIN_NAME}:connect`

interface HotClient {
  send(event: string, data?: any): void
}

/**
 * Create a birpc instance that communicates over Vite's built-in HMR
 * WebSocket (`server.hot` / `import.meta.hot`) using a custom event.
 * No separate WS port is needed.
 *
 * Multi-tab safety: each browser tab sends CONNECT_EVENT on overlay mount.
 * The server tracks the last connected tab as `activeClient` and directs
 * all RPC requests only to that tab — eliminating broadcast race conditions
 * and duplicate mutations. If the active tab disconnects, the next request
 * falls back to broadcast and the first responding tab becomes the new active.
 */
export function createHotRpc(hot: {
  send: (event: string, data?: any) => void
  on: (event: string, handler: (data: any, client: HotClient) => void) => void
}) {
  let activeClient: HotClient | null = null

  hot.on(CONNECT_EVENT, (_data, client) => {
    activeClient = client
  })

  hot.on('vite:client:disconnect', (_data, client) => {
    if (activeClient === client) activeClient = null
  })

  return createBirpc<BrowserRpcFunctions, Record<string, never>>({}, {
    post: (data) => {
      if (activeClient) {
        try { activeClient.send(RPC_EVENT, data); return }
        catch { activeClient = null }
      }
      hot.send(RPC_EVENT, data)
    },
    on: fn => hot.on(RPC_EVENT, (data, client) => {
      activeClient = client
      fn(data)
    }),
    // Vite's HMR channel already handles JSON serialisation, so we
    // pass objects through as-is to avoid double-encoding.
    serialize: v => v,
    deserialize: v => v,
  })
}
