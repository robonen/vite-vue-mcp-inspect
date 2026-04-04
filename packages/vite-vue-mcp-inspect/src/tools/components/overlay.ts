import { devtools } from '@vue/devtools-kit'
import {
  COMPONENTS_INSPECTOR_ID,
  DEVTOOLS_TIMEOUT,
  flattenChildren,
  mapConcurrent,
  setHighlight,
  stringify,
  withComponentNode,
  withTimeout,
} from '../overlay-utils.ts'

export function createComponentHandlers(getRpc: () => any) {
  return {
    // ── Component tree ──────────────────────────────────────────────────
    async getInspectorTree(query: { event: string }) {
      try {
        const tree = await withTimeout(
          devtools.api.getInspectorTree({
            inspectorId: COMPONENTS_INSPECTOR_ID,
            filter: '',
          }),
          DEVTOOLS_TIMEOUT,
          'getInspectorTree',
        )
        getRpc().onInspectorTreeUpdated(query.event, tree[0])
      }
      catch (err) {
        getRpc().onInspectorTreeUpdated(query.event, { error: String(err) })
      }
    },

    async getDetailedComponentTree(query: { event: string }) {
      try {
        const tree = await withTimeout(
          devtools.api.getInspectorTree({
            inspectorId: COMPONENTS_INSPECTOR_ID,
            filter: '',
          }),
          DEVTOOLS_TIMEOUT,
          'getInspectorTree',
        )
        const all = flattenChildren(tree[0])
        const detailed = await mapConcurrent(all, 10, async (node: any) => {
          try {
            const state = await withTimeout(
              devtools.api.getInspectorState({
                inspectorId: COMPONENTS_INSPECTOR_ID,
                nodeId: node.id,
              }),
              DEVTOOLS_TIMEOUT,
              'getInspectorState',
            )
            return { name: node.name, id: node.id, file: node.file, state: stringify(state) }
          }
          catch {
            return { name: node.name, id: node.id, file: node.file }
          }
        })
        getRpc().onDetailedComponentTreeUpdated(query.event, detailed)
      }
      catch (err) {
        getRpc().onDetailedComponentTreeUpdated(query.event, { error: String(err) })
      }
    },

    // ── Component state ─────────────────────────────────────────────────
    async getInspectorState(query: { event: string; componentName: string }) {
      try {
        const result = await withComponentNode(
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
            return stringify(state)
          },
          (error) => ({ error }),
        )
        getRpc().onInspectorStateUpdated(query.event, result)
      }
      catch (err) {
        getRpc().onInspectorStateUpdated(query.event, { error: String(err) })
      }
    },

    // ── Edit component state ────────────────────────────────────────────
    async editComponentState(query: {
      componentName: string
      path: string[]
      value: string
      valueType: string
      event: string
    }) {
      try {
        const result = await withComponentNode(
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
        getRpc().onEditComponentStateDone(query.event, result)
      }
      catch (err) {
        getRpc().onEditComponentStateDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Highlight component ─────────────────────────────────────────────
    async highlightComponent(query: { componentName: string; event: string }) {
      try {
        const result = await withComponentNode(
          query.componentName,
          (node) => {
            setHighlight(node.id)
            return { success: true as const }
          },
          (error) => ({ success: false as const, error }),
        )
        getRpc().onHighlightComponentDone(query.event, result)
      }
      catch (err) {
        getRpc().onHighlightComponentDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Scroll to component ─────────────────────────────────────────────
    async scrollToComponent(query: { componentName: string; event: string }) {
      try {
        const result = await withComponentNode(
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
        getRpc().onScrollToComponentDone(query.event, result)
      }
      catch (err) {
        getRpc().onScrollToComponentDone(query.event, { success: false, error: String(err) })
      }
    },

    // ── Get component by file ───────────────────────────────────────────
    async getComponentByFile(query: { filePath: string; event: string }) {
      try {
        const tree = await withTimeout(
          devtools.api.getInspectorTree({
            inspectorId: COMPONENTS_INSPECTOR_ID,
            filter: '',
          }),
          DEVTOOLS_TIMEOUT,
          'getInspectorTree',
        )
        const all = flattenChildren(tree[0])
        const match = all.find((n: any) => n.file?.endsWith(query.filePath))
        if (!match) {
          getRpc().onComponentByFileUpdated(query.event, {
            found: false,
            error: `No component found with file path ending in "${query.filePath}"`,
          })
          return
        }
        const state = await withTimeout(
          devtools.api.getInspectorState({
            inspectorId: COMPONENTS_INSPECTOR_ID,
            nodeId: match.id,
          }),
          DEVTOOLS_TIMEOUT,
          'getInspectorState',
        )
        getRpc().onComponentByFileUpdated(query.event, {
          found: true,
          name: match.name,
          file: match.file,
          state: stringify(state),
        })
      }
      catch (err) {
        getRpc().onComponentByFileUpdated(query.event, { found: false, error: String(err) })
      }
    },
  }
}
