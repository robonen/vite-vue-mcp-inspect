import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { VueMcpContext, VueMcpOptions } from './types.js'
import { withBrowserTimeout } from './utils/timeout.js'

interface ToolResult {
  [key: string]: unknown
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function err(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function isErrorResult(r: unknown): r is { error: string } {
  return r !== null && r !== undefined && typeof r === 'object' && 'error' in r
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
  function withTool<T>(
    toolName: string,
    trigger: (event: string) => void,
  ): Promise<T> {
    const event = String(++eventId)
    return withBrowserTimeout<T>(
      ctx.hooks,
      event,
      () => trigger(event),
      browserTimeout,
      toolName,
    )
  }

  // ── 1. get-component-tree ────────────────────────────────────────────────
  server.registerTool(
    'get-component-tree',
    {
      description: 'Get the Vue component tree in a hierarchical JSON structure.',
    },
    async () => {
      try {
        return ok(await withTool('get-component-tree', e => ctx.rpcServer!.getInspectorTree({ event: e })))
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 2. get-component-tree-detailed ──────────────────────────────────────
  server.registerTool(
    'get-component-tree-detailed',
    {
      description: 'Get all Vue components with their names, source file paths, and current state. '
        + 'More comprehensive than get-component-tree but slower.',
    },
    async () => {
      try {
        return ok(await withTool('get-component-tree-detailed', e => ctx.rpcServer!.getDetailedComponentTree({ event: e })))
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 3. get-component-state ───────────────────────────────────────────────
  server.registerTool(
    'get-component-state',
    {
      description: 'Get the props, data, computed properties and other state of a specific Vue component.',
      inputSchema: {
        componentName: z.string().describe('The name of the Vue component, e.g. "Counter" or "App"'),
      },
    },
    async ({ componentName }) => {
      try {
        const result = await withTool('get-component-state', e => ctx.rpcServer!.getInspectorState({ event: e, componentName }))
        if (isErrorResult(result)) return err(result.error)
        return ok(result)
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 4. edit-component-state ──────────────────────────────────────────────
  server.registerTool(
    'edit-component-state',
    {
      description: 'Edit the state (props/data/computed) of a specific Vue component.',
      inputSchema: {
        componentName: z.string().describe('The name of the Vue component'),
        path: z.array(z.string()).describe('Property path, e.g. ["count"] or ["user", "name"]'),
        value: z.string().describe('New value as a JSON-serialisable string'),
        valueType: z.enum(['string', 'number', 'boolean', 'object', 'array'])
          .describe('The data type of the new value'),
      },
    },
    async ({ componentName, path, value, valueType }) => {
      try {
        const result = await withTool<{ success: boolean; error?: string }>('edit-component-state', e => ctx.rpcServer!.editComponentState({ componentName, path, value, valueType, event: e }))
        if (!result.success) return err(result.error ?? 'Unknown error')
        return ok({ success: true, componentName, path, value })
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 5. highlight-component ───────────────────────────────────────────────
  server.registerTool(
    'highlight-component',
    {
      description: 'Visually highlight a Vue component in the browser for 5 seconds.',
      inputSchema: {
        componentName: z.string().describe('The name of the Vue component to highlight'),
      },
    },
    async ({ componentName }) => {
      try {
        const result = await withTool<{ success: boolean; error?: string }>('highlight-component', e => ctx.rpcServer!.highlightComponent({ componentName, event: e }))
        if (!result.success) return err(result.error ?? 'Unknown error')
        return ok({ success: true, componentName })
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 6. scroll-to-component ───────────────────────────────────────────────
  server.registerTool(
    'scroll-to-component',
    {
      description: 'Scroll the browser viewport to a Vue component and highlight it.',
      inputSchema: {
        componentName: z.string().describe('The name of the Vue component to scroll to'),
      },
    },
    async ({ componentName }) => {
      try {
        const result = await withTool<{ success: boolean; error?: string }>('scroll-to-component', e => ctx.rpcServer!.scrollToComponent({ componentName, event: e }))
        if (!result.success) return err(result.error ?? 'Unknown error')
        return ok({ success: true, componentName })
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 7. get-router-info ───────────────────────────────────────────────────
  server.registerTool(
    'get-router-info',
    {
      description: 'Get Vue Router information: current route, all defined routes, navigation history.',
    },
    async () => {
      try {
        return ok(await withTool('get-router-info', e => ctx.rpcServer!.getRouterInfo({ event: e })))
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 8. navigate-to-route ─────────────────────────────────────────────────
  server.registerTool(
    'navigate-to-route',
    {
      description: 'Programmatically navigate to a Vue Router route in the browser.',
      inputSchema: {
        path: z.string().describe('Route path to navigate to, e.g. "/about" or "/users/42"'),
      },
    },
    async ({ path }) => {
      try {
        const result = await withTool<{ success: boolean; error?: string }>('navigate-to-route', e => ctx.rpcServer!.navigateToRoute({ path, event: e }))
        if (!result.success) return err(result.error ?? 'Unknown error')
        return ok({ success: true, navigatedTo: path })
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 9. get-pinia-tree ────────────────────────────────────────────────────
  server.registerTool(
    'get-pinia-tree',
    {
      description: 'Get the list of all Pinia stores registered in the application.',
    },
    async () => {
      try {
        return ok(await withTool('get-pinia-tree', e => ctx.rpcServer!.getPiniaTree({ event: e })))
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 10. get-pinia-state ──────────────────────────────────────────────────
  server.registerTool(
    'get-pinia-state',
    {
      description: 'Get the current state of a specific Pinia store.',
      inputSchema: {
        storeName: z.string().describe('The Pinia store ID, e.g. "counter" or "user"'),
      },
    },
    async ({ storeName }) => {
      try {
        const result = await withTool('get-pinia-state', e => ctx.rpcServer!.getPiniaState({ event: e, storeName }))
        if (isErrorResult(result)) return err(result.error)
        return ok(result)
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 11. edit-pinia-state ─────────────────────────────────────────────────
  server.registerTool(
    'edit-pinia-state',
    {
      description: 'Edit a property in a Pinia store.',
      inputSchema: {
        storeName: z.string().describe('The Pinia store ID, e.g. "counter"'),
        path: z.array(z.string()).describe('Property path, e.g. ["count"] or ["user", "name"]'),
        value: z.string().describe('New value as a JSON-serialisable string'),
        valueType: z.enum(['string', 'number', 'boolean', 'object', 'array'])
          .describe('The data type of the new value'),
      },
    },
    async ({ storeName, path, value, valueType }) => {
      try {
        const result = await withTool<{ success: boolean; error?: string }>('edit-pinia-state', e => ctx.rpcServer!.editPiniaState({ storeName, path, value, valueType, event: e }))
        if (!result.success) return err(result.error ?? 'Unknown error')
        return ok({ success: true, storeName, path, value })
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 12. get-app-info ─────────────────────────────────────────────────────
  server.registerTool(
    'get-app-info',
    {
      description: 'Get general information about the Vue application: version, registered plugins, router state, devtools status.',
    },
    async () => {
      try {
        return ok(await withTool('get-app-info', e => ctx.rpcServer!.getAppInfo({ event: e })))
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  // ── 13. reload-app ───────────────────────────────────────────────────────
  server.registerTool(
    'reload-app',
    {
      description: 'Trigger a full page reload of the Vue application in the browser.',
    },
    async () => {
      try {
        const event = String(++eventId)
        const reloadTimeout = Math.min(browserTimeout, 3000)
        await withBrowserTimeout(
          ctx.hooks,
          event,
          () => ctx.rpcServer!.reloadApp({ event }),
          reloadTimeout,
          'reload-app',
        )
        return ok({ success: true, message: 'App reload triggered' })
      }
      catch (e) {
        const msg = errorMessage(e)
        if (msg.includes('timed out')) {
          return ok({ success: true, message: 'App reload triggered (page reloaded before ack)' })
        }
        return err(msg)
      }
    },
  )

  // ── 14. get-component-by-file ────────────────────────────────────────────
  server.registerTool(
    'get-component-by-file',
    {
      description: 'Find a Vue component by its source file path and return its name and current state.',
      inputSchema: {
        filePath: z.string().describe(
          'Partial or full path to the component source file, '
          + 'e.g. "Counter.vue" or "components/Counter.vue"',
        ),
      },
    },
    async ({ filePath }) => {
      try {
        const result = await withTool('get-component-by-file', e => ctx.rpcServer!.getComponentByFile({ filePath, event: e }))
        if (isErrorResult(result)) return err(result.error)
        return ok(result)
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )

  return server
}
