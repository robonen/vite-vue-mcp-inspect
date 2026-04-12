import type { VueMcpOptions } from './core/types'
import { createVueMcpPlugin } from './plugin'

export type { VueMcpOptions, VueMcpContext, IdeMcpConfig, ClaudeDesktopConfig } from './core/types'

export default function VueMcp(options: VueMcpOptions = {}) {
  return createVueMcpPlugin(options)
}
