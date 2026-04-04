import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types.ts'
import { ok, err, errorMessage, isErrorResult } from '../server-utils.ts'

export function registerPiniaTools({ server, ctx, withTool }: ToolRegistrationDeps): void {
  // ── get-pinia-tree ──────────────────────────────────────────────────────
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

  // ── get-pinia-state ─────────────────────────────────────────────────────
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

  // ── edit-pinia-state ────────────────────────────────────────────────────
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
}
