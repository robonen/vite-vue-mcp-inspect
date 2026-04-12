import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types'
import { definePassthroughTool, defineSuccessCheckTool } from '../server-utils'

export function registerRouterTools(deps: ToolRegistrationDeps): void {
  definePassthroughTool(deps, 'get-router-info', {
    description: 'Get Vue Router information: current route, all defined routes, navigation history.',
  }, c => c.getRouterInfo())

  defineSuccessCheckTool(deps, 'navigate-to-route', {
    description: 'Programmatically navigate to a Vue Router route in the browser.',
    inputSchema: {
      path: z.string().describe('Route path to navigate to, e.g. "/about" or "/users/42"'),
    },
  }, (c, { path }) => c.navigateToRoute({ path }), ({ path }) => ({ success: true, navigatedTo: path }))
}
