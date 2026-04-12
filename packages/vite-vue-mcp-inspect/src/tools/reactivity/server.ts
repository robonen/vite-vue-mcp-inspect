import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types'
import { defineErrorCheckTool } from '../server-utils'

export function registerReactivityTools(deps: ToolRegistrationDeps): void {
  defineErrorCheckTool(deps, 'get-reactivity-relationships', {
    description: 'Get the reactivity dependency graph of a Vue component: which refs/reactive objects feed into which computed properties, watchers, and render effects.',
    inputSchema: {
      componentName: z.string().describe('The name of the Vue component, e.g. "Counter" or "App"'),
    },
  }, (c, { componentName }) => c.getReactivityRelationships({ componentName }))
}
