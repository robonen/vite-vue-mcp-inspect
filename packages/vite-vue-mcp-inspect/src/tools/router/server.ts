import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types.ts'
import { ok, err, errorMessage } from '../server-utils.ts'

export function registerRouterTools({ server, ctx, withTool }: ToolRegistrationDeps): void {
  // ── get-router-info ─────────────────────────────────────────────────────
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

  // ── navigate-to-route ───────────────────────────────────────────────────
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
}
