import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { BrowserRpcFunctions } from '../core/types.ts'

export type BrowserClient = { [K in keyof BrowserRpcFunctions]: (...args: Parameters<BrowserRpcFunctions[K]>) => Promise<Awaited<ReturnType<BrowserRpcFunctions[K]>>> }

export type WithToolFn = <T>(
  toolName: string,
  call: (client: BrowserClient) => Promise<T>,
  timeout?: number,
) => Promise<T>

export interface ToolRegistrationDeps {
  server: McpServer
  withTool: WithToolFn
  browserTimeout: number
}
