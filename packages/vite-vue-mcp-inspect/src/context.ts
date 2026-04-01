import { createHooks } from 'hookable'
import type { VueMcpContext } from './types.js'

export function createVueMcpContext(): VueMcpContext {
  return {
    hooks: createHooks(),
    rpcServer: null,
  }
}
