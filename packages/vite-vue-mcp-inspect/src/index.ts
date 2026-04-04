import type { VueMcpOptions } from './core/types.ts'
import { createVueMcpPlugin } from './vite/plugin.ts'

export type { VueMcpOptions, VueMcpContext, IdeMcpConfig, ClaudeDesktopConfig } from './core/types.ts'

export default function VueMcp(options: VueMcpOptions = {}) {
  return createVueMcpPlugin(options)
}
