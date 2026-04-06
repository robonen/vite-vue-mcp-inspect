import type { ToolRegistrationDeps } from '../types.ts'
import { definePassthroughTool, ok, err, errorMessage } from '../server-utils.ts'

export function registerAppTools(deps: ToolRegistrationDeps): void {
  definePassthroughTool(deps, 'get-app-info', {
    description: 'Get general information about the Vue application: version, registered plugins, router state, devtools status.',
  }, c => c.getAppInfo())

  // reload-app has special timeout=success logic, kept as custom registration
  deps.server.registerTool(
    'reload-app',
    {
      description: 'Trigger a full page reload of the Vue application in the browser.',
    },
    async () => {
      try {
        await deps.withTool('reload-app', c => c.reloadApp(), Math.min(deps.browserTimeout, 3000))
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
