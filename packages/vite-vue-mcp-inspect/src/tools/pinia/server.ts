import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types'
import { definePassthroughTool, defineErrorCheckTool, defineSuccessCheckTool } from '../server-utils'

export function registerPiniaTools(deps: ToolRegistrationDeps): void {
  definePassthroughTool(deps, 'get-pinia-tree', {
    description: 'Get the list of all Pinia stores registered in the application.',
  }, c => c.getPiniaTree())

  defineErrorCheckTool(deps, 'get-pinia-state', {
    description: 'Get the current state of a specific Pinia store.',
    inputSchema: {
      storeName: z.string().describe('The Pinia store ID, e.g. "counter" or "user"'),
    },
  }, (c, { storeName }) => c.getPiniaState({ storeName }))

  defineSuccessCheckTool(deps, 'edit-pinia-state', {
    description: 'Edit a property in a Pinia store.',
    inputSchema: {
      storeName: z.string().describe('The Pinia store ID, e.g. "counter"'),
      path: z.array(z.string()).describe('Property path, e.g. ["count"] or ["user", "name"]'),
      value: z.string().describe('New value as a JSON-serialisable string'),
      valueType: z.enum(['string', 'number', 'boolean', 'object', 'array'])
        .describe('The data type of the new value'),
    },
  }, (c, args) => c.editPiniaState(args), ({ storeName, path, value }) => ({ success: true, storeName, path, value }))
}
