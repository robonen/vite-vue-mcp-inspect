import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Hookable } from 'hookable'
import type { VueMcpContext, VueMcpOptions } from './types.ts'
import type { ToolRegistrationDeps, WithToolFn } from '../tools/types.ts'
import { registerAppTools, registerComponentTools, registerPiniaTools, registerReactivityTools, registerRouterTools } from '../tools/register.ts'

function withBrowserTimeout<T>(
  hooks: Hookable<Record<string, any>>,
  eventName: string,
  trigger: () => void,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error(
          `Tool "${toolName}" timed out after ${timeoutMs}ms.\n`
          + `Make sure the Vue app is open in a browser tab and @vue/devtools is loaded.`,
        ))
      }
    }, timeoutMs)

    hooks.hookOnce(eventName, (data: T) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(data)
      }
    })

    try {
      trigger()
    }
    catch (err) {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    }
  })
}

export function createMcpServer(
  options: VueMcpOptions,
  ctx: VueMcpContext,
  browserTimeout: number,
): McpServer {
  const server = new McpServer({
    name: 'vue-mcp',
    version: '1.0.0',
    ...options.mcpServerInfo,
  })

  let eventId = 0

  /** Wrap a browser-dependent tool: generates event ID, fires RPC, races timeout. */
  const withTool: WithToolFn = <T>(
    toolName: string,
    trigger: (event: string) => void,
    timeout?: number,
  ): Promise<T> => {
    const event = String(++eventId)
    return withBrowserTimeout<T>(
      ctx.hooks,
      event,
      () => trigger(event),
      timeout ?? browserTimeout,
      toolName,
    )
  }

  const deps: ToolRegistrationDeps = { server, ctx, withTool, browserTimeout }

  registerComponentTools(deps)
  registerPiniaTools(deps)
  registerRouterTools(deps)
  registerAppTools(deps)
  registerReactivityTools(deps)

  return server
}
