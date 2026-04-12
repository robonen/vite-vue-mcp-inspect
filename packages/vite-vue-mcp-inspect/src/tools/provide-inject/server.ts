import type { ToolRegistrationDeps } from '../types.ts'
import { definePassthroughTool } from '../server-utils.ts'

export function registerProvideInjectTools(deps: ToolRegistrationDeps): void {
  definePassthroughTool(deps, 'get-provide-inject-tree', {
    description: 'Get a map of all provide/inject relationships in the Vue app. Returns app-level provides (from plugins, app.provide()) and which components in the component tree call provide(), along with the keys and serialised values they expose.',
  }, c => c.getProvideInjectTree())
}
