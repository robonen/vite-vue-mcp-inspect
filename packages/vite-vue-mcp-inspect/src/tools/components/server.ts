import { z } from 'zod'
import type { ToolRegistrationDeps } from '../types'
import { definePassthroughTool, defineErrorCheckTool, defineSuccessCheckTool } from '../server-utils'

export function registerComponentTools(deps: ToolRegistrationDeps): void {
  definePassthroughTool(deps, 'get-component-tree', {
    description: 'Get the Vue component tree in a hierarchical JSON structure.',
  }, c => c.getInspectorTree())

  definePassthroughTool(deps, 'get-component-tree-detailed', {
    description: 'Get all Vue components with their names, source file paths, and current state. '
      + 'More comprehensive than get-component-tree but slower.',
  }, c => c.getDetailedComponentTree())

  defineErrorCheckTool(deps, 'get-component-state', {
    description: 'Get the props, data, computed properties and other state of a specific Vue component.',
    inputSchema: {
      componentName: z.string().describe('The name of the Vue component, e.g. "Counter" or "App"'),
    },
  }, (c, { componentName }) => c.getInspectorState({ componentName }))

  defineSuccessCheckTool(deps, 'edit-component-state', {
    description: 'Edit the state (props/data/computed) of a specific Vue component.',
    inputSchema: {
      componentName: z.string().describe('The name of the Vue component'),
      path: z.array(z.string()).describe('Property path, e.g. ["count"] or ["user", "name"]'),
      value: z.string().describe('New value as a JSON-serialisable string'),
      valueType: z.enum(['string', 'number', 'boolean', 'object', 'array'])
        .describe('The data type of the new value'),
    },
  }, (c, args) => c.editComponentState(args), ({ componentName, path, value }) => ({ success: true, componentName, path, value }))

  defineSuccessCheckTool(deps, 'highlight-component', {
    description: 'Visually highlight a Vue component in the browser for 5 seconds.',
    inputSchema: {
      componentName: z.string().describe('The name of the Vue component to highlight'),
    },
  }, (c, { componentName }) => c.highlightComponent({ componentName }), ({ componentName }) => ({ success: true, componentName }))

  defineSuccessCheckTool(deps, 'scroll-to-component', {
    description: 'Scroll the browser viewport to a Vue component and highlight it.',
    inputSchema: {
      componentName: z.string().describe('The name of the Vue component to scroll to'),
    },
  }, (c, { componentName }) => c.scrollToComponent({ componentName }), ({ componentName }) => ({ success: true, componentName }))

  defineErrorCheckTool(deps, 'get-component-by-file', {
    description: 'Find a Vue component by its source file path and return its name and current state.',
    inputSchema: {
      filePath: z.string().describe(
        'Partial or full path to the component source file, '
        + 'e.g. "Counter.vue" or "components/Counter.vue"',
      ),
    },
  }, (c, { filePath }) => c.getComponentByFile({ filePath }))
}
