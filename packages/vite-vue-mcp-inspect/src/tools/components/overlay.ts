import { devtools } from '@vue/devtools-kit'
import {
  COMPONENTS_INSPECTOR_ID,
  DEVTOOLS_TIMEOUT,
  fetchComponentTree,
  flattenChildren,
  mapConcurrent,
  setHighlight,
  stringify,
  withComponentNode,
  withTimeout,
} from '../overlay-utils.ts'

export function createComponentHandlers() {
  return {
    // ── Component tree ──────────────────────────────────────────────────
    async getInspectorTree() {
      return fetchComponentTree()
    },

    async getDetailedComponentTree() {
      const root = await fetchComponentTree()
      const all = flattenChildren(root)
      return mapConcurrent(all, 10, async (node: any) => {
        try {
          const state = await withTimeout(
            devtools.api.getInspectorState({
              inspectorId: COMPONENTS_INSPECTOR_ID,
              nodeId: node.id,
            }),
            DEVTOOLS_TIMEOUT,
            'getInspectorState',
          )
          return { name: node.name, id: node.id, file: node.file, state: JSON.parse(stringify(state) as string) }
        }
        catch {
          return { name: node.name, id: node.id, file: node.file }
        }
      })
    },

    // ── Component state ─────────────────────────────────────────────────
    async getInspectorState(query: { componentName: string }) {
      return withComponentNode(
        query.componentName,
        async (node) => {
          const state = await withTimeout(
            devtools.api.getInspectorState({
              inspectorId: COMPONENTS_INSPECTOR_ID,
              nodeId: node.id,
            }),
            DEVTOOLS_TIMEOUT,
            'getInspectorState',
          )
          return JSON.parse(stringify(state) as string)
        },
        (error) => ({ error }),
      )
    },

    // ── Edit component state ────────────────────────────────────────────
    async editComponentState(query: {
      componentName: string
      path: string[]
      value: string
      valueType: string
    }) {
      return withComponentNode(
        query.componentName,
        async (node) => {
          await withTimeout(
            (devtools as any).ctx.api.editInspectorState({
              inspectorId: COMPONENTS_INSPECTOR_ID,
              nodeId: node.id,
              path: query.path,
              state: {
                new: null,
                remove: false,
                type: query.valueType,
                value: query.value,
              },
              type: undefined,
            }),
            DEVTOOLS_TIMEOUT,
            'editInspectorState',
          )
          return { success: true as const }
        },
        (error) => ({ success: false as const, error }),
      )
    },

    // ── Highlight component ─────────────────────────────────────────────
    async highlightComponent(query: { componentName: string }) {
      return withComponentNode(
        query.componentName,
        (node) => {
          setHighlight(node.id)
          return { success: true as const }
        },
        (error) => ({ success: false as const, error }),
      )
    },

    // ── Scroll to component ─────────────────────────────────────────────
    async scrollToComponent(query: { componentName: string }) {
      return withComponentNode(
        query.componentName,
        async (node) => {
          setHighlight(node.id)
          await new Promise(r => setTimeout(r, 50))
          const overlay = document.querySelector<HTMLElement>('.__vue-devtools-component-inspector__')
            ?? document.querySelector<HTMLElement>('[data-vue-devtools-component-inspector]')
          if (overlay) {
            overlay.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          return { success: true as const }
        },
        (error) => ({ success: false as const, error }),
      )
    },

    // ── Get component by file ───────────────────────────────────────────
    async getComponentByFile(query: { filePath: string }) {
      const root = await fetchComponentTree()
      const all = flattenChildren(root)
      const match = all.find((n: any) => n.file?.endsWith(query.filePath))
      if (!match) {
        return {
          found: false,
          error: `No component found with file path ending in "${query.filePath}"`,
        }
      }
      const state = await withTimeout(
        devtools.api.getInspectorState({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          nodeId: match.id,
        }),
        DEVTOOLS_TIMEOUT,
        'getInspectorState',
      )
      return {
        found: true,
        name: match.name,
        file: match.file,
        state: JSON.parse(stringify(state) as string),
      }
    },
  }
}
