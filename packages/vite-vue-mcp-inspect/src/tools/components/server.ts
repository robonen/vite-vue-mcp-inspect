import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types.ts'
import { ok, err, errorMessage, isErrorResult } from '../server-utils.ts'

export function registerComponentTools({ server, ctx, withTool }: ToolRegistrationDeps): void {
  // ── get-component-tree ──────────────────────────────────────────────────
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

  // ── get-component-tree-detailed ─────────────────────────────────────────
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

  // ── get-component-state ─────────────────────────────────────────────────
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

  // ── edit-component-state ────────────────────────────────────────────────
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

  // ── highlight-component ─────────────────────────────────────────────────
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

  // ── scroll-to-component ─────────────────────────────────────────────────
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

  // ── get-component-by-file ───────────────────────────────────────────────
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
}
