import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { VueMcpContext, VueMcpOptions } from './types.ts'
import type { BrowserClient, ToolRegistrationDeps, WithToolFn } from '../tools/types.ts'
import { registerAppTools, registerComponentTools, registerPiniaTools, registerReactivityTools, registerRouterTools } from '../tools/register.ts'

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
    name: 'vite-vue-mcp-inspect',
    version: '1.0.0',
    ...options.mcpServerInfo,
  })

  const withTool: WithToolFn = <T>(
    toolName: string,
    call: (client: BrowserClient) => Promise<T>,
    timeout?: number,
  ): Promise<T> => {
    const client = getBrowserClient(ctx)
    const timeoutMs = timeout ?? browserTimeout
    return Promise.race([
      call(client),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          `Tool "${toolName}" timed out after ${timeoutMs}ms.\n`
          + `Make sure the Vue app is open in a browser tab and @vue/devtools is loaded.`,
        )), timeoutMs),
      ),
    ])
  }

  const deps: ToolRegistrationDeps = { server, withTool, browserTimeout }

  registerComponentTools(deps)
  registerPiniaTools(deps)
  registerRouterTools(deps)
  registerAppTools(deps)
  registerReactivityTools(deps)

  return server
}
