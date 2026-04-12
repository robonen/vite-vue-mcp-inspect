import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { VueMcpContext, VueMcpOptions } from './types'
import type { BrowserClient, ToolRegistrationDeps, WithToolFn } from '../tools/types'
import { registerAppTools, registerComponentTools, registerI18nTools, registerPiniaTools, registerProvideInjectTools, registerReactivityTools, registerRouterTools } from '../tools/register'
import { PLUGIN_NAME } from '../constants'

function getBrowserClient(ctx: VueMcpContext): BrowserClient {
  if (!ctx.rpc) {
    throw new Error(
      'No browser connected. Make sure the Vue app is open in a browser tab.',
    )
  }
  // birpc already provides a Proxy that maps property access to remote
  // calls, so we can cast directly — no wrapper needed.
  return ctx.rpc as unknown as BrowserClient
}

export function createMcpServer(
  options: VueMcpOptions,
  ctx: VueMcpContext,
  browserTimeout: number,
): McpServer {
  const server = new McpServer({
    name: PLUGIN_NAME,
    version: '1.0.0',
    ...options.mcpServerInfo,
  })

  const withTool: WithToolFn = <T>(
    toolName: string,
    call: (client: BrowserClient) => Promise<T>,
    timeout?: number,
  ): Promise<T> => {
    const client = getBrowserClient(ctx)
    const ms = timeout ?? browserTimeout
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(
          `Tool "${toolName}" timed out after ${ms}ms.\n`
          + `Make sure the Vue app is open in a browser tab and @vue/devtools is loaded.`,
        )),
        ms,
      )
      call(client).then(
        (v) => { clearTimeout(timer); resolve(v) },
        (e) => { clearTimeout(timer); reject(e) },
      )
    })
  }

  const deps: ToolRegistrationDeps = { server, withTool, browserTimeout }

  registerComponentTools(deps)
  registerPiniaTools(deps)
  registerRouterTools(deps)
  registerAppTools(deps)
  registerReactivityTools(deps)
  registerProvideInjectTools(deps)
  registerI18nTools(deps)

  return server
}
