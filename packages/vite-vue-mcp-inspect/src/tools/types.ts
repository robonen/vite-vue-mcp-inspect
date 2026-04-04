import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { VueMcpContext } from '../core/types.ts'

export type WithToolFn = <T>(
  toolName: string,
  trigger: (event: string) => void,
  timeout?: number,
) => Promise<T>

export interface ToolRegistrationDeps {
  server: McpServer
  ctx: VueMcpContext
  withTool: WithToolFn
  browserTimeout: number
}
