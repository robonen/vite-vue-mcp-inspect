import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types.ts'
import { ok, err, errorMessage, isErrorResult } from '../server-utils.ts'

export function registerReactivityTools({ server, ctx, withTool }: ToolRegistrationDeps): void {
  // ── get-reactivity-relationships ────────────────────────────────────────
  server.registerTool(
    'get-reactivity-relationships',
    {
      description: 'Get the reactivity dependency graph of a Vue component: which refs/reactive objects feed into which computed properties, watchers, and render effects.',
      inputSchema: {
        componentName: z.string().describe('The name of the Vue component, e.g. "Counter" or "App"'),
      },
    },
    async ({ componentName }) => {
      try {
        const result = await withTool('get-reactivity-relationships', e => ctx.rpcServer!.getReactivityRelationships({ event: e, componentName }))
        if (isErrorResult(result)) return err(result.error)
        return ok(result)
      }
      catch (e) {
        return err(errorMessage(e))
      }
    },
  )
}
