import type { ToolRegistrationDeps } from '../types.ts'
import { ok, err, errorMessage } from '../server-utils.ts'

export function registerAppTools({ server, ctx, withTool, browserTimeout }: ToolRegistrationDeps): void {
  // ── get-app-info ────────────────────────────────────────────────────────
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

  // ── reload-app ──────────────────────────────────────────────────────────
  server.registerTool(
    'reload-app',
    {
      description: 'Trigger a full page reload of the Vue application in the browser.',
    },
    async () => {
      try {
        await withTool('reload-app', e => ctx.rpcServer!.reloadApp({ event: e }), Math.min(browserTimeout, 3000))
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
}
